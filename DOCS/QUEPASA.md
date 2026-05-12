# QUEPASA — Documentação de Referência RAPDEX

## O que é

QUEPASA é uma API self-hosted de WhatsApp usada no RAPDEX como camada de comunicação entre os clientes finais e os bots do N8N. Cada número de WhatsApp conectado gera um **quepasakey** único, que funciona como identificador e token de autenticação.

---

## Instância

| Campo | Valor |
|-------|-------|
| Base URL | `https://quepasa-stack-quepasa.pkgaq6.easypanel.host` |
| Painel web | `{base_url}` (interface de gerenciamento dos bots) |
| Hospedagem | EasyPanel |
| Usuário master | `access@maistempoai.com.br` |

---

## Autenticação

Todas as chamadas à API precisam dos dois headers:

```http
X-QUEPASA-USER: access@maistempoai.com.br
X-QUEPASA-TOKEN: {quepasakey}
```

---

## quepasakey

- Gerado automaticamente quando um número de WhatsApp escaneia o QR code no painel QUEPASA
- Funciona como **token de autenticação** e **identificador do bot**
- Associado 1:1 com um número de WhatsApp
- Salvo em `rapdex_slots.quepasa_key` após o onboarding
- Salvo em `rapdex_accounts.quepasakey` como identificador da conta
- Passado como query string na URL do webhook N8N: `?quepasakey={quepasakey}`

---

## Endpoints usados no RAPDEX

### Registrar webhook
```http
POST /v3/bot/{quepasakey}/webhook

Headers:
  X-QUEPASA-USER: access@maistempoai.com.br
  X-QUEPASA-TOKEN: {quepasakey}

Body:
{
  "url": "https://n8n.../webhook/{uuid}?quepasakey={quepasakey}",
  "forwardinternal": false,
  "groups": false,
  "broadcasts": false,
  "calls": false,
  "acks": false
}
```

- `forwardinternal: false` → ignora mensagens enviadas pelo próprio bot.
- `groups: false` → ignora mensagens vindas de grupos.
- `broadcasts: false` → ignora mensagens vindas de listas de transmissão.
- `calls: false` → ignora notificações de chamadas de voz/vídeo.
- `acks: false` → ignora recibos de leitura (ticks azuis/duplos).
- O campo implicito `messages: true` se encarrega de receber apenas mensagens diretas 1:1.
- A `quepasakey` é passada obrigatoriamente como query string (`?quepasakey=...`) na URL para o N8N identificar com precisão qual conta disparou o evento.

### Enviar texto
```http
POST /v3/bot/{quepasakey}/sendtext

Body:
{
  "chatid": "5511999998888@s.whatsapp.net",
  "text": "Mensagem aqui"
}
```

### Enviar mídia (URL)
```http
POST /v3/bot/{quepasakey}/sendurl

Body:
{
  "chatid": "5511999998888@s.whatsapp.net",
  "url": "https://..."
}
```

---

## Payload de entrada (webhook → N8N)

Quando o QUEPASA recebe uma mensagem, envia um POST para a URL registrada com este payload:

```json
{
  "body": {
    "id":      "MSG_ID_UNICO",
    "type":    "text",
    "text":    "mensagem do usuário",
    "fromme":  false,
    "wid":     "5511888887777:12@s.whatsapp.net",
    "chat": {
      "id":    "5511999998888@s.whatsapp.net",
      "phone": "5511999998888",
      "title": "Nome do Contato",
      "lid":   "12345@lid"
    },
    "data": {
      "message": {
        "base64": "..."
      }
    }
  },
  "query": {
    "quepasakey": "TOKEN_DO_BOT"
  }
}
```

### Campos importantes

| Campo | Descrição |
|-------|-----------|
| `body.chat.id` | ID WhatsApp do remetente (`numero@s.whatsapp.net`) |
| `body.chat.phone` | Telefone limpo do remetente (`5511999998888`) |
| `body.chat.title` | Nome salvo no contato |
| `body.chat.lid` | ID alternativo (usuários sem phone visível) |
| `body.wid` | ID do bot que recebeu a mensagem |
| `body.text` | Texto da mensagem |
| `body.type` | Tipo: `text`, `audio`, `image`, `document`, etc. |
| `body.fromme` | `true` se a mensagem foi enviada pelo próprio bot |
| `body.id` | ID único da mensagem |
| `query.quepasakey` | Token do bot (passado como query string) |

---

## Normalização do wid → numEmpresa

O `body.wid` vem no formato `5511888887777:12@s.whatsapp.net`. No N8N (nó LID NORMALIZER), extraímos o número limpo:

```javascript
// Remove sufixo :XX e @domínio, remove 55, mantém 11 dígitos
data.supabase = wid.replace(/\D/g, '').replace(/^55/, '').slice(0, 11);
```

Esse valor vira o `login` (numEmpresa) → chave de busca nas tabelas `rapdex_accounts` e `rapdex_leads`.

---

## Tipos de mensagem (msgType)

| Tipo | Descrição |
|------|-----------|
| `text` | Texto comum |
| `audio` | Áudio/PTT |
| `image` | Imagem |
| `document` | Documento/PDF |
| `video` | Vídeo |

O MATRIX filtra para processar apenas `text` e `audio` (o áudio é transcrito em outro fluxo).

---

## Casos especiais — LID

Alguns contatos do WhatsApp não expõem o número de telefone — chegam com `body.chat.id` no formato `XXXX@lid` em vez de `5511...@s.whatsapp.net`. O nó **LID NORMALIZER** detecta e trata esse caso:

- Se `body.chat.phone` está vazio → é um contato LID
- O `body.chat.lid` é usado como identificador
- Busca em `rapdex_leads` pelo campo `lid` em vez de `whatsapp_cli`

---

## Pool de slots QUEPASA (rapdex_slots)

Cada slot representa um número de WhatsApp conectado ao QUEPASA + um workflow MATRIX no N8N:

| Campo | Descrição |
|-------|-----------|
| `quepasa_key` | Token gerado pelo QUEPASA ao conectar o número |
| `quepasa_wid` | WID do número (formato completo) |
| `quepasa_base_url` | URL base do QUEPASA (pode variar por instância) |
| `webhook_mensagem` | URL do webhook N8N do MATRIX deste slot |
| `workflow_url` | URL do workflow N8N para gerenciamento |
| `status` | `disponivel` / `alocado` / `ativo` |
| `login` | Celular do cliente alocado neste slot |
| `trial_expires_at` | Data de expiração do trial |

---

## Fluxo de registro do webhook (novo cliente)

```
Cliente escaneia QR → QUEPASA gera quepasakey
         │
         ▼
alocar_slot(login, 'free')  ← RPC Supabase
  → retorna webhook_mensagem (URL do N8N)
         │
         ▼
POST /v3/bot/{quepasakey}/webhook
  url = webhook_mensagem + "?quepasakey=" + quepasakey
         │
         ▼
atualizar_quepasakey_slot(login, quepasakey) ← RPC Supabase
  → salva key no slot, marca status='ativo'
```

---

## Observações

- A instância QUEPASA é compartilhada entre todos os clientes RAPDEX
- Cada número conectado consome um slot fixo de memória/recurso
- Ao encerrar um trial, o slot deve ser resetado: `status='disponivel'`, `login=NULL`, `quepasa_key=NULL`
- O workflow **RAPDEX — Desabilita Testes Vencidos** (cron) cuida da expiração automática
