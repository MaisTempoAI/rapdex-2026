// Admin API para gerenciamento de slots
// Protegida pela variável ADMIN_SECRET
// Usa SUPABASE_SERVICE_KEY para ter acesso total à tabela rapdex_slots

const SUPABASE_URL    = process.env.VITE_SUPABASE_URL || 'https://rudtxgwzqrsvrdniqvav.supabase.co';
const SERVICE_KEY     = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_SECRET    = process.env.ADMIN_SECRET;

const supabaseHeaders = {
  'apikey':        SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type':  'application/json',
  'Prefer':        'return=representation',
};

module.exports = async function handler(req, res) {
  // Verifica senha admin
  const adminKey = req.headers['x-admin-key'] || req.query?.admin_key;
  if (!ADMIN_SECRET || adminKey !== ADMIN_SECRET) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const method = req.method;

  // GET — lista todos os slots
  if (method === 'GET') {
    const supaRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rapdex_slots?select=*&order=tipo,slot_nome`,
      { headers: supabaseHeaders }
    );
    const raw = await supaRes.text();
    const data = JSON.parse(raw);
    return res.status(200).json({
      _debug: { count: data.length, http_status: supaRes.status, service_key_present: !!SERVICE_KEY, url: SUPABASE_URL },
      slots: data,
    });
  }

  // PUT — atualiza um slot (webhook, status, notas etc.)
  if (method === 'PUT') {
    const { id, ...fields } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });

    const allowed = ['webhook_mensagem', 'workflow_url', 'status', 'slot_notas', 'quepasa_base_url', 'tipo'];
    const payload = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)));

    const supaRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rapdex_slots?id=eq.${id}`,
      { method: 'PATCH', headers: supabaseHeaders, body: JSON.stringify(payload) }
    );
    const data = await supaRes.json();
    return res.status(200).json({ ok: true, slot: data[0] });
  }

  // POST — libera slot manualmente (emergência)
  if (method === 'POST') {
    const { action, id } = req.body || {};

    if (action === 'liberar' && id) {
      const supaRes = await fetch(
        `${SUPABASE_URL}/rest/v1/rapdex_slots?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: supabaseHeaders,
          body: JSON.stringify({
            status:      'disponivel',
            login:       null,
            quepasa_key: null,
            quepasa_wid: null,
            liberado_em: new Date().toISOString(),
          }),
        }
      );
      const data = await supaRes.json();
      return res.status(200).json({ ok: true, slot: data[0] });
    }

    return res.status(400).json({ ok: false, error: 'action_invalida' });
  }

  return res.status(405).json({ ok: false, error: 'method_not_allowed' });
};
