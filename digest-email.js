// api/digest-email.js — weekly digest endpoint, called by Make.com
function buildEmailHTML(shows, dateRange) {
  const realJazz = (shows || []).filter(s => s.isRealJazz);
  const other = (shows || []).filter(s => !s.isRealJazz);

  const cardStyle = 'border-left:3px solid #c9a84c;padding:16px 20px;margin-bottom:16px;background:#1e1b16;';
  const tributeStyle = 'border-left:3px solid #b94a2c;padding:16px 20px;margin-bottom:16px;background:#1e1b16;';

  function card(s, style) {
    const agesLabel = s.allAges
      ? `<span style="color:#6abf7a;font-size:10px;letter-spacing:0.1em;">ALL AGES</span>`
      : `<span style="color:#7a746a;font-size:10px;letter-spacing:0.1em;">21+</span>`;
    return `<div style="${style}">
      <div style="margin-bottom:6px;">
        <span style="color:#c9a84c;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;font-family:monospace;">
          ${s.date || ''} &nbsp;·&nbsp; ${s.venue || ''}
        </span>&nbsp;&nbsp;${agesLabel}
      </div>
      <div style="font-family:Georgia,serif;font-size:20px;color:#f2ede3;margin-bottom:6px;">${s.title || ''}</div>
      <div style="font-family:Georgia,serif;font-style:italic;font-size:14px;color:#7a746a;margin-bottom:10px;">${s.description || ''}</div>
      <div style="font-family:monospace;font-size:10px;color:#3a3530;letter-spacing:0.1em;">
        ${s.time ? `TIME: <span style="color:#f2ede3">${s.time}</span>&nbsp;&nbsp;` : ''}
        ${s.distance ? `FROM 91214: <span style="color:#f2ede3">~${s.distance}</span>&nbsp;&nbsp;` : ''}
        ${s.cover ? `COVER: <span style="color:#f2ede3">${s.cover}</span>` : ''}
      </div>
    </div>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
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
    ${dateRange || 'Next 7 days'} &middot; All-ages priority &middot; Near 91214
  </div>
  ${realJazz.length ? `
    <div style="font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:#7a6330;margin-bottom:16px;">▸ &nbsp;REAL JAZZ</div>
    ${realJazz.map(s => card(s, cardStyle)).join('')}
  ` : ''}
  ${other.length ? `
    <div style="font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:#7a6330;margin:28px 0 16px;">▸ &nbsp;TRIBUTE &amp; OTHER LIVE MUSIC</div>
    ${other.map(s => card(s, tributeStyle)).join('')}
  ` : ''}
  <div style="border-top:1px solid #3a3530;margin-top:40px;padding-top:20px;
    font-size:9px;letter-spacing:0.15em;text-transform:uppercase;color:#3a3530;">
    LA JAZZ FINDER · POWERED BY CLAUDE AI · BASE: 91214
  </div>
</div>
</body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const secret = req.headers['x-digest-secret'];
  if (secret !== process.env.DIGEST_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  const system = `You are a JSON API endpoint. Your entire response must be a single JSON object.
Do not write any text before or after the JSON.
Do not write "Based on", "Here is", or any explanation.
Start your response with { and end with }.

Search vibratogrilljazz.com and catalinajazzclub.com and lajazz.com for live music events.

Return this exact JSON structure:
{"shows":[{"title":"","venue":"","date":"","time":"","description":"One sentence about the act.","isRealJazz":true,"isTribute":false,"allAges":true,"distance":"","cover":""}],"dateRange":""}

Field rules:
- isRealJazz: true only for real jazz. false for tribute bands or pop acts.
- isTribute: true if cover or tribute show.
- allAges: Vibrato and Catalina are always true. Other venues default false unless confirmed.
- distance: driving estimate from zip 91214 e.g. "22 min"
- Only confirmed upcoming shows. Never invent shows.`;

  const today = new Date().toDateString();
  const prompt = `Build a weekly LA jazz digest for the next 7 days starting ${today}. Focus on Tuesday, Wednesday, Thursday, Friday, Saturday. Prioritize all-ages venues near zip 91214. Return JSON only.`;

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
        max_tokens: 500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `Anthropic ${response.status}`);

    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found in model response');
    const parsed = JSON.parse(match[0]);

    const html = buildEmailHTML(parsed.shows, parsed.dateRange);
    return res.status(200).json({ emailHtml: html, shows: parsed.shows, dateRange: parsed.dateRange });

  } catch (err) {
    console.error('Digest error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
