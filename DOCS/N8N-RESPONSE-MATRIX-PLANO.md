# Plano de Migração — RAPDEX RESPONSE MATRIX
### Do sistema antigo (FAQ10) para o RAPDEX · Antes de gerar o JSON de produção

---

## Resumo Executivo

O fluxo tem **18 pontos de mudança** agrupados em 5 categorias:
1. Busca de dados da empresa (reestruturação completa)
2. Busca de FAQs (tabela separada no RAPDEX vs colunas no antigo)
3. Operações na tabela de leads
4. Deduplicação de respostas
5. Credenciais e referências de campo

---

## Categoria 1 — Busca de Dados da Empresa

### Problema
O antigo sistema buscava tudo numa linha só: `FAQ10-master WHERE quepasakey = ?`  
Essa linha tinha q1...q20, q1response...q20response, q1url...q20url, botativo, MSGSaudacao, etc.

No RAPDEX os dados estão em **3 tabelas separadas**:
- `rapdex_accounts` — configurações da conta
- `rapdex_faqs` — perguntas/respostas (até 30, uma por linha)
- `rapdex_slots` — URL base do QUEPASA

### Solução: substituir 2 nós por 4 nós

**Remover:**
- `DADOS EMPRESA` (NocoDB — legado, desconectado)
- `DADOS EMPRESA` (Supabase `FAQ10-master`) — **renomear para `DADOS CONTA`**

**Adicionar:**

#### Nó 1 — `DADOS CONTA` (substitui o Supabase FAQ10-master)
```
Tipo: Supabase GET
Tabela: rapdex_accounts
Filtro: quepasakey = {{ $json.quepasakey }}
```

#### Nó 2 — `GET FAQS` (novo)
```
Tipo: Supabase GET ALL
Tabela: rapdex_faqs
Filtros: login = {{ $('DADOS CONTA').item.json.login }}
         ativa = true
Order: slot ASC
```

#### Nó 3 — `GET SLOT` (novo — para pegar quepasa_base_url)
```
Tipo: Supabase GET
Tabela: rapdex_slots
Filtro: quepasa_key = {{ $json.quepasakey }}
```
> Motivo: `quepasa_base_url` fica no slot, não na conta. Cada slot pode ter uma URL diferente.

#### Nó 4 — `GET EMPRESA` (Code node — substitui o Set antigo)

Este nó é o coração da mudança. Transforma os dados das 3 tabelas no formato `q1...q30` que o CODE COM GATILHOS EXATOS e o AI Agent1 esperam. **Mantém o nome `GET EMPRESA`** para que todos os nós downstream continuem funcionando sem alteração de referências.

```javascript
// Input: DADOS CONTA (item), GET FAQS (all), GET SLOT (item)

const conta = $('DADOS CONTA').item.json;
const faqs  = $('GET FAQS').all().map(i => i.json);
const slot  = $('GET SLOT').first()?.json ?? {};

// Monta o objeto base com os campos da conta
const out = {
  // Identificação
  quepasakey:     conta.quepasakey,
  login:          conta.login,
  nome_empresa:   conta.nome_empresa,
  quepasa_base_url: slot.quepasa_base_url
                ?? 'https://quepasa-stack-quepasa.pkgaq6.easypanel.host',

  // Configurações do bot
  botativo:       String(conta.bot_ativo),     // mantém campo antigo para BOT ATIVO? funcionar
  Timer:          conta.delay_resposta ?? 3,

  // Saudação
  MSGSaudacaoactive: String(conta.saudacao_ativa),
  MSGSaudacao:       conta.saudacao_texto ?? '',
  MSGSaudacaourl:    conta.saudacao_url ?? '',

  // Notificação
  notificanumero: String(conta.notifica_ativo),
  whatsapp2:      conta.notifica_numero ?? '',

  // Regras IA
  ia_regras:      conta.ia_regras ?? '',
};

// Mapeia rapdex_faqs → q1...q30 (pergunta / resposta / url)
for (let i = 1; i <= 30; i++) {
  const faq = faqs.find(f => f.slot === i);
  out[`q${i}`]         = faq?.pergunta  ?? '';
  out[`q${i}response`] = faq?.resposta  ?? '';
  out[`q${i}url`]      = faq?.midia_url ?? '';
}

return [{ json: out }];
```

> **Por que manter nomes antigos (botativo, MSGSaudacaoactive...)?**  
> Todos os nós downstream (`BOT ATIVO?`, `SAUDACAO ativa?1`, etc.) referenciam
> `$('GET EMPRESA').item.json.botativo`. Mantendo os nomes no output do Code,
> zero alteração downstream necessária — salvo as exceções listadas abaixo.

