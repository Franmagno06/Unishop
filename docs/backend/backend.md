---
title: Documentação Técnica — Backend
project: Unishop
version: 0.3
date: 2026-10-16
status: vigente com pendências
owners: Felipe Bessa (backend)
reviewers: Pedro Cândido (engenheiro de API), Ana Clara (banco de dados), Francisco Magno (integração front-back)
based_on: Regras de Negócio v0.4, requisitos RF001–RF024 e RNF001–RNF016
related: docs/regras-de-negocio/regras-de-negocio.md, docs/banco-de-dados/banco-de-dados.md, docs/api/api.md, docs/frontend/frontend.md, docs/deploy/deploy.md
context: README.md, docs/README.md
pendencias: seção 21
language: pt-BR (código e pastas em inglês; interface em português)
---

# Documentação Técnica — Backend

- Versão 0.3 · 16/10/2026
- Base: Regras de Negócio v0.4, requisitos RF001–RF024 e RNF001–RNF016
- Responsável: Felipe Bessa (backend) · Revisores: Pedro Cândido (engenheiro de API), Ana Clara (banco de dados), Francisco Magno (integração front-back)
- Documentos relacionados: Regras de Negócio (`docs/regras-de-negocio/regras-de-negocio.md`) · Banco de Dados (`docs/banco-de-dados/banco-de-dados.md`) · API e segurança das APIs externas (`docs/api/api.md`) · Frontend (`docs/frontend/frontend.md`) · Deploy (`docs/deploy/deploy.md`)

## Sumário

| # | Seção | # | Seção |
|---|---|---|---|
| 1 | Objetivo | 12 | Estados e transições |
| 2 | Arquitetura e stack | 13 | Serviços externos (providers) |
| 3 | Criando o projeto do zero | 14 | Jobs agendados |
| 4 | Como executar | 15 | Erros e formato de resposta |
| 5 | Estrutura de pastas | 16 | Segurança e LGPD |
| 6 | Camadas e ciclo de uma requisição | 17 | Desempenho e disponibilidade |
| 7 | Regras e convenções | 18 | Logs e auditoria |
| 8 | Autenticação e autorização | 19 | Testes e Definição de Pronto |
| 9 | Módulos e rotas | 20 | Regras de negócio no backend |
| 10 | Fluxos principais | 21 | Decisões e pendências |
| 11 | Pagamentos |  |  |


### Histórico de versões

| Versão | Data | O que mudou |
|---|---|---|
| 0.1 | 13/10/2026 | Primeira versão, escrita a partir dos requisitos e do documento de Frontend. |
| 0.2 | 14/10/2026 | Revisão completa com base nas Regras de Negócio v0.4. Substituiu a v0.1. |
| 0.2.1 | 15/10/2026 | Ajustes para a hospedagem na Vercel + Supabase (ADR-005): `app.ts` e `dev-server.ts`; jobs como endpoints; imagens uma por requisição; `waitUntil`; novas variáveis. |
| 0.3.1 | 30/10/2026 | Banco trocado de Neon para Supabase (ADR-005 revisado): variáveis `DATABASE_URL` (Transaction pooler, 6543) e `DATABASE_URL_UNPOOLED` (Session pooler ou direta, 5432), backup só pelo workflow, `/health/db` gera atividade contra a pausa do projeto. |
| 0.3 | 16/10/2026 | Alinhado às Regras de Negócio v0.4 e ao Banco de Dados v0.2. Login com Google entra no MVP (com a tela "completar cadastro"); troca de senha logado; cancelamento de pedido pelo comprador; pedido aberto reaproveitado; liquidação só com anúncio ativo; pagamento tardio estornado; várias tentativas de pagamento por pedido; imagem de 4 MB confirmada pelo grupo; exclusão lógica e bloqueios com pedido pago em aberto; proteção do admin; jobs de 30 em 30 minutos e `/health` leve; SQL com os nomes do Banco. As pendências 1 a 16 da v0.2 passam às Regras de Negócio (seção 21). |

### O que mudou na v0.3

| Tema | Na v0.2 | Na v0.3 (regra de negócio) |
|---|---|---|
| Login com Google | Desejável | **MVP**; domínio e e-mail verificado conferidos no servidor; conta nasce sem senha e verificada; tela "completar cadastro" (RN-ACE-14) |
| Troca de senha | Só a recuperação por link | Também logado: `POST /users/me/password` (RN-ACE-15) |
| Confirmação de e-mail por link | Desejável | Fora do MVP, atrás da chave `EMAIL_VERIFICATION_REQUIRED` (RN-ACE-07) |
| Cancelar pedido | Só o vendedor encerrava a negociação | O comprador cancela Pendente e Em negociação; pedido aberto é reaproveitado (RN-PED-10, 12) |
| Liquidação | Só conferia estoque | Confere anúncio ativo, vendedor com conta ativa e estoque; pagamento tardio é estornado (RN-PAG-13, 14) |
| Pix expirado | Gerava novo código | Cancela o pedido; o aluno faz um novo (RN-PAG-04) |
| Pagamentos por pedido | Uma linha, atualizada | Uma linha por tentativa; só uma em andamento (Banco §4.6) |
| Exclusão de anúncio, perfil e usuário | Remoção | Exclusão lógica e anonimização, bloqueadas com pedido Pago ou em Retirada combinada em aberto (RN-ANU-09, RN-PER-06, RN-ADM-06, 09) |
| Edição pelo admin | Dados, vendedor e imagem | Só o status da conta e do anúncio, sem troca de vendedor (RN-ADM-04, 08; Regras v0.4.1, decisão de 26/10) |
| Proteção do admin | Proposta | Regra: não suspende nem exclui a si mesmo; último admin protegido (RN-ADM-12) |
| Jobs | A cada 1 a 5 minutos | A cada 30 minutos (decisão de custo do grupo, mantida no Supabase; também gera atividade e evita a pausa do projeto) |
| Imagem | 4 MB contra 5 MB (pendência) | 4 MB, confirmado pelo grupo (Regras §10) |
| Metas de 500 usuários e 99% | Verificadas por teste | Metas de produto, não medidas no MVP (Regras §6) |
| Pendências | 17 abertas | As propostas viraram regras; restam as da seção 21 |

### O que mudou na v0.2

| Tema | Na v0.1 | Na v0.2 (regra de negócio) |
|---|---|---|
| Estoque | O pedido pendente reservava a unidade por 30 min | **Pix pendente não reserva.** O estoque desconta na confirmação do pagamento, de forma atômica; no WhatsApp, só quando o vendedor conclui (RN-PAG-08, RN-EST-03, RN-EST-04, RN-PED-05) |
| Sem estoque na confirmação | Não previsto | Pedido cancelado e valor **estornado** (RN-PAG-08). Novo método `refundPayment` no gateway |
| Pedido pago | Vendedor marcava tudo | Vendedor marca "retirada combinada" e o **comprador confirma o recebimento** (RN-PED-08) |
| Estados do pedido | "Expirado / Cancelado" | Seis estados: Pendente, Pago, Retirada combinada, Concluído, Em negociação e Cancelado |
| Taxa de serviço | Percentual a definir | **R$ 0,00 por enquanto** (RN-PED-02) |
| Repasse ao vendedor | Pendência | Conta única de teste; repasse simulado (RN-PAG-10) |
| Exclusão de perfil | Pendência | Conta **anonimizada** ("Usuário removido"); pedidos pagos permanecem (RN-PER-06) |
| Conta admin | Criada por seed ou por outro admin | Só por **seed**, exceção do domínio `@edu.unifor.br` (RN-ADM-11) |
| Admin e compras | Não explícito | Admin **não compra, não paga e não anuncia** (RN §3): `authorizeRole("student")` |
| Anúncio vendido | Admin reverte (proposta) | Regra: só o admin reverte, e a ação vai para o log (RN §4) |
| Bloqueio de login | Proposta | Regra: 5 erros, 15 minutos (RN-ACE-09) |
| Preço do pedido | Não previsto | O pedido congela preço unitário e total (RN-PED-01) |
| Rastreabilidade | Mapa por requisito | Seção 20 liga cada regra `RN-XXX-nn` ao ponto do backend |


## 1. Objetivo

O backend é a **API REST do Unishop** (`/api/v1`). Ele recebe as chamadas do frontend, aplica as regras de negócio, fala com o banco de dados e com os serviços externos (login Google, pagamentos, e-mail e imagens). Tudo o que envolve **segurança e dinheiro é decidido aqui**: o frontend só valida para responder rápido ao usuário.

Este documento explica **como o backend funciona e como ele é organizado**. O contrato detalhado de cada endpoint fica no documento de API (`openapi.yaml`), e as tabelas e relações ficam no documento de Banco de Dados.

As regras são citadas pelo código do documento de **Regras de Negócio v0.4** (`RN-ACE-09`, `RN-EST-04`...). Os domínios são ACE (acesso), PER (perfil), CAT (categorias), ANU (anúncios), EST (estoque), PED (pedidos), PAG (pagamento), NOT (notificações) e ADM (administração). **Se houver dúvida de comportamento, vale o que está nas Regras de Negócio.**

Quem chama a API:

| Ator | Como acessa | O que pode fazer |
|---|---|---|
| Visitante | Sem token | Ver o carrossel da tela inicial, criar conta, entrar e recuperar a senha. |
| Aluno logado | JWT, perfil `student` | Navegar nas categorias, comprar, anunciar, acompanhar pedidos e editar o perfil, sempre só no que é seu (RNF004). |
| Administrador | JWT, perfil `admin` | Gerenciar usuários e produtos e editar o próprio perfil. **Não compra, não paga e não anuncia.** Cada alteração gera log. |
| Gateway de pagamento | Webhook assinado | Avisar que um pagamento foi aprovado. |
| Jobs agendados | Interno | Cancelar pedidos pendentes vencidos, limpar tokens e conferir pagamentos. |

> O visitante só alcança as rotas públicas. Categorias, listagens e página do produto exigem login; apenas o carrossel de anúncios recentes da tela inicial é aberto (RN-CAT-04, RF001.4).


## 2. Arquitetura e stack

É uma API REST em camadas, **sem sessão guardada no servidor** (o login é um JWT), que fala com um PostgreSQL e com quatro serviços externos. Em produção roda como **função serverless na Vercel**, com o PostgreSQL no Supabase, usado só como banco (`docs/deploy/deploy.md`); os jobs agendados são endpoints HTTP chamados por um agendador (seção 14). Em desenvolvimento roda como um processo Node.js comum, com `node-cron`.

```text
 Navegador (SPA React)
        │   HTTPS · JSON · JWT
        ▼
 ┌─────────────────────────────────────────────────┐
 │  API Unishop  (função serverless na Vercel)     │
 │   ├─ API REST ........ Express + TypeScript     │
 │   └─ Jobs agendados .. endpoints + agendador    │
 └───┬───────────┬────────────┬───────────┬────────┘
     │           │            │           │
     ▼           ▼            ▼           ▼
 PostgreSQL   Google      Mercado      Resend e Cloudinary
 (dados)      (login)     Pago         (e-mails e imagens)
                          (cartão e Pix)
                            ▲
                            └── webhook: o gateway avisa quando o Pix é pago
```

As versões exatas ficam no `package.json`; aqui só se registra a escolha.

| Item | Escolha | Para quê |
|---|---|---|
| Linguagem e runtime | Node.js (LTS) + TypeScript | Código tipado e uma linguagem só no projeto inteiro |
| Framework web | Express | Rotas, middlewares e respostas HTTP |
| Banco de dados | PostgreSQL 18 | Dados do sistema (detalhes no documento de Banco de Dados) |
| Acesso ao banco | Prisma (ORM) | Consultas parametrizadas e migrações versionadas (ADR-001) |
| Validação | Zod | Valida toda entrada no servidor (RNF005) e gera os tipos |
| Autenticação | jsonwebtoken (JWT) + bcrypt | Sessão com validade e senha com hash (RN-ACE-05, RN-ACE-11) |
| Login social | google-auth-library | Valida o ID token do Google (MVP, RN-ACE-14) |
| Upload | multer + file-type | Recebe imagens e confere o tipo real do arquivo |
| Pagamentos | API do Mercado Pago | Cartão, Pix e estorno por gateway externo (RN-PAG-01) |
| E-mail | Resend | E-mails transacionais |
| Imagens | Cloudinary | Armazenamento e entrega comprimida (RNF009) |
| Agendamento | node-cron (desenvolvimento) · Vercel Cron e agendador externo (produção) | Jobs de pedidos, tokens e conferência de pagamentos (seção 14) |
| Logs | pino + pino-http | Logs estruturados em JSON |
| Segurança HTTP | helmet, cors, express-rate-limit | Cabeçalhos seguros, origem permitida e limite de requisições |
| Testes | Vitest + Supertest | Unidade e integração das rotas |
| Contrato da API | OpenAPI (`openapi.yaml`) | Combinado entre backend e frontend |
| Ambiente local | Docker Compose | Sobe o PostgreSQL de desenvolvimento e o de testes |
| Hospedagem | Vercel (frontend e API) + Supabase (PostgreSQL) | Deploy por `git push`, um projeto de banco por ambiente (ADR-005; ver `docs/deploy/deploy.md`) |


### Princípios

- **Regra no backend.** Toda validação do frontend é repetida aqui; o servidor nunca confia no cliente.
- **Camadas com responsabilidade única.** Rota, controller, service e repository (seção 6).
- **Módulos por assunto.** Cada assunto (`auth`, `listings`, `orders`...) tem sua pasta com tudo dentro.
- **Serviços externos atrás de interfaces.** Trocar de gateway ou de provedor de e-mail mexe em uma pasta só.
- **Aluno e admin separados.** Regras do aluno em `modules/`, do administrador em `admin/`, com a proteção aplicada uma única vez na raiz do admin.
- **Sem estado no servidor.** Qualquer instância atende qualquer requisição; a sessão vive no JWT.
- **Dinheiro e estoque só aqui.** Valor, taxa, desconto de estoque e confirmação de pagamento nunca saem do backend.


## 3. Criando o projeto do zero

Pré-requisito: Node.js (versão LTS), npm e Docker. Confira com `node -v`, `npm -v` e `docker -v`. Os comandos rodam na raiz do monorepo (`unishop/`), onde fica a pasta `backend/`.


### Passo 1 · Criar o pacote

```bash
mkdir backend
cd backend
npm init -y
```


### Passo 2 · Dependências de execução

```bash
npm install express cors helmet compression express-rate-limit
npm install zod jsonwebtoken bcrypt dotenv
npm install pino pino-http multer file-type node-cron sanitize-html
npm install @prisma/client google-auth-library mercadopago resend cloudinary
```


### Passo 3 · Dependências de desenvolvimento

```bash
npm install -D typescript tsx @types/node @types/express @types/cors
npm install -D @types/jsonwebtoken @types/bcrypt @types/multer @types/sanitize-html
npm install -D prisma vitest supertest @types/supertest eslint prettier
```


### Passo 4 · Configurar o TypeScript

```bash
npx tsc --init     # depois: strict ligado, rootDir = src, outDir = dist
```


### Passo 5 · Preparar o banco

```bash
docker compose up -d db    # PostgreSQL local
npx prisma init            # cria a pasta prisma/ e o .env
```

O conteúdo do `schema.prisma` e das migrações é definido no documento de Banco de Dados (seções 7 e 11, com o SQL manual da seção 14). O banco local do dump antigo é descartável: `npm run db:reset` recria tudo.


### Passo 6 · Rodar para conferir

Crie dois arquivos. O `app.ts` só **monta** a API (e é o que a Vercel usa); o `dev-server.ts` só liga a porta no seu computador:

```ts
// src/app.ts
import express from 'express'

export const app = express()

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok' })
})

export default app // a Vercel usa este export; nada aqui chama listen
```

```ts
// src/dev-server.ts — só desenvolvimento local
import { app } from './app'

app.listen(3000, () => console.log('API em http://localhost:3000'))
```

> O arquivo local **não** se chama `server.ts` de propósito: a Vercel procura sozinha a entrada da API em `src/app.ts`, `src/index.ts` ou `src/server.ts`, e um `listen` em um desses nomes a confundiria (`docs/deploy/deploy.md`, seção 5.1).

```bash
npm run dev        # abre em http://localhost:3000/api/v1/health
```

Se aparecer `{"status":"ok"}`, a base está certa.

