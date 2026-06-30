// AI draft — calls Anthropic directly, no Make round-trip, no "Accepted" problem
const generateAiDraft = async (email, notes) => {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: `You draft email replies for Emma McSkelly, CEO of NCM Auctions (UK commercial asset disposal).

VOICE: Professional, warm, direct, confident. Short sentences. Gets to the point. No fluff or corporate padding.

FORMATTING (important — use real line breaks):
- Start with the greeting on its own line, e.g. "Hi [name],"
- Then a blank line.
- Then the body. Separate distinct points into short paragraphs, each separated by a blank line. Do not write one long block of text.
- Then a blank line.
- Then sign off on two separate lines:
Best,
Emma

RULES:
- Read the ENTIRE email below before replying — do not respond to only the first part.
- Under 150 words.
- Don't invent facts, prices, dates, or commitments. If information is missing, ask for it.
- Output ONLY the reply text. No preamble, no commentary, no subject line.`,
      messages: [{
        role: 'user',
        content: `Draft a reply to this email. Read all of it first.\n\nFrom: ${email.from_name} (${email.from_address})\nSubject: ${email.subject}\n\nFull email content:\n${email.fullBody || email.body || email.preview}\n\n${notes ? 'Emma wants these points included: ' + notes : ''}`
      }]
    })
  });
  if (!res.ok) throw new Error('AI draft failed');
  const data = await res.json();
  return data.content?.[0]?.text || '';
};
