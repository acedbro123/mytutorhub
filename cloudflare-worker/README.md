# Voluntool "Ask AI" — Cloudflare Worker proxy

This Worker keeps the Groq API key server-side. `ask.html` calls the Worker; the
Worker adds the key and forwards to Groq.

## One-time setup (Cloudflare dashboard)

1. Go to **dash.cloudflare.com** → **Workers & Pages** → **Create** → **Create Worker**.
2. Name it e.g. `voluntool-ask`, click **Deploy** (deploys the starter code).
3. Click **Edit code**, delete the starter code, paste the contents of
   [`worker.js`](./worker.js), then **Deploy**.
4. Add the secret key:
   - Go to the Worker's **Settings → Variables and Secrets** (a.k.a. *Settings → Variables*).
   - Under **Secrets**, **Add** a secret named exactly `GROQ_API_KEY`.
   - Value = a **new** Groq API key from https://console.groq.com/keys
     (the old one was revoked). Save.
5. Copy the Worker URL shown at the top of the Worker page — it looks like
   `https://voluntool-ask.<your-subdomain>.workers.dev`.
6. Put that URL into `ask.html` (the `WORKER_URL` constant near the chat script),
   commit, and push.

## Test
Open the site's Ask AI page and send a message. If it errors, open the browser
console and check the Worker's **Logs** tab in the dashboard.

## Notes
- The key lives only in the Worker secret — it never appears in the website source.
- `ALLOWED_ORIGINS` in `worker.js` restricts which sites may call the Worker;
  update it if your domain changes.
