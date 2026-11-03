---
title: Roteiro de Implementação — Backend
project: Unishop
version: 0.7.2
date: 2026-11-02
status: aprovado (confirmado por Pedro em 01/11/2026); acompanhamento da execução na seção 1.1
changelog: "0.7.2 — Etapa 12 parcial: só as avaliações entram (migração 4_avaliacao, módulo reviews, RN-AVA-01 a 05, 02/11/2026); suporte e reembolso seguem adiados. 0.7.1 — revisão de 02/11/2026: etapas 6 a 8 commitadas na main, migração 3 no unishop-prod, DELETE /users/me já confere pedido pago em aberto; próximos passos trocados pelos achados da revisão. 0.7 — etapas 1, 3, 6, 7 e 8 prontas no backend (gateway com `mock.provider` e `mercadopago.provider` na Payments API, pedidos, pagamentos, webhook assinado, liquidação, estorno, jobs, `GET /health/db`); frontend do checkout integrado à API; P3 decidida (Payments API), prova de conceito do Pix ainda por fazer; guia `docs/api/mercado-pago-passo-a-passo.md`. 0.6 — roteiro aprovado; seção 1.1 com o estado de execução em 01/11/2026 (etapas 2, 4 e 5 prontas no backend; 1 e 3 parciais; 6 a 11 não iniciadas); P1, P5, P7, P8, P10 e P11 atualizadas; Etapa 12 adiada (fora do MVP); migrações com os nomes reais (`0_init`, `1_regras_manuais`, `2_rls_politicas`). 0.5 — banco já existente (repositório clarammacedo/unishop) vira ponto de partida da Etapa 2, que deixa de criar do zero; seção 2.3 diz o que já existe, o que falta e em que etapa cada mudança entra; P10 e P11. 0.4 — passo zero com o grafo (graphify) em toda etapa. 0.3 — P2 decidido (banco em português, código e API em inglês por @map; seção 2.1); P9 (motivo do cancelamento sem coluna); seção 2.2 com o que o frontend ganhou nos commits 6be5b283, fb89e4d2 e ecb08f1d. 0.2 — integração com o frontend dentro de cada etapa (seção 4), chave de exemplos por área, etapas 6 e 7 integradas juntas, cartão por token falso até a Etapa 10"
owners: Felipe Bessa (backend), Pedro Cândido (API), Ana Clara Macêdo (banco), Francisco Magno (integração)
based_on: backend.md v0.3.1, bd.md v0.2.1, regras-de-negócio.md v0.4.2, api.md v0.3.1, deploy.md v0.3.1
language: pt-BR
---

# Roteiro de Implementação — Backend

Este roteiro ordena **o que construir, em que sequência e como saber que acabou**. Ele não repete as regras: cada etapa aponta a seção do documento que manda (`backend.md §x`, `bd.md §x`, `RN-XXX-nn`). Em conflito, vale a precedência do `CLAUDE.md` (PDF > decisões do grupo > docs).

## 1. Ponto de partida (conferido em 28/10/2026; histórico, o estado atual está na seção 1.1)

| Item | Estado |
|---|---|
| `backend/` | Existe um andaime: `package.json` com todas as dependências do `backend.md §3`, `tsconfig`, ESLint, Prettier, Vitest, `src/app.ts` (helmet, cors, compression, json, `GET /api/v1/health`), `src/config/env.ts` (Zod, todas as variáveis do §4), `src/dev-server.ts`, 1 teste de integração (`health`) e a trava `assert-test-db.ts` (testes só em banco `*_test`). |
| Banco | `docker-compose.yml` (dev) e `docker-compose.test.yml` (porta 5433) existem. **Não há** `prisma/` (schema, migrações, seed). O banco da Ana Clara **já existe** no repositório `clarammacedo/unishop` (dump de 07/10/2026, 7 tabelas); a Etapa 2 parte dele em vez de criar do zero. O que ele tem e o que falta está na seção 2.3. |
| Faltam no `package.json` | `@vercel/functions` (`waitUntil`, `backend.md §11`) e um cliente HTTP/túnel para o webhook em dev (ngrok ou Cloudflare Tunnel, fora do npm). |
| Frontend | Telas quase prontas, **sobre dados de exemplo**. Só o `auth.service.ts` já tem o caminho real (`api()`); os demais services são só exemplo em memória. O cliente `api()` não envia `multipart`. Detalhes e consequências na seção 4.1. |
| `openapi.yaml` | Não existe. |
| `CLAUDE.md` | **Atualizado em 01/11/2026:** as frases "não criar código" e "API só depois das telas" foram trocadas por "frontend e API andam juntos, etapa por etapa" e por uma seção de estado do projeto. |

### 1.1 Estado de execução (conferido em 01/11/2026)

Atualização do fim de 01/11/2026 (branch `feat/backend-finalizacao`): backend com `eslint`, `tsc`, `build`, `npm test` (225 testes), `npm run test:db` (251, PostgreSQL no Docker) e `npm run test:coverage` (476 testes; linhas 91,9%, comandos 90,1%, funções 90,8%, ramos 82,4%; services de auth, payments, listings e orders acima de 80%) verdes. Não testados: envio de e-mail real e armazenamento de imagens na Vercel (deploy), a P4, o Mercado Pago real. Bateria anterior, **depois** da entrega das etapas 6, 7 e 8: backend com `tsc`, `eslint`, `build`, `npm test` (134 testes) e `npm run test:db` (133, PostgreSQL 17 no Docker) verdes; frontend com `tsc -b`, `eslint` e `vite build` verdes e `vitest` com 681 de 682 (a falha é o teste do botão do Google no `RegisterPage`, causada pelo `VITE_GOOGLE_CLIENT_ID` preenchido no `frontend/.env` local). **Nunca rodou:** o `mercadopago.provider` contra o Mercado Pago real (sem chaves), o SDK no navegador, o webhook por túnel, o Pix de teste (P3) e o E2E do Playwright.

| Etapa | Estado | O que existe | O que falta |
|---|---|---|---|
| 1 Fundação | **Quase feita** | `AppError`, `errorHandler`, `validate`, `rate-limiter`, `request-id`, `config/constants`, `env.ts` com Zod e **travas de produção por `APP_ENV` (`superRefine`)**, `money`, `pagination`, `GET /api/v1/health` e **`GET /health/db`**, `@vercel/functions` (`runInBackground`), `test:db` | Conferir `shared/security` (`Secret`, `redact`) e a regra `no-restricted-imports` do ESLint, criados por outra sessão em 01/11/2026 e **não verificados** por mim |
| 2 Banco | **Feita** | `schema.prisma` (8 tabelas), migrações `0_init`, `1_regras_manuais`, `2_rls_politicas` e `3_motivo_cancelamento`, `seed.ts`, papéis e RLS no `unishop-prod` e no `unishop-dev`, `pg_dump` do `unishop_backup` testado nos dois | Nada: a `3_motivo_cancelamento` foi aplicada no `unishop-prod` em 02/11/2026 (decisão do Francisco); o seed do admin no prod continua pendente |
| 3 Providers | **Feita para esta fase** (01/11/2026) | `buildProviders` único (`shared/providers/index.ts`) com travas por `APP_ENV` no `env.ts`; modelos de e-mail com HTML escapado e guarda de destinatário; `MailProvider` (`console`, com `sendSaleConfirmed`, `sendOrderRefunded` e `sendEmailChange`), `StorageProvider` (`local`), `OAuthProvider` (Google **real**), **`PaymentGateway`** (`mock.provider` controlável nos testes e `mercadopago.provider`) e `buildPaymentGateway` (mock proibido em `APP_ENV=production`) | Drivers reais de e-mail e de imagem ficam para o deploy (D7, D8); `http-client` e `AntiBotProvider` `noop` apareceram no disco por outra sessão (não conferidos) |
| 4 Autenticação e perfil | **Feita no backend** | `/auth` (`register`, `login`, `google`, `forgot-password`, `reset-password`, `me`, `complete-profile`), `/users` (`me`, `PATCH`, `password`, `DELETE me`, `avatar`, `email-change` e `email-change/confirm`), `authenticate` e `authorizeRole` | Fatia do `openapi.yaml` (P1); `verify-email` e `resend-verification` desligados, ainda sem rota |
| 5 Categorias e anúncios | **Feita, backend e frontend** | `GET /categories`; `/listings` (`recent`, listagem, `mine`, `:id`, `:id/management`, `POST`, imagens, `PATCH`, `pause`, `reactivate`, `mark-sold`, `DELETE`); upload com `file-type`; filtro único de visibilidade. **Frontend integrado em 01/11/2026:** `categories.service`, `listings.service` (lista, detalhe, publicar com a 1ª foto no `POST /listings` e as extras em `/images`) e `my-listings.service` (lista, gerenciar, pausar, reativar, vender, excluir), com o exemplo isolado em `*.mock.ts` | Fatia do `openapi.yaml`; editar anúncio (`PATCH`) e remover foto ainda não têm tela ligada; o filtro por forma de contato não existe na API |
| 6 Pedidos | **Feita no backend** (commitada na `main`) | `/orders` (`POST`, `contact`, `mine`, `received`, `:id`, `arrange-pickup`, `confirm-receipt`, `complete`, `cancel`), reaproveitamento do pedido aberto, congelamento de preço, cancelamento sob demanda após 30 min, estoque atômico (`shared/database/stock.ts`); 22 testes de banco | Fatia do `openapi.yaml`; telas "meus pedidos", "recebidos" e "concluir venda" ainda sobre exemplo |
| 7 Pagamentos | **Feita no backend e no checkout** (commitada na `main`) | `/payments/card`, `/payments/pix`, `/payments/webhook` (HMAC, janela de 5 min, consulta o gateway), `settle` único, `estorno_pendente`, estorno com `await` e e-mail em background, `MAX_REFUND_ATTEMPTS=10`, rota de simulação só em dev; frontend: `tokenizeCard` e cinco funções de `orders.service` chamam a API; 23 testes de banco | Fatia do `openapi.yaml`; CPF do pagador (o Mercado Pago pode exigir); parcelas fixas em 1x; só a P3 confirma o Pix real |
| 8 Jobs | **Feita** (commitada na `main`) | `jobs/registry.ts`, `jobs.routes.ts` (`Bearer CRON_SECRET`, `timingSafeEqual`), `scheduler.ts` (só no `dev-server`), `expire-pix-payments`, `reconcile-pending-payments`, `cleanup-expired-tokens` | Configurar cron-job.org e Vercel Cron (Etapa 11) |
| 9 Admin e anonimização | **Feita** | Rotas `/admin/*` (usuários com filtro `presence`, anúncios, auditoria), proteção do último admin, estatísticas, anonimização; e-mail de exclusão em segundo plano | Fatia do `openapi.yaml` |
| 10 Integrações reais | **Parcial** (e-mail e imagens adiados para o deploy, decisão de 01/11/2026) | Google real; **`mercadopago.provider` escrito** (Payments API, ainda sem chamada real) com guia `docs/api/mercado-pago-passo-a-passo.md` | Testar o Mercado Pago com chaves de teste e túnel (P3); P4 (teste manual do Google). Sem Mailtrap, Resend, domínio nem Cloudinary nesta fase: e-mail no `console`, imagens no disco local; o deploy decide o provedor de e-mail e o armazenamento (ADR-009 e ADR-004 reabertos) |
| 11 Endurecimento e deploy | Não iniciada | — | `vercel.json`, workflows (testes e backup), `openapi.yaml` completo, cobertura de 80%, `/security-review` |
| 12 Avaliações e suporte | **Parcial (02/11/2026):** avaliações prontas no backend (migração 4, `POST /orders/:id/review`, `GET /listings/:id/reviews`); suporte e reembolso seguem **adiados** | Telas de avaliação ligadas à API; suporte e reembolso como protótipo | Aplicar a migração 4 no `unishop-prod` (roda no build da API) |

