const SUPABASE_URL    = process.env.VITE_SUPABASE_URL || 'https://rudtxgwzqrsvrdniqvav.supabase.co';
const SERVICE_KEY     = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
const ADMIN_SECRET    = process.env.ADMIN_SECRET;
const ADMIN_PWD       = process.env.VITE_ADMIN_PASSWORD;

const supabaseHeaders = {
  'apikey':        SERVICE_KEY || '',
  'Authorization': `Bearer ${SERVICE_KEY || ''}`,
  'Content-Type':  'application/json',
  'Prefer':        'return=representation',
};

function authorized(key) {
  if (!key) return false;
  const secretMatch = ADMIN_SECRET && key === ADMIN_SECRET;
  const pwdMatch = ADMIN_PWD && key === ADMIN_PWD;
  return secretMatch || pwdMatch;
}

export default async function handler(req, res) {
  const adminKey = req.headers['x-admin-key'] || req.query?.admin_key;
  if (!authorized(adminKey)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const method = req.method;

  if (method === 'GET') {
    const supaRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rapdex_slots?select=*&order=tipo,slot_nome`,
      { headers: supabaseHeaders }
    );
    
    if (!supaRes.ok) {
      const err = await supaRes.json().catch(() => ({}));
      return res.status(supaRes.status).json({ 
        ok: false, 
        error: err.message || `Erro Supabase: ${supaRes.status}`,
        _debug: { service_key_present: !!SERVICE_KEY, url: SUPABASE_URL }
      });
    }

    const data = await supaRes.json();
    return res.status(200).json({
      ok: true,
      slots: Array.isArray(data) ? data : [],
    });
  }

  if (method === 'PUT') {
    const { id, ...fields } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });

    const allowed = ['webhook_mensagem', 'workflow_url', 'status', 'slot_notas', 'quepasa_base_url', 'tipo', 'login', 'n8n_hok_url', 'trial_expires_at'];
    const payload = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)));

    const supaRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rapdex_slots?id=eq.${id}`,
      { method: 'PATCH', headers: supabaseHeaders, body: JSON.stringify(payload) }
    );
    const data = await supaRes.json();
    return res.status(200).json({ ok: true, slot: data[0] });
  }

  if (method === 'POST') {
    const { action, id, slot } = req.body || {};

    if (action === 'liberar' && id) {
      const supaRes = await fetch(
        `${SUPABASE_URL}/rest/v1/rapdex_slots?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: supabaseHeaders,
          body: JSON.stringify({
            status:      'disponivel',
            tipo:        'free',
            login:       null,
            quepasa_key: null,
            quepasa_wid: null,
            trial_expires_at: null,
            liberado_em: new Date().toISOString(),
          }),
        }
      );
      const data = await supaRes.json();
      return res.status(200).json({ ok: true, slot: data[0] });
    }

    if (action === 'criar' && slot) {
      if (!slot.slot_nome) return res.status(400).json({ ok: false, error: 'nome_obrigatorio' });
      const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/rapdex_slots`, {
        method: 'POST', headers: supabaseHeaders, body: JSON.stringify(slot),
      });
      const data = await supaRes.json();
      return res.status(200).json({ ok: true, slot: data[0] });
    }

    return res.status(400).json({ ok: false, error: 'action_invalida' });
  }

  if (method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
    await fetch(`${SUPABASE_URL}/rest/v1/rapdex_slots?id=eq.${id}`, {
      method: 'DELETE', headers: supabaseHeaders,
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ ok: false, error: 'method_not_allowed' });
}
