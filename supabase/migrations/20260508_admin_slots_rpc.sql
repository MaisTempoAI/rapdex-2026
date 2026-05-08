-- RPCs admin para gestão de slots
-- Chamadas direto do frontend com a anon key

CREATE OR REPLACE FUNCTION admin_get_slots(p_key text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_key IS DISTINCT FROM current_setting('app.admin_key', true) THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized');
  END IF;
  RETURN (SELECT json_agg(s ORDER BY s.tipo, s.slot_nome) FROM rapdex_slots s);
END;
$$;

CREATE OR REPLACE FUNCTION admin_update_slot(
  p_key        text,
  p_id         bigint,
  p_webhook    text DEFAULT NULL,
  p_workflow   text DEFAULT NULL,
  p_status     text DEFAULT NULL,
  p_notas      text DEFAULT NULL
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_key IS DISTINCT FROM current_setting('app.admin_key', true) THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  UPDATE rapdex_slots SET
    webhook_mensagem = COALESCE(p_webhook,  webhook_mensagem),
    workflow_url     = COALESCE(p_workflow, workflow_url),
    status           = COALESCE(p_status::slot_status, status),
    slot_notas       = COALESCE(p_notas,   slot_notas)
  WHERE id = p_id;

  RETURN json_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION admin_liberar_slot(p_key text, p_id bigint)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_key IS DISTINCT FROM current_setting('app.admin_key', true) THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  UPDATE rapdex_slots SET
    status      = 'disponivel',
    login       = NULL,
    quepasa_key = NULL,
    quepasa_wid = NULL,
    liberado_em = now()
  WHERE id = p_id;

  RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_slots(text)                         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_slot(text,bigint,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_liberar_slot(text, bigint)              TO anon, authenticated;
