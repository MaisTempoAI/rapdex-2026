-- RPC simples para checar duplicata de login antes de iniciar onboarding
CREATE OR REPLACE FUNCTION check_login_exists(p_login text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM rapdex_accounts WHERE login = p_login);
$$;

GRANT EXECUTE ON FUNCTION check_login_exists(text) TO anon, authenticated;
