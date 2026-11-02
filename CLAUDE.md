# CLAUDE.md

Contexto para o Claude Code trabalhar no projeto **Unishop**, e-commerce web para alunos da Unifor (trabalho da disciplina Desenvolvimento de Plataformas Web, T242-12).

## Leia primeiro

Conjunto de documentos alinhado em 16/10/2026 e **revisado contra o código em 01/11/2026** (versões novas indicadas abaixo). Precedência entre eles: PDF, Regras de Negócio, Banco de Dados, Backend e Frontend, API e Deploy (quando dois discordam, corrige-se o de menor precedência).

- [`docs/regras-de-negócio/regras-de-negócio.md`](docs/regras-de-negócio/regras-de-negócio.md) (v0.4.2) — regras RN-XXX-nn, estados, permissões, escopo do MVP (§8), limites de campos e itens proibidos (§9), desvios do PDF (§10) e cenários de teste.
- [`docs/BancoDeDados/bd.md`](docs/BancoDeDados/bd.md) (v0.2.3) — as 8 tabelas no estado final, dicionário de dados, valores fixos dos estados, mapeamento banco × backend, consultas críticas, anonimização (LGPD), migração pelo Prisma, papéis do banco e SQL da migração manual.
- [`docs/backend/backend.md`](docs/backend/backend.md) (v0.3.1) — arquitetura em camadas, autenticação, módulos e rotas (§9), pagamentos, estados, jobs, erros, segurança e mapa das regras RN no backend.
- [`docs/frontend/frontend.md`](docs/frontend/frontend.md) (v0.4.1) — estrutura, rotas, componentes, estado, sessão e padrões de qualidade do frontend.
- [`docs/api/api.md`](docs/api/api.md) (v0.3.1) — APIs externas (Google, Mercado Pago, Resend, Cloudinary, Turnstile e outras), arquitetura de segurança "backend-cofre", providers, travas de produção, variáveis, resiliência, custos e ADRs 001 a 009. O contrato da API própria (`openapi.yaml`) ainda não existe.
- [`docs/deploy/deploy.md`](docs/deploy/deploy.md) (v0.3.2) — deploy em produção (Vercel + Supabase): ambientes, segredos, CORS, jobs agendados, backup, atualização e reversão.
- [`docs/backend/roteiro-backend.md`](docs/backend/roteiro-backend.md) (v0.7.1, aprovado) — as 12 etapas do backend, o que já está pronto e a integração com o frontend, etapa por etapa.
- [`docs/frontend/roteiro-telas.md`](docs/frontend/roteiro-telas.md) (v0.2) — ordem das telas, ciclo de cada tela e fichas.
- [`docs/skills/skills.md`](docs/skills/skills.md) — skills do Claude Code instaladas no projeto e como usá-las.
- `Trabalho Desenvolvimento Web 2026.pdf` — requisitos funcionais (RF001–RF024) e não-funcionais (RNF001–RNF016) originais do trabalho.

> Os documentos citam os caminhos `docs/regras-de-negocio/` e `docs/banco-de-dados/banco-de-dados.md` (sem acento). No repositório as pastas ainda são `docs/regras-de-negócio/` e `docs/BancoDeDados/bd.md`; os links acima usam os caminhos reais. O `docs/README.md` (índice) que os documentos mencionam ainda não existe.

## Skills do projeto: quando usar

As skills ficam em `.claude/skills/` (detalhes e análise de cobertura em [`docs/skills/skills.md`](docs/skills/skills.md)). Acione a skill certa pelo contexto da tarefa; mais de uma pode valer ao mesmo tempo.

| Contexto da tarefa | Skill |
|---|---|
| Telas, rotas, guards, componentes, hooks, services, formulários, estados de tela do frontend | `unishop-frontend` |
| Rotas, controllers, services, repositories, middlewares, providers, jobs, autenticação, pagamentos, estoque, pedidos, admin, erros da API | `unishop-backend` |
| Tabelas, colunas, `schema.prisma`, `@map`, migração (`0_init` + manual), seed, papéis `unishop_*`, estoque atômico, liquidação, anonimização, consulta SQL do projeto | `unishop-database` |
| Dúvida de regra ("pode ou não pode"), código `RN-XXX-nn`, escopo do MVP, limites de campos, itens proibidos, desvios do PDF, critério de aceite, conflito entre documentos | `unishop-rules` |
| Integrar ou revisar serviços externos (Google, Mercado Pago, Resend, Cloudinary, Turnstile), segredos, variáveis, `env.ts`, travas de produção, webhook assinado, ADRs | `unishop-api` |
| Deploy na Vercel + Supabase: variáveis por ambiente, `APP_ENV`, `vercel.json`, jobs por endpoint, `waitUntil`, cron, domínio, backup, rollback, limites do Hobby | `unishop-deploy` |
| Operar o Vercel CLI com token (`vercel env`, `vercel logs`, deploy pelo CLI), sempre sob as regras da `unishop-deploy` | `vercel-cli-with-tokens` |
| Detalhes da API do Resend, entregabilidade, SPF/DKIM/DMARC, e-mail transacional | `resend`, `email-best-practices` |
| Performance de React: waterfalls, bundle, re-renders, lazy loading (SPA Vite: ignorar regras `server-*` e de Next.js) | `vercel-react-best-practices` |
| Projetar `shared/components/ui`, compound components, contexto, excesso de props booleanas | `vercel-composition-patterns` |
| Revisar UI, acessibilidade (WCAG 2.1 AA), formulários, foco e contraste | `web-design-guidelines` |
| Acabamento e UX das telas: polimento, animação, tela com dados extremos, comportamento no celular (sugestão de estilo; não muda regra nem stack) | `emil-design-eng`, `animate`, `animation-performance`, `review-animations`, `find-animation-opportunities`, `break-ui`, `mobile-native` |
| Schema, migração, índice, transação, lock, consulta lenta, concorrência de estoque no PostgreSQL; conexão pooler × direta no Supabase (sem usar Auth, Storage nem Realtime; RLS ligada, com política só para `unishop_app` e `unishop_backup`) | `supabase-postgres-best-practices` |
| Rodar a aplicação local no navegador, screenshots, console, fluxos Playwright | `webapp-testing` |
| Criar, testar ou melhorar skills do projeto | `skill-creator` |
| Mapear o projeto em grafo de conhecimento (só se o usuário pedir `/graphify`) | `graphify` |

