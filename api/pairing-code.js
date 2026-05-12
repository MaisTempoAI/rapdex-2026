import { notificar } from './_lib/pushover.js';

const N8N = process.env.N8N_BASE_URL || 'https://n8n-stack-n8n.nzdbvp.easypanel.host';

export default async function handler(req, res) {
  // Suporta POST (novo padrão) e GET (legado)
  const body = req.method === 'POST' ? req.body : null;
  const celular = body?.celular || req.query?.celular;
  const nome_empresa = body?.nome_empresa || null;

  if (!celular) {
    return res.status(400).json({ ok: false, error: 'celular_obrigatorio' });
  }

  await notificar({
    title: '📱 Novo Cadastro Mobile Iniciado',
    message: `Número ${celular} (${nome_empresa || 'sem nome'}) pediu Código de Pareamento.`,
  });

  // Monta payload no mesmo formato do fluxo desktop (cadastro)
  const payload = body ?? {
    celular,
    nome_empresa: null,
    token: null,
    dispositivo: 'celular',
    temp_upload_id: null,
    perguntas: [],
  };

  try {
    const n8nRes = await fetch(
      `${N8N}/webhook/rapdex-pairing-code`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const data = await n8nRes.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('[pairing-code] erro:', err.message);
    return res.status(502).json({ ok: false, error: 'n8n_indisponivel' });
  }
}
