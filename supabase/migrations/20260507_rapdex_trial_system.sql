-- ============================================================
-- RAPDEX — Sistema de Trial 7 dias
-- ============================================================

-- Campos de trial na tabela de contas
ALTER TABLE rapdex_accounts
  ADD COLUMN IF NOT EXISTS conta_ativa   boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS em_trial      boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS trial_inicio  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trial_fim     timestamptz NOT NULL DEFAULT (now() + interval '7 days');

-- Index para o cron job de expiração
CREATE INDEX IF NOT EXISTS idx_accounts_trial_expira
  ON rapdex_accounts(trial_fim, em_trial, conta_ativa);

-- ────────────────────────────────────────────────────────────
-- RPC: disable_expired_trials
-- Chamado pelo N8N via cron diário
-- Retorna os clientes expirados para o N8N enviar mensagens
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION disable_expired_trials()
RETURNS TABLE(
  login        text,
  whatsapp     text,
  nome_empresa text,
  trial_inicio timestamptz,
  trial_fim    timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  UPDATE rapdex_accounts
  SET
    conta_ativa = false,
    em_trial    = false,
    bot_ativo   = false
  WHERE
    em_trial    = true
    AND conta_ativa = true
    AND trial_fim < now()
  RETURNING
    rapdex_accounts.login,
    rapdex_accounts.whatsapp,
    rapdex_accounts.nome_empresa,
    rapdex_accounts.trial_inicio,
    rapdex_accounts.trial_fim;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- RPC: get_usage_report
-- Gera relatório de uso para um cliente no período do trial
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_usage_report(p_login text, p_desde timestamptz)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_leads       integer;
  v_leads_ativos      integer;
  v_total_msgs        integer;
  v_msgs_bot          integer;
  v_msgs_cliente      integer;
  v_faqs_ativas       integer;
  v_faq_mais_usada    text;
  v_conta             rapdex_accounts%ROWTYPE;
BEGIN
  SELECT * INTO v_conta FROM rapdex_accounts WHERE login = p_login;

  -- Leads no período
  SELECT COUNT(*) INTO v_total_leads
    FROM rapdex_leads WHERE login = p_login AND created_at >= p_desde;

  SELECT COUNT(*) INTO v_leads_ativos
    FROM rapdex_leads WHERE login = p_login AND bot_ativo = true;

  -- Mensagens no período
  SELECT COUNT(*) INTO v_total_msgs
    FROM rapdex_conversations WHERE login = p_login AND created_at >= p_desde;

  SELECT COUNT(*) INTO v_msgs_bot
    FROM rapdex_conversations WHERE login = p_login AND de_mim = true AND created_at >= p_desde;

  SELECT COUNT(*) INTO v_msgs_cliente
    FROM rapdex_conversations WHERE login = p_login AND de_mim = false AND created_at >= p_desde;

  -- FAQs configuradas
  SELECT COUNT(*) INTO v_faqs_ativas
    FROM rapdex_faqs WHERE login = p_login AND ativa = true;

  RETURN json_build_object(
    'login',          p_login,
    'nome_empresa',   v_conta.nome_empresa,
    'periodo_inicio', p_desde,
    'periodo_fim',    now(),
    'leads_novos',    v_total_leads,
    'leads_ativos',   v_leads_ativos,
    'msgs_total',     v_total_msgs,
    'msgs_bot',       v_msgs_bot,
    'msgs_cliente',   v_msgs_cliente,
    'faqs_ativas',    v_faqs_ativas,
    'taxa_resposta',  CASE WHEN v_msgs_cliente > 0
                       THEN ROUND((v_msgs_bot::numeric / v_msgs_cliente) * 100, 1)
                       ELSE 0 END
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- RPC: activate_account
-- N8N chama quando cliente faz upgrade de plano
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION activate_account(p_login text, p_plano plano_tipo DEFAULT 'premium')
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM rapdex_accounts WHERE login = p_login) THEN
    RETURN json_build_object('ok', false, 'error', 'login_nao_encontrado');
  END IF;

  UPDATE rapdex_accounts
  SET
    conta_ativa = true,
    em_trial    = false,
    bot_ativo   = true,
    plano       = p_plano
  WHERE login = p_login;

  RETURN json_build_object('ok', true, 'login', p_login, 'plano', p_plano);
END;
$$;
