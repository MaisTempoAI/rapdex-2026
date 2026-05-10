# RAPDEX RESPONSE MATRIX — Análise Completa
### Subfluxo principal de resposta · 4 partes · Mapeamento para produção

---

## Fluxo Geral

```
ENTRADA (token, whatsapp, msg, login, status...)
     │
     ▼
GET HOK → DADOS EMPRESA → GET EMPRESA → BOT ATIVO?
                                              │
                         ┌────────────────────┤
                         │ bot ON             │ bot OFF → fim
                         ▼
                   CHECK SAUDACAO
                         │
          ┌──────────────┴──────────────────┐
          │ status = SAUDACAO               │ status ≠ SAUDACAO
          ▼                                 ▼
    SAUDACAO ativa?             ════════════════════════
     │          │               CLASSIFICAÇÃO (PARTE 1)
     │ sim      │ não
     ▼          ▼
  PARTE 4    PARTE 1
  BOAS       CLASSIF.
  VINDAS         │
                 ▼
             PARTE 2 (AGENTES)
                 │
                 ▼
             PARTE 3 (ENVIO)
```

---

## PARTE 1 — CLASSIFICAÇÃO

### Nó principal: `CODE COM GATILHOS EXATOS`

O algoritmo customizado (semanas de desenvolvimento). Compara a mensagem do lead contra os **gatilhos de cada FAQ** usando:

| Técnica | Peso | O que faz |
|---------|------|-----------|
| LCS Score | 55% | Maior Subsequência Comum por tokens |
| Token Coverage | 45% | % dos tokens da mensagem presentes nos gatilhos |
| Exact/Contains | override | Correspondência exata eleva para 92-95% |
| Greeting detection | especial | Saudações comuns (oi, olá, boa tarde...) forçam match na Q que tiver saudação como gatilho |

**Entrada:** `$('GET EMPRESA').item.json.q1...q20` (perguntas com múltiplos gatilhos separados por `/`)

**Saída:**
```json
{
  "best_question": 7,
  "best_score": 88,
  "best_trigger": "tempo de entrega",
  "confidence": "medium",
  "ranking": [...]
}
```

**Tabela de score → percentual:**

| Score raw | Retorna |
|-----------|---------|
| ≥ 0.92 | 100 |
| ≥ 0.75 | 94 |
| ≥ 0.60 | 88 |
| ≥ 0.48 | 80 |
| ≥ 0.35 | 68 |
| ≥ 0.22 | 52 |
| ≥ 0.10 | 30 |
| < 0.10 | 0 |

---

### Nó secundário: `IA MSG FILTER` ← **atualmente desativado (pinado em 100)**

Agente AI (GPT-4.1-mini) que faz classificação de intenção 0-100.
- Conectado ao `GPT FLT1` (OpenAI) + ferramenta `CL` (calculadora)
- Retorna `output` (número de 0 a 100 como string)
- `Edit Fields3` extrai o score → `75%` verifica se > 75

**Estado atual:** `IA MSG FILTER` está com pinData fixo em `{ "output": "100" }` — ou seja, **sempre passa**, o agente IA não consome tokens. O CODE COM GATILHOS EXATOS faz a classificação real.

**Fluxo do score:**
```
CODE COM GATILHOS EXATOS
         │
         ▼ (alimenta o systemMessage do AI Agent1)
IA MSG FILTER (pinado = 100)
         │
         ▼
Edit Fields3 → 75%?
   │ sim (>75%)            │ não (≤75%)
   ▼                       ▼
AI Agent1              Output (ecoa msg)
                           │
                           ▼
                     Notifica Whatsapp2?
```

---

## PARTE 2 — AGENTES

### `AI Agent1` — Identificador de Respostas (ativo no fluxo principal)

**Modelo:** GPT-4.1-mini (credencial `OpenAi SAMCOR`)

**O que faz:** Recebe a mensagem + `best_question` do CODE e retorna a resposta **exata** da FAQ correspondente, sem inventar nada.

**System prompt resumido:**
- Recebe as 20 perguntas + respostas (q1...q20 + q1response...q20response)
- A "resposta considerada mais próxima" já vem do CODE
- Substitui `[NOME CLIENTE]` pelo nome real
- Retorna a resposta predefinida integralmente (texto + links)
- Sem emojis extras, sem explicações

**Saída:** `output` (texto da resposta)

