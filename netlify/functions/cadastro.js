const N8N = process.env.N8N_BASE_URL || 'https://n8n-stack-n8n.nzdbvp.easypanel.host';
const PUSHOVER_URL = process.env.PUSHOVER_WEBHOOK_URL || 'https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/pushover-7988';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'method_not_allowed' }),
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');

    await fetch(PUSHOVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '✅ Novo Cliente Cadastrado',
        message: `${payload.nome_empresa || 'Cliente'} (${payload.celular || '?'}) concluiu o cadastro!`,
      }),
    }).catch(() => {});

    const res = await fetch(`${N8N}/webhook/rapdex-perguntas-onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'n8n_indisponivel' }),
    };
  }
};