> No projeto definitivo existem duas rotas técnicas (seção 9.11). `GET /api/v1/health` é **leve**: responde 200 sem consultar o banco e é a que o monitor de disponibilidade chama de tempos em tempos, para não consultar o banco à toa. Como o Supabase gratuito pausa o projeto após 1 semana sem atividade, o monitor também chama o `/health/db` de vez em quando (ou os jobs de 30 minutos bastam para gerar atividade). `GET /api/v1/health/db` faz um `SELECT 1` e responde 200 ou 503; serve para conferir o deploy.

> Esta documentação assume **Express 5**, que repassa erros de funções assíncronas ao `errorHandler` sem biblioteca extra. Confira a versão instalada no `package.json`.


## 4. Como executar

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com recarga automática (`tsx watch src/dev-server.ts`) |
| `npm run build` | Compila o TypeScript para a pasta dist/ (confere os tipos; a Vercel compila a API sozinha) |
| `npm start` | Roda a versão compilada (`dist/dev-server.js`) para conferir o build localmente. Em produção a API é a função de `src/app.ts` na Vercel |
| `npm run lint` | Verifica o estilo do código |
| `npm run test` | Roda os testes (Vitest) |
| `npm run test:watch` | Testes em modo contínuo |
| `npm run db:migrate` | Aplica as migrações no banco de desenvolvimento |
| `npm run db:seed` | Cria as 6 categorias fixas e a conta de administrador |
| `npm run db:reset` | Recria o banco local do zero (só desenvolvimento) |


### Variáveis de ambiente

Ficam no `.env` (copie de `.env.example`). O `config/env.ts` lê e valida todas ao iniciar; se faltar alguma, o servidor não sobe.

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:senha@localhost:5432/unishop
DATABASE_URL_UNPOOLED=       # conexão direta (sem pooler); só em produção, para migração e backup
APP_ENV=development          # development | test | preview | production (na Vercel, definido por ambiente)
FRONTEND_URL=http://localhost:5173   # uma ou mais origens, separadas por vírgula

JWT_SECRET=troque-por-um-texto-longo-e-aleatorio
JWT_EXPIRES_IN=2h
ALLOWED_EMAIL_DOMAIN=edu.unifor.br

GOOGLE_CLIENT_ID=
MP_ACCESS_TOKEN=
MP_WEBHOOK_SECRET=
RESEND_API_KEY=
MAIL_FROM=no-reply@seudominio.com
CLOUDINARY_URL=

SERVICE_FEE_PERCENT=0        # taxa R$ 0,00 por enquanto (RN-PED-02)
PIX_EXPIRATION_MINUTES=30    # validade do Pix (RN-PAG-04) e do pedido pendente sem pagamento (RN-PAG-12)
EMAIL_VERIFICATION_REQUIRED=false   # confirmação de e-mail por link: desligada no MVP (RN-ACE-07)
LOGIN_MAX_ATTEMPTS=5         # RN-ACE-09
LOGIN_LOCK_MINUTES=15

CRON_SECRET=                 # senha dos endpoints de jobs (produção, seção 14)

# Drivers dos providers (detalhes e travas de produção em docs/api/api.md, seções 6 e 7)
PAYMENT_MODE=sandbox         # sandbox = credenciais de teste (valem também na produção, RN-PAG-10)
PAYMENT_DRIVER=mock          # mock | mercadopago
MAIL_DRIVER=console          # console | mailtrap | resend
STORAGE_DRIVER=local         # local | cloudinary
CLOUDINARY_UPLOAD_FOLDER=unishop-dev
ANTIBOT_DRIVER=noop          # noop | turnstile (Turnstile entra depois do MVP)

ADMIN_EMAIL=                 # usados só pelo seed (RN-ADM-11)
ADMIN_PASSWORD=
```

| Variável | Para quê |
|---|---|
| `NODE_ENV · PORT` | Ambiente de execução e porta da API |
| `DATABASE_URL` | Conexão com o PostgreSQL (em produção, o **Transaction pooler** do Supabase, porta 6543, com `?pgbouncer=true&connection_limit=1`; o usuário é `unishop_app.<ref-do-projeto>`) |
| `DATABASE_URL_UNPOOLED` | Conexão direta ou Session pooler do Supabase (porta 5432, usuário `unishop_migrator.<ref-do-projeto>` no pooler; a direta é só IPv6). Usada pelo `prisma migrate deploy` (`directUrl` no `schema.prisma`) e pelo backup |
| `FRONTEND_URL` | Origem(ns) aceita(s) no CORS, separadas por vírgula, sem curinga; a primeira é a base dos links enviados por e-mail. Em produção deve ser `https` e sem barra no fim |
| `CRON_SECRET` | Senha que o agendador envia (`Authorization: Bearer`) para chamar os endpoints de jobs |
| `APP_ENV` | Ambiente de verdade: `development`, `test`, `preview` ou `production`. As travas de produção usam `APP_ENV`, não `NODE_ENV`, que na Vercel é `production` também no Preview |
| `PAYMENT_MODE · PAYMENT_DRIVER` | `sandbox` (credenciais de teste) ou `production` (reais); `mock` ou `mercadopago`. Credencial real só com `APP_ENV=production` (`docs/api/api.md`, seção 6.3) |
| `MAIL_DRIVER · STORAGE_DRIVER · ANTIBOT_DRIVER` | Escolhem a implementação de cada provider. `console` e `local` são proibidos em produção |
| `CLOUDINARY_UPLOAD_FOLDER` | Pasta das imagens do ambiente (`unishop-prod` em produção) |
| `JWT_SECRET · JWT_EXPIRES_IN` | Segredo que assina os tokens e a validade deles |
| `ALLOWED_EMAIL_DOMAIN` | Domínio de e-mail aceito no cadastro (RN-ACE-02) |
| `GOOGLE_CLIENT_ID` | Audiência esperada no ID token do Google (login no MVP, RN-ACE-14) |
| `MP_ACCESS_TOKEN · MP_WEBHOOK_SECRET` | Credencial do gateway e segredo para validar os avisos |
| `RESEND_API_KEY · MAIL_FROM` | Credencial e remetente do serviço de e-mail |
| `CLOUDINARY_URL` | Credenciais do serviço de imagens |
| `SERVICE_FEE_PERCENT` | Taxa de serviço em %. Fica em 0, pois a taxa é R$ 0,00 por enquanto |
| `PIX_EXPIRATION_MINUTES` | Validade do Pix e do pedido pendente (30 minutos) |
| `EMAIL_VERIFICATION_REQUIRED` | Liga a confirmação de e-mail por link. Desligada, o cadastro nasce ativo com `verificacao = false` (RN-ACE-07) |
| `LOGIN_MAX_ATTEMPTS · LOGIN_LOCK_MINUTES` | Erros seguidos até bloquear o login e duração do bloqueio |
| `ADMIN_EMAIL · ADMIN_PASSWORD` | Credenciais da conta admin criada pelo seed. Nunca vão para o Git |

> O `.env` **nunca vai para o Git**; só o `.env.example`, sem valores reais. Chaves de produção e de teste são separadas.


### Ambientes

| Ambiente | Banco | E-mail | Pagamento | Imagens |
|---|---|---|---|---|
| Desenvolvimento | PostgreSQL no Docker | Caixa de teste (Mailtrap) | Sandbox do gateway + túnel público (ngrok ou Cloudflare Tunnel) para o webhook | Cloudinary, pasta de testes |
| Testes automáticos | PostgreSQL de teste, recriado a cada execução | Mock | Mock do provider | Mock |
| Produção | PostgreSQL no Supabase (projeto `unishop-prod`; versão a conferir, documentos assumem 18), com backup diário pelo workflow do GitHub Actions (o plano gratuito não tem restauração a ponto no tempo) | Resend | Mercado Pago com credenciais de **teste** (RN-PAG-10) | Cloudinary |


## 5. Estrutura de pastas

Organizada em **duas áreas**: `modules/` (regras do aluno) e `admin/` (regras do administrador), mais o que as duas dividem em `shared/`.

```text
backend/
├─ prisma/
│  ├─ schema.prisma             # tabelas e relações (doc. de Banco de Dados)
│  ├─ migrations/               # histórico versionado do banco
│  └─ seed.ts                   # 6 categorias fixas + conta admin (RN-CAT-01, RN-ADM-11)
├─ src/
│  ├─ dev-server.ts             # só desenvolvimento: liga a porta e os jobs (node-cron)
│  ├─ app.ts                    # monta o Express e os middlewares globais; export default (Vercel)
│  ├─ config/                   # env, database, jwt, cors, constants
│  ├─ routes/index.ts           # junta /api/v1/*, /api/v1/admin/* e /api/v1/internal/jobs/*
│  ├─ modules/                  # ALUNO
│  │  ├─ auth/
│  │  ├─ users/
│  │  ├─ categories/
│  │  ├─ listings/
│  │  ├─ orders/
│  │  ├─ payments/
│  │  └─ notifications/
│  ├─ admin/                    # ADMINISTRADOR
│  │  ├─ admin.routes.ts        # authenticate + authorizeRole("admin") uma vez
│  │  ├─ users/
│  │  ├─ listings/
│  │  └─ audit-logs/
│  ├─ shared/                   # usado pelas duas áreas
│  │  ├─ middlewares/
│  │  ├─ providers/
│  │  ├─ errors/
│  │  ├─ utils/
│  │  └─ types/
│  └─ jobs/                     # tarefas agendadas
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  └─ helpers/                  # factories e mocks
├─ scripts/vercel-build.sh      # build da API na Vercel: prisma generate + migrate deploy
├─ uploads/                     # imagens locais em dev (fora do Git)
├─ .env.example
└─ package.json · tsconfig.json · eslint.config.js · .prettierrc · vitest.config.ts · vercel.json
```


### Molde de cada módulo

Dentro de cada módulo vale o mesmo molde (exemplo com `listings`):

```text
modules/listings/
├─ listings.routes.ts           # URLs e middlewares de cada rota
├─ listings.controller.ts       # recebe req/res e chama o service
├─ listings.service.ts          # regras de negócio (única camada que "pensa")
├─ listings.rules.ts            # estados e regras puras (ex.: assertCanTransition)
├─ listings.repository.ts       # único lugar que fala com o banco
├─ listings.schemas.ts          # validação de entrada (Zod)
├─ listings.types.ts            # tipos e DTOs do módulo
└─ index.ts                     # o que o módulo expõe para os outros
```


### Pastas shared/ e jobs/

```text
shared/
├─ middlewares/
│  ├─ authenticate.ts           # valida o JWT e carrega o usuário
│  ├─ authorizeRole.ts          # barra por perfil: admin (RF018.1) ou student (RN §3)
│  ├─ validate.ts               # aplica os schemas Zod
│  ├─ rateLimiter.ts            # limite de requisições por IP
│  ├─ loginAttempts.ts          # bloqueio após 5 erros por 15 min (RN-ACE-09)
│  ├─ upload.ts                 # só JPG/PNG, uma imagem por requisição, até 4 MB (Regras §10)
│  ├─ trackLastSeen.ts          # alimenta lastSeen e "logado agora" (RN-ADM-03)
│  ├─ notFound.ts
│  └─ errorHandler.ts           # formato único de erro
├─ providers/                   # serviços externos atrás de interfaces
│  ├─ http-client.ts            # chamada externa com timeout, retry e circuit breaker
│  ├─ oauth/                    # google.provider.ts
│  ├─ payment-gateway/          # interface + mercadopago.provider.ts + mock.provider.ts
│  ├─ mail/                     # interface + resend + mailtrap + console + templates/
│  ├─ storage/                  # interface + cloudinary.provider.ts + local.provider.ts
│  ├─ antibot/                  # interface + turnstile.provider.ts + noop.provider.ts (depois do MVP)
│  └─ index.ts                  # escolhe a implementação de cada interface pelo ambiente
├─ security/                    # secret.ts (wrapper Secret), webhook-signature.ts, redact.ts
├─ errors/                      # AppError, NotFoundError, ForbiddenError...
├─ utils/                       # hash, token, pagination, whatsapp, money
└─ types/express.d.ts           # usuário dentro da requisição

jobs/
├─ expire-pix-payments.job.ts        # cancela pedidos pendentes vencidos (Pix e cartão)
├─ cleanup-expired-tokens.job.ts
├─ reconcile-pending-payments.job.ts # confere pagamentos pendentes e refaz estornos
├─ registry.ts                       # mapa nome → função: usado pelos endpoints de jobs (produção)
└─ scheduler.ts                      # startCronJobs() com node-cron: só o dev-server importa
```

| Pasta | O que vai nela |
|---|---|
| `config/` | Leitura e validação do ambiente, conexão com o banco, segredos do JWT, CORS e as constantes de negócio (domínio aceito, 4 MB por imagem, 5 imagens por anúncio, 30 min, 5 tentativas, 15 min de bloqueio, 5 min de "logado agora", limites de campo da seção 9 das Regras de Negócio). |
| `routes/` | Um único `index.ts` que monta o prefixo `/api/v1` e liga as rotas de cada módulo e da área admin. |
| `modules/` | Uma pasta por assunto do aluno. Cada uma segue o molde acima. |
| `admin/` | Regras do administrador. A proteção (`authenticate` + `authorizeRole`) é aplicada uma única vez em `admin.routes.ts`. |
| `shared/` | Middlewares, providers, erros e utilitários usados pelas duas áreas. Nada de regra de negócio aqui. |
| `jobs/` | Tarefas que rodam sozinhas em horários definidos (seção 14). `registry.ts` não importa `node-cron`; só `scheduler.ts` importa, e só o `dev-server.ts` o carrega. |
| `tests/` | Testes unitários, de integração e os auxiliares (factories e mocks). |
| `prisma/` | Schema, migrações e seed. O conteúdo é do documento de Banco de Dados. |
| `uploads/` | Imagens salvas só em desenvolvimento, quando o storage em nuvem não está ligado. |


## 6. Camadas e ciclo de uma requisição

```text
Requisição HTTP
     ▼
 Route ........... define a URL e aplica os middlewares
     ▼
 Controller ...... lê req, chama o service, devolve res
     ▼
 Service ......... regras de negócio e transações ────▶ Providers ────▶ serviços externos
     ▼                                                  (Google · Mercado Pago · Resend · Cloudinary)
 Repository ...... único acesso ao banco
     ▼
 PostgreSQL
```

| Camada | O que faz | O que não faz |
|---|---|---|
| `Route` | Define método e URL, encadeia os middlewares (autenticação, validação, upload) e chama o controller. | Não tem lógica. |
| `Controller` | Lê os dados já validados, chama o service e monta a resposta HTTP (status + JSON). | Não acessa o banco nem aplica regra de negócio. |
| `Service` | Aplica as regras de negócio, confere se o recurso é do usuário, abre transações e chama repositories e providers. | Não conhece `req` nem `res`. |
| `Repository` | Executa as consultas ao banco. | Não tem regra de negócio. |
| `Provider` | Conversa com um serviço externo atrás de uma interface. | Não conhece o domínio do Unishop. |
| `Schema (Zod)` | Descreve e valida a entrada de cada rota. | Não decide permissão. |


### Exemplo: o caminho de GET /api/v1/listings/42

```text
listings.routes.ts       GET /:id  ▶ authenticate ▶ validate(params) ▶ controller
listings.controller.ts   chama listingsService.getById(42, req.user)
listings.service.ts      regra: dono vê qualquer status; os outros só veem anúncio ativo (RN-ANU-05)
                         soma +1 na visualização se quem pediu não é o dono (RN-ANU-11)
listings.repository.ts   consulta o anúncio, as imagens e o vendedor no banco
listings.controller.ts   responde 200 { "data": { ... } }  ·  ou 404 se o service recusar
```


### Regras de dependência

| Regra | Motivo |
|---|---|
| O controller só chama o service do próprio módulo. | A regra fica em um só lugar. |
| Um módulo usa outro **pelo service**, nunca pelo repository dele. | Evita regra duplicada e acesso cruzado ao banco. |
| `admin/` pode usar services de `modules/`, mas `modules/` nunca importa de `admin/`. | O lado do aluno não depende do admin. |
| Serviços externos só são chamados via `shared/providers/`. | Troca fácil e testes com mock. |
| Operação que mexe em mais de uma tabela roda em **transação** aberta pelo service. | Evita dados pela metade. |
| O lint (`no-restricted-imports`) barra as importações proibidas. | A regra é verificada pela máquina, não pela memória. |


### Ciclo de vida de uma requisição

```text
Requisição
   │
   ├─ GLOBAIS (todas as rotas)
   │    helmet ▶ cors ▶ compression ▶ request-id + log ▶ JSON (1 MB) ▶ rateLimiter
   │
   ├─ POR ROTA (conforme a necessidade)
   │    authenticate ▶ authorizeRole(perfil) ▶ trackLastSeen ▶ upload ▶ validate (Zod)
   │
   ├─ controller ▶ service ▶ repository
   │
   └─ resposta 2xx

   Qualquer falha, em qualquer ponto ▶ errorHandler ▶ erro no formato único (seção 15)
   Rota inexistente                  ▶ notFound ▶ errorHandler
