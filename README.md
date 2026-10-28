# Magracia website - static clone
- 18 products in 4 Shopify collections, no prices, no Scented Candles.
- Buy buttons go to Etsy. Edit Etsy links in products.json, or via the hidden admin page (see below).
- Admin page: /admin.html - NOT linked anywhere on the shop, and blocked in robots.txt. It is not security by itself.
  Saving from the admin page requires two Vercel environment variables:
  1. ADMIN_PASSWORD - choose a strong password in Vercel, do not put it in this repo and do not share it in chat.
  2. GITHUB_TOKEN - a fine-grained token with Contents read/write for this repo only.
  The server function api/admin.js checks the password on the server and commits products.json to GitHub, then Vercel redeploys.
  Until those variables are set, the admin page can still download an updated products.json to commit manually.
- Images: paste an image URL when adding a listing. Before cancelling Shopify, save product images locally, or Shopify CDN links may stop working.