**Atrasos em relação ao plano:** o `openapi.yaml` (P1) deveria ter saído "por fatia" junto das etapas 4 a 8 e ainda não existe. Sobras das etapas 1 e 3: `shared/security`, `no-restricted-imports`, `http-client`, `AntiBotProvider`. **Revisão de 02/11/2026** (`/code-review` e `/security-review` no backend inteiro, antes do deploy): achados de pagamento e pedido listados no `CLAUDE.md` ("Pendências abertas"), ainda sem correção. **Próximos passos:** (1) corrigir os achados da revisão; (2) criar a conta de teste no Mercado Pago e fazer a P3; (3) Etapa 10 (e-mail e imagens reais, a decidir) e Etapa 11 (deploy).

## 2. Decisões e pendências que bloqueiam etapas

Resolver **antes** da etapa indicada. Nenhuma trava a Etapa 1.

| # | Pendência | Bloqueia | Quem | Proposta |
|---|---|---|---|---|
| P1 | `openapi.yaml` inexistente (backend §21 nº 2); **em 01/11/2026 continua inexistente, e as etapas 4 e 5 já foram feitas sem ele** | Etapa 4 em diante | Pedro | Escrever **por fatia**, junto de cada etapa (auth → listings → orders → payments → admin), não tudo de uma vez. É o "item 1" do Pronto de cada rota. |
| P2 | ~~Valores dos estados no JSON~~ **Decidido em 28/10/2026 (Francisco): banco em português, código e API em inglês, com o Prisma fazendo a ponte por `@map` nos enums.** Tabela de correspondência na seção 2.1. | — | — | Falta só corrigir a nota do `bd.md §7` ("os valores são os mesmos nos dois lados"), na Etapa 2, com o aval da Ana Clara. |
| P3 | Payments API × Orders API do Mercado Pago (ADR-002). **Decidido em 01/11/2026 (Pedro): Payments API**, já implementada no `mercadopago.provider`. **Falta a prova de conceito:** Pix de teste gerar o webhook de aprovação e conferir se o CPF do pagador é exigido (roteiro no guia `docs/api/mercado-pago-passo-a-passo.md`). Registrar a decisão no ADR-002 do `api.md`. | Etapa 10 (real) | Pedro | Fazer a prova de conceito com credenciais de teste e túnel. |
| P4 | Google institucional entrega `email_verified = true`? (§21 nº 1) | Etapa 10 | Francisco | Testar com e-mail `@edu.unifor.br` real. **Roteiro (01/11/2026):** subir o backend com `GOOGLE_CLIENT_ID` e o frontend com `VITE_GOOGLE_CLIENT_ID` (mesmo cliente OAuth, origem `http://localhost:5173`); entrar com uma conta `@edu.unifor.br`; esperado 200 com `needsTermsAcceptance=true` no primeiro acesso e, no banco, `google_sub` preenchido e `verificacao=true`; se vier 403 `EMAIL_NOT_VERIFIED`, a P4 falhou (plano B em `api.md` §4.1); conferir a tela de consentimento em modo "Testing" (usuário na lista de testadores) e se o Workspace da Unifor bloqueia apps de terceiros. **Ainda não testada.** |
| P5 | Papéis `unishop_*` no Supabase (SQL Editor; login pelo pooler como `papel.ref`), revogação de `anon`/`authenticated` e RLS com política por papel (migração `2_rls_politicas`; Deploy §7.5). **Resolvida em 31/10/2026 (`unishop-prod`) e 01/11/2026 (`unishop-dev`):** papéis, RLS, login pelo pooler e `pg_dump` testados nos dois projetos | — | — | — |
| P6 | Domínio próprio para o Resend (e talvez Google) | Deploy | Grupo | **Decidido em 01/11/2026 (gestor): sem Resend, Mailtrap nem domínio próprio por enquanto.** O e-mail fica no `console`; como o e-mail sai na Vercel não está definido (SMTP de uma conta Gmail, modo demonstração ou Resend com domínio). |
| P7 | **Prisma 7 × documentos.** O projeto instalou `prisma` e `@prisma/client` 7.10.1 com `@prisma/adapter-pg`; `bd.md`/`backend.md` descrevem `directUrl` no `schema.prisma`. Na versão 7 a URL de conexão sai do schema (arquivo `prisma.config.ts` + adapter). **Confirmado na Etapa 2:** `prisma.config.ts` (URL pela `DATABASE_URL_UNPOOLED`) e o adapter `pg` estão em uso, sem `directUrl` no schema. **Falta corrigir os documentos:** `deploy.md` §5.4 e `api.md` §6 ainda descrevem `directUrl` (ver `backend.md` §21). | Etapa 2 | Felipe + Ana Clara | Corrigir os trechos na revisão de 01/11/2026. |
| P8 | **Funcionalidades do frontend sem regra nem tabela** (commits `6be5b283`, `fb89e4d2` e `ecb08f1d`, já mesclados com a `main` em `c02c16b3`). Lista completa na seção 2.2. As Regras v0.4.1 e o Banco v0.2 não as mencionam, e os próprios tipos do frontend dizem "provisório". | Etapa 12 (adiada) | — | **Decidido em 01/11/2026 (confirmado por Pedro): fora do MVP, adiado.** As telas ficam só como protótipo no frontend; não implementar regra, tabela nem API. Para retomar: Regras → Banco → Backend, nessa ordem. |
| P9 | ~~**Motivo do cancelamento feito pelo sistema.**~~ **Resolvida em 01/11/2026:** `pedido.motivo_cancelamento` (`varchar(30)` anulável, `ck_pedido_motivo` com `vencido`, `sem_estoque` e `anuncio_indisponivel`) na migração `3_motivo_cancelamento`, aplicada no dev, no Docker e no `unishop-prod` (02/11/2026); a Ana Clara ainda pode pedir outros nomes (migração nova) | Etapa 2 | Ana Clara + Felipe | — Se a P8 voltar, a mesma coluna recebe os motivos do comprador. |
| P10 | **Conflito com uma decisão registrada.** `CLAUDE.md` e `bd.md §11` dizem "o dump de 07/10/2026 não é restaurado; o banco nasce só do Prisma". Francisco pediu em 28/10/2026 para **aproveitar o banco já criado**. **Decidido assim:** o dump entra como baseline `0_init` e o Prisma continua sendo a única via de evolução (nada de `psql` solto em ambiente compartilhado). | Etapa 2 | Francisco + Ana Clara | **Resolvida na prática (01/11/2026):** a `0_init` foi **gerada pelo Prisma** a partir do `schema.prisma` já na v0.2 (chaves `SERIAL`, convertidas em identity pela `1_regras_manuais`); o dump de 07/10/2026 não é restaurado em ambiente algum, e `CLAUDE.md` e `bd.md §11` continuam corretos ("o banco nasce só do Prisma"). |
| P11 | ~~Existe banco vivo?~~ **Respondido em 28/10/2026 (Francisco): não existe; só o script.** O repositório tem `Unishop_db.sql`, `unishop_db` (mesmo conteúdo, `pg_dump` 18.6, só estrutura, sem linhas) e `mer_unishop (2).drawio`. | — | — | Todo ambiente (dev, teste, preview, produção) nasce aplicando `0_init` e as migrações seguintes em banco vazio. Não há `migrate resolve` nem preenchimento de linhas antigas. |