```

| # | Middleware | Quando | O que faz |
|---|---|---|---|
| 1 | helmet | Todas | Cabeçalhos de segurança HTTP (inclui HSTS) |
| 2 | cors | Todas | Aceita só as origens de `FRONTEND_URL` (uma ou mais, separadas por vírgula, sem curinga). A API usa `trust proxy = 1` para enxergar o IP real atrás da Vercel |
| 3 | compression | Todas | Comprime as respostas |
| 4 | request-id + pino-http | Todas | Gera um id por requisição e registra o log |
| 5 | express.json (limite de 1 MB) | Todas | Lê o corpo JSON |
| 6 | rateLimiter | Todas (mais rígido em /auth) | Limita requisições por IP |
| 7 | authenticate | Rotas privadas e admin | Confere o JWT e carrega o usuário (seção 8) |
| 8 | authorizeRole(perfil) | Rotas por perfil | `"admin"` em `/admin/*`; `"student"` em pedido, pagamento e anúncio (RN §3) |
| 9 | trackLastSeen | Rotas privadas | Atualiza `lastSeen` (coluna `ultimo_acesso`) no máximo 1 vez por minuto, com um `UPDATE` condicional (`... WHERE ultimo_acesso IS NULL OR ultimo_acesso < now() - interval '1 minute'`). Não há memória compartilhada entre instâncias na Vercel, então o controle fica no banco |
| 10 | upload | Rotas com imagem | Recebe o arquivo e confere tipo e tamanho |
| 11 | validate (Zod) | Rotas com entrada | Valida corpo, parâmetros e query |
| 12 | controller | Todas | Chama o service e responde |
| 13 | notFound / errorHandler | Fim da cadeia | Rota inexistente e qualquer erro, no formato único (seção 15) |

> A rota do **webhook** do gateway não usa `authenticate`: ela é protegida pela **assinatura** do aviso (seção 11).


### Mapa de módulos

Os módulos conversam entre si pelo service. As setas mostram quem usa quem.

```text
src/modules/  (ALUNO)                            src/admin/  (ADMINISTRADOR)
┌─────────────────────────────────────┐          ┌──────────────────────────────────┐
│ auth ───────────▶ users             │          │ admin/users ────▶ audit-logs     │
│ listings ───────▶ categories        │          │ admin/listings ─▶ audit-logs     │
│ orders ─────────▶ listings          │          │        └────────▶ notifications  │
│        (valida e desconta estoque)  │          └──────────────────────────────────┘
│ payments ───────▶ orders            │
│        (liquida o pedido)           │          src/shared/  (USADO POR TODOS)
│ orders, payments ▶ notifications    │          ┌──────────────────────────────────┐
└─────────────────────────────────────┘          │ middlewares · providers          │
                                                 │ errors · utils · types           │
                                                 └──────────────────────────────────┘
```


## 7. Regras e convenções


### Idioma

Código, pastas e arquivos em inglês; interface, mensagens ao usuário e documentos em português do Brasil (RNF014).

| Domínio (PT) | Código (EN) |
|---|---|
| Usuário | `user` |
| Anúncio / Produto | `listing` |
| Categoria | `category` |
| Pedido | `order` |
| Pagamento | `payment` |
| Notificação | `notification` |
| Administrador | `admin` |

> Tabelas e colunas do banco são em português; o Prisma traduz com `@map` e `@@map` (tabela de correspondência no Banco de Dados, seção 7). `lastSeen` no código é a coluna `ultimo_acesso`. Os valores dos estados (`pago`, `concluido`, `em_negociacao`...) são os mesmos nos dois lados.


### Convenções de código

- Arquivos em kebab-case com a camada no nome (`listings.service.ts`); classes e tipos em PascalCase; funções e variáveis em camelCase; constantes em UPPER_SNAKE_CASE.
- TypeScript em modo estrito, sem `any` sem justificativa em comentário.
- Rotas no plural, em minúsculas, com o verbo HTTP certo (`GET /listings`, `PATCH /listings/:id`). Ação que não é CRUD vira sub-rota (`POST /listings/:id/pause`).
- JSON em camelCase; datas em ISO 8601 (UTC); dinheiro calculado em **centavos** (inteiros) no código e devolvido com duas casas.
- Mensagens para o usuário em português; códigos de erro em inglês (`EMAIL_ALREADY_REGISTERED`).
- Nenhum segredo no código: tudo vem de `config/env.ts`.
- O service recebe repositories e providers por parâmetro (injeção simples), o que permite testar com mocks.
- **Cite o código da regra** (`RN-EST-04`) em um comentário no ponto do código e no nome do teste que a cobre. Assim a regra é fácil de achar.
- **Um valor por estado no banco.** Os textos exibidos (por exemplo, "Pago · aguardando retirada" para o comprador e "Pago · combinar retirada" para o vendedor) ficam na interface.
- Pull request só entra com lint e testes verdes e revisão de outro membro; commits no padrão `feat:`, `fix:`, `docs:`.


## 8. Autenticação e autorização


### Perfis e permissões

| Perfil | Como é identificado | Acesso |
|---|---|---|
| Visitante | Sem token | Rotas públicas. |
| Aluno | JWT com perfil `student` | Rotas privadas, só no que é dele. |
| Administrador | JWT com perfil `admin` | Tudo de `/admin/*` e o próprio perfil. |

> O perfil **vem do banco**, nunca do corpo da requisição. A conta admin é criada **só pelo seed** (RN-ADM-11), nunca pelo cadastro público, e por isso é a exceção da regra do domínio `@edu.unifor.br`. "Aluno verificado" é a conta com e-mail `@edu.unifor.br` **confirmado**: por link (RN-ACE-07, quando a chave estiver ligada) ou por login com Google (RN-ACE-14).

Quem pode o quê (documento de Regras de Negócio, seção 3):

| Ação | Visitante | Aluno | Admin |
|---|---|---|---|
| Ver a tela inicial, o carrossel e as seções informativas | Sim | Sim | Sim |
| Cadastrar-se, entrar (e-mail e senha, ou Google) e recuperar a senha | Sim | — | — |
| Trocar a própria senha, com a sessão aberta | Não | Sim | Sim |
| Ver categorias, listagens e página do produto | Não | Sim | Sim |
| Ver o WhatsApp do vendedor | Não | Sim | Sim |
| Fazer pedido e pagar | Não | Sim | Não |
| Cancelar o próprio pedido pendente ou em negociação | Não | Sim | Não |
| Criar, editar, pausar, vender e excluir o próprio anúncio | Não | Sim | Não |
| Ver o próprio histórico de pedidos e os pedidos recebidos | Não | Sim | Não |
| Editar e excluir o próprio perfil | Não | Sim | Sim |
| Gerenciar qualquer usuário (ver, suspender ou reativar, excluir) | Não | Não | Sim |
| Gerenciar qualquer produto (ver, mudar status, excluir) | Não | Não | Sim |

- Perfil errado (por exemplo, admin tentando comprar) responde **403** `FORBIDDEN`, aplicado por `authorizeRole`.
- "Só no que é dele": além do perfil, o service confere se o recurso pertence a quem pede (RNF004). Anúncio ou pedido alheio responde **403**.


### Token JWT

| Item | Combinado |
|---|---|
| Onde viaja | Cabeçalho `Authorization: Bearer <jwt>` (RN-ACE-11) |
| Conteúdo | Id do usuário (`sub`), perfil (`role`), emitido em (`iat`) e expira em (`exp`). Nenhum dado pessoal. |
| Assinatura | HS256 com `JWT_SECRET` |
| Validade | **2 horas** (RN-ACE-11), em `JWT_EXPIRES_IN`. Ao expirar, a API responde 401 `TOKEN_EXPIRED` e o frontend leva ao login. |
| Renovação | Fora do MVP (sem refresh token). |
| Logout | O frontend descarta o token; não há lista de tokens revogados no MVP. |
| Suspensão e troca de senha | O `authenticate` consulta a conta a cada requisição: conta suspensa é barrada na hora (RN-ACE-12), e token emitido antes da última troca de senha (`senha_alterada_em`, comparada em segundos) é recusado. |

O que o `authenticate` verifica, em ordem:

```text
Authorization: Bearer <jwt>
 ├─ cabeçalho ausente?                          ▶ 401 UNAUTHENTICATED
 ├─ token inválido ou expirado?                 ▶ 401 TOKEN_INVALID / TOKEN_EXPIRED
 ├─ usuário não existe mais?                    ▶ 401 UNAUTHENTICATED
 ├─ conta suspensa?                             ▶ 403 ACCOUNT_SUSPENDED
 ├─ senha trocada depois de emitir o token?     ▶ 401 TOKEN_INVALID
 ├─ aceite dos Termos pendente (conta Google nova)? ▶ 403 TERMS_NOT_ACCEPTED
 │      (exceto em GET /auth/me e POST /users/me/complete-profile)
 └─ tudo certo ▶ anexa req.user (id e perfil) e segue para a rota
```


### Login com e-mail e senha

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "aluna@edu.unifor.br", "password": "Senha123" }
```

```json
{
  "data": {
    "token": "eyJhbGciOi...",
    "user": { "id": 7, "name": "Ana Souza", "role": "student" }
  }
}
```

```text
 1. Frontend ▶ API     POST /auth/login {e-mail, senha}
 2. API                valida o formato (Zod) e confere se a conta está bloqueada
 3. API ▶ Banco        busca o usuário pelo e-mail
 4. API                compara a senha com o hash (bcrypt) e confere o status da conta
    ├─ INVÁLIDAS (senha errada ou e-mail inexistente)
    │   5. API ▶ Banco       soma 1 tentativa errada (na 5ª, bloqueia a conta por 15 min)
    │   6. API ▶ Frontend    401 INVALID_CREDENTIALS  ·  429 ACCOUNT_LOCKED se bloqueada
    └─ VÁLIDAS
        5. API ▶ Banco       zera as tentativas e registra o último acesso (lastSeen)
        6. API ▶ Frontend    200 {token JWT, usuário com perfil}
 7. Frontend           guarda o token e redireciona: aluno ▶ /categorias · admin ▶ /admin/usuarios
```

- **Mensagem genérica** (RN-ACE-08): nunca diz se o e-mail ou a senha estava errado.
- **Bloqueio** (RN-ACE-09): 5 senhas erradas seguidas bloqueiam o login por 15 minutos. A contagem é por conta, e o `rateLimiter` limita também por IP.
- Conta **suspensa** (RN-ACE-12) responde 403 `ACCOUNT_SUSPENDED`. Conta com e-mail **não confirmado** responde 403 `EMAIL_NOT_VERIFIED`, mas só quando `EMAIL_VERIFICATION_REQUIRED` está ligada (RN-ACE-07).
- Conta criada por Google **não tem senha**: tentar entrar por e-mail e senha nela responde o mesmo 401 `INVALID_CREDENTIALS` (RN-ACE-08). Quem entrou por Google define uma senha pela recuperação (RN-ACE-10).
- A senha é comparada com **bcrypt** (custo 12). O hash nunca sai do servidor nem entra em log (RN-ACE-05).
- O administrador usa o **mesmo endpoint**, em rota de tela separada; a resposta traz o perfil e o frontend decide o destino (RN-ACE-13).


### Login com Google

```text
 1. Frontend ▶ Google  abre o fluxo "Entrar com Google" (SDK)
 2. Google ▶ Frontend  ID token assinado pelo Google
 3. Frontend ▶ API     POST /auth/google {idToken}
 4. API                valida assinatura, audiência (Client ID) e expiração do token
 5. API                exige email_verified = true e domínio @edu.unifor.br
 6. API ▶ Banco        busca o usuário pelo google_sub e, se não achar, pelo e-mail
    ├─ conta existe (com senha, sem Google ainda)  ▶ vincula o google_sub e marca verificacao = true
    ├─ conta existe e é suspensa                   ▶ 403 ACCOUNT_SUSPENDED
    └─ conta não existe ▶ cria: ativa, sem senha, verificacao = true, sem aceite dos Termos
 7. API ▶ Frontend     200 {token JWT, usuário, needsTermsAcceptance}
                       ·  403 EMAIL_DOMAIN_NOT_ALLOWED se não for da Unifor
 8. Frontend           se needsTermsAcceptance ▶ tela "completar cadastro"
 9. Frontend ▶ API     POST /users/me/complete-profile {acceptTerms: true, course?, whatsapp?}
10. API ▶ Banco        grava data_aceite_termos (e curso e WhatsApp, se vieram)
```

- O login com Google está no **MVP** (RN-ACE-14). O backend valida o ID token e exige `email_verified` e domínio `@edu.unifor.br`; o parâmetro `hd` do Google é só uma dica na tela e **não substitui** essa checagem (RNF002).
- A conta de Google nasce **ativa, sem senha e verificada**. Enquanto o aceite dos Termos não for gravado, as rotas privadas respondem 403 `TERMS_NOT_ACCEPTED`; só `GET /auth/me` e `POST /users/me/complete-profile` ficam liberadas (RN-ACE-06).
- Curso e WhatsApp são **opcionais** na tela "completar cadastro" (RN-ACE-14, RN-PER-07 para o formato).
- O login com Apple fica **fora do MVP**.

> **Pendência.** Conferir com um e-mail `@edu.unifor.br` real se a conta Google institucional entrega `email_verified = true` (seção 21, nº 1).


### Cadastro e confirmação de e-mail

```text
 1. Frontend ▶ API     POST /auth/register {nome, e-mail, senha, confirmação, aceite dos Termos}
 2. API                valida (Zod): domínio @edu.unifor.br, senha forte e igual à confirmação
 3. API ▶ Banco        esse e-mail já existe (sem diferenciar maiúsculas)?  ▶ sim: 409 EMAIL_ALREADY_REGISTERED
 4. API                gera o hash da senha
 5. API ▶ Banco        salva o usuário (ativo, verificacao = false) e o aceite dos Termos com data
 6. API ▶ Frontend     201 {usuário}  ▶ o frontend leva ao login

    ── só com EMAIL_VERIFICATION_REQUIRED ligada (fora do MVP, RN-ACE-07) ──

 4b. API               gera também um token de confirmação (só o hash do token é salvo)
 6b. API ▶ E-mail      envia o link de confirmação; o login fica barrado até a confirmação
 7b. Frontend ▶ API    POST /auth/verify-email {token}
 8b. API ▶ Banco       marca verificacao = true e invalida o token (uso único)
 9b. API ▶ Frontend    200 ▶ tela de login
```

- O cadastro pede nome completo, e-mail institucional, senha e confirmação (RN-ACE-01). **Curso e WhatsApp não são pedidos no cadastro**: entram pelo perfil (RN-PER-01). O e-mail é único (RN-ACE-03).
- A senha tem de 8 a 72 caracteres, com 1 número e 1 letra maiúscula, igual à confirmação (RN-ACE-04).
- O aceite dos Termos de uso e da Política de privacidade é obrigatório, e a **data do aceite é registrada** (RN-ACE-06).
- A ativação por link é **desejável e fica fora do MVP** (RN-ACE-07). Com a chave desligada, `verify-email` e `resend-verification` não são usadas. O token é aleatório e só o **hash** vai para o banco; validade de 24 horas, com reenvio em `POST /auth/resend-verification`.


### Recuperação de senha

```text
 1. Frontend ▶ API     POST /auth/forgot-password {e-mail}
 2. API ▶ Banco        se a conta existir: grava token de redefinição (validade de 30 min)
 3. API ▶ E-mail       envia o link (só se a conta existir)
 4. API ▶ Frontend     202 — mesma resposta existindo ou não a conta

    ── o aluno abre o link e define a nova senha ──

 5. Frontend ▶ API     POST /auth/reset-password {token, nova senha, confirmação}
 6. API                confere o token (hash, 30 min, ainda não usado) e as regras da senha
 7. API ▶ Banco        grava o novo hash, marca o token como usado e zera o bloqueio de login
 8. API ▶ Frontend     200 ▶ tela "Senha redefinida"  ·  400 TOKEN_EXPIRED / TOKEN_INVALID
```

- Link com validade de **30 minutos** e **invalidado após o uso** (RN-ACE-10).
- A resposta é a mesma exista ou não a conta, para não revelar quem está cadastrado. "Reenviar link" reaproveita o mesmo endpoint.
- A nova senha segue a regra do cadastro (RN-ACE-04).


### Troca de senha com a sessão aberta

```text
 1. Frontend ▶ API     POST /users/me/password {currentPassword, newPassword, confirmation}
 2. API                confere a senha atual (bcrypt) e as regras da nova (RN-ACE-04)
 3. API ▶ Banco        grava o novo hash e senha_alterada_em = agora; zera tentativas_login
 4. API ▶ Frontend     200 {token}  (token novo; os emitidos antes deixam de valer)
```

- Vale para aluno e admin (RN-ACE-15). Senha atual errada responde 400 `CURRENT_PASSWORD_INVALID` (não 401, para o frontend não encerrar a sessão).
- Conta criada por Google, sem senha, não tem "senha atual": define a primeira senha pela recuperação (RN-ACE-10).
- A senha inicial do admin vem do seed e deve ser trocada no primeiro acesso por esta rota.


### Troca de e-mail institucional

O pedido de troca grava o novo e-mail como **pendente** e envia um link ao novo endereço. A troca só vale quando o aluno clica no link. O novo e-mail também precisa ser `@edu.unifor.br` e não pode estar em uso (RN-PER-02).


## 9. Módulos e rotas

As rotas abaixo orientam o documento de API ; campos, exemplos e códigos de resposta ficam no `openapi.yaml`. Todas começam com `/api/v1`. Acesso: **Público**, **Aluno** (perfil `student`), **Dono** (aluno dono do recurso), **Comprador**, **Vendedor** e **Admin**. A coluna **Origem** cita a regra de negócio ou o requisito.


### 9.1 auth

Cadastro, login, Google, confirmação de e-mail e recuperação de senha.

| Método e rota | Acesso | O que faz | Origem |
|---|---|---|---|
| `POST /auth/register` | Público | Cria a conta de aluno e envia o e-mail de confirmação. Nunca cria admin | RN-ACE-01 a 07, RN-ADM-11 |
| `POST /auth/verify-email` | Público | Confirma o e-mail pelo token. Só com `EMAIL_VERIFICATION_REQUIRED` ligada | RN-ACE-07 |
| `POST /auth/resend-verification` | Público | Reenvia o e-mail de confirmação. Só com a chave ligada | RN-ACE-07 |
| `POST /auth/login` | Público | Autentica aluno ou admin e devolve o JWT | RN-ACE-08, 09, 12, 13 |
| `POST /auth/google` | Público | Autentica com o ID token do Google; cria a conta no 1º acesso (MVP) | RN-ACE-14 |
| `POST /auth/forgot-password` | Público | Pede o link de redefinição | RN-ACE-10 |
| `POST /auth/reset-password` | Público | Define a nova senha com o token | RN-ACE-04, 10 |
| `GET /auth/me` | Aluno ou Admin | Devolve o usuário do token (restaura a sessão) | RN-ACE-11 |


### 9.2 users

Perfil do usuário logado. Vale para aluno e para admin (RN §3: os dois editam e excluem o próprio perfil).

| Método e rota | Acesso | O que faz | Origem |
|---|---|---|---|
| `GET /users/me` | Aluno ou Admin | Dados do próprio perfil | RF012.1 |
| `PATCH /users/me` | Dono | Altera nome, curso e WhatsApp (10 ou 11 dígitos), com as validações do cadastro | RN-PER-01, 07 |
| `POST /users/me/password` | Dono | Troca a senha com a sessão aberta; devolve um token novo | RN-ACE-15 |
| `POST /users/me/complete-profile` | Dono | Primeiro acesso por Google: grava o aceite dos Termos e, se vierem, curso e WhatsApp | RN-ACE-06, 14 |
| `PUT /users/me/avatar` | Dono | Troca a foto de perfil (JPG ou PNG, até 4 MB) | RN-PER-05 |
| `POST /users/me/email-change` | Dono | Pede a troca de e-mail (link ao novo endereço) | RN-PER-02 |
| `POST /users/me/email-change/confirm` | Dono | Confirma a troca pelo token | RN-PER-02 |
| `DELETE /users/me` | Dono | Exclui o perfil: exige a confirmação "EXCLUIR" e anonimiza a conta | RN-PER-06 |

- Ao mudar o WhatsApp, os anúncios ativos do aluno são atualizados **na mesma transação** (RN-PER-03).
- O WhatsApp só aparece em respostas para usuários logados (RN-PER-04).
- **Excluir o perfil = anonimizar** (RN-PER-06): os dados pessoais são apagados e o nome vira "Usuário removido"; os anúncios saem do ar; os pedidos pagos permanecem no histórico da outra parte. A exclusão é **bloqueada** (409 `HAS_OPEN_PAID_ORDERS`) enquanto houver pedido Pago ou em Retirada combinada em aberto, como comprador ou vendedor; pedidos Pendentes e Em negociação são cancelados. Detalhes na seção 16.


### 9.3 categories

São **seis categorias fixas** (RN-CAT-01), criadas pelo `seed`. Não há rota de criação, edição ou exclusão.

| Método e rota | Acesso | O que faz | Origem |
|---|---|---|---|
| `GET /categories` | Aluno | Lista as categorias com a quantidade de anúncios ativos; aceita `?search=` | RN-CAT-02, 03, 04 |

A contagem usa o mesmo filtro de visibilidade das listagens (seção 9.4). A busca por texto da tela de categorias procura **categorias** em `GET /categories?search=` e **itens** em `GET /listings?search=`; o frontend mostra os dois resultados (RN-CAT-03).


### 9.4 listings

Anúncios: vitrine, página do produto e gerenciamento pelo dono.

| Método e rota | Acesso | O que faz | Origem |
|---|---|---|---|
| `GET /listings/recent` | Público | Últimos anúncios para o carrossel (campos mínimos, sem contato) | RF001.4 |
| `GET /listings` | Aluno ou Admin | Lista com `category`, `search`, `minPrice`, `maxPrice`, `sort` (`recent`, `price_asc`, `price_desc`), `page`, `limit` | RN-ANU-05, 06, 07 |
| `GET /listings/mine` | Dono | "Meus anúncios", em todos os status | RF012.5 |
| `GET /listings/:id` | Aluno ou Admin | Página do produto (galeria, vendedor com selo de aluno verificado, WhatsApp do anúncio); conta a visualização | RF008, RN-ANU-08, 11 |
| `GET /listings/:id/management` | Dono | Resumo, status e indicadores (visualizações, contatos, pedidos) | RN-ANU-08 |
| `POST /listings` | Aluno | Publica o anúncio (multipart: dados + a **primeira** imagem) | RN-ANU-01 a 03, RN-EST-01 |
| `POST /listings/:id/images` | Dono | Acrescenta **uma** imagem ao anúncio (multipart); máximo de 5 por anúncio | RN-ANU-03, RN-ANU-04 |
| `DELETE /listings/:id/images/:imageId` | Dono | Remove uma imagem; o anúncio precisa continuar com pelo menos 1 | RN-ANU-03, RN-ANU-04 |
| `PATCH /listings/:id` | Dono | Edita os dados do anúncio (as imagens têm rotas próprias, acima) | RN-ANU-04 |
| `POST /listings/:id/pause` | Dono | Pausa o anúncio | RN-ANU-04 |
| `POST /listings/:id/reactivate` | Dono | Reativa um anúncio pausado, se a conta não estiver suspensa | RN-ANU-04 |
| `POST /listings/:id/mark-sold` | Dono | Marca como vendido e zera as unidades que sobraram (irreversível para o dono) | RF017.9 |
| `DELETE /listings/:id` | Dono | Exclusão lógica; 409 `HAS_OPEN_PAID_ORDERS` se houver pedido Pago ou em Retirada combinada em aberto; Pendentes e Em negociação são cancelados | RN-ANU-09 |

- **Campos obrigatórios** (RN-ANU-01): nome, categoria, descrição, preço, quantidade e WhatsApp. O WhatsApp é gravado **no anúncio** (`anuncio.whatsapp`), nasce preenchido com o do perfil e é editável; sem WhatsApp no perfil, o aluno o informa no anúncio. Só **aluno** cria anúncio; admin recebe 403. Os limites de cada campo estão na seção 9 das Regras de Negócio (RN-ANU-12).
- **Preço** maior que zero, com duas casas decimais (RN-ANU-02). **Quantidade** de 1 em diante (RN-EST-01).
- **Imagens** (RN-ANU-03): de 1 a 5 por anúncio, JPG ou PNG. O máximo de 5 também é garantido pelo banco (`ordem` de 1 a 5).
- **Uma imagem por requisição, até 4 MB.** Na Vercel uma requisição aceita no máximo 4,5 MB no total. Por isso cada imagem sobe em uma chamada própria, com limite de **4 MB** (sobra margem para os campos do formulário). O PDF do trabalho fala em 5 MB; o grupo adotou 4 MB, e o desvio está registrado nas Regras de Negócio (seção 10). A API continua conferindo o tipo real do arquivo (`file-type`) e envia ao Cloudinary; nada de assinatura nem envio direto do navegador.
- Se o anúncio tem mais de uma imagem, o frontend publica com a primeira (`POST /listings`) e acrescenta as demais com `POST /listings/:id/images`. Se uma delas falhar, o anúncio já existe com as imagens que subiram e o aluno pode tentar de novo.
- **Visibilidade única** (RN-ANU-05). Toda listagem pública (categorias, busca, carrossel, contagem) usa o mesmo filtro: só anúncios ativos, de contas ativas e não excluídos. Ele mora em uma função do repository, para ninguém esquecer.
- O anúncio novo aparece no topo (ordenação padrão por data, mais recente primeiro) (RN-ANU-07).
- **Indicadores** (RN-ANU-08): visualizações (+1 a cada `GET /listings/:id` de quem não é o dono), contatos pelo WhatsApp e pedidos recebidos. A contagem é do backend.
- `limit` padrão 20, máximo 50.
- O **WhatsApp** só aparece em respostas autenticadas. As rotas públicas nunca o incluem.
- Anúncio inexistente, excluído, pausado ou vendido, visto por quem não é o dono, responde 404.

Exemplo de busca com filtros:

```http
GET /api/v1/listings?category=3&minPrice=20&maxPrice=80&sort=recent&page=1&limit=20
Authorization: Bearer <jwt>
```


### 9.5 orders

Pedidos de compra e pedidos recebidos. **Nenhuma rota desta tabela reserva estoque**: o desconto acontece só quando a venda se fecha (RN-EST-03).

| Método e rota | Acesso | O que faz | Origem |
|---|---|---|---|
| `POST /orders` | Aluno | Cria o pedido "Pendente" (pagamento no site) com preço unitário e total congelados. Valida a quantidade, sem reservar | RN-PED-01, 02, RN-EST-02 |
| `POST /orders/contact` | Aluno | Registra o contato por WhatsApp: pedido "Em negociação", sem reservar nem descontar estoque | RN-PED-05 |
| `GET /orders/mine` | Aluno | "Meus pedidos", do mais recente ao mais antigo | RN-PED-06 |
| `GET /orders/:id` | Comprador ou Vendedor | Detalhe e status. É a fonte do "pago" que a tela mostra | RN-PAG-11 |
| `GET /orders/received` | Vendedor | Pedidos recebidos; filtra por `listingId` | RN-PED-07 |
| `POST /orders/:id/arrange-pickup` | Vendedor | Pedido pago: marca "Retirada combinada" | RN-PED-08 |
| `POST /orders/:id/confirm-receipt` | Comprador | Retirada combinada: confirma o recebimento e conclui o pedido | RN-PED-08 |
| `POST /orders/:id/complete` | Vendedor | Em negociação: confirma a venda, **desconta o estoque** e conclui | RN-EST-03, 06 |
| `POST /orders/:id/cancel` | Comprador ou Vendedor | Comprador: cancela pedido Pendente ou Em negociação. Vendedor: encerra a negociação (Em negociação para Cancelado). Pedido Pago ou em Retirada combinada não se cancela por aqui | RN-PED-12 |

- O pedido guarda comprador, anúncio, quantidade, **preço unitário e total no momento da compra** (RN-PED-01).
- O pedido tem **identificador próprio** e um número exibido na confirmação e no histórico. Excluir o anúncio de forma lógica não apaga o pedido (RN-PED-03).
- O aluno **não faz pedido do próprio anúncio** (RN-ANU-10): 403 `OWN_LISTING`. Admin também não faz pedido (RN §3).
- A quantidade pedida não pode passar das unidades disponíveis (RN-EST-02).
- **Pedido aberto é reaproveitado** (RN-PED-10): se o comprador já tem um pedido Pendente (ou Em negociação) para o mesmo anúncio e a mesma forma de negociação, `POST /orders` e `POST /orders/contact` devolvem esse pedido, atualizando a quantidade e os valores se ela mudou. O banco garante com o índice único `uq_pedido_aberto`.
- O pedido guarda também o **vendedor, o nome do produto e a imagem principal** do momento da compra (RN-PED-01).
- A negociação pelo WhatsApp **não tem prazo** (RN-PED-11): fica "Em negociação" até alguém encerrar.
- Se, ao concluir uma negociação, o estoque não bastar, a resposta é 409 `OUT_OF_STOCK` e o pedido continua "Em negociação" (RN-PED-13).
- Ao cancelar um pedido Pendente que já tem cobrança aberta no gateway, o backend cancela também a cobrança (`cancelPayment`).


### 9.6 payments

| Método e rota | Acesso | O que faz | Origem |
|---|---|---|---|
| `POST /payments/card` | Comprador | Cobra no cartão a partir do token do gateway | RN-PAG-02, 07 |
| `POST /payments/pix` | Comprador | Gera a cobrança Pix (QR Code e copia e cola), válida por 30 minutos | RN-PAG-04 |
| `POST /payments/webhook` | Gateway | Recebe o aviso de pagamento (sem JWT; valida a assinatura) | RN-PAG-05, 06 |

Antes de cobrar, a API confere se ainda há estoque e responde 409 `OUT_OF_STOCK` se não houver (aviso antecipado, sem reservar). A decisão final acontece na liquidação do pagamento. Detalhes na seção 11.


### 9.7 notifications

Módulo **interno**, sem rotas no MVP: os outros módulos chamam o `notifications.service`, que envia o e-mail. Na Vercel, o envio usa `await` ou `waitUntil`, porque uma tarefa solta depois da resposta pode ser cortada (seção 11).

| Evento | Quem recebe | Canal | Origem |
|---|---|---|---|
| Venda confirmada (pagamento aprovado) | Vendedor | E-mail | RN-NOT-01 |
| Produto excluído pelo administrador | Vendedor | E-mail | RN-NOT-02 |
| Pedido pago cancelado com estorno (sem estoque, anúncio inativo ou pagamento tardio) | Comprador | E-mail | RN-NOT-03 |

O canal é o e-mail; não há tela de notificações no MVP (RN-NOT-04).


### 9.8 admin / users

Todas as rotas de `/admin/*` passam por `authenticate` e `authorizeRole("admin")`, **aplicados uma única vez** na raiz da área (RN-ADM-01):

```ts
// src/admin/admin.routes.ts  (imports dos três módulos omitidos)
const router = Router()

// proteção aplicada UMA vez: vale para todas as rotas abaixo
router.use(authenticate, authorizeRole('admin'))

router.use('/users', adminUsersRoutes)
router.use('/listings', adminListingsRoutes)
router.use('/audit-logs', auditLogsRoutes)

export default router
```

| Método e rota | Acesso | O que faz | Origem |
|---|---|---|---|
| `GET /admin/users` | Admin | Lista usuários com status de acesso; aceita `search` (nome ou e-mail) e `page` | RN-ADM-02 |
| `GET /admin/users/stats` | Admin | Cadastrados, logados agora e novos na semana (só alunos; "logados agora" só contas ativas) | RN-ADM-02 |
| `GET /admin/users/:id` | Admin | Detalhes, indicadores e anúncios do usuário | RF020 |
| `PATCH /admin/users/:id` | Admin | Altera só o status da conta (`{ status: "ativa" \| "suspensa" }`); qualquer outro campo é recusado (400) | RN-ADM-04, 05 |
| `DELETE /admin/users/:id` | Admin | Anonimiza a conta (mesmo tratamento do RN-PER-06), com confirmação; 409 `HAS_OPEN_PAID_ORDERS` se houver pedido Pago ou em Retirada combinada em aberto | RN-ADM-06 |

- **"Logado agora"** = atividade nos últimos 5 minutos, pelo campo `lastSeen`; depois disso mostra o tempo desde o último acesso (RN-ADM-03).
- Suspender impede o login e oculta os anúncios, **sem apagar dados** (RN-ADM-05).
- O admin não edita foto, nome, e-mail, curso nem WhatsApp: os dados aparecem só para consulta (RN-ADM-04, decisão de 26/10; desvio do PDF nas Regras §10).
- Toda edição, suspensão e exclusão grava log de auditoria, com data e responsável (RN-ADM-10).
- **Proteção do admin** (RN-ADM-12): o admin não suspende nem exclui a própria conta, e o último admin ativo não pode ser removido (409 `ADMIN_PROTECTED`).


### 9.9 admin / listings

| Método e rota | Acesso | O que faz | Origem |
|---|---|---|---|
| `GET /admin/listings` | Admin | Lista produtos; filtra por `search` (nome ou vendedor), `category` e `page` | RN-ADM-07 |
| `GET /admin/listings/stats` | Admin | Ativos, pausados e vendidos no mês | RN-ADM-07 |
| `GET /admin/listings/:id` | Admin | Detalhes, vendedor e indicadores | RF023 |
| `PATCH /admin/listings/:id` | Admin | Altera só o status do anúncio (`{ status: "ativo" \| "pausado" }`), inclusive para reverter Vendido; qualquer outro campo é recusado (400) | RN-ADM-08 |
| `DELETE /admin/listings/:id` | Admin | Exclusão lógica, notifica o vendedor e pede confirmação; 409 `HAS_OPEN_PAID_ORDERS` com pedido Pago ou em Retirada combinada em aberto | RN-ADM-09 |

- Dados, imagens e vendedor aparecem só para consulta; não há troca de vendedor (RN-ADM-08, decisão de 26/10; desvio do PDF nas Regras §10).
- **Só o admin reverte "Vendido"** (RN §4), e a ação vai para o log. Para o dono, "Vendido" é final.


### 9.10 admin / audit-logs

| Método e rota | Acesso | O que faz | Origem |
|---|---|---|---|
| `GET /admin/audit-logs` | Admin | Consulta o histórico por responsável, ação e período (sem tela no protótipo) | RN-ADM-10 |

O log **não é criado por rota**: ele é gravado pelos services de admin, na mesma transação da ação (seção 18).


### 9.11 Rota técnica

| Método e rota | Acesso | O que faz | Origem |
|---|---|---|---|
| `GET /health` | Público | Leve: responde 200 `{"status":"ok"}` sem consultar o banco. É a que o monitor chama | RNF011 |
| `GET /health/db` | Público | Faz `SELECT 1`: 200 se o banco responde, 503 se não. Para conferir o deploy, não para o monitor | RNF011 |


## 10. Fluxos principais

Os fluxos de **login, Google, cadastro e recuperação de senha** estão na seção 8, e os de **pagamento**, na seção 11. Abaixo, os demais.


### Contato por WhatsApp

```text
 1. Frontend ▶ API       POST /orders/contact {anúncio, quantidade}
 2. API                  valida: anúncio ativo, comprador diferente do dono, quantidade ≤ disponível
 3. API ▶ Banco          cria o pedido "Em negociação" (sem reservar nem descontar estoque)
                         e soma 1 aos contatos do anúncio (reaproveita o pedido se já houver um aberto)
 4. API ▶ Frontend       201 {pedido}
 5. Frontend ▶ WhatsApp  abre wa.me/55…?text=mensagem sobre o anúncio (montado no frontend)
```

- O backend **registra antes** de o frontend abrir o link `wa.me` (seção 11 do documento de Frontend).
- O contato incrementa o indicador "contatos pelo WhatsApp" do anúncio (RN-ANU-08).
- O estoque **não** é reservado nem descontado aqui (RN-PED-05).


### Concluir uma venda combinada por WhatsApp

```text
 1. Frontend (vendedor) ▶ API   POST /orders/:id/complete
 2. API                         valida: pedido "Em negociação" e quem pede é o vendedor do anúncio
 3. API ▶ Banco                 transação: desconta o estoque de forma atômica (quantidade >= n)
    ├─ HAVIA ESTOQUE
    │   4. API ▶ Banco          pedido "Concluído"; se a quantidade chegou a 0, anúncio "Vendido"
    │   5. API ▶ Frontend       200
    └─ ESTOQUE INSUFICIENTE
        4. API ▶ Frontend       409 OUT_OF_STOCK (o pedido continua "Em negociação")
```


### Retirada de um pedido pago

```text
 1. Vendedor ▶ API    POST /orders/:id/arrange-pickup
 2. API               valida: pedido "Pago" e quem pede é o vendedor do anúncio
 3. API ▶ Banco       pedido "Retirada combinada"
 4. API ▶ Vendedor    200

    ── encontro presencial combinado por WhatsApp ──

 5. Comprador ▶ API   POST /orders/:id/confirm-receipt
 6. API               valida: pedido "Retirada combinada" e quem pede é o comprador
 7. API ▶ Banco       pedido "Concluído"
 8. API ▶ Comprador   200
```

- No pedido pago, **o vendedor marca e o comprador confirma** o recebimento, que conclui o pedido (RN-PED-08).
- A entrega é presencial, combinada por WhatsApp (RN-PED-09).


### Publicação de anúncio

```text
 1. Frontend ▶ API      POST /listings (multipart: dados do anúncio + a 1ª imagem)
 2. API                 só aluno; valida nome, categoria, descrição, preço > 0, quantidade ≥ 1,
                        WhatsApp e a imagem (JPG/PNG de até 4 MB, tipo pelo conteúdo real)
 3. API ▶ Storage       envia a imagem
 4. Storage ▶ API       URL segura da imagem
 5. API ▶ Banco         em uma transação: cria o anúncio (status Ativo) e registra a imagem
 6. API ▶ Frontend      201 {anúncio, categoria}

    Se o banco falhar no passo 5, a imagem já enviada é removida do storage.

 7. Frontend ▶ API      (se houver mais imagens) POST /listings/:id/images, uma chamada por imagem
 8. Frontend            ao terminar ▶ pop-up "Anúncio publicado!"
```

- O tipo do arquivo é conferido pelo **conteúdo real**, não pela extensão.
- O anúncio e a primeira imagem são gravados em uma única transação; as demais imagens são acrescentadas uma a uma. Se uma falhar, o anúncio fica com as que subiram e o aluno tenta de novo.
- A resposta informa a categoria em que o anúncio passou a aparecer (RF016.2).


### Exclusão de produto pelo administrador

```text
 1. Frontend (admin) ▶ API   DELETE /admin/listings/:id  (JWT do administrador)
 2. API                      authenticate + authorizeRole("admin")
 3. API ▶ Banco              confere que não há pedido Pago ou em Retirada combinada em aberto
                             (se houver ▶ 409 HAS_OPEN_PAID_ORDERS); transação: exclusão lógica
                             (excluido_em), cancela os pedidos Pendentes e Em negociação e grava
                             o log de auditoria (pedidos pagos seguem no histórico do comprador)
 4. API ▶ E-mail             avisa o vendedor sobre a exclusão (RN-NOT-02)
 5. API ▶ Frontend           204 No Content
```

- O log de auditoria e a exclusão acontecem **na mesma transação**: sem log, sem exclusão (RN-ADM-10).
- Pedidos já pagos continuam no histórico do comprador (RN-ANU-09). A exclusão é lógica e bloqueada com pedido pago em aberto (RN-ADM-09).


## 11. Pagamentos

O Unishop **não guarda dado de cartão**: o pagamento é processado por um gateway externo, em cartão ou Pix (RN-PAG-01). O gateway é o Mercado Pago (ADR-002, decidido pelo grupo). O backend fala com o gateway só pela interface `PaymentGateway`.


### Interface do provider

| Método | Para quê |
|---|---|
| `createCardPayment(token, valor, parcelas, referência, chaveDeIdempotência)` | Cobra no cartão com o token vindo do frontend |
| `createPixPayment(valor, expiração, referência, chaveDeIdempotência)` | Gera o QR Code e o código "copia e cola" |
| `getPayment(id)` | Consulta o status real do pagamento |
| `verifyWebhook(cabeçalhos, query)` | Confere a assinatura (HMAC, janela de 5 min) do aviso (`docs/api/api.md`, seção 5.6) |
| `cancelPayment(id)` | Cancela uma cobrança pendente (Pix expirado) |
| `refundPayment(id, chaveDeIdempotência)` | Estorna um pagamento aprovado que não pôde ser honrado (sem estoque, anúncio inativo ou pagamento tardio; RN-PAG-08, 13, 14) |


### Cálculo do valor

- **Subtotal** = preço do anúncio × quantidade.
- **Taxa de serviço** = **R$ 0,00 por enquanto** (RN-PED-02). Fica no parâmetro `SERVICE_FEE_PERCENT=0`, para mudar sem alterar código.
- **Total** = subtotal + taxa (`valor_total`). A tela de pagamento ainda mostra a linha da taxa, com R$ 0,00 (RN-PAG-09).
- O cálculo é feito **só no backend**, em centavos, e gravado no pedido junto com o preço unitário (RN-PED-01). O frontend exibe o que a API devolve e nunca recalcula.

Exemplo (livro de R$ 45,00, 2 unidades):

```text
Preço unitário .... R$ 45,00   (congelado no pedido)
Subtotal .......... R$ 45,00 × 2 = R$ 90,00
Taxa de serviço ... R$  0,00
Total ............. R$ 90,00     (9000 centavos, guardado como inteiro)
```

> **Repasse (RN-PAG-10).** O valor é cobrado em uma **conta única de teste**, e o repasse ao vendedor é **simulado** no escopo acadêmico. Não há divisão de pagamento (*split*) no gateway.


### A regra do estoque

O estoque **não é reservado** no pagamento (RN-PAG-08). Vale o primeiro pagamento confirmado.

| Quando | O que acontece com o estoque | Regra |
|---|---|---|
| Criar o pedido ou gerar o Pix | Nada. Só confere se a quantidade pedida cabe no estoque (aviso antecipado) | RN-PAG-08, RN-EST-02 |
| Pagamento confirmado (Pix ou cartão) | Desconta de forma atômica, na liquidação | RN-EST-03, 04 |
| Contato por WhatsApp ("Em negociação") | Nada | RN-PED-05 |
| Vendedor conclui a venda do WhatsApp | Desconta de forma atômica | RN-EST-03, 04 |
| Quantidade chega a zero | O anúncio passa a "Vendido" | RN-EST-06 |
| Estoque acabou antes da confirmação | Pedido cancelado e valor estornado | RN-PAG-08 |
| Anúncio pausado, vendido, excluído ou vendedor suspenso na confirmação | Pedido cancelado e valor estornado | RN-PAG-14 |
| Pagamento aprovado em pedido já cancelado | Valor estornado, sem mexer no estoque | RN-PAG-13 |

O desconto é um único comando no banco, que só altera a linha se houver unidades suficientes:

```sql
UPDATE anuncio
   SET quantidade = quantidade - :n
 WHERE id_anuncio = :id AND quantidade >= :n;

-- 1 linha alterada   => havia estoque
-- 0 linhas alteradas => não há estoque (RN-EST-04)
-- Além disso, o banco tem CHECK (quantidade >= 0): nunca fica negativa (RN-EST-05)
```


### Liquidação do pagamento

Pix e cartão passam pela **mesma rotina**, que roda em uma transação. Ela é a única que muda o pedido para "Pago".

```text
Pagamento aprovado pelo gateway (webhook ou cartão)
 └─ abre transação e trava o pedido
      ├─ pedido já está Pago?       ▶ não faz nada (idempotência, RN-PAG-06)
      ├─ pedido já está Cancelado?  ▶ pagamento "estorno_pendente"; estorna depois da transação
      │                               (pagamento tardio, RN-PAG-13) e avisa o comprador
      ├─ anúncio não está ativo, foi excluído ou a conta do vendedor está suspensa?
      │                             ▶ pedido "Cancelado" · pagamento "estorno_pendente" (RN-PAG-14)
      └─ desconta o estoque:  UPDATE ... WHERE quantidade >= n
           ├─ alguma linha alterada?  SIM
           │     ▶ pedido "Pago" · pagamento "Aprovado"
           │     ▶ se quantidade = 0, anúncio "Vendido"
           │     ▶ (depois da transação) notifica o vendedor
           └─ nenhuma linha alterada?  NÃO (o estoque acabou)
                 ▶ pedido "Cancelado" · pagamento "estorno_pendente" (RN-PAG-08)

Depois da transação, nos três casos de cancelamento:
  estorna o valor no gateway (await) ▶ pagamento "Estornado" · e-mail ao comprador (RN-NOT-03)
  se o estorno falhar, o pagamento continua "estorno_pendente" e o job refaz (seção 14)
```

A ordem de gravação importa: o banco registra `estorno_pendente` **antes** de chamar o gateway. Assim, uma falha no meio nunca perde o dinheiro: o job encontra a linha e tenta de novo, e a chave de idempotência do estorno impede estornar duas vezes.


### Pagamento com Pix

```text
 1. Frontend ▶ API      POST /orders {anúncio, quantidade}
 2. API                 valida: anúncio ativo, comprador diferente do dono, quantidade ≤ disponível
                        (sem reservar)
 3. API ▶ Banco         cria o pedido "Pendente" com vendedor, produto, imagem, preço unitário e total
                        congelados, ou reaproveita o pedido pendente do mesmo comprador (RN-PED-10)
 4. API ▶ Frontend      201 {pedido, subtotal, taxa R$ 0,00, total}
 5. Frontend ▶ API      POST /payments/pix {pedido}
 6. API ▶ Gateway       cria a cobrança Pix (total, expira em 30 min, referência = pedido)
 7. Gateway ▶ API       QR Code e código "copia e cola"
 8. API ▶ Banco         grava o pagamento "Pendente" com a data de expiração e a chave de idempotência
 9. API ▶ Frontend      201 {QR Code, copia e cola, expira em}

    Pix pendente NÃO reserva a unidade: vale o primeiro pagamento confirmado (RN-PAG-08).
```

```text
    ── o aluno paga no aplicativo do banco ──

10. Gateway ▶ API       POST /payments/webhook (aviso de pagamento aprovado)
11. API                 valida a assinatura do aviso
12. API ▶ Gateway       consulta o pagamento (não confia só no aviso) ▶ status: aprovado
13. API ▶ Banco         transação: trava o pedido (idempotente) e desconta o estoque (atômico)
    ├─ HAVIA ESTOQUE
    │   14. API ▶ Banco       pedido "Pago" e pagamento "Aprovado"; se quantidade = 0, anúncio "Vendido"
    │   15. API               notifica o vendedor sobre a venda
    └─ NÃO PODE SER HONRADO: estoque acabou, anúncio inativo ou pedido já cancelado (RN-PAG-08, 13, 14)
        14. API ▶ Banco       pedido "Cancelado" e pagamento "estorno_pendente"
        15. API ▶ Gateway     estorna o valor; o pagamento vira "Estornado"; e-mail ao comprador
16. API ▶ Gateway       200 OK
```

```text
    ── enquanto isso, a tela de pagamento consulta o status (RN-PAG-11) ──

17. Frontend ▶ API      GET /orders/:id  (a cada poucos segundos)
18. API ▶ Frontend      "Pago" ▶ /pedido-confirmado/:id  ·  "Cancelado" ▶ aviso (item acabou ou pedido cancelado)
```

- O Pix expira em **30 minutos** (RN-PAG-04). Expirado, o pedido é **cancelado** e o aluno faz um **novo pedido**; não existe novo código no mesmo pedido. A resposta de `POST /payments/pix` num pedido já cancelado é 409 `PIX_EXPIRED`.
- Pedido Pendente sem pagamento aprovado é cancelado **30 minutos** depois de criado, seja Pix ou cartão abandonado (RN-PAG-12). O cancelamento acontece no job `expire-pix-payments` e também sob demanda, quando alguém lê o pedido.
- Se o Pix for pago depois do cancelamento, o webhook **estorna automaticamente** e avisa o comprador (RN-PAG-13).
- A tela só mostra "pago" quando o pedido está como Pago no backend (RN-PAG-11). O retorno do navegador não confirma nada.


### Pagamento com cartão

```text
 1. Frontend ▶ Gateway  o SDK envia os dados do cartão e recebe um token (nunca passam pelo Unishop)
 2. Frontend ▶ API      POST /payments/card {pedido, token, parcelas}
 3. API ▶ Gateway       cria o pagamento usando o token  ▶  aprovado ou recusado
    ├─ RECUSADO
    │   4. API ▶ Banco       pagamento "Recusado"; o pedido continua "Pendente"
    │   5. API ▶ Frontend    402 PAYMENT_DECLINED ▶ o aluno pode tentar de novo (RN-PAG-07)
    └─ APROVADO ▶ mesma liquidação do Pix
        4. API ▶ Banco       transação: confere anúncio ativo e desconta o estoque (atômico)
        ├─ havia estoque ▶ pedido "Pago"; notifica o vendedor; API ▶ Frontend 200 {status: pago}
        ├─ estoque acabou ▶ pedido "Cancelado"; estorna o valor; API ▶ Frontend 409 OUT_OF_STOCK
        └─ anúncio inativo ▶ pedido "Cancelado"; estorna o valor; API ▶ Frontend 409 LISTING_UNAVAILABLE
```

- **Cada tentativa é uma linha** em `pagamento`: a cobrança recusada fica no histórico e a nova tentativa cria outra linha (só uma pode estar em andamento, índice `uq_pagamento_ativo`). A chave de idempotência inclui o **número da tentativa**, para a nova cobrança não repetir a chave da recusada.
- O cartão abandonado (sem aprovação) é cancelado em 30 minutos, como o Pix (RN-PAG-12).


### Webhook

```text
Gateway chama POST /payments/webhook
 ├─ assinatura inválida?             ▶ 401 (registra tentativa suspeita)
 ├─ consulta o pagamento no gateway
 └─ status na consulta?
      ├─ aprovado ▶ liquidação do pagamento (ver acima) ▶ 200 OK
      └─ recusado ▶ pagamento "Recusado" (pedido segue Pendente) ▶ 200 OK
```

Aviso de pagamento aprovado para um pedido **já Cancelado** não muda o pedido: o pagamento vai para "estorno_pendente" e o backend estorna e avisa o comprador (RN-PAG-13).

- **Assinatura obrigatória.** Aviso sem assinatura válida recebe 401 e é registrado em log.
- **Quem confirma é o webhook** (RN-PAG-05). O backend consulta o pagamento no gateway antes de mudar qualquer status.
- **Idempotente** (RN-PAG-06). O mesmo aviso pode chegar várias vezes; o segundo não desconta estoque de novo nem cria outro pedido pago, e não notifica de novo.
- **Resposta rápida.** Responde 200 logo após gravar. O e-mail ao vendedor e o estorno rodam depois da transação, mas **antes de a função terminar** (ver "Tarefas depois da resposta", abaixo).
- Se o aviso se perder, o job `reconcile-pending-payments` corrige (seção 14).


### Tarefas depois da resposta (Vercel)

Na Vercel a API é uma função: quando a resposta sai, a função pode ser suspensa, e uma promessa solta (sem `await`) pode ser cortada no meio. Por isso, no que acontece "depois da transação":

- **Estorno** (RN-PAG-08, 13, 14): `await` **antes** de responder. É decisão de dinheiro e não pode se perder. O pagamento já está gravado como `estorno_pendente`; se a chamada falhar, o job `reconcile-pending-payments` refaz o estorno (seção 14).
- **E-mail e notificação** (RN-NOT-01 a 03): `waitUntil(...)`, do pacote `@vercel/functions`, que mantém a função viva até a tarefa terminar, com o mesmo tempo limite da função (até 300 s no plano gratuito). Se o `waitUntil` falhar, o erro vai para o log, sem derrubar a resposta.

```ts
import { waitUntil } from '@vercel/functions'

await refundPayment(paymentId)                       // estorno: esperar
waitUntil(notifySeller(order).catch(logError))       // e-mail: não bloqueia a resposta
res.json({ ok: true })
```

Em desenvolvimento local (`dev-server.ts`) o `waitUntil` não faz nada de especial e a tarefa roda normalmente, então o comportamento é o mesmo.

### Testando sem dinheiro real

- Usar o **sandbox** do gateway: contas de teste de comprador e vendedor, cartões de teste e Pix simulado.
- Para o webhook chegar ao computador local, usar um túnel público (ngrok ou Cloudflare Tunnel). Na Vercel, **previews não recebem o webhook** (a URL cadastrada no Mercado Pago é uma só); o teste de pagamento ponta a ponta é local ou em produção.
- Credenciais de teste só no `.env` local; as de produção ficam fora do código e do Git.


## 12. Estados e transições

Cada recurso tem um conjunto fechado de estados. Quem decide se uma mudança é permitida é o **service** (um método `assertCanTransition`, em `*.rules.ts`), nunca o controller. Essas regras são testadas (seção 19). Os valores dos estados são os do documento de Banco de Dados (seção 6), em português.


### Anúncio

```text
 publicar
    ▼
  ATIVO ◀──── reativar ────▶ PAUSADO
    │                           │
    └── estoque zerou ou ───────┘
        marcar como vendido
                │
                ▼
            VENDIDO     (final para o dono; só o admin reverte, e vai para o log)

 Qualquer estado ▶ EXCLUÍDO  (exclusão lógica; bloqueada com pedido pago em aberto)
```

| De | Para | Quem | Como |
|---|---|---|---|
| Ativo | Pausado | Dono, admin | Some das listagens e buscas; mantém dados e unidades (RF017.7) |
| Pausado | Ativo | Dono, admin | Volta às listagens, se a conta não estiver suspensa (RF017.8) |
| Ativo ou Pausado | Vendido | Sistema | A quantidade chegou a zero depois de uma venda (RN-EST-06) |
| Ativo ou Pausado | Vendido | Dono | "Marcar como vendido", com confirmação. Zera as unidades que sobraram (RF017.9) |
| Vendido | Ativo ou Pausado | Só admin | Reversão registrada no log (RF024.5, RF018.5) |
| Qualquer | Excluído | Dono, admin | Exclusão lógica (`excluido_em`), bloqueada com pedido Pago ou em Retirada combinada em aberto. Pedidos pagos continuam no histórico do comprador (RN-ANU-09) |

A suspensão da conta do dono **oculta** os anúncios sem mudar o status deles (RN-ADM-05).


### Pedido

```text
Pagamento pelo site ("Seguir para o pagamento"):
  PENDENTE ──webhook confirma e estoque descontado──▶ PAGO
  PAGO ──vendedor marca──▶ RETIRADA COMBINADA ──comprador confirma o recebimento──▶ CONCLUÍDO
  PENDENTE ──Pix expirou / 30 min sem pagar / comprador cancela──▶ CANCELADO
  PENDENTE ──pagamento aprovado, mas sem estoque ou anúncio inativo (estorno)──▶ CANCELADO

Contato pelo WhatsApp:
  EM NEGOCIAÇÃO ──vendedor confirma a venda (desconta estoque)──▶ CONCLUÍDO
  EM NEGOCIAÇÃO ──vendedor encerra ou comprador cancela──▶ CANCELADO
```

| Transição | Quem | Regra |
|---|---|---|
| (início) → Pendente | Comprador | "Seguir para o pagamento". Não reserva estoque |
| (início) → Em negociação | Comprador | Contato por WhatsApp; sem reserva nem desconto (RN-PED-05) |
| Pendente → Pago | Sistema | Webhook confirmado e estoque descontado (RN-PAG-05, RN-EST-03) |
| Pendente → Cancelado | Sistema | Pix expirou, 30 minutos sem pagamento, ou pagamento aprovado sem estoque ou com anúncio inativo, com estorno (RN-PAG-04, 08, 12, 14) |
| Pendente → Cancelado | Comprador | Cancela o próprio pedido (RN-PED-12) |
| Pago → Retirada combinada | Vendedor | Marcado em Gerenciar anúncio (RN-PED-08) |
| Retirada combinada → Concluído | Comprador | Confirma o recebimento (RN-PED-08) |
| Em negociação → Concluído | Vendedor | Confirma a venda e desconta o estoque (RN-EST-03) |
| Em negociação → Cancelado | Vendedor ou comprador | Vendedor encerra a negociação; comprador cancela o pedido (RN-PED-12) |

Um valor por estado no banco; o texto na interface muda conforme o lado (RN §4):

| Valor no banco | Significado | Texto na interface |
|---|---|---|
| `pendente` | Aguardando pagamento (Pix ou cartão) | "Aguardando pagamento" |
| `pago` | Pagamento confirmado | Comprador: "Pago · aguardando retirada" (RF014.3). Vendedor: "Pago · combinar retirada" (RF011.3) |
| `retirada_combinada` | Encontro marcado | "Retirada combinada" |
| `concluido` | Produto entregue | "Concluído" |
| `em_negociacao` | Contato por WhatsApp registrado (RN-PED-05) | "Em negociação" |
| `cancelado` | Pedido encerrado sem venda | "Cancelado" |

Um pedido `cancelado` nunca volta a `pendente`.


### Pagamento

```text
 cria a cobrança ▶ PENDENTE ──── gateway aprova ────────▶ APROVADO ──pedido não pode ser honrado──▶ ESTORNO_PENDENTE ──gateway estorna──▶ ESTORNADO
                      │                                                  (RN-PAG-08, 13, 14)
                      ├──── gateway recusa (cartão) ───▶ RECUSADO     (o aluno tenta de novo: NOVA LINHA)
                      │
                      └──── Pix passou de 30 min ───▶ EXPIRADO       (o pedido é cancelado)
```

Cada tentativa é uma linha; só uma linha por pedido pode estar `pendente` ou `aprovado` ao mesmo tempo. No pagamento aprovado e honrado, o estado fica `aprovado`.


### Conta do usuário

```text
 cadastro com e-mail e senha ▶ ATIVA          (MVP: confirmação de e-mail desligada)
 cadastro com e-mail e senha ▶ PENDENTE DE CONFIRMAÇÃO ── confirma o e-mail ──▶ ATIVA
                               (só com EMAIL_VERIFICATION_REQUIRED ligada, RN-ACE-07)
 1º acesso com Google ───────────────────────────────────────────────────────▶ ATIVA
                               (sem senha, verificada; aceite dos Termos pendente até "completar cadastro")

 ATIVA ──5 senhas erradas──▶ BLOQUEADA POR 15 MIN ──passou o tempo──▶ ATIVA
 ATIVA ◀──── admin suspende / reativa ────▶ SUSPENSA
 ATIVA ou SUSPENSA ── usuário ou admin exclui ──▶ EXCLUÍDA (anonimizada)
```

"Bloqueada" tem data de término e passa sozinha (RN-ACE-09). "Suspensa" só o admin reverte (RN-ADM-05).


## 13. Serviços externos (providers)

| Interface | Implementação | Variáveis | Usado em |
|---|---|---|---|
| `OAuthProvider` | `google.provider.ts` | GOOGLE_CLIENT_ID | auth |
| `PaymentGateway` | `mercadopago.provider.ts` | MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET | payments, jobs |
| `MailProvider` | `resend.provider.ts (Mailtrap em dev)` | RESEND_API_KEY, MAIL_FROM | auth, users, notifications |
| `StorageProvider` | `cloudinary.provider.ts` | CLOUDINARY_URL, CLOUDINARY_UPLOAD_FOLDER | listings, users, admin |
| `AntiBotProvider` | `turnstile.provider.ts` (depois do MVP) | TURNSTILE_SECRET_KEY | auth |


### Regras para todo provider

- Cada um tem uma **interface** própria; o resto do código só conhece a interface.
- A implementação é escolhida em um único ponto (`config/`), o que permite trocar de serviço ou usar **mock nos testes**.
- Toda chamada externa tem **tempo limite** (10 segundos) e, se falhar, vira 502 ou 503 `EXTERNAL_SERVICE_ERROR`, sem expor detalhe do serviço.
- Chaves nunca aparecem em log. Todo segredo é embrulhado no wrapper `Secret` e só o provider chama `reveal()`.
- A implementação de teste (`mock`, `console`, `local`) é proibida em produção: o servidor se recusa a iniciar. A lista completa das APIs externas, as travas, os timeouts e o modelo de segurança "backend-cofre" estão em `docs/api/api.md`.


### E-mails enviados

| Modelo | Quando | Conteúdo principal |
|---|---|---|
| Confirmar conta | Cadastro, só com `EMAIL_VERIFICATION_REQUIRED` ligada (RN-ACE-07) | Link de ativação |
| Redefinir senha | Pedido de recuperação | Link com validade de 30 minutos |
| Confirmar novo e-mail | Troca de e-mail | Link enviado ao novo endereço |
| Venda realizada | Pagamento aprovado | Produto, comprador e como combinar a retirada (RN-NOT-01) |
| Anúncio excluído | Exclusão pelo admin | Produto afetado e motivo (RN-NOT-02) |
| Pedido cancelado com estorno | Pagamento aprovado sem estoque, com anúncio inativo ou depois do cancelamento | Produto, valor estornado e o que fazer (RN-NOT-03) |


## 14. Jobs agendados

Em **desenvolvimento**, rodam no mesmo processo da API, com `node-cron` (`jobs/scheduler.ts`, carregado só pelo `dev-server.ts`). Em **produção (Vercel)** não existe processo ligado, então cada job é um **endpoint HTTP** que um agendador chama (`jobs/registry.ts` liga o nome do job à função). Todo job é **idempotente**: se rodar duas vezes seguidas, o resultado é o mesmo.

| Job | Frequência | O que faz | Origem |
|---|---|---|---|
| `expire-pix-payments` | A cada 30 minutos | Cancela os pedidos pendentes sem pagamento aprovado há mais de 30 minutos (Pix vencido ou cartão abandonado) e cancela a cobrança no gateway. **Não há estoque para devolver**, pois nada foi reservado | RN-PAG-04, RN-PAG-12 |
| `cleanup-expired-tokens` | Uma vez por dia | Apaga tokens de confirmação e de senha vencidos ou já usados | RN-ACE-10 |
| `reconcile-pending-payments` | A cada 30 minutos | Consulta no gateway os pagamentos pendentes recentes e corrige os que perderam o aviso do webhook. Refaz os estornos que ficaram em `estorno_pendente` (até 10 tentativas, com o erro em `ultimo_erro`) | RN-PAG-05, RN-PAG-08, RN-PAG-13 |

A frequência de 30 minutos é uma escolha de custo e de atividade: foi decidida pelo grupo por causa das CU-horas do Neon e mantida no Supabase, onde as chamadas também evitam a pausa do projeto por inatividade (`docs/deploy/deploy.md`, seção 7). Como o cancelamento também acontece **sob demanda** (quando alguém lê ou paga o pedido), o atraso do agendador não é visível ao usuário. Se o consumo permitir, a frequência pode cair para 15 minutos.

### Jobs em produção: endpoints e agendador

Cada job responde em `GET /api/v1/internal/jobs/<nome>`, com o nome do job da tabela acima (`expire-pix-payments`, `reconcile-pending-payments`, `cleanup-expired-tokens`). O endpoint **não** usa `authenticate` nem `trackLastSeen`: ele só confere o cabeçalho `Authorization: Bearer <CRON_SECRET>` (comparação em tempo constante, `timingSafeEqual`) e responde 401 se estiver errado, inclusive com `Bearer undefined` ou `Bearer [REDACTED]`. Nunca entra no `openapi.yaml` público.

| Job | Quem chama em produção | Por quê |
|---|---|---|
| `expire-pix-payments` | **Agendador externo** (cron-job.org ou similar), a cada 30 minutos | O Vercel Cron gratuito só roda uma vez por dia |
| `reconcile-pending-payments` | **Agendador externo**, a cada 30 minutos | É a rede de segurança do webhook e dos estornos |
| `cleanup-expired-tokens` | **Vercel Cron**, uma vez por dia (`backend/vercel.json`) | Diário cabe no plano gratuito |

Além do job, a API **cancela o pedido vencido sob demanda**: ao ler ou pagar um pedido pendente cujo prazo de 30 minutos passou, o cancela na hora, sem depender do relógio do agendador.

> Na Vercel a função escala sozinha, então a regra de "uma instância" deixa de valer: a segurança vem de os jobs serem **idempotentes**. O **backup diário** do banco (RNF011) não é um script no servidor: é um workflow do GitHub Actions (o Supabase gratuito não tem backup nem ponto no tempo próprios; `docs/deploy/deploy.md`, seção 11).


## 15. Erros e formato de resposta

O frontend trata todo erro do mesmo jeito, por isso o formato é único. O contrato final fica no `openapi.yaml`; esta é a proposta.

Sucesso, item único e lista paginada:

```json
{ "data": { "id": 12, "name": "Cálculo I" } }
```

```json
{
  "data": [ { "id": 12, "name": "Cálculo I" } ],
  "meta": { "page": 1, "limit": 20, "total": 134, "totalPages": 7 }
}
```

Erro:

```json
{
  "error": {
    "code": "EMAIL_DOMAIN_NOT_ALLOWED",
    "message": "Use seu e-mail institucional @edu.unifor.br.",
    "details": [ { "field": "email", "message": "Domínio não permitido" } ],
    "requestId": "b7f1c2..."
  }
}
```


### Status HTTP e códigos

| Status | Quando | Códigos |
|---|---|---|
| 200 · 201 · 204 | Sucesso, criado, sem conteúdo | — |
| 400 | Entrada inválida | VALIDATION_ERROR, TOKEN_INVALID, TOKEN_EXPIRED, CURRENT_PASSWORD_INVALID |
| 401 | Sem login, token inválido ou credencial errada | UNAUTHENTICATED, TOKEN_EXPIRED, INVALID_CREDENTIALS |
| 402 | Pagamento recusado | PAYMENT_DECLINED |
| 403 | Sem permissão, perfil errado ou conta barrada | FORBIDDEN, OWN_LISTING, ACCOUNT_SUSPENDED, EMAIL_NOT_VERIFIED (só com a chave ligada), EMAIL_DOMAIN_NOT_ALLOWED, TERMS_NOT_ACCEPTED, BOT_CHECK_FAILED (quando o Turnstile entrar) |
| 404 | Inexistente ou invisível para quem pediu | NOT_FOUND |
| 409 | Conflito de estado | EMAIL_ALREADY_REGISTERED, OUT_OF_STOCK, LISTING_UNAVAILABLE, INVALID_STATE, PIX_EXPIRED, HAS_OPEN_PAID_ORDERS, HAS_OPEN_ORDERS, ADMIN_PROTECTED |
| 413 · 415 | Arquivo grande ou de tipo não aceito | FILE_TOO_LARGE, FILE_TYPE_NOT_ALLOWED |
| 429 | Muitas tentativas | TOO_MANY_REQUESTS, ACCOUNT_LOCKED (com `retryAfter`) |
| 500 | Erro inesperado | INTERNAL_ERROR (sem detalhe técnico) |
| 502 · 503 | Serviço externo fora do ar | EXTERNAL_SERVICE_ERROR |


### Como o frontend usa os códigos

| Código | Estado da tela (Frontend, seção 12) |
|---|---|
| `VALIDATION_ERROR` | Mensagem de erro embaixo de cada campo, usando `details` |
| `TOKEN_EXPIRED (login)` | Sessão expirada: aviso e volta ao login |
| `TERMS_NOT_ACCEPTED` | Leva à tela "completar cadastro" (primeiro acesso por Google) |
| `CURRENT_PASSWORD_INVALID` | Erro no campo "senha atual", sem encerrar a sessão |
| `HAS_OPEN_PAID_ORDERS, HAS_OPEN_ORDERS, ADMIN_PROTECTED` | Aviso de que a ação está bloqueada e o motivo |
| `LISTING_UNAVAILABLE` | Aviso de que o anúncio saiu do ar; pedido cancelado e estornado |
| `FORBIDDEN, OWN_LISTING` | Tela "Acesso negado" ou botão indisponível |
| `NOT_FOUND` | Tela amigável de não encontrado |
| `OUT_OF_STOCK` | Item indisponível; pedido bloqueado, ou aviso de que o item acabou após o pagamento (com estorno) |
| `PIX_EXPIRED` | "Pedido cancelado": o Pix venceu e o aluno faz um novo pedido (RN-PAG-04) |
| `PAYMENT_DECLINED` | Mensagem de erro e nova tentativa (RN-PAG-07) |
| `ACCOUNT_LOCKED` | Mensagem de bloqueio temporário (15 minutos) |
| `INTERNAL_ERROR, EXTERNAL_SERVICE_ERROR` | "Tentar de novo", sem detalhe técnico |

- O `errorHandler` converte erros conhecidos (`AppError`) na resposta acima. Erro desconhecido vira 500 genérico e é registrado em log com o `requestId`.
- Erro de validação do Zod vira 400 `VALIDATION_ERROR` com a lista de campos.
- Nunca vai stack trace nem mensagem do banco para o cliente.


## 16. Segurança e LGPD

| Requisito | Como o backend atende | Onde |
|---|---|---|
| RNF001 | HTTPS no proxy ou hospedagem, HSTS pelo helmet; senha com hash bcrypt (RN-ACE-05) | shared/utils/hash.ts, helmet |
| RNF002 | Domínio validado no servidor, inclusive no Google (RN-ACE-02, 14) | auth, config/constants.ts |
| RNF003 | JWT com validade; bloqueio após 5 erros por 15 minutos (RN-ACE-09, 11) | authenticate, loginAttempts |
| RNF004 | Perfil por `authorizeRole`; dono conferido no service | authorizeRole, services |
| RNF005 | Zod em toda entrada; ORM com consultas parametrizadas; texto sem HTML; upload de JPG/PNG (4 MB por imagem; desvio do requisito de 5 MB registrado nas Regras de Negócio, seção 10) | validate, upload, sanitize-html |
| RNF006 | Só o token do cartão chega ao servidor; cobrança no gateway (RN-PAG-02) | payments |
| RNF007 | Aceite dos Termos com data; WhatsApp só autenticado; anonimização dos dados pessoais | auth, users |

> O texto do RNF005 cita **NoSQL Injection**, mas o banco é PostgreSQL: o risco real é **SQL Injection**. A correção cabe ao PDF do trabalho (Regras de Negócio, seção 10); esta documentação usa "SQL Injection". Regra prática: nunca montar SQL concatenando texto do usuário.


### Upload de imagens

```text
arquivo recebido
 1. multer ............ recebe uma imagem por requisição, em memória, limite de 4 MB (limite da Vercel)
 2. file-type ......... confere o conteúdo real: só JPEG e PNG passam, mesmo que a extensão diga outra coisa
 3. nome original ..... descartado; o storage gera um nome novo
 4. storage ........... envia a imagem (Cloudinary) e o banco guarda só a URL
```


### Limite de requisições

| Rotas | Limite (proposta) |
|---|---|
| `Geral` | 100 requisições por minuto por IP |
| `/auth/*` | 10 por minuto por IP (mais o bloqueio de 5 erros por conta) |
| `/payments/* (exceto webhook)` | 30 por minuto por usuário |
| `/payments/webhook` | Limite próprio e folgado (300 por minuto por IP), separado do `rateLimiter` geral; a defesa principal é a assinatura (`docs/api/api.md`, seção 5.6) |
| `/internal/jobs/*` | Sem limite do rateLimiter; protegidas pelo `CRON_SECRET` |

> O `express-rate-limit` guarda a contagem **em memória de cada instância**. Na Vercel, várias instâncias contam separado, e o limite fica mais frouxo do que o descrito. No escopo acadêmico isso é aceito; se virar problema, o limite passa para um armazenamento compartilhado (por exemplo Redis). O **bloqueio de login** (5 erros / 15 min) já é gravado no banco e não é afetado.


### LGPD e anonimização

- Aceite dos Termos e da Política de privacidade registrado com data (RN-ACE-06).
- WhatsApp visível apenas para usuários logados (RN-PER-04).
- Logs sem senha, token, dado de cartão ou número de WhatsApp completo.

Excluir o perfil **anonimiza** a conta (RN-PER-06). O mesmo tratamento vale para a exclusão feita pelo admin (RN-ADM-06). A exclusão é bloqueada enquanto houver pedido Pago ou em Retirada combinada em aberto.

| O que acontece | Como |
|---|---|
| Dados pessoais | Nome vira "Usuário removido"; e-mail é trocado por um valor sem uso; WhatsApp, curso, foto, hash da senha e `google_sub` são apagados |
| Acesso | A conta não entra mais; os tokens pendentes são apagados |
| Anúncios | Saem do ar (excluídos de forma lógica) |
| Pedidos Pendentes e Em negociação | Cancelados |
| Pedidos pagos | Permanecem no histórico da outra parte, mostrando "Usuário removido" |
| E-mail original | Fica livre para um novo cadastro, pois o registro anonimizado não o guarda |
| Cópias de segurança | Backups e pontos de restauração anteriores guardam os dados antigos até vencerem; ao restaurar um backup, a anonimização é reaplicada (Banco de Dados, seção 10) |


### Regras críticas e onde moram

| Regra | Onde no código | Origem |
|---|---|---|
| E-mail só `@edu.unifor.br` | auth.schemas.ts, auth.service.ts, users.service.ts | RN-ACE-02 |
| Senha forte | auth.schemas.ts | RN-ACE-04 |
| Bloqueio após 5 tentativas | loginAttempts.ts, auth.service.ts | RN-ACE-09 |
| Perfil certo para cada ação | authorizeRole.ts | RN §3 |
| Só o dono altera o que é dele | *.service.ts (conferência de dono) | RNF004 |
| Admin só para admin | admin.routes.ts, authorizeRole.ts | RN-ADM-01 |
| Anúncio visível só se ativo | listings.repository.ts (filtro único) | RN-ANU-05 |
| WhatsApp só para logado | Respostas de rotas autenticadas | RN-PER-04 |
| Estoque descontado de forma atômica | orders.repository.ts (UPDATE condicional) | RN-EST-04 |
| Estoque nunca negativo | CHECK no banco | RN-EST-05 |
| Valor e taxa no servidor | payments.service.ts, utils/money.ts | RN-PED-02 |
| Pagamento confirmado só pelo webhook | payments.webhook.ts, settlePayment | RN-PAG-05 |
| Webhook repetido não duplica | settlePayment (trava + status) | RN-PAG-06 |
| Transições de status | *.rules.ts (assertCanTransition) | RN §4 |
| Log de auditoria do admin | admin/*/service + audit-logs.service.ts | RN-ADM-10 |
| Imagem JPG/PNG, 4 MB | upload.ts | RN-ANU-03, RN-PER-05 |
| Liquidação só com anúncio ativo e estoque | settlePayment | RN-PAG-14 |
| Pagamento tardio estornado | settlePayment, refundPayment | RN-PAG-13 |
| Admin protegido | admin-users.service.ts | RN-ADM-12 |


