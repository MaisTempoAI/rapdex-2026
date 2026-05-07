-- ============================================================
-- RAPDEX — Atualiza disable_expired_trials para liberar slots
-- Rodar após 20260507_rapdex_slots.sql e 20260507_fix_slots_nullable_quepasakey.sql
-- ============================================================

CREATE OR REPLACE FUNCTION disable_expired_trials()
RETURNS TABLE(
  login            text,
  whatsapp         text,
  nome_empresa     text,
  quepasa_key      text,
  quepasa_base_url text,
  trial_inicio     timestamptz,
  trial_fim        timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH expirados AS (
    UPDATE rapdex_accounts
    SET
      conta_ativa = false,
      em_trial    = false,
      bot_ativo   = false,
      client_session = NULL
    WHERE
      em_trial    = true
      AND conta_ativa = true
      AND trial_fim < now()
    RETURNING
      rapdex_accounts.login,
      rapdex_accounts.whatsapp,
      rapdex_accounts.nome_empresa,
      rapdex_accounts.trial_inicio,
      rapdex_accounts.trial_fim
  ),
  -- Captura quepasa_key ANTES de limpar (N8N precisa para desconectar QUEPASA)
  keys_antes AS (
    SELECT s.login, s.quepasa_key, s.quepasa_base_url
    FROM rapdex_slots s
    WHERE EXISTS (SELECT 1 FROM expirados e WHERE e.login = s.login)
  ),
  slots_liberados AS (
    UPDATE rapdex_slots s
    SET
      status      = 'disponivel',
      login       = NULL,
      quepasa_key = NULL,
      quepasa_wid = NULL,
      liberado_em = now()
    WHERE EXISTS (SELECT 1 FROM expirados e WHERE e.login = s.login)
    RETURNING s.id
  )
  SELECT
    e.login,
    e.whatsapp,
    e.nome_empresa,
    COALESCE(ka.quepasa_key, '')      AS quepasa_key,
    COALESCE(ka.quepasa_base_url, '') AS quepasa_base_url,
    e.trial_inicio,
    e.trial_fim
  FROM expirados e
  LEFT JOIN keys_antes ka ON ka.login = e.login;
END;
$$;
