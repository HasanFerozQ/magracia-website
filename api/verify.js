// Vercel serverless function: verify the admin password, nothing else.
// Used by the admin page to unlock the listings before anything else runs.
// Requires Vercel env var ADMIN_PASSWORD (never commit its value).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { password } = req.body || {};
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Wrong admin password' });
  return res.status(200).json({ ok: true });
}
