// Next.js API route: /api/get-email?id=EMAIL_ID
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
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret, scope: 'https://graph.microsoft.com/.default' }) }
    );
    if (!tokenRes.ok) return res.status(500).json({ error: 'Token failed' });
    const { access_token } = await tokenRes.json();
    const emailRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${userEmail}/messages/${encodeURIComponent(emailId)}?\$select=body,bodyPreview,subject`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    if (!emailRes.ok) return res.status(emailRes.status).json({ error: 'Graph API failed' });
    const email = await emailRes.json();
    const html = email.body?.content || email.bodyPreview || '';
    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi,'')
      .replace(/<br\s*\/?>/gi,'\n')
      .replace(/<\/p>/gi,'\n\n')
      .replace(/<\/div>/gi,'\n')
      .replace(/<[^>]+>/g,'')
      .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
      .replace(/\n{3,}/g,'\n\n').trim();
    return res.status(200).json({ body: text, subject: email.subject });
  } catch (e) { return res.status(500).json({ error: e.message }); }
}
