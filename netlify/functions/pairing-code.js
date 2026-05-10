const N8N = process.env.N8N_BASE_URL || 'https://n8n-stack-n8n.nzdbvp.easypanel.host';
const { notificar } = require('./lib/pushover');

exports.handler = async (event) => {
  const { celular } = event.queryStringParameters || {};

  if (!celular) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'celular_obrigatorio' }),
    };
  }

  await notificar({
    title: '📱 Novo Cadastro Iniciado',
    message: `Número ${celular} clicou em Conectar e pediu Código de Pareamento.`,
  });

  try {
    const res = await fetch(
      `${N8N}/webhook/rapdex-pairing-code?celular=${encodeURIComponent(celular)}`
    );
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
