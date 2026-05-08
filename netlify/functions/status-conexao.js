const QUEPASA = process.env.QUEPASA_BASE_URL || 'https://quepasa-stack-quepasa.pkgaq6.easypanel.host';
const QUEPASA_USER = process.env.QUEPASA_USER || 'access@maistempoai.com.br';

exports.handler = async (event) => {
  const { token } = event.queryStringParameters || {};

  if (!token) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conectado: false, error: 'token_obrigatorio' }),
    };
  }

  try {
    const res = await fetch(`${QUEPASA}/v3/bot/${encodeURIComponent(token)}`, {
      headers: {
        'Accept': 'application/json',
        'X-QUEPASA-TOKEN': token,
        'X-QUEPASA-USER': QUEPASA_USER,
      },
    });

    if (!res.ok) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conectado: false }),
      };
    }

    const data = await res.json();
    const conectado = data.success === true && !!data.server?.wid;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conectado, wid: data.server?.wid ?? null }),
    };
  } catch {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conectado: false }),
    };
  }
};
