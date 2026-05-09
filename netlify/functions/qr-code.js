const { notificar } = require('./lib/pushover');

const N8N = process.env.N8N_BASE_URL || 'https://n8n-stack-n8n.nzdbvp.easypanel.host';

exports.handler = async (event) => {
  const { celular } = event.queryStringParameters || {};

  if (!celular) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'celular_obrigatorio' }),
    };
  }

  try {
    const res = await fetch(
      `${N8N}/webhook/criaqrcoderapdex?celular=${encodeURIComponent(celular)}`
    );
    const data = await res.json();

    if (res.ok && data.ok !== false) {
      await notificar({
        title: '📱 QR Code Solicitado',
        message: `Número ${celular} iniciou o cadastro e pediu QR Code.`,
      });
    }

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
