import https from 'https';
import { URLSearchParams } from 'url';

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          json: () => JSON.parse(data),
          text: () => data
        });
      });
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

  if (!tenantId || !clientId || !clientSecret) {
    return res.status(500).json({ error: 'Missing env vars', tenantId: !!tenantId, clientId: !!clientId, clientSecret: !!clientSecret });
  }

  try {
    const tokenBody = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default'
    }).toString();

    const tokenRes = await request(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(tokenBody) } },
      tokenBody
    );

    if (!tokenRes.ok) return res.status(500).json({ error: 'Token failed', detail: tokenRes.text() });
    const { access_token } = tokenRes.json();

    const emailRes = await request(
      `https://graph.microsoft.com/v1.0/users/${userEmail}/messages/${encodeURIComponent(emailId)}?$select=body,bodyPreview,subject`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!emailRes.ok) return res.status(emailRes.status).json({ error: 'Graph failed', detail: emailRes.text() });
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
    return res.status(500).json({ error: e.message, stack: e.stack?.substring(0, 500) });
  }
}
