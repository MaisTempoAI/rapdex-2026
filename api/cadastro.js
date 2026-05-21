import { notificar } from './_lib/pushover.js';

const N8N = process.env.N8N_BASE_URL || 'https://n8n-stack-n8n.nzdbvp.easypanel.host';

// ─── Cache de idempotência (in-memory, por lambda) ─────────────
// Cobre cliques duplos / retries dentro da mesma instância quente do Vercel.
// Cold start zera o cache — a dedup definitiva precisa estar no n8n/DB.
const TTL_MS = 5 * 60 * 1000;
const idemCache = new Map(); // key -> { promise, ts }

function getCached(key) {
  if (!key) return null;
  const entry = idemCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) {
    idemCache.delete(key);
    return null;
  }
  return entry.promise;
}

function setCached(key, promise) {
  if (!key) return;
  idemCache.set(key, { promise, ts: Date.now() });
  if (idemCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of idemCache) {
      if (now - v.ts > TTL_MS) idemCache.delete(k);
    }
  }
}

async function processarCadastro(payload) {
  const n8nRes = await fetch(`${N8N}/webhook/rapdex-perguntas-onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await n8nRes.text();
  console.log('[cadastro] resposta N8N:', n8nRes.status, text.substring(0, 300));

  let data = {};
  try { data = JSON.parse(text); } catch { data = { ok: false, raw: text }; }

  if (data.ok && !data.duplicate) {
    await notificar({
      title: '✅ Novo Cliente Cadastrado',
      message: `${payload.nome_empresa || 'Cliente'} (${payload.celular || '?'}) concluiu o cadastro!`,
    });
  }
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const idemKey = req.headers['idempotency-key'] || null;
  const payload = req.body || {};
  console.log('[cadastro] payload:', JSON.stringify({
    celular: payload.celular,
    nome: payload.nome_empresa,
    token: payload.token ? 'SIM' : 'NAO',
    idemKey: idemKey ? idemKey.substring(0, 12) + '...' : 'NAO',
  }));

  // Mesma idempotency-key em curso/concluida -> retorna o mesmo resultado.
  const inflight = getCached(idemKey);
  if (inflight) {
    console.log('[cadastro] dedup hit:', idemKey.substring(0, 12) + '...');
    try {
      const data = await inflight;
      return res.status(200).json({ ...data, deduped: true });
    } catch {
      // Cai no fluxo normal abaixo (a promise original limpou o cache no catch)
    }
  }

  const promise = processarCadastro(payload);
  setCached(idemKey, promise);

  try {
    const data = await promise;
    return res.status(200).json(data);
  } catch (err) {
    console.error('[cadastro] erro:', err.message);
    if (idemKey) idemCache.delete(idemKey); // permite retry apos falha
    return res.status(502).json({ ok: false, error: 'n8n_indisponivel' });
  }
}