---

### `AI Agent3` — Boas Vindas (usado somente no fluxo de saudação)

**Modelo:** GPT-4.1-mini (credencial `OpenAi SAMCOR`)

**O que faz:** Formata e envia a mensagem de boas-vindas configurada pelo cliente. Pode chamar a **tool `LINK`** para enviar imagem se `urlimg` estiver preenchida.

**Tool `LINK`:** Chama um subworkflow externo que faz o envio de URL via QUEPASA.

---

### `IA MSG FILTER` — Filtro IA (desativado)

**Modelo:** GPT-4.1-mini (credencial `LAPALMA` — do projeto antigo)

**Status:** Pinado em 100. Quando reativado, faz classificação de intenção independente do CODE. Permite que você troque o CODE pelo agente IA futuramente.

---

## PARTE 3 — ENVIO

Após o `AI Agent1` gerar a resposta, o fluxo é:

```
AI Agent1
    │
    ▼
RESPOSTA RAPDEX (armazena output)
    │
    ▼
BUSCA RESPOSTAS RAPDEX
  ← busca FAQ10-conversation (últimas respostas deste lead)
    │
    ▼
VERIFICA RESPOSTAS 24H (CODE)
  ← Jaccard + Containment sobre janela de 6 horas
  ← Evita enviar a mesma resposta em loop
    │
    ▼
JA RESPONDIDA?
  │ SIM → encerra (bloqueia duplicata)
  │ NÃO ↓
    ▼
Code in JavaScript1
  ← Extrai URLs do Supabase Storage da resposta
  ← Separa texto limpo das mídias
  ← Suporta até 3 mídias em uma resposta
    │
    ▼
MULTIPLOS LINKS?
  │ Múltiplos ──────────────────────────────────────────────────────┐
  │ Um link ─────────────────┐                                      │
  │ Nenhum link ─────────────┼──────── Edit Fields5 → Edit Fields4  │
  │                          │                                      │
  │                    Edit Fields7                           SET MULTIPLE
  │                    → SEND URL (sendurl QUEPASA)           → SEND URL1
  │                    → Edit Fields8                         → SEND URL2
  │                         │                                → TEM 3 MÍDIAS?
  │                         │                                  → SEND URL3
  │                         │                                  → OUTPUT MULTIPLE
  └─────────────────────────┴────────────────────────────────────────┘
                            │ (todos convergem)
                            ▼
                        JUNTATUDU (output final)
                            │
                            ▼
                        If4: output vazio?
                     SIM →  No Operation
                     NÃO → HTTP Request6
                              POST /v3/bot/{quepasakey}/sendtext
                              chatid = numCliente
                              text = output
                            │
                            ▼
                        MSG FLT FINAL (retorna para o LOG)
```

### Deduplicação — `VERIFICA RESPOSTAS 24H`

Algoritmo em JS que:
1. Normaliza o texto (remove acentos, URLs, símbolos)
2. Tokeniza (palavras com ≥ 4 chars)
3. Calcula Jaccard similarity e Containment nas respostas das últimas **6 horas**
4. Bloqueia se `Jaccard ≥ 72%` OR `Containment ≥ 85%`
5. Libera se não há histórico recente ou resposta suficientemente diferente

---

### Notificação ao Dono — `Notifica Whatsapp2?`

Quando o score cai abaixo de 75% (mensagem fora do FAQ):
- `Output` ecoa a mensagem original
- `Notifica Whatsapp2?` verifica se `notificanumero === "true"`
- Se sim: formata o número do dono com `55` + `@s.whatsapp.net` e envia alerta:
  `🚨 ALERTA RAPDEX 🤖 · MSG: {msg} · NUMERO: {numCliente}`

---

## PARTE 4 — BOAS VINDAS

Acionado quando `status === "SAUDACAO"` (lead novo que acabou de ser criado pelo CADASTRA CLIENTE).

