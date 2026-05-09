import type { Handler } from '@netlify/functions';

const QUEPASA_BASE_URL = process.env.QUEPASA_BASE_URL ?? 'https://quepasa-stack-quepasa.pkgaq6.easypanel.host';
const QUEPASA_USER    = process.env.QUEPASA_USER    ?? 'access@maistempoai.com.br';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }

  const token = event.queryStringParameters?.token ?? '';
  if (!token) {
    return { statusCode: 200, body: JSON.stringify({ conectado: false }) };
  }

  try {
    const res = await fetch(`${QUEPASA_BASE_URL}/v3/bot/${token}`, {
      headers: {
        'X-QUEPASA-USER':  QUEPASA_USER,
        'X-QUEPASA-TOKEN': token,
      },
    });

    if (!res.ok) {
      return { statusCode: 200, body: JSON.stringify({ conectado: false }) };
    }

    const data = await res.json();
    const conectado = data?.server?.verified === true;
    const wid       = data?.server?.wid ?? null;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conectado, wid }),
    };
  } catch {
    return { statusCode: 200, body: JSON.stringify({ conectado: false }) };
  }
};
