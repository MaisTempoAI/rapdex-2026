-- ============================================================
-- RAPDEX — Sistema de Slots de Webhook
-- Pool de instâncias QUEPASA pré-alocadas para clientes
-- ============================================================

-- ENUMs
CREATE TYPE slot_status AS ENUM ('disponivel', 'ocupado', 'manutencao');
CREATE TYPE slot_tipo   AS ENUM ('free', 'premium');

-- ────────────────────────────────────────────────────────────
-- TABELA: rapdex_slots
-- Cada linha = 1 instância QUEPASA + 1 N8N flow prontos
-- ────────────────────────────────────────────────────────────
CREATE TABLE rapdex_slots (
  id               bigserial    PRIMARY KEY,
  created_at       timestamptz  NOT NULL DEFAULT now(),
  updated_at       timestamptz  NOT NULL DEFAULT now(),

  -- Identificação do slot
  slot_nome        text         NOT NULL UNIQUE,           -- 'free_01', 'free_02', ...
  tipo             slot_tipo    NOT NULL DEFAULT 'free',   -- 'free' | 'premium'
  status           slot_status  NOT NULL DEFAULT 'disponivel',

  -- QUEPASA — instância desta slot
  quepasa_key      text         NOT NULL UNIQUE,           -- ex: 'LGHQWKQFCJ'
  quepasa_wid      text,                                   -- ex: '5511999999999@s.whatsapp.net' (preenchido após conexão do WA)
  quepasa_base_url text         NOT NULL DEFAULT 'https://quepasa-stack-quepasa.pkgaq6.easypanel.host',

  -- N8N webhook fixo deste slot (QUEPASA entrega mensagens aqui)
  webhook_mensagem text         NOT NULL UNIQUE,           -- ex: 'https://n8n.host/webhook/{uuid}'

  -- Quem está usando este slot agora
  login            text         REFERENCES rapdex_accounts(login) ON DELETE SET NULL,
  alocado_em       timestamptz,
  liberado_em      timestamptz
);

CREATE INDEX idx_slots_status_tipo ON rapdex_slots(status, tipo);
CREATE INDEX idx_slots_login       ON rapdex_slots(login);
CREATE INDEX idx_slots_quepasa_key ON rapdex_slots(quepasa_key);