## 17. Desempenho e disponibilidade

| Meta | Como o backend contribui |
|---|---|
| Páginas em até 3 s e API em até 500 ms (RNF008) | Listagens paginadas (máximo de 50), só os campos necessários, índices (ver Banco de Dados), compressão das respostas e carrossel com poucos itens e cache curto |
| Imagens leves (RNF009) | O storage entrega imagem comprimida e redimensionada; o banco guarda só a URL |
| 500 usuários simultâneos (RNF010) | **Meta de produto, não medida no MVP** (Regras de Negócio, seção 6). A arquitetura já ajuda: API sem estado (escala por instâncias), Transaction pooler do Supabase com `connection_limit=1` por instância e nada pesado dentro da requisição (e-mail em `waitUntil`, estorno com `await`; seção 11) |
| 99% de disponibilidade e backup diário (RNF011) | Meta de produto, não medida no MVP. Fazemos o que cabe de graça: rota `/health` leve monitorada de tempos em tempos, backup automático do banco e restauração testada |

O teste de carga de 500 usuários simultâneos fica **fora do MVP**. Se o projeto seguir como produto, rode-o (por exemplo, com k6 ou autocannon) antes de abrir a todos os alunos, incluindo o cenário de **duas compras simultâneas da última unidade**. Esse cenário específico já é um teste de integração obrigatório (seção 19).


