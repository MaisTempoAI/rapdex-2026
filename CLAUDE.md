# RAPDEX — Referência para Claude Code

## Git

- **Repositório:** https://github.com/MaisTempoAI/rapdex-2026.git
- **Branch principal:** `main`
- **Remote:** `origin`

### Git não está no PATH padrão do PowerShell nesta máquina.
Sempre adicionar ao PATH antes de usar:
```powershell
$env:PATH += ";C:\Program Files\Git\cmd"
```

Exemplo de push completo:
```powershell
$env:PATH += ";C:\Program Files\Git\cmd"
cd "c:\CLAUDE-CODE-RAPDEX2026\rapdex-main"
git add -A
git commit -m "mensagem"
git push origin main
```

O Vercel está conectado ao GitHub — push no `main` dispara deploy automático em **rapdex-2026.vercel.app**.

---

## Supabase

- **Project ID:** `rudtxgwzqrsvrdniqvav`
- **URL:** `https://rudtxgwzqrsvrdniqvav.supabase.co`
- **Anon key:** no arquivo `.env` como `VITE_SUPABASE_PUBLISHABLE_KEY` (No Vercel também deve ter exatamente este nome)
- **Regra:** frontend só chama RPCs (SECURITY DEFINER), nunca tabelas direto

## Stack

- React 18 + Vite + TypeScript + Tailwind + shadcn/ui
- Supabase (banco + storage)
- **Vercel** (frontend + Serverless Functions na pasta `/api`)
- N8N (automações: cadastro, bot WhatsApp)
- QUEPASA (API WhatsApp)