---

## Categoria 2 — URLs QUEPASA hardcoded

### Problema
Todos os `HTTP Request` de envio têm URL hardcoded:
`https://quepasa-stack-quepasa.pkgaq6.easypanel.host`

### Solução
Substituir por: `{{ $('GET EMPRESA').item.json.quepasa_base_url }}`

**Afeta os nós:**
- `HTTP Request` (envia boas-vindas)
- `HTTP Request6` (envia resposta texto)
- `HTTP Request7` (notificação ao dono)
- `SEND URL` (envia mídia única)
- `SEND URL1`, `SEND URL2`, `SEND URL3` (envia múltiplas mídias)

---

## Categoria 3 — Tabela de Leads (FAQ10-clients → rapdex_leads)

### Nós afetados: `Get a row1`, `Get a row2`, `Update a row`, `Update a row1`

#### `Get a row1` e `Get a row2` — busca do lead pelo número
```
Tabela: FAQ10-clients → rapdex_leads
Filtro: whatsapp = numCliente → whatsapp_cli = numCliente.replace(/@.*/, '')
Filtro: login = supabase → login = numEmpresa (sem alteração de valor)
```

#### `Update a row` (após boas-vindas, path phone normal)
```
Tabela: FAQ10-clients → rapdex_leads
Filtro: id = $json.id  (sem alteração)
Campo: question = "BOAS VINDAS"  (sem alteração — campo já existe em rapdex_leads)
```

#### `Update a row1` (após boas-vindas, path lid)
```
Tabela: FAQ10-clients → rapdex_leads
Campo: question = "BOAS VINDAS"  (sem alteração)
Campo: whatsapp → whatsapp_cli = $('HTTP Request').item.json.message.chatId
Campo: lid = numCliente  (sem alteração)
```

---

## Categoria 4 — Deduplicação (FAQ10-conversation → rapdex_conversations)

### `BUSCA RESPOSTAS RAPDEX`

```
Tabela: FAQ10-conversation → rapdex_conversations
Remover filtro: type = "rapdex"  (não existe em rapdex_conversations)
Manter filtro: login = supabase
Manter filtro: whatsappcli = numCliente → whatsapp_cli = numCliente.replace(/@.*/, '')
```

### `VERIFICA RESPOSTAS 24H` — Code interno

Duas mudanças no JavaScript:

**1. Campo de data:** `r.criadoem` → `r.created_at`  
O antigo armazenava como string `"05/05/2026 | 18:25"`.  
O RAPDEX usa `timestamptz` ISO padrão (`2026-05-05T21:25:00.000Z`).

```javascript
// ANTES (parseData customizado):
const parseData = str => {
  if (!str) return null;
  const [datePart, timePart] = str.split(' | ');
  ...
};

// DEPOIS (ISO nativo):
const parseData = str => str ? new Date(str) : null;
```

**2. Campo de texto:** `r.resposta` (mesmo nome — sem alteração ✅)

---

## Categoria 5 — Code JavaScript1 (extração de URLs de mídia)

### Problema
O regex extrai URLs do bucket antigo: `wueuppkkmpedalxtjouy.supabase.co`

### Solução
```javascript
// ANTES:
const markdownLinkPattern = /\[[^\]]*\]\((https:\/\/wueuppkkmpedalxtjouy\.supabase\.co\/[^)]+)\)/g;
const plainUrlPattern = /https:\/\/wueuppkkmpedalxtjouy\.supabase\.co\/[^\s\)\]\[;]+/g;

// DEPOIS:
const markdownLinkPattern = /\[[^\]]*\]\((https:\/\/rudtxgwzqrsvrdniqvav\.supabase\.co\/[^)]+)\)/g;
const plainUrlPattern = /https:\/\/rudtxgwzqrsvrdniqvav\.supabase\.co\/[^\s\)\]\[;]+/g;
```

Afeta: `Code in JavaScript1` e `Code in JavaScript` (dois nós com regex similares)

---

## Categoria 6 — CODE COM GATILHOS EXATOS (extend de 20 → 30)

Uma linha muda no loop:

```javascript
// ANTES:
for (let i = 1; i <= 20; i++) {

// DEPOIS:
for (let i = 1; i <= 30; i++) {
```

---

## Categoria 7 — AI Agent1 System Prompt (extend de 20 → 30)

O system prompt lista as perguntas de `### 1.` até `### 20.`. Precisa ir até `### 30.`

```
### 21.
**Pergunta:** {{ $('GET EMPRESA').item.json.q21 }}
**Resposta:** {{ $('GET EMPRESA').item.json.q21response }}
... até q30
```

---

## Categoria 8 — Credenciais

