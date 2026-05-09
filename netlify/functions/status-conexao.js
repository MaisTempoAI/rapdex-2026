const CONNECT_URL = process.env.QUEPASA_CONNECT_WEBHOOK_URL || '';

exports.handler = async (event) => {
  const { token } = event.queryStringParameters || {};

  if (!token || !CONNECT_URL) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conectado: false }),
    };
  }

  try {
    const res = await fetch(CONNECT_URL, {
      headers: { quepasakey: token },
    });

    if (!res.ok) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conectado: false }),
      };
    }

    const data = await res.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conectado: data.conectado ?? false }),
    };
  } catch {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conectado: false }),
    };
  }
};