Fluxo sugerido por momento do trabalho (quando o código existir):

| Momento | O que fazer |
|---|---|
| Entender o que construir | `unishop-rules`: escopo do MVP (§8), limites de campos (§9) e desvios do PDF (§10) antes de estimar ou criar tarefa |
| Antes de codar | Ler a regra em `docs/` (via `unishop-rules`) e acionar `unishop-frontend` e/ou `unishop-backend` |
| Banco | `unishop-database` (lê `docs/BancoDeDados/bd.md`); `supabase-postgres-best-practices` ao definir schema, migração e concorrência de estoque ; conexões (pooler × direta) e RLS no Supabase (ver Decisões do grupo). Gere o `schema.prisma` e a migração `0_init`, depois a migração manual, e teste em banco vazio |
| Contrato da API | `unishop-backend` + `unishop-api`; escrever o `openapi.yaml` antes de o frontend consumir as rotas |
| Regras do servidor | `unishop-backend` junto de `unishop-rules` e `unishop-database`; cada rota cita `RN-XXX-nn` |
| Integração com serviço externo | `unishop-api` (e `resend` / `email-best-practices` no e-mail); `/security-review` em mudança de pagamento, webhook ou segredo |
| Publicar ou configurar produção | `unishop-deploy`; só executar deploy, troca de variável ou restauração de banco se o usuário pedir, confirmando o alvo (preview ou produção) |
| Ideação de cada tela nova (antes de codar, com nota curta das decisões) | `unishop-rules`, `unishop-frontend`, `vercel-composition-patterns`, `emil-design-eng`, `find-animation-opportunities`, `mobile-native`, `break-ui` (só a lista de casos extremos); roteiro em `docs/skills/skills.md` §8.1 |
| Ao escrever tela ou componente | `unishop-frontend` + `vercel-composition-patterns` (componentes de `shared/components/ui`); `animate` para movimento |
| Depois de escrever a tela (revisão) | `web-design-guidelines` (acessibilidade e UX), `vercel-react-best-practices` (performance), `review-animations`, `break-ui` (remover o alternador antes do PR); roteiro em `docs/skills/skills.md` §8.3 |
| Verificar rodando | `webapp-testing` (screenshots, console, fluxo) |
| Antes do PR | `/code-review` e, em mudança sensível (auth, pagamento, admin), `/security-review` |
| Documentação mudou | Revisar a skill `unishop-*` correspondente |

O backend (a maior parte das etapas 1 a 5 do roteiro) e o frontend (todas as telas, sobre dados de exemplo) já existem: as skills `unishop-*` valem para revisar documentos **e** para escrever código. A fonte de verdade continua sendo `docs/`.

Regras de uso:

- `web-design-guidelines` busca as regras online: precisa de internet.
- `webapp-testing` precisa de Python e dos servidores de front e back rodando; o `scripts/with_server.py` executa via shell os comandos de servidor informados (risco médio), então confira o comando antes de rodar.
- As skills `unishop-*` são resumos; a fonte de verdade são os documentos em `docs/`. Em conflito, vale o documento (e, acima dele, o PDF e as decisões do grupo).
- Tarefa que cruza front e back (ex.: fluxo de pagamento): use `unishop-frontend` e `unishop-backend` juntas.
- Mudou um documento técnico, uma rota ou uma decisão? Revise a skill `unishop-*` correspondente. As skills `unishop-*` foram revisadas em 16/10/2026 contra o conjunto de documentos dessa data (4 MB, Google no MVP, jobs de 30 em 30 minutos, banco v0.2, estados em português) e cada uma tem o campo `version` e casos de teste em `evals/evals.json`. Mudou a versão de um documento? Revise a skill, atualize o `version` dela e os casos de `evals/`.
- Skill nova ou removida: atualize esta tabela, `docs/skills/skills.md` e o `skills-lock.json` (só para skills externas).
- Uma pasta só para skills: `.claude/skills/<nome>/SKILL.md`. Não manter `.agents/` nem symlinks.
- Ainda sem skill própria: o contrato `openapi.yaml`, que ainda não existe (quando existir, acrescentá-lo às skills de backend, frontend e API). Cobertura por documento: regras (`docs/regras-de-negócio/`) → `unishop-rules`; banco (`docs/BancoDeDados/`) → `unishop-database`; API externa e segurança (`docs/api/`) → `unishop-api`; deploy (`docs/deploy/`) → `unishop-deploy`. Testes e manutenção da documentação foram avaliados e não ganharam skill (ver `docs/skills/skills.md`, seção 4).
- Skill externa nova: instale só de fonte oficial, **leia o `SKILL.md` e os scripts antes de manter** (skills rodam com as permissões do usuário) e registre no `skills-lock.json`. O instalador (`npx skills add`) cria `.agents/` e links simbólicos: copie o conteúdo real para `.claude/skills/<nome>/` e apague `.agents/` e os links. A `deploy-to-vercel` foi instalada, revisada e removida (o plano B dela envia o projeto a um endpoint sem login).
- As seis skills `unishop-*` (`frontend`, `backend`, `api`, `deploy`, `database`, `rules`) ficam em `.claude/skills/` com casos de teste em `evals/evals.json`; ainda não foram executados. A `skill-creator` precisa de Python para as avaliações e o visualizador, e o Python 3.14 já está instalado (02/11/2026): rodá-los é o próximo passo para otimizar as descrições.

## Ordem de prioridade entre fontes

Quando houver conflito, vale nesta ordem:

