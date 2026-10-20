---
name: unishop-frontend
description: Regras e fluxo de trabalho do frontend do Unishop (React + TypeScript + Vite + Tailwind). Use SEMPRE que o usuário criar, editar ou revisar telas, rotas, guards, componentes, hooks, services, formulários Zod, áreas (public/user/admin), estados de tela (carregando, vazio, erro, 403, sessão expirada, Pix expirado), fluxos de login, cadastro, pagamento, pedidos e anúncios, upload de imagem ou PR do frontend do Unishop, mesmo que não diga "Unishop" ou "frontend" explicitamente.
metadata:
  author: unishop-team
  version: "0.8.0"
---

# Frontend do Unishop

Guia operacional para trabalhar no frontend do Unishop. Fonte completa e autoritativa: [`docs/frontend/frontend.md`](../../../docs/frontend/frontend.md) (v0.4, de 16/10/2026, alinhada às Regras v0.4, Backend v0.3 e API v0.3). A tabela de rotas e telas está na seção de rotas do doc. Regras de negócio e limites de campos: skill `unishop-rules`. Em caso de dúvida ou conflito, releia esse arquivo — este SKILL.MD é um resumo prático, não substitui a doc.

Ordem de prioridade entre fontes (do `CLAUDE.md` do projeto): PDF do trabalho (RF/RNF) > decisões do grupo > docs em `docs/` > protótipos no Figma. Itens marcados "sugestão" não são definitivos.

## Stack

React + TypeScript, Vite, Tailwind CSS (v4, sem `tailwind.config.ts` — tokens no bloco `@theme` de `src/styles/index.css`), React Router, TanStack Query, React Hook Form + Zod, Vitest/Testing Library/Playwright.

## Estrutura por área

Três áreas, uma por ator, nunca acopladas entre si (`admin/` não importa de `user/` nem `public/`, e vice-versa):

```
src/areas/
├─ public/   # visitante: landing, auth (login, cadastro, recuperação de senha), termos e privacidade
├─ user/     # aluno logado: categories, listings, orders, checkout, profile (editar, trocar senha, completar cadastro)
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
- **Sessão:** JWT de 2 h guardado em memória, com cópia em `sessionStorage`; ao recarregar, restaurado por `GET /auth/me`. Sem refresh token: token vencido (401) volta ao login guardando o destino (RN-ACE-11). Primeiro acesso por Google: todas as rotas privadas levam a `/completar-cadastro` até o aceite dos Termos (`TERMS_NOT_ACCEPTED`).
- Estado do servidor sempre via TanStack Query (uma chave por recurso); nada de store global para isso.
- Estado de tela (modal aberto, aba ativa) fica local ao componente.
- Busca, categoria, preço, ordenação e página vão na query string (estado compartilhável via URL).
- Pagamento: cartão nunca passa pelo backend do Unishop — token gerado pelo SDK do Mercado Pago no navegador (RNF006). WhatsApp só é exibido/renderizado para usuário logado.
- **Variáveis públicas (`VITE_*`, lidas no build):** `VITE_API_URL` (em produção, o endereço completo da API, que fica em outro domínio da Vercel), `VITE_MP_PUBLIC_KEY`, `VITE_GOOGLE_CLIENT_ID` e `VITE_TURNSTILE_SITE_KEY` (depois do MVP). Nenhuma recebe segredo. Trocar uma exige novo deploy do site.
- **Imagens:** o `ImageUploader` envia **uma imagem por requisição, até 4 MB**, de 1 a 5 por anúncio (limite da Vercel; desvio do PDF confirmado pelo grupo em 16/10/2026). Anúncio: a primeira em `POST /listings`, as demais em `POST /listings/:id/images` (remover: `DELETE /listings/:id/images/:imageId`, sempre sobrando 1), com progresso e nova tentativa se uma falhar. Confira o tamanho antes e trate o 413 como `FILE_TOO_LARGE`. Se o enunciado exigir 5 MB, o frontend comprime antes de enviar.
- **Demonstração:** a tela de pagamento e o rodapé avisam que o ambiente é de demonstração e que nenhum valor é cobrado de verdade (RN-PAG-15).
- **Pedidos:** "Cancelar pedido" só em Pendente e Em negociação; "Confirmar recebimento" em Retirada combinada; vendedor tem "Combinar retirada", "Concluir venda" e "Encerrar negociação". Pix expirado não gera novo código: o pedido vira Cancelado e o aluno faz outro (RN-PAG-04).
- `frontend/vercel.json` faz as rotas do React Router abrirem o `index.html` (F5 em `/categorias` não pode dar 404). Segredos e domínios: `unishop-deploy` e `unishop-api`.

## Estados obrigatórios em toda tela que busca dados

Carregando (skeleton), vazio, erro de rede/servidor (com "Tentar de novo", sem detalhe técnico; inclui 502), sem permissão (403 → "Acesso negado"), não encontrado (404), sessão expirada (volta ao login guardando destino), conta suspensa, e-mail não confirmado (só com a chave ligada), limite de requisições (429), arquivo grande (413), Pix expirado (pedido cancelado), pagamento recusado, sem estoque (inclusive o aviso de que o item acabou após o pagamento, com estorno) e ação bloqueada por pedido em aberto (`HAS_OPEN_PAID_ORDERS`, `HAS_OPEN_ORDERS`, `ADMIN_PROTECTED`). A lista de códigos de erro e o que mostrar em cada um está no doc de frontend.

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
| Ideação de tela nova: movimento, detalhes de acabamento, celular, casos extremos | `emil-design-eng`, `find-animation-opportunities`, `mobile-native`, `break-ui` (só a lista) |
| Animação nova (curva, duração, propriedades) | `animate` |
| Revisão da tela antes do PR: movimento e dados extremos | `review-animations`, `animation-performance`, `break-ui` (remover o alternador antes do PR) |
| Telas que dependem de rota/campo da API | `unishop-backend` (contrato e regras do servidor) |
| Qual é a regra, o limite de campo ou o texto por lado (comprador/vendedor) | `unishop-rules` |
| SDK do Mercado Pago ou do Google, chaves públicas, CSP, upload | `unishop-api` |
| Build, variáveis por ambiente, `vercel.json`, preview e produção | `unishop-deploy` |

Atenção: o frontend é uma SPA Vite, não Next.js. Em `vercel-react-best-practices`, aplique as regras `async-`, `bundle-`, `client-`, `rerender-`, `rendering-` e `js-`; ignore as `server-*` e o que for específico de Next.js/SSR (hidratação, Server Components, Server Actions).

Toda tela nova segue o roteiro de ideação, implementação e revisão da seção 8 de [`docs/skills/skills.md`](../../../docs/skills/skills.md); as skills de acabamento só sugerem e não mudam regra, stack nem rota. Mais contexto sobre as skills do projeto e como usá-las: [`docs/skills/skills.md`](../../../docs/skills/skills.md).
