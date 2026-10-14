---
title: Documentação Técnica — Backend
project: Unishop
version: 0.1
date: 2026-10-13
status: rascunho para revisão da equipe
owners: Felipe Bessa (backend), Pedro Cândido (engenheiro de API), Ana Clara (banco de dados), Francisco Magno (integração front-back)
context: docs/contexto-do-projeto.md
related: docs/visao-geral/regras-de-negocio.md, docs/banco-de-dados/, docs/api/, docs/frontend/
language: pt-BR (código e pastas em inglês; interface em português)
---

# Documentação Técnica — Backend

- Versão 0.1 · 13/10/2026
- Responsáveis: Felipe Bessa (backend) · Pedro Cândido (engenheiro de API) · Ana Clara (banco de dados) · Francisco Magno (integração front-back)
- Regras de negócio: ver "Documentação Técnica — Regras de Negócio" (docs/visao-geral/regras-de-negocio.md)
- Documentos relacionados: Banco de Dados (docs/banco-de-dados/) · API (docs/api/) · Frontend (docs/frontend/)

## Sumário

| # | Seção | # | Seção |
|---|---|---|---|
| 1 | Objetivo | 11 | Pagamentos |
| 2 | Arquitetura e stack | 12 | Estados e transições |
| 3 | Criando o projeto do zero | 13 | Serviços externos (providers) |
| 4 | Como executar | 14 | Jobs agendados |
| 5 | Estrutura de pastas | 15 | Erros e formato de resposta |
| 6 | Camadas e ciclo de uma requisição | 16 | Segurança e LGPD |
| 7 | Regras e convenções | 17 | Desempenho e disponibilidade |
| 8 | Autenticação e autorização | 18 | Logs e auditoria |
| 9 | Módulos e rotas | 19 | Testes e Definição de Pronto |
| 10 | Fluxos principais | 20 | Decisões e pendências |

## 1. Objetivo

O backend é a **API REST do Unishop** (`/api/v1`). Ele recebe as chamadas do frontend, aplica as regras de negócio, fala com o banco de dados e com os serviços externos (login Google, pagamentos, e-mail e imagens). Tudo o que envolve **segurança e dinheiro é decidido aqui**: o frontend só valida para responder rápido ao usuário.

Este documento explica **como o backend funciona e como ele é organizado**. O contrato detalhado de cada endpoint (campos de entrada e saída) fica no documento de API (`openapi.yaml`), e as tabelas e relações ficam no documento de Banco de Dados.

Quem chama a API:

| Ator | Como acessa | O que pode fazer |
|---|---|---|
| Visitante | Sem token | Ver o carrossel da tela inicial, criar conta, entrar e recuperar a senha. |
| Aluno logado | JWT, perfil `student` | Navegar nas categorias, comprar, anunciar, acompanhar pedidos e editar o perfil, sempre só no que é seu (RNF004). |
| Administrador | JWT, perfil `admin` | Gerenciar usuários e produtos no painel; cada alteração gera log de auditoria. |
| Gateway de pagamento | Webhook assinado | Avisar que um pagamento foi aprovado. |
| Jobs agendados | Interno | Expirar Pix, liberar estoque e limpar tokens vencidos. |

> O visitante só alcança as rotas públicas. Categorias, listagens e página do produto exigem login; apenas o carrossel de anúncios recentes da tela inicial é aberto (RF001.4, RF003.4, RF005.1).

## 2. Arquitetura e stack

É uma API REST em camadas, **sem sessão guardada no servidor** (o login é um JWT), que fala com um PostgreSQL e com quatro serviços externos. Roda em um único processo Node.js, que também executa os jobs agendados.

```text
 Navegador (SPA React)
        │   HTTPS · JSON · JWT
        ▼
 ┌─────────────────────────────────────────────────┐
 │  Servidor Unishop  (um único processo Node.js)  │
 │   ├─ API REST ........ Express + TypeScript     │
 │   └─ Jobs agendados .. node-cron                │
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
| Banco de dados | PostgreSQL | Dados do sistema (detalhes no documento de Banco de Dados) |
| Acesso ao banco | Prisma (ORM) | Consultas parametrizadas e migrações versionadas (a confirmar no ADR-001) |
| Validação | Zod | Valida toda entrada no servidor (RNF005) e gera os tipos |
| Autenticação | jsonwebtoken (JWT) + bcrypt | Sessão com expiração e senha com hash (RNF001, RNF003) |
| Login social | google-auth-library | Valida o ID token do Google |
| Upload | multer + file-type | Recebe imagens e confere o tipo real do arquivo |
| Pagamentos | API do Mercado Pago (candidato) | Cartão e Pix por gateway externo (RNF006) |
| E-mail | Resend | E-mails transacionais |
| Imagens | Cloudinary | Armazenamento e entrega comprimida (RNF009) |
| Agendamento | node-cron | Jobs: expirar Pix, limpar tokens |
| Logs | pino + pino-http | Logs estruturados em JSON |
| Segurança HTTP | helmet, cors, express-rate-limit | Cabeçalhos seguros, origem permitida e limite de requisições |
| Testes | Vitest + Supertest | Unidade e integração das rotas |
| Contrato da API | OpenAPI (`openapi.yaml`) | Combinado entre backend e frontend |
| Ambiente local | Docker Compose | Sobe o PostgreSQL e a aplicação |

### Princípios

- **Regra no backend.** Toda validação do frontend é repetida aqui; o servidor nunca confia no cliente.
- **Camadas com responsabilidade única.** Rota, controller, service e repository (seção 6).
- **Módulos por assunto.** Cada assunto (`auth`, `listings`, `orders`...) tem sua pasta com tudo dentro.
- **Serviços externos atrás de interfaces.** Trocar de gateway ou de provedor de e-mail mexe em uma pasta só.
- **Usuário e admin separados.** Regras do aluno em `modules/`, regras do administrador em `admin/`, com a proteção aplicada uma única vez na raiz do admin.
- **Sem estado no servidor.** Qualquer instância atende qualquer requisição; a sessão vive no JWT.

## 3. Criando o projeto do zero

Pré-requisito: Node.js (versão LTS), npm e Docker. Confira com `node -v`, `npm -v` e `docker -v`. Os comandos abaixo rodam na raiz do monorepo (`unishop/`), onde fica a pasta `backend/`.

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

O conteúdo do `schema.prisma` e das migrações é definido no documento de Banco de Dados.

### Passo 6 · Rodar para conferir

Crie `src/server.ts` com uma única rota de saúde:

```ts
import express from 'express'

const app = express()

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(3000, () => console.log('API em http://localhost:3000'))
```

```bash
npm run dev        # abre em http://localhost:3000/api/v1/health
```

Se aparecer `{"status":"ok"}`, a base está certa.

> A rota `/health` fica no projeto definitivo: a hospedagem e o monitor de disponibilidade (RNF011) usam essa rota.

> Esta documentação assume **Express 5**, que repassa erros de funções assíncronas ao `errorHandler` sem biblioteca extra. Confira a versão instalada no `package.json`.

## 4. Como executar

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com recarga automática (`tsx watch`) |
| `npm run build` | Compila o TypeScript para a pasta `dist/` |
| `npm start` | Roda a versão compilada (produção) |
| `npm run lint` | Verifica o estilo do código |
| `npm run test` | Roda os testes (Vitest) |
| `npm run test:watch` | Testes em modo contínuo |
| `npm run db:migrate` | Aplica as migrações no banco de desenvolvimento |
| `npm run db:seed` | Cria as categorias iniciais e a conta de administrador |
| `npm run db:reset` | Recria o banco local do zero (só desenvolvimento) |

### Variáveis de ambiente

Ficam em `.env` (copie de `.env.example`). O `config/env.ts` lê e valida todas ao iniciar; se faltar alguma, o servidor não sobe.

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:senha@localhost:5432/unishop
FRONTEND_URL=http://localhost:5173

JWT_SECRET=troque-por-um-texto-longo-e-aleatorio
JWT_EXPIRES_IN=2h
ALLOWED_EMAIL_DOMAIN=edu.unifor.br

GOOGLE_CLIENT_ID=
MP_ACCESS_TOKEN=
MP_WEBHOOK_SECRET=
RESEND_API_KEY=
MAIL_FROM=no-reply@seudominio.com
CLOUDINARY_URL=

SERVICE_FEE_PERCENT=        # a definir nas regras de negócio
PIX_EXPIRATION_MINUTES=30
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCK_MINUTES=15
```

