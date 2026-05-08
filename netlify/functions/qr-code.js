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