1. PDF do trabalho (requisitos RF/RNF, divisão de responsabilidades)
2. Decisões do grupo (ver seção "Decisões do grupo" abaixo)
3. Documentos técnicos em `docs/`: Regras de Negócio, Banco de Dados, Backend e Frontend, API e Deploy
4. Protótipos no Figma

Os desvios do PDF aceitos pelo grupo estão listados em `docs/regras-de-negócio/regras-de-negócio.md`, seção 10 (imagem de 4 MB, produção com credenciais de teste, exclusão lógica e anonimização, Apple fora, confirmação de e-mail fora do MVP, metas de 500 usuários e 99% como metas de produto). O que não está nessa lista segue o PDF.

Itens marcados como "sugestão" nesta ou em outras docs **não** foram decididos pelo grupo — não tratar como definitivo.

## Fluxo de trabalho com o gestor

Combinado com Francisco em 20/10/2026:

- **Ao concluir cada tarefa:** (1) revisar o código feito; (2) rodar uma bateria de testes (lint, tipos, build e testes unitários, de componente e de fluxo) e relatar o resultado, inclusive o que não foi testado; (3) indicar o que estudar no [Roadmap de Estudo Unishop](https://claude.ai/artifact/8ZMbqd3vKb2QLVbsADSjeN), citando os módulos (ex.: B3, E2) e por que cada um serve àquela tarefa. O roadmap é do gestor: apenas ler, não editar.
- **Ordem do desenvolvimento (atualizada em 01/11/2026):** as telas do frontend foram feitas primeiro, seguindo o Figma e com dados de exemplo. Agora frontend e API andam **juntos, etapa por etapa**, pelo [`docs/backend/roteiro-backend.md`](docs/backend/roteiro-backend.md) (roteiro aprovado, confirmado por Pedro em 01/11/2026): a cada etapa, o service do frontend troca o dado de exemplo pela API e o `openapi.yaml` ganha a fatia correspondente. Substitui o combinado de 20/10/2026 ("API só depois das telas").
- **Skills de Emil Kowalski** (`emil-design-eng`, `animate` e as outras cinco): instaladas, mas fora do fluxo por enquanto. Usar só se o gestor pedir.

## Regras de idioma e nomenclatura

- Responder sempre em português do Brasil.
- Código, pastas e nomes de arquivo ficam em **inglês**.
- Interface (textos visíveis ao usuário) e documentação ficam em **português**.
- **Banco de dados em português:** tabelas, colunas e valores de estado (`usuario`, `anuncio`, `pedido`, `pago`, `em_negociacao`...). O backend escreve em inglês e o Prisma faz a ponte com `@map`/`@@map` (mapeamento em `docs/BancoDeDados/bd.md`, seção 7).
- Citar sempre os códigos de origem ao implementar algo: `RF`/`RNF` (requisitos do PDF) e `RN-XXX-nn` (regras de negócio em `docs/regras-de-negócio/regras-de-negócio.md`).
- Se uma informação não estiver documentada, dizer que não está definida — não inventar regra, rota, campo ou decisão.

## Visão geral do sistema

Sistema web onde alunos verificados (e-mail `@edu.unifor.br`) anunciam e compram materiais e itens de interesse (livros, eletrônicos, alimentos, materiais de curso, vestuário, outros) dentro do campus. A retirada é sempre presencial, combinada via WhatsApp. Três atores: **visitante**, **usuário (aluno logado)** e **administrador**. O catálogo só é acessível a aluno autenticado; o visitante vê apenas a tela inicial (inclusive o carrossel de anúncios recentes).

## Estado do projeto (revisado em 02/11/2026)

| Parte | Estado |
|---|---|
| Backend | Etapas 2 (banco), 4 (autenticação e perfil), 5 (categorias e anúncios), 6 (pedidos), 7 (pagamentos e liquidação) e 8 (jobs) prontas **no backend**; a Etapa 9 (admin e anonimização) está pronta, com filtro de presença e e-mail de exclusão em segundo plano; a Etapa 3 está pronta para esta fase (`buildProviders`, travas por `APP_ENV`, modelos de e-mail escapados e guarda de destinatário); e-mail e imagens reais (Resend/Mailtrap, Cloudinary ou Vercel Blob) ficam para o deploy, decisão de 01/11/2026 (hoje `console` e disco local); a 10 está parcial (Google real e `mercadopago.provider` escrito, **nunca chamado de verdade**). Rotas: `/auth`, `/users` (inclusive a troca de e-mail por link, `email-change` e `confirm`), `/categories`, `/listings`, `/orders`, `/payments` (cartão, Pix e webhook assinado), `/admin/*` (usuários, anúncios e auditoria), `GET /internal/jobs/:name` e `GET /health/db`. Gateway: `mock.provider` (dev e teste) e `mercadopago.provider` na **Payments API**. **Não existe** notificações como módulo (o e-mail de venda e de estorno sai pelo `MailProvider`). Tudo isso (etapas 1 a 9, troca de e-mail, presença no admin, travas dos providers, cobertura de 80% com `npm run test:coverage`) está na `main` desde 02/11/2026. **A API ainda não sobe em `preview` nem em `production`:** o `env.ts` proíbe e-mail `console` e storage `local` nesses ambientes, e o `buildProviders` só conhece esses dois drivers (faltam os reais, decisão pendente). Revisão geral de 02/11/2026 (`/code-review` e `/security-review`): achados em "Pendências abertas". |
| Banco | 8 tabelas, RLS e papéis `unishop_*` aplicados e testados no `unishop-prod` e no `unishop-dev`; migrações `0_init`, `1_regras_manuais`, `2_rls_politicas` e `3_motivo_cancelamento` **nos três ambientes** (a 3 entrou no `unishop-prod` em 02/11/2026, por decisão do Francisco, com `prisma migrate deploy`). `unishop-prod` conferido em 02/11/2026: 6 categorias, **nenhum usuário e nenhum admin**. Seed do admin só no `unishop-dev`. Os checksums gravados no prod misturam CRLF e LF (bd.md §15, pendência 11): nunca rodar `migrate dev`, `reset` ou `resolve` no prod. |
| Frontend | Todas as telas do Figma prontas, em sua maioria sobre dados de exemplo (`VITE_USE_MOCKS`). Chamam a API de verdade `auth.service`, `profile.service`, categorias, anúncios e "meus anúncios" (verificado no navegador em 01/11/2026); o **checkout** (criar pedido, ler pedido, cartão com `tokenizeCard`, Pix e "Já paguei") também chama a API quando `VITE_USE_MOCKS` está desligado; "meus pedidos", pedidos recebidos, concluir venda e avaliações ainda usam exemplo; as telas de **usuários e produtos do admin** chamam a API (verificado no navegador em 02/11/2026, na branch de integração; suporte e avaliações do admin seguem como exemplo, decisão da equipe pendente); a **sessão e o perfil** também (`PrivateRoute` com `GET /auth/me`, login com Google pelo botão oficial, completar cadastro, troca de e-mail por link, foto e exclusão; telas sem Figma são provisórias; o teste do Google com e-mail `@edu.unifor.br` real continua pendente); o **carrossel da tela inicial** usa `GET /listings/recent` (público); o card de cada **categoria** mostra a foto do primeiro anúncio visível publicado nela (`imageUrl` em `GET /categories`, decisão de 02/11/2026); o suporte do admin não mostra dado de exemplo fora do modo de demonstração) (o exemplo fica nos `*.mock.ts`, atrás de `VITE_USE_MOCKS`). |
| Testes | Backend: `npm test` com 227 testes, `tsc` e lint passando (conferido de novo em 02/11/2026, na `main` com o Mercado Pago); `npm run test:db` (Docker, PostgreSQL 17 local) com 256, passando em 02/11/2026 antes da última mesclagem. Frontend: `tsc`, lint e build passam; Vitest com 783 (alguns testes de tela às vezes estouram o tempo sob carga e passam isolados); Playwright (`npm run test:e2e`, modo de demonstração, servidor próprio na porta 5199) com 147 de 148 em 02/11/2026 (a falha é o foco que não volta ao botão "Publicar" depois do pop-up de anunciar). **Nunca testados:** `mercadopago.provider` contra o Mercado Pago real, o SDK no navegador e o webhook por túnel. |
| Deploy | Nada publicado a partir do repositório: não há `vercel.json` nem `.github/workflows`. |
| `openapi.yaml` | Não existe, embora o backend já tenha 6 módulos. |
| Guia do Mercado Pago | [`docs/api/mercado-pago-passo-a-passo.md`](docs/api/mercado-pago-passo-a-passo.md): onde colocar cada chave (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `PAYMENT_DRIVER`, `PAYMENT_MODE`, `API_PUBLIC_URL`, `CRON_SECRET` no `backend/.env`; `VITE_MP_PUBLIC_KEY` no `frontend/.env`), túnel para o webhook e prova de conceito do Pix. |

