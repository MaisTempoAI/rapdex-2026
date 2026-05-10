const CONNECT_URL = process.env.QUEPASA_CONNECT_WEBHOOK_URL || 'https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/rapdex2026-consulta-quepasa-connect';

export default async function handler(req, res) {
  const { token } = req.query || {};

  if (!token) {
    console.log('[status-conexao] chamado sem token');
    return res.status(200).json({ conectado: false });
  }

  console.log('[status-conexao] verificando token:', token.substring(0, 8) + '...');
  console.log('[status-conexao] URL:', CONNECT_URL);

  try {
    const n8nRes = await fetch(CONNECT_URL, {
      headers: { quepasakey: token },
    });

    const text = await n8nRes.text();
    console.log('[status-conexao] resposta N8N:', n8nRes.status, text.substring(0, 200));

    if (!n8nRes.ok) {
      return res.status(200).json({ conectado: false });
    }

    let data = {};
    try { data = JSON.parse(text); } catch { data = {}; }

    const conectado = data.conectado === true || data.conectado === 'true';
    console.log('[status-conexao] conectado?', conectado);

    return res.status(200).json({ conectado });
  } catch (err) {
    console.error('[status-conexao] erro fetch:', err.message);
    return res.status(200).json({ conectado: false });
  }
}
