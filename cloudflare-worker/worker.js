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
  'https://voluntools.site',
  'https://www.voluntools.site',
  'https://tutorhub.site',          // old domain — kept during the switchover
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
    //
    // openai/gpt-oss-20b is Groq's named replacement for llama-3.1-8b-instant,
    // which Groq shut down on 2026-08-16. It is a reasoning model: it thinks
    // before answering, and that thinking draws on the same completion budget.
    // The old 150-token cap would let it spend everything thinking and return an
    // empty answer, so reasoning is kept low and the cap raised. At Groq's price
    // for this model a full 1,024-token reply costs a fraction of a cent.
    const body = {
      model: 'openai/gpt-oss-20b',
      reasoning_effort: 'low',
      include_reasoning: false,
      max_completion_tokens: 1024,
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

    const text = await groqRes.text();

    // If the model spends its whole budget thinking, Groq still answers 200 --
    // just with no content -- and the page would show a blank reply with no
    // explanation. Turn that into an error the page can display.
    if (groqRes.ok) {
      try {
        const data = JSON.parse(text);
        const choice = data && data.choices && data.choices[0];
        if (choice && !(choice.message && choice.message.content)) {
          return jsonError('The AI ran out of room before answering. Please try again or ask a shorter question.', 502, cors);
        }
      } catch (e) {
        // Not JSON -- pass it back unchanged below.
      }
    }

    // Otherwise pass Groq's response straight back to the browser.
    return new Response(text, {
      status: groqRes.status,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
};