## Equipe e responsabilidades

| Membro | Responsabilidade |
|---|---|
| Pedro Cândido | Diagrama de Caso de Uso, Frontend, Engenheiro de API |
| Felipe Bessa | Wireframes (Figma), Backend |
| Ana Clara Macêdo | DER e MER, Banco de Dados |
| Francisco Magno | Gestor de Projeto, Integração front-back |

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | TypeScript + React, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form + Zod, HTML |
| Testes (frontend) | Vitest, Testing Library, Playwright |
| Backend | Node.js + Express, Prisma (ORM) |
| Banco de dados | PostgreSQL (Supabase em produção, só como banco; Docker Compose em desenvolvimento e testes) |
| Prototipação | Figma |
| Versionamento | Git, código organizado em camadas |
| Gestão | Trello (Kanban) |

Decisões fechadas da stack: Vite, Tailwind CSS, Prisma, React Router, TanStack Query, React Hook Form, Zod e Vitest/Testing Library/Playwright, estrutura do backend em camadas (routes/controller/service/repository), Mercado Pago, Vercel + Supabase, Resend (Mailtrap em desenvolvimento) e Cloudinary. Todos os documentos (`regras-de-negócio`, `BancoDeDados`, `backend`, `frontend`, `api` e `deploy`) foram alinhados em conjunto em **16/10/2026**. Estado em 01/11/2026: ver a seção "Estado do projeto" abaixo.

Sugestões ainda em avaliação (não confirmadas): nenhuma na stack. Itens "depois do MVP" (Turnstile, Sentry, confirmação de e-mail por link, tela de notificações, Redis para o limite de requisições) estão decididos como adiados em `docs/regras-de-negócio/regras-de-negócio.md` (§8) e `docs/api/api.md`.

## Estrutura esperada do frontend

Por área de ator, mais compartilhado:

```
public/   → visitante (tela inicial, cadastro, login, recuperação de senha, Termos e Privacidade)
user/     → aluno logado (categorias, listagens, produto, pedidos, pagamento, anúncios, perfil, completar cadastro)
admin/    → administrador (painel, usuários, produtos)
shared/   → componentes e utilitários comuns
```

Sessão: JWT em memória com cópia em `sessionStorage`, restaurada por `GET /auth/me`.

## Estrutura do backend (o que existe e o que falta)

Em camadas (route → controller → service → repository), com serviços externos atrás de providers. Detalhes em [`docs/backend/backend.md`](docs/backend/backend.md).

```
backend/
├─ prisma/    → schema.prisma, migrations/ (0_init + migração manual) e seed.ts (6 categorias + conta admin)
└─ src/
   ├─ app.ts / dev-server.ts → app.ts é exportado para a Vercel (sem listen); dev-server.ts só em desenvolvimento (porta + node-cron)
   ├─ modules/   → aluno: auth, users, categories, listings, orders, payments, notifications
   ├─ admin/     → administrador: users, listings, audit-logs (proteção aplicada uma vez)
   ├─ shared/    → middlewares, providers, security, errors, utils, types
   └─ jobs/      → expirar Pix, limpar tokens, conciliar pagamentos (endpoints em produção)
```

