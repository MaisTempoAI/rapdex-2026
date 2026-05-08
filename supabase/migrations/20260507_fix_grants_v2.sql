-- ============================================================
-- RAPDEX — Fix v2: GRANTs corrigidos (remove funções N8N-only)
-- get_usage_report e disable_expired_trials são chamadas só
-- pelo N8N via service_role — não precisam de GRANT para anon.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. GRANTs para as RPCs usadas pelo frontend (anon)
-- ────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION validate_login(text, text)                        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_account(text, text, text, plano_tipo, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION change_password(text, text, text)                 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION forgot_password_lookup(text)                      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION alocar_slot(text, text)                           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION atualizar_quepasakey_slot(text, text)             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION atualizar_wid_slot(text, text)                    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION liberar_slot(text)                                TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_slot_do_login(text)                           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_conta_por_quepasakey(text)                    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION salvar_mensagem(text, text, text, text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION activate_account(text, plano_tipo)                TO anon, authenticated;

-- Nota: get_usage_report e disable_expired_trials são N8N-only (service_role),
-- por isso NÃO precisam de GRANT para anon/authenticated.

-- ────────────────────────────────────────────────────────────
-- 2. Tabela de log de autenticação (se ainda não existir)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rapdex_auth_log (
  id         bigserial   PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  login      text        NOT NULL,
  resultado  text        NOT NULL,
  detalhe    text
);

CREATE INDEX IF NOT EXISTS idx_authlog_login ON rapdex_auth_log(login);
CREATE INDEX IF NOT EXISTS idx_authlog_ts    ON rapdex_auth_log(created_at DESC);

GRANT INSERT ON TABLE rapdex_auth_log TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE rapdex_auth_log_id_seq TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 3. validate_login atualizado: checa conta_ativa + loga
--    (idempotente — OR REPLACE)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION validate_login(p_login text, p_password text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row rapdex_accounts%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM rapdex_accounts
  WHERE login = p_login
    AND (quepasakey = p_password OR newpassword = p_password);

  IF NOT FOUND THEN
    INSERT INTO rapdex_auth_log (login, resultado, detalhe)
    VALUES (p_login, 'credenciais_invalidas', 'login ou senha incorretos');

    RETURN json_build_object('ok', false, 'error', 'credenciais_invalidas');
  END IF;

  IF NOT v_row.conta_ativa THEN
    INSERT INTO rapdex_auth_log (login, resultado, detalhe)
    VALUES (p_login, 'conta_inativa', 'conta_ativa = false');

    RETURN json_build_object('ok', false, 'error', 'conta_inativa');
  END IF;

  INSERT INTO rapdex_auth_log (login, resultado, detalhe)
  VALUES (p_login, 'ok', 'plano=' || v_row.plano::text);

  RETURN json_build_object(
    'ok',             true,
    'login',          v_row.login,
    'nome_empresa',   v_row.nome_empresa,
    'plano',          v_row.plano,
    'bot_ativo',      v_row.bot_ativo,
    'client_session', v_row.client_session
  );
END;
$$;

-- Re-grant após recriar a função
GRANT EXECUTE ON FUNCTION validate_login(text, text) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 4. Teste rápido
-- ────────────────────────────────────────────────────────────
SELECT validate_login('11999990000', 'FIT2026') AS resultado_ok;
SELECT validate_login('11999990000', 'ERRADO')  AS resultado_falha;
