-- ============================================================
-- RAPDEX — Seed: 5 Slots FREE
-- Preencha os valores antes de rodar!
-- ============================================================

-- INSTRUÇÕES:
-- 1. Crie 5 instâncias no QUEPASA (ou use as existentes)
-- 2. Para cada instância anote a QUEPASA KEY (aparece na URL do bot)
-- 3. Crie 5 workflows no N8N e anote o UUID do webhook de cada um
-- 4. Substitua os valores abaixo e rode este SQL

INSERT INTO rapdex_slots
  (slot_nome, tipo, quepasa_key, quepasa_base_url, webhook_mensagem)
VALUES
  (
    'free_01', 'free',
    'QUEPASA_KEY_FREE_01',   -- ex: LGHQWKQFCJ
    'https://quepasa-stack-quepasa.pkgaq6.easypanel.host',
    'https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/COLOQUE_UUID_AQUI_01'
  ),
  (
    'free_02', 'free',
    'QUEPASA_KEY_FREE_02',
    'https://quepasa-stack-quepasa.pkgaq6.easypanel.host',
    'https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/COLOQUE_UUID_AQUI_02'
  ),
  (
    'free_03', 'free',
    'QUEPASA_KEY_FREE_03',
    'https://quepasa-stack-quepasa.pkgaq6.easypanel.host',
    'https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/COLOQUE_UUID_AQUI_03'
  ),
  (
    'free_04', 'free',
    'QUEPASA_KEY_FREE_04',
    'https://quepasa-stack-quepasa.pkgaq6.easypanel.host',
    'https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/COLOQUE_UUID_AQUI_04'
  ),
  (
    'free_05', 'free',
    'QUEPASA_KEY_FREE_05',
    'https://quepasa-stack-quepasa.pkgaq6.easypanel.host',
    'https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/COLOQUE_UUID_AQUI_05'
  );

-- Verificação após inserir:
SELECT slot_nome, tipo, status, quepasa_key, webhook_mensagem FROM rapdex_slots ORDER BY slot_nome;
