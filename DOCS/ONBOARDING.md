# RAPDEX — Onboarding: O que foi feito e como funciona

## Visão geral do fluxo

O onboarding é o processo pelo qual um novo cliente cria sua conta no RAPDEX e conecta seu WhatsApp. O fluxo completo tem 5 etapas no frontend e passa por 3 Netlify Functions no backend.

```
Boas-vindas → Dados → FAQs → Conexão → Finalizando
```

---

## Etapas do frontend (`OnboardingFlow.tsx`)

### 1. Boas-vindas
Tela introdutória. Nenhuma API é chamada. Apenas exibe apresentação e botão "Começar agora".

### 2. Dados
Usuário preenche **nome da empresa** e **celular** (que será o login).

Ao clicar "Continuar":
- Chama RPC Supabase `check_login_exists` para verificar se o número já tem conta
- Se já existe → exibe aviso e bloqueia avanço
- Se não existe → vai para FAQs

### 3. FAQs
Usuário configura até 5 perguntas e respostas automáticas do bot.

Ao clicar "Continuar": apenas avança para a tela de Conexão. Nenhuma API é chamada aqui.

### 4. Conexão WhatsApp
O usuário escolhe como conectar:
- **QR Code** (WhatsApp no PC) → chama `/api/qr-code`
- **Código de pareamento** (WhatsApp no celular) → chama `/api/pairing-code`

Ao clicar "Conectar":
- Chama o endpoint correspondente
- Exibe o QR code ou código de pareamento
- Inicia polling de 10 em 10 segundos chamando `/api/status-conexao`
- Tem um check extra em 55s (5s antes do QR expirar)
- Quando `status-conexao` retorna `{conectado: true}` → vai para "Finalizando"

### 5. Finalizando
Chama `/api/cadastro` (POST) com todos os dados: celular, nome_empresa, token QUEPASA, dispositivo, FAQs e temp_upload_id.

---

## Netlify Functions

### `/api/qr-code` (`netlify/functions/qr-code.js`)

Chamado quando o usuário clica "Conectar" na tela de QR Code.

**O que faz:**
1. Recebe `?celular=XXXXXXXXXXX` via query string
2. **Envia Pushover** "📱 Novo Cadastro Iniciado" (antes de qualquer outra coisa)
3. Chama N8N `criaqrcoderapdex?celular=...` (GET) que aciona o QUEPASA para gerar o QR
4. Retorna `{ok: true, qr_base64: "...", token: "..."}`

**Env vars:**
- `PUSHOVER_WEBHOOK_URL` — fallback: URL hardcoded do webhook N8N
- `N8N_BASE_URL` — fallback: `https://n8n-stack-n8n.nzdbvp.easypanel.host`

**Armadilha resolvida:** o Pushover precisa de `await`. Em Netlify Functions (AWS Lambda), quando o handler retorna a resposta, o processo é congelado imediatamente. Qualquer `fetch()` sem `await` que ainda esteja pendente é cancelado e nunca chega ao destino.

---

### `/api/status-conexao` (`netlify/functions/status-conexao.js`)

Chamado pelo polling do frontend a cada 10s.

**O que faz:**
1. Recebe `?token=XXXXXXXX` via query string
2. Faz GET no N8N `rapdex2026-consulta-quepasa-connect` com header `quepasakey: {token}`
3. Retorna `{conectado: true}` ou `{conectado: false}`

**Env vars:**
- `QUEPASA_CONNECT_WEBHOOK_URL` — fallback: URL hardcoded do webhook N8N

**Armadilha resolvida:** o código original usava `|| ''` como fallback. Se a env var não estivesse setada no Netlify, `CONNECT_URL` ficava vazio (`''` é falsy em JS), e a função retornava `{conectado: false}` imediatamente sem nem chamar o N8N. Resultado: o polling nunca detectava conexão e o QR expirava sem avançar.

**Fix aplicado:** fallback hardcoded com a URL correta. A guarda `if (!token || !CONNECT_URL)` foi simplificada para `if (!token)`.

---

### `/api/cadastro` (`netlify/functions/cadastro.js`)

Chamado quando a conexão QUEPASA é detectada.

**O que faz:**
1. Recebe POST com `{celular, nome_empresa, token, dispositivo, perguntas[], temp_upload_id}`
2. **Envia Pushover** "✅ Novo Cliente Cadastrado" com nome e celular
3. Faz POST no N8N `rapdex-perguntas-onboarding` com o payload completo
4. Retorna o que o N8N retornar

**Env vars:**
- `PUSHOVER_WEBHOOK_URL` — fallback: URL hardcoded do webhook N8N
- `N8N_BASE_URL` — fallback: `https://n8n-stack-n8n.nzdbvp.easypanel.host`

---

## N8N — Workflows envolvidos

