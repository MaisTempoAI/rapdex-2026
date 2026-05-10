# Consulta de Conversas — RPC Supabase

## Arquivo SQL
`supabase/migrations/20260509_rpc_consulta_conversas.sql`

## RPC
`public.consulta_conversas(p_periodo, p_login, p_data_inicio, p_data_fim)`

## Parâmetros

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `p_periodo` | text | `'hoje'` | `'hoje'` / `'semana'` / `'mes'` / `'personalizado'` |
| `p_login` | text | NULL | Filtra por conta específica. NULL = todas as contas ativas |
| `p_data_inicio` | timestamptz | NULL | Só usado quando `p_periodo = 'personalizado'` |
| `p_data_fim` | timestamptz | NULL | Só usado quando `p_periodo = 'personalizado'` |

## Retorno

```json
{
  "periodo": "hoje",
  "inicio": "2026-05-09T00:00:00-03:00",
  "fim":    "2026-05-10T00:00:00-03:00",
  "resumo": [
    {
      "login": "11999990000",
      "nome_empresa": "Academia FitLife",
      "total_conversas": 42,
      "clientes_unicos": 15,
      "mensagens_recebidas": 38,
      "primeira_mensagem": "2026-05-09T08:12:00Z",
      "ultima_mensagem":   "2026-05-09T17:55:00Z"
    }
  ],
  "conversas": [
    {
      "id": 123,
      "created_at": "2026-05-09T08:12:00Z",
      "login": "11999990000",
      "nome_empresa": "Academia FitLife",
      "whatsapp_cli": "11988881111",
      "mensagem": "Qual o horário?",
      "resposta": "Das 6h às 22h.",
      "de_mim": false
    }
  ]
}
```

## Ordenação das conversas

```sql
ORDER BY c.login, c.whatsapp_cli, c.created_at ASC
```

Agrupa por conta → por número do cliente → cronológico dentro de cada conversa. Pronto para renderizar histórico de chat no dashboard.

## Exemplos de uso (JS)

```js
// Hoje — todas as contas
supabase.rpc('consulta_conversas', { p_periodo: 'hoje' })

// Semana — conta específica
supabase.rpc('consulta_conversas', { p_periodo: 'semana', p_login: '11999990000' })

// Mês
supabase.rpc('consulta_conversas', { p_periodo: 'mes' })

// Personalizado
supabase.rpc('consulta_conversas', {
  p_periodo: 'personalizado',
  p_data_inicio: '2026-05-01T00:00:00-03:00',
  p_data_fim:    '2026-05-09T23:59:59-03:00'
})
```

## Tabelas envolvidas

| Tabela | Join | Filtro |
|--------|------|--------|
| `rapdex_conversations` | base | `created_at` no período |
| `rapdex_accounts` | `login = login` | `conta_ativa = true` |

## Limite
Retorna no máximo **200 linhas** em `conversas`. Para dashboards com volume maior, adicionar paginação (`OFFSET`) ou um filtro de `p_login` obrigatório.
