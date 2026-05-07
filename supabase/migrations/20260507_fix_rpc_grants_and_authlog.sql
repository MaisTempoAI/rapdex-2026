-- ============================================================
-- RAPDEX — Fix: GRANT nas RPCs + tabela de log de autenticação
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. GRANT EXECUTE nas RPCs para roles anon e authenticated
--    Por padrão o Supabase não concede automaticamente.
-- ────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION validate_login(text, text)             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_account(text, text, text, plano_tipo, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION change_password(text, text, text)      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION forgot_password_lookup(text)           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION alocar_slot(text, text)                TO anon, authenticated;
GRANT EXECUTE ON FUNCTION atualizar_quepasakey_slot(text, text)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION atualizar_wid_slot(text, text)         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION liberar_slot(text)                     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_slot_do_login(text)                TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_conta_por_quepasakey(text)         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION salvar_mensagem(text, text, text, text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION disable_expired_trials()               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_usage_report(text, text)           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION activate_account(text, plano_tipo)     TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 2. Tabela de log de autenticação (oculta dos clientes)
--    Sem RLS — só service_role lê. Não armazena senha.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rapdex_auth_log (
  id         bigserial   PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  login      text        NOT NULL,
  resultado  text        NOT NULL,  -- 'ok' | 'credenciais_invalidas' | 'conta_inativa' | 'rpc_error'
  detalhe    text                   -- info extra sem dados sensíveis
);

-- Sem RLS: clientes não veem. service_role acessa diretamente pelo N8N/dashboard.
-- Índice para buscas por login e por data
CREATE INDEX IF NOT EXISTS idx_authlog_login ON rapdex_auth_log(login);
CREATE INDEX IF NOT EXISTS idx_authlog_ts    ON rapdex_auth_log(created_at DESC);

-- Grant: anon e authenticated podem inserir (para o RPC logar), mas NÃO selecionar
GRANT INSERT ON TABLE rapdex_auth_log TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE rapdex_auth_log_id_seq TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 3. Atualiza validate_login para logar cada tentativa
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION validate_login(p_login text, p_password text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row rapdex_accounts%ROWTYPE;
BEGIN
  -- Busca pelo login + senha (quepasakey ou newpassword)
  SELECT * INTO v_row
  FROM rapdex_accounts
  WHERE login = p_login
    AND (quepasakey = p_password OR newpassword = p_password);

  IF NOT FOUND THEN
    -- Loga tentativa falha (sem revelar se o login existe)
    INSERT INTO rapdex_auth_log (login, resultado, detalhe)
    VALUES (p_login, 'credenciais_invalidas', 'login ou senha incorretos');

    RETURN json_build_object('ok', false, 'error', 'credenciais_invalidas');
  END IF;

  -- Conta inativa (trial expirado ou cancelado)
  IF NOT v_row.conta_ativa THEN
    INSERT INTO rapdex_auth_log (login, resultado, detalhe)
    VALUES (p_login, 'conta_inativa', 'conta_ativa = false');

    RETURN json_build_object('ok', false, 'error', 'conta_inativa');
  END IF;

  -- Sucesso
  INSERT INTO rapdex_auth_log (login, resultado, detalhe)
  VALUES (p_login, 'ok', 'plano=' || v_row.plano::text);

  RETURN json_build_object(
    'ok',             true,
    'login',          v_row.login,
    'nome_empresa',   v_row.nome_empresa,
    'plano',          v_row.plano,
    'bot_ativo',      v_row.bot_ativo,
    'whatsapp',       v_row.whatsapp,
    'client_session', v_row.client_session
  );
END;
$$;

-- Re-grant após recriar a função
GRANT EXECUTE ON FUNCTION validate_login(text, text) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 4. Teste rápido — confirma que a função funciona
-- ────────────────────────────────────────────────────────────
SELECT validate_login('11999990000', 'FIT2026') AS resultado_esperado_ok;
SELECT validate_login('11999990000', 'ERRADO')  AS resultado_esperado_falha;