### `pushover-7988` (webhook ativo)
Recebe POST com `{title, message}` e chama a API do Pushover.

```
POST /webhook/pushover-7988
Body: { "title": "...", "message": "..." }
```

### `criaqrcoderapdex` (webhook ativo)
Recebe GET com `?celular=...`, aciona o QUEPASA para criar um bot e gerar o QR code.

```
GET /webhook/criaqrcoderapdex?celular=XXXXXXXXXXX
Retorna: { ok: true, qr_base64: "data:image/png;base64,...", token: "XXXXXXXX" }
```

### `rapdex2026-consulta-quepasa-connect` (webhook ativo)
Recebe GET com header `quepasakey`, consulta o QUEPASA `/v3/bot/{token}` e retorna se está conectado.

```
GET /webhook/rapdex2026-consulta-quepasa-connect
Header: quepasakey: XXXXXXXX
Retorna: { "conectado": true } ou { "conectado": false }
```

### `rapdex-perguntas-onboarding` (webhook ativo)
Recebe o payload completo do cadastro e orquestra: aloca slot, configura QUEPASA webhook, salva no Supabase, envia boas-vindas via WhatsApp.

```
POST /webhook/rapdex-perguntas-onboarding
Body: { celular, nome_empresa, token, dispositivo, perguntas[], temp_upload_id }
```

---

## Notificações Pushover

Duas notificações chegam no celular durante o cadastro de cada cliente:

| Momento | Título | Mensagem |
|---|---|---|
| Ao clicar "Conectar" (QR) | 📱 Novo Cadastro Iniciado | `Número {celular} clicou em Conectar e pediu QR Code.` |
| Ao concluir o cadastro | ✅ Novo Cliente Cadastrado | `{nome_empresa} ({celular}) concluiu o cadastro!` |

---

## Variáveis de ambiente no Netlify

Configuradas em: **Netlify Dashboard → Site → Environment variables**

| Variável | Valor | Usado em |
|---|---|---|
| `PUSHOVER_WEBHOOK_URL` | `https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/pushover-7988` | `qr-code.js`, `cadastro.js` |
| `QUEPASA_CONNECT_WEBHOOK_URL` | `https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/rapdex2026-consulta-quepasa-connect` | `status-conexao.js` |
| `N8N_BASE_URL` | `https://n8n-stack-n8n.nzdbvp.easypanel.host` | `qr-code.js`, `cadastro.js` |

**Importante:** todas as funções têm fallback hardcoded para as URLs acima. Se as env vars não estiverem setadas, as funções ainda funcionam.

---

## Diagrama de sequência

```
Usuario          Frontend            Netlify              N8N              QUEPASA
  |                 |                   |                   |                 |
  |-- "Conectar" -->|                   |                   |                 |
  |                 |-- GET /qr-code -->|                   |                 |
  |                 |                   |-- POST pushover ->|                 |
  |                 |                   |                   |-- Pushover API  |
  |                 |                   |-- GET criaqr ---->|                 |
  |                 |                   |                   |-- GET /v3/bot -->|
  |                 |                   |                   |<-- QR base64 --|
  |                 |<-- qr_base64 -----|                   |                 |
  |<-- exibe QR ---|                   |                   |                 |
  |                 |                   |                   |                 |
  |  (escaneia QR) |                   |                   |                 |
  |                 |                   |                   |                 |
  |                 |-- GET /status --> | (polling 10s)     |                 |
  |                 |                   |-- GET connect --->|                 |
  |                 |                   |                   |-- GET /v3/bot ->|
  |                 |                   |                   |<- verified:true-|
  |                 |                   |<-- conectado:true |                 |
  |                 |<-- {conectado:true}                   |                 |
  |                 |                   |                   |                 |
  |                 |-- POST /cadastro->|                   |                 |
  |                 |                   |-- POST pushover ->|                 |
  |                 |                   |-- POST onboarding>|                 |
  |                 |                   |                   |-- salva Supabase|
  |                 |                   |                   |-- boas-vindas WA|
  |<-- "Conta criada"                  |                   |                 |
```

---

## Como testar via PowerShell

```powershell
# 1. Testar QR code (deve disparar Pushover + retornar QR)
Invoke-WebRequest -Uri 'https://rapdex.netlify.app/api/qr-code?celular=SEU_NUMERO' -UseBasicParsing

# 2. Testar status de conexão
Invoke-WebRequest -Uri 'https://rapdex.netlify.app/api/status-conexao?token=SEU_TOKEN' -UseBasicParsing

# 3. Testar cadastro completo
$body = '{"celular":"SEU_NUMERO","nome_empresa":"Teste","token":"SEU_TOKEN","dispositivo":"desktop","perguntas":[]}'
Invoke-WebRequest -Uri 'https://rapdex.netlify.app/api/cadastro' -Method POST -ContentType 'application/json' -Body $body -UseBasicParsing
```
