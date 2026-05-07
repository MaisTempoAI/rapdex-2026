## Tela de Perguntas e Configurações — melhorias

### 1. Botão "Salvar Configurações" fixo na tela

- Transformar o botão de salvar (atualmente no fim da tela `Perguntas e Configurações` em `src/components/Dashboard.tsx`, linhas ~1965-1981) em uma **barra fixa inferior (sticky bottom bar)**.
- Implementação: wrapper `fixed bottom-0 left-0 right-0 z-40` com fundo (`bg-background/95 backdrop-blur`), borda superior e padding seguro para mobile.
- Conterá:
  - Botão **Salvar Configurações** (mantém estilo gradient).
  - Novo botão **Exportar Perguntas e Respostas** (variante outline, ícone `Download`).
- Adicionar `padding-bottom` extra ao `<main>` para o conteúdo não ficar escondido atrás da barra.
- O botão duplicado de salvar que existe no meio (linhas ~1596-1611) será removido para evitar redundância. O botão "Alterar Senha de Acesso" continua no fluxo normal da página.

### 2. Botão "Exportar Perguntas e Respostas"

- Gera um arquivo `.txt` no navegador (Blob + download) — sem chamada externa.
- Nome do arquivo: `perguntas-respostas-{login}-{YYYY-MM-DD}.txt`.
- Conteúdo, percorrendo as 50 FAQs e incluindo apenas as que tiverem `question` ou `response` preenchido:

```text
RAPDEX - Perguntas e Respostas
Cliente: {login}
Data: {dd/mm/aaaa hh:mm}

========================================

Pergunta 1:
{texto da pergunta}

Resposta 1:
{texto da resposta}

Mídia: Imagem 1, Imagem 2, Imagem 3
(ou "Mídia: Áudio" / "Mídia: Catálogo PDF" / linha omitida se não houver)

----------------------------------------

Pergunta 2:
...
```

- **Regras de mídia (sem URLs):**
  - Campo `url` é dividido por `;`.
  - Se as URLs forem imagens (`.jpg`/`.jpeg`) → listar como `Imagem 1`, `Imagem 2`, `Imagem 3` conforme a quantidade.
  - Se for `.ogg`/`.webm` → `Áudio`.
  - Se for `.pdf` → `Catálogo PDF`.
  - Se vazio → não imprime a linha "Mídia".
- Toast de sucesso após o download.

### Arquivos alterados

- `src/components/Dashboard.tsx` — barra fixa inferior, novo handler `handleExportFAQs`, remoção do botão de salvar duplicado, padding extra no `<main>` da tela de perguntas.
