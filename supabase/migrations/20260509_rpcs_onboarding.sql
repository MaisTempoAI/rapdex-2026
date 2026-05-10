-- ============================================================
-- RPCs do fluxo de onboarding RAPDEX
-- Executar no Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 0. Reorganização das colunas nos slots existentes
--    webhook_mensagem → n8n_hok_url (URL do HOK N8N)
--    n8n_workflow_id  → só o ID do workflow
--    webhook_mensagem → NULL (será usado de outra forma)
-- ============================================================

-- Remove constraint NOT NULL que impede webhook_mensagem de ser null
ALTER TABLE rapdex_slots ALTER COLUMN webhook_mensagem DROP NOT NULL;

UPDATE rapdex_slots SET
  n8n_hok_url      = 'https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/rapdex-2026-tester-rapdex-slot1',
  n8n_workflow_id  = 'YilYaXp5Uoy2fShJ',
  webhook_mensagem = NULL
WHERE id = 1;

UPDATE rapdex_slots SET
  n8n_hok_url      = 'https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/rapdex-2026-trial-slot2',
  n8n_workflow_id  = 'VckGw8CcnYm5n9VL',
  webhook_mensagem = NULL
WHERE id = 3;

-- ============================================================
-- 1. alocar_slot
--    Chamado em: RAPDEX — Cadastro Onboarding → "Alocar Slot"
--    Params: p_login (celular do cliente), p_tipo ('free')
--    Retorna: webhook_mensagem (URL do N8N para registrar no QUEPASA)
-- ============================================================
CREATE OR REPLACE FUNCTION public.alocar_slot(
  p_login text,
  p_tipo  text DEFAULT 'free'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot rapdex_slots%ROWTYPE;
BEGIN
  SELECT * INTO v_slot
  FROM rapdex_slots
  WHERE status = 'disponivel' AND tipo = p_tipo
  ORDER BY id ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nenhum slot disponivel para tipo: %', p_tipo;
  END IF;

  UPDATE rapdex_slots SET
    status     = 'alocado',
    login      = p_login,
    alocado_em = NOW()
  WHERE id = v_slot.id;

  RETURN json_build_object(
    'id',              v_slot.id,
    'slot_nome',       v_slot.slot_nome,
    'n8n_hok_url',     v_slot.n8n_hok_url,
    'n8n_workflow_id', v_slot.n8n_workflow_id,
    'quepasa_base_url',v_slot.quepasa_base_url,
    'workflow_url',    v_slot.workflow_url
  );
END;
$$;

-- ============================================================
-- 2. atualizar_quepasakey_slot
--    Chamado em: "Salvar Key no Slot"
--    Params: p_login, p_quepasa_key
--    Salva a key QUEPASA e marca o slot como ativo
-- ============================================================
CREATE OR REPLACE FUNCTION public.atualizar_quepasakey_slot(
  p_login       text,
  p_quepasa_key text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot rapdex_slots%ROWTYPE;
BEGIN
  UPDATE rapdex_slots SET
    quepasa_key       = p_quepasa_key,
    status            = 'ativo',
    trial_expires_at  = NOW() + INTERVAL '7 days'
  WHERE login = p_login AND status = 'alocado'
  RETURNING * INTO v_slot;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nenhum slot alocado encontrado para login: %', p_login;
  END IF;

  RETURN json_build_object(
    'id',              v_slot.id,
    'slot_nome',       v_slot.slot_nome,
    'quepasa_key',     v_slot.quepasa_key,
    'status',          v_slot.status,
    'trial_expires_at',v_slot.trial_expires_at
  );
END;
$$;

-- ============================================================
-- 3. create_account
--    Chamado em: "Criar Conta Supabase"
--    Cria (ou atualiza) entrada em rapdex_accounts
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_account(
  p_login       text,
  p_password    text,   -- é o quepasakey gerado pelo QUEPASA
  p_nome_empresa text,
  p_plano       text DEFAULT 'trial',
  p_whatsapp    text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account rapdex_accounts%ROWTYPE;
BEGIN
  INSERT INTO rapdex_accounts (
    login, quepasakey, nome_empresa, plano, whatsapp,
    bot_ativo, saudacao_ativa, conta_ativa,
    em_trial, trial_inicio, trial_fim,
    delay_resposta, notifica_ativo, ausente_ativo
  ) VALUES (
    p_login, p_password, p_nome_empresa, p_plano,
    COALESCE(p_whatsapp, p_login),
    true, false, true,
    true, NOW(), NOW() + INTERVAL '7 days',
    3000, false, false
  )
  ON CONFLICT (login) DO UPDATE SET
    quepasakey   = EXCLUDED.quepasakey,
    nome_empresa = EXCLUDED.nome_empresa,
    plano        = EXCLUDED.plano,
    updated_at   = NOW()
  RETURNING * INTO v_account;

  RETURN json_build_object(
    'login',       v_account.login,
    'nome_empresa',v_account.nome_empresa,
    'plano',       v_account.plano,
    'trial_fim',   v_account.trial_fim
  );
END;
$$;

-- ============================================================
-- 4. INSERT do Slot 2 (RAPDEX MATRIX VckGw8CcnYm5n9VL)
-- ============================================================
INSERT INTO rapdex_slots (
  slot_nome, tipo, status,
  quepasa_base_url,
  webhook_mensagem,
  workflow_url,
  slot_notas
) VALUES (
  'free_02', 'free', 'disponivel',
  'https://quepasa-stack-quepasa.pkgaq6.easypanel.host',
  'https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/rapdex-2026-trial-slot2',
  'https://n8n-stack-n8n.nzdbvp.easypanel.host/workflow/VckGw8CcnYm5n9VL',
  'Slot de testes permanente. Ao resetar: status = disponivel, login = NULL, quepasa_key = NULL, quepasa_wid = NULL.'
)
ON CONFLICT DO NOTHING;
