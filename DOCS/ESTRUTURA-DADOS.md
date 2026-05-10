# RAPDEX — Estrutura de Dados
### Documentação das Tabelas Principais · Supabase (PostgreSQL)

> Este documento descreve as 4 tabelas centrais do sistema RAPDEX, o que cada campo armazena e como elas se relacionam. Voltado para equipes técnicas e comerciais avaliando a arquitetura da plataforma.

---

## Visão Geral do Modelo

```
rapdex_accounts          (1 conta por cliente)
     │
     ├─── rapdex_faqs          (até 30 perguntas/respostas por conta)
     │
     └─── rapdex_leads         (contatos do WhatsApp atendidos pelo bot)
               │
               └─── rapdex_conversations   (histórico de cada conversa)
```

O campo `login` (número de WhatsApp do dono do bot) é a **chave de identidade** que atravessa todas as tabelas. Toda consulta do sistema — seja do painel ou do bot N8N — usa `login` como filtro principal.

---

## 1. `rapdex_accounts` — Contas dos Clientes

Cada linha representa um cliente ativo na plataforma. É a tabela central do sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | bigserial | Chave primária interna (auto-incremental) |
| `login` | text · **UNIQUE** | Número de WhatsApp do cliente (ex: `19989645264`). Serve de chave estrangeira em todas as demais tabelas |
| `nome_empresa` | text | Nome do negócio exibido no painel e nos relatórios |
| `whatsapp` | text | Mesmo número do login — campo de exibição formatado |
| `plano` | enum | `basic` · `premium` · `trial` — define o nível de acesso e o tipo de slot alocado |
| `conta_ativa` | boolean | `true` = conta operando · `false` = bloqueada (trial expirado, inadimplência, suspensão manual) |
| `em_trial` | boolean | `true` enquanto o cliente está no período gratuito de 7 dias |
| `trial_inicio` | timestamptz | Data/hora em que o trial começou |
| `trial_fim` | timestamptz | Data/hora em que o trial expira. O cron diário (3h) compara com `now()` para desativar automaticamente |
| `bot_ativo` | boolean | Liga/desliga o bot para toda a conta sem apagar dados |
| `delay_resposta` | integer | Segundos de espera antes de o bot responder (simula digitação humana) |
| `saudacao_ativa` | boolean | Habilita mensagem de boas-vindas no primeiro contato do lead |
| `saudacao_texto` | text | Texto da saudação inicial |
| `saudacao_url` | text | Mídia opcional enviada junto com a saudação (imagem, áudio, PDF) |
| `saudacao_link` | text | Link opcional incluído na saudação |
| `ausente_ativo` | boolean | Habilita mensagem automática fora do horário de atendimento |
| `ausente_texto` | text | Texto enviado quando o bot está em modo ausente |
| `ausente_url` | text | Mídia opcional da mensagem de ausência |
| `notifica_ativo` | boolean | Habilita notificação interna quando um novo lead entra em contato |
| `notifica_numero` | text | Número que recebe as notificações de novos leads |
| `ia_regras` | text | Instruções personalizadas enviadas à IA antes de cada resposta (tom, restrições, contexto do negócio) |
| `ia_classificacao` | text | Critérios de classificação de leads configurados pelo cliente |
| `quepasakey` | text | Chave de API da instância QUEPASA vinculada a esta conta |
| `client_session` | text | Token de sessão ativo do painel (controle de acesso) |
| `newpassword` | text | Hash da senha do painel |
| `created_at` | timestamptz | Data de criação da conta |
| `updated_at` | timestamptz | Última modificação (atualizado automaticamente por trigger) |

**Comportamentos automáticos:**
- Ao expirar o trial, `conta_ativa` vira `false` e o slot QUEPASA é liberado (via `disable_expired_trials()`)
- Ao fazer upgrade, `upgrade_slot()` realoca o slot para o tipo correto sem interrupção

---

## 2. `rapdex_faqs` — Perguntas & Respostas do Bot

Cada linha é uma pergunta configurada pelo cliente. O bot N8N consulta estas FAQs em tempo real para responder os leads.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | bigserial | Chave primária |
| `login` | text · **FK → accounts** | Identifica de qual conta esta FAQ pertence. Se a conta for deletada, as FAQs são removidas em cascata |
| `slot` | smallint (1–30) | Número de ordem da pergunta. Cada conta pode ter até **30 FAQs** numeradas. Usado pelo bot para organizar a apresentação ao lead |
| `ativa` | boolean | Pergunta ativa (`true`) ou desativada sem exclusão (`false`) |
| `pergunta` | text | Texto da pergunta (ex: "Qual o horário de atendimento?") |
| `resposta` | text | Resposta que o bot enviará ao lead |
| `midia_url` | text | URL pública de um arquivo no bucket `rapdex-midia` (Supabase Storage) enviado junto com a resposta |
| `midia_tipo` | text | Tipo da mídia: `imagem` · `audio` · `pdf` |
| `created_at` | timestamptz | Data de criação |
| `updated_at` | timestamptz | Última edição (atualizado automaticamente por trigger) |