## 18. Logs e auditoria

| Tipo | Para quê | Onde fica |
|---|---|---|
| Log de aplicação | Diagnosticar erros e lentidão | Saída padrão em JSON (pino), coletada pela hospedagem. Na Vercel gratuita ficam disponíveis por cerca de 1 hora |
| Log de auditoria | Rastrear ações do administrador (RN-ADM-10) | Tabela no banco, pelo módulo `audit-logs` |


### Log de aplicação

- Toda requisição recebe um `requestId`, presente nos logs e nas respostas de erro, para achar o problema rápido.
- **Nunca** registrar: senha, JWT, token de cartão, corpo de `/auth` e `/payments`, WhatsApp completo.
- Níveis: `error` (falhas), `warn` (assinatura inválida, tentativas), `info` (requisições).


### Log de auditoria

Registra **edição, suspensão e exclusão** feitas pelo admin, com data e responsável (RN-ADM-10), e também a **reversão de "Vendido"** (RN §4).

| Campo | Conteúdo |
|---|---|
| Responsável | Administrador que fez a ação |
| Ação | Edição, suspensão, reativação, reversão de "Vendido" ou exclusão |
| Alvo | Tipo (usuário ou produto) e id |
| Data e hora | Momento da ação |
| Resumo da mudança | Campos alterados, sem dados sensíveis |