| Variável | Para quê |
|---|---|
| `NODE_ENV` | Ambiente de execução |
| `PORT` | Porta da API |
| `DATABASE_URL` | Conexão com o PostgreSQL |
| `FRONTEND_URL` | Origem aceita no CORS e base dos links enviados por e-mail |
| `JWT_SECRET` | Segredo que assina os tokens |
| `JWT_EXPIRES_IN` | Validade do token |
| `ALLOWED_EMAIL_DOMAIN` | Domínio de e-mail aceito |
| `GOOGLE_CLIENT_ID` | Audiência esperada no ID token do Google |
| `MP_ACCESS_TOKEN` | Credencial privada do gateway |
| `MP_WEBHOOK_SECRET` | Segredo para validar os avisos do gateway |
| `RESEND_API_KEY` / `MAIL_FROM` | Credencial e remetente do serviço de e-mail |
| `CLOUDINARY_URL` | Credenciais do serviço de imagens |
| `SERVICE_FEE_PERCENT` | Taxa de serviço, em % |
| `PIX_EXPIRATION_MINUTES` | Validade do Pix e da reserva de estoque |
| `LOGIN_MAX_ATTEMPTS` / `LOGIN_LOCK_MINUTES` | Erros seguidos até bloquear o login e duração do bloqueio |

> O `.env` **nunca vai para o Git**; só o `.env.example`, sem valores reais. Chaves de produção e de teste são separadas.

### Ambientes

| Ambiente | Banco | E-mail | Pagamento | Imagens |
|---|---|---|---|---|
| Desenvolvimento | PostgreSQL no Docker | Caixa de teste (Mailtrap) | Sandbox do gateway + túnel público (ngrok ou Cloudflare Tunnel) para o webhook | Cloudinary, pasta de testes |
| Testes automáticos | PostgreSQL de teste, recriado a cada execução | Mock | Mock do provider | Mock |
| Produção | PostgreSQL gerenciado, com backup diário | Resend | Gateway com credenciais reais | Cloudinary |

## 5. Estrutura de pastas

Organizada em **duas áreas**: `modules/` (regras do aluno) e `admin/` (regras do administrador), mais o que as duas dividem em `shared/`.

```text
backend/
├─ prisma/
│  ├─ schema.prisma             # tabelas e relações (doc. de Banco de Dados)
│  ├─ migrations/               # histórico versionado do banco
│  └─ seed.ts                   # categorias iniciais + conta admin
├─ src/
│  ├─ server.ts                 # sobe o servidor e os jobs
│  ├─ app.ts                    # monta o Express e os middlewares globais
│  ├─ config/                   # env, database, jwt, cors, constants
│  ├─ routes/index.ts           # junta /api/v1/* e /api/v1/admin/*
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
├─ uploads/                     # imagens locais em dev (fora do Git)
├─ .env.example
└─ package.json · tsconfig.json · eslint.config.js · .prettierrc · vitest.config.ts
```

Dentro de cada módulo vale o mesmo molde (exemplo com `listings`):

```text
modules/listings/
├─ listings.routes.ts           # URLs e middlewares de cada rota
├─ listings.controller.ts       # recebe req/res e chama o service
├─ listings.service.ts          # regras de negócio (única camada que "pensa")
├─ listings.repository.ts       # único lugar que fala com o banco
├─ listings.schemas.ts          # validação de entrada (Zod)
├─ listings.types.ts            # tipos e DTOs do módulo
└─ index.ts                     # o que o módulo expõe para os outros
```

### Pastas `shared/` e `jobs/`

```text
shared/
├─ middlewares/
│  ├─ authenticate.ts           # valida o JWT e carrega o usuário
│  ├─ authorizeRole.ts          # barra quem não é admin (RF018.1)
│  ├─ validate.ts               # aplica os schemas Zod
│  ├─ rateLimiter.ts            # limite de requisições por IP
│  ├─ loginAttempts.ts          # bloqueio após 5 erros (RNF003)
│  ├─ upload.ts                 # só JPG/PNG até 5 MB (RNF005)
│  ├─ trackLastSeen.ts          # alimenta "logado agora" (RF019.3)
│  ├─ notFound.ts
│  └─ errorHandler.ts           # formato único de erro
├─ providers/                   # serviços externos atrás de interfaces
│  ├─ oauth/                    # google.provider.ts
│  ├─ payment-gateway/          # interface + mercadopago.provider.ts
│  ├─ mail/                     # interface + resend.provider.ts + templates/
│  └─ storage/                  # interface + cloudinary.provider.ts
├─ errors/                      # AppError, NotFoundError, ForbiddenError...
├─ utils/                       # hash, token, pagination, whatsapp, money
└─ types/express.d.ts           # usuário dentro da requisição

jobs/
├─ expire-pix-payments.job.ts
├─ cleanup-expired-tokens.job.ts
├─ reconcile-pending-payments.job.ts
└─ index.ts                     # agenda todos os jobs
```

| Pasta | O que vai nela |
|---|---|
| `config/` | Leitura e validação do ambiente, conexão com o banco, segredos do JWT, CORS e as constantes de negócio (domínio aceito, limite de 5 MB, 30 min, 5 tentativas). |
| `routes/` | Um único `index.ts` que monta o prefixo `/api/v1` e liga as rotas de cada módulo e da área admin. |
| `modules/` | Uma pasta por assunto do aluno. Cada uma segue o molde acima. |
| `admin/` | Regras do administrador. A proteção (`authenticate` + `authorizeRole`) é aplicada uma única vez em `admin.routes.ts`. |
| `shared/` | Middlewares, providers, erros e utilitários usados pelas duas áreas. Nada de regra de negócio aqui. |
| `jobs/` | Tarefas que rodam sozinhas em horários definidos (seção 14). |
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
| Route | Define método e URL, encadeia os middlewares (autenticação, validação, upload) e chama o controller. | Não tem lógica. |
| Controller | Lê os dados já validados, chama o service e monta a resposta HTTP (status + JSON). | Não acessa o banco nem aplica regra de negócio. |
| Service | Aplica as regras de negócio, confere se o recurso é do usuário, abre transações e chama repositories e providers. | Não conhece `req` nem `res`. |
| Repository | Executa as consultas ao banco. | Não tem regra de negócio. |
| Provider | Conversa com um serviço externo atrás de uma interface. | Não conhece o domínio do Unishop. |
| Schema (Zod) | Descreve e valida a entrada de cada rota. | Não decide permissão. |

### Exemplo: o caminho de `GET /api/v1/listings/42`

```text
listings.routes.ts       GET /:id  ▶ authenticate ▶ validate(params) ▶ controller
listings.controller.ts   chama listingsService.getById(42, req.user)
listings.service.ts      aplica a regra: dono vê qualquer status; outros só veem anúncio ativo
                         soma +1 na visualização (se quem pediu não é o dono)
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
   │    authenticate ▶ authorizeRole("admin") ▶ trackLastSeen ▶ upload ▶ validate (Zod)
   │
   ├─ controller ▶ service ▶ repository
   │
   └─ resposta 2xx

   Qualquer falha, em qualquer ponto ▶ errorHandler ▶ erro no formato único (seção 15)
   Rota inexistente                  ▶ notFound ▶ errorHandler
```