Já existem (01/11/2026): `prisma/` completo, `app.ts`, `dev-server.ts`, `config/`, `shared/` (middlewares, `errors`, `database` com `stock.ts`, `providers` de e-mail de console, armazenamento local, Google e **pagamento** com `mock.provider` e `mercadopago.provider`, `utils`), `jobs/`, `admin/` e os módulos `auth`, `users`, `categories`, `listings`, `orders` e `payments`. **Ainda não existem:** `notifications` (módulo) e os drivers reais de e-mail (Resend, Mailtrap ou SMTP) e de imagem (Cloudinary ou Vercel Blob), que ficam para o deploy; o Mercado Pago está escrito, mas não foi testado contra a API real.

## Regras centrais a nunca violar

- O catálogo (categorias, listagens, produtos) só abre para aluno autenticado; verificação de papel sempre no backend, nunca só no frontend.
- Cadastro/login/edição de e-mail aceitam apenas domínio `@edu.unifor.br` (exceção: a conta admin criada por seed). No login com Google, o servidor confere o domínio e o e-mail verificado.
- Dados de cartão nunca passam pelos servidores do Unishop — pagamento sempre via gateway externo; o banco guarda só `id_transacao_gateway`.
- Sessão via JWT HS256 de 2 horas, enviado no cabeçalho `Authorization: Bearer`, sem refresh token. Token emitido antes da última troca de senha é recusado.
- Cada usuário só altera os próprios dados/anúncios/pedidos; rotas de admin exigem perfil próprio.
- Ações irreversíveis (excluir perfil, excluir anúncio/produto, marcar como vendido) exigem confirmação explícita do usuário. Excluir é **lógico**: anúncio recebe `excluido_em` e usuário é anonimizado; a exclusão é bloqueada (409 `HAS_OPEN_PAID_ORDERS`) enquanto houver pedido Pago ou em Retirada combinada em aberto.
- Anúncio tem de 1 a 5 imagens (JPG/PNG), preço de R$ 0,01 a R$ 99.999,99 e quantidade de 1 a 999. O PDF fala em 5 MB por imagem; na Vercel cada requisição aceita 4,5 MB, então a API recebe **uma imagem por requisição, até 4 MB** (`POST /listings` com a primeira, `POST /listings/:id/images` com as demais). É um desvio do PDF **confirmado pelo grupo em 16/10/2026** (Regras §10); se o enunciado exigir 5 MB, o frontend reduz a imagem antes de enviar.
- Pedido feito via WhatsApp não desconta estoque; só desconta quando o vendedor confirma a conclusão (e se o estoque não bastar, a conclusão é recusada com 409).
- Estoque nunca é reservado (Pix pendente não reserva); desconto atômico (`UPDATE ... WHERE quantidade >= n`) na confirmação do pagamento. Se o estoque acabar antes, ou o anúncio deixar de estar ativo, ou o pedido já estiver cancelado, o pedido é cancelado e o valor estornado (RN-PAG-08, 13, 14).
- Pedido pendente sem pagamento aprovado é cancelado em 30 minutos (Pix vencido ou cartão abandonado); Pix expirado cancela o pedido, e o aluno faz um novo.
- O pedido congela vendedor, nome do produto, imagem, quantidade, preço unitário e taxa. Um comprador tem **um pedido aberto por anúncio e forma de negociação**: novo clique reaproveita o pedido.
- Administrador não compra, não paga e não anuncia; a conta admin só nasce por seed, não suspende nem exclui a si mesma e o último admin ativo não pode ser removido.
- Valor, taxa e confirmação de pagamento são calculados e decididos só no backend (webhook assinado, idempotente). Dinheiro em centavos inteiros no código e `numeric(10,2)` no banco.
- O WhatsApp do vendedor só é devolvido em rotas autenticadas.

## Vocabulário

| Domínio (PT) | Código (EN) | Tabela no banco |
|---|---|---|
| Usuário | `user` | `usuario` |
| Anúncio / Produto | `listing` | `anuncio` |
| Imagem do anúncio | `listingImage` | `imagem_anuncio` |
| Categoria | `category` | `categoria` |
| Pedido | `order` | `pedido` |
| Pagamento | `payment` | `pagamento` |
| Registro de auditoria | `auditLog` | `log_admin` |
| Token de link (senha, e-mail) | `userToken` | `token_usuario` |
| Notificação | `notification` | (por e-mail; sem tabela) |
| Administrador | `admin` | `usuario.tipo_usuario = 'admin'` |

Nota: o aluno diz "anúncio"; o admin diz "produto" — mesma entidade (`listing`), termo muda conforme a tela.

Estados (nome exibido → valor no banco):

- Anúncio (`anuncio.status`): `Ativo` (`ativo`), `Pausado` (`pausado`), `Vendido` (`vendido`). `Excluído` não é status: é exclusão lógica (`excluido_em`), definitiva.
- Pedido (`pedido.status_pedido`): `Pendente` (`pendente`), `Pago` (`pago`), `Retirada combinada` (`retirada_combinada`), `Concluído` (`concluido`), `Em negociação` (`em_negociacao`), `Cancelado` (`cancelado`). Forma de negociação: `pagamento_site` ou `whatsapp`.
- Pagamento (`pagamento.status_pagamento`): `pendente`, `aprovado`, `recusado`, `expirado`, `estorno_pendente`, `estornado`. Um pedido pode ter várias tentativas, mas só uma em andamento.
- Conta (`usuario.status_conta`): `ativa`, `suspensa` (pelo admin), `excluida` (anonimizada). "Bloqueada" (5 senhas erradas, 15 min) é temporária e usa `bloqueado_ate`, não é um valor de `status_conta`.

## Decisões do grupo já fechadas

