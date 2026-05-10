const PUSHOVER_TOKEN = process.env.PUSHOVER_TOKEN || 'ad1fqymffr4bxo7unb2gdew9k43vt9';
const PUSHOVER_USER  = process.env.PUSHOVER_USER  || 'ugsyoieaa8hvr2d8w9bbr2f6cvbe5e';

export async function notificar({ title = 'RAPDEX', message, priority = 0 }) {
  try {
    const res = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: PUSHOVER_TOKEN, user: PUSHOVER_USER, title, message, priority }),
    });
    if (!res.ok) {
      console.error('[pushover] erro HTTP', res.status, await res.text());
    }
  } catch (err) {
    console.error('[pushover] fetch falhou', err.message);
  }
}
