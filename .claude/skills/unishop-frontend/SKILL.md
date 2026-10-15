---
name: unishop-frontend
description: Regras e fluxo de trabalho do frontend do Unishop (React + TypeScript + Vite + Tailwind). Use SEMPRE que o usuário criar, editar ou revisar telas, rotas, guards, componentes, hooks, services, formulários Zod, áreas (public/user/admin), estados de tela ou PR do frontend do Unishop, mesmo que não diga "Unishop" ou "frontend" explicitamente.
metadata:
  author: unishop-team
  version: "0.5.0"
---

# Frontend do Unishop

Guia operacional para trabalhar no frontend do Unishop. Fonte completa e autoritativa: [`docs/frontend/frontend.md`](../../../docs/frontend/frontend.md). Em caso de dúvida ou conflito, releia esse arquivo — este SKILL.MD é um resumo prático, não substitui a doc.

Ordem de prioridade entre fontes (do `CLAUDE.md` do projeto): PDF do trabalho (RF/RNF) > decisões do grupo > docs em `docs/` > protótipos no Figma. Itens marcados "sugestão" não são definitivos.

## Stack

React + TypeScript, Vite, Tailwind CSS (v4, sem `tailwind.config.ts` — tokens no bloco `@theme` de `src/styles/index.css`), React Router, TanStack Query, React Hook Form + Zod, Vitest/Testing Library/Playwright.

## Estrutura por área

Três áreas, uma por ator, nunca acopladas entre si (`admin/` não importa de `user/` nem `public/`, e vice-versa):

```
src/areas/
├─ public/   # visitante: landing, auth (login, cadastro, recuperação)
├─ user/     # aluno logado: categories, listings, orders, checkout, profile
└─ admin/    # administrador: users, products
src/shared/  # components/ui, hooks, lib (api.ts, queryClient), utils, constants, types
```

Dentro de cada funcionalidade (`listings/`, `users/` etc.): `pages/`, `components/`, `hooks/`, `services/`, `schemas/` (Zod), `types/`.

Regras de isolamento:
- O que é dividido pelas áreas sobe para `shared/`.
- Cada `routes.tsx` de área é carregado com `React.lazy`.
- Cada área tem um guard: `GuestRoute` (público), `PrivateRoute` (aluno), `AdminRoute` (admin).
- Lint com `no-restricted-imports` bloqueia import entre áreas — é regra de máquina, não de memória.
- **O guard de rota no frontend é só UX.** A barreira de segurança real é o backend (`authorizeRole`), que nega a requisição mesmo com URL forçada (RNF004). Nunca confie em validação de papel só no cliente.

## Convenções de código

- Componentes em PascalCase; hooks começam com `use`; arquivos em kebab-case.
- TypeScript estrito; sem `any` sem comentário justificando.
- Tipos de requisição/resposta vêm do `openapi.yaml`, nunca escritos à mão.
- Fluxo de dados: componente → hook → `services/` (componente nunca chama a API direto).
- Esquemas Zod em `schemas/`, espelhando as regras do backend — mas o erro final sempre vem do backend, nunca só da validação do cliente.
- PR só entra com lint e testes verdes e revisão de outro membro.

## Idioma e vocabulário

Código, pastas e arquivos em inglês. Interface e documentação em português do Brasil (RNF014).

| Domínio (PT) | Código (EN) |
|---|---|
| Usuário | `user` |
| Anúncio / Produto | `listing` |
| Categoria | `category` |
| Pedido | `order` |
| Pagamento | `payment` |
| Notificação | `notification` |
| Administrador | `admin` |

## Integração com a API

- Prefixo `/api/v1`, autenticação `Authorization: Bearer <jwt>`, paginação `?page=&limit=`.
- `api.ts` (em `shared/lib`) aplica o token; se a API responder 401, encerra a sessão e leva ao login.
- Estado do servidor sempre via TanStack Query (uma chave por recurso); nada de store global para isso.
- Estado de tela (modal aberto, aba ativa) fica local ao componente.
- Busca, categoria, preço, ordenação e página vão na query string (estado compartilhável via URL).
- Pagamento: cartão nunca passa pelo backend do Unishop — token gerado pelo SDK do gateway no navegador (RNF006). WhatsApp só é exibido/renderizado para usuário logado.

## Estados obrigatórios em toda tela que busca dados

Carregando (skeleton), vazio, erro de rede/servidor (com "Tentar de novo", sem detalhe técnico), sem permissão (403 → "Acesso negado"), não encontrado (404), sessão expirada (volta ao login guardando destino), Pix expirado, pagamento recusado, sem estoque.

## Qualidade — checklist antes de considerar uma tela pronta

1. Fiel ao Figma, usando os tokens do tema (não valores soltos).
2. Trata todos os estados da seção acima.
3. Funciona por teclado, com rótulos e contraste verificados (meta WCAG 2.1 AA).
4. Integrada à API real, sem erros no console.
5. Tem teste de componente; fluxo crítico tem teste de fluxo completo (Playwright).
6. PR revisado e verde.

Regras de segurança a nunca violar no frontend: nunca usar `dangerouslySetInnerHTML` com texto de usuário (título/descrição do anúncio) — risco de XSS; nenhum segredo no código, só variáveis `VITE_*` públicas; links externos com `rel="noopener noreferrer"`; ações irreversíveis sempre pedem confirmação em modal.

## Ao implementar algo

Sempre citar os códigos de origem: `RF`/`RNF` (requisitos do PDF) e `RN-XXX-nn` (regras de negócio em `docs/regras-de-negócio/regras-de-negócio.md`). Se uma informação não estiver documentada em `docs/frontend/frontend.md`, `docs/regras-de-negócio/`, no PDF do trabalho ou nas decisões do grupo registradas no `CLAUDE.md`, diga que não está definida — não invente rota, campo ou comportamento.

## Skills que complementam esta

Esta skill dá o contexto do Unishop; as outras cobrem a técnica geral. Use em conjunto:

| Situação | Skill |
|---|---|
| Performance de React: waterfalls, bundle, re-renders, listas, lazy loading | `vercel-react-best-practices` |
| Projetar `shared/components/ui` (Button, Modal, Table...), muitas props booleanas, compound components, contexto | `vercel-composition-patterns` |
| Revisar UI, acessibilidade (WCAG 2.1 AA), foco, contraste, formulários | `web-design-guidelines` |
| Testar no navegador, capturar screenshot/console, fluxos Playwright | `webapp-testing` |
| Telas que dependem de rota/campo da API | `unishop-backend` (contrato e regras do servidor) |

Atenção: o frontend é uma SPA Vite, não Next.js. Em `vercel-react-best-practices`, aplique as regras `async-`, `bundle-`, `client-`, `rerender-`, `rendering-` e `js-`; ignore as `server-*` e o que for específico de Next.js/SSR (hidratação, Server Components, Server Actions).

Mais contexto sobre as skills do projeto e como usá-las: [`docs/skills/skills.md`](../../../docs/skills/skills.md).
