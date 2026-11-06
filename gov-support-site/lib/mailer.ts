/** Sends via Resend's HTTP API (https://resend.com). Needs RESEND_API_KEY and EMAIL_FROM (a verified sender). */
export async function sendMail(opts: {to: string; subject: string; html: string; text: string; unsubscribeUrl: string}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error('RESEND_API_KEY / EMAIL_FROM not set');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      headers: {'List-Unsubscribe': `<${opts.unsubscribeUrl}>`},
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`resend HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