```
CHECK SAUDACAO (status == "SAUDACAO"?)
      │ sim
      ▼
SAUDACAO ativa?1
  ($('GET EMPRESA').json.MSGSaudacaoactive == "true")
      │ sim                    │ não
      ▼                        ▼
FAQ10 WELCOME1           CODE COM GATILHOS EXATOS
(set output = MSGSaudacao   (pula saudação, responde direto)
 set urlimg = MSGSaudacaourl)
      │
      ▼
AI Agent3 (formata saudação, envia link se houver)
      │
      ▼
Edit Fields (extrai output do agente)
      │
      ▼
HTTP Request (POST sendtext QUEPASA — envia saudação)
      │
      ▼
If (numCliente contém "lid"?)
  │ sim (contact por lid)          │ não (phone normal)
  ▼                                ▼
Get a row2                    Get a row1
(busca por login+whatsapp)    (busca por login+whatsapp)
      │                            │
      ▼                            ▼
Update a row1                 Update a row
(atualiza question="BOAS      (atualiza question="BOAS
 VINDAS" + whatsapp real)      VINDAS")
      │                            │
      └──────────────┬─────────────┘
                     ▼
               MSG FLT FINAL2 (retorna para LOG com rapdex = saudação enviada)
```

**O que o `question = "BOAS VINDAS"` representa:** Marca que a saudação foi enviada. Na próxima mensagem do lead, `status` virá como `"BOAS VINDAS"` (ou outro valor) → vai direto para a CLASSIFICAÇÃO.

---

## O Que Precisa Mudar para RAPDEX

### Tabelas

| Antigo | Novo |
|--------|------|
| `FAQ10-master` (busca por quepasakey) | `rapdex_accounts` (WHERE quepasakey = ?) |
| `FAQ10-clients` (leads) | `rapdex_leads` |
| `FAQ10-conversation` | `rapdex_conversations` |

### Colunas

| Campo antigo | Campo RAPDEX | Tabela |
|-------------|-------------|--------|
| `botativo` | `bot_ativo` | rapdex_accounts |
| `delayresponse` | `delay_resposta` | rapdex_accounts |
| `MSGSaudacaoactive` | `saudacao_ativa` | rapdex_accounts |
| `MSGSaudacao` | `saudacao_texto` | rapdex_accounts |
| `MSGSaudacaourl` | `saudacao_url` | rapdex_accounts |
| `notificanumero` | `notifica_ativo` | rapdex_accounts |
| `whatsapp2` | `notifica_numero` | rapdex_accounts |
| `q1...q20` | `pergunta` (slot 1..30) | rapdex_faqs |
| `q1response...q20response` | `resposta` (slot 1..30) | rapdex_faqs |
| `q1url...q20url` | `midia_url` (slot 1..30) | rapdex_faqs |
| `whatsapp` (em leads) | `whatsapp_cli` | rapdex_leads |
| `question` (em leads) | `question` ✅ já adicionado | rapdex_leads |
| `lid` (em leads) | `lid` ✅ já adicionado | rapdex_leads |

### Estrutura Crítica — FAQs

O projeto antigo tinha `q1...q20` como **colunas** da tabela de contas.
O RAPDEX usa `rapdex_faqs` como **tabela separada** (até 30 FAQs por conta).

**Solução:** O `GET EMPRESA` precisa ser substituído por dois nós:
1. Busca `rapdex_accounts` por `quepasakey`
2. Busca `rapdex_faqs` por `login + ativa=true ORDER BY slot`
3. Nó Code que monta `q1...q30` no formato que o CODE COM GATILHOS EXATOS e o AI Agent1 esperam

### URL do Bucket Supabase

| Antigo | Novo |
|--------|------|
| `wueuppkkmpedalxtjouy.supabase.co` | `rudtxgwzqrsvrdniqvav.supabase.co` |

Afeta: `Code in JavaScript1` e `Code in JavaScript` (os que extraem URLs das respostas)

### Credenciais

| Antigo | Novo |
|--------|------|
| `Supabase MAISTEMPO-MASTER` | `RAPDEX SUPABASE` |
| `OpenAi SAMCOR` | `RAPDEX OPENAI` (ou reutilizar) |
| `LAPALMA` (IA MSG FILTER) | `RAPDEX OPENAI` (quando reativar) |

### NocoDB

O nó `Get a row` (NocoDB) está presente mas não conectado ao fluxo principal (provavelmente legado). Pode ser removido.

---

## FAQ — Até 30 no RAPDEX vs 20 no antigo

O CODE COM GATILHOS EXATOS itera de `q1` a `q20`. No RAPDEX suportamos até 30 FAQs. Na versão de produção o loop será estendido para `q1...q30`.

---

*Gerado em 2026-05-08 · RAPDEX Platform*
