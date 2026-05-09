import type { Handler } from '@netlify/functions';
import { notificar } from './lib/pushover';

const N8N_BASE_URL = process.env.N8N_BASE_URL!;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }

  let payload: { celular?: string; nome_empresa?: string } = {};
  try { payload = JSON.parse(event.body ?? '{}'); } catch { /* ignora */ }

  try {
    const res = await fetch(`${N8N_BASE_URL}/webhook/rapdex-perguntas-onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: event.body ?? '{}',
    });

    const text = await res.text();
    let data: { ok?: boolean } = {};
    try { data = JSON.parse(text); } catch { /* ignora */ }

    if (data.ok) {
      await notificar({
        title:   '🟢 Novo Cliente RAPDEX',
        message: `${payload.nome_empresa ?? 'Empresa'} (${payload.celular ?? '?'}) acabou de se cadastrar!`,
      });
    }

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
