// Vercel serverless function: sends a contact-form message via Brevo DIRECTLY to
// ujalawearables@gmail.com (not via support@magracia.com).
// Reason, found 2026-10-29: Brevo's shared relay IP was on the SpamCop blacklist, so
// improvMX (the MX for magracia.com) rejected every Brevo delivery to support@magracia.com
// with "551-5.71 Your IP is black listed by SpamCop.org" — a soft bounce on every test.
// Sending direct to Gmail skips that improvMX hop. The sender is still
// support@magracia.com and reply-to is still the visitor, so Hasan replies from Gmail
// exactly as before. Direct mail to support@magracia.com still forwards via improvMX
// for anything else; only this form bypasses it.
// Required Vercel environment variable (never commit this value):
//   BREVO_API_KEY - Brevo API key (Brevo dashboard > SMTP & API > API Keys).
// If the key is not set, this returns 503 and the contact form falls back to
// opening the visitor's email app addressed to support@magracia.com, so no
// message is silently lost.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { name, email, headline, message, website } = req.body || {};
  if (website) return res.status(200).json({ ok: true }); // honeypot: pretend success, send nothing
  if (!name || !email || !headline || !message) return res.status(400).json({ error: 'Name, email, headline and message are all required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address' });
  if (!process.env.BREVO_API_KEY) return res.status(503).json({ error: 'Email sending is not configured yet' });
  const text = `New message from the Magracia contact form\n\nName: ${name}\nEmail: ${email}\nHeadline: ${headline}\n\n${message}\n`;
  const brevo = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Magracia Contact Form', email: 'support@magracia.com' },
      to: [{ email: 'ujalawearables@gmail.com' }],
      replyTo: { email, name },
      subject: headline,
      textContent: text,
    }),
  });
  if (!brevo.ok) return res.status(502).json({ error: 'Could not send the message, please try again' });
  return res.status(200).json({ ok: true });
}
