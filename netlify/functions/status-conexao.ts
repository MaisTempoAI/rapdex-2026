import type { Handler } from '@netlify/functions';

const CONNECT_CHECK_URL = process.env.QUEPASA_CONNECT_WEBHOOK_URL ?? '';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }

  const token = event.queryStringParameters?.token ?? '';
  if (!token || !CONNECT_CHECK_URL) {
    return { statusCode: 200, body: JSON.stringify({ conectado: false }) };
  }

  try {
    const res = await fetch(CONNECT_CHECK_URL, {
      headers: { quepasakey: token },
    });

    if (!res.ok) {
      return { statusCode: 200, body: JSON.stringify({ conectado: false }) };
    }

    const data = await res.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conectado: data.conectado ?? false }),
    };
  } catch {
    return { statusCode: 200, body: JSON.stringify({ conectado: false }) };
  }
};
