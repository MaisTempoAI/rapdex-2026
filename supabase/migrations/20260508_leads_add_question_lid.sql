-- Adiciona colunas necessárias para o workflow N8N de cadastro de leads
-- question: estado atual do lead no fluxo de conversa (ex: SAUDACAO, 1, 2, ...)
-- lid:      identificador de dispositivo vinculado do WhatsApp (fallback quando não há phone)

ALTER TABLE rapdex_leads
  ADD COLUMN IF NOT EXISTS question text NOT NULL DEFAULT 'SAUDACAO',
  ADD COLUMN IF NOT EXISTS lid      text;

CREATE INDEX IF NOT EXISTS idx_leads_lid ON rapdex_leads (lid) WHERE lid IS NOT NULL;
