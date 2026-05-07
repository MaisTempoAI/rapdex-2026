-- ============================================================
-- RAPDEX — Fix: quepasa_key nullable nos slots
-- A key é gerada DINAMICAMENTE pelo N8N ao criar sessão QUEPASA.
-- O slot só possui webhook_mensagem fixo; quepasa_key é preenchida
-- depois da sessão QUEPASA ser criada e antes do cadastro finalizar.
-- ============================================================

-- 1. Torna quepasa_key nullable
ALTER TABLE rapdex_slots
  ALTER COLUMN quepasa_key DROP NOT NULL;

-- 2. Troca o UNIQUE constraint por um índice parcial (permite múltiplos NULL)
ALTER TABLE rapdex_slots
  DROP CONSTRAINT IF EXISTS rapdex_slots_quepasa_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_slots_quepasa_key_notnull
  ON rapdex_slots(quepasa_key)
  WHERE quepasa_key IS NOT NULL;

-- 3. Recria alocar_slot SEM esperar quepasa_key
--    N8N chama isso para reservar o slot e obter webhook_mensagem + quepasa_base_url.
--    A quepasa_key será salva depois via atualizar_quepasakey_slot().
CREATE OR REPLACE FUNCTION alocar_slot(p_login text, p_tipo text DEFAULT 'free')
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_slot rapdex_slots%ROWTYPE;
BEGIN
  -- Se o login já tem slot alocado, retorna o existente
  SELECT * INTO v_slot FROM rapdex_slots WHERE login = p_login LIMIT 1;
  IF FOUND THEN
    RETURN json_build_object(
      'ok',              true,
      'slot_nome',       v_slot.slot_nome,
      'quepasa_key',     v_slot.quepasa_key,
      'quepasa_base_url',v_slot.quepasa_base_url,
      'webhook_mensagem',v_slot.webhook_mensagem,
      'ja_alocado',      true
    );
  END IF;

  -- Pega o primeiro slot disponível do tipo (lock para evitar dupla alocação)
  SELECT * INTO v_slot
  FROM rapdex_slots
  WHERE status = 'disponivel'
    AND tipo = p_tipo::slot_tipo
  ORDER BY slot_nome
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'sem_slots_disponiveis');
  END IF;

  -- Marca como ocupado (quepasa_key ainda NULL — será preenchida pelo N8N)
  UPDATE rapdex_slots
  SET
    status      = 'ocupado',
    login       = p_login,
    alocado_em  = now(),
    liberado_em = NULL,
    quepasa_key = NULL
  WHERE id = v_slot.id;

  RETURN json_build_object(
    'ok',              true,
    'slot_nome',       v_slot.slot_nome,
    'quepasa_key',     NULL,
    'quepasa_base_url',v_slot.quepasa_base_url,
    'webhook_mensagem',v_slot.webhook_mensagem,
    'ja_alocado',      false
  );
END;
$$;

-- 4. Nova RPC: salva a quepasa_key gerada pelo N8N no slot do login
CREATE OR REPLACE FUNCTION atualizar_quepasakey_slot(p_login text, p_quepasa_key text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE rapdex_slots
  SET quepasa_key = p_quepasa_key
  WHERE login = p_login;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'slot_nao_encontrado');
  END IF;

  -- Salva também como client_session na conta (usado pelo dashboard)
  UPDATE rapdex_accounts
  SET client_session = p_quepasa_key
  WHERE login = p_login;

  RETURN json_build_object('ok', true, 'quepasa_key', p_quepasa_key);
END;
$$;

-- 5. Atualiza liberar_slot para limpar a quepasa_key (slot volta ao estado virgem)
CREATE OR REPLACE FUNCTION liberar_slot(p_login text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE rapdex_slots
  SET
    status      = 'disponivel',
    login       = NULL,
    quepasa_key = NULL,
    quepasa_wid = NULL,
    liberado_em = now()
  WHERE login = p_login;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'slot_nao_encontrado');
  END IF;

  UPDATE rapdex_accounts
  SET client_session = NULL
  WHERE login = p_login;

  RETURN json_build_object('ok', true);
END;
$$;