### 2.1 Padrão de valores: banco × código e API

O banco continua em português. O código do backend, o JSON da API e o frontend usam inglês. A conversão deveria acontecer **só** no `schema.prisma`, com `@map` em cada valor do enum, e nenhum service nem tela converte nada. **Na implementação (conferida em 01/11/2026) ficou diferente:** o `schema.prisma` guarda os estados como `String` (o `CHECK` do banco garante os valores) e a conversão português ↔ inglês é feita nos *repositories* (ex.: `ListingStatus = 'active' | 'paused' | 'sold'` em `listings.types.ts`). Funciona, mas contradiz o `bd.md §7`; ver a pendência de documentação nº 4 do `backend.md §21` (manter assim ou migrar para enums com `@map`). Os valores em inglês são os que o frontend já usa; os marcados com * o frontend ainda não usa e são proposta.

| Coluna no banco | Banco → API |
|---|---|
| `usuario.tipo_usuario` | `aluno` → `student` · `admin` → `admin` |
| `usuario.status_conta` | `ativa` → `active` · `suspensa` → `suspended` · `excluida` → `deleted`* |
| `anuncio.status` | `ativo` → `active` · `pausado` → `paused` · `vendido` → `sold` |
| `pedido.status_pedido` | `pendente` → `pending` · `pago` → `paid` · `retirada_combinada` → `pickup_arranged` · `concluido` → `completed` · `em_negociacao` → `negotiating` · `cancelado` → `cancelled` |
| `pedido.forma_negociacao` | `pagamento_site` → `site_payment` · `whatsapp` → `whatsapp` |
| `pagamento.forma_pagamento` | `pix` → `pix` · `cartao` → `card` |
| `pagamento.status_pagamento` | `pendente` → `pending`* · `aprovado` → `approved`* · `recusado` → `declined`* · `expirado` → `expired`* · `estorno_pendente` → `refund_pending`* · `estornado` → `refunded`* |
| `pedido.motivo_cancelamento` (P9) | `vencido` → `expired` · `sem_estoque` → `out_of_stock` · `anuncio_indisponivel` → `listing_unavailable` (nomes no banco são proposta) |
| `log_admin.entidade`, `token_usuario.tipo` | Uso interno; enum em inglês com `@map`, mas não aparecem no JSON |

Observações:

- O `paymentMethod: 'on_delivery'` do frontend **não é um valor do banco**. É derivado: pedido com `forma_negociacao = whatsapp` não tem pagamento no site. A API devolve esse campo calculado, ou o frontend calcula a partir de `negotiation`; a escolha fica no `openapi.yaml` da Etapa 6.
- `refund_review` e `refund_approved` (estados de pedido no frontend) **não entram** no enum: dependem da P8.
- Textos exibidos ("Pago · aguardando retirada") continuam só na interface (`order-status.ts`), como manda o `backend.md §7`.

### 2.2 O que o frontend ganhou depois dos documentos (P8)

> **Filtro `contact` de `GET /listings` (D9, 01/11/2026):** não tem regra, coluna nem campo (a forma de negociação nasce no pedido, RN-PED-04 e 05; "local no campus" não existe). O backend não muda; os chips de forma de contato saem do frontend na integração. Registrado também em Regras §6 e §11.

Conferido nos commits `6be5b283`, `fb89e4d2` e `ecb08f1d`. Nenhum item abaixo existe nas Regras, no Banco ou no `backend.md`.

| Item na tela | Função no frontend | O que pediria no backend |
|---|---|---|
| Avaliar o item de um pedido concluído (0 a 5 estrelas, comentário) e ver avaliações na página do produto e no admin | `reviewOrder`, `getReviews`, `createReview`; `ProductReviews` no admin | Tabela nova, regra de quem pode avaliar (uma vez por pedido concluído?) e rotas |
| Motivo ao cancelar (`late_delivery`, `no_response`, `changed_mind`... e "Outros" com texto) | `cancelOrder(id, reason, details)` | Corpo novo em `POST /orders/:id/cancel` e coluna (a mesma da P9) |
| Pedido de reembolso com descrição; avisar que o reembolso não chegou | `requestRefund`, `reportRefundNotReceived`; estados `refund_review` e `refund_approved` | Estados novos de pedido, regra de quem aprova e ligação com `refundPayment`. Hoje as Regras dizem que pedido Pago não se cancela pelo sistema no MVP (RN-PED-12) |
| Solicitações de suporte no admin (abrir, analisar, resolver, negar) | `listSupportRequests`, `updateSupportRequestStatus`, `ResolveSupportDialog` | Tabela nova, rotas admin e log de auditoria |
| Prazo de entrega no detalhe do pedido | `deliveryDeadline` | As Regras dizem que a retirada é combinada pelo WhatsApp, sem prazo (RN-PED-09, 11). Proposta: a API devolve sempre `null` até haver regra |

Sem impacto no backend: tela de detalhes do pedido (`/meus-pedidos/:id`, usa o `GET /orders/:id` que já está no roteiro), filtros por status em "Meus pedidos" (feitos na tela, sobre a lista que a API já devolve) e a correção do "Sair" do admin (`session.ts`, `AdminRoute.tsx`).

### 2.3 O banco que já existe e o que falta nele

**O que o repositório `clarammacedo/unishop` tem (conferido em 28/10/2026):** 7 tabelas (`usuario`, `categoria`, `anuncio`, `imagem_anuncio`, `pedido`, `pagamento`, `log_admin`), com chaves `GENERATED ALWAYS AS IDENTITY`, FKs nomeadas (`fk_<filha>_<pai>`), `categoria.nome` único, `usuario.email` único e valores padrão de status (`ativo`, `em_negociacao`, `aluno`, `ativa`). É a v0.1 do banco, **anterior** ao `bd.md` v0.2. Os nomes de tabela e coluna já são os do `bd.md`, então o `@map` do Prisma funciona sem renomear nada. Não há linhas de dados.

**O ganho real de partir dele:** as tabelas, nomes, chaves e relações já foram desenhados e revistos pela Ana Clara, e a Etapa 2 não redesenha nada. O que **não** se evita é a diferença para a v0.2: o dump não tem `token_usuario`, nem cerca de 35 colunas, nem nenhum `CHECK` ou índice parcial. Dizer que o banco "está pronto" seria impreciso; ele é a base.

**Como a migração fica** (Prisma continua sendo a única via, P10):

| Migração | Conteúdo | Quando |
|---|---|---|
| `0_init` (baseline) | **Feita.** Gerada pelo Prisma a partir do `schema.prisma` (já na v0.2, chaves `SERIAL`, que a migração seguinte converte em identity). Aplicada em banco vazio no `unishop-prod`, no `unishop-dev` e no teste | Etapa 2 |
| (A) estrutura da v0.2 | **Feita dentro da `0_init`**: o schema já nasceu com as colunas novas, `token_usuario` e sem UNIQUE em `pagamento.id_pedido` | Etapa 2 |
| `1_regras_manuais` | **Feita.** `CHECK`, índices parciais, `lower(email)`, identity e a view `anuncio_visivel` (`bd.md §14`); os papéis ficam fora, criados à mão por ambiente | Etapa 2 |
| `2_rls_politicas` | **Feita (30/10/2026).** RLS ligada nas 8 tabelas e as políticas `app_all` e `backup_select` | Etapa 2 (decisão do Francisco) |
| `3_motivo_cancelamento` (B) | **Feita (01/11/2026)** (P9): coluna `varchar(30)` anulável e `ck_pedido_motivo`; aplicada no dev e no Docker, **falta o `unishop-prod`** | Etapa 2 |
| `4_avaliacao` (C) | **Feita (02/11/2026):** só a tabela `avaliacao` (a parte de suporte e reembolso da proposta C segue adiada); testada no Docker, **falta o `unishop-prod`** | Etapa 12 |

