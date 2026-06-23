// Netlify Function: proxy /api/chat -> serverless function using server-side GEMINI_API_KEY
// Uses dynamic import of @google/genai so this file stays compatible with Netlify's Node runtime.

export const handler = async function (event, context) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    const history = body.history;
    if (!history || !Array.isArray(history)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid history array' }) };
    }

    const key = process.env.GEMINI_API_KEY || process.env.AURA_KEY;
    if (!key) {
      return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY environment variable is missing. Please set it in Netlify site settings.' }) };
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: key });

    const contents = history.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] }));

    const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

    let lastError = null;
    for (const model of modelsToTry) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction: `Vous êtes \"Actor\", un assistant de support client IA hautement qualifié, chaleureux et professionnel. Répondez en français en utilisant le vouvoiement.`
            }
          });
          const reply = response.text || '';
          return { statusCode: 200, body: JSON.stringify({ content: reply }) };
        } catch (err) {
          lastError = err;
          // If it's an auth error, return immediately
          if (err?.status === 401 || err?.status === 403) {
            return { statusCode: 500, body: JSON.stringify({ error: 'Authentication error with Gemini API. Check GEMINI_API_KEY.' }) };
          }
          // otherwise retry
          if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1000));
        }
      }
    }

    return { statusCode: 502, body: JSON.stringify({ error: 'Failed to generate content', details: String(lastError) }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Server error' }) };
  }
};

