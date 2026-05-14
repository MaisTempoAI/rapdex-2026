# Tela de Admin — Slots

## Arquivo
`src/pages/Admin.tsx`

## Acesso
Rota protegida por senha (`x-admin-key` no header). O painel é acessado via URL `/admin` no site.

## Estrutura da Tela

### Header / Filtros
- Campo de busca por nome do slot
- Botão **+ Novo Slot** — abre formulário inline de criação
- Filtro de status: todos / disponivel / ocupado / manutencao

---

## Formulário de Criação (Novo Slot)

Campos disponíveis:
| Campo | Nome interno | Obrigatório |
|-------|-------------|-------------|
| Nome (ex: free_02) | `slot_nome` | ✅ |
| Webhook Mensagem URL | `webhook_mensagem` | ❌ (nullable no banco) |
| N8N Webhook URL | `n8n_hok_url` | ❌ |
| Workflow URL | `workflow_url` | ❌ |
| Trial Expira em | `trial_expires_at` | ❌ |
| Tipo | `tipo` | ❌ (default: free) |

> ⚠️ A validação só exige `slot_nome`. O campo `webhook_mensagem` foi removido da validação obrigatória em 2026-05-14 (era exigido no código mas não existia input no form).

**Função de submit:** `criarSlot()` → chama `POST /api/admin-slots` com `{ action: 'criar', slot: novoForm }`

---

## Cards de Slot (Listagem)

Cada slot exibe um card com:

### Cabeçalho do card
- Nome do slot (font-mono bold)
- Badge de status (disponivel / ocupado / manutencao) com cor
- Badge de tipo (free / premium)
- Se ocupado: `👤 login` + data de alocação

### Grid de campos editáveis (2 colunas, `md:grid-cols-2`)

Layout atual (ordem de cima para baixo):
1. **ID do Slot** — desabilitado, somente leitura
2. **Login (Celular)** — editável
3. **Trial Expira em** (col 1) + **🔑 Chave de Acesso** (col 2, só aparece se `quepasa_key` preenchido, com botão copiar)
4. **N8N Webhook URL** — full width (`md:col-span-2`), com botão copiar
5. **Workflow URL (para abrir no N8N)** — full width (`md:col-span-2`), com botão copiar
6. **Status** — dropdown (disponivel / ocupado / manutencao)
7. **Tipo** — dropdown (free / premium)
8. **Notas** — textarea full width
9. **QuePasa Base URL** — full width

### Botões de ação do card
- **Salvar** — aparece só quando há alteração pendente (`temAlteracao`)
- **Liberar** — aparece quando slot está ocupado (libera o cliente)
- **Excluir** — confirmação antes de deletar

---

## API Backend

**Arquivo:** `api/admin-slots.js`  
**Endpoint:** `/api/admin-slots`  
**Auth:** header `x-admin-key`  
**Tabela Supabase:** `rapdex_slots`  
**Usa:** service role key (bypassa RLS)

### Ações disponíveis:
| Método | Action | Descrição |
|--------|--------|-----------|
| GET | — | Lista todos os slots |
| POST | `criar` | Cria novo slot |
| PUT | `editar` | Atualiza campos de um slot |
| DELETE | — | Remove slot por ID |
| PUT | `liberar` | Limpa login/quepasa_key/status do slot |

---

## Tabela `rapdex_slots` (Supabase)

```sql
id              bigserial PK
slot_nome       text null
tipo            slot_tipo ('free' | 'premium')
status          slot_status ('disponivel' | 'ocupado' | 'manutencao')
login           text null → FK rapdex_accounts(login)
quepasa_key     text null UNIQUE
quepasa_wid     text null
quepasa_base_url text default 'https://quepasa-stack-quepasa.pkgaq6.easypanel.host'
webhook_mensagem text null UNIQUE
workflow_url    text null
n8n_hok_url     text null
n8n_workflow_id text null
trial_expires_at timestamptz null
slot_notas      text null
alocado_em      timestamptz null
liberado_em     timestamptz null
```

---

## Histórico de mudanças relevantes

| Data | Mudança |
|------|---------|
| 2026-05-14 | Removido `webhook_mensagem` da validação obrigatória |
| 2026-05-14 | `n8n_hok_url` ficou full-width com botão copiar (igual workflow_url) |
| 2026-05-14 | `trial_expires_at` movido acima do N8N Webhook URL |
| 2026-05-14 | `quepasa_key` exibido ao lado do Trial como campo com botão copiar |
| 2026-05-14 | `SLOT_VAZIO` corrigido: campos opcionais passaram de `''` para `null` — `''` violava unique constraint de `webhook_mensagem` |
| 2026-05-14 | `api/admin-slots.js` corrigido: `criar`, `editar` e `liberar` agora checam `supaRes.ok` — antes retornavam sucesso mesmo com erro do Supabase |

## Armadilhas conhecidas

- **`webhook_mensagem` tem UNIQUE constraint** — nunca enviar string vazia `''`, sempre `null` quando não preenchido. Strings vazias violam a constraint, NULLs não.
- **`quepasa_key` também tem UNIQUE constraint** — mesma regra.
- **`api/admin-slots.js` usa service role key** — verificar no Vercel se existe uma das variáveis: `SUPABASE_SERVICE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ou `SERVICE_ROLE_KEY`. Se nenhuma estiver configurada, todos os writes falham silenciosamente.
- **API sempre retornava 200** — corrigido em 2026-05-14. Se voltar a ter problema de "criou mas não aparece", checar se `supaRes.ok` está sendo verificado.
