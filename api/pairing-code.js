import { notificar } from './_lib/pushover.js';

const N8N          = process.env.N8N_BASE_URL      || 'https://n8n-stack-n8n.nzdbvp.easypanel.host';
const PAIRING_URL  = process.env.GET_PAIRING_CODE  || `${N8N}/webhook/rapdex-pairing-code`;

export default async function handler(req, res) {
  const body         = req.method === 'POST' ? req.body : null;
  const celular      = body?.celular      || req.query?.celular;
  const nome_empresa = body?.nome_empresa || null;
  const dispositivo  = body?.dispositivo  || 'celular';

  if (!celular) {
    return res.status(400).json({ ok: false, error: 'celular_obrigatorio' });
  }

  await notificar({
    title: '📱 Novo Cadastro Mobile Iniciado',
    message: `Número ${celular} (${nome_empresa || 'sem nome'}) pediu Código de Pareamento.`,
  });

  try {
    const params = new URLSearchParams({ celular, dispositivo });
    const n8nRes = await fetch(`${PAIRING_URL}?${params}`, { method: 'GET' });
    const data   = await n8nRes.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('[pairing-code] erro:', err.message);
    return res.status(502).json({ ok: false, error: 'n8n_indisponivel' });
  }
}
