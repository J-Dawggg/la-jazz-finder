// api/digest-email.js — called weekly by Make.com
// Returns HTML email body with the week's jazz picks

const SYSTEM = `You are a jazz event researcher for Los Angeles.
Search the web and return ONLY a raw JSON object — no markdown, no backticks, nothing else.
Always search: LAjazz.com, lajazzpicks.com, vibratogrilljazz.com, catalinajazzclub.com, jazznearyou.com/losangeles, bluenotejazz.com/losangeles.
Rules:
- "isRealJazz": true only for real jazz. false for tribute/pop.
- "allAges": true for restaurant venues (Vibrato, Catalina always true) or explicitly all-ages.
- "distance": drive estimate from zip 91214.
- Only confirmed shows. Never fabricate.
Return: {"shows":[{"title":"","venue":"","date":"","time":"","description":"","isRealJazz":true,"allAges":true,"distance":"","cover":""}],"dateRange":""}`;

function buildEmailHTML(shows, dateRange) {
  const realJazz = shows.filter(s => s.isRealJazz);
  const other = shows.filter(s => !s.isRealJazz);

  const cardStyle = `
    border-left: 3px solid #c9a84c;
    padding: 16px 20px;
    margin-bottom: 16px;
    background: #1e1b16;
  `;
  const tributeCardStyle = cardStyle.replace('#c9a84c', '#b94a2c');

  function card(s, style) {
    const agesLabel = s.allAges
      ? `<span style="color:#6abf7a;font-size:10px;letter-spacing:0.1em;">ALL AGES</span>`
      : `<span style="color:#7a746a;font-size:10px;letter-spacing:0.1em;">21+</span>`;
    return `
      <div style="${style}">
        <div style="margin-bottom:6px;">
          <span style="color:#c9a84c;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:monospace;">${s.date||''} &nbsp;·&nbsp; ${s.venue||''}</span>
          &nbsp;&nbsp;${agesLabel}
        </div>
        <div style="font-family:Georgia,serif;font-size:20px;color:#f2ede3;margin-bottom:6px;">${s.title||''}</div>
        <div style="font-family:Georgia,serif;font-style:italic;font-size:14px;color:#7a746a;margin-bottom:10px;">${s.description||''}</div>
        <div style="font-family:monospace;font-size:10px;color:#3a3530;letter-spacing:0.1em;">
          ${s.time?`TIME: <span style="color:#f2ede3">${s.time}</span> &nbsp;`:''}
          ${s.distance?`FROM 91214: <span style="color:#f2ede3">~${s.distance}</span> &nbsp;`:''}
          ${s.cover?`COVER: <span style="color:#f2ede3">${s.cover}</span>`:''}
        </div>
      </div>`;
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#0c0a07;color:#f2ede3;font-family:monospace;margin:0;padding:0;">
  <div style="max-width:600px;margin:0 auto;padding:40px 28px;">

    <div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#c9a84c;margin-bottom:14px;">
      LOS ANGELES · JAZZ · 91214 &amp; BEYOND
    </div>
    <div style="font-family:Georgia,serif;font-size:48px;font-style:italic;color:#c9a84c;line-height:1;margin-bottom:6px;">
      This Week<br>in LA Jazz
    </div>
    <div style="font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#7a746a;
      padding-bottom:20px;border-bottom:1px solid #3a3530;margin-bottom:30px;">
      ${dateRange||'Next 7 days'} &middot; All-ages priority &middot; Near 91214
    </div>

    ${realJazz.length ? `
      <div style="font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:#7a6330;margin-bottom:16px;">
        ▸ &nbsp;REAL JAZZ
      </div>
      ${realJazz.map(s => card(s, cardStyle)).join('')}
    ` : ''}

    ${other.length ? `
      <div style="font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:#7a6330;margin:28px 0 16px;">
        ▸ &nbsp;TRIBUTE &amp; OTHER LIVE MUSIC
      </div>
      ${other.map(s => card(s, tributeCardStyle)).join('')}
    ` : ''}

    <div style="border-top:1px solid #3a3530;margin-top:40px;padding-top:20px;
      font-size:9px;letter-spacing:0.15em;text-transform:uppercase;color:#3a3530;">
      LA JAZZ FINDER &middot; POWERED BY CLAUDE AI &middot; BASE: 91214
    </div>
  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Simple auth — Make.com passes this as a header
  const secret = req.headers['x-digest-secret'];
  if (secret !== process.env.DIGEST_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  const today = new Date().toDateString();
  const prompt = `Build a weekly LA jazz digest for the next 7 days starting ${today}.
Focus on Tuesday, Wednesday, Thursday, Friday, Saturday nights.
Prioritize all-ages venues near zip 91214 (La Canada Flintridge).
Search all major LA jazz venues. Include as many confirmed shows as possible. Return JSON.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    const html = buildEmailHTML(parsed.shows || [], parsed.dateRange);

    // Return both HTML (for Make.com to send via email) and raw data
    return res.status(200).json({
      emailHtml: html,
      shows: parsed.shows,
      dateRange: parsed.dateRange
    });

  } catch (err) {
    console.error('Digest error:', err);
    return res.status(500).json({ error: err.message });
  }
}
