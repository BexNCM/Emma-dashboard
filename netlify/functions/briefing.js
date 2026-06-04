const https = require('https');

exports.handler = async (event, context) => {
  try {
    // Get emails from Outlook
    const emails = await fetchOutlookEmails();

    // Categorize with Claude
    const briefing = await categorizEmailsWithClaude(emails);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        briefing,
        totalEmails: emails.length,
        generatedAt: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};

async function fetchOutlookEmails() {
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  // Get access token
  const token = await getAccessToken(tenantId, clientId, clientSecret);

  // Fetch emails
  const response = await makeRequest('https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=20&$orderby=receivedDateTime desc', token);
  
  const emails = response.value || [];
  
  return emails.map(email => ({
    id: email.id,
    subject: email.subject || '(No subject)',
    from: email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Unknown',
    replyTo: email.replyTo?.[0]?.emailAddress?.address || email.from?.emailAddress?.address,
    detail: (email.bodyPreview || '').substring(0, 300),
    receivedDateTime: email.receivedDateTime,
    isRead: email.isRead,
  }));
}

async function getAccessToken(tenantId, clientId, clientSecret) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default',
    });

    const options = {
      hostname: 'login.microsoftonline.com',
      path: `/${tenantId}/oauth2/v2.0/token`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.toString().length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.access_token);
        } catch (e) {
          reject(new Error('Failed to parse token response'));
        }
      });
    });

    req.on('error', reject);
    req.write(postData.toString());
    req.end();
  });
}

function makeRequest(url, token) {
  return new Promise((resolve, reject) => {
    const options = new URL(url);
    const req = https.request(options, { headers: { Authorization: `Bearer ${token}` } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function categorizEmailsWithClaude(emails) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Build email list for Claude
  const emailList = emails.map((e, i) => 
    `Email ${i + 1}:\nFrom: ${e.from}\nSubject: ${e.subject}\nPreview: ${e.detail}`
  ).join('\n\n');

  const prompt = `You are Emma McSkelly's executive assistant. Categorize these emails into three categories:

🔴 URGENT (needs Emma's personal response today):
- Financial alerts or account issues
- Decisions needed from partners/clients
- Time-sensitive items with deadlines today
- Complaints or escalations
- Business-critical updates

🟡 ACTION (not urgent, but needs a response):
- Information needed from Emma (specs, decisions, confirmations)
- Follow-ups on ongoing projects
- Internal requests for input/approval
- Scheduled meetings/calls that need confirmation

🟢 FYI (low priority, informational only):
- Newsletters, notifications, transactional emails
- CC'd conversations Emma's not directly involved in
- Status updates (no action needed)
- Congratulations, board opportunities, general interest items

RULES:
1. Be strict about URGENT - only things that truly need Emma TODAY
2. Be strict about ACTION - things that definitely need a response
3. Everything else goes in FYI
4. Financial/account issues = URGENT
5. Project specs/confirmations = ACTION
6. Newsletters/marketing = FYI

Return ONLY a JSON object with this structure (NO OTHER TEXT):
{
  "categorized": [
    {
      "index": 1,
      "category": "urgent|action|fyi",
      "reason": "brief reason"
    },
    ...
  ]
}

EMAILS TO CATEGORIZE:
${emailList}`;

  const response = await callClaudeAPI(apiKey, prompt);
  
  // Parse Claude's response
  let categorized = [];
  try {
    categorized = JSON.parse(response).categorized || [];
  } catch (e) {
    console.error('Failed to parse Claude response:', response);
    categorized = [];
  }

  // Build briefing structure
  const urgent = [];
  const action = [];
  const fyi = [];

  categorized.forEach(cat => {
    const email = emails[cat.index - 1];
    if (!email) return;

    const emailObj = {
      id: email.id,
      subject: email.subject,
      from: email.from,
      replyTo: email.replyTo,
      category: cat.category,
      detail: email.detail,
      action: cat.category === 'urgent' ? 'Respond today' : cat.category === 'action' ? 'Action needed' : 'Review',
      receivedDateTime: email.receivedDateTime,
      isRead: email.isRead,
    };

    if (cat.category === 'urgent') {
      urgent.push(emailObj);
    } else if (cat.category === 'action') {
      action.push(emailObj);
    } else {
      fyi.push(emailObj);
    }
  });

  return {
    urgent,
    action,
    fyi,
    meetings: [],
    ignore: [],
  };
}

function callClaudeAPI(apiKey, prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const content = parsed.content?.[0]?.text || '';
          resolve(content);
        } catch (e) {
          reject(new Error('Failed to parse Claude response'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