| Nó | Credencial antiga | Nova |
|----|------------------|------|
| `DADOS CONTA` | `Supabase MAISTEMPO-MASTER` | `RAPDEX SUPABASE` |
| `GET FAQS` | nova | `RAPDEX SUPABASE` |
| `GET SLOT` | nova | `RAPDEX SUPABASE` |
| `Get a row1`, `Get a row2` | `MAISTEMPO-MASTER` | `RAPDEX SUPABASE` |
| `Update a row`, `Update a row1` | `MAISTEMPO-MASTER` | `RAPDEX SUPABASE` |
| `BUSCA RESPOSTAS RAPDEX` | `MAISTEMPO-MASTER` | `RAPDEX SUPABASE` |
| `AI Agent1` | `OpenAi SAMCOR` | `RAPDEX OPENAI` |
| `AI Agent3` | `OpenAi SAMCOR` | `RAPDEX OPENAI` |
| `IA MSG FILTER` | `LAPALMA` | `RAPDEX OPENAI` (quando reativar) |

---

## Categoria 9 — Referências de campo `supabase` → `numEmpresa`

Em alguns `MSG FLT FINAL`, o login é referenciado como `$('GET HOK').item.json.supabase`.  
No RAPDEX o GET HOK seta `numEmpresa` com o mesmo valor. Ambos funcionam — mas `numEmpresa` é mais explícito.

**Afeta:** `MSG FLT FINAL`, `MSG FLT FINAL2` — campo `login`

---

## Categoria 10 — Nós a remover

| Nó | Motivo |
|----|--------|
| `Get a row` (NocoDB) | Legado desconectado — NocoDB não está mais no stack |
| `BUSCA RESPOSTAS RAPDEX1` | Debug/manual trigger — pode ficar desativado mas não precisa estar no JSON de produção |
| `When clicking 'Execute workflow'` | Manual trigger de teste — remover do JSON de produção |
| `HTTP Request2` (Evolution API) | Nó desconectado que usa Evolution API (outro projeto) |

---

## Diagrama das mudanças no fluxo de entrada

```
ANTES:
GET HOK → DADOS EMPRESA (Supabase FAQ10-master) → GET EMPRESA (Set) → BOT ATIVO?

DEPOIS:
GET HOK ─┬─→ DADOS CONTA (rapdex_accounts WHERE quepasakey)
         │
         ├─→ GET FAQS (rapdex_faqs WHERE login + ativa)
         │
         └─→ GET SLOT (rapdex_slots WHERE quepasa_key)
                    │
                    ▼ (os 3 alimentam)
              GET EMPRESA (Code: monta q1..q30)
                    │
                    ▼
              BOT ATIVO? (sem alteração de lógica)
```

---

## Ordem de implementação no JSON

1. Substituir nó `DADOS EMPRESA` (Supabase) por `DADOS CONTA`
2. Adicionar `GET FAQS` em paralelo com `DADOS CONTA`
3. Adicionar `GET SLOT` em paralelo
4. Substituir `GET EMPRESA` (Set) por `GET EMPRESA` (Code com merge)
5. Atualizar `Get a row1`, `Get a row2` → `rapdex_leads`
6. Atualizar `Update a row`, `Update a row1` → `rapdex_leads`
7. Atualizar `BUSCA RESPOSTAS RAPDEX` → `rapdex_conversations`
8. Atualizar `VERIFICA RESPOSTAS 24H` → parseData ISO + campo `created_at`
9. Atualizar `Code in JavaScript1` e `Code in JavaScript` → novo bucket URL
10. Atualizar `CODE COM GATILHOS EXATOS` → loop até 30
11. Atualizar `AI Agent1` system prompt → q1...q30
12. Substituir todas URLs QUEPASA hardcoded por `quepasa_base_url` dinâmico
13. Atualizar todas credenciais
14. Remover nós legados (NocoDB, Evolution API, manual triggers)

---

## Confirmações antes de gerar o JSON

- [x] `rapdex_leads.question` e `rapdex_leads.lid` existem (migration rodada)
- [x] Bucket `rapdex-midia` existe no Supabase
- [x] `rapdex_accounts.quepasakey` tem o valor da quepasa key
- [ ] Confirmar nome da credencial OpenAI no N8N → será **`RAPDEX OPENAI`**?
- [ ] Confirmar: manter `IA MSG FILTER` pinado (desativado) ou remover do JSON?
- [ ] Confirmar: o `AI Agent3` (boas-vindas) deve continuar usando GPT ou remover o agente e enviar o texto direto (sem IA)?

---

*Plano gerado em 2026-05-08 · Aguardando confirmação para gerar JSON de produção*