Exemplo de registro (ilustrativo):

```json
{
  "admin": { "id": 1, "name": "Admin Unishop" },
  "action": "suspender_usuario",
  "target": { "type": "usuario", "id": 7 },
  "at": "2026-10-16T14:32:10Z",
  "changes": { "status_conta": { "from": "ativa", "to": "suspensa" } }
}
```

A estrutura da tabela (`log_admin`, com o campo `detalhes` em `jsonb` para o resumo da mudança) está no documento de Banco de Dados. Os valores de `acao` e `entidade` são os do Banco (seção 6).


## 19. Testes e Definição de Pronto

| Tipo | Ferramenta | O que cobre |
|---|---|---|
| Unitário | Vitest | Services e utilitários com mocks (hash, dinheiro, regras de status) |
| Integração | Vitest + Supertest + PostgreSQL de teste | Rotas de ponta a ponta com banco real e providers falsos |
| Contrato (opcional) | `openapi.yaml` | Conferir se as respostas seguem o contrato |


### Mapa de testes (RNF016)

Alinhado ao mapa de testes das Regras de Negócio (seção 7). O nome de cada teste cita a regra que ele cobre.

| Área | Regras | Casos mínimos |
|---|---|---|
| Autenticação | RN-ACE-02, 03, 04, 06, 09, 10, 11, 12, 14, 15 | E-mail fora do domínio; e-mail repetido com maiúsculas; senha fraca; sem aceite dos Termos; 5ª tentativa errada bloqueia por 15 min; link de redefinição expirado ou já usado; token expirado (2 h); token anterior à troca de senha; usuário suspenso barrado; mensagem de erro genérica; Google com e-mail de outro domínio ou não verificado; troca de senha com a senha atual errada; `Authorization: Bearer undefined` recusado |
| Pagamento | RN-PAG-04 a 08, 12 a 14, RN-PED-02 | Webhook duplicado não desconta duas vezes; webhook sem assinatura recusado; Pix expirado cancela o pedido; pedido pendente de 30 min cancela; total correto (preço × quantidade + taxa); pagamento recusado permite tentar de novo (nova linha); estoque acabou antes da confirmação cancela e estorna; pagamento aprovado em pedido já cancelado é estornado; pagamento com anúncio pausado cancela e estorna; estorno que falha fica `estorno_pendente` e o job refaz |
| Estoque | RN-EST-03 a 06, RN-PED-13 | Duas compras simultâneas da última unidade: só uma conclui; quantidade nunca fica negativa; WhatsApp não desconta até o vendedor concluir; concluir sem estoque devolve 409; zerar o estoque muda o anúncio para Vendido |
| Anúncio e permissões | RN-ANU-03, 04, 05, 09, RN-EST-06, RN-ADM-01, 06, 08, 09, 12 | Máximo de 5 imagens; pausar e reativar; excluído some e o pedido permanece; exclusão bloqueada com pedido pago em aberto; aluno em rota admin ou em anúncio alheio recebe 403; admin não faz pedido nem anuncia; só o admin reverte "Vendido"; edição do admin aceita só o status; admin não suspende a si mesmo |
| Pedido | RN-PED-04, 05, 08, 10, 11, 12 | Os dois caminhos (pagamento e WhatsApp); ordem do histórico; vendedor marca a retirada e comprador confirma; comprador não confirma antes da retirada combinada; novo clique reaproveita o pedido aberto; comprador cancela o pendente; vendedor encerra a negociação |
| Perfil | RN-PER-05, 06, 07 | Foto acima de 4 MB; exclusão bloqueada com pedido pago em aberto; WhatsApp com formato inválido |
| Acesso ao catálogo | RN-CAT-04 | Visitante não acessa categorias, listagem nem produto (401) |
| Administração | RN-ADM-03, 05, 10, 11 | "Logado agora" vale 5 minutos; suspender barra o login e oculta anúncios; toda ação de admin gera log; cadastro público nunca cria admin |
| Jobs | Seção 14 | `Bearer undefined` e `Bearer [REDACTED]` recebem 401; o job rodando duas vezes dá o mesmo resultado |