- Gateway de pagamento: Mercado Pago (ADR-002). Cartão por token e Pix com webhook assinado. Produção usa **credenciais de teste** (RN-PAG-10), com aviso de ambiente de demonstração na tela (RN-PAG-15).
- Hospedagem: Vercel (frontend e API) com banco PostgreSQL no **Supabase**, usado só como banco, sem Auth, Storage nem Realtime (decidido por Francisco em 29/10/2026, substitui o Neon do ADR-005; o ADR foi revisado em 30/10/2026). Detalhes e limites do plano Hobby em [`docs/deploy/deploy.md`](docs/deploy/deploy.md). Supabase gratuito (conferido em 30/10/2026): 500 MB por projeto, 2 projetos ativos, projeto pausa após 1 semana sem atividade, **sem branching, sem backup automático e sem restauração a ponto no tempo**, 5 GB de saída. Ambientes: um projeto Supabase para produção e outro para desenvolvimento e preview. Conexões: `DATABASE_URL` pelo Transaction pooler (porta 6543) e `DATABASE_URL_UNPOOLED` pelo Session pooler ou direta (porta 5432; a direta só tem IPv6). **RLS ligada nas 8 tabelas, com política por papel** (decisão de Francisco, confirmada em 30/10/2026), porque o schema `public` é exposto pela Data API: política `app_all` (`FOR ALL`, `USING (true) WITH CHECK (true)`) só para `unishop_app` e `backup_select` (`SELECT`) só para `unishop_backup`; nenhuma para `anon` e `authenticated`, que também perdem os privilégios (`REVOKE`). Vem na migração `2_rls_politicas`; toda tabela nova leva `ENABLE ROW LEVEL SECURITY` e as duas políticas na própria migração. Passo a passo no Supabase em `deploy.md` §7.5; aplicada em 31/10/2026, o teste de login dos papéis ainda está pendente (pendência da RLS abaixo). Plano da fase: [`docs/backend/plano-banco-e-auth.md`](docs/backend/plano-banco-e-auth.md).
- Banco: criado e evoluído **só pelo Prisma** (baseline `0_init` + migração manual com `CHECK`, índices parciais, view `anuncio_visivel` e papéis). O dump de 07/10/2026 não é restaurado no Supabase. Três papéis: `unishop_migrator` (conexão direta ou Session pooler, porta 5432, `DATABASE_URL_UNPOOLED`), `unishop_app` (Transaction pooler, porta 6543, com `?pgbouncer=true`, `DATABASE_URL`; no pooler o usuário é `papel.ref-do-projeto`) e `unishop_backup` (somente leitura, `DATABASE_URL_BACKUP`).
- E-mail: Resend em produção (exige domínio próprio verificado) e Mailtrap em desenvolvimento (ADR-009). Imagens: Cloudinary (ADR-004). ORM: Prisma (ADR-001). Notificação ao vendedor e ao comprador: por e-mail.
- Modelo de segurança das APIs externas: "backend-cofre" (ADR-008), em [`docs/api/api.md`](docs/api/api.md). Travas de produção por `APP_ENV`, não por `NODE_ENV`.
- Jobs agendados: endpoints `GET /api/v1/internal/jobs/:name` com `CRON_SECRET`; Vercel Cron no diário (`cleanup-expired-tokens`) e cron-job.org **a cada 30 minutos** nos frequentes (`expire-pix-payments`, `reconcile-pending-payments`). Estorno com `await` e e-mail com `waitUntil`. Rotas técnicas: `GET /health` (leve, para o monitor) e `GET /health/db`.
- Turnstile (anti-bot) e Sentry entram depois do MVP; UptimeRobot monitora o `/health`.
- Domínio institucional oficial: `@edu.unifor.br`.
- Anúncio é item único, mas pode ter quantidade (várias unidades).
- Taxa de serviço: R$ 0,00 por enquanto.
- Login do admin: mesma tela do aluno, rota separada, redireciona ao painel admin.
- Login social: **Google entra no MVP** (com a tela "completar cadastro" no primeiro acesso); Apple fica de fora (custo anual e possível e-mail de retransmissão fora do domínio institucional).
- Troca de senha com a sessão aberta (`POST /users/me/password`) e recuperação por link de 30 minutos, uso único.
- Confirmação de e-mail por link: fora do MVP, atrás da chave `EMAIL_VERIFICATION_REQUIRED`.
- Termos de uso e Política de privacidade: versão mínima no MVP (Francisco escreve); conteúdo definido durante o desenvolvimento.
- Repasse ao vendedor: simulado, via conta única de teste.
- Limite de requisições em memória por instância, aceito no escopo acadêmico.
- Frontend e API andam juntos, etapa por etapa, pelo `roteiro-backend.md` (roteiro aprovado; confirmado por Pedro em 01/11/2026).
- **Trocar senha logado: fora do frontend por ora** (decisão de Francisco em 02/11/2026: não era prioridade e não estava prevista atrás do perfil). A rota `POST /users/me/password` segue no backend; quem esquece a senha usa a recuperação por link.
- **Fora do MVP (adiado, 01/11/2026):** reembolso, cancelamento de pedido Pago ou em Retirada combinada pelo sistema, avaliações de pedido concluído e solicitações de suporte (Etapa 12 do roteiro, antiga P8). As telas existem no frontend como protótipo, sem regra, sem tabela e sem API; não ligar a API a elas.

## Pendências abertas

Revisadas em 02/11/2026 contra o código e o banco `unishop-prod`. O que já foi resolvido saiu desta lista (o histórico está em cada documento).

**Dependem de resposta ou ação externa**

