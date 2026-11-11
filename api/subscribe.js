// Vercel serverless function: adds a visitor to the Brevo "Magracia
// Newsletter" contacts list, and pings Hasan about the signup.
// Same BREVO_API_KEY env var as api/contact.js (Brevo dashboard > SMTP & API
// > API Keys). If the key is not set, returns 503 and the form shows a
// mailto fallback, so no signup is silently lost.
// The list is found by name and created on first use (folder 1), so nobody
// has to create it in the Brevo dashboard first. The signup is single
// opt-in: the visitor sees an on-page confirmation, and every mail sent to
// the list must carry Brevo's unsubscribe link.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, website } = req.body || {};
  if (website) return res.status(200).json({ ok: true }); // honeypot: pretend success, send nothing
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address' });
  if (!process.env.BREVO_API_KEY) return res.status(503).json({ error: 'Email signup is not configured yet' });
  const key = process.env.BREVO_API_KEY;
  const headers = { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' };
  try {
    // Find the list, creating it on first use.
    let listId = null;
    const lists = await fetch('https://api.brevo.com/v3/contacts/lists?limit=50', { headers });
    if (!lists.ok) return res.status(502).json({ error: 'Could not join the list right now, please try again', stage: 'list-lookup', brevoStatus: lists.status });
    const data = await lists.json();
    const found = (data.lists || []).find(l => l.name === 'Magracia Newsletter');
    if (found) listId = found.id;
    if (!listId) {
      const created = await fetch('https://api.brevo.com/v3/contacts/lists', {
        method: 'POST', headers,
        body: JSON.stringify({ name: 'Magracia Newsletter', folderId: 1 }),
      });
      if (!created.ok) return res.status(502).json({ error: 'Could not join the list right now, please try again', stage: 'list-create', brevoStatus: created.status });
      listId = (await created.json()).id;
    }
    const added = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST', headers,
      body: JSON.stringify({ email, listIds: [listId], updateEnabled: true }),
    });
    if (!added.ok) return res.status(502).json({ error: 'Could not join the list right now, please try again', stage: 'contact-add', brevoStatus: added.status });
    // Tell Hasan. If this fails the signup still stands, so never fail the request for it.
    try {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST', headers,
        body: JSON.stringify({
          sender: { name: 'Magracia Newsletter', email: 'support@magracia.com' },
          to: [{ email: 'ujalawearables@gmail.com' }],
          subject: 'New newsletter subscriber',
          textContent: `A visitor joined the Magracia newsletter list.\n\nEmail: ${email}\n`,
        }),
      });
    } catch (e) { /* notification is best-effort only */ }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ error: 'Could not join the list right now, please try again' });
  }
}
