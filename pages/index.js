const https = require('https');

function httpsRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, text: () => data, json: () => JSON.parse(data), ok: res.statusCode < 300 }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id: emailId } = req.query;
  if (!emailId) return res.status(400).json({ error: 'Missing email ID' });

  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const userEmail = 'emma@ncmassetmanagement.co.uk';

  try {
    // Get access token
    const tokenBody = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default'
    }).toString();

    const tokenRes = await httpsRequest(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(tokenBody) } },
      tokenBody
    );

    if (!tokenRes.ok) return res.status(500).json({ error: 'Token failed', detail: tokenRes.text() });
    const { access_token } = tokenRes.json();

    // Fetch email
    const emailRes = await httpsRequest(
      `https://graph.microsoft.com/v1.0/users/${userEmail}/messages/${encodeURIComponent(emailId)}?$select=body,bodyPreview,subject`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!emailRes.ok) return res.status(emailRes.status).json({ error: 'Graph API failed', detail: emailRes.text() });
    const email = emailRes.json();

    const html = email.body?.content || email.bodyPreview || '';
    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n').trim();

    return res.status(200).json({ body: text, subject: email.subject });
  } catch (e) {
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
}
