import type { Handler } from '@netlify/functions';

const N8N_BASE_URL = process.env.N8N_BASE_URL!;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }

  const celular = event.queryStringParameters?.celular ?? '';

  try {
    const res = await fetch(
      `${N8N_BASE_URL}/webhook/rapdex-qr-code?celular=${encodeURIComponent(celular)}`
    );

    // N8N deve retornar sempre JSON: { ok: true, qr_base64: "...", token: "..." }
    const text = await res.text();

    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: text,
    };
  } catch (err) {
    console.error('[qr-code] erro:', err);
    return {
      statusCode: 502,
      body: JSON.stringify({ ok: false, error: 'Falha ao gerar QR Code. Tente novamente.' }),
    };
  }
};
