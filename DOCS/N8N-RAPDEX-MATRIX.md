# RAPDEX MATRIX — Fluxo Principal N8N
### Orquestrador central que recebe todos os webhooks do QUEPASA e distribui para os subfluxos

---

## Visão Geral

```
QUEPASA (WhatsApp)
        │
        ▼  POST /webhook/f3cc0fcc-...?quepasakey=XXXXX
┌───────────────┐
│      HOK      │  Webhook entry point
└───────┬───────┘
        │
        ▼
┌───────────────────┐
│  LID NORMALIZER   │  Normaliza o ID do chat (phone vs lid)
└───────┬───────────┘
        │
        ▼
┌───────────────┐
│   GET HOK     │  Extrai e nomeia todas as variáveis do payload
└───────┬───────┘
        │
        ▼
┌───────────────────┐
│  Execution Data   │  Snapshot para debug (nome, whatsapp, msg, fromme)
└───────┬───────────┘
        │
        ▼
┌────────────────────────────┐
│  Filter (text | audio)     │  Descarta imagens, stickers, documentos etc.
└───────────┬────────────────┘
            │
            ▼
    ┌────────────────┐
    │   NORMALIZER   │  Subfluxo: normaliza áudio→texto, busca conta no Supabase
    └───────┬────────┘
            │
            ▼
    ┌─────────────────────┐
    │  CADASTRA CLIENTE   │  Subfluxo: registra lead se for novo contato
    └───────┬─────────────┘
            │
            ▼
    ┌──────────────┐
    │   BOT OFF    │  Filtra: se status = "BOTOFF", encerra aqui
    └───────┬──────┘
            │
            ▼
    ┌──────────────────────────────────┐
    │   If: fromme === "true"?         │
    └───────┬──────────────────────────┘
            │                    │
        SIM (true)           NÃO (false)
            │                    │
            ▼                    ▼
    ┌─────────────┐      ┌──────────────┐
    │   FROM ME   │      │    RAPDEX    │  Subfluxo: gera resposta da IA
    │  (encerra)  │      └──────┬───────┘
    └─────────────┘             │
                                ▼
                        ┌───────────────┐
                        │      LOG      │  Subfluxo: salva conversa no Supabase
                        └───────┬───────┘
                                │
                                ▼
                        ┌───────────────┐
                        │  LOG HISTORY  │  ⚠️ ainda usa tabela do projeto antigo
                        └───────────────┘
```

---

## Nós em Detalhe

### 1. `HOK` — Webhook Entry Point
- **Tipo:** Webhook (POST)
- **Path:** `/webhook/f3cc0fcc-e614-4583-ac35-1a1559ae61c4`
- **Como chega:** O QUEPASA envia um POST para esta URL toda vez que uma mensagem chega no WhatsApp do cliente
- **Autenticação:** `?quepasakey=XXXXXX` — query param único por instância QUEPASA
- **Payload de exemplo (pinData):**
  ```json
  {
    "query": { "quepasakey": "LGHQWKQFCJ" },
    "body": {
      "type": "audio",
      "wid": "5519997730303:29@s.whatsapp.net",
      "chat": {
        "id": "240934931447856@lid",
        "phone": "+5519991647039",
        "title": "Nome do Lead"
      },
      "fromme": false,
      "id": "A52275D75AFA3CE2DF830FEF1E7F66CA"
    }
  }
  ```

---

### 2. `LID NORMALIZER` — Normalização de ID
- **Tipo:** Code (JavaScript)
- **Problema que resolve:** O WhatsApp às vezes identifica contatos pelo `lid` (ID de dispositivo vinculado) em vez do número de telefone real. Sem tratar isso, o mesmo lead aparece duas vezes no banco.
- **Lógica:**
  - Se `chat.phone` está vazio → contato é só `@lid`, salva `phone = null`, `supabase = null`
  - Se `chat.phone` existe → normaliza para `55XXXXXXXXXXX@s.whatsapp.net`
  - Campo `data.supabase` = DDD+número da empresa (wid sem `55` e sem `:29@s.whatsapp.net`) → **este é o `login` no Supabase**

---

### 3. `GET HOK` — Extração de Variáveis
- **Tipo:** Set
- **O que faz:** Renomeia e organiza todos os campos relevantes do payload em variáveis limpas para os subfluxos

| Variável | Origem | Descrição |
|----------|--------|-----------|
| `quepasakey` | `query.quepasakey` | Chave da instância QUEPASA (identifica qual conta está recebendo) |
| `fromme` | `body.fromme` | `true` se a mensagem foi enviada PELO dono do bot (não pelo lead) |
| `numCliente` | `body.chat.id` | ID do lead no WhatsApp |
| `numEmpresa` | `body.wid` limpo | Número da empresa sem sufixo de dispositivo |
| `nomeCliente` | `body.chat.title` | Nome do lead no WhatsApp |
| `msg` | `body.text` | Texto da mensagem |
| `msgType` | `body.type` | `text` ou `audio` (outros são filtrados depois) |
| `msgID` | `body.id` | ID único da mensagem (para deduplicação) |
| `base64` | `body.data.message.base64` | Dados do áudio em base64 |
| `horaAtual` | `$now` formatado | Timestamp BR `DD/MM/AAAA \| HH:mm:ss` |
| `NUMERO` | random 6 dígitos | Identificador temporário de sessão |
| `delay` | fixo `3500` | ms de espera antes de responder (humanização) |
| `wid` | `body.wid` extraído | Número da empresa sem código de país = **login Supabase** |
| `lid` | `body.chat.lid` | ID de dispositivo (caso exista) |

---