**A. Do dump para a v0.2** (fonte: `bd.md §13`; tipos e tamanhos exatos vêm do `bd.md §4`). Já é plano do grupo, não é funcionalidade nova.

Como todo ambiente começa vazio (P11), as colunas `NOT NULL` entram direto, sem preenchimento de linhas antigas.

| Tabela | O que falta no dump | Atenção ao aplicar |
|---|---|---|
| `usuario` | `data_aceite_termos`, `tentativas_login`, `bloqueado_ate`, `senha_alterada_em`, `google_sub`; `senha_hash` passa a aceitar `NULL`; índice em `lower(email)` | O `usuario_email_key` (único com maiúsculas) é substituído por `uq_usuario_email_lower`; Ana Clara confirma a remoção |
| `anuncio` | `whatsapp`, `excluido_em`, `vendido_em`; `descricao` passa a obrigatória | — |
| `imagem_anuncio` | `public_id` obrigatório; `ordem` única por anúncio | — |
| `pedido` | `id_vendedor`, `nome_produto`, `imagem_url`, `quantidade`, `preco_unitario`, `taxa_servico`, `concluido_em`, `atualizado_em` | — |
| `pagamento` | `data_expiracao`, `chave_idempotencia`, `data_criacao`, `tentativas_estorno`, `ultimo_erro`; **remover `pagamento_id_pedido_key`** (UNIQUE em `id_pedido`), porque a v0.2 guarda uma linha por tentativa | Sem isso, a segunda tentativa de pagamento do mesmo pedido falha |
| `log_admin` | `detalhes jsonb` | — |
| `token_usuario` | Tabela inteira, nova (RN-ACE-07, 10, RN-PER-02) | — |
| Todas | Colunas `timestamp` viram `timestamptz` | Sem dados, é só trocar o tipo |

**B. Funcionalidade nova do MVP que o banco ainda não tem** (**acontece na Etapa 2**, migração 3):

| O quê | Por quê | Mudança |
|---|---|---|
| `pedido.motivo_cancelamento` | A tela mostra por que o sistema cancelou o pedido (P9; RN-PAG-08, 12, 14) | Coluna `varchar` anulável com `CHECK` nos valores `vencido`, `sem_estoque`, `anuncio_indisponivel` (nomes propostos, conversão em 2.1). Os jobs e a liquidação gravam o motivo ao cancelar |

**C. Funcionalidades novas do frontend, ainda sem decisão do grupo** (**acontecem na Etapa 12**, migração 4, e nunca antes de a P8 ser aprovada e de Regras e `bd.md` serem atualizados). O desenho abaixo é **proposta** a partir dos tipos do frontend (`review.types.ts`, `support.types.ts`, `order.types.ts`), não decisão:

| Item do frontend | Mudança proposta no banco | Observação |
|---|---|---|
| Avaliação de um item concluído | Tabela `avaliacao`: `id_avaliacao`, `id_pedido` (**único**: uma por pedido concluído, a confirmar), `id_anuncio`, `id_avaliador`, `nota` (0 a 5 em passos de 0,5, `CHECK`), `comentario`, `data_criacao` | Admin não avalia; só o comprador de pedido `concluido`. O nome do autor vem do join, sem coluna |
| Solicitação de suporte (reembolso, cancelamento, outro) | Tabela `solicitacao_suporte`: `id_solicitacao`, `tipo` (`reembolso`/`cancelamento_pedido`/`outro`), `status` (`aberta`/`em_analise`/`resolvida`/`negada`), `id_usuario`, `id_pedido` anulável, `motivo`, `mensagem`, `id_admin` e `resolvido_em` anuláveis, `data_criacao` | Campos da resolução saem da leitura da `ResolveSupportDialog` quando a etapa começar |
| Fotos anexadas ao pedido de reembolso | Tabela `foto_solicitacao`: `id_foto`, `id_solicitacao`, `url_imagem`, `public_id`, `ordem` | Mesmo padrão e limite de 4 MB por requisição de `imagem_anuncio` |
| Estados `refund_review` e `refund_approved` do pedido | Dois valores novos no `CHECK` de `pedido.status_pedido` (propostas: `reembolso_em_analise`, `reembolso_aprovado`) e `pedido.reembolso_nao_recebido_em` (`timestamptz`, anulável) para o aviso de reembolso não recebido | Muda o RN-PED-12 (hoje pedido Pago não cancela). Exige decisão antes |
| Motivos de cancelamento do comprador (`late_delivery`, `no_response`, `changed_mind`, "Outros") | O `CHECK` de `motivo_cancelamento` ganha os valores do comprador e entra `pedido.detalhe_cancelamento` (`text`, anulável) para o texto de "Outros" | Estende a coluna do item B |
| Resolução de suporte pelo admin | `CHECK` de `log_admin.entidade` ganha `solicitacao_suporte` | Ação do admin continua gravando log na mesma transação (RN-ADM-10) |
| Prazo de entrega (`deliveryDeadline`) | **Nenhuma coluna.** A API devolve `null` | Contradiz RN-PED-09 e 11 (retirada combinada por WhatsApp) |

Sem mudança no banco: detalhes do pedido, filtros por status e a correção do "Sair" do admin (seção 2.2).

## 3. Visão geral das etapas

Ordem por dependência: cada etapa deixa algo **rodando e testado**, e o frontend troca o mock correspondente (seção 4).

| Etapa | Entrega | Depende de | Porte |
|---|---|---|---|
| 1 | Fundação da API: erros, logs, limites, config, testes | — | M |
| 2 | Banco: adotar o dump existente como `0_init`, levar à v0.2, motivo do cancelamento, seed | 1, P10 | M |
| 3 | Providers: interfaces + drivers falsos | 1 | M |
| 4 | Auth e perfil básico | 2, 3, P1, P2 | G |
| 5 | Categorias e anúncios | 4 | G |
| 6 | Pedidos | 5 | G |
| 7 | Pagamentos e liquidação | 6, 3 | G |
| 8 | Jobs agendados | 7 | M |
| 9 | Admin, exclusão e anonimização | 5, 6, 8 | G |
| 10 | Integrações reais (Google, e-mail, Cloudinary, Mercado Pago) | 4–9, P3, P4, P6 | M |
| 11 | Endurecimento, deploy e integração final | todas, P5 | G |
| 12 | Avaliações e suporte, com a migração 4 do banco (**só se P8 aprovar**) | 9 | M |

Marcos (todos verificados **no navegador**, frontend + API locais): **fim da 4** = cadastro, login e perfil reais; **fim da 5** = vitrine e anúncios reais; **fim da 7** = compra de ponta a ponta com provider falso; **fim da 9** = todas as rotas do §9 do backend.md prontas e o frontend sem dados de exemplo (salvo P8); **fim da 11** = produção.

### Regras de trabalho em todas as etapas

0. **Passo zero: consultar o grafo (`/graphify`).** Antes de codar, uma consulta com os termos da etapa, em português **e** em inglês (a busca é literal: "liquidação" acha os documentos, `settlePayment` acha o código), devolve o mapa do que ler: regras `RN-XXX-nn`, seções de cada documento, tabelas, rotas e pendências. Depois leio **só essas seções**. O grafo indica onde está; o documento continua sendo a fonte de verdade, e ligações marcadas como deduzidas (cerca de 2%) são conferidas no texto. Usos por etapa: `query` na abertura; `path` e `explain` para conferir se cada regra da etapa tem rota e teste; consulta dos consumidores no frontend (`OrderStatus`, `ApiError`, os services) antes de mudar um contrato. **Manutenção:** documento que mudou pede `/graphify . --update` (custa tokens, só relê os arquivos alterados); código novo entra no grafo sem custo, pelo gancho de commit ou por `--update`. A pasta `.claude/` e os ícones do frontend ficam fora do grafo (`graphify-out/.graphify_build.json`).
1. **TDD:** teste que falha, código mínimo, teste verde, commit (`feat:`/`fix:`/`docs:`). O nome do teste cita a `RN-XXX-nn` que ele cobre.
2. **Camadas:** route → controller → service → repository; módulo usa outro **pelo service**; `modules/` nunca importa `admin/` (regra verificada por `no-restricted-imports`, Etapa 1).
3. **Cada rota só é "pronta"** com os 8 itens do `backend.md §19` (contrato, Zod, perfil e dono, regra citada, testes, sem dado sensível em log, conferida com o front, PR revisado).
4. Se algo não estiver documentado, **dizer que não está definido** e perguntar; não inventar rota, campo ou regra.
5. Ao fechar cada etapa, seguir o fluxo do gestor (CLAUDE.md): revisar o código, rodar lint + tipos + build + testes e relatar o que **não** foi testado, e indicar os módulos do Roadmap de Estudo.
6. Antes do PR: `/code-review`; em auth, pagamento e admin também `/security-review`.

