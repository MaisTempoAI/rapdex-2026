import { notificar } from './_lib/pushover.js';

const N8N = process.env.N8N_BASE_URL || 'https://n8n-stack-n8n.nzdbvp.easypanel.host';

export default async function handler(req, res) {
  const { celular } = req.query || {};

  if (!celular) {
    return res.status(400).json({ ok: false, error: 'celular_obrigatorio' });
  }

  await notificar({
    title: '📱 Novo Cadastro Iniciado',
    message: `Número ${celular} clicou em Conectar e pediu Código de Pareamento.`,
  });

  try {
    const n8nRes = await fetch(
      `${N8N}/webhook/rapdex-pairing-code?celular=${encodeURIComponent(celular)}`
    );
    const data = await n8nRes.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('[pairing-code] erro:', err.message);
    return res.status(502).json({ ok: false, error: 'n8n_indisponivel' });
  }
}
