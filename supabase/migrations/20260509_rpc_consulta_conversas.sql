-- ============================================================
-- RPC: consulta_conversas
-- Dashboard de conversas por período
--
-- Parâmetros:
--   p_periodo   : 'hoje' | 'semana' | 'mes' | 'personalizado'
--   p_login     : login específico ou NULL para todas as contas ativas
--   p_data_inicio : só usado quando p_periodo = 'personalizado'
--   p_data_fim    : só usado quando p_periodo = 'personalizado'
--
-- Retorna:
--   resumo: totais + por conta
--   conversas: linhas brutas para listagem
-- ============================================================

CREATE OR REPLACE FUNCTION public.consulta_conversas(
  p_periodo     text    DEFAULT 'hoje',
  p_login       text    DEFAULT NULL,
  p_data_inicio timestamptz DEFAULT NULL,
  p_data_fim    timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inicio timestamptz;
  v_fim    timestamptz;
  v_resumo json;
  v_linhas json;
BEGIN
  -- Define o intervalo de datas
  CASE p_periodo
    WHEN 'hoje' THEN
      v_inicio := date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
      v_fim    := v_inicio + INTERVAL '1 day';
    WHEN 'semana' THEN
      v_inicio := NOW() - INTERVAL '7 days';
      v_fim    := NOW();
    WHEN 'mes' THEN
      v_inicio := NOW() - INTERVAL '30 days';
      v_fim    := NOW();
    WHEN 'personalizado' THEN
      v_inicio := COALESCE(p_data_inicio, NOW() - INTERVAL '7 days');
      v_fim    := COALESCE(p_data_fim,    NOW());
    ELSE
      v_inicio := date_trunc('day', NOW());
      v_fim    := NOW();
  END CASE;

  -- Resumo agregado por conta
  SELECT json_agg(r) INTO v_resumo FROM (
    SELECT
      c.login,
      a.nome_empresa,
      COUNT(*)                                          AS total_conversas,
      COUNT(DISTINCT c.whatsapp_cli)                   AS clientes_unicos,
      COUNT(*) FILTER (WHERE c.de_mim = false)         AS mensagens_recebidas,
      MIN(c.created_at)                                AS primeira_mensagem,
      MAX(c.created_at)                                AS ultima_mensagem
    FROM rapdex_conversations c
    JOIN rapdex_accounts a ON a.login = c.login AND a.conta_ativa = true
    WHERE
      c.created_at >= v_inicio AND c.created_at < v_fim
      AND (p_login IS NULL OR c.login = p_login)
    GROUP BY c.login, a.nome_empresa
    ORDER BY total_conversas DESC
  ) r;

  -- Linhas brutas (últimas 200 por padrão)
  SELECT json_agg(l) INTO v_linhas FROM (
    SELECT
      c.id,
      c.created_at,
      c.login,
      a.nome_empresa,
      c.whatsapp_cli,
      c.mensagem,
      c.resposta,
      c.de_mim
    FROM rapdex_conversations c
    JOIN rapdex_accounts a ON a.login = c.login AND a.conta_ativa = true
    WHERE
      c.created_at >= v_inicio AND c.created_at < v_fim
      AND (p_login IS NULL OR c.login = p_login)
    ORDER BY c.login, c.whatsapp_cli, c.created_at ASC
    LIMIT 200
  ) l;

  RETURN json_build_object(
    'periodo',     p_periodo,
    'inicio',      v_inicio,
    'fim',         v_fim,
    'resumo',      COALESCE(v_resumo, '[]'::json),
    'conversas',   COALESCE(v_linhas, '[]'::json)
  );
END;
$$;


-- ============================================================
-- Exemplos de uso (rode no SQL Editor para testar):
-- ============================================================

-- Todas as contas ativas — hoje
-- SELECT consulta_conversas('hoje');

-- Semana completa
-- SELECT consulta_conversas('semana');

-- Mês
-- SELECT consulta_conversas('mes');

-- Conta específica — hoje
-- SELECT consulta_conversas('hoje', '11999990000');

-- Período personalizado
-- SELECT consulta_conversas('personalizado', NULL, '2026-05-01', '2026-05-09');
