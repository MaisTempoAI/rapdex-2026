const PUSHOVER_WEBHOOK = process.env.PUSHOVER_WEBHOOK_URL || 'https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/pushover-7988';

async function notificar({ title = 'RAPDEX', message, priority = 0 }) {
  try {
    await fetch(PUSHOVER_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message, priority }),
    });
  } catch { }
}

module.exports = { notificar };
