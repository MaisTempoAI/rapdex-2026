const CONNECT_URL = process.env.QUEPASA_CONNECT_WEBHOOK_URL || 'https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/rapdex2026-consulta-quepasa-connect';

exports.handler = async (event) => {
  const { token } = event.queryStringParameters || {};

  if (!token) {
    console.log('[status-conexao] chamado sem token');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conectado: false }),
    };
  }

  console.log('[status-conexao] verificando token:', token.substring(0, 8) + '...');
  console.log('[status-conexao] URL:', CONNECT_URL);

  try {
    const res = await fetch(CONNECT_URL, {
      headers: { quepasakey: token },
    });

    const text = await res.text();
    console.log('[status-conexao] resposta N8N:', res.status, text.substring(0, 200));

    if (!res.ok) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conectado: false }),
      };
    }

    let data = {};
    try { data = JSON.parse(text); } catch { data = {}; }

    const conectado = data.conectado === true || data.conectado === 'true';
    console.log('[status-conexao] conectado?', conectado);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conectado }),
    };
  } catch (err) {
    console.error('[status-conexao] erro fetch:', err.message);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conectado: false }),
    };
  }
};

