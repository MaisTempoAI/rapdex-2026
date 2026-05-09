import type { Handler } from '@netlify/functions';
import { notificar } from './lib/pushover';

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

    const text = await res.text();

    if (res.ok) {
      await notificar({
        title:   '📱 QR Code Solicitado',
        message: `Número ${celular} iniciou o cadastro e pediu QR Code.`,
      });
    }

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
