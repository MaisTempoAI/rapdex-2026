const N8N = process.env.N8N_BASE_URL || 'https://n8n-stack-n8n.nzdbvp.easypanel.host';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    const payload = req.body || {};

    const n8nRes = await fetch(`${N8N}/webhook/rapdex-forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await n8nRes.text();
    let data = {};
    try { data = JSON.parse(text); } catch { data = { ok: false, raw: text }; }

    return res.status(n8nRes.status).json(data);
  } catch (err) {
    console.error('[forgot-password] erro:', err.message);
    return res.status(502).json({ ok: false, error: 'Servidor indisponível.' });
  }
};
