// Netlify function: /api/get-email?id=EMAIL_ID
// Fetches full email body from Microsoft Graph using server-side Azure credentials

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const emailId = event.queryStringParameters?.id;
  if (!emailId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing email ID' }) };
  }

  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const userEmail = 'emma@ncmassetmanagement.co.uk';

  try {
    // Get access token
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://graph.microsoft.com/.default'
        })
      }
    );

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Token failed', detail: err }) };
    }

    const { access_token } = await tokenRes.json();

    // Fetch the email
    const emailRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${userEmail}/messages/${encodeURIComponent(emailId)}?$select=body,bodyPreview,subject,from,receivedDateTime`,
      {
        headers: { Authorization: `Bearer ${access_token}` }
      }
    );

    if (!emailRes.ok) {
      const err = await emailRes.text();
      return { statusCode: emailRes.status, headers, body: JSON.stringify({ error: 'Graph API failed', detail: err }) };
    }

    const email = await emailRes.json();

    // Return plain text body (strip HTML)
    const html = email.body?.content || email.bodyPreview || '';
    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ body: text, subject: email.subject })
    };

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
