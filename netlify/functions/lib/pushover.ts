const PUSHOVER_WEBHOOK = 'https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/pushover-7988';

interface PushoverOpts {
  title?:    string;
  message:   string;
  priority?: -1 | 0 | 1;
}

export async function notificar({ title = 'RAPDEX', message, priority = 0 }: PushoverOpts): Promise<void> {
  try {
    await fetch(PUSHOVER_WEBHOOK, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title, message, priority }),
    });
  } catch {
    // notificação é best-effort — não bloqueia o fluxo principal
  }
}