| # | Middleware | Quando | O que faz |
|---|---|---|---|
| 1 | `helmet` | Todas | Cabeçalhos de segurança HTTP (inclui HSTS) |
| 2 | `cors` | Todas | Aceita só a origem de `FRONTEND_URL` |
| 3 | `compression` | Todas | Comprime as respostas |
| 4 | `request-id` + `pino-http` | Todas | Gera um id por requisição e registra o log |
| 5 | `express.json` (limite de 1 MB) | Todas | Lê o corpo JSON |
| 6 | `rateLimiter` | Todas (mais rígido em `/auth`) | Limita requisições por IP |
| 7 | `authenticate` | Rotas privadas e admin | Confere o JWT e carrega o usuário (seção 8) |
| 8 | `authorizeRole("admin")` | `/admin/*` | Barra quem não é administrador |
| 9 | `trackLastSeen` | Rotas privadas | Atualiza o último acesso (no máximo 1 vez por minuto) |
| 10 | `upload` | Rotas com imagem | Recebe o arquivo e confere tipo e tamanho |
| 11 | `validate` (Zod) | Rotas com entrada | Valida corpo, parâmetros e query |
| 12 | controller | Todas | Chama o service e responde |
| 13 | `notFound` / `errorHandler` | Fim da cadeia | Rota inexistente e qualquer erro, no formato único (seção 15) |

> A rota do **webhook** do gateway não usa `authenticate`: ela é protegida pela **assinatura** do aviso (seção 11).

### Mapa de módulos

Os módulos conversam entre si pelo service. As setas mostram quem usa quem.