Cobertura mínima proposta: **80%** nos services de `auth`, `payments`, `listings` e `orders`.


### Uma rota está pronta quando

1. Está descrita no `openapi.yaml`.
2. Valida a entrada com Zod e responde erros com os códigos da seção 15.
3. Tem o perfil certo (`authorizeRole`) e a conferência de dono, com teste.
4. A regra está no service e a consulta no repository, citando o código `RN-XXX-nn`.
5. Tem testes unitários e de integração verdes.
6. Nada sensível aparece em log.
7. Foi conferida com o frontend na integração.
8. O pull request foi revisado, com lint e testes verdes.


## 20. Regras de negócio no backend

Cada regra do documento de **Regras de Negócio v0.4** que cabe ao backend (ou ao banco) e o ponto onde ela é aplicada. As regras só do frontend (`RN-PAG-03`, `RN-PAG-15`, `RN-PED-04`, `RN-PED-09`) não entram aqui. Se algo mudar nas Regras de Negócio, esta tabela é a lista do que revisar. Os nomes de tabela e coluna são os do Banco de Dados.


### Acesso e cadastro (ACE)

| Regra | Resumo | Onde no backend |
|---|---|---|
| RN-ACE-01 | Cadastro pede nome, e-mail, senha e confirmação (curso e WhatsApp são opcionais, pelo perfil) | auth.schemas.ts |
| RN-ACE-02 | Só e-mail `@edu.unifor.br` (exceto a conta admin do seed) | auth.schemas.ts, auth.service.ts |
| RN-ACE-03 | E-mail único, sem diferenciar maiúsculas | auth.service.ts + índice único em `lower(email)` |
| RN-ACE-04 | Senha: 8 a 72 caracteres, 1 número, 1 maiúscula, igual à confirmação | auth.schemas.ts (cadastro, redefinição e troca) |
| RN-ACE-05 | Senha só como hash | shared/utils/hash.ts |
| RN-ACE-06 | Aceite dos Termos, com data (inclusive na tela "completar cadastro") | auth.service.ts, users.service.ts + `data_aceite_termos` |
| RN-ACE-07 | Confirmação por link, fora do MVP, atrás de `EMAIL_VERIFICATION_REQUIRED` | auth.service.ts, tokens.repository.ts |
| RN-ACE-08 | Erro de credencial genérico | auth.service.ts (INVALID_CREDENTIALS) |
| RN-ACE-09 | 5 erros = bloqueio de 15 min | loginAttempts.ts, auth.service.ts |
| RN-ACE-10 | Link de senha: 30 min, uso único | auth.service.ts, tokens.repository.ts, job de limpeza |
| RN-ACE-11 | JWT de 2 h em `Authorization: Bearer`, sem refresh | authenticate.ts, config/jwt.ts |
| RN-ACE-12 | Conta suspensa não entra | authenticate.ts, auth.service.ts |
| RN-ACE-13 | Admin usa o mesmo login e cai no painel | POST /auth/login único; perfil na resposta |
| RN-ACE-14 | Google no MVP: domínio e e-mail verificado no servidor; conta sem senha | oauth provider, auth.service.ts |
| RN-ACE-15 | Troca de senha logado | users.service.ts (`POST /users/me/password`) |

