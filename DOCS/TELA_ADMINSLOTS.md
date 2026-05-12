# Tela /slotsadmin — Painel de Gestão de Slots

## Problema Original

A tela `/slotsadmin` abria normalmente (login com `VITE_ADMIN_PASSWORD`), mas não exibia nenhum dado das tabelas.

**Causa:** O componente `Admin.tsx` fazia consultas SQL diretamente na tabela `rapdex_slots` usando o cliente Supabase do frontend (anon key). Porém o projeto segue a regra: *"frontend só chama RPCs (SECURITY DEFINER), nunca tabelas direto"* — o RLS (Row Level Security) do Supabase bloqueava o acesso da anon key.

## Solução Adotada: API Serverless

Migramos o Admin.tsx para usar a **API serverless** `/api/admin-slots.js` (Vercel Serverless Function) como intermediária, que usa a `SUPABASE_SERVICE_KEY` (service role) para acessar o banco com privilégios totais.

## Arquivos Alterados

### 1. `api/admin-slots.js` — API Serverless

**Auth:** Agora aceita dois métodos de autenticação via header `x-admin-key`:
- `ADMIN_SECRET` (server-side)
- `VITE_ADMIN_PASSWORD` (fallback, mesma senha do login)

**Endpoints disponíveis:**

| Método | Descrição |
|--------|-----------|
| `GET` | Lista todos os slots (ordenado por tipo, nome) |
| `PUT` | Atualiza campos de um slot (id + campos) |
| `POST { action: "liberar", id }` | Libera slot (status → disponivel, limpa login) |
| `POST { action: "criar", slot }` | Cria novo slot |
| `DELETE { id }` | Exclui slot |

**Campos permitidos no PUT:** `webhook_mensagem`, `workflow_url`, `status`, `slot_notas`, `quepasa_base_url`, `tipo`, `login`

---

### 2. `src/pages/Admin.tsx` — Frontend

**Removido:**
- `import { supabase } from '@/integrations/supabase/client'`
- Todas as chamadas diretas a `supabase.from('rapdex_slots').select/update/delete/insert`

**Adicionado:**

- `callApi(method, body?)` — função auxiliar que faz fetch para `/api/admin-slots` enviando a senha do admin como `x-admin-key`
- `senhaRef` (useRef) — guarda a senha após login para evitar stale closures
- `limparLogin(slot)` — nova função que zera o campo `login` para `null` sem alterar status

**Botão "Limpar login":** aparece em cada slot que possui `login` preenchido. Um clique com confirmação → envia `PUT { login: null }` para a API.

**Fluxo de dados:**
```
Admin.tsx → fetch('/api/admin-slots', { headers: { x-admin-key: senha } })
         → api/admin-slots.js → fetch(SUPABASE_URL/rest/v1/rapdex_slots, { headers: { Authorization: Bearer SERVICE_KEY } })
         → Supabase
```

## Variáveis de Ambiente Necessárias (Vercel)

| Variável | Onde é usada |
|----------|-------------|
| `VITE_SUPABASE_URL` | API (fallback hardcoded) |
| `SUPABASE_SERVICE_KEY` | API — chave de serviço do Supabase |
| `ADMIN_SECRET` | API — auth (pode ser igual a VITE_ADMIN_PASSWORD) |
| `VITE_ADMIN_PASSWORD` | Frontend (login) + API (auth fallback) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Outros usos no frontend |

## Redeploy

As alterações no frontend (`Admin.tsx`) são aplicadas em tempo real com `npm run dev`. Para a API (`api/admin-slots.js`) refletir em produção, é necessário dar push no branch `main` — o Vercel faz auto-deploy.
