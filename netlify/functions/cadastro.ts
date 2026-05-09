import type { Handler } from '@netlify/functions';

const N8N_BASE_URL = process.env.N8N_BASE_URL!;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }

  try {
    const res = await fetch(`${N8N_BASE_URL}/webhook/rapdex-perguntas-onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: event.body ?? '{}',
    });

    const text = await res.text();

    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: text,
    };
  } catch (err) {
    console.error('[cadastro] erro:', err);
    return {
      statusCode: 502,
      body: JSON.stringify({ ok: false, error: 'Falha ao contatar o servidor. Tente novamente.' }),
    };
  }
};
