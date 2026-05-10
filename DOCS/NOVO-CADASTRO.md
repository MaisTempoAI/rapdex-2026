# NOVO CADASTRO — Processo de Onboarding RAPDEX

## Visão Geral

Quando um novo cliente se cadastra no RAPDEX, três coisas acontecem em sequência:
1. Um slot N8N é alocado na pool
2. O webhook do slot é registrado no QUEPASA com a key do cliente
3. A conta e os FAQs são criados no Supabase

---

## Atores do Processo

| Sistema | Papel |
|---------|-------|
| Frontend (Netlify) | Coleta os dados do cliente e o token QUEPASA |
| QUEPASA | Conecta o WhatsApp, gera o quepasakey |
| N8N `vq0VEB1Y3XwbvvQf` | Orquestra todo o processo de onboarding |
| Supabase RPCs | Alocar slot, salvar key, criar conta, inserir FAQs |
| QUEPASA API | Registra o webhook N8N no número do cliente |

---

## Pool de Slots

Antes de qualquer cadastro, os slots precisam existir na tabela `rapdex_slots`:

| Campo | Valor padrão ao criar |
|-------|----------------------|
| `tipo` | `free` |
| `status` | `disponivel` |
| `webhook_mensagem` | URL do nó HOK do MATRIX N8N |
| `workflow_url` | URL do workflow N8N para gestão |
| `quepasa_key` | NULL (preenchido no cadastro) |
| `login` | NULL (preenchido no cadastro) |

**Slots atuais:**

| Slot | N8N Workflow | Webhook HOK |
|------|-------------|-------------|
| `free_01` | `YilYaXp5Uoy2fShJ` | `.../webhook/rapdex-2026-tester-rapdex-slot1` |
| `free_02` | `VckGw8CcnYm5n9VL` | `.../webhook/rapdex-2026-trial-slot2` |

---

## Fluxo Passo a Passo

### FASE 1 — Conexão do WhatsApp

```
Cliente acessa a página de cadastro
         │
         ▼
Preenche dados: nome da empresa, celular, FAQs
         │
         ▼
Escaneia QR code no QUEPASA
         │
         ▼
QUEPASA conecta o número → gera quepasakey único
         │
         ▼
Frontend recebe: { token: quepasakey, celular, nome_empresa, perguntas[] }
         │
         ▼
POST para webhook N8N de onboarding (vq0VEB1Y3XwbvvQf)
```

### FASE 2 — Alocação do Slot (N8N)

```
Nó: Extrair Dados
  ← extrai: token, celular, nome_empresa, perguntas[]
         │
         ▼
Nó: Alocar Slot
  POST /rpc/alocar_slot
  { p_login: celular, p_tipo: 'free' }
  ← retorna: webhook_mensagem (URL do HOK do MATRIX)
         │
  rapdex_slots atualizado:
  status: 'alocado' | login: celular | alocado_em: NOW()
```

### FASE 3 — Registro do Webhook no QUEPASA

```
Nó: Config Webhook QUEPASA
  POST /v3/bot/{token}/webhook
  {
    url: webhook_mensagem + "?quepasakey=" + token,
    forwardinternal: false
  }
  ← QUEPASA agora envia todas as mensagens desse número para o MATRIX correto
```

### FASE 4 — Salvar Key no Slot

```
Nó: Salvar Key no Slot
  POST /rpc/atualizar_quepasakey_slot
  { p_login: celular, p_quepasa_key: token }

  rapdex_slots atualizado:
  quepasa_key: token | status: 'ativo' | trial_expires_at: NOW() + 7 dias
```

### FASE 5 — Criar Conta no Supabase

```
Nó: Criar Conta Supabase
  POST /rpc/create_account
  {
    p_login: celular,
    p_password: token,       ← quepasakey usado como senha interna
    p_nome_empresa: nome,
    p_plano: 'trial',
    p_whatsapp: celular
  }

  rapdex_accounts criado:
  login | quepasakey | nome_empresa | plano: trial
  bot_ativo: true | em_trial: true
  trial_inicio: NOW() | trial_fim: NOW() + 7 dias
```

### FASE 6 — Inserir FAQs