## 4. Integração com o frontend: junto, etapa por etapa

**A integração não fica para o fim.** Cada etapa de 4 a 9 é uma fatia vertical: contrato, backend e troca do service do frontend, fechando com o fluxo rodando no navegador contra a API local. As etapas 1 a 3 não mexem no frontend. Google e Mercado Pago reais entram só na 10; até lá o frontend fala com a API real, que usa os providers falsos.

### 4.1 O que o frontend tem hoje (conferido em 28/10)

| Ponto | Situação | Consequência |
|---|---|---|
| Alternância exemplo × real | Só `auth.service.ts` tem os dois caminhos (`MOCK_MODE` ? `auth.mock` : `api()`). Os outros services (categorias, anúncios, pedidos, perfil, admin, avaliações, suporte) **só têm dados de exemplo** em memória. | Cada service precisa ganhar o caminho real. O de exemplo sai para um `*.mock.ts`, no padrão do `auth`. |
| Chave única `VITE_USE_MOCKS` | Liga ou desliga tudo de uma vez. | Com a integração por etapa, parte do app é real e parte ainda é exemplo. A chave vira **por área** (ex.: `VITE_MOCK_AREAS=listings,orders,admin`), e cada área sai da lista quando a etapa dela fecha. O `MOCK_MODE` continua só em desenvolvimento e some do build de produção. |
| Cliente `api()` | Só envia JSON. | A Etapa 5 acrescenta `FormData` (upload de imagem) e o tratamento do 413 que já existe. |
| Sessão | `shared/lib/session` e `current-user` respondem com o usuário de exemplo. | A Etapa 4 troca os dois para o token real e o `GET /auth/me`. |
| Testes do frontend | Os testes de service e de tela usam os dados de exemplo. | Continuam valendo contra o `*.mock.ts`. O caminho real é coberto pelo E2E do Playwright contra a API local. |
| Recursos de demonstração | Contas de teste, links de redefinição de demonstração, controles do Pix e `TEST_CARDS` | Só aparecem no modo exemplo. No modo real, o cartão de teste é **tokenizado** (seção 4.3). |

### 4.2 Ciclo de cada etapa (4 a 9)

1. **Contrato da fatia.** Escrever o trecho do `openapi.yaml` a partir do `backend.md §9` e dos **tipos que o frontend já usa** (`*.types.ts`). Onde os documentos decidem, eles vencem e o frontend se adapta. Onde não decidem, o formato do frontend vira a proposta, para mudar o mínimo de tela. O que nenhum dos dois define vai para o gestor (P2).
2. **Backend em TDD.** Teste de unidade da regra (service com repository e provider falsos), depois o teste de integração da rota (Supertest com banco `*_test` real). Commits pequenos.
3. **Troca no frontend.** Mover o exemplo do service para `*.mock.ts`, escrever o caminho real com `api()`, mapear o formato da API para o tipo da tela **dentro do service** (os componentes não mudam) e tirar a área da lista de exemplos.
4. **Verificação no navegador.** API e frontend rodando localmente: os E2E da área no Playwright contra a API real e um passeio manual pelos estados (carregando, vazio, erro, 403, 404) com a skill `webapp-testing`.
5. **Fechamento** (fluxo do gestor): revisão do código; lint, tipos, build e testes nos **dois** pacotes; relato do que não foi testado; módulos do Roadmap de Estudo; `/code-review` (e `/security-review` em auth, pagamento e admin).

Uma etapa só termina quando o fluxo dela funciona no navegador com a API real. "Rotas verdes no Supertest" não basta.

### 4.3 Quais services trocam em cada etapa (`frontend/src/...`)

**Estado em 01/11/2026:** as linhas das etapas 4 e 5 **foram feitas** (`auth.service`, `profile.service`, `categories.service`, `listings.service`, `my-listings.service`; o `api()` já envia `FormData`). Verificado no navegador, com o backend num PostgreSQL local: login, categorias com contagem real, publicar anúncio com foto, lista da categoria, página do produto, "Meus anúncios" e pausar. Os exemplos continuam disponíveis atrás de `VITE_USE_MOCKS=true` (módulos `*.mock.ts`), usados pelos testes e pelo Playwright. **A linha 6 + 7 foi feita só no checkout** (`orders.service`: `createOrder`, `getOrderById`, `payWithCard`, `createPixCharge`, `confirmPixPayment`; `tokenizeCard` em `checkout/services/mercadopago.ts`), com a API quando `VITE_USE_MOCKS` não está ligado. Seguem sobre exemplo: "meus pedidos", pedidos recebidos em Gerenciar anúncio e "concluir venda" (a API já existe). A 8 não pede troca de tela e a 9 foi feita em 02/11/2026 para **usuários e produtos do admin** (lista, busca, filtros, detalhe, status, exclusão; verificado no navegador com a API local), a **Fatia 4 (acabamento)** em 02/11/2026 (carrossel da home pela API, suporte sem dado de exemplo fora da demonstração, E2E do Playwright em porta própria e o "Sair" nas páginas do aluno) e a **Fatia 2 (sessão e perfil)** em 02/11/2026: `PrivateRoute` com `GET /auth/me` e aceite dos Termos, login com Google (botão oficial; falta o teste P4 com e-mail `@edu.unifor.br` real), completar cadastro, troca de e-mail por link, foto do perfil e exclusão de conta com o bloqueio por pedido em aberto (verificado no navegador com a API local; as telas sem Figma são provisórias; a troca de senha logado ficou **fora do frontend** por decisão de 02/11/2026, e a rota `POST /users/me/password` segue no backend); avaliações (fora do MVP) vêm vazias.

| Etapa | O que troca no frontend | Observação |
|---|---|---|
| 4 | `areas/public/auth/services/auth.service.ts` (já tem o caminho real; conferir o contrato), `shared/lib/session` e `current-user`, `areas/user/profile/services/profile.service.ts` (menos foto e exclusão) | O botão do Google segue no modo exemplo até a Etapa 10; a API já aceita o ID token de teste do provider falso |
| 5 | `areas/user/categories/services/categories.service.ts`, `areas/user/listings/services/listings.service.ts`, `my-listings.service.ts`, `listings.details.ts`, foto do perfil; `api()` com `FormData` | O formulário de anúncio passa a enviar a 1ª imagem no `POST /listings` e as demais uma por chamada |
| 6 + 7 | `areas/user/orders/services/orders.service.ts` (pedidos **e** pagamento), pedidos recebidos em Gerenciar anúncio | As duas etapas fecham a integração **juntas**: o fluxo do frontend vai do pedido direto ao pagamento, e integrar só pedidos deixaria o checkout quebrado no meio. O cartão vai à API como **token** do provider falso (ex.: `tok_approved`, `tok_declined`, `tok_out_of_stock`, mapeados dos `TEST_CARDS`); número de cartão **nunca** vai à API, nem em teste (RN-PAG-02) |
| 8 | Nada | Conferir no navegador o pedido Pix vencido aparecendo como Cancelado |
| 9 | `areas/admin/products/services/products.service.ts`, `areas/admin/users/services/users.service.ts`, exclusão do perfil | Fim da 9: `VITE_MOCK_AREAS` fica vazio, salvo avaliações e suporte (P8) |
| 10 | SDK do Mercado Pago no formulário de cartão; botão do Google real | Dependem de P3, P4 e P6 |
| 12 | `reviews.service.ts`, `support.service.ts` | Só se P8 aprovar; até lá seguem como exemplo |

---

## Etapa 1 — Fundação da API

**Status (01/11/2026): quase feita**, ver a seção 1.1 (faltam `shared/security` e `no-restricted-imports`).

**Objetivo:** esqueleto que toda rota seguinte reaproveita. Parte do andaime existente.

**Entregas**
- `shared/errors`: `AppError` e derivados (`NotFoundError`, `ForbiddenError`...), com os códigos do `backend.md §15`.
- `shared/middlewares`: `errorHandler` (formato único `{ error: { code, message, details, requestId } }`; Zod → 400 `VALIDATION_ERROR`; nunca stack trace), `notFound`, `validate` (Zod em body/params/query), `rateLimiter` (geral 100/min, `/auth` 10/min, webhook 300/min; `trust proxy = 1`), request-id + `pino-http` com `redact` (senha, JWT, token de cartão, WhatsApp completo; corpo de `/auth` e `/payments` nunca).
- `config/constants.ts` (4 MB, 5 imagens, 30 min, 5 tentativas, 15 min, 5 min "logado agora", limites de campo das Regras §9) e `config/cors`.
- `shared/security`: `Secret` (não imprime), `redact`; trava de produção em `env.ts` por `APP_ENV` (drivers `mock`/`console`/`local` proibidos em `production`, `backend.md §13`).
- `shared/utils`: `money` (centavos), `pagination` (`limit` padrão 20, máx. 50, `meta`), `whatsapp` (10 ou 11 dígitos, RN-PER-07).
- `GET /health` (já existe) e `GET /health/db` (`SELECT 1`; entra completo na Etapa 2).
- ESLint `no-restricted-imports` (controller→service do próprio módulo; `modules/` ⇏ `admin/`; serviço externo só via `shared/providers`).
- Infra de testes: script `test:db` que sobe o `docker-compose.test.yml`, helper de factories e de truncar tabelas, Vitest separando `unit` e `integration`. Adicionar `@vercel/functions`.

