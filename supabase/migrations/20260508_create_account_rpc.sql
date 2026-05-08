-- ============================================================
-- RAPDEX — RPC create_account
-- Cria nova conta trial. Retorna ok:true ou ok:false se login
-- já existe.
-- ============================================================

CREATE OR REPLACE FUNCTION create_account(
  p_login       text,
  p_password    text,
  p_nome_empresa text,
  p_plano       plano_tipo,
  p_whatsapp    text
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Rejeita login duplicado
  IF EXISTS (SELECT 1 FROM rapdex_accounts WHERE login = p_login) THEN
    RETURN json_build_object('ok', false, 'error', 'login_ja_existe');
  END IF;

  INSERT INTO rapdex_accounts (
    login,
    quepasakey,
    nome_empresa,
    plano,
    whatsapp,
    bot_ativo,
    delay_resposta,
    saudacao_ativa,
    ausente_ativo,
    notifica_ativo,
    conta_ativa,
    em_trial,
    trial_inicio,
    trial_fim
  ) VALUES (
    p_login,
    p_password,
    p_nome_empresa,
    p_plano,
    p_whatsapp,
    false,
    1500,
    false,
    false,
    false,
    true,
    true,
    now(),
    now() + interval '7 days'
  );

  RETURN json_build_object('ok', true, 'login', p_login);
END;
$$;

GRANT EXECUTE ON FUNCTION create_account(text, text, text, plano_tipo, text) TO anon, authenticated;

-- Teste
SELECT create_account('19989645264', 'J13J3HLKQI', 'Teste RAPDEX', 'trial', '19989645264');
