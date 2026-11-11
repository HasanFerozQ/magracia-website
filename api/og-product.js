// Vercel serverless function: serves baked-in Open Graph tags for product
// pages so WhatsApp / Instagram / Facebook / X scrapers (which do not run
// JS) see a proper title, description and photo when a product link is
// shared. Only scraper user-agents are rewritten here (see vercel.json);
// humans always get the static product.html directly, so there is no
// redirect loop. The meta refresh below points at the real product page
// with ?og=1, which the rewrite explicitly excludes via `missing`, so
// even a crawler that follows the refresh lands on the static page and
// stops. Unknown handle (or none) -> the generic site OG tags.
// Product data is read from products.json on disk, with a live fetch of
// the deployed products.json as fallback; vercel.json also lists
// products.json under includeFiles so it is guaranteed to be bundled.
import { readFileSync } from 'node:fs';

const SITE = 'https://magracia.com';
const GENERIC = {
  title: 'Magracia | Silk Shirts, Satin Co-ord Sets, Pants & Shrugs for Women',
  description: 'Elegant women\'s clothing for every occasion. Silk shirts, co-ord sets, pants and shrugs, made to be worn, not just photographed. Buy on Etsy.',
  image: `${SITE}/images/1793279692618-magracia-logo.png`,
  url: `${SITE}/`,
  type: 'website',
};

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function absImage(src) {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  return SITE + (src.startsWith('/') ? src : '/' + src);
}

async function loadProducts() {
  try {
    const data = JSON.parse(readFileSync(new URL('../products.json', import.meta.url), 'utf8'));
    if (Array.isArray(data)) return data;
  } catch (e) { /* fall through to live fetch */ }
  try {
    const r = await fetch(`${SITE}/products.json`, { headers: { Accept: 'application/json' } });
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) { /* fall through: generic tags */ }
  return [];
}

export default async function handler(req, res) {
  const handle = (req.query?.handle || '').toString().trim();
  const products = await loadProducts();
  const p = handle ? products.find((x) => x.handle === handle) : null;
  let title = GENERIC.title;
  let description = GENERIC.description;
  let image = GENERIC.image;
  let url = GENERIC.url;
  let type = GENERIC.type;
  if (p) {
    title = p.seo_title || `Magracia | ${p.title} - ${p.collection}`;
    description = p.seo_description || `${p.title} from Magracia ${p.collection || ''}. Colours: ${(p.colours || []).join(', ')}. Sizes: ${(p.sizes || []).join(', ')}. Buy on Etsy.`;
    image = absImage((p.images || [])[0]) || GENERIC.image;
    url = `${SITE}/product.html?handle=${encodeURIComponent(p.handle)}`;
    type = 'product';
  }
  // Refresh target carries ?og=1 so the vercel.json rewrite (which requires
  // the og param to be missing) never sends this request back here.
  const target = p ? `${url}&og=1` : SITE + '/';
  // JSON-LD sits in a <script> block (raw text, not an attribute), so it must
  // NOT be HTML-escaped — only a literal </script sequence is neutralised.
  const ldJson = p ? JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: p.title, description, image: p.images || [], category: p.collection, brand: { '@type': 'Brand', name: 'Magracia' }, url }).replace(/<\//g, '<\\/') : '';
  const ld = p ? `<script type="application/ld+json">${ldJson}</script>` : '';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">`
    + `<title>${esc(title)}</title>`
    + `<meta name="description" content="${esc(description)}">`
    + `<link rel="canonical" href="${esc(url)}">`
    + `<meta property="og:title" content="${esc(title)}">`
    + `<meta property="og:description" content="${esc(description)}">`
    + `<meta property="og:image" content="${esc(image)}">`
    + `<meta property="og:url" content="${esc(url)}">`
    + `<meta property="og:type" content="${esc(type)}">`
    + `<meta property="og:site_name" content="Magracia">`
    + `<meta name="twitter:card" content="summary_large_image">`
    + `<meta name="twitter:title" content="${esc(title)}">`
    + `<meta name="twitter:description" content="${esc(description)}">`
    + `<meta name="twitter:image" content="${esc(image)}">`
    + `<meta http-equiv="refresh" content="0; url=${esc(target)}">`
    + ld
    + `</head><body><p><a href="${esc(target)}">Continue to Magracia &rarr;</a></p></body></html>`;
  res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
}
