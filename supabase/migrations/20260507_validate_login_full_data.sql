-- ============================================================
-- RAPDEX — validate_login v3: retorna account + FAQs completos
-- Elimina a necessidade de SELECT direto nas tabelas pelo frontend
-- (RLS bloquearia anon de ler rapdex_accounts diretamente)
-- ============================================================

CREATE OR REPLACE FUNCTION validate_login(p_login text, p_password text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row  rapdex_accounts%ROWTYPE;
  v_faqs json;
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

  -- FAQs ativas ordenadas por slot
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'slot',      slot,
        'ativa',     ativa,
        'pergunta',  pergunta,
        'resposta',  resposta,
        'midia_url', midia_url
      ) ORDER BY slot
    ),
    '[]'::json
  )
  INTO v_faqs
  FROM rapdex_faqs
  WHERE login = p_login;

  INSERT INTO rapdex_auth_log (login, resultado, detalhe)
  VALUES (p_login, 'ok', 'plano=' || v_row.plano::text);

  RETURN json_build_object(
    'ok',      true,
    'account', row_to_json(v_row),
    'faqs',    v_faqs
  );
END;
$$;

GRANT EXECUTE ON FUNCTION validate_login(text, text) TO anon, authenticated;

-- Teste
SELECT validate_login('11999990000', 'FIT2026');
