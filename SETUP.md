# LA Jazz Finder — Setup Guide

## What you're building
- A live website at your own URL (e.g. la-jazz-finder.vercel.app)
- A weekly email digest delivered every Monday morning
- Total cost: ~$0–2/month in API usage

---

## STEP 1 — Get your Anthropic API Key (5 min)

1. Go to: https://console.anthropic.com
2. Sign up / log in
3. Click "API Keys" in the left sidebar → "Create Key"
4. Copy the key (starts with `sk-ant-...`) — save it somewhere safe
5. Add a payment method (you'll be charged pennies per use, not monthly)

---

## STEP 2 — Deploy to Vercel (10 min)

### 2a. Put the code on GitHub
1. Go to https://github.com and create a free account if you don't have one
2. Click "New repository" → name it `la-jazz-finder` → Create
3. Upload all the files from the `la-jazz-finder` folder you downloaded:
   - `package.json`
   - `vercel.json`
   - `api/jazz.js`
   - `api/digest-email.js`
   - `public/index.html`
4. Commit / save them

### 2b. Deploy on Vercel
1. Go to https://vercel.com → sign up with your GitHub account
2. Click "Add New Project" → import your `la-jazz-finder` repo
3. Click "Deploy" (default settings are fine)
4. Once deployed, go to Settings → Environment Variables
5. Add two variables:
   - Name: `ANTHROPIC_API_KEY`  Value: `sk-ant-...` (your key from Step 1)
   - Name: `DIGEST_SECRET`      Value: any password you choose, e.g. `jazztime2026`
6. Click "Redeploy" after adding the variables

✅ Your web app is now live at `https://la-jazz-finder.vercel.app` (or similar)

---

## STEP 3 — Set up weekly email digest via Make.com (15 min)

Make.com is a free automation service — think of it as a robot that runs a task on a schedule.

1. Go to https://make.com → create a free account
2. Click "Create a new scenario"
3. Add these two modules in sequence:

### Module 1: Schedule trigger
- Search for "Schedule" → select it
- Set it to run: Every week, Monday at 8:00 AM

### Module 2: HTTP Request (calls your Vercel backend)
- Search for "HTTP" → "Make a Request"
- URL: `https://YOUR-APP-NAME.vercel.app/api/digest-email`
- Method: POST
- Headers: add one header:
  - Key: `x-digest-secret`
  - Value: the DIGEST_SECRET password you set in Step 2

### Module 3: Email (sends you the digest)
- Search for "Email" → "Send an Email" (uses Gmail or any email)
- To: your email address
- Subject: `🎷 LA Jazz This Week`
- Body type: HTML
- Body: click the output from Module 2 → select `emailHtml`

4. Click "Run once" to test it — check your inbox
5. Turn the scenario ON

✅ Every Monday morning you'll get a jazz digest email automatically.

---

## Summary

| What | Where | Cost |
|------|-------|------|
| Web app | vercel.app/your-url | Free |
| API calls | Anthropic | ~$0.01–0.05 per search |
| Email automation | Make.com | Free (up to 1000 ops/month) |
| Total | | ~$1–3/month max |

---

## Troubleshooting

**Web app shows an error:**
- Check Vercel → Functions → Logs to see the error
- Most common issue: ANTHROPIC_API_KEY not set or typo

**Email not arriving:**
- Test the Make.com scenario manually first
- Check spam folder
- Verify the DIGEST_SECRET matches exactly in both Vercel and Make.com

**Need help?** Paste the error message into Claude and I'll debug it with you.
