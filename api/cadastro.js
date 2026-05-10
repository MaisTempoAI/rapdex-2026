import { notificar } from './_lib/pushover.js';

const N8N = process.env.N8N_BASE_URL || 'https://n8n-stack-n8n.nzdbvp.easypanel.host';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    const payload = req.body || {};
    console.log('[cadastro] payload recebido:', JSON.stringify({ celular: payload.celular, nome: payload.nome_empresa, token: payload.token ? 'SIM' : 'NAO' }));

    const n8nRes = await fetch(`${N8N}/webhook/rapdex-perguntas-onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await n8nRes.text();
    console.log('[cadastro] resposta N8N:', n8nRes.status, text.substring(0, 300));

    let data = {};
    try { data = JSON.parse(text); } catch { data = { ok: false, raw: text }; }

    if (data.ok) {
      await notificar({
        title: '✅ Novo Cliente Cadastrado',
        message: `${payload.nome_empresa || 'Cliente'} (${payload.celular || '?'}) concluiu o cadastro!`,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('[cadastro] erro:', err.message);
    return res.status(502).json({ ok: false, error: 'n8n_indisponivel' });
  }
}
