# Migração do Netlify para o Vercel

**Data:** Maio de 2026
**Status:** Concluído com Sucesso ✅

## Motivo da Migração
O projeto RAPDEX originalmente rodava no Netlify, mas os limites de créditos ("Production deploys have been paused due to exceeded credit limits") forçaram a migração para a plataforma **Vercel**, de forma a manter o sistema de onboarding operando sem bloqueios.

## URL Atual (Deploy de Sucesso)
* **Base:** `https://rapdex-2026.vercel.app/`
* **Preview Específico:** `https://rapdex-2026-315okgt78-aquelerobointeligente86-4170s-projects.vercel.app/novo`

## Dificuldades Encontradas e Soluções (Memória do Projeto)

Durante a migração, enfrentamos dois problemas bloqueadores que serviram de grande aprendizado para arquitetura Vite + Vercel:

### 1. Erro 500 nas Serverless Functions (`FUNCTION_INVOCATION_FAILED`)
* **O Problema:** Movemos as funções da pasta `netlify/functions` para a pasta `api` do Vercel. Inicialmente, utilizamos a sintaxe CommonJS (`module.exports` e `require`). O Vercel imediatamente retornou erro 500.
* **A Causa:** O arquivo `package.json` raiz do projeto possui a configuração `"type": "module"`. O Vercel herda isso para a pasta `/api`, exigindo que as funções serverless sejam escritas no padrão ECMAScript Modules (ESM).
* **A Solução:** Convertemos todos os arquivos em `/api` (ex: `cadastro.js`, `qr-code.js`, `_lib/pushover.js`) para usar `export default async function handler(req, res)` e `import` nativo, lembrando sempre de incluir a extensão `.js` nos imports relativos.

### 2. Tela Branca no Frontend (Crash Silencioso)
* **O Problema:** Apesar do build de CSS e JS no Vercel (com Vite) exibir "sucesso" em cerca de 4 segundos, a tela ficava totalmente branca sem mostrar erros visíveis.
* **A Causa:** A inicialização do cliente Supabase no arquivo `src/integrations/supabase/client.ts` estava configurada para falhar sincronamente (crashing o app no boot) se faltassem as chaves de ambiente. O erro exato capturado no Console do navegador foi: `Uncaught Error: supabaseKey is required`.
* **A Confusão da Chave:** Durante o troubleshooting, adicionamos erroneamente a variável com o nome `VITE_SUPABASE_ANON_KEY` no painel do Vercel. Porém, o código gerado pelo Lovable exigia especificamente o nome **`VITE_SUPABASE_PUBLISHABLE_KEY`**.
* **A Solução:** Após renomear a variável no painel do Vercel e realizar um **Redeploy** manual (necessário para que o Vite incorpore as variáveis no bundle final), a aplicação inicializou corretamente, exibindo o site.

## Variáveis de Ambiente Configuradas
As variáveis cruciais que fazem o sistema rodar na Vercel (Production e Preview) são:

**Supabase (Vite injeta no Frontend):**
* `VITE_SUPABASE_URL`
* `VITE_SUPABASE_PUBLISHABLE_KEY`

**API e Integrações (Seguro no Backend):**
* `N8N_BASE_URL`
* `QUEPASA_CONNECT_WEBHOOK_URL`
* `PUSHOVER_TOKEN`
* `PUSHOVER_USER`
* `ADMIN_SECRET`
* `SUPABASE_SERVICE_KEY`

> *Fica o registro para mantermos o padrão em futuras manutenções e deployments. A estrutura atual em Vercel provou ser extremamente rápida e as funções /api estão operando conforme o esperado.*
