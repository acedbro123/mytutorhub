// Cloudflare Worker — Groq API proxy for Voluntool "Ask AI".
// -----------------------------------------------------------------------------
// The browser (ask.html) POSTs the chat messages here; this Worker adds the
// secret Groq API key server-side and forwards the request to Groq. The key is
// stored as an encrypted Worker secret named GROQ_API_KEY and is never sent to
// the browser, so it can't be scraped or auto-revoked.
//
// Deploy: see README.md in this folder.
// -----------------------------------------------------------------------------

// Only these origins may call the Worker (basic anti-abuse for browsers).
const ALLOWED_ORIGINS = [
  'https://tutorhub.site',
  'https://www.tutorhub.site',
  'http://localhost:8765',
  'http://127.0.0.1:8765'
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function jsonError(message, status, cors) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'POST') {
      return jsonError('Method not allowed', 405, cors);
    }
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return jsonError('Forbidden origin', 403, cors);
    }
    if (!env.GROQ_API_KEY) {
      return jsonError('Server is missing the GROQ_API_KEY secret', 500, cors);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return jsonError('Invalid JSON', 400, cors);
    }

    // Only forward the fields we expect (model + limits are fixed server-side).
    const body = {
      model: 'llama-3.1-8b-instant',
      max_tokens: 150,
      messages: Array.isArray(payload.messages) ? payload.messages : []
    };

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    // Pass Groq's response straight back to the browser.
    const text = await groqRes.text();
    return new Response(text, {
      status: groqRes.status,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
};
