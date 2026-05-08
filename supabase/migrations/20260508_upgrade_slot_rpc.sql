-- RPC: upgrade_slot
-- Chamado pelo N8N quando cliente faz upgrade de plano.
-- Libera o slot atual e aloca um novo do tipo correto.
-- Retorna os dados do novo slot para o N8N reconfigurar o QUEPASA.

CREATE OR REPLACE FUNCTION upgrade_slot(p_login text, p_novo_tipo text DEFAULT 'premium')
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_slot_atual  rapdex_slots%ROWTYPE;
  v_slot_novo   rapdex_slots%ROWTYPE;
BEGIN
  -- Busca slot atual do cliente
  SELECT * INTO v_slot_atual FROM rapdex_slots WHERE login = p_login LIMIT 1;

  -- Libera slot atual (se existir)
  IF FOUND THEN
    UPDATE rapdex_slots
    SET status      = 'disponivel',
        login       = NULL,
        quepasa_key = NULL,
        quepasa_wid = NULL,
        liberado_em = now()
    WHERE id = v_slot_atual.id;
  END IF;

  -- Aloca novo slot do tipo solicitado
  SELECT * INTO v_slot_novo
  FROM rapdex_slots
  WHERE status = 'disponivel'
    AND tipo   = p_novo_tipo::slot_tipo
  ORDER BY slot_nome
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'sem_slot_disponivel', 'tipo', p_novo_tipo);
  END IF;

  UPDATE rapdex_slots
  SET status     = 'ocupado',
      login      = p_login,
      alocado_em = now()
  WHERE id = v_slot_novo.id;

  RETURN json_build_object(
    'ok',              true,
    'slot_nome',       v_slot_novo.slot_nome,
    'slot_anterior',   v_slot_atual.slot_nome,
    'webhook_mensagem',v_slot_novo.webhook_mensagem,
    'workflow_url',    v_slot_novo.workflow_url,
    'quepasa_base_url',v_slot_novo.quepasa_base_url
  );
END;
$$;