```
Nó: Preparar FAQs (Code)
  ← monta array de FAQs com { login, slot, ativa, pergunta, resposta, midia_url }

Nó: Inserir FAQs
  POST /rest/v1/rapdex_faqs
  ← insere todas as perguntas do cliente
```

### FASE 7 — Boas-Vindas

```
Nó: Boas-Vindas WhatsApp
  ← envia mensagem de boas-vindas para o número do cliente via QUEPASA
```

---

## Diagrama Completo

```
Frontend
    │ POST { token, celular, nome_empresa, perguntas[] }
    ▼
N8N Onboarding (vq0VEB1Y3XwbvvQf)
    │
    ├─ Extrair Dados
    │
    ├─ Alocar Slot ──────────────► rapdex_slots (status: alocado)
    │     └ retorna webhook_mensagem
    │
    ├─ Config Webhook QUEPASA ───► QUEPASA registra HOK do MATRIX
    │
    ├─ Salvar Key no Slot ───────► rapdex_slots (status: ativo, quepasa_key)
    │
    ├─ Criar Conta Supabase ─────► rapdex_accounts (trial 7 dias)
    │
    ├─ Preparar FAQs + Inserir ──► rapdex_faqs
    │
    └─ Boas-Vindas WhatsApp ─────► QUEPASA envia msg ao cliente
```

---

## RPCs Supabase envolvidas

| RPC | Arquivo | Descrição |
|-----|---------|-----------|
| `alocar_slot(p_login, p_tipo)` | `20260509_rpcs_onboarding.sql` | Encontra slot disponível, reserva |
| `atualizar_quepasakey_slot(p_login, p_quepasa_key)` | `20260509_rpcs_onboarding.sql` | Salva key, ativa slot |
| `create_account(p_login, p_password, p_nome_empresa, p_plano, p_whatsapp)` | `20260509_rpcs_onboarding.sql` | Cria conta na rapdex_accounts |

---

## Como adicionar um novo slot à pool

1. Duplique o workflow **RAPDEX MATRIX** (`KfCSJ8H6DnUix4R6`) no N8N
2. Renomeie para algo como `RAPDEX MATRIX - SLOT 03`
3. Ative o workflow → copie o **webhook UUID** do nó `HOK`
4. Construa as URLs:
   - `webhook_mensagem`: `https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/{UUID}`
   - `workflow_url`: `https://n8n-stack-n8n.nzdbvp.easypanel.host/workflow/{WORKFLOW_ID}`
5. Insira na `rapdex_slots`:

```sql
INSERT INTO rapdex_slots (slot_nome, tipo, status, quepasa_base_url, webhook_mensagem, workflow_url, slot_notas)
VALUES (
  'free_03', 'free', 'disponivel',
  'https://quepasa-stack-quepasa.pkgaq6.easypanel.host',
  'https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/{UUID}',
  'https://n8n-stack-n8n.nzdbvp.easypanel.host/workflow/{WORKFLOW_ID}',
  'Slot de testes permanente. Ao resetar: status = disponivel, login = NULL, quepasa_key = NULL.'
);
```

---

## Reset de slot (após expiração do trial)

O cron **RAPDEX — Cron Expiração Trial** (`9eObpnDsnPpNrPhA`) detecta trials vencidos e executa:

```sql
UPDATE rapdex_slots SET
  status       = 'disponivel',
  login        = NULL,
  quepasa_key  = NULL,
  quepasa_wid  = NULL,
  alocado_em   = NULL,
  liberado_em  = NOW(),
  trial_expires_at = NULL
WHERE trial_expires_at < NOW() AND status = 'ativo';
```

E desativa a conta em `rapdex_accounts`: `conta_ativa = false`, `em_trial = false`.

---

## Estados do Slot

```
disponivel ──► alocado ──► ativo ──► disponivel (reset)
              (cadastro)  (webhook   (trial expirado)
                           registrado)
```

---

## Pendências / Próximos Passos

- [ ] Rodar `20260509_rpcs_onboarding.sql` no Supabase para criar as RPCs
- [ ] Testar o fluxo completo com um número de teste
- [ ] Implementar o reset automático no cron de expiração
- [ ] Adicionar mais slots conforme crescer a base de clientes
