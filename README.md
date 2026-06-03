# Emma's Interactive Briefing Dashboard

A Next.js app that displays Emma's daily briefing with AI-powered reply composition.

## Setup Steps

### 1. Create GitHub Repository

```bash
# Create a new repo on GitHub called "emma-dashboard"
# Clone it locally
git clone https://github.com/YOUR_USERNAME/emma-dashboard.git
cd emma-dashboard
```

### 2. Add Files to Repository

Copy these files into your repo:
- `package.json`
- `next.config.js`
- `pages/index.js`
- `.env.local`
- `.gitignore` (create with: `node_modules/` and `.env.local`)

### 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import your GitHub repo `emma-dashboard`
4. Vercel will auto-detect Next.js
5. Click "Deploy"
6. Once deployed, you'll get a URL like `https://emma-dashboard.vercel.app`

### 4. Set Environment Variable in Vercel

1. Go to Vercel project settings → "Environment Variables"
2. Add:
   - **Key:** `NEXT_PUBLIC_MAKE_WEBHOOK_URL`
   - **Value:** (get this from Make webhook URL below)
   - **Environments:** Production, Preview, Development

### 5. Set Up Make Webhook

1. In your Make "Compose Email Draft" scenario, go to Module 1 (Webhook)
2. Copy the Webhook URL (looks like `https://hook.make.com/xxxxx`)
3. Paste it into Vercel environment variable above
4. Re-deploy Vercel (or it will auto-redeploy when you save env var)

### 6. Get Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create a new API key
3. In Make Module 2, replace `YOUR_ANTHROPIC_API_KEY` with your actual key
4. Save Make scenario

### 7. Test Everything

**Test the dashboard:**
- Visit `https://emma-dashboard.vercel.app`
- Click on an urgent item to expand
- Click "Draft reply →"
- Check your Outlook drafts folder — draft should appear

## File Structure

```
emma-dashboard/
├── pages/
│   └── index.js          (main dashboard)
├── package.json          (dependencies)
├── next.config.js        (Next.js config)
├── .env.local            (environment variables)
├── .gitignore            (exclude node_modules)
└── README.md             (this file)
```

## Make Workflow Reference

**Scenario: "Compose Email Draft"**

| Module | Input | Output |
|--------|-------|--------|
| 1. Webhook | Receives {emailId, subject, from, detail, action} | Webhook URL |
| 2. HTTP Request | Calls Claude API with Emma's brain prompt | Claude response |
| 3. JSON Parse | Extracts text from Claude response | Parsed text |
| 4. Create Draft | Creates Outlook draft with reply | Draft in Outlook |

## Troubleshooting

**Draft button says "Generating..." but nothing happens:**
- Check that `NEXT_PUBLIC_MAKE_WEBHOOK_URL` is set correctly in Vercel
- Make sure Make webhook is active (check Module 1)
- Check Make execution logs for errors

**No draft appears in Outlook:**
- Verify MS365 connection in Make Module 4
- Check that emma@ncmassetmanagement.co.uk is the correct mailbox
- Check Make logs for MS365 API errors

**"Error generating reply":**
- Check Anthropic API key in Make Module 2
- Verify the "Emma's Brain" system prompt is in a Make text variable called `emmaBrain`
- Check Make Module 2 response for API errors

## Future Improvements

- Add calendar integration to show real events
- Email fetching to show real inbox items
- Mark as complete → auto-archive in Outlook
- Add snooze/defer functionality
- Weekly summary emails

---

**Deployed at:** https://emma-dashboard.vercel.app (after setup)
