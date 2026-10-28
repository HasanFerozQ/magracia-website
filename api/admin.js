// Vercel serverless function: saves products.json to GitHub after checking the admin password.
// Required Vercel environment variables (never commit these values):
//   ADMIN_PASSWORD - a strong password you choose in Vercel
//   GITHUB_TOKEN - a fine-grained personal access token with Contents read/write for HasanFerozQ/magracia-website only
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { password, products } = req.body || {};
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Wrong admin password' });
  }
  if (!Array.isArray(products)) return res.status(400).json({ error: 'products must be an array' });
  const owner = 'HasanFerozQ', repo = 'magracia-website', path = 'products.json';
  const headers = { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'magracia-admin' };
  const get = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, { headers });
  if (!get.ok) return res.status(502).json({ error: 'Could not read current products.json from GitHub' });
  const current = await get.json();
  const content = Buffer.from(JSON.stringify(products, null, 2)).toString('base64');
  const put = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT', headers,
    body: JSON.stringify({ message: 'Update listings via admin panel', content, sha: current.sha, branch: 'main' }),
  });
  if (!put.ok) return res.status(502).json({ error: 'GitHub commit failed' });
  return res.status(200).json({ ok: true });
}
