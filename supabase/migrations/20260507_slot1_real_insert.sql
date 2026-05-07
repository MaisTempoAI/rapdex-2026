-- ============================================================
-- RAPDEX — Insert slot1 real (test slot permanente)
-- ATENÇÃO: Substitua QUEPASA_KEY_SLOT1 pela key real antes de rodar
-- ============================================================

INSERT INTO rapdex_slots (
  slot_nome,
  tipo,
  status,
  quepasa_key,
  quepasa_base_url,
  webhook_mensagem,
  workflow_url,
  slot_notas
)
VALUES (
  'free_01',
  'free',
  'disponivel',

  NULL,   -- quepasa_key é gerada dinamicamente pelo N8N ao criar a sessão QUEPASA

  'https://quepasa-stack-quepasa.pkgaq6.easypanel.host',

  'https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/rapdex-2026-tester-rapdex-slot1',

  'https://n8n-stack-n8n.nzdbvp.easypanel.host/workflow/YilYaXp5Uoy2fShJ',

  'Slot de testes permanente. Ao resetar: status = disponivel, login = NULL, quepasa_key = NULL, quepasa_wid = NULL.'
)
ON CONFLICT (slot_nome) DO UPDATE SET
  workflow_url     = EXCLUDED.workflow_url,
  webhook_mensagem = EXCLUDED.webhook_mensagem,
  slot_notas       = EXCLUDED.slot_notas,
  quepasa_key      = NULL,
  status           = 'disponivel',
  login            = NULL,
  quepasa_wid      = NULL;

-- Confirma
SELECT slot_nome, status, quepasa_key, workflow_url, webhook_mensagem FROM rapdex_slots;
