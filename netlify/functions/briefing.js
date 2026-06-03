// netlify/functions/briefing.js
// Deploy this to: netlify/functions/briefing.js in your GitHub repo
// This function fetches Emma's Outlook emails and uses Claude to categorize them

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Microsoft Graph API endpoints
const GRAPH_API = 'https://graph.microsoft.com/v1.0';
const EMMA_EMAIL = 'emma@ncmassetmanagement.co.uk';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const TOKEN_ENDPOINT = 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token';

// Get access token using client credentials flow
async function getMicrosoftToken() {
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Missing Microsoft credentials in environment variables');
  }

  const tokenUrl = TOKEN_ENDPOINT.replace('{tenant}', tenantId);
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token request failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

exports.handler = async (event, context) => {
  try {
    // Step 1: Get access token using client credentials
    const accessToken = await getMicrosoftToken();
    const claudeToken = process.env.ANTHROPIC_API_KEY;

    if (!claudeToken) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY in environment variables' })
      };
    }

    // Step 2: Fetch Emma's inbox emails
    const emailsResponse = await fetch(
      `${GRAPH_API}/users/${EMMA_EMAIL}/mailFolders/inbox/messages?$top=20&$select=subject,from,receivedDateTime,bodyPreview,isRead,importance`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!emailsResponse.ok) {
      throw new Error(`Graph API error: ${emailsResponse.status}`);
    }

    const emailsData = await emailsResponse.json();
    const emails = emailsData.value || [];

    // Step 3: For each email, use Claude to categorize
    const categorizedEmails = await Promise.all(
      emails.map(async (email) => {
        try {
          // Extract sender email
          const senderEmail = email.from?.emailAddress?.address || 'unknown@example.com';
          const senderName = email.from?.emailAddress?.name || 'Unknown';

          // Call Claude to categorize
          const claudeResponse = await fetch(ANTHROPIC_API, {
            method: 'POST',
            headers: {
              'x-api-key': claudeToken,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: 'claude-opus-4-6',
              max_tokens: 300,
              messages: [
                {
                  role: 'user',
                  content: `Categorize this email for Emma McSkelly (CEO of NCM Asset Management).

Subject: ${email.subject}
From: ${senderName}
Preview: ${email.bodyPreview}
Importance flag: ${email.importance}

Return ONLY valid JSON (no markdown, no preamble):
{
  "category": "urgent|action|fyi|meeting|ignore",
  "detail": "1-2 sentence summary of what Emma needs to know",
  "action": "What Emma should do (if any)",
  "hasReply": true|false
}

Categories:
- urgent: Needs Emma's immediate personal response today (business contacts, decisions, confirmations)
- action: Important but not urgent (events, deadlines, information to review)
- fyi: Informational only (updates, confirmations, tracking)
- meeting: Calendar/appointment info
- ignore: Marketing, spam, newsletters, auto-replies`
                }
              ]
            })
          });

          if (!claudeResponse.ok) {
            console.error('Claude API error:', await claudeResponse.text());
            // Default to FYI if Claude fails
            return {
              id: email.id,
              subject: email.subject,
              from: senderName,
              replyTo: senderEmail,
              category: 'fyi',
              detail: email.bodyPreview,
              action: 'Review',
              hasReply: false,
              receivedDateTime: email.receivedDateTime,
              isRead: email.isRead
            };
          }

          const claudeData = await claudeResponse.json();
          const content = claudeData.content[0]?.text || '{}';
          
          // Parse Claude's JSON response
          let parsed;
          try {
            parsed = JSON.parse(content);
          } catch (e) {
            console.error('Failed to parse Claude response:', content);
            parsed = { category: 'fyi', detail: email.bodyPreview, action: 'Review', hasReply: false };
          }

          return {
            id: email.id,
            subject: email.subject,
            from: senderName,
            replyTo: senderEmail,
            category: parsed.category || 'fyi',
            detail: parsed.detail || email.bodyPreview,
            action: parsed.action || 'Review',
            hasReply: parsed.hasReply || false,
            receivedDateTime: email.receivedDateTime,
            isRead: email.isRead
          };
        } catch (error) {
          console.error('Error categorizing email:', error);
          return {
            id: email.id,
            subject: email.subject,
            from: email.from?.emailAddress?.name || 'Unknown',
            replyTo: email.from?.emailAddress?.address || 'unknown@example.com',
            category: 'fyi',
            detail: email.bodyPreview,
            action: 'Review',
            hasReply: false,
            receivedDateTime: email.receivedDateTime,
            isRead: email.isRead,
            error: true
          };
        }
      })
    );

    // Step 4: Group emails by category
    const briefing = {
      urgent: [],
      action: [],
      fyi: [],
      meetings: [],
      ignore: []
    };

    categorizedEmails.forEach(email => {
      if (email.category === 'meeting') {
        briefing.meetings.push(email);
      } else if (briefing[email.category]) {
        briefing[email.category].push(email);
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        generatedAt: new Date().toISOString(),
        briefing: briefing,
        totalEmails: categorizedEmails.length
      })
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
