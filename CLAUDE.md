# CLAUDE.md

Contexto para o Claude Code trabalhar no projeto **Unishop**, e-commerce web para alunos da Unifor (trabalho da disciplina Desenvolvimento de Plataformas Web, T242-12).

## Leia primeiro

Conjunto de documentos alinhado em 16/10/2026. Precedência entre eles: PDF, Regras de Negócio, Banco de Dados, Backend e Frontend, API e Deploy (quando dois discordam, corrige-se o de menor precedência).

- [`docs/regras-de-negócio/regras-de-negócio.md`](docs/regras-de-negócio/regras-de-negócio.md) (v0.4.1) — regras RN-XXX-nn, estados, permissões, escopo do MVP (§8), limites de campos e itens proibidos (§9), desvios do PDF (§10) e cenários de teste.
- [`docs/BancoDeDados/bd.md`](docs/BancoDeDados/bd.md) (v0.2) — as 8 tabelas no estado final, dicionário de dados, valores fixos dos estados, mapeamento banco × backend, consultas críticas, anonimização (LGPD), migração pelo Prisma, papéis do banco e SQL da migração manual.
- [`docs/backend/backend.md`](docs/backend/backend.md) (v0.3) — arquitetura em camadas, autenticação, módulos e rotas (§9), pagamentos, estados, jobs, erros, segurança e mapa das regras RN no backend.
- [`docs/frontend/frontend.md`](docs/frontend/frontend.md) (v0.4) — estrutura, rotas, componentes, estado, sessão e padrões de qualidade do frontend.
- [`docs/api/api.md`](docs/api/api.md) (v0.3) — APIs externas (Google, Mercado Pago, Resend, Cloudinary, Turnstile e outras), arquitetura de segurança "backend-cofre", providers, travas de produção, variáveis, resiliência, custos e ADRs 001 a 009. O contrato da API própria (`openapi.yaml`) ainda não existe.
- [`docs/deploy/deploy.md`](docs/deploy/deploy.md) (v0.3) — deploy em produção (Vercel + Neon): ambientes, segredos, CORS, jobs agendados, backup, atualização e reversão.
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
| Deploy na Vercel + Neon: variáveis por ambiente, `APP_ENV`, `vercel.json`, jobs por endpoint, `waitUntil`, cron, domínio, backup, rollback, limites do Hobby | `unishop-deploy` |
| Operar o Vercel CLI com token (`vercel env`, `vercel logs`, deploy pelo CLI), sempre sob as regras da `unishop-deploy` | `vercel-cli-with-tokens` |
| Conexão pooled × direta, branches por ambiente e restauração no Neon | `neon-postgres`, `neon-postgres-branches` |
| Detalhes da API do Resend, entregabilidade, SPF/DKIM/DMARC, e-mail transacional | `resend`, `email-best-practices` |
| Performance de React: waterfalls, bundle, re-renders, lazy loading (SPA Vite: ignorar regras `server-*` e de Next.js) | `vercel-react-best-practices` |
| Projetar `shared/components/ui`, compound components, contexto, excesso de props booleanas | `vercel-composition-patterns` |
| Revisar UI, acessibilidade (WCAG 2.1 AA), formulários, foco e contraste | `web-design-guidelines` |
| Acabamento e UX das telas: polimento, animação, tela com dados extremos, comportamento no celular (sugestão de estilo; não muda regra nem stack) | `emil-design-eng`, `animate`, `animation-performance`, `review-animations`, `find-animation-opportunities`, `break-ui`, `mobile-native` |
| Schema, migração, índice, transação, lock, consulta lenta, concorrência de estoque no PostgreSQL | `supabase-postgres-best-practices` |
| Rodar a aplicação local no navegador, screenshots, console, fluxos Playwright | `webapp-testing` |
| Criar, testar ou melhorar skills do projeto | `skill-creator` |
| Mapear o projeto em grafo de conhecimento (só se o usuário pedir `/graphify`) | `graphify` |

Fluxo sugerido por momento do trabalho (quando o código existir):

| Momento | O que fazer |
|---|---|
| Entender o que construir | `unishop-rules`: escopo do MVP (§8), limites de campos (§9) e desvios do PDF (§10) antes de estimar ou criar tarefa |
| Antes de codar | Ler a regra em `docs/` (via `unishop-rules`) e acionar `unishop-frontend` e/ou `unishop-backend` |
| Banco | `unishop-database` (lê `docs/BancoDeDados/bd.md`); `supabase-postgres-best-practices` ao definir schema, migração e concorrência de estoque; `neon-postgres` e `neon-postgres-branches` para conexões e branches no Neon. Gere o `schema.prisma` e a migração `0_init`, depois a migração manual, e teste em banco vazio |
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

Enquanto o projeto estiver só em documentação, as skills `unishop-*` servem para revisar e manter a coerência dos documentos, não para gerar código.

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
- As seis skills `unishop-*` (`frontend`, `backend`, `api`, `deploy`, `database`, `rules`) ficam em `.claude/skills/` com casos de teste em `evals/evals.json`; ainda não foram executados por falta de Python na máquina (a `skill-creator` precisa dele para as avaliações e o visualizador). Instalar Python é o próximo passo para rodá-los e otimizar as descrições.

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
- **Ordem do desenvolvimento:** primeiro todas as telas do frontend, seguindo o Figma e com dados de exemplo; a API só começa depois de as telas estarem prontas. Até lá, `openapi.yaml` e backend ficam parados.
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
| Banco de dados | PostgreSQL 18 (Neon em produção; Docker Compose em desenvolvimento e testes) |
| Prototipação | Figma |
| Versionamento | Git, código organizado em camadas |
| Gestão | Trello (Kanban) |