CREATE TRIGGER trg_slots_updated_at
  BEFORE UPDATE ON rapdex_slots
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS — só service_role acessa (N8N usa service_role key)
ALTER TABLE rapdex_slots ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- RPC: alocar_slot
-- N8N chama durante o cadastro para reservar um slot livre
-- Usa FOR UPDATE SKIP LOCKED — sem race condition com cadastros simultâneos
-- ────────────────────────────────────────────────────────────
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

  -- Marca como ocupado
  UPDATE rapdex_slots
  SET
    status     = 'ocupado',
    login      = p_login,
    alocado_em = now(),
    liberado_em = NULL
  WHERE id = v_slot.id;

  -- Salva quepasa_key como client_session na conta do usuário
  UPDATE rapdex_accounts
  SET client_session = v_slot.quepasa_key
  WHERE login = p_login;

  RETURN json_build_object(
    'ok',              true,
    'slot_nome',       v_slot.slot_nome,
    'quepasa_key',     v_slot.quepasa_key,
    'quepasa_base_url',v_slot.quepasa_base_url,
    'webhook_mensagem',v_slot.webhook_mensagem,
    'ja_alocado',      false
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- RPC: liberar_slot
-- N8N chama quando trial expira ou cliente cancela
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION liberar_slot(p_login text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE rapdex_slots
  SET
    status      = 'disponivel',
    login       = NULL,
    quepasa_wid = NULL,
    liberado_em = now()
  WHERE login = p_login;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'slot_nao_encontrado');
  END IF;

  -- Limpa client_session na conta
  UPDATE rapdex_accounts
  SET client_session = NULL
  WHERE login = p_login;

  RETURN json_build_object('ok', true);
END;
$$;

-- ────────────────────────────────────────────────────────────
-- RPC: get_slot_do_login
-- Retorna info completa do slot de um usuário
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_slot_do_login(p_login text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_slot rapdex_slots%ROWTYPE;
BEGIN
  SELECT * INTO v_slot FROM rapdex_slots WHERE login = p_login LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'sem_slot_alocado');
  END IF;

  RETURN json_build_object(
    'ok',              true,
    'slot_nome',       v_slot.slot_nome,
    'tipo',            v_slot.tipo,
    'status',          v_slot.status,
    'quepasa_key',     v_slot.quepasa_key,
    'quepasa_wid',     v_slot.quepasa_wid,
    'quepasa_base_url',v_slot.quepasa_base_url,
    'webhook_mensagem',v_slot.webhook_mensagem,
    'alocado_em',      v_slot.alocado_em
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- RPC: atualizar_wid_slot
-- N8N chama após o WhatsApp do cliente conectar e o WID ficar conhecido
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION atualizar_wid_slot(p_quepasa_key text, p_wid text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE rapdex_slots
  SET quepasa_wid = p_wid
  WHERE quepasa_key = p_quepasa_key;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'slot_nao_encontrado');
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;

-- ────────────────────────────────────────────────────────────
-- RPC: get_conta_por_quepasakey
-- N8N bot flow chama a cada mensagem recebida para saber de quem é o slot
-- Retorna dados completos: conta + FAQs
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_conta_por_quepasakey(p_quepasa_key text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_slot    rapdex_slots%ROWTYPE;
  v_conta   rapdex_accounts%ROWTYPE;
  v_faqs    json;
BEGIN
  -- Acha o slot pela quepasa_key
  SELECT * INTO v_slot FROM rapdex_slots WHERE quepasa_key = p_quepasa_key LIMIT 1;

  IF NOT FOUND OR v_slot.login IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'slot_sem_dono');
  END IF;

  -- Busca a conta do dono
  SELECT * INTO v_conta FROM rapdex_accounts WHERE login = v_slot.login;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'conta_nao_encontrada');
  END IF;

  -- Busca FAQs ativas
  SELECT json_agg(
    json_build_object(
      'slot',      slot,
      'pergunta',  pergunta,
      'resposta',  resposta,
      'midia_url', midia_url,
      'midia_tipo',midia_tipo
    ) ORDER BY slot
  ) INTO v_faqs
  FROM rapdex_faqs
  WHERE login = v_slot.login AND ativa = true;

  RETURN json_build_object(
    'ok',              true,
    'login',           v_conta.login,
    'nome_empresa',    v_conta.nome_empresa,
    'bot_ativo',       v_conta.bot_ativo,
    'conta_ativa',     v_conta.conta_ativa,
    'delay_resposta',  v_conta.delay_resposta,
    'saudacao_ativa',  v_conta.saudacao_ativa,
    'saudacao_texto',  v_conta.saudacao_texto,
    'saudacao_url',    v_conta.saudacao_url,
    'saudacao_link',   v_conta.saudacao_link,
    'ausente_ativo',   v_conta.ausente_ativo,
    'ausente_texto',   v_conta.ausente_texto,
    'ausente_url',     v_conta.ausente_url,
    'notifica_ativo',  v_conta.notifica_ativo,
    'notifica_numero', v_conta.notifica_numero,
    'faqs',            COALESCE(v_faqs, '[]'::json)
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- RPC: salvar_mensagem
-- N8N bot flow chama para salvar cada mensagem trocada
-- Cria o lead automaticamente se for a primeira vez que esse número escreve
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION salvar_mensagem(
  p_login        text,
  p_whatsapp_cli text,
  p_nome_cli     text    DEFAULT NULL,
  p_mensagem     text    DEFAULT NULL,
  p_resposta     text    DEFAULT NULL,
  p_de_mim       boolean DEFAULT false
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lead_id bigint;
BEGIN
  -- Upsert do lead (cria se não existe, mantém se já existe)
  INSERT INTO rapdex_leads (login, whatsapp_cli, nome, ultima_mensagem)
  VALUES (p_login, p_whatsapp_cli, p_nome_cli, now())
  ON CONFLICT (login, whatsapp_cli)
  DO UPDATE SET
    ultima_mensagem = now(),
    nome = COALESCE(EXCLUDED.nome, rapdex_leads.nome)
  RETURNING id INTO v_lead_id;

  -- Salva a conversa
  INSERT INTO rapdex_conversations (login, lead_id, whatsapp_cli, mensagem, resposta, de_mim)
  VALUES (p_login, v_lead_id, p_whatsapp_cli, p_mensagem, p_resposta, p_de_mim);

  RETURN json_build_object('ok', true, 'lead_id', v_lead_id);
END;
$$;
