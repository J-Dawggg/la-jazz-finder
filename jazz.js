// api/jazz.js  — Vercel serverless function
// Receives POST { prompt } → calls Anthropic → returns { shows, dateRange }

const SYSTEM = `You are a jazz event researcher for Los Angeles.
Search the web and return ONLY a raw JSON object — no markdown, no backticks, nothing else.

Always search: LAjazz.com, lajazzpicks.com, vibratogrilljazz.com, catalinajazzclub.com,
jazznearyou.com/losangeles, bluenotejazz.com/losangeles.

Rules:
- "isRealJazz": true only for real jazz. false for tribute bands, pop covers.
- "isTribute": true if tribute or cover show.
- "allAges": true for restaurant/dinner venues (Vibrato, Catalina are always true) or explicitly all-ages shows.
- "distance": drive estimate from zip 91214 / La Canada Flintridge CA (e.g. "18 min").
- Only include confirmed shows. Never fabricate.

Return format (raw JSON only):
{
  "shows": [
    {
      "title": "",
      "venue": "",
      "date": "",
      "time": "",
      "description": "One evocative sentence about the style and act.",
      "isRealJazz": true,
      "isTribute": false,
      "allAges": true,
      "distance": "",
      "cover": ""
    }
  ],
  "dateRange": ""
}`;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

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
    if (!response.ok) throw new Error(data.error?.message || `Anthropic ${response.status}`);

    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Jazz API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