- **`openapi.yaml`:** não existe, embora o backend já tenha `/auth`, `/users`, `/categories`, `/listings`, `/orders` e `/payments`. Pedro escreve **por fatia**, junto de cada etapa do roteiro (a partir do Backend §9); frontend, backend e skills dependem dele.
- **Domínio próprio:** necessário para o Resend (e-mail de senha e de troca de e-mail) e, se `vercel.app` for recusado, para o login do Google.
- **Login com Google:** o provider real já está no backend (`google-auth-library`); falta testar com um e-mail `@edu.unifor.br` real se ele entrega `email_verified = true`.
- **Plano Hobby da Vercel:** sem equipe; conferir se commits de outros autores são bloqueados em repositório privado.
- **Prova de conceito do Mercado Pago:** **Payments API escolhida** (Pedro, 01/11/2026; registrar no ADR-002 do `api.md`). Falta criar a conta de teste, preencher as chaves e confirmar que o Pix de teste gera o webhook de aprovação e se o CPF do pagador é exigido (o formulário de cartão não tem o campo). Passo a passo em `docs/api/mercado-pago-passo-a-passo.md`.
- **Backup no Supabase gratuito:** não há backup automático; o RNF011 depende do workflow diário do GitHub Actions (`pg_dump` pela conexão Session pooler, com `--enable-row-security`) e esse workflow **ainda não existe** (não há `.github/`). O plano gratuito não tem restauração a ponto no tempo.
- **Pausa do projeto:** o plano gratuito pausa o projeto após 1 semana sem atividade; o monitor de `/health/db` (que ainda não existe) ou um job precisa gerar atividade antes da demonstração.
- **PDF:** conferir os RNF012 a RNF016, ainda não mapeados no Deploy, e o limite de imagem (4 MB × 5 MB).
- **Textos:** Termos de uso e Política de privacidade ainda não existem; limites de campos e lista de itens proibidos (Regras §9) esperam confirmação do grupo.

**Trabalho de desenvolvimento em aberto (código × documentação)**

- **Banco:** a `3_motivo_cancelamento` (P9) foi aplicada no `unishop-prod` em 02/11/2026 (Francisco decidiu não esperar). Se a Ana Clara pedir outros nomes para `vencido`, `sem_estoque` e `anuncio_indisponivel`, a troca entra numa migração nova.
- **`backend/.env` local aponta para a produção (02/11/2026, Deploy §17.3 nº 18):** as linhas do Supabase começam com espaço, não com `#`, então o dotenv usa o segundo `DATABASE_URL`: Transaction pooler do `unishop-prod`, usuário `postgres` (ignora a RLS), sem `sslmode`. `npm run dev` grava no banco de produção. O `DATABASE_URL_UNPOOLED` do mesmo arquivo aponta para o Docker, e o `DIRECT_URL` não é lido. Corrigir: comentar as linhas do Supabase; o prod só com `unishop_app` e `unishop_migrator`, e só na Vercel.
- **Achados da revisão de 02/11/2026 (`/code-review` e `/security-review` no backend inteiro), nenhum corrigido ainda:**
  1. **Valor do pedido muda com cobrança aberta (alta).** `createOrReuse` (`orders.repository.ts:124-139`) regrava quantidade e total do pedido Pendente mesmo com Pix ou cartão pendente, e o `settle` não compara `pagamento.valor` com `pedido.valor_total`. Comprador gera o Pix de 1 unidade, pede de novo com 10, paga o Pix de 1 e o pedido vira Pago com 10 unidades descontadas do estoque.
  2. **Timeout do gateway deixa cobrança órfã (média).** `charge()` (`payments.service.ts:147-153`) marca a tentativa como `recusado` sem `gatewayTxId` em qualquer erro, inclusive o timeout de 15 s. Se o Mercado Pago aprovou, o webhook não acha a linha e a conciliação ignora linhas sem id: cartão cobrado, pedido nunca Pago, sem estorno. A nova tentativa usa outra chave de idempotência e cobra de novo. Falta conciliar por `external_reference` (`pedido:N`).
  3. **Pagamento `expirado` nunca é reconsultado (média).** `findStalePending` só olha `pendente`. Pix pago no fim da janela com webhook perdido não é estornado (RN-PAG-13).
  4. **Exclusão de anúncio ou conta cancela pedido sem cancelar a cobrança (média).** `cancelUnpaidOrders` não marca o pagamento, não chama `cancelPayment` nem grava motivo. O Pix continua pagável e vira estorno `late_payment`.
  5. **Limite de `/auth` pega o `GET /auth/me` (média).** 10 por minuto por IP (`auth.routes.ts:25`); no Wi-Fi do campus (um IP) a restauração da sessão a cada recarga estoura o limite.
  6. **Estorno ou chargeback feito fora do sistema é ignorado (média).** `syncRow` não trata `refunded`, então o pedido continua Pago.
  7. **Pedido vencido reaproveitado (baixa).** `create()` reaproveita o Pendente com mais de 30 min ainda não varrido pelo job e devolve o pedido já cancelado.
  8. **`mine`/`received` fazem `expireIfDue` em `Promise.all` sem limite (baixa)**, com chamada ao gateway dentro de um GET.
  9. **Duplicações (baixa):** número do pedido e mapa de motivos repetidos em `payments`; mapas de status repetidos em `auth.repository` e `orders.repository` (já existem em `shared/database/status-maps.ts`).
  10. **Lacunas frente ao `backend.md` §6:** sem limite geral (100 por minuto por IP) nem de `/payments` (30 por minuto por usuário); `pino`/`pino-http` instalados e não usados (só `console`, sem log por requisição).
  11. **Pool de conexões (Deploy §17.3 nº 19):** `connection_limit=1` na URL é ignorado pelo `@prisma/adapter-pg`; cada instância abre até 10 conexões. Passar `max` ao `PrismaPg`.
  
  A revisão de segurança não achou outra falha com confiança alta. Conferidos como corretos: SQL sempre parametrizado, JWT só HS256 com papel lido do banco, `/admin` e jobs protegidos, webhook com HMAC em tempo constante e consulta ao gateway, posse dos recursos conferida (sem IDOR), tokens de link com hash e uso único, upload por conteúdo com nome UUID, e-mails escapados, WhatsApp fora da rota pública. Abaixo do limite: o simulador `/payments/dev/...` não confere o dono do pedido (só existe com mock em dev e teste).
