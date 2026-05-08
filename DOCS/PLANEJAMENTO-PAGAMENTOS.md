# RAPDEX — Planejamento: Integração de Pagamentos

> Status: **Planejado** — não implementado.
> Plataformas alvo: Kiwify / Kirvano

---

## Resposta à dúvida de arquitetura

**Uma estrutura de slots só.** Não precisa criar nada novo.

| Plano     | `plano_tipo` | `slot_tipo` usado | FAQs permitidas |
|-----------|-------------|-------------------|-----------------|
| `trial`   | `trial`     | `free`            | 5 (no cadastro) |
| `basic`   | `basic`     | `free`            | 10              |
| `premium` | `premium`   | `premium`         | 30              |

O que muda entre planos **não é o slot** — é o que o sistema permite dentro dele (quantidade de FAQs, funcionalidades, limites). O slot premium só existe se a instância QUEPASA for fisicamente diferente (ex: servidor dedicado). Se usar a mesma instância para todos, pode usar `free` para todos e só mudar `plano_tipo` na conta.

---

## Como funciona o fluxo de pagamento

```
Cliente paga na Kiwify/Kirvano
        │
        ▼
Plataforma dispara webhook POST para URL do N8N
        │
        ▼
N8N identifica o plano comprado e o login (via e-mail ou telefone)
        │
        ├─ Conta já existe (upgrade)?
        │       → activate_account(login, novo_plano)
        │       → Se subindo para premium: libera slot free, aloca slot premium
        │
        └─ Conta nova (primeiro pagamento)?
                → create_account(login, senha_gerada, nome, plano, whatsapp)
                → alocar_slot(login, slot_tipo_do_plano)
                → Envia senha por WhatsApp
```

---

## Dados que a Kiwify/Kirvano enviam no webhook

Ambas enviam um payload JSON no POST. Campos úteis:

| Campo (aproximado)    | Uso no RAPDEX                                |
|-----------------------|----------------------------------------------|
| `customer.phone`      | Login do cliente (número WhatsApp)           |
| `customer.email`      | Identificação alternativa                    |
| `customer.name`       | Nome da empresa (se não tiver outra fonte)   |
| `product.name`        | Identifica qual plano foi comprado           |
| `status`              | `paid`, `refunded`, `chargeback`             |
| `subscription.status` | `active`, `cancelled` (para recorrência)     |

> Mapear `product.name` para `plano_tipo` no N8N antes de chamar o Supabase.

---

## O que precisa ser feito

### 1. Banco (Supabase) — mínimo necessário
- [ ] Adicionar `enterprise` ao enum `plano_tipo` (se for oferecer esse plano)
- [ ] Adicionar `enterprise` ao enum `slot_tipo` (se tiver instância dedicada)
- [ ] Criar RPC `upgrade_account(p_login, p_plano_novo)` que:
  - Verifica se precisa trocar de slot (free → premium)
  - Libera slot atual se tipo mudar
  - Aloca novo slot do tipo correto
  - Atualiza `plano` na conta
- [ ] Criar RPC `cancel_account(p_login)` para cancelamentos/chargebacks

### 2. N8N — workflows novos
- [ ] **rapdex-pagamento-aprovado**: recebe webhook Kiwify/Kirvano, identifica plano, chama `activate_account` ou `create_account` + `alocar_slot`
- [ ] **rapdex-pagamento-cancelado**: recebe webhook de cancelamento/chargeback, chama `disable_account(login)` e libera slot
- [ ] **rapdex-renovacao-assinatura**: confirma renovação mensal, mantém conta ativa

### 3. Frontend — telas futuras
- [ ] Tela "Seu trial acabou" com botão de upgrade (já temos a mensagem de erro)
- [ ] Página de planos com link direto para checkout Kiwify/Kirvano
- [ ] Indicador de plano no Dashboard (badge "Trial X dias restantes")

---

## Estrutura de URLs sugerida para os webhooks N8N

```
POST /webhook/rapdex-pagamento-aprovado    ← Kiwify/Kirvano enviam aqui
POST /webhook/rapdex-pagamento-cancelado   ← Cancelamentos e chargebacks
POST /webhook/rapdex-renovacao             ← Renovação de assinatura
```

Configurar na plataforma de pagamento na seção "Webhooks" do produto.

---

## Planos atuais no sistema

```sql
-- Verificar enum atual:
SELECT unnest(enum_range(NULL::plano_tipo))::text;
-- Resultado: basic, premium, trial

SELECT unnest(enum_range(NULL::slot_tipo))::text;
-- Resultado: free, premium
```

Para adicionar `enterprise` quando necessário:
```sql
ALTER TYPE plano_tipo ADD VALUE IF NOT EXISTS 'enterprise';
ALTER TYPE slot_tipo  ADD VALUE IF NOT EXISTS 'enterprise';
```

---

## Decisão pendente

Antes de implementar, definir:
1. **Quantos planos vai ter?** (trial → basic → premium → enterprise?)
2. **Basic usa slot free ou slot próprio?**
3. **Kirvano ou Kiwify?** (ou ambos?) — afeta mapeamento do payload do webhook
4. **Assinatura recorrente ou pagamento único?** — afeta lógica de renovação