```text
src/modules/  (ALUNO)                            src/admin/  (ADMINISTRADOR)
┌─────────────────────────────────────┐          ┌──────────────────────────────────┐
│ auth ───────────▶ users             │          │ admin/users ────▶ audit-logs     │
│ listings ───────▶ categories        │          │ admin/listings ─▶ audit-logs     │
│ orders ─────────▶ listings          │          │        └────────▶ notifications  │
│        (valida e reserva estoque)   │          └──────────────────────────────────┘
│ payments ───────▶ orders            │
│        (atualiza o status)          │          src/shared/  (USADO POR TODOS)
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

### Convenções de código

- Arquivos em kebab-case com a camada no nome (`listings.service.ts`); classes e tipos em PascalCase; funções e variáveis em camelCase; constantes em UPPER_SNAKE_CASE.
- TypeScript em modo estrito, sem `any` sem justificativa em comentário.
- Rotas no plural, em minúsculas, com o verbo HTTP certo (`GET /listings`, `PATCH /listings/:id`). Ação que não é CRUD vira sub-rota (`POST /listings/:id/pause`).
- JSON em camelCase; datas em ISO 8601 (UTC); dinheiro calculado em **centavos** (inteiros) no código e devolvido com duas casas.
- Mensagens para o usuário em português; códigos de erro em inglês (`EMAIL_ALREADY_REGISTERED`).
- Nenhum segredo no código: tudo vem de `config/env.ts`.
- O service recebe repositories e providers por parâmetro (injeção simples), o que permite testar com mocks.
- Pull request só entra com lint e testes verdes e revisão de outro membro; commits no padrão `feat:`, `fix:`, `docs:`.

## 8. Autenticação e autorização

### Perfis e permissões

| Perfil | Como é identificado | Acesso |
|---|---|---|
| Visitante | Sem token | Rotas públicas. |
| Aluno | JWT com perfil `student` | Rotas privadas, só no que é dele. |
| Administrador | JWT com perfil `admin` | Tudo de `/admin/*`. |

> O perfil **vem do banco**, nunca do corpo da requisição. O cadastro público nunca cria administrador: a conta admin nasce no `seed` (ou por outro admin).

Quem pode o quê (**Dono** = o aluno dono do recurso):

| Recurso | Visitante | Aluno | Dono | Admin |
|---|---|---|---|---|
| Carrossel da tela inicial | Sim | Sim | — | Sim |
| Categorias, listagens e página do produto (com WhatsApp do vendedor) | — | Sim | — | Sim |
| Criar anúncio | — | Sim | — | — |
| Editar, pausar, vender e excluir anúncio | — | — | Sim | Sim (via `/admin`) |
| Pedidos recebidos de um anúncio | — | — | Sim (vendedor) | Sim |
| "Meus pedidos" | — | — | Sim (só os seus) | — |
| Editar ou excluir o perfil | — | — | Sim (o próprio) | Sim (via `/admin`) |
| Painel admin | — | — | — | Sim |

### Token JWT

| Item | Combinado |
|---|---|
| Onde viaja | Cabeçalho `Authorization: Bearer <jwt>` |
| Conteúdo | Id do usuário (`sub`), perfil (`role`), emitido em (`iat`) e expira em (`exp`). Nenhum dado pessoal. |
| Assinatura | HS256 com `JWT_SECRET` |
| Validade | 2 horas (proposta, em `JWT_EXPIRES_IN`). Ao expirar, a API responde 401 `TOKEN_EXPIRED` e o frontend leva ao login. |
| Renovação | Fora do MVP (sem refresh token). |
| Logout | O frontend descarta o token; não há lista de tokens revogados no MVP. |
| Suspensão e troca de senha | O `authenticate` consulta a conta a cada requisição: conta suspensa é barrada na hora, e token emitido antes da última troca de senha é recusado. |

O que o `authenticate` verifica, em ordem:

```text
Authorization: Bearer <jwt>
 ├─ cabeçalho ausente?                          ▶ 401 UNAUTHENTICATED
 ├─ token inválido ou expirado?                 ▶ 401 TOKEN_INVALID / TOKEN_EXPIRED
 ├─ usuário não existe mais?                    ▶ 401 UNAUTHENTICATED
 ├─ conta suspensa?                             ▶ 403 ACCOUNT_SUSPENDED
 ├─ senha trocada depois de emitir o token?     ▶ 401 TOKEN_INVALID
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
        5. API ▶ Banco       zera as tentativas e registra o último acesso
        6. API ▶ Frontend    200 {token JWT, usuário com perfil}
 7. Frontend           guarda o token e redireciona: aluno ▶ /categorias · admin ▶ /admin/usuarios
```

- **Mensagem genérica** (RF003.2): nunca diz se o e-mail ou a senha estava errado.
- **Bloqueio** (RNF003): 5 erros seguidos bloqueiam a conta por 15 minutos. A contagem é por conta, e o `rateLimiter` limita também por IP.
- Conta **suspensa** (RF021.5) responde 403 `ACCOUNT_SUSPENDED`; conta com e-mail **não confirmado** responde 403 `EMAIL_NOT_VERIFIED`.
- A senha é comparada com **bcrypt** (custo 12). O hash nunca sai do servidor nem entra em log.
- O administrador usa o **mesmo endpoint**; a resposta traz o perfil e o frontend decide o destino (decisão de 10/10).

### Login com Google

```text
 1. Frontend ▶ Google  abre o fluxo "Entrar com Google" (SDK)
 2. Google ▶ Frontend  ID token assinado pelo Google
 3. Frontend ▶ API     POST /auth/google {idToken}
 4. API                valida assinatura, audiência (Client ID) e expiração do token
 5. API                exige email_verified = true e domínio @edu.unifor.br
 6. API ▶ Banco        busca o usuário pelo e-mail (cria a conta ativa, sem senha, no 1º acesso)
 7. API ▶ Frontend     200 {token JWT, usuário}  ·  403 EMAIL_DOMAIN_NOT_ALLOWED se não for da Unifor
```

- O backend valida o ID token e exige `email_verified` e domínio `@edu.unifor.br`. O parâmetro `hd` do Google é só uma dica na tela e **não substitui** essa checagem (RNF002).
- Conta nova criada por Google nasce ativa e sem senha.
- Login com Apple fica fora do MVP (custo e e-mail de retransmissão).

> **Pendência.** No primeiro acesso por Google é preciso registrar o aceite dos Termos (ver seção 20, nº 3).

### Cadastro e confirmação de e-mail

```text
 1. Frontend ▶ API     POST /auth/register {nome, e-mail, senha, confirmação, aceite dos Termos}
 2. API                valida (Zod): domínio @edu.unifor.br, senha forte e igual à confirmação
 3. API ▶ Banco        esse e-mail já existe?  ▶ sim: 409 EMAIL_ALREADY_REGISTERED
 4. API                gera o hash da senha e um token de confirmação (só o hash do token é salvo)
 5. API ▶ Banco        salva o usuário (pendente), o aceite dos Termos e o token
 6. API ▶ E-mail       envia o link de confirmação
 7. API ▶ Frontend     201 "Verifique seu e-mail"

    ── depois, o aluno clica no link recebido por e-mail ──

 8. Frontend ▶ API     POST /auth/verify-email {token}
 9. API ▶ Banco        ativa a conta e invalida o token (uso único)
10. API ▶ Frontend     200 ▶ tela de login
```

- O aceite dos Termos de uso e da Política de privacidade é obrigatório e registrado com data (RNF007).
- O token de confirmação é aleatório; só o **hash** dele vai para o banco. Validade proposta: 24 horas, com reenvio em `POST /auth/resend-verification`.
- Se a confirmação por e-mail ficar fora do MVP (RF002.5 é desejável), a conta nasce ativa e o resto do fluxo não muda.

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

- Link com validade de **30 minutos** (RF004.2) e de **uso único** (RF004.6).
- A resposta é a mesma exista ou não a conta, para não revelar quem está cadastrado. "Reenviar link" (RF004.3) reaproveita o mesmo endpoint.
- Nova senha: mínimo de 8 caracteres, 1 número e 1 letra maiúscula (RF004.5), validada com Zod.

### Troca de e-mail institucional

O pedido de troca grava o novo e-mail como **pendente** e envia um link ao novo endereço. A troca só vale quando o aluno clica no link (RF013.4). O novo e-mail precisa ser `@edu.unifor.br` e não pode estar em uso.

## 9. Módulos e rotas

As rotas abaixo são a **proposta inicial** para orientar o documento de API; o contrato final (campos, exemplos e códigos de resposta) fica no `openapi.yaml`. Todas começam com `/api/v1`. Acesso: **Público**, **Aluno** (logado), **Dono** (aluno dono do recurso) e **Admin**.

### 9.1 `auth`

Cadastro, login, Google, confirmação de e-mail e recuperação de senha.

| Método e rota | Acesso | O que faz | RF |
|---|---|---|---|
| `POST /auth/register` | Público | Cria a conta e envia o e-mail de confirmação | RF002 |
| `POST /auth/verify-email` | Público | Ativa a conta pelo token do e-mail | RF002.5 |
| `POST /auth/resend-verification` | Público | Reenvia o e-mail de confirmação | RF002.5 |
| `POST /auth/login` | Público | Autentica aluno ou admin e devolve o JWT | RF003 |
| `POST /auth/google` | Público | Autentica com o ID token do Google | RF002.6, RF003.3 |
| `POST /auth/forgot-password` | Público | Pede o link de redefinição | RF004.1 a 4.3 |
| `POST /auth/reset-password` | Público | Define a nova senha com o token | RF004.4 a 4.7 |
| `GET /auth/me` | Aluno ou Admin | Devolve o usuário do token (restaura a sessão) | RF005.3 |

### 9.2 `users`

Perfil do aluno logado.

| Método e rota | Acesso | O que faz | RF |
|---|---|---|---|
| `GET /users/me` | Aluno | Dados do próprio perfil | RF012.1 |
| `PATCH /users/me` | Dono | Altera nome, curso e WhatsApp | RF013.2 |
| `PUT /users/me/avatar` | Dono | Troca a foto de perfil | RF013.1 |
| `POST /users/me/email-change` | Dono | Pede a troca de e-mail (link ao novo endereço) | RF013.4 |
| `POST /users/me/email-change/confirm` | Dono | Confirma a troca pelo token | RF013.4 |
| `DELETE /users/me` | Dono | Exclui a conta; exige a confirmação "EXCLUIR" | RF013.6 a 13.8 |

- Ao mudar o WhatsApp, os anúncios ativos do usuário são atualizados **na mesma transação** (RF013.3).
- A exclusão remove os dados pessoais (RNF007). Como fica o histórico de pedidos pagos está na pendência 10 (seção 20).

### 9.3 `categories`

| Método e rota | Acesso | O que faz | RF |
|---|---|---|---|
| `GET /categories` | Aluno | Lista as categorias com a quantidade de anúncios ativos; aceita `?search=` | RF006 |

A contagem usa o mesmo filtro de visibilidade das listagens (seção 9.4).

### 9.4 `listings`

Anúncios: vitrine, página do produto e gerenciamento pelo dono.

| Método e rota | Acesso | O que faz | RF |
|---|---|---|---|
| `GET /listings/recent` | Público | Últimos anúncios para o carrossel (campos mínimos, sem contato) | RF001.4 |
| `GET /listings` | Aluno | Lista com filtros `category`, `search`, `minPrice`, `maxPrice`, `sort`, `page`, `limit` | RF007 |
| `GET /listings/mine` | Dono | "Meus anúncios", em todos os status | RF012.5 |
| `GET /listings/:id` | Aluno | Página do produto (galeria, vendedor, WhatsApp); conta a visualização | RF008 |
| `GET /listings/:id/management` | Dono | Resumo, status e indicadores do Gerenciar anúncio | RF017.1 a 17.3 |
| `POST /listings` | Aluno | Publica o anúncio (multipart, com imagens) | RF015, RF016 |
| `PATCH /listings/:id` | Dono | Edita o anúncio e as imagens | RF015.7, RF017.6 |
| `POST /listings/:id/pause` | Dono | Pausa o anúncio | RF017.7 |
| `POST /listings/:id/reactivate` | Dono | Reativa um anúncio pausado | RF017.8 |
| `POST /listings/:id/mark-sold` | Dono | Marca como vendido (irreversível) | RF017.9 |
| `DELETE /listings/:id` | Dono | Exclui o anúncio | RF017.11, RF017.12 |

- **Visibilidade única.** Toda listagem pública (categorias, busca, carrossel, contagem) usa o mesmo filtro: só anúncios ativos, de contas ativas e não excluídos (RF007.4). Ele mora em uma função do repository, para ninguém esquecer.
- **Visualizações:** +1 a cada `GET /listings/:id` de quem não é o dono (RF017.3).
- **Paginação:** `limit` padrão 20, máximo 50.
- **Imagens:** até 5 por anúncio (proposta), JPG ou PNG, 5 MB cada.
- O **WhatsApp** só aparece em respostas autenticadas (RF015.4). As rotas públicas nunca o incluem.
- Anúncio inexistente, excluído, pausado ou vendido, visto por quem não é o dono, responde 404.

Exemplo de busca com filtros:

```http
GET /api/v1/listings?category=3&minPrice=20&maxPrice=80&sort=recent&page=1&limit=20
Authorization: Bearer <jwt>
```

### 9.5 `orders`

Pedidos de compra e pedidos recebidos.

| Método e rota | Acesso | O que faz | RF |
|---|---|---|---|
| `POST /orders` | Aluno | Cria o pedido "Pendente" com a quantidade e reserva o estoque (pagamento no site) | RF009.3, RF010 |
| `POST /orders/contact` | Aluno | Registra o contato por WhatsApp: pedido "Em negociação" | RF009.4, RF009.5 |
| `GET /orders/mine` | Aluno | "Meus pedidos", do mais recente ao mais antigo | RF014 |
| `GET /orders/:id` | Comprador ou vendedor | Detalhe e status (a tela de pagamento consulta aqui) | RF011.1 |
| `GET /orders/received` | Dono | Pedidos recebidos; filtra por `listingId` | RF017.4 |
| `PATCH /orders/:id/status` | Vendedor | Avança para "Retirada combinada" ou "Concluído"; cancela "Em negociação" | RF014.3 |

- A quantidade não pode passar do estoque, e o comprador não pode ser o dono do anúncio.
- Criar o pedido e reservar o estoque acontecem **juntos e de forma atômica** (seção 11).
- Se já existir pedido "Em negociação" do mesmo comprador para o mesmo anúncio, o contato reaproveita o existente.

### 9.6 `payments`

| Método e rota | Acesso | O que faz | RF |
|---|---|---|---|
| `POST /payments/card` | Comprador do pedido | Cobra no cartão a partir do token do gateway | RF010.2, RF010.7 |
| `POST /payments/pix` | Comprador do pedido | Gera a cobrança Pix (QR Code e copia e cola) | RF010.3, RF010.4 |
| `POST /payments/webhook` | Gateway | Recebe o aviso de pagamento (sem JWT; valida a assinatura) | RF010.5 |

Detalhes na seção 11.

### 9.7 `notifications`

Módulo **interno**, sem rotas no MVP: os outros módulos chamam o `notifications.service`, que envia o e-mail em segundo plano.

| Evento | Quem recebe | Canal | RF |
|---|---|---|---|
| Venda confirmada (pagamento aprovado) | Vendedor | E-mail | RF011.2 |
| Produto excluído pelo administrador | Vendedor | E-mail | RF023.7 |

### 9.8 `admin/users`

Todas as rotas de `/admin/*` passam por `authenticate` e `authorizeRole("admin")`, **aplicados uma única vez** na raiz da área:

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

| Método e rota | Acesso | O que faz | RF |
|---|---|---|---|
| `GET /admin/users` | Admin | Lista usuários; aceita `search` (nome ou e-mail) e `page` | RF019.2 a 19.4 |
| `GET /admin/users/stats` | Admin | Cadastrados, logados agora e novos na semana | RF019.1 |
| `GET /admin/users/:id` | Admin | Detalhes, indicadores e anúncios do usuário | RF020 |
| `PATCH /admin/users/:id` | Admin | Edita nome, e-mail, curso, WhatsApp e status (Ativa ou Suspensa) | RF021.3 a 21.5 |
| `PUT /admin/users/:id/avatar` | Admin | Troca a foto do usuário | RF021.2 |
| `DELETE /admin/users/:id/avatar` | Admin | Remove a foto do usuário | RF021.2 |
| `DELETE /admin/users/:id` | Admin | Exclui a conta e os anúncios | RF020.6, RF020.7 |

- Suspender impede o login e oculta os anúncios, **sem apagar dados** (RF021.5).
- "Logado agora" = último acesso nos últimos 5 minutos (proposta).
- O administrador não pode suspender nem excluir a si mesmo (proteção proposta).
- Toda edição, suspensão e exclusão grava log de auditoria (RF018.5).

### 9.9 `admin/listings`

| Método e rota | Acesso | O que faz | RF |
|---|---|---|---|
| `GET /admin/listings` | Admin | Lista produtos; filtra por `search` (nome ou vendedor), `category` e `page` | RF022.2 a 22.5 |
| `GET /admin/listings/stats` | Admin | Ativos, pausados e vendidos no mês | RF022.1 |
| `GET /admin/listings/:id` | Admin | Detalhes, vendedor e indicadores | RF023 |
| `PATCH /admin/listings/:id` | Admin | Edita dados, vendedor, imagem e status (Ativo, Pausado, Vendido) | RF024 |
| `DELETE /admin/listings/:id` | Admin | Exclui o produto e avisa o vendedor | RF023.6, RF023.7 |

- A busca de vendedor na edição reaproveita `GET /admin/users?search=` (RF024.3).
- Só o admin pode mudar o status de um anúncio "Vendido" (RF024.5); a regra do dono continua irreversível.

### 9.10 `admin/audit-logs`

| Método e rota | Acesso | O que faz | RF |
|---|---|---|---|
| `GET /admin/audit-logs` | Admin | Consulta o histórico por responsável, ação e período (sem tela no protótipo) | RF018.5 |

O log **não é criado por rota**: ele é gravado pelos services de admin, na mesma transação da ação (seção 18).

### 9.11 Rota técnica

| Método e rota | Acesso | O que faz | RF |
|---|---|---|---|
| `GET /health` | Público | Informa que a API e o banco estão no ar | RNF011 |

## 10. Fluxos principais

Os fluxos de **login, Google, cadastro e recuperação de senha** estão na seção 8, e os de **pagamento**, na seção 11. Abaixo, os demais.

### Contato por WhatsApp

```text
 1. Frontend ▶ API     POST /orders/contact {anúncio}
 2. API                valida: anúncio ativo e comprador diferente do dono
 3. API ▶ Banco        cria o pedido "Em negociação" e soma 1 aos contatos do anúncio
                       (reaproveita o pedido se já houver um aberto)
 4. API ▶ Frontend     201 {pedido}
 5. Frontend ▶ WhatsApp  abre wa.me/55…?text=mensagem sobre o anúncio (montado no frontend)
```

- O backend **registra antes** de o frontend abrir o link `wa.me` (seção 11 do documento de Frontend).
- O contato incrementa o indicador "contatos pelo WhatsApp" do anúncio (RF017.3).
- O número do vendedor só vai em respostas de rotas autenticadas (RF015.4).

### Publicação de anúncio

```text
 1. Frontend ▶ API      POST /listings (multipart: dados do anúncio + imagens)
 2. API                 valida os campos (Zod), o tipo real do arquivo (JPG/PNG) e o limite de 5 MB
 3. API ▶ Storage       envia as imagens
 4. Storage ▶ API       URLs seguras das imagens
 5. API ▶ Banco         em uma transação: cria o anúncio (status Ativo) e registra as imagens
 6. API ▶ Frontend      201 {anúncio, categoria} ▶ pop-up "Anúncio publicado!"

    Se o banco falhar no passo 5, as imagens já enviadas são removidas do storage.
```

- O tipo do arquivo é conferido pelo **conteúdo real**, não pela extensão.
- O anúncio e suas imagens são gravados em uma única transação; se algo falhar, nada fica pela metade.
- A resposta informa a categoria em que o anúncio passou a aparecer (RF016.2).

### Exclusão de produto pelo administrador

```text
 1. Frontend (admin) ▶ API   DELETE /admin/listings/:id  (JWT do administrador)
 2. API                      authenticate + authorizeRole("admin")
 3. API ▶ Banco              transação: remove o anúncio e grava o log de auditoria
                             (pedidos pagos seguem no histórico do comprador)
 4. API ▶ E-mail             avisa o vendedor sobre a exclusão
 5. API ▶ Frontend           204 No Content
```

- O log de auditoria e a exclusão acontecem **na mesma transação**: sem log, sem exclusão.
- Pedidos já pagos continuam no histórico do comprador (RF017.12).

## 11. Pagamentos

O Unishop **não guarda dado de cartão**: o pagamento é processado por um gateway externo (o Mercado Pago é o candidato recomendado, ainda a confirmar pelo grupo, ADR-002). O backend fala com o gateway só pela interface `PaymentGateway`.

### Interface do provider

| Método | Para quê |
|---|---|
| `createCardPayment(token, valor, parcelas, referência)` | Cobra no cartão com o token vindo do frontend |
| `createPixPayment(valor, expiração, referência)` | Gera o QR Code e o código "copia e cola" |
| `getPayment(id)` | Consulta o status real do pagamento |
| `verifyWebhookSignature(cabeçalhos, corpo)` | Confere se o aviso veio mesmo do gateway |
| `cancelPayment(id)` | Cancela uma cobrança pendente (Pix expirado) |

### Cálculo do valor

- **Subtotal** = preço do anúncio × quantidade.
- **Taxa de serviço** = subtotal × `SERVICE_FEE_PERCENT`.
- **Total** = subtotal + taxa (RF010.6).
- O cálculo é feito **só no backend**, em centavos, e gravado no pagamento. O frontend exibe o que a API devolve e nunca recalcula.

Exemplo (livro de R$ 45,00, 2 unidades, taxa **fictícia** de 5%):

```text
Subtotal ........ R$ 45,00 × 2 = R$ 90,00
Taxa de serviço . R$ 90,00 × 5% = R$  4,50
Total ........... R$ 94,50        (9450 centavos, guardado como inteiro)
```

> **Pendência de negócio (nº 1 e 2 da seção 20).** Ainda falta definir o percentual da taxa e **quem recebe o dinheiro**: repassar ao vendedor exige recursos de marketplace do gateway. Proposta para o MVP: cobrar numa conta única de teste e simular o repasse.

### Pagamento com Pix

```text
 1. Frontend ▶ API      POST /orders {anúncio, quantidade}
 2. API ▶ Banco         transação: valida o anúncio, reserva o estoque (atômico) e cria o pedido "Pendente"
 3. API ▶ Frontend      201 {pedido, subtotal, taxa de serviço, total}
 4. Frontend ▶ API      POST /payments/pix {pedido}
 5. API ▶ Gateway       cria a cobrança Pix (valor total, expira em 30 min, referência = pedido)
 6. Gateway ▶ API       QR Code e código "copia e cola"
 7. API ▶ Banco         grava o pagamento "Pendente" com a data de expiração
 8. API ▶ Frontend      201 {QR Code, copia e cola, expira em}

    ── o aluno paga no aplicativo do banco ──

 9. Gateway ▶ API       POST /payments/webhook (aviso de pagamento aprovado)
10. API                 valida a assinatura do aviso
11. API ▶ Gateway       consulta o pagamento (não confia só no aviso)  ▶  status: aprovado
12. API ▶ Banco         transação: pagamento "Aprovado" e pedido "Pago · combinar retirada" (idempotente)
13. API                 notifica o vendedor sobre a venda
14. API ▶ Gateway       200 OK

    ── enquanto isso, a tela de pagamento consulta o status ──

15. Frontend ▶ API      GET /orders/:id  (a cada poucos segundos)
16. API ▶ Frontend      status "Pago" ▶ o frontend vai para /pedido-confirmado/:id
```

### Pagamento com cartão

```text
 1. Frontend ▶ Gateway  o SDK envia os dados do cartão e recebe um token (nunca passam pelo Unishop)
 2. Frontend ▶ API      POST /payments/card {pedido, token, parcelas}
 3. API ▶ Gateway       cria o pagamento usando o token  ▶  aprovado ou recusado
    ├─ APROVADO
    │   4. API ▶ Banco       transação: pagamento "Aprovado" e pedido "Pago · combinar retirada"
    │   5. API               notifica o vendedor sobre a venda
    │   6. API ▶ Frontend    200 {status: pago}
    └─ RECUSADO
        4. API ▶ Banco       pagamento "Recusado"; o pedido continua "Pendente" e o estoque segue reservado
        5. API ▶ Frontend    402 PAYMENT_DECLINED ▶ o aluno pode tentar de novo no mesmo pedido (RF010.8)
```

### Webhook

```text
Gateway chama POST /payments/webhook
 ├─ assinatura inválida?             ▶ 401 (registra tentativa suspeita)
 ├─ consulta o pagamento no gateway
 ├─ evento já processado?            ▶ 200 OK (nada a fazer)
 └─ status na consulta?
      ├─ aprovado ▶ transação: pagamento aprovado + pedido "Pago · combinar retirada"
      │             ▶ notifica o vendedor ▶ 200 OK
      └─ recusado ▶ transação: pagamento recusado (pedido segue pendente) ▶ 200 OK
```

- **Assinatura obrigatória.** Aviso sem assinatura válida recebe 401 e é registrado em log.
- **Não confia só no aviso.** O backend consulta o pagamento no gateway antes de mudar qualquer status.
- **Idempotente.** O mesmo aviso pode chegar várias vezes; o segundo não duplica nada (nem notifica de novo).
- **Resposta rápida.** Responde 200 logo após gravar; o envio de e-mail ao vendedor roda em segundo plano.
- Se o aviso se perder, o job `reconcile-pending-payments` corrige (seção 14).

### Estoque e expiração

- Criar o pedido reserva o estoque com uma atualização condicional no banco (`quantidade >= pedida`), o que impede que dois alunos levem a última unidade.
- O pedido "Pendente" e o Pix expiram em **30 minutos** (RF010.4). Ao expirar, o estoque reservado volta.
- Pagamento recusado no cartão **não** expira o pedido na hora: o aluno pode tentar de novo (RF010.8) até o prazo acabar.

### Testando sem dinheiro real

- Usar o **sandbox** do gateway: contas de teste de comprador e vendedor, cartões de teste e Pix simulado.
- Para o webhook chegar ao computador local, usar um túnel público (ngrok ou Cloudflare Tunnel).
- Credenciais de teste só no `.env` local; as de produção ficam fora do código e do Git.

## 12. Estados e transições

Cada recurso tem um conjunto fechado de estados. Quem decide se uma mudança é permitida é o **service** (um método `assertCanTransition`), nunca o controller. Essas regras são testadas (seção 19).

### Anúncio

```text
 publicar
    ▼
  ATIVO ◀──── reativar ────▶ PAUSADO
    │                           │
    └──── marcar vendido ───────┘
                │
                ▼
            VENDIDO        (irreversível para o dono)

 Qualquer estado ▶ EXCLUÍDO  (remoção permanente)
```

| Transição | Quem | Regra |
|---|---|---|
| Ativo → Pausado | Dono, admin | Some das listagens e buscas sem ser excluído (RF017.7) |
| Pausado → Ativo | Dono, admin | Volta às listagens (RF017.8) |
| Ativo ou Pausado → Vendido | Dono, admin | Pede confirmação; encerra o anúncio sem reativação (RF017.9) |
| Qualquer → Excluído | Dono, admin | Remoção permanente; pedidos pagos seguem no histórico do comprador (RF017.12) |
| Vendido → outro status | Só admin | Exceção do painel (RF024.5) |
| Estoque zerado → Vendido | Sistema | Proposta: quando a quantidade chega a 0 por venda paga |

A suspensão da conta do dono **oculta** os anúncios sem mudar o status deles (RF021.5).

### Pedido

```text
 "Seguir para o pagamento"                    contato pelo WhatsApp
            ▼                                          ▼
        PENDENTE                                 EM NEGOCIAÇÃO
      │         │                                │           │
   pagamento   30 min                       vendedor      vendedor
   aprovado    sem pagar                    confirma      cancela
      ▼           ▼                              ▼           ▼
 PAGO · combinar  EXPIRADO /                CONCLUÍDO    EXPIRADO /
 retirada         CANCELADO                              CANCELADO
      ▼ vendedor
 RETIRADA COMBINADA
      ▼ vendedor
  CONCLUÍDO
```

| Transição | Quem | Regra |
|---|---|---|
| (início) → Em negociação | Comprador | Contato por WhatsApp (RF009.5) |
| (início) → Pendente | Comprador | "Seguir para o pagamento": reserva o estoque |
| Pendente → Pago · combinar retirada | Sistema | Pagamento aprovado pelo gateway (RF011.3) |
| Pendente → Expirado / Cancelado | Sistema | 30 minutos sem pagar; libera o estoque |
| Pago → Retirada combinada | Vendedor | Marcado na tela Gerenciar anúncio |
| Retirada combinada → Concluído | Vendedor | Venda finalizada |
| Em negociação → Concluído / Cancelado | Vendedor | Venda combinada por WhatsApp ou desistência |

### Pagamento

```text
 cria a cobrança ▶ PENDENTE ──── gateway aprova ────────▶ APROVADO ┄┄▶ ESTORNADO (fora do MVP)
                      │  ▲
                      │  └──── nova tentativa ──── RECUSADO ◀── gateway recusa (cartão)
                      │
                      └──── Pix passou de 30 min ───▶ EXPIRADO
```

### Conta do usuário

```text
 cadastro com e-mail e senha ▶ PENDENTE DE CONFIRMAÇÃO ── confirma o e-mail ──▶ ATIVA
 1º acesso com Google ───────────────────────────────────────────────────────▶ ATIVA

 ATIVA ◀──── admin suspende / reativa ────▶ SUSPENSA
 ATIVA ou SUSPENSA ── usuário ou admin exclui ──▶ EXCLUÍDA
```

O bloqueio de **5 tentativas de login** não é um estado da conta: é um bloqueio temporário com data de término, que passa sozinho.

## 13. Serviços externos (providers)

| Interface | Implementação | Variáveis | Usado em |
|---|---|---|---|
| `OAuthProvider` | `google.provider.ts` | `GOOGLE_CLIENT_ID` | `auth` |
| `PaymentGateway` | `mercadopago.provider.ts` | `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` | `payments`, jobs |
| `MailProvider` | `resend.provider.ts` (Mailtrap em dev) | `RESEND_API_KEY`, `MAIL_FROM` | `auth`, `users`, `notifications` |
| `StorageProvider` | `cloudinary.provider.ts` | `CLOUDINARY_URL` | `listings`, `users`, `admin` |

### Regras para todo provider

- Cada um tem uma **interface** própria; o resto do código só conhece a interface.
- A implementação é escolhida em um único ponto (`config/`), o que permite trocar de serviço ou usar **mock nos testes**.
- Toda chamada externa tem **tempo limite** (10 segundos) e, se falhar, vira 502 ou 503 `EXTERNAL_SERVICE_ERROR`, sem expor detalhe do serviço.
- Chaves nunca aparecem em log.

### E-mails enviados

| Modelo | Quando | Conteúdo principal |
|---|---|---|
| Confirmar conta | Cadastro | Link de ativação |
| Redefinir senha | Pedido de recuperação | Link com validade de 30 minutos |
| Confirmar novo e-mail | Troca de e-mail | Link enviado ao novo endereço |
| Venda realizada | Pagamento aprovado | Produto, comprador e como combinar a retirada |
| Anúncio excluído | Exclusão pelo admin | Produto afetado |

## 14. Jobs agendados

Rodam no mesmo processo da API, com `node-cron`. Todo job é **idempotente**: se rodar duas vezes seguidas, o resultado é o mesmo.

| Job | Frequência | O que faz | Req. |
|---|---|---|---|
| `expire-pix-payments` | A cada minuto | Marca como expirados os Pix e pedidos pendentes com mais de 30 minutos, cancela a cobrança no gateway e devolve o estoque reservado | RF010.4 |
| `cleanup-expired-tokens` | Uma vez por dia | Apaga tokens de confirmação e de senha vencidos ou já usados | RF004.6 |
| `reconcile-pending-payments` | A cada 5 minutos | Consulta no gateway os pagamentos pendentes recentes e corrige os que perderam o aviso do webhook | RF010.5 |

> No MVP roda **uma instância** da API. Se houver mais de uma, os jobs precisam de trava (para não rodar em duplicidade). O **backup diário** do banco (RNF011) é feito por script no servidor (`infra/scripts/backup-db.sh`), fora da aplicação.

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
| 400 | Entrada inválida | `VALIDATION_ERROR`, `TOKEN_INVALID`, `TOKEN_EXPIRED` |
| 401 | Sem login, token inválido ou credencial errada | `UNAUTHENTICATED`, `TOKEN_EXPIRED`, `INVALID_CREDENTIALS` |
| 402 | Pagamento recusado | `PAYMENT_DECLINED` |
| 403 | Sem permissão ou conta barrada | `FORBIDDEN`, `ACCOUNT_SUSPENDED`, `EMAIL_NOT_VERIFIED`, `EMAIL_DOMAIN_NOT_ALLOWED` |
| 404 | Inexistente ou invisível para quem pediu | `NOT_FOUND` |
| 409 | Conflito de estado | `EMAIL_ALREADY_REGISTERED`, `OUT_OF_STOCK`, `INVALID_STATE`, `PIX_EXPIRED` |
| 413 · 415 | Arquivo grande ou de tipo não aceito | `FILE_TOO_LARGE`, `FILE_TYPE_NOT_ALLOWED` |
| 429 | Muitas tentativas | `TOO_MANY_REQUESTS`, `ACCOUNT_LOCKED` (com `retryAfter`) |
| 500 | Erro inesperado | `INTERNAL_ERROR` (sem detalhe técnico) |
| 502 · 503 | Serviço externo fora do ar | `EXTERNAL_SERVICE_ERROR` |

### Como o frontend usa os códigos

| Código | Estado da tela (Frontend, seção 12) |
|---|---|
| `VALIDATION_ERROR` | Mensagem de erro embaixo de cada campo, usando `details` |
| `TOKEN_EXPIRED` (login) | Sessão expirada: aviso e volta ao login |
| `FORBIDDEN` | Tela "Acesso negado" |
| `NOT_FOUND` | Tela amigável de não encontrado |
| `OUT_OF_STOCK` | Item indisponível; pedido bloqueado |
| `PIX_EXPIRED` | Aviso e opção de gerar novo código |
| `PAYMENT_DECLINED` | Mensagem de erro e nova tentativa (RF010.8) |
| `ACCOUNT_LOCKED` | Mensagem de bloqueio temporário |
| `INTERNAL_ERROR`, `EXTERNAL_SERVICE_ERROR` | "Tentar de novo", sem detalhe técnico |

- O `errorHandler` converte erros conhecidos (`AppError`) na resposta acima. Erro desconhecido vira 500 genérico e é registrado em log com o `requestId`.
- Erro de validação do Zod vira 400 `VALIDATION_ERROR` com a lista de campos.
- Nunca vai stack trace nem mensagem do banco para o cliente.

## 16. Segurança e LGPD

| Requisito | Como o backend atende | Onde |
|---|---|---|
| RNF001 | HTTPS no proxy ou hospedagem, HSTS pelo `helmet`; senha com bcrypt | `shared/utils/hash.ts`, `helmet` |
| RNF002 | Domínio validado no servidor, inclusive no Google | `auth`, `config/constants.ts` |
| RNF003 | JWT com expiração; bloqueio após 5 erros | `authenticate`, `loginAttempts` |
| RNF004 | Dono conferido no service; admin por perfil | services, `authorizeRole` |
| RNF005 | Zod em toda entrada; ORM com consultas parametrizadas; texto sem HTML; upload de JPG/PNG até 5 MB | `validate`, `upload`, `sanitize-html` |
| RNF006 | Só o token do cartão chega ao servidor; cobrança no gateway | `payments` |
| RNF007 | Aceite dos Termos no cadastro; WhatsApp só autenticado; exclusão de dados pessoais | `auth`, `users` |

> O texto do RNF005 cita **NoSQL Injection**, mas o banco é PostgreSQL: o risco real é **SQL Injection**. Vale corrigir no documento de requisitos. Regra prática: nunca montar SQL concatenando texto do usuário.

### Upload de imagens

```text
arquivo recebido
 1. multer ............ recebe em memória, limite de 5 MB
 2. file-type ......... confere o conteúdo real: só JPEG e PNG passam, mesmo que a extensão diga outra coisa
 3. nome original ..... descartado; o storage gera um nome novo
 4. storage ........... envia a imagem (Cloudinary) e o banco guarda só a URL
```

### Limite de requisições

| Rotas | Limite (proposta) |
|---|---|
| Geral | 100 requisições por minuto por IP |
| `/auth/*` | 10 por minuto por IP (mais o bloqueio de 5 erros por conta) |
| `/payments/*` (exceto webhook) | 30 por minuto por usuário |
| `/payments/webhook` | Sem limite do `rateLimiter`; protegida pela assinatura |

### LGPD

- Aceite dos Termos e da Política de privacidade registrado com data e versão.
- WhatsApp visível apenas para usuários logados.
- Exclusão do perfil remove os dados pessoais (RNF007).
- Logs sem senha, token, dado de cartão ou número de WhatsApp completo.

### Regras críticas e onde moram

| Regra | Onde no código | Req. |
|---|---|---|
| E-mail só `@edu.unifor.br` | `auth.schemas.ts`, `auth.service.ts`, `users.service.ts` | RF002.2, RNF002 |
| Senha forte | `auth.schemas.ts` | RF004.5 |
| Bloqueio após 5 tentativas | `loginAttempts.ts`, `auth.service.ts` | RNF003 |
| Só o dono altera o que é dele | `*.service.ts` (conferência de dono) | RNF004 |
| Admin só para admin | `admin.routes.ts`, `authorizeRole.ts` | RF018.1 |
| Anúncio visível só se ativo | `listings.repository.ts` (filtro único) | RF007.4 |
| WhatsApp só para logado | Respostas de rotas autenticadas | RF015.4 |
| Estoque nunca negativo | `orders.service.ts` + atualização condicional | RF009 |
| Valor e taxa no servidor | `payments.service.ts`, `utils/money.ts` | RF010.6 |
| Pagamento confirmado só pelo gateway | `payments.webhook.ts` | RF010.5, RNF006 |
| Transições de status | `listings.service.ts`, `orders.service.ts` | RF017 |
| Log de auditoria do admin | `admin/*/service` + `audit-logs.service.ts` | RF018.5 |
| Imagem JPG/PNG até 5 MB | `upload.ts` | RNF005 |

## 17. Desempenho e disponibilidade

| Meta | Como o backend contribui |
|---|---|
| Páginas em até 3 s e API em até 500 ms (RNF008) | Listagens paginadas (máximo de 50), só os campos necessários, índices (ver Banco de Dados), compressão das respostas e carrossel com poucos itens e cache curto |
| Imagens leves (RNF009) | O storage entrega imagem comprimida e redimensionada; o banco guarda só a URL |
| 500 usuários simultâneos (RNF010) | API sem estado (escala por instâncias), pool de conexões dimensionado e nada pesado dentro da requisição: e-mail e notificação rodam em segundo plano |
| 99% de disponibilidade e backup diário (RNF011) | Rota `/health` monitorada, backup automático do banco e restauração testada |

Para validar os 500 usuários simultâneos, vale rodar um teste de carga (por exemplo, com k6 ou autocannon) antes da entrega.

## 18. Logs e auditoria

| Tipo | Para quê | Onde fica |
|---|---|---|
| Log de aplicação | Diagnosticar erros e lentidão | Saída padrão em JSON (pino), coletada pela hospedagem |
| Log de auditoria | Rastrear ações do administrador (RF018.5) | Tabela no banco, pelo módulo `audit-logs` |

### Log de aplicação

- Toda requisição recebe um `requestId`, presente nos logs e nas respostas de erro, para achar o problema rápido.
- **Nunca** registrar: senha, JWT, token de cartão, corpo de `/auth` e `/payments`, WhatsApp completo.
- Níveis: `error` (falhas), `warn` (assinatura inválida, tentativas), `info` (requisições).

### Log de auditoria

| Campo | Conteúdo |
|---|---|
| Responsável | Administrador que fez a ação |
| Ação | Edição, suspensão, reativação ou exclusão |
| Alvo | Tipo (usuário ou produto) e id |
| Data e hora | Momento da ação |
| Resumo da mudança | Campos alterados, sem dados sensíveis |

Exemplo de registro (ilustrativo):

```json
{
  "admin": { "id": 1, "name": "Admin Unishop" },
  "action": "SUSPEND_USER",
  "target": { "type": "user", "id": 7 },
  "at": "2026-10-13T14:32:10Z",
  "changes": { "status": { "from": "active", "to": "suspended" } }
}
```

A estrutura da tabela está no documento de Banco de Dados.

## 19. Testes e Definição de Pronto

| Tipo | Ferramenta | O que cobre |
|---|---|---|
| Unitário | Vitest | Services e utilitários com mocks (hash, dinheiro, regras de status) |
| Integração | Vitest + Supertest + PostgreSQL de teste | Rotas de ponta a ponta com banco real e providers falsos |
| Contrato (opcional) | `openapi.yaml` | Conferir se as respostas seguem o contrato |

### Testes obrigatórios (RNF016)

| Área | O que testar |
|---|---|
| Autenticação | Domínio fora da Unifor recusado; e-mail repetido; senha fraca; erro de login com mensagem genérica; 5 erros bloqueiam; conta suspensa barrada; token expirado |
| Pagamento | Valor e taxa; webhook sem assinatura recusado; aviso repetido não duplica; aprovado muda o pedido e notifica; recusado mantém o pedido pendente; Pix expirado devolve o estoque |
| Status de anúncio | Pausar, reativar, vender e excluir; vendido não reativa pelo dono; pausado some da listagem; só o dono altera |
| Estoque | Dois pedidos ao mesmo tempo pela última unidade: um deles falha com `OUT_OF_STOCK` |
| Admin | Aluno recebe 403 em `/admin/*`; toda ação gera log |

Cobertura mínima proposta: **80%** nos services de `auth`, `payments`, `listings` e `orders`.

### Uma rota está pronta quando

1. Está descrita no `openapi.yaml`.
2. Valida a entrada com Zod e responde erros com os códigos da seção 15.
3. Tem a permissão certa (público, aluno, dono ou admin), com teste.
4. A regra está no service e a consulta no repository.
5. Tem testes unitários e de integração verdes.
6. Nada sensível aparece em log.
7. Foi conferida com o frontend na integração.
8. O pull request foi revisado, com lint e testes verdes.

## 20. Decisões e pendências

### Decisões adotadas

| Tema | Decisão |
|---|---|
| Estrutura | Monorepo; backend em camadas, módulos por assunto; aluno em `modules/` e admin em `admin/` |
| Sessão | JWT no cabeçalho `Authorization: Bearer` (igual ao Frontend) |
| Acesso ao catálogo | Só logado; apenas o carrossel da tela inicial é público |
| Login social | Só Google no MVP; Apple fora (US$ 99/ano e e-mail de retransmissão) |
| Login do admin | Mesmo endpoint de login; o perfil vem na resposta |
| Pagamento | Gateway externo; cartão por token; Pix com webhook; Mercado Pago como candidato |
| Estoque | Anúncio com várias unidades; quantidade escolhida no pedido; desconto atômico no banco |
| WhatsApp | Link `wa.me` montado no frontend; o backend registra o contato antes |
| Idioma | Código em inglês; interface e documentos em português |

### Pendências em aberto

A coluna **Proposta** é o que este documento assume até o grupo decidir.

| # | Pendência | Proposta |
|---|---|---|
| 1 | Quem recebe o dinheiro e como o repasse ao vendedor funciona | Conta única de teste; repasse simulado no MVP |
| 2 | Percentual da taxa de serviço | Parâmetro `SERVICE_FEE_PERCENT` |
| 3 | Primeiro acesso por Google: aceite dos Termos e dados que faltam (curso, WhatsApp) | Tela de "completar cadastro" após o 1º login |
| 4 | Reserva de estoque: quando e por quanto tempo | Pedido pago no site reserva por 30 min; WhatsApp não reserva |
| 5 | O que acontece quando o estoque chega a zero | Anúncio vira "Vendido" automaticamente |
| 6 | Quem muda o status do pedido (Retirada combinada, Concluído) | O vendedor, na tela Gerenciar anúncio |
| 7 | Texto do status: "Pago · aguardando retirada" (RF014.3) x "Pago · combinar retirada" (RF011.3) | Unificar em um só texto |
| 8 | Canal da notificação ao vendedor (RF011.2, RF023.7) | E-mail; sem tela de notificações no MVP |
| 9 | Validade do JWT e renovação | 2 horas, sem refresh token |
| 10 | Exclusão de perfil ou usuário com pedidos pagos (RF013.8 e RF020.7 x RF017.12) | Anonimizar dados pessoais e manter o registro do pedido |
| 11 | Admin poder mudar o status de um anúncio "Vendido" (RF024.5) | Permitido só ao admin |
| 12 | ORM, gateway, storage e e-mail definitivos | Prisma, Mercado Pago, Cloudinary e Resend (ADRs 001 a 004) |
| 13 | RNF005 cita "NoSQL Injection" com banco PostgreSQL | Corrigir para SQL Injection |
| 14 | O e-mail `@edu.unifor.br` está vinculado a uma conta Google? | Testar com um e-mail real antes de fechar RF002.6 |