- **Integração do frontend:** feita para categorias, anúncios e "meus anúncios" (marco da Etapa 5 verificado em 01/11/2026). Faltam: editar anúncio e remover foto ligados à API, e a troca dos services de pedidos, pagamento e admin nas etapas 6 a 9.
- **Drivers reais de e-mail e de imagem (bloqueiam o deploy):** o `buildProviders` e as travas do `env.ts` já existem, mas só há `console` e `local`. Decidir o e-mail (SMTP de conta Gmail, modo demonstração ou Resend com domínio) e as imagens (Cloudinary ou Vercel Blob) e escrever os providers. As dependências `resend` e `cloudinary` já estão no `package.json`, sem uso.
- **Build na Vercel:** `src/generated/` está no `.gitignore` e o `build` do backend é só `tsc`. Falta `prisma generate` (`postinstall` ou `scripts/vercel-build.sh`, Deploy §5.4), além de `vercel.json` e workflows.
- **Telas de pedidos fora do checkout:** "meus pedidos", pedidos recebidos e "concluir venda" ainda usam exemplo, embora a API de pedidos exista. Parcelas do cartão fixas em 1x e repasse simulado.
- **Etapas 10 e 11 do roteiro:** a 10 está parcial (e-mail e imagens reais a decidir; o Mercado Pago falta testar) e a 11 (deploy) não começou. A 9 (admin e anonimização) está pronta; `DELETE /users/me` já recusa com 409 `HAS_OPEN_PAID_ORDERS` (`users.service.ts:184`).
- **Deploy:** sem `vercel.json` e sem workflows (testes e backup). O seed do admin rodou só no `unishop-dev`; o `unishop-prod` ainda não tem admin.
- **Segredos:** o `backend/.env` local guarda `ADMIN_EMAIL` e `ADMIN_PASSWORD`; apagar essas duas linhas depois do seed de produção (fora do git), que deve ser rodado digitando a senha no terminal (Deploy §7.3).
- **Dívidas pequenas:** aviso do Vite sobre ESM nas configs `vitest*.config.ts`; o cabeçalho da `1_regras_manuais` diz "PostgreSQL 18" (não editar: o Prisma confere o checksum das migrações aplicadas; corrigir só numa migração nova).
- **Documentação:** o `docs/README.md` (índice) que os documentos citam não existe; os documentos ainda citam caminhos sem acento (nota em "Leia primeiro").
- **Skills:** os casos de `evals/` das `unishop-*` ainda não foram executados. O Python 3.14 já está instalado (conferido em 02/11/2026), então dá para rodá-los com a `skill-creator`.

Lista completa em `docs/regras-de-negócio/regras-de-negócio.md` (seção 11), `docs/api/api.md` (seção 12), `docs/backend/backend.md` (seção 21), `docs/BancoDeDados/bd.md` (seção 15), `docs/deploy/deploy.md` (seção 17.3) e `docs/backend/roteiro-backend.md` (seção 2).

## Modelo de dados (resumo)

Oito tabelas no schema `public`, chaves `GENERATED ALWAYS AS IDENTITY`, datas em `timestamptz` (UTC): `usuario`, `categoria`, `anuncio`, `imagem_anuncio`, `pedido`, `pagamento`, `log_admin` e `token_usuario`. As lacunas do DER original (quantidade e galeria no anúncio, tokens, dados de pagamento, auditoria, aceite dos Termos, chave própria do pedido) foram **incorporadas** no Banco de Dados v0.2. Pontos para lembrar ao mexer em banco/backend:

- `pedido` tem `id_pedido` próprio, guarda `id_vendedor` e congela produto, imagem, quantidade, preço e taxa; `anuncio` tem exclusão lógica e `pedido` sobrevive a ela (RF017.12).
- E-mail único sem diferenciar maiúsculas (índice sobre `lower(email)`); `senha_hash` é anulável (conta Google, `google_sub`).
- Sem `ON DELETE`: nenhuma FK apaga em cascata; `DELETE` físico em `usuario` ou `anuncio` é exceção de manutenção.
- Regras que o banco não garante e ficam no backend: admin não compra, dono não compra o próprio anúncio, mínimo de 1 imagem e proteção do último admin.
- Toda listagem pública usa o mesmo filtro de visibilidade (anúncio ativo, não excluído, dono com conta ativa); a view `anuncio_visivel` guarda esse filtro.
- Divergências MER × banco (ex.: `forma_pagamento` no MER é `forma_negociacao` no banco) estão em `docs/BancoDeDados/bd.md`, seção 12.
- RNF005 menciona "NoSQL Injection", mas o banco é PostgreSQL — o correto é SQL Injection; tratar como erro de digitação do PDF, não como requisito literal.

## Estrutura de documentação

```
README.md                                  # apresentação do projeto
skills-lock.json                           # origem e hash das skills externas
docs/
├─ frontend/frontend.md                    # estrutura, rotas, componentes, estado, qualidade (v0.4.1)
├─ frontend/roteiro-telas.md               # ordem das telas, ciclo de cada tela e fichas (v0.2)
├─ regras-de-negócio/regras-de-negócio.md  # regras RN-XXX-nn, estados, permissões, MVP, testes (v0.4.2)
├─ BancoDeDados/bd.md                      # dicionário de dados, migração, papéis, LGPD (v0.2.1)
├─ backend/backend.md                      # arquitetura, rotas, pagamentos, segurança (v0.3.1)
├─ deploy/deploy.md                        # deploy na Vercel + Supabase (v0.3.1)
├─ skills/skills.md                        # skills do Claude Code no projeto
└─ api/api.md                              # APIs externas e segurança (v0.3); openapi.yaml ainda não existe
```

Protótipo Figma: https://www.figma.com/design/20vFP1b3Ra6UZbJjVssgxD/Unishop-%E2%80%94-Prot%C3%B3tipo
