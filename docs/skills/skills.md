---
title: Documentação — Skills do Claude Code
project: Unishop
version: 0.1
date: 2026-10-13
status: rascunho para revisão da equipe
context: CLAUDE.md
---

# Skills do Claude Code

Skills são pacotes de instruções que o Claude Code carrega sob demanda durante uma conversa. Cada skill é uma pasta em `.claude/skills/<nome>/` com um arquivo `SKILL.md` (ou `SKILL.MD`): um cabeçalho YAML (`name`, `description`, `metadata`) seguido do conteúdo em Markdown com as instruções, regras ou checklist que a skill ensina.

O Claude decide quando invocar uma skill comparando o pedido do usuário com o campo `description` de cada skill disponível — por isso a descrição deve dizer claramente **quando** usar a skill, não só o que ela é. Uma skill pode ser chamada automaticamente (quando o Claude julga relevante) ou explicitamente pelo nome (ex.: `/unishop-frontend`).

Skills não são código executável: são contexto adicional que molda como o Claude trabalha numa tarefa — convenções do projeto, checklists de qualidade, guias de uma biblioteca, etc.

## Onde ficam

```
.claude/skills/
├─ unishop-frontend/            # skill própria do projeto
│  └─ SKILL.MD
├─ vercel-react-best-practices/ # skill externa (Vercel)
│  ├─ SKILL.md
│  ├─ AGENTS.md
│  └─ rules/                    # 70 regras, uma por arquivo .md
└─ web-design-guidelines/       # skill externa (Vercel)
   └─ SKILL.md
```

Todas as skills do projeto ficam só em `.claude/skills/` — cada uma com seu conteúdo real, sem symlink e sem duplicação em outra pasta (como `.agents/`, que era criada por padrão pelo instalador `npx skills add` e foi removida).

## Skills instaladas no projeto

### `unishop-frontend` (própria do projeto)

Resumo operacional das convenções de frontend do Unishop: stack (React, TypeScript, Vite, Tailwind, React Router, TanStack Query, React Hook Form + Zod), estrutura por área (`public`/`user`/`admin`/`shared`), regras de isolamento entre áreas, convenções de código, vocabulário PT↔EN, integração com a API e checklist de qualidade de tela.

Baseada em [`docs/frontend/frontend.md`](../frontend/frontend.md) — em caso de divergência, a doc completa é a fonte de verdade; esta skill é só o resumo prático para o dia a dia.

**Quando usar:** ao criar, editar ou revisar qualquer tela, componente, rota, hook ou serviço em `frontend/`, ou ao discutir estrutura de pastas, estado ou padrões de qualidade do frontend.

### `vercel-react-best-practices` (externa, mantida pela Vercel)

70 regras de performance para React e Next.js, organizadas em 8 categorias por prioridade (eliminar waterfalls de dados, tamanho de bundle, performance no servidor, data fetching no cliente, etc.). Cada regra é um arquivo próprio em `rules/`.

**Quando usar:** ao escrever ou revisar componentes React, páginas, data fetching ou otimização de bundle — em qualquer área do frontend do Unishop.

### `web-design-guidelines` (externa, mantida pela Vercel)

Revisa código de UI contra as *Web Interface Guidelines*. Busca a versão mais atual das diretrizes direto da fonte (via `WebFetch`) antes de cada revisão, então checa os arquivos indicados contra todas as regras e aponta os problemas no formato `arquivo:linha`.

**Quando usar:** ao pedir revisão de UI, auditoria de acessibilidade, ou conferência de uma tela contra boas práticas de interface — ex.: "revise esta tela", "confira a acessibilidade deste componente".

## Como usar

- **Automático:** o Claude invoca a skill sozinho quando o pedido combina com a `description` dela. Não é preciso nomear a skill.
- **Explícito:** peça pelo nome (ex.: "use a skill unishop-frontend para revisar essa página") ou, em harnesses que suportam, via `/nome-da-skill`.
- **Combinadas:** ao trabalhar em componentes React do Unishop, as três podem se complementar — `unishop-frontend` dá o contexto do projeto, `vercel-react-best-practices` cobre performance, `web-design-guidelines` cobre acessibilidade/UX.

## Instalar ou atualizar skills externas

Skills externas (não escritas para o Unishop) foram baixadas com o instalador `skills` (pacote `skills` via `npx`), que clona o repositório de origem e copia o `SKILL.md` da skill escolhida para `.claude/skills/<nome>/`:

```bash
npx skills add <url-do-repositório> --skill <nome-da-skill>
```

O arquivo `skills-lock.json`, na raiz do projeto, registra a origem (`source`), o caminho (`skillPath`) e o hash do conteúdo de cada skill externa instalada — serve para saber de onde veio e detectar se o conteúdo mudou na fonte.

Skills próprias do projeto (como `unishop-frontend`) não entram no `skills-lock.json`: são escritas e versionadas manualmente, junto com o resto do código.
