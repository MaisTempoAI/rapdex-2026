// Admin API para gerenciamento de slots
// Protegida pela variável ADMIN_SECRET no Netlify
// Usa SUPABASE_SERVICE_KEY para ter acesso total à tabela rapdex_slots

const SUPABASE_URL    = process.env.VITE_SUPABASE_URL || 'https://rudtxgwzqrsvrdniqvav.supabase.co';
const SERVICE_KEY     = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_SECRET    = process.env.ADMIN_SECRET;

const headers = (extra = {}) => ({
  'Content-Type': 'application/json',
  ...extra,
});

const supabaseHeaders = {
  'apikey':        SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type':  'application/json',
  'Prefer':        'return=representation',
};

exports.handler = async (event) => {
  // Verifica senha admin
  const adminKey = event.headers['x-admin-key'] || event.queryStringParameters?.admin_key;
  if (!ADMIN_SECRET || adminKey !== ADMIN_SECRET) {
    return {
      statusCode: 401,
      headers: headers(),
      body: JSON.stringify({ ok: false, error: 'unauthorized' }),
    };
  }

  const method = event.httpMethod;

  // GET — lista todos os slots
  if (method === 'GET') {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rapdex_slots?select=*&order=tipo,slot_nome`,
      { headers: supabaseHeaders }
    );
    const raw = await res.text();
    const data = JSON.parse(raw);
    // Sempre inclui debug info para diagnosticar
    return {
      statusCode: 200,
      headers: headers({ 'Access-Control-Allow-Origin': '*' }),
      body: JSON.stringify({
        _debug: { count: data.length, http_status: res.status, service_key_present: !!SERVICE_KEY, url: SUPABASE_URL },
        slots: data,
      }),
    };
  }

  // PUT — atualiza um slot (webhook, status, notas etc.)
  if (method === 'PUT') {
    const { id, ...fields } = JSON.parse(event.body || '{}');
    if (!id) return { statusCode: 400, headers: headers(), body: JSON.stringify({ ok: false, error: 'id_obrigatorio' }) };

    // Campos permitidos para edição via admin
    const allowed = ['webhook_mensagem', 'workflow_url', 'status', 'slot_notas', 'quepasa_base_url', 'tipo'];
    const payload = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)));

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rapdex_slots?id=eq.${id}`,
      { method: 'PATCH', headers: supabaseHeaders, body: JSON.stringify(payload) }
    );
    const data = await res.json();
    return {
      statusCode: 200,
      headers: headers(),
      body: JSON.stringify({ ok: true, slot: data[0] }),
    };
  }

  // POST — libera slot manualmente (emergência)
  if (method === 'POST') {
    const { action, id } = JSON.parse(event.body || '{}');

    if (action === 'liberar' && id) {
      const res = await fetch(
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
      const data = await res.json();
      return { statusCode: 200, headers: headers(), body: JSON.stringify({ ok: true, slot: data[0] }) };
    }

    return { statusCode: 400, headers: headers(), body: JSON.stringify({ ok: false, error: 'action_invalida' }) };
  }

  return { statusCode: 405, headers: headers(), body: JSON.stringify({ ok: false, error: 'method_not_allowed' }) };
};
