-- ============================================================
-- RAPDEX — Adiciona workflow_url na tabela rapdex_slots
-- Para manutenção direta no N8N
-- ============================================================

ALTER TABLE rapdex_slots
  ADD COLUMN IF NOT EXISTS workflow_url text,        -- URL do workflow no N8N (para edição/manutenção)
  ADD COLUMN IF NOT EXISTS slot_notas  text;         -- Notas livres sobre o slot (ex: "slot de testes permanente")

-- Índice não necessário aqui — workflow_url é só para consulta humana
