-- Atualiza validate_login para distinguir trial expirado de conta bloqueada
CREATE OR REPLACE FUNCTION validate_login(p_login text, p_password text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row rapdex_accounts%ROWTYPE;
  v_faqs json;
BEGIN
  SELECT * INTO v_row
  FROM rapdex_accounts
  WHERE login = p_login AND quepasakey = p_password;

  IF NOT FOUND THEN
    INSERT INTO rapdex_auth_log (login, resultado, detalhe)
    VALUES (p_login, 'credenciais_invalidas', 'login ou senha incorretos');
    RETURN json_build_object('ok', false, 'error', 'credenciais_invalidas');
  END IF;

  IF NOT v_row.conta_ativa THEN
    -- Distingue trial expirado de bloqueio manual
    IF v_row.trial_fim < now() THEN
      INSERT INTO rapdex_auth_log (login, resultado, detalhe)
      VALUES (p_login, 'trial_expirado', 'trial_fim ultrapassado');
      RETURN json_build_object(
        'ok',         false,
        'error',      'trial_expirado',
        'trial_fim',  v_row.trial_fim
      );
    ELSE
      INSERT INTO rapdex_auth_log (login, resultado, detalhe)
      VALUES (p_login, 'conta_inativa', 'conta_ativa = false');
      RETURN json_build_object('ok', false, 'error', 'conta_inativa');
    END IF;
  END IF;

  -- FAQs ativas ordenadas por slot
  SELECT json_agg(f ORDER BY f.slot)
  INTO v_faqs
  FROM rapdex_faqs f
  WHERE f.login = p_login AND f.ativa = true;

  INSERT INTO rapdex_auth_log (login, resultado, detalhe)
  VALUES (p_login, 'ok', 'login bem-sucedido');

  RETURN json_build_object(
    'ok',      true,
    'account', row_to_json(v_row),
    'faqs',    COALESCE(v_faqs, '[]'::json)
  );
END;
$$;
