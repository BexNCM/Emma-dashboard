const https = require('https');
const { URL } = require('url');

exports.handler = async (event, context) => {
  try {
    const emails = await fetchOutlookEmails();
    const briefing = await categorizEmails(emails);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        briefing,
        totalEmails: emails.length,
        generatedAt: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Error in briefing function:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message,
        briefing: { urgent: [], action: [], fyi: [], meetings: [], ignore: [] },
      }),
    };
  }
};

function getAccessToken(tenantId, clientId, clientSecret) {
  return new Promise((resolve, reject) => {
    const postData = `client_id=${clientId}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials&scope=https://graph.microsoft.com/.default`;

    const options = {
      hostname: 'login.microsoftonline.com',
      path: `/${tenantId}/oauth2/v2.0/token`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.access_token) {
            resolve(parsed.access_token);
          } else {
            reject(new Error('No access token in response'));
          }
        } catch (e) {
          reject(new Error('Failed to parse token response: ' + e.message));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function makeGraphRequest(fullUrl, token) {
  return new Promise((resolve, reject) => {
    try {
      // Parse the URL properly
      const url = new URL(fullUrl);
      
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search, // This handles encoding automatically
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            reject(new Error('Failed to parse Graph response: ' + e.message));
          }
        });
      });

      req.on('error', reject);
      req.end();
    } catch (e) {
      reject(new Error('Failed to build request: ' + e.message));
    }
  });
}

async function fetchOutlookEmails() {
  try {
    const tenantId = process.env.MICROSOFT_TENANT_ID;
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error('Missing Azure credentials in environment');
    }

    const token = await getAccessToken(tenantId, clientId, clientSecret);
    const response = await makeGraphRequest(
      'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=20&$orderby=receivedDateTime desc',
      token
    );

    const emails = response.value || [];
    
    return emails.map(email => ({
      id: email.id,
      subject: email.subject || '(No subject)',
      from: email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Unknown',
      replyTo: email.replyTo?.[0]?.emailAddress?.address || email.from?.emailAddress?.address || '',
      detail: (email.bodyPreview || '').substring(0, 300),
      receivedDateTime: email.receivedDateTime,
      isRead: email.isRead,
    }));
  } catch (error) {
    console.error('Error fetching emails:', error.message);
    throw error;
  }
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
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const content = parsed.content?.[0]?.text || '';
          resolve(content);
        } catch (e) {
          reject(new Error('Failed to parse Claude response: ' + e.message));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function categorizEmails(emails) {
  try {
    if (emails.length === 0) {
      return {
        urgent: [],
        action: [],
        fyi: [],
        meetings: [],
        ignore: [],
      };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Missing Anthropic API key');
    }

    const emailList = emails
      .map((e, i) => `Email ${i + 1}:\nFrom: ${e.from}\nSubject: ${e.subject}\nPreview: ${e.detail}`)
      .join('\n\n');

    const prompt = `Categorize these emails for Emma McSkelly (CEO, NCM).

URGENT (needs Emma's response today):
- Financial/account issues
- Client/partner decisions needed
- Time-sensitive deadlines
- Complaints, escalations
- Business critical updates

ACTION (not urgent, but needs response):
- Information/specs Emma needs to provide
- Follow-ups on ongoing projects
- Approvals/confirmations needed
- Meeting confirmations

FYI (informational, no action needed):
- Newsletters, notifications
- CC'd conversations
- Status updates
- Marketing, general interest

Return ONLY this JSON (no other text):
{
  "categorized": [
    {"index": 1, "category": "urgent|action|fyi", "reason": "brief reason"},
    {"index": 2, "category": "urgent|action|fyi", "reason": "brief reason"}
  ]
}

EMAILS:
${emailList}`;

    const response = await callClaudeAPI(apiKey, prompt);
    
    let categorized = [];
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        categorized = JSON.parse(jsonMatch[0]).categorized || [];
      }
    } catch (e) {
      console.error('Failed to parse categorization:', e.message);
      categorized = [];
    }

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
        action: 'Review',
        receivedDateTime: email.receivedDateTime,
        isRead: email.isRead,
      };

      if (cat.category === 'urgent') urgent.push(emailObj);
      else if (cat.category === 'action') action.push(emailObj);
      else fyi.push(emailObj);
    });

    // Emails that didn't get categorized go to FYI
    const categorizedIds = new Set(categorized.map(c => emails[c.index - 1]?.id).filter(Boolean));
    emails.forEach(email => {
      if (!categorizedIds.has(email.id)) {
        fyi.push({
          id: email.id,
          subject: email.subject,
          from: email.from,
          replyTo: email.replyTo,
          category: 'fyi',
          detail: email.detail,
          action: 'Review',
          receivedDateTime: email.receivedDateTime,
          isRead: email.isRead,
        });
      }
    });

    return { urgent, action, fyi, meetings: [], ignore: [] };
  } catch (error) {
    console.error('Error categorizing emails:', error.message);
    throw error;
  }
}
