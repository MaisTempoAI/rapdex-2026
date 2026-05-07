import type { Handler } from '@netlify/functions';

const N8N_BASE_URL = process.env.N8N_BASE_URL!;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }

  const token = event.queryStringParameters?.token ?? '';

  try {
    const res = await fetch(
      `${N8N_BASE_URL}/webhook/rapdex-status-conexao?token=${encodeURIComponent(token)}`
    );

    // N8N retorna: { conectado: true/false }
    const text = await res.text();

    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: text,
    };
  } catch {
    return {
      statusCode: 200,
      body: JSON.stringify({ conectado: false }),
    };
  }
};