### Perfil (PER)

| Regra | Resumo | Onde no backend |
|---|---|---|
| RN-PER-01 | Aluno edita foto, nome, curso e WhatsApp | users.schemas.ts, users.service.ts |
| RN-PER-02 | Troca de e-mail confirmada no novo endereço | users.service.ts, tokens.repository.ts |
| RN-PER-03 | WhatsApp novo vai para os anúncios ativos | users.service.ts (transação com listings) |
| RN-PER-04 | WhatsApp só para logado | Serializadores das respostas |
| RN-PER-05 | Foto JPG/PNG, até 4 MB | upload.ts |
| RN-PER-06 | Excluir perfil: digitar "EXCLUIR", anonimizar; bloqueado com pedido pago em aberto | users.service.ts (anonimização) |
| RN-PER-07 | WhatsApp: 10 ou 11 dígitos | shared/utils/whatsapp.ts |

### Categorias (CAT)

| Regra | Resumo | Onde no backend |
|---|---|---|
| RN-CAT-01 | Seis categorias fixas | prisma/seed.ts; sem rota de escrita |
| RN-CAT-02 | Contagem de anúncios ativos | categories.repository.ts (filtro de visibilidade) |
| RN-CAT-03 | Busca por itens ou categorias | `GET /categories?search=` e `GET /listings?search=` |
| RN-CAT-04 | Só aluno logado vê categorias e listagens | `authenticate` nessas rotas |

### Anúncios (ANU) e estoque (EST)

| Regra | Resumo | Onde no backend |
|---|---|---|
| RN-ANU-01 | Campos obrigatórios; WhatsApp no anúncio; só aluno cria | listings.schemas.ts, authorizeRole("student") |
| RN-ANU-02 | Preço > 0, duas casas | listings.schemas.ts + CHECK no banco |
| RN-ANU-03 | De 1 a 5 imagens JPG/PNG, 4 MB | listings.schemas.ts, upload.ts + CHECK em `ordem` |
| RN-ANU-04 | Só dono ou admin altera | listings.service.ts (conferência de dono) |
| RN-ANU-05 | Pausado, vendido, excluído ou de conta suspensa não aparece | listings.repository.ts (filtro único) |
| RN-ANU-06 | Filtro de preço e ordenação | listings.schemas.ts, listings.repository.ts |
| RN-ANU-07 | Anúncio novo no topo | Ordenação padrão por data |
| RN-ANU-08 | Indicadores contados pelo backend | listings.service.ts, orders.repository.ts |
| RN-ANU-09 | Exclusão lógica; bloqueada com pedido pago em aberto | listings.service.ts |
| RN-ANU-10 | Não faz pedido do próprio anúncio | orders.service.ts (OWN_LISTING) |
| RN-ANU-11 | Visualização +1, sem deduplicar | listings.service.ts |
| RN-ANU-12 | Limites de campos e itens proibidos | *.schemas.ts (Zod), moderação do admin |
| RN-EST-01 | N unidades (N ≥ 1) | listings.schemas.ts |
| RN-EST-02 | Quantidade ≤ disponível | orders.schemas.ts, orders.service.ts |
| RN-EST-03 | Estoque cai quando a venda se fecha | settlePayment, orders.service.ts (complete) |
| RN-EST-04 | Desconto atômico | orders.repository.ts (UPDATE condicional) |
| RN-EST-05 | Quantidade nunca negativa; ativo tem estoque | CHECK no banco |
| RN-EST-06 | Quantidade zero ▶ Vendido | listings.rules.ts, na mesma transação do desconto |

### Pedidos (PED) e pagamento (PAG)

| Regra | Resumo | Onde no backend |
|---|---|---|
| RN-PED-01 | Pedido congela vendedor, produto, imagem, preço e total | orders.service.ts |
| RN-PED-02 | `valor_total` = preço × quantidade + taxa (R$ 0,00) | payments.service.ts, utils/money.ts |
| RN-PED-03 | Id próprio e número exibido; exclusão lógica do anúncio | orders.repository.ts + banco |
| RN-PED-05 | Contato por WhatsApp = "Em negociação", sem estoque | orders.service.ts (createContact) |
| RN-PED-06 | "Meus pedidos" do mais recente ao mais antigo | `GET /orders/mine` |
| RN-PED-07 | Vendedor vê pedidos recebidos | `GET /orders/received` |
| RN-PED-08 | Vendedor marca retirada; comprador confirma | orders.service.ts (arrangePickup, confirmReceipt) |
| RN-PED-10 | Pedido aberto reaproveitado | orders.service.ts + `uq_pedido_aberto` |
| RN-PED-11 | Negociação sem prazo | orders.service.ts (sem expiração) |
| RN-PED-12 | Comprador cancela Pendente e Em negociação; vendedor encerra a negociação | orders.service.ts (cancel) |
| RN-PED-13 | Concluir sem estoque devolve 409 | orders.service.ts (complete) |
| RN-PAG-01 | Gateway externo | shared/providers/payment-gateway |
| RN-PAG-02 | Cartão vira token no navegador | payments.service.ts (só recebe o token) |
| RN-PAG-04 | Pix expira em 30 min; pedido cancelado e novo pedido | createPixPayment, job expire-pix-payments |
| RN-PAG-05 | Webhook assinado confirma o pagamento | payments.webhook.ts |
| RN-PAG-06 | Webhook repetido não duplica | settlePayment (trava + status) + `uq_pagamento_ativo` |
| RN-PAG-07 | Recusado permite tentar de novo (nova linha) | payments.service.ts (402) |
| RN-PAG-08 | Pix não reserva; sem estoque ▶ cancela e estorna | settlePayment, refundPayment |
| RN-PAG-10 | Conta única de teste; repasse simulado | Configuração do gateway, sem split |
| RN-PAG-11 | "Pago" só quando o pedido está Pago | `GET /orders/:id` é a fonte |
| RN-PAG-12 | Pedido pendente cancelado em 30 min | job expire-pix-payments e leitura sob demanda |
| RN-PAG-13 | Pagamento tardio estornado e comprador avisado | settlePayment, refundPayment, notifications |
| RN-PAG-14 | Liquidação só com anúncio ativo, vendedor ativo e estoque | settlePayment |

### Notificações (NOT) e administração (ADM)

| Regra | Resumo | Onde no backend |
|---|---|---|
| RN-NOT-01 | Avisar o vendedor da venda | notifications.service.ts |
| RN-NOT-02 | Avisar o vendedor da exclusão pelo admin | notifications.service.ts |
| RN-NOT-03 | Avisar o comprador do cancelamento com estorno | notifications.service.ts |
| RN-NOT-04 | Canal é o e-mail; sem tela de notificações | notifications.service.ts |
| RN-ADM-01 | Painel só para admin, também pela URL | admin.routes.ts, authorizeRole.ts |
| RN-ADM-02 | Indicadores só de alunos, busca e status de acesso | admin-users.service.ts |
| RN-ADM-03 | "Logado agora" = atividade nos últimos 5 min (`lastSeen`) | trackLastSeen.ts, constants |
| RN-ADM-04 | Admin edita só o status da conta; dados só para consulta | admin-users.schemas.ts |
| RN-ADM-05 | Suspender barra login e oculta anúncios, sem apagar | admin-users.service.ts, authenticate.ts |
| RN-ADM-06 | Excluir usuário anonimiza; bloqueado com pedido pago em aberto | admin-users.service.ts |
| RN-ADM-07 | Indicadores, busca e filtro de produtos | admin-listings.service.ts |
| RN-ADM-08 | Admin edita só o status do anúncio (reverte Vendido); sem troca de vendedor | admin-listings.schemas.ts, admin-listings.service.ts |
| RN-ADM-09 | Excluir produto notifica o vendedor; bloqueado com pedido pago em aberto | admin-listings.service.ts, notifications |
| RN-ADM-10 | Log de edição, suspensão e exclusão | audit-logs.service.ts (mesma transação) |
| RN-ADM-11 | Admin criado por seed, exceção do domínio | prisma/seed.ts; `register` nunca cria admin |
| RN-ADM-12 | Admin não suspende nem exclui a si mesmo; último admin protegido | admin-users.service.ts |


## 21. Decisões e pendências


### Decisões adotadas

As decisões de **comportamento** estão nas Regras de Negócio (seções 5 e 6) e não se repetem aqui. Abaixo, as decisões técnicas do backend:

| Tema | Decisão |
|---|---|
| Estrutura | Monorepo; backend em camadas, módulos por assunto; aluno em `modules/` e admin em `admin/` |
| Sessão | JWT HS256 de 2 h no cabeçalho `Authorization: Bearer`, sem refresh token (RN-ACE-11) |
| Login | E-mail e senha, e Google no MVP; Apple fora (RN-ACE-14) |
| Pagamento | Gateway externo: Mercado Pago (ADR-002); cartão por token; Pix com webhook |
| ORM, storage e e-mail | Prisma (ADR-001), Cloudinary (ADR-004) e Resend (ADR-009). Numeração única dos ADRs em `docs/api/api.md`, seção 12 |
| Hospedagem | Vercel (API e frontend) + Supabase (PostgreSQL, só como banco), ADR-005; a API é uma função serverless exportada por `app.ts` |
| Jobs agendados | Endpoints `/api/v1/internal/jobs/:name` protegidos por `CRON_SECRET`; Vercel Cron no diário e agendador externo nos de 30 minutos |
| Tarefas depois da resposta | `await` no estorno; `waitUntil` no e-mail e na notificação |
| Imagens | Passam pela API, uma por requisição, até 4 MB; a primeira vai com `POST /listings` e as demais com `POST /listings/:id/images` |
| Rotas técnicas | `GET /health` leve (monitor) e `GET /health/db` (confere o banco) |
| Idioma | Código em inglês; banco, interface e documentos em português |

### Pendências das versões anteriores

As propostas da v0.2 viraram regra. A tabela mostra onde cada uma foi resolvida.

| # (v0.2) | Pendência | Resolvida em |
|---|---|---|
| 1 | Primeiro acesso por Google | RN-ACE-14 (tela "completar cadastro"); seção 8 deste documento |
| 2 | Canal da notificação | RN-NOT-04 (e-mail) |
| 3 | Validade do JWT | RN-ACE-11 (2 horas, sem refresh) |
| 4 | ORM, storage e e-mail | ADR-001, ADR-004, ADR-009 (`docs/api/api.md`, seção 12) |
| 5 | "NoSQL Injection" no RNF005 | Regras de Negócio, seção 10 (a correção é no PDF do trabalho) |
| 7 | Exclusão de usuário pelo admin | RN-ADM-06 |
| 8 | Avisar o comprador do cancelamento com estorno | RN-NOT-03 |
| 9 | Cartão abandonado | RN-PAG-12 |
| 10 | Concluir WhatsApp sem estoque | RN-PED-13 |
| 11 | Máximo de imagens | RN-ANU-03 (5) |
| 12 | Nomes no banco | Banco de Dados, seção 7 |
| 13 | Tabelas que o DER não tinha | Banco de Dados v0.2 |
| 14 | Proteção do admin | RN-ADM-12 |
| 15 | Limite de imagem (4 MB contra 5 MB) | Confirmado pelo grupo em 16/10/2026 (Regras de Negócio, seção 10) |
| 16 | Rate limit em memória | Aceito no MVP (Regras de Negócio, seção 8) |

### Pendências em aberto

| # | Pendência | Proposta |
|---|---|---|
| 1 | O e-mail `@edu.unifor.br` entrega `email_verified = true` no login com Google? (antiga nº 6) | Testar com um e-mail institucional real antes de fechar o login com Google. Se não entregar, o domínio continua conferido pelo e-mail e a confirmação por link (RN-ACE-07) passa a valer só para o cadastro por senha |
| 2 | O `openapi.yaml` ainda não existe, e este documento, o frontend e as skills dependem dele (antiga nº 17) | Pedro escreve a partir da seção 9 e do `docs/api/api.md` |
| 3 | Payments API ou Orders API do Mercado Pago (ADR-002 ainda em aberto neste ponto) | Decidir antes de implementar `createPixPayment`; o resto do backend só conhece a interface `PaymentGateway` |