**Testes obrigatórios:** formato de erro único para 400/401/404/500; rota inexistente → `NOT_FOUND`; log não contém `Authorization` nem senha; rate limit devolve 429; env inválido derruba o boot; driver `mock` com `APP_ENV=production` derruba o boot.

**Pronto quando:** `npm run lint && npx tsc --noEmit && npm test` verdes e o `app.ts` sem nenhum `listen`.

**Skills:** `unishop-backend`, `unishop-api` (travas e segredos). **Estudar:** C2 (Node e Express), C3 (arquitetura do backend: camadas, erros, logs).

## Etapa 2 — Banco de dados

**Status (01/11/2026): feita**, incluindo a migração `3_motivo_cancelamento` (falta aplicá-la no `unishop-prod`). Os nomes das migrações abaixo eram o plano; os reais estão na seção 2.3.

**Objetivo:** partir do banco que a Ana Clara já criou (repositório `clarammacedo/unishop`), levá-lo ao estado do `bd.md` v0.2 e acrescentar o que as funcionalidades novas pedem, tudo **só por migrações do Prisma** e testado em banco vazio. Não se desenha o banco de novo. O quadro completo de o que existe, o que falta e quando está na **seção 2.3**.

**Entregas**
- Spike P7 (Prisma 7: `prisma.config.ts`, adapter `pg`, conexão pooled × direta).
- Resolver P10 (corrigir `bd.md §11` e a frase do `CLAUDE.md`). A P11 já está respondida: não há banco vivo.
- **Baseline `0_init`:** copiar a estrutura de `Unishop_db.sql` (sem `OWNER TO postgres` e sem `\restrict`). Subir um Postgres 17 vazio com ela, rodar `prisma db pull` e conferir o resultado contra o dump.
- **Migração 1, `1_v02_estrutura`** (seção 2.3, item A): colunas, tipos, `token_usuario` e remoção do UNIQUE de `pagamento.id_pedido`. Revisada à mão, porque o Prisma gera o diff entre o schema e o banco, mas o `NOT NULL` em tabela com linhas precisa de preenchimento.
- **Migração 2, `2_v02_regras`:** o SQL do `bd.md §14` sem alteração (`CHECK`, índices parciais `uq_pedido_aberto` e `uq_pagamento_ativo`, `lower(email)`, view `anuncio_visivel`, papéis).
- **Migração 3, `3_motivo_cancelamento`** (item B, **funcionalidade nova**): `pedido.motivo_cancelamento` com `CHECK`. Atualizar o `bd.md §4.5 e §6` no mesmo PR, com o aval da Ana Clara. Correção da nota do `bd.md §7` sobre os valores (P2) junto.
- `prisma/schema.prisma` com as 8 tabelas e `@map`/`@@map` (`bd.md §7`). Enums com nomes em inglês e cada valor com `@map` para o valor em português do banco (seção 2.1). Os nomes de tabela e coluna do dump já coincidem com o `bd.md`, então quase todo `@map` é de enum.
- `prisma/seed.ts`: 6 categorias fixas e a conta admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD`), idempotente (RN-CAT-01, RN-ADM-11).
- `config/database.ts` (cliente único) e `db:reset` funcionando.
- `/health/db` real.

**Testes obrigatórios:** os "testes rápidos de integridade (devem falhar)" do `bd.md §14` viram testes de integração (estoque negativo, 6ª imagem, e-mail duplicado em maiúsculas, dois pedidos abertos iguais, dois pagamentos ativos); seed rodado duas vezes não duplica; **as quatro migrações aplicadas em sequência num banco vazio** dão o mesmo schema que o `schema.prisma`; segunda tentativa de pagamento no mesmo pedido é aceita (prova de que o UNIQUE antigo saiu); `motivo_cancelamento` recusa valor fora da lista.

**Pronto quando:** `db:reset` + seed num banco vazio passam e a Ana Clara confere o schema contra o DER (divergências do `bd.md §12` anotadas).

**Skills:** `unishop-database`, `supabase-postgres-best-practices`. **Estudar:** D1 (SQL, restrições), D2 (Prisma, migrações, papéis), D3 (índice único parcial; já prepara a Etapa 6).

## Etapa 3 — Providers e drivers falsos

**Status (01/11/2026): parcial**, ver a seção 1.1.

**Objetivo:** tudo que é externo atrás de interface, **com driver falso funcional**, para as etapas 4–9 não dependerem de conta alguma.

**Entregas** (`shared/providers/`, `backend.md §13` e `api.md §6`)
- `http-client.ts` (timeout 10 s → `EXTERNAL_SERVICE_ERROR`), `index.ts` (`buildProviders(env)` escolhe o driver).
- `MailProvider`: `console.provider` (e templates: redefinir senha, venda, exclusão, estorno) — Resend/Mailtrap na Etapa 10.
- `StorageProvider`: `local.provider` (pasta `uploads/`, fora do Git).
- `PaymentGateway`: interface completa (`createCardPayment`, `createPixPayment`, `getPayment`, `verifyWebhook`, `cancelPayment`, `refundPayment`) + `mock.provider` **controlável nos testes** (aprovar, recusar, falhar o estorno, assinar webhook).
- `OAuthProvider`: interface + fake que aceita ID token de teste.
- `AntiBotProvider`: `noop`.

**Testes obrigatórios:** timeout vira 502/503 sem detalhe; `buildProviders` recusa mock em `production`; `Secret` nunca aparece em `JSON.stringify` nem em log.

**Skills:** `unishop-api`. **Estudar:** C3, E3 (por que o gateway fica atrás de interface).

## Etapa 4 — Autenticação e perfil básico

**Status (01/11/2026): feita no backend**; o frontend já chama `auth.service` e `profile.service` (menos foto e exclusão).

**Objetivo:** login real no frontend.

**Rotas:** `POST /auth/register`, `login`, `google`, `forgot-password`, `reset-password`, `GET /auth/me`; `GET /users/me`, `PATCH /users/me`, `POST /users/me/password`, `POST /users/me/complete-profile`. Fora do MVP, atrás de `EMAIL_VERIFICATION_REQUIRED`: `verify-email`, `resend-verification` (implementar só o desvio, desligado).

**Entregas:** `shared/utils/hash` (bcrypt 12), `config/jwt` (HS256, 2 h), `authenticate` (ordem do `§8`: sem cabeçalho, inválido/expirado, usuário inexistente, suspenso, `senha_alterada_em`, `TERMS_NOT_ACCEPTED`), `authorizeRole`, `loginAttempts` (5 erros = bloqueio 15 min no banco, `bloqueado_ate`), `trackLastSeen` (`UPDATE` condicional de 1/min), módulo `tokens` (só o hash vai ao banco; 30 min, uso único), `users` e `auth` no molde do módulo. Escrever o `openapi.yaml` desta fatia (P1, P2).

**Regras:** RN-ACE-01 a 06, 08 a 15, RN-PER-01, 07, RN-ADM-11 (`register` nunca cria admin).

**Testes obrigatórios** (`backend.md §19`): e-mail fora do domínio; e-mail repetido com maiúsculas; senha fraca; sem aceite dos Termos; 5ª senha errada bloqueia; erro genérico (não revela e-mail); link de redefinição expirado ou reaproveitado; token expirado; **token anterior à troca de senha = 401**; suspenso barrado; Google com domínio errado ou não verificado; senha atual errada = 400 `CURRENT_PASSWORD_INVALID`; `Bearer undefined` recusado; `forgot-password` responde 202 igual existindo ou não; conta Google sem senha tentando login por senha = `INVALID_CREDENTIALS`.

**Pronto quando:** frontend em modo real faz cadastro, login, Google (com ID token de teste), recuperação e troca de senha; `/security-review` feito.

**Skills:** `unishop-backend`, `unishop-rules`, `unishop-api`. **Estudar:** E1 (hash, JWT, bloqueio, Google), E2 (autorização por papel e dono), C4 (contrato), B2 (como o front guarda a sessão).

## Etapa 5 — Categorias e anúncios

**Status (01/11/2026): feita**, no backend e no frontend (seção 4.3). Falta a fatia do `openapi.yaml`.

**Rotas:** `GET /categories`; `GET /listings/recent` (única pública, **sem WhatsApp**), `GET /listings`, `/mine`, `/:id`, `/:id/management`, `POST /listings` (multipart, 1ª imagem), `POST /listings/:id/images`, `DELETE /listings/:id/images/:imageId`, `PATCH`, `pause`, `reactivate`, `mark-sold`, `DELETE`; `PUT /users/me/avatar`.

**Entregas:** `upload` (multer em memória, 4 MB, `file-type` pelo conteúdo, nome descartado), **filtro único de visibilidade** em função do repository (a mesma para listagem, busca, carrossel e contagem), `listings.rules.ts` (`assertCanTransition`), serialização que só inclui WhatsApp em rota autenticada, contadores de indicadores, compensação (remover do storage se o banco falhar). `DELETE` já aplica o bloqueio `HAS_OPEN_PAID_ORDERS` consultando a tabela `pedido` (existe desde a Etapa 2); o cancelamento dos pedidos Pendentes/Em negociação é completado na Etapa 6.

**Regras:** RN-CAT-01 a 04, RN-ANU-01 a 12, RN-EST-01, 05, 06, RN-PER-05, RF017.

**Testes obrigatórios:** visitante em categorias/listagem/produto = 401; carrossel sem WhatsApp; 6ª imagem recusada; arquivo `.png` que é outro formato recusado; imagem > 4 MB = 413; pausado/vendido/excluído/dono suspenso some e dá 404 a terceiros; dono vê o próprio em qualquer status; admin e terceiro em anúncio alheio = 403; admin não cria anúncio; visualização +1 só para quem não é o dono; falha no banco remove a imagem do storage; só o admin reverte `Vendido` (a rota admin vem na Etapa 9, mas o dono não pode).

**Pronto quando:** front em modo real navega categorias, busca, cria e gerencia anúncios.

**Skills:** `unishop-backend`, `unishop-database`, `unishop-rules`. **Estudar:** C4 (paginação e filtros), E2 (sanitização, upload), D1 (índices e a view).

## Etapa 6 — Pedidos

**Status (01/11/2026): feita no backend** (não commitada; 22 testes de banco). Falta a fatia do `openapi.yaml`, ligar as telas de pedidos ao `orders.service` e aplicar a `3_motivo_cancelamento` no `unishop-prod`.

**Rotas:** `POST /orders`, `POST /orders/contact`, `GET /orders/mine`, `/received`, `/:id`, `POST /orders/:id/arrange-pickup`, `confirm-receipt`, `complete`, `cancel`.

**Entregas:** `orders.rules.ts` com a máquina de estados do `§12`; congelamento de vendedor, produto, imagem, preço e taxa (RN-PED-01); **reaproveitamento do pedido aberto** (RN-PED-10) apoiado no `uq_pedido_aberto`; **cancelamento sob demanda** do Pendente com mais de 30 min ao ler o pedido (RN-PAG-12); desconto de estoque atômico em `orders.repository.ts` (`UPDATE ... WHERE quantidade >= n`) usado por `complete` e, depois, pela liquidação; cancelamento em lote dos pedidos abertos quando o anúncio é excluído.

**Regras:** RN-PED-01 a 13, RN-EST-02 a 06, RN-ANU-10, 08.

**Testes obrigatórios:** os dois caminhos de pedido; dono não pede o próprio anúncio (`OWN_LISTING`); admin não pede; quantidade > disponível; novo clique reaproveita; **duas conclusões simultâneas da última unidade: só uma conclui** (`Promise.all` contra o banco real); concluir sem estoque = 409 e o pedido segue Em negociação; zerar estoque → anúncio `Vendido` na mesma transação; comprador não confirma antes da Retirada combinada; vendedor não confirma recebimento; Pago e Retirada combinada não cancelam por `/cancel`; pedido de terceiros = 403; ordem de "meus pedidos".

**Pronto quando:** todas as rotas de pedido verdes no Supertest, e no navegador o contato por WhatsApp, a conclusão pelo vendedor e o histórico funcionam com a API real. O caminho "Seguir para o pagamento" só passa para a API real com a Etapa 7 (seção 4.3).

**Skills:** `unishop-backend`, `unishop-database`, `supabase-postgres-best-practices` (transação e lock). **Estudar:** D3 (ACID, condição de corrida, atualização atômica — é o teste mais importante do projeto), C3.

## Etapa 7 — Pagamentos e liquidação

**Status (01/11/2026): feita com o `mock.provider` e com o `mercadopago.provider` escrito, mas este nunca foi chamado de verdade** (23 testes de banco; checkout integrado). Falta a P3, o `openapi.yaml` e o `/security-review`.

**Rotas:** `POST /payments/card`, `POST /payments/pix`, `POST /payments/webhook` (sem JWT, assinado).

**Entregas:** `payments.service` (valor e taxa só no servidor, em centavos; `SERVICE_FEE_PERCENT`), uma linha de `pagamento` por tentativa com chave de idempotência que inclui o número da tentativa, **`settlePayment`** único (transação, `FOR UPDATE` no pedido; idempotente; ramos Pago / Cancelado tardio / anúncio inativo ou vendedor suspenso / estoque), `refundPayment` com `estorno_pendente` gravado **antes** da chamada ao gateway, `await` no estorno e `waitUntil` no e-mail, webhook que **consulta o gateway** antes de confiar, `notifications.service` (RN-NOT-01, 03), `PIX_EXPIRED`.

**Regras:** RN-PAG-01, 02, 04 a 14, RN-PED-02, RN-EST-03/04, RN-NOT-01/03/04. (RN-PAG-03 e 15 são só do front.)

**Testes obrigatórios** (todos com o `mock.provider`): total = preço × quantidade + taxa; recusado cria nova linha e permite tentar de novo (402); webhook duplicado não desconta nem notifica duas vezes; webhook sem assinatura = 401; pedido pago só por webhook (retorno do navegador não confirma); estoque acabou antes → pedido cancelado + estorno + e-mail; **pagamento aprovado em pedido já cancelado é estornado**; anúncio pausado/excluído/vendedor suspenso na confirmação cancela e estorna; estorno que falha deixa `estorno_pendente` (o job refaz, Etapa 8); Pix em pedido cancelado = 409 `PIX_EXPIRED`; duas liquidações concorrentes do mesmo pedido; nenhum dado de cartão em log ou no banco (só `id_transacao_gateway`).

**Pronto quando:** compra de ponta a ponta no front com o `mock.provider` (cartões de teste `TEST_CARDS` do front ↔ cenários do mock); `/security-review` feito.

**Skills:** `unishop-backend`, `unishop-api`, `unishop-database`, `unishop-rules`. **Estudar:** E3 (webhook, HMAC, idempotência, estorno), D3, E4 (`await` × `waitUntil`).

## Etapa 8 — Jobs agendados

**Status (01/11/2026): feita** (endpoint com `CRON_SECRET`, três jobs e agendador no `dev-server`; falta só configurar os agendadores externos na Etapa 11).

**Entregas:** `jobs/registry.ts` (nome → função, sem `node-cron`), `jobs/scheduler.ts` (só o `dev-server.ts` importa), `GET /api/v1/internal/jobs/:name` com `Bearer CRON_SECRET` via `timingSafeEqual` (sem `authenticate`, sem rate limit), e os três jobs: `expire-pix-payments`, `reconcile-pending-payments` (confere pendentes no gateway e refaz estornos, até 10 tentativas, `ultimo_erro`), `cleanup-expired-tokens`.

**Regras:** RN-PAG-04, 05, 08, 12, 13, RN-ACE-10.

**Testes obrigatórios:** `Bearer undefined`, `Bearer [REDACTED]`, sem cabeçalho e segredo errado = 401; cada job **rodado duas vezes dá o mesmo resultado**; pedido pendente de 30 min cancela e cobrança é cancelada no gateway; webhook perdido é corrigido pelo reconcile; estorno pendente é refeito e após 10 falhas registra o erro.

**Skills:** `unishop-backend`, `unishop-deploy` (endpoints em vez de processo). **Estudar:** E4 (serverless, jobs como endpoints, idempotência).

## Etapa 9 — Admin, exclusão e anonimização

**Status (02/11/2026): backend feito; frontend de usuários e produtos do admin integrado.** Suporte, avaliações e auditoria do admin não entram (fora do MVP ou sem tela). Achado da integração: a lista `GET /admin/listings` não devolvia a descrição (a tabela do Figma mostra duas linhas dela); passou a devolver `description` em 02/11/2026.

**Rotas:** `GET /admin/users`, `/stats`, `/:id`, `PATCH /admin/users/:id`, `DELETE /admin/users/:id`; `GET /admin/listings`, `/stats`, `/:id`, `PATCH`, `DELETE`; `GET /admin/audit-logs`; `DELETE /users/me`; e o desvio de `POST /orders/:id/cancel` do vendedor já feito na 6.

**Entregas:** `admin.routes.ts` com `authenticate` + `authorizeRole("admin")` **uma vez**; `audit-logs.service` chamado **na mesma transação** da ação (sem log, sem ação); serviço de **anonimização** compartilhado por `DELETE /users/me` e `DELETE /admin/users/:id` (`bd.md §10`); `PATCH` aceitando **só** `status` (qualquer outro campo = 400); `ADMIN_PROTECTED` (não suspende nem exclui a si mesmo; último admin ativo protegido); e-mail ao vendedor na exclusão (RN-NOT-02); estatísticas do `bd.md §9.4`; "logado agora" = 5 min.

**Regras:** RN-ADM-01 a 12, RN-PER-06, RN-ANU-09, RN-NOT-02.

**Testes obrigatórios:** aluno em rota admin = 403; edição aceita só status; admin não suspende a si mesmo; último admin não sai; toda ação grava log (e falha de log desfaz a ação); exclusão bloqueada com pedido Pago/Retirada combinada em aberto (como comprador **e** como vendedor) e cancela Pendente/Em negociação quando permitida; anonimização apaga nome, WhatsApp, curso, foto, hash e `google_sub`, libera o e-mail e mantém pedidos pagos mostrando "Usuário removido"; suspender barra o login e oculta anúncios sem apagar; só o admin reverte `Vendido`, com log.

**Pronto quando:** front admin em modo real; todas as rotas do `backend.md §9` existem; `/security-review` feito.

**Skills:** `unishop-backend`, `unishop-rules`, `unishop-database`. **Estudar:** E2 (autorização e LGPD), D2 (transações e anonimização).

## Etapa 10 — Integrações reais

**Status (01/11/2026): parcial** (o Google real e o `mercadopago.provider` já estão no código; faltam o teste real do Mercado Pago, Mailtrap, Resend e Cloudinary).

Troca de driver por variável, **sem mudar service nem controller** (é o teste de que a Etapa 3 foi bem feita). Uma integração por vez, cada uma com a trava de produção testada.

| Integração | O que fazer | Pendência |
|---|---|---|
| Google | `google.provider` com `google-auth-library` (audiência = `GOOGLE_CLIENT_ID`, `email_verified`, domínio) | P4 |
| E-mail | `mailtrap` em dev, `resend` em produção | P6 |
| Imagens | `cloudinary.provider`, pasta por ambiente (`unishop-dev`/`unishop-prod`) | — |
| Mercado Pago | `mercadopago.provider` (cartão por token, Pix, `getPayment`, `refundPayment`, HMAC com janela de 5 min), túnel para o webhook em dev, credenciais de **teste** (RN-PAG-10) | P3 |

**Testes:** contrato dos providers reais contra o sandbox (manual, documentado, fora do CI); o mesmo conjunto de testes de integração da Etapa 7 roda trocando só o driver; produção recusa credencial `sandbox` trocada (`PAYMENT_MODE`) e driver falso.

**Skills:** `unishop-api`, `resend`, `email-best-practices`. **Estudar:** E3 (Cloudinary, Resend, Mercado Pago), F2 (segredos por ambiente).

## Etapa 11 — Endurecimento, deploy e integração final

**Status (01/11/2026): não iniciada.**

**Entregas**
- Cobertura mínima de **80%** nos services de `auth`, `payments`, `listings` e `orders`; revisão com `/code-review` e `/security-review` da branch inteira; CSP e cabeçalhos (`unishop-api`/`unishop-deploy`).
- `openapi.yaml` completo e conferido contra as rotas reais; opcional: teste de contrato.
- Deploy (`unishop-deploy`): `vercel.json`, `scripts/vercel-build.sh` (`prisma generate` + `migrate deploy`), variáveis por ambiente, `APP_ENV`, projetos Supabase `unishop-prod` e `unishop-dev` (P5), `CRON_SECRET`, cron-job.org a cada 30 min nos dois jobs frequentes, Vercel Cron diário, UptimeRobot no `/health`, workflow de backup no GitHub Actions. **Só executar deploy, troca de variável ou restauração se o gestor pedir, confirmando o alvo (preview ou produção).**
- Frontend: remover `VITE_USE_MOCKS` do caminho de produção; E2E Playwright completo contra a API; aviso de ambiente de demonstração (RN-PAG-15).
- Atualizar `CLAUDE.md`, as skills `unishop-*` (campo `version` e `evals/`) e os documentos que mudaram (P7, enums de P2).

**Pronto quando:** compra Pix e cartão de ponta a ponta em produção com credenciais de teste, jobs rodando, backup restaurado em teste e checklist do `deploy.md` marcado.

**Skills:** `unishop-deploy`, `vercel-cli-with-tokens`, `webapp-testing`. **Estudar:** F2 (deploy), F3 (limites e backup), G1 (defesa de uma compra de ponta a ponta).

## Etapa 12 — Avaliações e suporte (avaliações feitas; suporte e reembolso adiados)

**Atualização de 02/11/2026:** Francisco decidiu levar as **avaliações** ao MVP. Feito: Regras v0.4.4 (RN-AVA-01 a 05), `bd.md` v0.2.4 (tabela `avaliacao`, seção 4.9), migração `4_avaliacao` (tabela, `CHECK` da nota, índice, RLS e políticas na mesma migração), módulo `backend/src/modules/reviews` (`POST /orders/:id/review`, `GET /listings/:id/reviews`), `reviewed` no JSON do pedido e testes (`tests/unit/reviews.service.test.ts` e `tests/db/reviews.http.test.ts`). **Suporte, reembolso e o resto da proposta C seguem adiados**; o texto abaixo continua sendo o plano para quando o grupo os retomar.

**Status (01/11/2026): adiada.** Decidido que reembolso, cancelamento de pedido Pago, avaliações e suporte ficam **fora do MVP**; o texto abaixo é o plano para o dia em que o grupo retomar. Só começa depois de o grupo decidir. Ordem obrigatória: **Regras de Negócio → Banco de Dados → Backend → `openapi.yaml` → código**, mais a skill correspondente revisada. Escopo a definir: avaliação (um aluno avalia uma vez por pedido concluído?), solicitação de suporte/reembolso (quem decide o estorno? o `refundPayment` já existe), fotos anexas (limite de 4 MB por requisição se valer), motivos de cancelamento. **Nada disso está definido hoje**; os tipos do frontend são formato assumido.

**Banco nesta etapa (é aqui que ele muda por causa das funcionalidades novas):** migração `4_avaliacao_suporte`, com as tabelas `avaliacao`, `solicitacao_suporte` e `foto_solicitacao`, os dois estados novos de `pedido.status_pedido`, `pedido.reembolso_nao_recebido_em`, `pedido.detalhe_cancelamento`, os motivos do comprador no `CHECK` de `motivo_cancelamento` e `solicitacao_suporte` em `log_admin.entidade`. O desenho está na seção 2.3, item C. A migração **só é gerada depois** de a P8 aprovar cada item e de Regras e `bd.md` descreverem a mudança; item não aprovado fica de fora. Sendo aditiva, não mexe nas etapas 1 a 11, e o frontend segue com exemplos nessas telas até lá.

---

## 5. Caminho crítico e paralelismo

- **Caminho crítico:** 1 → 2 → 4 → 5 → 6 → 7. É a sequência que o front espera para sair dos mocks.
- **Em paralelo:** Etapa 3 corre ao lado da 2 (só depende da 1); P1 (Pedro, `openapi.yaml` da fatia seguinte) corre ao lado do código da etapa atual; P3, P4, P5 e P6 são ações externas que podem ser feitas a qualquer momento antes da Etapa 10.
- **Riscos principais:** (1) concorrência de estoque e liquidação idempotente — cobrir com testes contra banco real desde a Etapa 6, nunca só mocks; (2) divergência de contrato front × back (P2) — resolver na Etapa 4; (3) pausa do projeto Supabase por inatividade e falta de backup automático (jobs de 30 min e o workflow diário mitigam).

## 6. Primeiro passo sugerido

**Atualização de 01/11/2026:** o roteiro foi aprovado, as etapas 2, 4 e 5 estão prontas no backend e no frontend, e a migração `3_motivo_cancelamento` existe. O próximo passo é fechar as lacunas das etapas 1 e 3 e escrever as fatias do `openapi.yaml` das etapas 4 e 5; só então seguir a Etapa 6.


*Texto original (28/10/2026):* Aprovar este roteiro, resolver **P7** (spike do Prisma 7) e iniciar a **Etapa 1** em TDD sobre o andaime existente, na `Branch-Do-Magno`, em commits pequenos. Em paralelo, levar à Ana Clara a confirmação do dump como baseline (**P10**), a **P9** (coluna do motivo de cancelamento) e a correção do `bd.md §7` (P2), e preparar no frontend a chave de exemplos por área (seção 4.1), que é pequena e destrava a integração gradual. Cada etapa ganha, quando começar, o seu plano detalhado de tarefas (arquivo, assinatura, teste, comando de verificação) em `docs/superpowers/plans/`, para não congelar agora decisões que dependem do que as etapas anteriores revelarem.
