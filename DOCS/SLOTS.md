# RAPDEX — Sistema de Slots

## O que é um Slot

Um **slot** é uma instância de bot WhatsApp no QUEPASA reservada para um cliente.
Cada slot tem uma chave QUEPASA (`quepasa_key`) que identifica o bot naquele servidor.

Um slot pode estar em 3 estados:

| `status`      | Significa                                      |
|---------------|------------------------------------------------|
| `disponivel`  | Livre, pode ser alocado para um novo cliente   |
| `ocupado`     | Está em uso por um cliente (`login` preenchido)|
| `manutencao`  | Fora de serviço, não será alocado              |

Dois tipos de slot:

| `tipo`    | Uso                              |
|-----------|----------------------------------|
| `free`    | Plano trial / básico             |
| `premium` | Plano premium (mais capacidade)  |

---

## Ciclo de vida de um Slot

```
disponivel
    │
    │  alocar_slot(login, tipo)    ← N8N cadastro
    ▼
  ocupado
    │ login, quepasa_key, quepasa_wid preenchidos
    │ alocado_em = now()
    │
    │  disable_expired_trials()    ← N8N cron diário 3h
    │  ou cancelamento manual
    ▼
disponivel
    │ login = NULL
    │ quepasa_key = NULL
    │ quepasa_wid = NULL
    │ liberado_em = now()
```

---

## Colunas importantes

| Coluna             | Descrição                                                  |
|--------------------|------------------------------------------------------------|
| `slot_nome`        | Nome único do slot. Ex: `free_01`, `premium_01`            |
| `tipo`             | `free` ou `premium`                                        |
| `status`           | `disponivel`, `ocupado` ou `manutencao`                    |
| `quepasa_key`      | Token do bot no QUEPASA. NULL quando livre                 |
| `quepasa_wid`      | WhatsApp ID conectado (ex: `5519999999999`). NULL quando livre |
| `quepasa_base_url` | URL do servidor QUEPASA desta instância                    |
| `webhook_mensagem` | URL do workflow N8N que processa mensagens deste slot      |
| `workflow_url`     | URL do workflow N8N principal do slot                      |
| `login`            | FK para `rapdex_accounts.login`. NULL quando livre         |
| `alocado_em`       | Quando o slot foi ocupado                                  |
| `liberado_em`      | Quando o slot foi liberado pela última vez                 |

---

## RPCs que interagem com slots

### `alocar_slot(p_login, p_tipo)` — N8N cadastro
- Busca o primeiro slot `disponivel` do tipo solicitado
- Usa `FOR UPDATE SKIP LOCKED` — sem race condition em cadastros simultâneos
- Define `status = 'ocupado'`, `login = p_login`, `alocado_em = now()`
- Retorna os dados do slot para o N8N configurar o QUEPASA

### `disable_expired_trials()` — N8N cron 3h
- Encontra contas com `em_trial = true AND trial_fim < now()`
- Desativa a conta: `conta_ativa = false`, `bot_ativo = false`
- **Libera o slot na mesma transação**: `status = 'disponivel'`, `login/quepasa_key/quepasa_wid = NULL`
- Retorna `quepasa_key` e `quepasa_base_url` capturados ANTES da limpeza
  → N8N usa esses dados para desconectar o bot no QUEPASA

### `activate_account(p_login, p_plano)` — N8N pós-pagamento
- Reativa a conta: `conta_ativa = true`, `bot_ativo = true`, `em_trial = false`
- **Não realoca slot** — o slot foi liberado ao expirar, N8N deve chamar `alocar_slot` novamente

---

## Como adicionar novos slots

Insira diretamente na tabela `rapdex_slots`. Campos obrigatórios:

```sql
INSERT INTO rapdex_slots (
  slot_nome,
  tipo,
  status,
  quepasa_base_url,
  webhook_mensagem,
  workflow_url,
  slot_notas
) VALUES (
  'free_02',
  'free',
  'disponivel',
  'https://quepasa-stack-quepasa.pkgaq6.easypanel.host',
  'https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/rapdex-slot2-mensagem',
  'https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/rapdex-slot2-workflow',
  'Slot free 02 - instância principal QUEPASA'
);
```

> `quepasa_key` e `quepasa_wid` ficam NULL até o cliente conectar o WhatsApp.
> O N8N de cadastro preenche esses campos via `alocar_slot` + configuração QUEPASA.

---

## Verificar estado atual dos slots

```sql
SELECT
  slot_nome,
  tipo,
  status,
  login,
  quepasa_key,
  quepasa_wid,
  alocado_em,
  liberado_em
FROM rapdex_slots
ORDER BY tipo, slot_nome;
```

---

## Pontos de atenção

- **Um slot = um número WhatsApp** conectado. Não compartilhe slots entre clientes.
- O campo `webhook_mensagem` é **único** — cada slot tem seu próprio webhook N8N para receber mensagens.
- Se um cliente assinar novamente após expirar, o N8N de ativação deve chamar `alocar_slot` para reservar um novo slot (o anterior foi liberado).
- Slots em `manutencao` são ignorados pelo `alocar_slot` — use esse status para manutenção sem afetar o pool disponível.
