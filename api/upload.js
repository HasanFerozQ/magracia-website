// Vercel serverless function: upload an image into the GitHub repo, after checking ADMIN_PASSWORD.
// Requires Vercel env vars ADMIN_PASSWORD and GITHUB_TOKEN (Contents read/write for this repo only).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { password, filename, data } = req.body || {};
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Wrong admin password' });
  if (!filename || !data) return res.status(400).json({ error: 'filename and data are required' });
  const clean = String(filename).replace(/[^A-Za-z0-9._-]/g, '-').replace(/^\.+/, '');
  const base64 = String(data).includes(',') ? String(data).split(',')[1] : String(data);
  if (base64.length > 6 * 1024 * 1024) return res.status(413).json({ error: 'Image too large. Please compress it to under about 4 MB.' });
  const owner = 'HasanFerozQ', repo = 'magracia-website';
  const path = 'images/' + Date.now() + '-' + clean;
  const headers = { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'magracia-admin' };
  const put = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT', headers,
    body: JSON.stringify({ message: 'Upload image via admin panel: ' + clean, content: base64, branch: 'main' }),
  });
  if (!put.ok) return res.status(502).json({ error: 'GitHub image upload failed' });
  return res.status(200).json({ ok: true, url: '/' + path });
}
