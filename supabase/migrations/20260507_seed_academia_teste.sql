-- ============================================================
-- RAPDEX — Seed: Academia FitLife (usuário de teste)
-- Login:  11999990000
-- Senha:  FIT2026
-- ============================================================

-- 1. CONTA
INSERT INTO rapdex_accounts (
  login,
  quepasakey,
  newpassword,
  nome_empresa,
  plano,
  whatsapp,
  bot_ativo,
  delay_resposta,
  saudacao_ativa,
  saudacao_texto,
  ausente_ativo,
  ausente_texto,
  notifica_ativo,
  notifica_numero,
  ia_regras,
  conta_ativa,
  em_trial,
  trial_inicio,
  trial_fim
)
VALUES (
  '11999990000',
  'FIT2026',
  NULL,
  'Academia FitLife',
  'premium',
  '11999990000',
  true,
  1500,
  true,
  'Olá! 💪 Bem-vindo à Academia FitLife! Como posso te ajudar hoje?',
  false,
  'Estamos fora do horário de atendimento. Retornaremos em breve! 🏋️',
  false,
  NULL,
  'Responda sempre de forma animada e motivacional. Use emojis de esporte quando apropriado. Nunca ofereça descontos sem autorização prévia.',
  true,
  true,
  now(),
  now() + interval '7 days'
)
ON CONFLICT (login) DO UPDATE SET
  quepasakey    = EXCLUDED.quepasakey,
  nome_empresa  = EXCLUDED.nome_empresa,
  plano         = EXCLUDED.plano,
  conta_ativa   = EXCLUDED.conta_ativa;

-- 2. FAQs (10 perguntas cobrindo as dúvidas mais comuns de uma academia)
INSERT INTO rapdex_faqs (login, slot, ativa, pergunta, resposta) VALUES
('11999990000', 1,  true,
  'Qual o horário de funcionamento?',
  'Funcionamos de segunda a sexta das 6h às 22h, sábados das 8h às 18h e domingos das 8h às 13h. 🕐'),

('11999990000', 2,  true,
  'Qual o valor da mensalidade?',
  'Temos planos a partir de R$ 89/mês no plano básico, R$ 129/mês no plano completo e R$ 179/mês no plano VIP com personal incluído. Acesse nosso site para ver todos os benefícios! 💳'),

('11999990000', 3,  true,
  'Tem aula de spinning? Quais aulas têm?',
  'Sim! Oferecemos: Spinning, Funcional, Zumba, Yoga, Pilates, Muay Thai e Natação (plano VIP). A grade completa está na recepção e no nosso app! 🚴'),

('11999990000', 4,  true,
  'Preciso fazer avaliação física?',
  'Sim, a avaliação física é obrigatória e gratuita para todos os alunos novos! Ela é feita com nossos educadores físicos e leva cerca de 30 minutos. Agende pelo WhatsApp ou na recepção. 📋'),

('11999990000', 5,  true,
  'Tem estacionamento?',
  'Sim! Temos estacionamento gratuito para alunos com capacidade para 40 vagas, incluindo 2 vagas para PCD. Basta informar a placa na recepção. 🚗'),

('11999990000', 6,  true,
  'Posso congelar minha matrícula?',
  'Pode sim! Alunos com plano mensal podem congelar por até 30 dias por semestre mediante solicitação na recepção com 5 dias de antecedência. Plano anual: até 60 dias. ❄️'),

('11999990000', 7,  true,
  'Tem personal trainer?',
  'Temos! Os treinos com personal são individuais ou em dupla. Valores a partir de R$ 80/sessão avulsa ou incluso no plano VIP. Nossos personais têm formação CREF e especialização. 🏆'),

('11999990000', 8,  true,
  'Como faço para me matricular?',
  'É super fácil! Venha pessoalmente com RG/CPF e comprovante de residência, ou inicie pelo nosso site. A primeira semana é gratuita para experimentar! 😊'),

('11999990000', 9,  true,
  'Tem loja de suplementos?',
  'Temos um espaço de nutrição esportiva com whey protein, creatina, pré-treinos e barras de proteína de marcas selecionadas. Alunos têm 10% de desconto! 💊'),

('11999990000', 10, true,
  'Qual o endereço da academia?',
  'Estamos na Rua das Palmeiras, 450 — Bairro Jardim América. Ponto de referência: ao lado do Supermercado BomPreço. Coordenadas no Google Maps: Academia FitLife SP. 📍')

ON CONFLICT (login, slot) DO UPDATE SET
  pergunta  = EXCLUDED.pergunta,
  resposta  = EXCLUDED.resposta,
  ativa     = EXCLUDED.ativa;

-- 3. LEADS de exemplo (para as estatísticas do dashboard não ficarem zeradas)
INSERT INTO rapdex_leads (login, whatsapp_cli, nome, bot_ativo, ultima_mensagem)
VALUES
  ('11999990000', '11988881111', 'Carlos Silva',   true, now() - interval '2 hours'),
  ('11999990000', '11977772222', 'Ana Oliveira',   true, now() - interval '5 hours'),
  ('11999990000', '11966663333', 'Pedro Santos',   true, now() - interval '1 day'),
  ('11999990000', '11955554444', 'Mariana Costa',  true, now() - interval '2 days'),
  ('11999990000', '11944445555', 'Rafael Lima',    true, now() - interval '3 days')
ON CONFLICT (login, whatsapp_cli) DO NOTHING;

-- 4. CONVERSAS de exemplo (histórico no dashboard)
INSERT INTO rapdex_conversations (login, whatsapp_cli, mensagem, resposta, de_mim)
VALUES
  ('11999990000', '11988881111', 'Qual o horário de funcionamento?',   'Funcionamos de segunda a sexta das 6h às 22h...', false),
  ('11999990000', '11988881111', 'Tem personal trainer?',              'Temos! Os treinos com personal são individuais...', false),
  ('11999990000', '11977772222', 'Qual o valor da mensalidade?',       'Temos planos a partir de R$ 89/mês...', false),
  ('11999990000', '11977772222', 'Como me matriculo?',                  'É super fácil! Venha pessoalmente com RG/CPF...', false),
  ('11999990000', '11966663333', 'Tem estacionamento?',                 'Sim! Temos estacionamento gratuito para alunos...', false),
  ('11999990000', '11955554444', 'Posso congelar minha matrícula?',    'Pode sim! Alunos com plano mensal podem congelar...', false),
  ('11999990000', '11944445555', 'Tem loja de suplementos?',           'Temos um espaço de nutrição esportiva...', false);

-- Confirma
SELECT
  a.login,
  a.nome_empresa,
  a.plano,
  a.conta_ativa,
  a.em_trial,
  COUNT(DISTINCT f.slot)  AS faqs,
  COUNT(DISTINCT l.id)    AS leads,
  COUNT(DISTINCT c.id)    AS conversas
FROM rapdex_accounts a
LEFT JOIN rapdex_faqs          f ON f.login = a.login
LEFT JOIN rapdex_leads         l ON l.login = a.login
LEFT JOIN rapdex_conversations c ON c.login = a.login
WHERE a.login = '11999990000'
GROUP BY a.login, a.nome_empresa, a.plano, a.conta_ativa, a.em_trial;