**Restrição:** `UNIQUE(login, slot)` — cada posição de 1 a 30 só existe uma vez por conta.

**Como o bot usa:**
O workflow N8N recebe o número da FAQ escolhida pelo lead, busca `WHERE login = ? AND slot = ? AND ativa = true` e envia `resposta` + `midia_url` (se houver).

---

## 3. `rapdex_leads` — Contatos Atendidos pelo Bot

Cada linha é um contato de WhatsApp que interagiu com o bot de um cliente. Equivale a um "cadastro de cliente do cliente".

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | bigserial | Chave primária. Referenciada por `rapdex_conversations` |
| `login` | text | Conta RAPDEX dona deste lead |
| `whatsapp_cli` | text | Número de WhatsApp do lead (ex: `5511987654321`) |
| `nome` | text | Nome identificado pelo bot durante a conversa (pode ser atualizado) |
| `bot_ativo` | boolean | `true` = bot responde este contato · `false` = atendimento humano assumiu ou lead bloqueado |
| `ultima_mensagem` | timestamptz | Timestamp da última interação — usado para ordenação e relatórios de engajamento |
| `created_at` | timestamptz | Primeiro contato registrado |

**Restrição:** `UNIQUE(login, whatsapp_cli)` — cada número só é registrado uma vez por conta.

**Índice de performance:** `idx_leads_login_ativo` em `(login, bot_ativo)` — garante busca rápida mesmo com milhares de leads por conta.

---

## 4. `rapdex_conversations` — Histórico de Mensagens

Cada linha é uma mensagem trocada entre o bot e um lead. Permite que o cliente veja o histórico completo no painel.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | bigserial | Chave primária |
| `login` | text | Conta RAPDEX dona desta conversa |
| `lead_id` | bigint · **FK → leads** | Referência ao lead. Se o lead for removido, o histórico é excluído em cascata |
| `whatsapp_cli` | text | Número do lead (denormalizado para facilitar queries sem JOIN) |
| `mensagem` | text | Texto recebido do lead |
| `resposta` | text | Texto enviado pelo bot em resposta |
| `de_mim` | boolean | `false` = mensagem do lead → bot · `true` = mensagem enviada manualmente pelo dono da conta |
| `created_at` | timestamptz | Data/hora da troca de mensagem |

**Índices de performance:**
- `idx_conv_login_lead` em `(login, lead_id)` — carrega histórico de um lead específico instantaneamente
- `idx_conv_login_data` em `(login, created_at DESC)` — lista conversas recentes no painel com paginação eficiente

---

## Relacionamentos em Diagrama

```
┌─────────────────────────────────┐
│        rapdex_accounts          │
│  login (PK lógica) ─────────────┼──────────────────────────┐
│  plano, bot_ativo, trial_fim    │                           │
│  saudacao, ausente, ia_regras   │                           │
└────────────────┬────────────────┘                           │
                 │ 1 conta                                     │
                 │ N FAQs                                      │
                 ▼                                             │
┌────────────────────────────────┐                            │
│         rapdex_faqs            │                            │
│  login → accounts(login)       │                            │
│  slot (1–30), ativa            │                            │
│  pergunta, resposta, midia_url │                            │
└────────────────────────────────┘                            │
                                                              │
                 1 conta                                       │
                 N leads                                       │
                 ▼                                             │
┌────────────────────────────────┐                            │
│         rapdex_leads           │ ◄──────────────────────────┘
│  login → accounts(login)       │
│  whatsapp_cli (UNIQUE p/ login)│
│  nome, bot_ativo               │
└────────────────┬───────────────┘
                 │ 1 lead
                 │ N mensagens
                 ▼
┌────────────────────────────────┐
│     rapdex_conversations       │
│  lead_id → leads(id)           │
│  login, whatsapp_cli           │
│  mensagem, resposta, de_mim    │
└────────────────────────────────┘
```

---

## Segurança e Isolamento de Dados

- **Row Level Security (RLS)** habilitado em todas as tabelas
- Cada query do painel inclui `login = rapdex_current_login()` — extraído do token de sessão
- **Nenhum cliente consegue ver dados de outro**, mesmo compartilhando a mesma infraestrutura
- Operações sensíveis (alocar slot, desativar trial, upgrade) são executadas via **RPCs SECURITY DEFINER** no banco — nunca expostas diretamente ao frontend
- Chaves de API do QUEPASA ficam em `rapdex_accounts.quepasakey` e em `rapdex_slots.quepasa_key` — nunca no código-fonte

---

## Tabelas de Suporte (não detalhadas aqui)

| Tabela | Função |
|--------|--------|
| `rapdex_slots` | Inventário de instâncias QUEPASA disponíveis para alocação. Cada slot é um número de WhatsApp real conectado |
| `rapdex_auth_log` | Log de tentativas de login (segurança e auditoria) |

---

*Gerado em 2026-05-08 · RAPDEX Platform*
