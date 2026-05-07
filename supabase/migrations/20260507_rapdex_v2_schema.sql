-- ============================================================
-- RAPDEX — Schema v2.0
-- Projeto: rudtxgwzqrsvrdniqvav
-- Data: 2026-05-07
-- ============================================================

-- ENUM de planos
CREATE TYPE plano_tipo AS ENUM ('basic', 'premium');

-- Trigger de updated_at reutilizado nas tabelas
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ────────────────────────────────────────────────────────────
-- TABELA 1: rapdex_accounts
-- Uma linha por cliente/empresa
-- ────────────────────────────────────────────────────────────
CREATE TABLE rapdex_accounts (
  id              bigserial PRIMARY KEY,
  created_at      timestamptz NOT NULL DEFAULT now(),
  login           text        NOT NULL UNIQUE,

  -- Auth (nunca retornadas ao frontend — via RPC)
  quepasakey      text        NOT NULL,
  newpassword     text,

  -- Perfil
  nome_empresa    text,
  plano           plano_tipo  NOT NULL DEFAULT 'basic',

  -- WhatsApp / Sessão
  whatsapp        text,
  client_session  text,

  -- Estado do bot
  bot_ativo       boolean     NOT NULL DEFAULT true,
  delay_resposta  integer     NOT NULL DEFAULT 3,

  -- Saudação
  saudacao_ativa  boolean     NOT NULL DEFAULT false,
  saudacao_texto  text,
  saudacao_url    text,
  saudacao_link   text,

  -- Modo Ausente
  ausente_ativo   boolean     NOT NULL DEFAULT false,
  ausente_texto   text,
  ausente_url     text,

  -- Notificações
  notifica_ativo  boolean     NOT NULL DEFAULT false,
  notifica_numero text,

  -- Regras de IA
  ia_regras       text,
  ia_classificacao text,

  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_accounts_login ON rapdex_accounts(login);

CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON rapdex_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- TABELA 2: rapdex_faqs
-- Substitui as colunas q1..q30 por linhas relacionais
-- basic: até 10 slots  |  premium: até 30 slots
-- ────────────────────────────────────────────────────────────
CREATE TABLE rapdex_faqs (
  id         bigserial   PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  login      text        NOT NULL REFERENCES rapdex_accounts(login) ON DELETE CASCADE,

  slot       smallint    NOT NULL CHECK (slot BETWEEN 1 AND 30),
  ativa      boolean     NOT NULL DEFAULT true,
  pergunta   text,
  resposta   text,
  midia_url  text,
  midia_tipo text CHECK (midia_tipo IN ('imagem', 'audio', 'pdf')),

  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (login, slot)
);

CREATE INDEX idx_faqs_login ON rapdex_faqs(login);

CREATE TRIGGER trg_faqs_updated_at
  BEFORE UPDATE ON rapdex_faqs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- TABELA 3: rapdex_leads
-- Um lead = contato único de WhatsApp por cliente
-- ────────────────────────────────────────────────────────────
CREATE TABLE rapdex_leads (
  id              bigserial   PRIMARY KEY,
  created_at      timestamptz NOT NULL DEFAULT now(),
  login           text        NOT NULL,
  whatsapp_cli    text        NOT NULL,
  nome            text,
  bot_ativo       boolean     NOT NULL DEFAULT true,
  ultima_mensagem timestamptz,

  UNIQUE (login, whatsapp_cli)
);

CREATE INDEX idx_leads_login        ON rapdex_leads(login);
CREATE INDEX idx_leads_login_ativo  ON rapdex_leads(login, bot_ativo);

-- ────────────────────────────────────────────────────────────
-- TABELA 4: rapdex_conversations
-- Cada mensagem trocada com um lead
-- ────────────────────────────────────────────────────────────
CREATE TABLE rapdex_conversations (
  id           bigserial   PRIMARY KEY,
  created_at   timestamptz NOT NULL DEFAULT now(),
  login        text        NOT NULL,
  lead_id      bigint      REFERENCES rapdex_leads(id) ON DELETE CASCADE,
  whatsapp_cli text        NOT NULL,
  mensagem     text,
  resposta     text,
  de_mim       boolean     NOT NULL DEFAULT false
);

CREATE INDEX idx_conv_login_lead ON rapdex_conversations(login, lead_id);
CREATE INDEX idx_conv_login_data ON rapdex_conversations(login, created_at DESC);

-- ────────────────────────────────────────────────────────────
-- RLS — Row Level Security
-- ────────────────────────────────────────────────────────────
ALTER TABLE rapdex_accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapdex_faqs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapdex_leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapdex_conversations ENABLE ROW LEVEL SECURITY;

-- Função que lê o login da sessão atual (definido pelo backend antes de cada query)
CREATE OR REPLACE FUNCTION rapdex_current_login()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.login', true)
$$;

-- Políticas: cada cliente só vê seus próprios dados
CREATE POLICY "accounts_select_own"
  ON rapdex_accounts FOR SELECT
  USING (login = rapdex_current_login());

CREATE POLICY "accounts_update_own"
  ON rapdex_accounts FOR UPDATE
  USING (login = rapdex_current_login());

CREATE POLICY "faqs_all_own"
  ON rapdex_faqs FOR ALL
  USING (login = rapdex_current_login());

CREATE POLICY "leads_all_own"
  ON rapdex_leads FOR ALL
  USING (login = rapdex_current_login());

CREATE POLICY "conv_all_own"
  ON rapdex_conversations FOR ALL
  USING (login = rapdex_current_login());

-- ────────────────────────────────────────────────────────────
-- RPC: validate_login
-- Frontend autentica aqui — nunca vê as senhas diretamente
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION validate_login(p_login text, p_password text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_row rapdex_accounts%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM rapdex_accounts
  WHERE login = p_login
    AND (quepasakey = p_password OR newpassword = p_password);

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'credenciais_invalidas');
  END IF;

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

-- ────────────────────────────────────────────────────────────
-- RPC: change_password
-- Altera apenas newpassword — nunca sobrescreve quepasakey
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION change_password(p_login text, p_old text, p_new text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM rapdex_accounts
    WHERE login = p_login
      AND (quepasakey = p_old OR newpassword = p_old)
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'senha_atual_incorreta');
  END IF;

  UPDATE rapdex_accounts SET newpassword = p_new WHERE login = p_login;
  RETURN json_build_object('ok', true);
END;
$$;

-- ────────────────────────────────────────────────────────────
-- RPC: forgot_password_lookup
-- Apenas confirma se o login existe (sem expor dados)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION forgot_password_lookup(p_login text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS(SELECT 1 FROM rapdex_accounts WHERE login = p_login);
END;
$$;

-- ────────────────────────────────────────────────────────────
-- RPC: create_account
-- N8N usa esta RPC com service_role para criar novos clientes
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_account(
  p_login        text,
  p_quepasakey   text,
  p_nome_empresa text DEFAULT NULL,
  p_plano        plano_tipo DEFAULT 'basic',
  p_whatsapp     text DEFAULT NULL
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM rapdex_accounts WHERE login = p_login) THEN
    RETURN json_build_object('ok', false, 'error', 'login_ja_existe');
  END IF;

  INSERT INTO rapdex_accounts (login, quepasakey, nome_empresa, plano, whatsapp)
  VALUES (p_login, p_quepasakey, p_nome_empresa, p_plano, p_whatsapp);

  RETURN json_build_object('ok', true, 'login', p_login);
END;
$$;