Decisões fechadas da stack: Vite, Tailwind CSS, Prisma, React Router, TanStack Query, React Hook Form, Zod e Vitest/Testing Library/Playwright, estrutura do backend em camadas (routes/controller/service/repository), Mercado Pago, Vercel + Neon, Resend (Mailtrap em desenvolvimento) e Cloudinary. Todos os documentos (`regras-de-negócio`, `BancoDeDados`, `backend`, `frontend`, `api` e `deploy`) foram alinhados em conjunto em **16/10/2026**. O projeto ainda não foi iniciado: não criar código nem estrutura de pastas até o grupo liberar.

Sugestões ainda em avaliação (não confirmadas): nenhuma na stack. Itens "depois do MVP" (Turnstile, Sentry, confirmação de e-mail por link, tela de notificações, Redis para o limite de requisições) estão decididos como adiados em `docs/regras-de-negócio/regras-de-negócio.md` (§8) e `docs/api/api.md`.

## Estrutura esperada do frontend

Por área de ator, mais compartilhado:

```
public/   → visitante (tela inicial, cadastro, login, recuperação de senha, Termos e Privacidade)
user/     → aluno logado (categorias, listagens, produto, pedidos, pagamento, anúncios, perfil, completar cadastro, trocar senha)
admin/    → administrador (painel, usuários, produtos)
shared/   → componentes e utilitários comuns
```

Sessão: JWT em memória com cópia em `sessionStorage`, restaurada por `GET /auth/me`.

## Estrutura esperada do backend

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
- Hospedagem: Vercel (frontend e API) com banco PostgreSQL 18 no Neon (ADR-005). Detalhes e limites do plano Hobby em [`docs/deploy/deploy.md`](docs/deploy/deploy.md). Neon gratuito: 1 GB por projeto, 100 CU-h por mês, 10 branches, restauração de 6 horas, banco dorme após 5 minutos, sem lista de IPs.
- Banco: criado e evoluído **só pelo Prisma** (baseline `0_init` + migração manual com `CHECK`, índices parciais, view `anuncio_visivel` e papéis). O dump de 07/10/2026 não é restaurado no Neon. Três papéis: `unishop_migrator` (conexão direta, `DATABASE_URL_UNPOOLED`), `unishop_app` (pooler, `DATABASE_URL`) e `unishop_backup` (somente leitura, `DATABASE_URL_BACKUP`).
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

## Pendências abertas (dependem de resposta ou ação externa)

- **`openapi.yaml`:** não existe; Pedro escreve a partir do Backend §9. Frontend, backend e skills dependem dele.
- **Domínio próprio:** necessário para o Resend (e-mail de senha e de troca de e-mail) e, se `vercel.app` for recusado, para o login do Google.
- **Login com Google:** testar com um e-mail `@edu.unifor.br` real se ele entrega `email_verified = true`.
- **Plano Hobby da Vercel:** sem equipe; conferir se commits de outros autores são bloqueados em repositório privado.
- **Prova de conceito do Mercado Pago:** Pix de teste gerar o webhook de aprovação; escolher Payments API ou Orders API (ADR-002).
- **Papéis do banco no Neon gratuito:** confirmar no painel como criar `unishop_migrator`, `unishop_app` e `unishop_backup` (Francisco ou Ana Clara); se não der, usar um papel só e registrar a exceção no Deploy.
- **Banco:** testar a migração `0_init` + manual em um banco vazio e atualizar o MER (`.drawio`) com as divergências da seção 12 do Banco de Dados.
- **PDF:** conferir os RNF012 a RNF016, ainda não mapeados no Deploy, e o limite de imagem (4 MB × 5 MB).
- **Textos:** Termos de uso e Política de privacidade ainda não existem; limites de campos e lista de itens proibidos (Regras §9) esperam confirmação do grupo.
- Lista completa em `docs/regras-de-negócio/regras-de-negócio.md` (seção 11), `docs/api/api.md` (seção 12), `docs/backend/backend.md` (seção 21), `docs/BancoDeDados/bd.md` (seção 15) e `docs/deploy/deploy.md` (seção 17.3).

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
├─ frontend/frontend.md                    # estrutura, rotas, componentes, estado, qualidade (v0.4)
├─ frontend/roteiro-telas.md               # ordem das telas, ciclo de cada tela e fichas (v0.1)
├─ regras-de-negócio/regras-de-negócio.md  # regras RN-XXX-nn, estados, permissões, MVP, testes (v0.4.1)
├─ BancoDeDados/bd.md                      # dicionário de dados, migração, papéis, LGPD (v0.2)
├─ backend/backend.md                      # arquitetura, rotas, pagamentos, segurança (v0.3)
├─ deploy/deploy.md                        # deploy na Vercel + Neon (v0.3)
├─ skills/skills.md                        # skills do Claude Code no projeto
└─ api/api.md                              # APIs externas e segurança (v0.3); openapi.yaml ainda não existe
```

Protótipo Figma: https://www.figma.com/design/20vFP1b3Ra6UZbJjVssgxD/Unishop-%E2%80%94-Prot%C3%B3tipo