### 4. `Filter` — Tipo de Mensagem
- **Aceita:** `msgType === "text"` **OR** `msgType === "audio"`
- **Descarta silenciosamente:** imagens, stickers, documentos, vídeos, reações, etc.
- **Por quê:** O bot só sabe processar texto (e áudio via transcrição no NORMALIZER)

---

### 5. `NORMALIZER` → Subfluxo `RAPDEX NORMALIZER` (ID: `56d86KazdeEfga3O`)
- **Envia:** token, msgtype, login (=`wid`), msg, whatsapp (=`numCliente`), msgID, nomeCliente, fromme
- **Responsabilidade esperada:** transcrever áudio → texto (se necessário), buscar dados da conta no Supabase via `login`, retornar objeto enriquecido com dados da conta

---

### 6. `CADASTRA CLIENTE` → Subfluxo `RAPDEX CADASTRA CLIENTE MATRIX` (ID: `tqRMKdkZcp6W8f0M`)
- **Envia:** tudo do NORMALIZER + `lid`
- **Responsabilidade:** verificar se o lead (`whatsapp`) já existe em `rapdex_leads` para este `login`. Se não existir, inserir. Retorna `status` (ex: `BOTOFF` se bot desativado para este lead)

---

### 7. `BOT OFF` — Filtro de Status
- **Condição:** `$json.status !== "BOTOFF"`
- **Se BOTOFF:** encerra o fluxo sem responder (atendimento humano assumiu)
- **Se qualquer outro valor:** continua

---

### 8. `If` — Mensagem do Dono vs. Lead
- **Condição:** `fromme === "true"`
- **`true` (dono enviou):** → subfluxo `FROM ME`
- **`false` (lead enviou):** → subfluxo `RAPDEX` (resposta da IA)

**Por que isso importa:** Quando o dono responde manualmente no WhatsApp, o QUEPASA também dispara o webhook. O `FROM ME` registra a mensagem manual sem tentar gerar uma resposta automática.

---

### 9. `FROM ME` → Subfluxo `RAPDEX FROM ME MATRIX` (ID: `22MiuaFrqJ0iv4nr`)
- **Envia:** todos os campos + `status` + `lid`
- **Responsabilidade:** salvar a mensagem manual do dono em `rapdex_conversations` com `de_mim = true`
- **Saída:** vazia (termina aqui — não gera resposta automática)

---

### 10. `RAPDEX` → Subfluxo `RAPDEX RESPONSE MATRIX` (ID: `RrrjfBshwwekzPi9`)
- **Envia:** whatsapp, msg (do GET HOK), login, msgtype, token, msgID, nomeCliente, fromme, status (=`question`)
- **Responsabilidade:** lógica principal do bot — consulta FAQs, chama IA, envia resposta via QUEPASA
- **Retorna:** `rapdex` (texto da resposta enviada)

---

### 11. `LOG` → Subfluxo `RAPDEX LOG MATRIX` (ID: `JeZwJBlteEjIVkIZ`)
- **Envia:** whatsapp, msg, rapdex (resposta gerada), fromme, nomeCliente, msgID, token, msgtype, login
- **Responsabilidade:** salvar a dupla `mensagem + resposta` em `rapdex_conversations`

---

### 12. `LOG HISTORY` — ⚠️ NÓ LEGADO (PRECISA ATUALIZAR)
- **Tipo:** Supabase Node
- **Problema:** usa credencial `LOGS DUMIO PIZZARIA` e tabela `history-dumio-pizzaria` — **isso é do projeto anterior**
- **O que deve ser:** já está coberto pelo subfluxo `LOG` acima (que grava em `rapdex_conversations`)
- **Ação necessária:** remover este nó ou reconectar para `rapdex_conversations` com as credenciais RAPDEX

---

## Variáveis que Transitam Entre Subfluxos

```
quepasakey  = chave QUEPASA = identifica a conta = token nos subfluxos
wid         = número da empresa sem 55 = login no Supabase
numCliente  = ID do lead = whatsapp nos subfluxos
fromme      = boolean: dono (true) ou lead (false)
msgType     = "text" | "audio"
msg         = texto da mensagem
status      = retorno do CADASTRA CLIENTE (ex: "BOTOFF" ou número da FAQ ativa)
rapdex      = retorno do RAPDEX (resposta que foi enviada ao lead)
```

---

## O que Precisa Ser Ajustado Para o RAPDEX

| Item | Status | Ação |
|------|--------|------|
| Webhook URL | ✅ genérico — ok | Nenhuma |
| `quepasakey` via query param | ✅ correto | Nenhuma |
| `wid` → `login` Supabase | ✅ lógica correta | Nenhuma |
| LID normalizer | ✅ ok | Nenhuma |
| Filter text/audio | ✅ ok | Nenhuma |
| `LOG HISTORY` nó | ❌ projeto antigo | Remover ou reconectar para `rapdex_conversations` |
| Credenciais Supabase | ❌ "LOGS DUMIO PIZZARIA" | Trocar pela credencial do projeto RAPDEX |

---

## Subfluxos Referenciados (ainda não documentados)

| Nome | ID N8N | Função |
|------|--------|--------|
| RAPDEX NORMALIZER | `56d86KazdeEfga3O` | Transcrição de áudio + busca de conta |
| RAPDEX CADASTRA CLIENTE MATRIX | `tqRMKdkZcp6W8f0M` | Upsert de lead + verificação de bot status |
| RAPDEX RESPONSE MATRIX | `RrrjfBshwwekzPi9` | Lógica de resposta da IA + envio via QUEPASA |
| RAPDEX FROM ME MATRIX | `22MiuaFrqJ0iv4nr` | Log de mensagens manuais do dono |
| RAPDEX LOG MATRIX | `JeZwJBlteEjIVkIZ` | Persistência de conversas no Supabase |

---

*Gerado em 2026-05-08 · RAPDEX Platform*
