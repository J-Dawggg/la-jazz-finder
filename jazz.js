// api/jazz.js — Vercel serverless function v2
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

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
- cover: e.g. "$25" or "Free" — omit if unknown
- Only include confirmed upcoming shows. Never invent shows.`;

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

    // Extract all text blocks
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    // Pull JSON out of whatever text surrounds it
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found in model response');
    const parsed = JSON.parse(match[0]);

    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Jazz API error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
