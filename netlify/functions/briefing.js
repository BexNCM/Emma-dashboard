const https = require('https');
const { URL } = require('url');

exports.handler = async (event, context) => {
  try {
    const emails = await fetchOutlookEmails();
    const briefing = categorizEmails(emails);

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
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function makeGraphRequest(url, token) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
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
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

async function fetchOutlookEmails() {
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

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
}

function categorizEmails(emails) {
  const urgent = [];
  const action = [];
  const fyi = [];

  emails.forEach(email => {
    const subject = email.subject.toLowerCase();
    const detail = email.detail.toLowerCase();
    const from = email.from.toLowerCase();

    // URGENT: Financial, accounts, decisions needed
    if (
      subject.includes('amex') || 
      subject.includes('american express') ||
      subject.includes('card') ||
      subject.includes('payment') ||
      subject.includes('account over') ||
      subject.includes('declined') ||
      detail.includes('urgent') ||
      detail.includes('asap') ||
      from.includes('american express') ||
      from.includes('finance')
    ) {
      urgent.push(email);
    }
    // ACTION: Specs needed, confirmations, follow-ups
    else if (
      subject.includes('information need') ||
      subject.includes('specs') ||
      subject.includes('confirmation') ||
      subject.includes('approval') ||
      subject.includes('decision') ||
      detail.includes('please confirm') ||
      detail.includes('need to') ||
      detail.includes('please provide')
    ) {
      action.push(email);
    }
    // FYI: Everything else
    else {
      fyi.push(email);
    }
  });

  return { urgent, action, fyi, meetings: [], ignore: [] };
}
