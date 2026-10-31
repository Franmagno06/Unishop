---
title: Documentação Técnica — Deploy
project: Unishop
version: 0.3
date: 2026-10-16
status: vigente; alinhado ao conjunto de documentos v0.4/v0.3 de 16/10/2026; pendências abertas na seção 17.3
owners: Francisco Magno (gestão e integração front-back)
related: docs/backend/, docs/frontend/, docs/api/, docs/banco-de-dados/, docs/regras-de-negocio/
based_on: Regras de Negócio v0.4, Banco de Dados v0.2, Backend v0.3, API v0.3, Frontend v0.4, requisitos RNF001–RNF016
language: pt-BR (código e pastas em inglês; documentação em português)
---

# Documentação Técnica — Deploy (Vercel + Supabase)

- Versão 0.3.1 · 30/10/2026 (banco trocado de Neon para Supabase)
- Base: Regras de Negócio v0.4, Banco de Dados v0.2, Backend v0.3, API v0.3, Frontend v0.4 e requisitos RNF001–RNF016
- Elaboração: Francisco Magno (gestão e integração front-back)
- Documentos relacionados: Backend (docs/backend/), Frontend (docs/frontend/), API e segurança das APIs externas (docs/api/api.md), Banco de Dados (docs/banco-de-dados/banco-de-dados.md)

> **Este é o guia de deploy oficial do Unishop.** A hospedagem é a **Vercel** (frontend e API) com **Supabase** (PostgreSQL, usado só como banco), e o gateway de pagamento é o **Mercado Pago**. Uma hospedagem em servidor próprio (Oracle Cloud + Docker) foi avaliada e **não foi adotada**; a comparação está no ADR-005 (seção 17.1).

> **Comandos neste guia.** Os comandos são de shell (bash). No Windows, rode-os no **Git Bash** ou no **WSL**, não no PowerShell nem no CMD. Para o backup manual você também precisa do cliente do PostgreSQL (`pg_dump`) instalado, na versão do seu banco no Supabase.

## Sumário

| # | Seção | # | Seção |
|---|---|---|---|
| 1 | Objetivo | 10 | Jobs agendados |
| 2 | Arquitetura da produção | 11 | Backup e restauração |
| 3 | Ambientes | 12 | Primeiro deploy, passo a passo |
| 4 | Segredos e variáveis | 13 | Atualizar e reverter |
| 5 | Preparar o código | 14 | Verificação e checklist |
| 6 | Projetos na Vercel | 15 | Segurança operacional |
| 7 | Banco de dados (Supabase) | 16 | Riscos |
| 8 | Domínio e HTTPS | 17 | Decisões, pendências e impacto nas outras docs |
| 9 | CORS e proxy | | |

### Histórico de versões

| Versão | Data | O que mudou |
|---|---|---|
| 0.1 | 15/10/2026 | Primeira versão, como alternativa a um deploy em servidor próprio (Oracle + Docker). |
| 0.2 | 15/10/2026 | Vira o guia oficial e autossuficiente. Gateway fixado no Mercado Pago (ADR-002). Acrescenta: limites do plano Hobby (conta única de dono); `waitUntil` para tarefas depois da resposta; upload de imagens pela API, uma por requisição, até 4 MB; tabela dos jobs reais e agendador externo; backup diário automatizado; correção da pendência do bloqueio de login (já fica no banco); avisos para Windows; dev, testes e trava de teste dentro deste guia. |
| 0.3.1 | 30/10/2026 | **Banco trocado de Neon para Supabase (ADR-005 revisado).** Supabase gratuito (conferido em 30/10/2026): 500 MB por projeto, 2 projetos ativos, pausa após 1 semana sem atividade, **sem branching, sem backup automático e sem restauração a ponto no tempo**. Ambientes: um projeto Supabase para produção e outro para desenvolvimento e preview (sem branch por preview). Conexões: Transaction pooler (6543) para a API e Session pooler ou direta (5432) para migração e backup. Backup passa a depender só do workflow do GitHub Actions. Versão do PostgreSQL a conferir (pendência 13). |
| 0.3 | 16/10/2026 | Alinhado ao conjunto v0.4/v0.3. **Neon (substituído em 30/10/2026):** limites corrigidos (1 GB de armazenamento por projeto, 100 CU-h por mês, 10 branches, restauração de 6 h, dorme em 5 min, **sem lista de IPs no plano gratuito**), PostgreSQL 18, três papéis (`unishop_migrator`, `unishop_app`, `unishop_backup`) e previews derivados do branch de desenvolvimento. **Backup:** o workflow usa o segredo `DATABASE_URL_BACKUP` (somente leitura), separado do usado nas migrações, e `pg_dump` 18. **Jobs:** a cada 30 minutos (cabe nas CU-horas do Neon, hoje sem efeito no Supabase). **Saúde:** `/health` leve e `/health/db`. **Código:** comparação do `CRON_SECRET` com `Secret` e `timingSafeEqual` (e testes de `Bearer undefined`), `env.frontendUrls`, `env.appEnv`. **Variáveis:** `EMAIL_VERIFICATION_REQUIRED`. **Metas:** 500 usuários e 99% passam a metas de produto, fora do MVP (§14.3). **Limite de 4 MB** confirmado pelo grupo. **Pendências** renumeradas na seção 17.3 (os números 1, 3 e 7 não mudaram, pois a API os cita). |

## 1. Objetivo

Este documento explica **como publicar o Unishop na Vercel**: o frontend como site estático, a API Express como função serverless e o PostgreSQL em um serviço gerenciado (Supabase). Cobre segredos, ambientes, HTTPS, CORS, jobs agendados, backup, atualização e reversão.

Cinco regras valem para tudo que está neste guia. A regra 4 é cumprida só em parte, porque não existe rede privada entre a Vercel e o Supabase (ver seção 7.4):

| # | Regra | Como o deploy cumpre |
| --- | --- | --- |
| 1 | Nenhum segredo no código | Variáveis no painel da Vercel e do Supabase; `.env` local fora do Git; `.env.example` como modelo (seção 4) |
| 2 | Ambientes separados, cada um com seu banco | Production, Preview e Development da Vercel, produção com **um projeto Supabase próprio**, e Development e Preview compartilhando **um segundo projeto Supabase** com dados fictícios; os testes usam banco `*_test` local (seção 3) |
| 3 | Todo tráfego externo em HTTPS | Automático e obrigatório na Vercel; HTTP é redirecionado (seção 8) |
| 4 | Banco sem porta aberta para fora | **Cumprida só em parte.** O banco gerenciado é acessível pela internet, com TLS e senha. Mitigações na seção 7.4; é uma **exceção aceita pelo grupo** (seção 7.4) |
| 5 | CORS só para a origem do frontend | `FRONTEND_URL` exata, sem curinga, validada ao iniciar; o Supabase não tem lista de IPs utilizável com a Vercel, que não tem IP fixo (seção 9) |

> O que o deploy muda no restante do projeto está na seção 17.5: os jobs do `node-cron` viram chamadas HTTP, o upload de imagens passa a ser uma imagem por requisição, de até 4 MB, a API exporta o `app` sem `listen`, as tarefas depois da resposta usam `waitUntil`, o Prisma usa o endereço com *pooler* e os jobs rodam a cada 30 minutos.

## 2. Arquitetura da produção

São **dois projetos na Vercel**, cada um com seu endereço, mais o banco no Supabase. O navegador chama a API em outro domínio, então o CORS fica ativo e estrito (seção 9).

```text
Navegador
   │  HTTPS (certificado automático da Vercel)
   ├── https://<app>.vercel.app   →  Projeto "unishop-web"   Vite (arquivos estáticos, CDN)
   │
   └── https://<api>.vercel.app   →  Projeto "unishop-api"   Express como função serverless
                                          │  TLS, endereço com pooler
                                          ▼
                                     Supabase PostgreSQL   (projetos: unishop-prod e unishop-dev)

Serviços externos: Mercado Pago (webhook para a API), Cloudinary (imagens enviadas pela API),
                   Resend (e-mail), Google (login)
Agendador externo (a cada 30 min): chama os endpoints de jobs da API (seção 10)
Monitor externo (UptimeRobot): chama GET /api/v1/health (seção 14.3)
```

| Decisão | Escolha | Por quê |
| --- | --- | --- |
| Projetos | Dois: `web` (pasta `frontend`) e `api` (pasta `backend`) | Cada um tem build, variáveis e histórico próprios; o repositório continua um só |
| Domínios | Dois: um para o site, um para a API | Evita o *rewrite* entre projetos, que esconderia o IP real do usuário do rate limit e cobraria tráfego em dobro |
| Frontend | Estático, servido pela CDN | O Vite gera arquivos; não precisa de Node em produção |
| API | Express como **uma única função** (Fluid compute) | A Vercel detecta o Express sem configuração; sobe e desce conforme o tráfego |
| Banco | Supabase PostgreSQL (dois projetos: produção e desenvolvimento/preview) | A Vercel não hospeda PostgreSQL; o plano gratuito do Supabase não tem branches, então os ambientes se separam por projeto |
| Jobs | Endpoints HTTP protegidos, chamados por Vercel Cron (diário) e por agendador externo (a cada 30 min) | Não existe processo ligado para o `node-cron` (seção 10) |
| Imagens | Passam pela API, uma por requisição, até 4 MB | A função aceita no máximo **4,5 MB** por requisição (seção 5.3) |
| Deploy | `git push`; a Vercel constrói e publica | Sem servidor para administrar |

## 3. Ambientes

A Vercel separa três ambientes. Cada um recebe o **seu** banco:

| Item | Desenvolvimento | Testes | Preview | Produção |
|---|---|---|---|---|
| Onde roda | Máquina local (`npm run dev`) | Máquina local (Vitest) | Deploy de cada branch/PR na Vercel | Branch `main` na Vercel |
| Banco | `unishop_dev` em Docker local | `unishop_test` em Docker local | Projeto Supabase `unishop-dev` (compartilhado com o desenvolvimento remoto; dados fictícios) | Projeto Supabase `unishop-prod` |
| Compose | `docker-compose.yml` | `docker-compose.test.yml` | não usa | não usa |
| E-mail | Mailtrap | Mock | Mailtrap | Resend (depende da pendência 3, domínio próprio) |
| Pagamento | Mercado Pago em teste + túnel público | Mock do provider | Mercado Pago em teste (sem webhook, seção 9) | **Credenciais de teste do Mercado Pago**: conta única de teste e repasse simulado (RN-PAG-10); a tela de pagamento avisa que é um ambiente de demonstração (RN-PAG-15) |
| Imagens | Cloudinary, pasta de testes | Mock | Cloudinary, pasta de testes | Cloudinary |
| Segredos | `.env` local | `.env.test` | Variáveis do ambiente *Preview* | Variáveis do ambiente *Production* |

> **Produção não cobra dinheiro real.** O grupo decidiu que o repasse é simulado em conta única de teste (RN-PAG-10). A produção usa as credenciais de **teste** do Mercado Pago, e a `VITE_MP_PUBLIC_KEY` também é a chave de teste.

> **Preview não pode tocar o banco de produção.** O Supabase gratuito não cria banco por preview: todos os previews usam o projeto `unishop-dev` (dados fictícios), com a `DATABASE_URL` cadastrada à mão no ambiente *Preview* (seção 7.2). Confirme que, no painel da Vercel, as variáveis de banco do ambiente *Preview* **não** apontam para o projeto `unishop-prod`.

### 3.1 Desenvolvimento

O Docker Compose de desenvolvimento sobe **só o banco**; a API e o frontend rodam com `npm run dev`. É o `docker compose up -d db` do documento de Backend.

```yaml
# docker-compose.yml — só o banco; API e frontend rodam com npm run dev
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: unishop_dev
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - unishop_dev_data:/var/lib/postgresql/data

volumes:
  unishop_dev_data:
```

`DATABASE_URL` local: `postgresql://dev:dev@localhost:5432/unishop_dev`. A porta aparece só em `127.0.0.1`, então outras máquinas da rede não chegam nela. O projeto Supabase roda o **PostgreSQL 17.11** (conferido em 31/10/2026), e a imagem local, o `pg_dump` e o workflow de backup usam a mesma versão principal (17). Se o Supabase subir de versão, ajuste o `17` aqui, no `docker-compose.yml` e no workflow. Atenção: nas imagens do PostgreSQL 18 ou mais novas o volume é montado em `/var/lib/postgresql`; na 17 continua em `/var/lib/postgresql/data`. Se você já subiu o contêiner com a 18, apague o volume antigo (`docker compose down -v`; só apaga dados de desenvolvimento) antes de subir a 17.

### 3.2 Testes

```yaml
# docker-compose.test.yml — banco descartável para o Vitest + Supertest
services:
  db_test:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: unishop_test
    ports:
      - "127.0.0.1:5433:5432"
    tmpfs:
      - /var/lib/postgresql/data
```

`DATABASE_URL` dos testes: `postgresql://test:test@localhost:5433/unishop_test`. O `tmpfs` guarda os dados só em memória: ao parar o contêiner, tudo some.

**Trava de segurança.** Um teste nunca pode tocar o banco de produção. O arquivo abaixo roda antes de qualquer teste e aborta se o banco não for de testes:

```ts
// tests/helpers/assert-test-db.ts  (listado em setupFiles no vitest.config.ts)
const url = process.env.DATABASE_URL ?? '';
const dbName = url ? new URL(url).pathname.slice(1) : '';

if (process.env.NODE_ENV !== 'test' || !dbName.endsWith('_test')) {
  throw new Error(
    `Recusado: os testes só rodam em banco "*_test" (recebido: "${dbName}").`,
  );
}
```

O `.env.test` define `NODE_ENV=test` e a `DATABASE_URL` acima. **Ordem importa:** o `.env.test` precisa ser carregado antes deste arquivo (por exemplo, `dotenv -e .env.test -- vitest` ou `loadEnv` no `vitest.config.ts`), senão a trava lê a `DATABASE_URL` errada.

## 4. Segredos e variáveis

**Segredo nunca entra no Git, no código nem no build.** Os lugares certos:

| Onde | O que guarda | Vai para o Git? |
| --- | --- | --- |
| Painel da Vercel → *Settings → Environment Variables* de cada projeto | Todas as variáveis de produção e de preview | **Não** |
| `.env.example` (em `backend/` e `frontend/`) | Modelo, sem valores | Sim |
| `.env` local | Variáveis de desenvolvimento | **Não** |
| Pasta `.vercel/` (criada pelo CLI) | Vínculo com o projeto | **Não** |

O `.gitignore` do projeto deve conter:

```text
.env
.env.*
!.env.example
.vercel
backups/
```

Marque as variáveis secretas como **Sensitive** no painel: depois de salvas, o valor não pode mais ser lido, só substituído. Defina cada variável **por ambiente**, com chaves de teste e de produção diferentes. Se o painel não oferecer *Sensitive* no ambiente *Development*, use o `.env` local para o desenvolvimento.

### 4.1 Projeto `unishop-web` (frontend)

Todas são **públicas**: o Vite as grava no JavaScript do navegador. Nunca coloque segredo aqui.

```text
VITE_API_URL=https://<api>.vercel.app/api/v1
VITE_MP_PUBLIC_KEY=             # chave pública de TESTE do Mercado Pago (RN-PAG-10)
VITE_GOOGLE_CLIENT_ID=
VITE_TURNSTILE_SITE_KEY=        # só depois do MVP (anti-bot)
```

### 4.2 Projeto `unishop-api` (backend)

Os nomes vêm do documento de Backend (seção 4) e do de API (seção 6.3); a lista deve ser igual nos três.

```text
NODE_ENV=production             # vale também no Preview (a Vercel usa 'production' nos dois)
APP_ENV=production              # o ambiente DE VERDADE: production na Production, preview no Preview (docs/api/api.md, seção 6.3)

# Drivers dos providers (produção). No Preview: MAIL_DRIVER=mailtrap
PAYMENT_MODE=sandbox            # sandbox = credenciais de TESTE do Mercado Pago, também em produção (RN-PAG-10)
PAYMENT_DRIVER=mercadopago
MAIL_DRIVER=resend
STORAGE_DRIVER=cloudinary
ANTIBOT_DRIVER=noop             # noop até o Turnstile entrar; depois, turnstile (e noop passa a ser proibido)

JWT_SECRET=
JWT_EXPIRES_IN=2h
ALLOWED_EMAIL_DOMAIN=edu.unifor.br
EMAIL_VERIFICATION_REQUIRED=false   # confirmação de e-mail desligada no MVP (RN-ACE-07)
FRONTEND_URL=https://<app>.vercel.app

# Copiadas do botão Connect do Supabase (aba ORM > Prisma); confira o formato (seção 5.4)
DATABASE_URL=                   # Transaction pooler (porta 6543), usuário unishop_app.<ref-do-projeto>; acrescentar ?pgbouncer=true&connection_limit=1
DATABASE_URL_UNPOOLED=          # Session pooler (porta 5432, IPv4) ou direta (IPv6), usuário unishop_migrator.<ref-do-projeto> no pooler; só migração (o backup usa DATABASE_URL_BACKUP, só no GitHub)

GOOGLE_CLIENT_ID=
MP_ACCESS_TOKEN=                # access token de TESTE do Mercado Pago (RN-PAG-10)
MP_WEBHOOK_SECRET=              # chave secreta gerada ao cadastrar o webhook no Mercado Pago
RESEND_API_KEY=
MAIL_FROM=no-reply@<dominio-verificado-no-resend>
CLOUDINARY_URL=
CLOUDINARY_UPLOAD_FOLDER=unishop-prod

CRON_SECRET=                    # protege os endpoints de jobs (seção 10)

SERVICE_FEE_PERCENT=0
PIX_EXPIRATION_MINUTES=30
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCK_MINUTES=15
```

> **`DATABASE_URL_BACKUP` não fica no painel da Vercel.** É um segredo só do GitHub, de um papel somente leitura (seção 11.1).

> **`ADMIN_EMAIL` e `ADMIN_PASSWORD` não ficam no painel.** O seed roda no seu terminal, com as variáveis só naquela sessão (seção 7.3). Não coloque a senha do administrador em nenhum painel.

Gere os segredos na sua máquina, nunca em sites de terceiros:

```text
openssl rand -base64 48     # JWT_SECRET
openssl rand -hex 32        # CRON_SECRET
```

**Regras:**
- Se um segredo vazar (no Git, em print, em chat), troque-o na hora. Apagar o commit não basta.
- Trocar o `JWT_SECRET` desconecta todos os usuários.
- Antes de cada push, este comando não pode listar nada:

```text
git ls-files | grep -E '(^|/)\.env' | grep -v '\.example$'
```

## 5. Preparar o código

### 5.1 Backend: exportar o `app` sem `listen`

Na Vercel, a função é o próprio `app` do Express. Para a Vercel encontrar a entrada sem ambiguidade, o arquivo que monta o `app` exporta o aplicativo e **nenhum outro arquivo da raiz de `src/` chama `listen`**:

```ts
// src/app.ts — monta o app (middlewares, rotas, tratamento de erro); NÃO chama listen
import express from 'express';

export const app = express();
// ... helmet, cors, trust proxy, rotas, errorHandler (ordem: Backend, seção 6)

export default app; // a Vercel usa este export
```

```ts
// src/dev-server.ts — só para desenvolvimento local (npm run dev)
import { app } from './app';
import { env } from './config/env';
import { startCronJobs } from './jobs/scheduler'; // node-cron só roda localmente; ver seção 10

app.listen(env.port, () => {
  console.log(`API em http://localhost:${env.port}`);
  startCronJobs();
});
```

O arquivo local se chama `dev-server.ts` (e não `server.ts`) justamente para a Vercel não o confundir com a entrada da função. O script `npm run dev` do Backend passa a rodar `tsx watch src/dev-server.ts`. Confirme no log do primeiro build qual arquivo a Vercel usou como entrada.

**Tarefas depois da resposta.** O Backend (§9.7, §11 e §17) manda enviar o e-mail ao vendedor, notificar e estornar "depois da transação", sem atrasar a resposta. Na Vercel isso **não funciona** de forma solta: a função pode ser suspensa assim que a resposta sai, e uma promessa sem `await` pode nunca terminar. Em tarefas que **não podem se perder** (principalmente o estorno do RN-PAG-08), use uma destas duas formas:

```ts
import { waitUntil } from '@vercel/functions';

// 1. Estorno e e-mail críticos: esperar antes de responder (mais seguro)
await refundPayment(paymentId);
await notifySeller(order);
res.json({ ok: true });

// 2. Tarefa que pode demorar: mantém a função viva até terminar, com o mesmo timeout dela
waitUntil(notifySeller(order).catch((err) => req.log.error({ err }, 'falha ao notificar')));
res.json({ ok: true });
```

- Instale a dependência: `npm install @vercel/functions`.
- A promessa do `waitUntil` tem o **mesmo tempo limite** da função; se a função estourar o tempo, a tarefa é cancelada. A função tem até 300 s no plano Hobby.
- O estorno é decisão de dinheiro: prefira a forma 1 (esperar) e, se falhar, deixe o pedido marcado para o job `reconcile-pending-payments` refazer (Backend, seção 14).

Outros pontos de atenção:
- O Express devolve páginas de erro 500 por conta própria. Mantenha o `errorHandler` do Backend (formato `{ error: { code, message, details, requestId } }`) como **último** middleware.
- `express.static()` é ignorado na Vercel. A API não serve arquivos estáticos, então isso não afeta o Unishop.
- Use **uma única instância** do Prisma Client por processo:

```ts
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') g.prisma = prisma;
```

> **Versão do Prisma.** O trecho acima vale para o Prisma 6 ou anterior. No Prisma 7 o client é criado com um *driver adapter* (por exemplo `@prisma/adapter-pg`) e a URL do banco fica em `prisma.config.ts`. Confira com `npx prisma --version` e com o `generator` do `schema.prisma`.

### 5.2 Frontend: `vercel.json`

O Vite lê as variáveis `VITE_*` **na hora do build**. O arquivo abaixo (em `frontend/vercel.json`) devolve o `index.html` para qualquer rota do React Router, deixa os arquivos com hash em cache por um ano e envia cabeçalhos de segurança:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

Arquivos que existem de verdade (como `/assets/...`) têm prioridade sobre o `rewrite`, então ele só pega as rotas do React Router. A Vercel já envia **HSTS** nos domínios `vercel.app`; confirme com o `curl` da seção 14. A **CSP** fica para uma etapa futura, como cabeçalho neste mesmo `vercel.json`: o SDK do Mercado Pago carrega scripts e quadros de outros domínios. A lista-base dos provedores (Google, Mercado Pago, Turnstile, Cloudinary e a API) está em `docs/api/api.md`, seção 5.8. Dono proposto: Francisco.

### 5.3 Upload de imagens (uma por requisição, até 4 MB)

Uma função da Vercel aceita no máximo **4,5 MB** na requisição inteira. O Unishop aceita até 5 imagens por anúncio (Backend, seção 9.4). A decisão do grupo é **manter o upload pela API e usar o máximo que a Vercel permite**:

- **Uma imagem por requisição**, com limite de **4 MB** por imagem (sobra margem para os campos do formulário).
- A API continua conferindo o tipo real do arquivo (`multer` + `file-type`) e enviando ao Cloudinary. Nada de envio direto do navegador nem de assinatura.
- No anúncio, a **primeira** imagem vai com `POST /listings` (que cria o anúncio com pelo menos 1 imagem, RN-ANU-03) e as **demais** vão uma a uma com `POST /listings/:id/images`. A remoção usa `DELETE /listings/:id/images/:imageId`.
- O avatar do aluno (`PUT /users/me/avatar`) já é uma imagem só. O admin não troca a foto do usuário (RN-ADM-04, Regras v0.4.1).
- O frontend confere o tamanho **antes** de enviar: um arquivo acima de 4,5 MB é barrado pela própria Vercel com um erro 413 genérico, sem a mensagem do Unishop. O frontend trata o 413 como "imagem grande demais" (`FILE_TOO_LARGE`). O limite de 5 imagens por anúncio vale (RN-ANU-03).
- Como cada imagem fica ligada a um anúncio existente assim que sobe, **não há imagens órfãs** como no envio direto. Se o banco falhar na criação do anúncio, a API remove a imagem do Cloudinary, como já descreve o Backend (§10).

> **Limite de 4 MB.** O limite de **4 MB** por imagem foi **confirmado pelo grupo em 16/10/2026** e já consta nas Regras de Negócio v0.4 (RN-ANU-03, RN-PER-05), no Backend, na API e no Frontend. Ele não foi submetido ao professor; se o enunciado do trabalho trouxer outro número, o enunciado vale. Se um dia for preciso voltar a 5 MB, o frontend pode reduzir a imagem (redimensionar ou comprimir) antes de enviar, sem mudar a regra.

### 5.4 Prisma no build

O build da API gera o client e aplica as migrações. O script abaixo é o **Build Command** do projeto `unishop-api` (seção 6):

```bash
#!/usr/bin/env bash
# backend/scripts/vercel-build.sh
set -euo pipefail

npx prisma generate

# migrate deploy usa a conexão DIRETA (directUrl no schema.prisma).
# Aplica só migrações já versionadas. Nunca use "migrate dev" nem "migrate reset" aqui.
echo "Ambiente: ${VERCEL_ENV:-local}"
npx prisma migrate deploy
```

Configure o `schema.prisma` para usar as duas conexões:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")            // com pooler, usada pela API
  directUrl = env("DATABASE_URL_UNPOOLED")   // direta, usada pelo migrate
}
```

Em Preview, a `DATABASE_URL` aponta para o projeto `unishop-dev`, então a migração roda ali, e não em produção. Como todos os previews dividem esse banco, dois PRs com migrações diferentes podem se atrapalhar: aplique um de cada vez ou recrie o banco de desenvolvimento (`prisma migrate reset`, só nele). O build usa o papel `unishop_migrator` (via `DATABASE_URL_UNPOOLED`); a API em execução usa o papel `unishop_app`, sem permissão de alterar a estrutura (seção 7.1). Para o Transaction pooler do Supabase, acrescente à `DATABASE_URL` os parâmetros `?pgbouncer=true&connection_limit=1`. Para o Prisma 7, consulte a documentação do Prisma, pois a forma de declarar as duas URLs mudou.

## 6. Projetos na Vercel

Crie os dois projetos a partir do **mesmo repositório** do GitHub (*Add New → Project*), indicando a pasta de cada um:

| Campo | `unishop-web` | `unishop-api` |
|---|---|---|
| Root Directory | `frontend` | `backend` |
| Framework Preset | Vite | Express (detectado) ou *Other* |
| Install Command | `npm ci` | `npm ci` |
| Build Command | `npm run build` | `bash scripts/vercel-build.sh` |
| Output Directory | `dist` | (não se aplica) |
| Node.js Version | 22.x | 22.x |
| Production Branch | `main` | `main` |
| Região das funções | (CDN global) | Mais próxima do banco; se o painel permitir, São Paulo |

> A Vercel executa o TypeScript do `backend` diretamente, sem você precisar rodar o `tsc`. O `npm run build` do Backend continua útil para checar tipos no CI.

Em **Settings → Deployment Protection**, mantenha a proteção do ambiente *Preview* ligada (só quem está autorizado abre os previews). O endereço de **produção** do `unishop-api` precisa ficar aberto à internet, senão o webhook do Mercado Pago recebe 401.

> **Plano Hobby e equipe.** O plano Hobby (gratuito) é de uso pessoal, **não comercial**, e **não tem colaboração em equipe**. Pelas regras atuais, quem é dono dos projetos é uma conta só, e os outros membros do grupo não conseguem ser adicionados ao time. Na prática: a conta de uma pessoa (proposta: Francisco) é dona dos dois projetos, e todos dão push no GitHub. **Verifique antes do primeiro deploy** se a Vercel bloqueia deploys de commits de outros autores no repositório (isso pode acontecer em repositório privado no Hobby). Se bloquear, as saídas são: repositório público, deploys feitos só pelo dono (`vercel deploy` pelo CLI), ou o plano Pro com assentos pagos (pendência 1). Os limites do Hobby também incluem 100 deploys por dia, e cada push em PR conta.

## 7. Banco de dados (Supabase)

### 7.1 Criar o banco

1. No painel do Supabase, crie **dois projetos**: `unishop-prod` (produção) e `unishop-dev` (desenvolvimento e preview). O plano gratuito permite 2 projetos ativos. Use o Supabase **só como banco**: o projeto não usa Auth, Storage, Realtime nem a API automática (PostgREST) do Supabase (a autenticação é o JWT do backend); a RLS fica ligada nas tabelas, com política só para `unishop_app` e `unishop_backup` (decisão de Francisco, 29/10, e política por papel confirmada em 30/10; ver 7.5).
2. Escolha a região do banco **mais próxima da região das funções** da Vercel, para reduzir a latência de cada consulta.
3. Confira a **versão do PostgreSQL** em *Database → Settings*; o projeto atual roda a 17.11 (conferido em 31/10/2026) e o guia assume a 17.
4. No botão **Connect** de cada projeto, aba **ORM → Prisma**, copie as duas URLs. Cadastre-as à mão no painel da Vercel (a integração da Marketplace usa outros nomes de variável): `DATABASE_URL` (Transaction pooler, porta 6543, com `?pgbouncer=true&connection_limit=1&uselibpqcompat=true&sslmode=require`) e `DATABASE_URL_UNPOOLED` (Session pooler, porta 5432, ou conexão direta, com `?uselibpqcompat=true&sslmode=require`). A senha vai **sem os colchetes** do modelo `[YOUR-PASSWORD]`, e os valores do `.env` ficam entre aspas. Escape na senha os caracteres reservados (`&`, `#`, `?`, espaço). **A conexão direta do Supabase é só IPv6** (IPv4 exige um complemento pago); redes e runners sem IPv6 devem usar o **Session pooler**, que é IPv4 em todos os planos. Copie o host pelo Connect, sem montá-lo à mão.
5. **Crie os três papéis do banco** (Banco de Dados, seção 12) pelo *SQL Editor*: `unishop_migrator` (dono do schema, usado nas migrações), `unishop_app` (leitura e escrita nas tabelas, usado pela API) e `unishop_backup` (somente `SELECT`, usado só no backup). **Pelo pooler, o usuário de um papel próprio é `papel.ref-do-projeto`** (ex.: `unishop_app.abcdefgh`). Teste o login de cada papel pelo pooler antes do primeiro deploy (pendência 12). Se algum não funcionar, use um papel só e registre a exceção aqui.

**Limites do plano gratuito do Supabase (conferidos em 30/10/2026):** **500 MB** de banco por projeto, **2 projetos ativos**, 5 GB de saída de dados por mês, **sem branching** (exige o plano Pro), **sem backup automático nem restauração a ponto no tempo**, e o projeto é **pausado após 1 semana sem atividade** (é preciso retomá-lo pelo painel; a retomada leva alguns minutos). Os limites mudam: confira na página de preços antes da demonstração. Os jobs a cada 30 minutos e o monitor no `/health/db` geram atividade e evitam a pausa; o `/health` leve **não** consulta o banco e, sozinho, não evita a pausa.

### 7.2 Um projeto por ambiente

O plano gratuito não tem branches, então a separação é por **projeto**. Resultado:

| Ambiente | Projeto Supabase | Dados |
|---|---|---|
| Production | `unishop-prod` | Reais (do trabalho) |
| Development (remoto) | `unishop-dev`, compartilhado | Fictícios (criados pelo seed de desenvolvimento) |
| Preview | O mesmo `unishop-dev` (todos os previews dividem o banco) | Fictícios |
| Local | Banco Docker local (`unishop_dev`) | Descartáveis |

> **LGPD.** Nenhum dado de aluno real é copiado para `unishop-dev`: ele é criado vazio pelas migrações e recebe só o seed de desenvolvimento. Nunca restaure um dump de produção nele. Se a equipe passar para o plano Pro (que tem branching), os previews podem passar a derivar de um branch de desenvolvimento, nunca do de produção.

### 7.3 Migrações e seed

- **Banco que já tem as tabelas (caso do `unishop-prod` em 30/10/2026).** O `unishop-prod` foi montado fora do Prisma (tabelas, 22 `CHECK`, 20 índices, view `anuncio_visivel` e a RLS), então `prisma migrate deploy` falharia com "já existe". Em 30/10/2026 conferimos o banco contra o `schema.prisma` (`prisma migrate diff`) e contra o SQL da `1_regras_manuais` (índices, constraints, view e `IDENTITY ALWAYS` nas 8 chaves) e registramos as duas migrações com `prisma migrate resolve --applied 0_init` e `--applied 1_regras_manuais`. A partir daí `migrate status` diz "Database schema is up to date" e as próximas migrações entram por `migrate deploy`. O `migrate resolve` só grava a tabela `_prisma_migrations`; não altera tabelas nem dados. Faça o mesmo no `unishop-dev` se ele também for criado fora do Prisma; em banco vazio, basta `migrate deploy`.
- A cada deploy, o **Build Command** roda `prisma migrate deploy` (seção 5.4).
- O **seed** cria as 6 categorias fixas e a conta de administrador (RN-CAT-01, RN-ADM-11). Rode **uma vez**, **da sua máquina**, apontando para a conexão direta (ou Session pooler) de produção. Defina as variáveis só no terminal, sem gravá-las em arquivo:

```text
export DATABASE_URL="<URL direta ou Session pooler do projeto unishop-prod>"
export ADMIN_EMAIL="<e-mail do administrador>"
read -r -s -p "Senha do administrador: " ADMIN_PASSWORD && export ADMIN_PASSWORD
npm run db:seed
unset DATABASE_URL ADMIN_EMAIL ADMIN_PASSWORD
```

Como a senha só existe no terminal, não há `ADMIN_PASSWORD` para apagar de nenhum painel. O seed precisa ser idempotente (`upsert`), para rodar duas vezes sem duplicar categorias nem administrador. A conta de administrador é criada **só por seed** e não segue o domínio `@edu.unifor.br` (RN-ADM-11).

### 7.4 Banco aberto à internet: o que compensa

O endereço do Supabase é público, protegido por **TLS** e senha (use `uselibpqcompat=true&sslmode=require` na URL: o driver `pg`, que a API usa, trata `sslmode=require` sozinho como verificação completa do certificado e falha com `self-signed certificate in certificate chain` no pooler do Supabase; para verificar o servidor, baixe o certificado raiz em *Database → Settings* e use `sslmode=verify-full`). Para a regra 4 ficar o mais perto possível do original:

- Use senhas longas e geradas e **três papéis separados** (migração, aplicação e backup). A API nunca usa o papel dono do schema.
- **Nunca** coloque a `DATABASE_URL` no frontend, em logs nem em prints.
- Restringir o acesso por IP não ajuda: as funções da Vercel não têm IP fixo; portanto essa mitigação não está disponível. Como a API conecta como `unishop_app`, que não é o `postgres`, uma credencial vazada tem alcance menor.
- A exceção à regra 4 foi **aceita pelo grupo** e fica registrada aqui e na seção 17.3 (pendência 2).

### 7.5 Papéis e RLS no Supabase: passo a passo

A RLS fica ligada nas 8 tabelas, com política só para `unishop_app` (leitura e escrita) e `unishop_backup` (leitura); `anon` e `authenticated` não têm política nem privilégio (decisão de Francisco, 30/10/2026). Faça tudo primeiro no `unishop-dev` e só depois no `unishop-prod`. Os comandos SQL rodam no *SQL Editor* do projeto, como `postgres`. As senhas vêm do gerenciador de segredos, nunca do repositório.

1. **Criar os papéis** (uma vez por projeto; o `psql` e o SQL Editor aceitam o mesmo texto):

   ```sql
   CREATE ROLE unishop_migrator LOGIN PASSWORD '<senha gerada 1>';
   CREATE ROLE unishop_app      LOGIN PASSWORD '<senha gerada 2>';
   CREATE ROLE unishop_backup   LOGIN PASSWORD '<senha gerada 3>';
   ```

2. **Dar a posse ao `unishop_migrator`** (só no `unishop-prod` e em qualquer banco cujas tabelas foram criadas fora do Prisma; em banco vazio criado por `migrate deploy` com o `unishop_migrator` isso já acontece). Sem ser dono, ele não consegue rodar o `ENABLE ROW LEVEL SECURITY` nem as próximas migrações:

   ```sql
   GRANT unishop_migrator TO postgres;   -- o Supabase exige ser membro do papel para trocar o dono
   DO $$
   DECLARE r record;
   BEGIN
     FOR r IN SELECT c.relname, c.relkind FROM pg_class c
              JOIN pg_namespace n ON n.oid = c.relnamespace
              WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v')
     LOOP
       EXECUTE format('ALTER %s public.%I OWNER TO unishop_migrator',
                      CASE r.relkind WHEN 'v' THEN 'VIEW' ELSE 'TABLE' END, r.relname);
     END LOOP;
   END $$;
   ```

   Se o Supabase recusar a troca de dono, deixe o `postgres` como dono, pule o passo 4 (`migrate deploy`) e use a alternativa do passo 4, registrando a exceção na seção 17.3.

3. **Permissões**: rode o bloco "Papéis e permissões" do `docs/BancoDeDados/bd.md` (`GRANT` para `unishop_app` e `unishop_backup`, `ALTER DEFAULT PRIVILEGES` e `REVOKE` de `anon` e `authenticated`). Confira que `anon` e `authenticated` ficaram sem privilégio:

   ```sql
   SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants
   WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated');   -- deve voltar vazio
   ```

4. **Aplicar a RLS** (migração `2_rls_politicas`). Os papéis do passo 1 já têm de existir, senão a migração liga a RLS mas não cria as políticas.
   - Da sua máquina, com `DATABASE_URL_UNPOOLED` do `unishop_migrator` (Session pooler, porta 5432): `npx prisma migrate deploy`. No `unishop-dev` vazio ele roda as três migrações; no `unishop-prod` só a 2, porque `0_init` e `1_regras_manuais` já estão registradas.
   - Alternativa, se o dono for o `postgres`: cole o conteúdo de `backend/prisma/migrations/2_rls_politicas/migration.sql` no SQL Editor e registre com `npx prisma migrate resolve --applied 2_rls_politicas`.

5. **Conferir**:

   ```sql
   -- as 8 tabelas com RLS ligada (só _prisma_migrations pode ficar de fora)
   SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY 1;

   -- 16 políticas: app_all e backup_select em cada tabela
   SELECT tablename, policyname, roles, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY 1, 2;
   ```

6. **Testar o login de cada papel pelo pooler.** O usuário é `papel.ref-do-projeto`. Use `psql` com `sslmode=require`; a senha vem do gerenciador de segredos:
   - `unishop_migrator` (Session pooler, porta 5432): `SELECT count(*) FROM usuario;` funciona e um `CREATE TABLE teste_ddl (id int); DROP TABLE teste_ddl;` também.
   - `unishop_app` (Transaction pooler, porta 6543): `SELECT count(*) FROM categoria;` (6 depois do seed) e `BEGIN; UPDATE categoria SET nome = nome; ROLLBACK;`, que tem de responder `UPDATE 6` (`UPDATE 0` significa política faltando). Um `CREATE TABLE` tem de falhar com "permission denied".
   - `unishop_backup` (Session pooler, porta 5432): `SELECT count(*) FROM categoria;` e depois `pg_dump` de um schema com dados. Compare a contagem de linhas de cada tabela do dump com a do banco; dump vazio sem erro é o sintoma de política faltando. Um `UPDATE` tem de falhar.
   - `anon` e `authenticated`: com a chave pública do projeto, uma chamada à Data API (`/rest/v1/usuario`) tem de voltar vazia ou negada. Se o painel permitir, desligue a Data API.

7. **Registrar o resultado**: troque a pendência 14 da seção 17.3, a pendência 1 do `bd.md` e a pendência da RLS no `CLAUDE.md` por "testado em <data> por <nome>" ou apague-as.

**Tabela nova no futuro:** a migração que a cria leva também o `ENABLE ROW LEVEL SECURITY` e as duas políticas (acrescente o nome na lista da `2_rls_politicas` só se a tabela entrar nela; senão, repita o bloco na migração nova).

## 8. Domínio e HTTPS

- Cada projeto recebe um domínio `*.vercel.app` com **certificado emitido e renovado pela Vercel**, e o HTTP é redirecionado para HTTPS. Não há certificado nem firewall de servidor para cuidar.
- O endereço **não depende de IP**, então não há risco de IP trocado nem de limite de certificados.
- **Domínio próprio (recomendado para a entrega):** em *Settings → Domains* de cada projeto, adicione, por exemplo, `unishop.<seudominio>` (site) e `api.<seudominio>` (API) e crie os registros DNS que a Vercel indicar. Depois, atualize `FRONTEND_URL`, `VITE_API_URL`, o webhook do Mercado Pago e a origem do Google (seção 9).
- O domínio próprio é o que **resolve o e-mail**: o Resend exige um domínio verificado por DNS, e `vercel.app` não permite isso (pendência 3). Para estudantes, confira se o *GitHub Student Developer Pack* ainda oferece um domínio gratuito.

## 9. CORS e proxy

Aqui o CORS **trabalha de verdade**: o site e a API estão em origens diferentes, então o navegador faz uma checagem prévia (*preflight*) antes de cada chamada com `Authorization`.

```ts
// src/app.ts (ordem dos middlewares: seção 6 do documento de Backend)
import cors from 'cors';
import { env } from './config/env';

// env.frontendUrls já vem validada e separada (config/env.ts); a primeira é a usada nos links dos e-mails.
//   dev:  http://localhost:5173
//   prod: https://<app>.vercel.app
const allowedOrigins = env.frontendUrls;

// 1 salto de proxy (a borda da Vercel): o rate limit enxerga o IP real
app.set('trust proxy', 1);

app.use(
  cors({
    origin(origin, callback) {
      // Sem Origin = chamada servidor a servidor (webhook do gateway, cron) ou curl.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false); // o navegador bloqueia; sem erro 500
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: false, // sessão por Bearer, sem cookies
    maxAge: 600,
  }),
);
```

E, em `config/env.ts` (onde `e` é o resultado do Zod e `env` o objeto exportado, API seção 6.3), a API se recusa a subir com uma configuração perigosa:

```ts
const origins = e.FRONTEND_URL.split(',').map((o) => o.trim());
if (
  e.APP_ENV !== 'development' && e.APP_ENV !== 'test' &&   // preview e production
  origins.some((o) => o === '*' || !o.startsWith('https://') || o.endsWith('/'))
) {
  throw new Error('FRONTEND_URL de produção deve ser https, sem barra final e sem curinga');
}
```

**Regras de CORS e proxy:**
- Nunca use `*` nem `credentials: true` com origem aberta.
- `FRONTEND_URL` é igual ao endereço do site, com `https://` e sem barra no fim. A API usa o mesmo valor nos links dos e-mails (com lista, usa-se a primeira origem). Em produção há **uma** origem; a lista existe só para o desenvolvimento.
- Na Vercel o `NODE_ENV` é `production` também no Preview, então as travas usam `APP_ENV` (`production`, `preview`, `development`, `test`), definido por ambiente no painel. A validação acima exige `https` em `preview` e `production`; `http://localhost:5173` só entra em `development`.
- **Previews do frontend não chamam a API de produção** (a origem do preview não está em `FRONTEND_URL`), e o endereço de cada preview muda a cada deploy, então também não dá para listá-lo. Use o preview **só para revisão visual**. Os testes funcionais rodam localmente ou em produção.
- **Previews também não recebem o webhook do Mercado Pago**: a URL do webhook é cadastrada uma vez por aplicação no painel do Mercado Pago, e o endereço de cada preview muda. Teste de Pix e de cartão ponta a ponta só em produção ou localmente, com túnel público (ngrok ou Cloudflare Tunnel).
- Com `trust proxy` em `1`, o `req.ip` deve ser o IP do usuário. Verifique uma vez, em um deploy de teste, antes de confiar no rate limit (seção 14).
- O CORS não protege o webhook nem os endpoints de jobs: quem os protege é a **assinatura** (RN-PAG-05) e o `CRON_SECRET`.

**Cadastros externos que dependem do domínio:**

| Serviço | O que cadastrar |
|---|---|
| Mercado Pago | URL do webhook: `https://<api>.vercel.app/api/v1/payments/webhook` e a chave secreta gerada em `MP_WEBHOOK_SECRET` (credenciais de teste) |
| Google (login, **MVP**) | Origem JavaScript autorizada: `https://<app>.vercel.app` (e `http://localhost:5173` no cliente de desenvolvimento). O login só aceita contas `@edu.unifor.br` (RN-ACE-14). Teste cedo; com domínio próprio o risco cai (pendência 7) |
| Resend | Remetente (`MAIL_FROM`) de um **domínio verificado por DNS**; exige domínio próprio (pendência 3) |
| Cloudinary | Nada a cadastrar no domínio: a API envia as imagens com `CLOUDINARY_URL` (seção 5.3) |

## 10. Jobs agendados

O Backend (seção 14) roda os jobs com `node-cron` dentro do processo da API, só em desenvolvimento. Na Vercel **não existe processo ligado**, então o `node-cron` não dispara em produção. Cada job vira um **endpoint HTTP protegido**, chamado por um agendador.

### 10.1 Os jobs e onde cada um roda

Os três jobs vêm do Backend, seção 14:

| Job | Frequência (Backend) | O que faz | Quem chama |
|---|---|---|---|
| `expire-pix-payments` | A cada 30 minutos em produção (1 minuto no dev) | Cancela pedidos pendentes cujo Pix passou de 30 min ou foram abandonados; cancela a cobrança no gateway (RN-PAG-04, RN-PAG-08) | **Agendador externo** (a cada 30 min) |
| `reconcile-pending-payments` | A cada 30 minutos em produção (5 minutos no dev) | Consulta pagamentos pendentes no gateway e corrige os que perderam o webhook; refaz estornos que falharam (RN-PAG-05, RN-PAG-08) | **Agendador externo** (a cada 30 min) |
| `cleanup-expired-tokens` | Uma vez por dia | Apaga tokens de confirmação e de senha vencidos ou usados (RN-ACE-10) | **Vercel Cron** (diário) |

**Por que dois agendadores.** No plano Hobby, o Vercel Cron roda **uma vez por dia**, com precisão de ±59 minutos, e expressões mais frequentes **fazem o deploy falhar**. Os dois jobs de pagamento são os mais importantes (o `reconcile` é a rede de segurança do webhook) e precisam rodar com frequência, então ficam com um agendador externo gratuito. A frequência é de **30 minutos** por decisão do grupo (tomada por causa das CU-horas do Neon e mantida no Supabase): reduz as invocações da função, e cada chamada que consulta o banco conta como atividade e evita a pausa do projeto:

- **cron-job.org** (ou serviço equivalente): `GET` no endpoint a cada 30 minutos, com o cabeçalho `Authorization: Bearer <CRON_SECRET>`. É o caminho proposto.
- GitHub Actions com `schedule` **não serve** como único agendador desses dois jobs: o intervalo mínimo é de 5 minutos, costuma atrasar e o agendamento é desativado em repositório sem atividade.
- No plano Pro, o Vercel Cron cobre tudo, por minuto.

Como camada extra, a API também **trata o Pix vencido sob demanda**: ao ler ou pagar um pedido pendente cujo Pix expirou, ela o cancela na hora, sem depender do relógio de nenhum agendador. É isso que torna aceitável o intervalo de 30 minutos: o usuário nunca vê um Pix vencido como válido. Se o orçamento de CU-horas sobrar, o intervalo pode diminuir.

### 10.2 Os endpoints

```ts
// src/routes/internal-jobs.ts — montado em /api/v1/internal/jobs
import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';
import { jobs } from '../jobs/registry'; // mapa nome → função (Backend, seção 14); não importa o node-cron

export const internalJobs = Router();

function autorizado(header: string | undefined): boolean {
  // env.cronSecret é um Secret: .reveal() só aqui. Sem CRON_SECRET configurado, nada é autorizado.
  const segredo = env.cronSecret.reveal();
  if (!segredo) return false;
  const esperado = Buffer.from(`Bearer ${segredo}`);
  const recebido = Buffer.from(header ?? '');
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}

internalJobs.get('/:name', async (req, res, next) => {
  try {
    if (!autorizado(req.header('authorization'))) {
      return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Não autorizado' } });
    }
    const job = jobs[req.params.name as keyof typeof jobs];
    if (!job) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Job inexistente' } });
    }
    await job();
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});
```

- Os nomes usados na URL são os do Backend: `expire-pix-payments`, `reconcile-pending-payments` e `cleanup-expired-tokens`.
- O endpoint **não** passa por `authenticate` nem por `trackLastSeen`; ele só confere o `CRON_SECRET`.
- **Testes obrigatórios:** sem cabeçalho, com `Bearer` vazio, com `Bearer undefined`, com `Bearer null` e com segredo errado, a resposta é **401**; só o segredo certo devolve 200. O caso `Bearer undefined` pega o erro clássico de montar a string com uma variável não definida.
- Os jobs precisam ser **idempotentes** (rodar duas vezes não duplica efeito), porque um agendador pode repetir uma chamada.
- O Vercel Cron envia `Authorization: Bearer <CRON_SECRET>` automaticamente, quando a variável existe no projeto. Ele só roda em **deploys de produção**, não em previews.

### 10.3 Vercel Cron (jobs diários)

Em `backend/vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    { "path": "/api/v1/internal/jobs/cleanup-expired-tokens", "schedule": "0 6 * * *" }
  ]
}
```

O horário é em UTC. No plano Hobby, a Vercel pode disparar a chamada em qualquer momento dentro da hora indicada.

## 11. Backup e restauração

O plano gratuito do Supabase **não inclui backup automático nem restauração a um ponto no tempo** (conferido em 30/10/2026). Portanto o **único backup** é a cópia diária do workflow abaixo (RNF011); antes de uma migração arriscada, rode o workflow à mão.

O RNF011 pede **backup diário**. Por isso a cópia fora do Supabase é **automatizada**, e não manual.

### 11.1 Backup diário automático (GitHub Actions)

O workflow abaixo roda todo dia, faz um `pg_dump` da conexão direta com o papel **somente leitura** `unishop_backup` e guarda o arquivo como *artifact* privado por 7 dias. O segredo é o `DATABASE_URL_BACKUP`, **diferente** do `DATABASE_URL_UNPOOLED` (que pode alterar a estrutura e não deve estar no GitHub):

```yaml
# .github/workflows/backup.yml
name: backup-diario
on:
  schedule:
    - cron: "30 6 * * *"      # 06:30 UTC = 03:30 em Fortaleza
  workflow_dispatch: {}        # permite rodar à mão

jobs:
  dump:
    runs-on: ubuntu-latest
    steps:
      - name: pg_dump
        env:
          DATABASE_URL_BACKUP: ${{ secrets.DATABASE_URL_BACKUP }}
        run: |
          # imagem com a MESMA versão principal (ou maior) do PostgreSQL do Supabase (pendência 13); o segredo usa o Session pooler (IPv4), pois o runner do GitHub não tem IPv6
          docker run --rm -e URL="$DATABASE_URL_BACKUP" postgres:17-alpine \
            sh -c 'pg_dump "$URL" --schema=public --enable-row-security --format=custom --no-owner' > unishop.dump
          test -s unishop.dump
      - uses: actions/upload-artifact@v4
        with:
          name: unishop-${{ github.run_id }}
          path: unishop.dump
          retention-days: 7
```

Pontos de atenção:
- Cadastre o segredo `DATABASE_URL_BACKUP` (conexão direta, papel `unishop_backup`) em *Settings → Secrets and variables → Actions* do repositório. **Nunca** o escreva no arquivo do workflow.
- **Use este workflow só em repositório privado.** Os *artifacts* de um repositório público podem ser baixados por qualquer pessoa, e o dump tem dados de alunos. Se o repositório for público, guarde o dump em um armazenamento privado (por exemplo um bucket com acesso restrito) em vez de usar `upload-artifact`.
- O agendamento do GitHub pode atrasar e é desativado em repositório sem atividade; confira o histórico em *Actions* e rode à mão (`workflow_dispatch`) antes de migrações arriscadas.
- Copie um dump para fora do GitHub pelo menos uma vez por semana (baixe o *artifact* para a sua máquina).
- No escopo do trabalho o dump é pequeno (o banco tem limite de 1 GB). Se o *artifact* crescer de forma estranha, investigue.
- **LGPD:** os dumps guardam os dados como estavam no dia. Uma conta anonimizada (RN-PER-06) continua com os dados antigos nos dumps até a rotação de 7 dias apagá-los. Essa limitação é aceita no escopo acadêmico e deve constar na Política de privacidade.

### 11.2 Backup manual (antes de migrações arriscadas)

```bash
#!/usr/bin/env bash
# infra/scripts/backup-supabase.sh  (rodar na sua máquina, com o Session pooler ou a conexão direta do papel de backup, projeto unishop-prod)
set -euo pipefail
: "${DATABASE_URL_BACKUP:?defina a URL do Session pooler ou direta (nunca a porta 6543) do papel unishop_backup}"
umask 077

BACKUP_DIR="${BACKUP_DIR:-$HOME/unishop-backups}"
KEEP_DAYS="${KEEP_DAYS:-30}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/unishop-$STAMP.dump"

mkdir -p "$BACKUP_DIR"
pg_dump "$DATABASE_URL_BACKUP" --schema=public --enable-row-security --format=custom --no-owner > "$OUT.tmp"
[ -s "$OUT.tmp" ] || { echo "backup vazio, abortando" >&2; rm -f "$OUT.tmp"; exit 1; }
mv "$OUT.tmp" "$OUT"

find "$BACKUP_DIR" -name 'unishop-*.dump' -mtime +"$KEEP_DAYS" -delete
echo "backup ok: $OUT"
```

O `pg_dump` da sua máquina precisa ter a **mesma versão principal (ou maior)** que o PostgreSQL do Supabase (a 17). Confira com `pg_dump --version`.

### 11.3 Restaurar

Prefira, nesta ordem:
1. **`pg_restore` de um dump** (não há restauração a ponto no tempo no plano gratuito) em um projeto Supabase novo ou em um banco local descartável:

```text
createdb restore_check
pg_restore -d restore_check --no-owner unishop-AAAAMMDD-HHMMSS.dump
psql -d restore_check -c "SELECT count(*) FROM category;"
dropdb restore_check
```

O RNF011 pede **restauração testada**: faça este teste uma vez, em banco descartável, antes da entrega. O resultado esperado é 6 categorias. O nome da tabela segue o documento de Banco de Dados (confira o nome exato lá antes de rodar).

## 12. Primeiro deploy, passo a passo

1. Crie a conta na Vercel (a conta do dono, ver seção 6) e conecte o GitHub ao repositório do Unishop. Confira antes se o Hobby bloqueia commits de outros autores (pendência 1).
2. Faça uma **prova de conceito do pagamento**: com as credenciais de teste do Mercado Pago, confirme que um Pix de teste gera o webhook de aprovação (pendência 10). Isso decide se o RN-PAG-08 e o `reconcile` poderão ser testados e também qual API do Mercado Pago será usada (Payments ou Orders, ADR-002).
3. Faça o merge do código preparado na seção 5 na `main` (export do `app`, `dev-server.ts`, `vercel.json`, script de build, endpoints de jobs, `@vercel/functions`).
4. Crie o projeto **`unishop-api`** (pasta `backend`), com as configurações da seção 6. Na própria tela de importação, **adicione as variáveis** da seção 4.2 antes de implantar. Se o primeiro deploy automático falhar por falta de variáveis, é esperado: preencha e use *Redeploy*.
5. Crie os projetos **Supabase** `unishop-prod` e `unishop-dev` (seção 7.1), confira a versão do PostgreSQL, crie os três papéis em cada um e cadastre `DATABASE_URL` e `DATABASE_URL_UNPOOLED` por ambiente (Production aponta para `unishop-prod`; Preview e Development, para `unishop-dev`).
6. Preencha as variáveis no ambiente *Production* (e as de teste em *Preview*). Gere `JWT_SECRET` e `CRON_SECRET` na sua máquina. Marque os segredos como *Sensitive*.
7. Rode o deploy da API e confira se `GET https://<api>.vercel.app/api/v1/health` responde `{"status":"ok"}` e se `/api/v1/health/db` também responde 200 (esse consulta o banco).
8. Rode o **seed** uma vez, da sua máquina (seção 7.3).
9. Crie o projeto **`unishop-web`** (pasta `frontend`) e preencha `VITE_API_URL` com o endereço **real** da API. Faça o deploy.
10. Volte ao `unishop-api`, preencha `FRONTEND_URL` com o endereço **real** do site e **refaça o deploy** (as variáveis só valem nos deploys novos).
11. Cadastre o webhook do Mercado Pago e a origem do Google (seção 9).
12. Configure os jobs: o `vercel.json` com os crons diários (seção 10.3) e o agendador externo, a cada 30 minutos, para `expire-pix-payments` e `reconcile-pending-payments` (seção 10.1), com o `CRON_SECRET`.
13. Cadastre o segredo `DATABASE_URL_BACKUP` (papel somente leitura) no GitHub e rode o workflow de backup à mão (seção 11.1). Faça também o teste de restauração (seção 11.3).
14. Cadastre o monitor no UptimeRobot (seção 14.3).
15. Rode as verificações da seção 14.

> O `unishop-web` e o `unishop-api` dependem **um do endereço do outro**. É por isso que os passos 9 e 10 acontecem em sequência, com um novo deploy da API no fim.

## 13. Atualizar e reverter

### 13.1 Atualizar

O fluxo é o do Git, sem script:

| Ação | Resultado |
|---|---|
| Push em um branch ou PR | Deploy de **preview** do site e da API, com banco em branch próprio |
| Merge na `main` | Deploy de **produção**; o build da API aplica as migrações (seção 5.4) |

Antes de fazer merge de uma migração arriscada, rode o **backup manual** (seção 11.2) ou anote o horário para a restauração a um ponto no tempo. No plano Hobby há um limite de 100 deploys por dia, e cada push em PR conta.

### 13.2 Reverter

- **Só o código:** em *Deployments*, abra um deploy anterior que funcionava e use **Instant Rollback** (ou *Promote to Production*). A troca é imediata e não reconstrói nada.
- **Código e banco:** o rollback da Vercel **não desfaz migrações**. Se a migração nova mexeu em dados, restaure o banco (dump, seção 11.3; não há ponto no tempo no plano gratuito) e depois faça o rollback do código.
- Migrações do Prisma só andam para frente. Prefira migrações **aditivas** (criar coluna, criar tabela), que não impedem voltar ao código anterior.
- Rollback do **site** e da **API** são independentes: confira se a versão do site é compatível com a da API antes de reverter só um deles.

### 13.3 Operação do dia a dia

| Tarefa | Onde ou como |
|---|---|
| Estado dos deploys | Painel da Vercel → *Deployments* |
| Logs da API | Painel → *Logs* do projeto `unishop-api`, ou `vercel logs <endereço-do-deploy>` |
| Erros em tempo de execução | Painel → *Observability* |
| Variáveis | Painel → *Settings → Environment Variables*, ou `vercel env ls` |
| Consultar o banco | *SQL Editor* ou *Table Editor* do Supabase, ou `psql` com o Session pooler |
| Disparar um job à mão | `curl -H "Authorization: Bearer $CRON_SECRET" https://<api>.vercel.app/api/v1/internal/jobs/<nome>` |

> **Logs duram pouco.** No plano Hobby, os logs de execução ficam disponíveis por **cerca de 1 hora** (no Pro, 1 dia). Um erro de ontem não aparece mais. Se for preciso investigar problemas antigos, envie os logs a um serviço externo ou registre os erros críticos no banco. O Backend (§18) já guarda o log de auditoria no banco.

## 14. Verificação e checklist

Rode do **seu computador**, no Git Bash ou WSL. Troque `API` e `APP` pelos endereços reais.

```bash
APP=https://unishop.vercel.app
API=https://unishop-api.vercel.app

curl -sI "${APP/https/http}" | head -n 1                      # 308 → HTTPS
curl -s "$API/api/v1/health"                                  # {"status":"ok"} (leve, sem banco)
curl -s "$API/api/v1/health/db"                               # 200 com o banco; 503 sem (um projeto pausado precisa ser retomado no painel)
curl -sI "$APP/" | grep -i strict-transport                   # HSTS presente
curl -sI "$APP/categorias" | head -n 1                        # 200 (o React Router decide)
curl -sI -H "Origin: https://evil.example" "$API/api/v1/health" \
  | grep -i access-control                                    # nada: origem recusada
curl -sI -X OPTIONS -H "Origin: $APP" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization" \
  "$API/api/v1/health" | grep -i access-control               # allow-origin igual ao $APP
curl -s -o /dev/null -w "%{http_code}\n" \
  "$API/api/v1/internal/jobs/cleanup-expired-tokens"          # 401 sem o segredo
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer undefined" \
  "$API/api/v1/internal/jobs/cleanup-expired-tokens"          # 401 também
```

### 14.1 Checklist por regra

| Regra | Como conferir | Esperado |
|---|---|---|
| 1. Sem segredos | O comando `git ls-files` da seção 4; painel com variáveis *Sensitive*; `.vercel` no `.gitignore` | Nenhum `.env` no Git; segredos só nos painéis |
| 2. Ambientes separados | Variáveis do ambiente *Preview* diferentes das de *Production*; `npm test` com a `DATABASE_URL` de produção | Preview em branch próprio; a trava recusa e nada é tocado |
| 3. Só HTTPS | `curl -sI http://...` e o certificado no navegador | Redireciona; cadeado válido |
| 4. Banco | A conexão exige TLS e senha; a API usa o papel `unishop_app`; a `DATABASE_URL` não aparece no frontend nem nos logs | Exceção registrada e aceita pelo grupo (sem lista de IPs no plano gratuito) |
| 5. CORS estrito | `curl` com `Origin` estranho; *preflight* com a origem do site | Sem `Access-Control-*` para a origem estranha; `allow-origin` igual ao site para a origem certa |

### 14.2 Teste funcional mínimo

1. A tela inicial abre sem login e mostra o carrossel (`GET /listings/recent`).
2. Abrir `/categorias` sem login leva ao login; atualizar a página (F5) em `/categorias` **não** dá 404.
3. Cadastro com e-mail `@edu.unifor.br` funciona; com outro domínio, recusa. Login com Google funciona com conta `@edu.unifor.br` e abre a tela "completar cadastro" na primeira vez (RN-ACE-14); conta de outro domínio é recusada.
4. Login de aluno vai para `/categorias`; login de admin, para `/admin/usuarios`.
5. Publicar anúncio com 3 imagens de cerca de 3,9 MB cada: a primeira vai com a criação do anúncio e as outras duas em chamadas seguidas; as três aparecem, vindas do Cloudinary. Uma sexta imagem é recusada. Uma imagem acima de 4 MB é recusada com a mensagem do Unishop (`FILE_TOO_LARGE`), não com um 413 genérico. Um arquivo que não é JPG/PNG é recusado.
6. Pagar com Pix **com as credenciais de teste do Mercado Pago**: o webhook chega, o pedido vira "Pago", o estoque baixa e o e-mail ao vendedor **é enviado** (não pode se perder depois da resposta). Faça este teste em produção ou localmente com túnel, não em preview.
7. Forçar a falta de estoque na confirmação: o pedido é cancelado e o **estorno acontece** (RN-PAG-08).
8. O e-mail de recuperação de senha chega a qualquer endereço `@edu.unifor.br`, com link para o site de produção. Se não chegar, a pendência 3 está aberta. Com `EMAIL_VERIFICATION_REQUIRED=false`, o cadastro não exige confirmar o e-mail.
9. Um Pix vencido expira (pelo job ou sob demanda), conforme a seção 10.
10. O `req.ip` registrado nos logs é o do usuário, não o da Vercel (rate limit correto).
11. Os logs da API não mostram senha, JWT, token de cartão nem WhatsApp completo.
12. O workflow de backup roda e gera o arquivo (seção 11.1).

### 14.3 Requisitos não funcionais

| Requisito | Como acompanhar |
|---|---|
| RNF001: HTTPS e hash de senha | Item 3 do checklist e Backend, seção 16 (bcrypt) |
| RNF008: página em até 3 s | `curl -s -o /dev/null -w "%{time_total}\n" $APP/` e o Lighthouse; observe também a **primeira chamada** à API após um período parado (partida a frio) |
| RNF010: 500 usuários simultâneos | **Meta de produto, fora do MVP** (decisão do grupo em 16/10/2026: o objetivo agora é concluir e ser avaliado, mantendo a infraestrutura gratuita). Se o projeto seguir como produto, fazer teste de carga com k6 contra um preview, nunca contra produção, e reavaliar o plano do Supabase |
| RNF011: 99% de disponibilidade | **Meta de produto, não medida no MVP** (Regras de Negócio, seção 6). O UptimeRobot já fica ligado no MVP em `$API/api/v1/health` (o leve), a cada 5 minutos, com aviso por e-mail |
| RNF011: backup diário | Histórico do workflow em *Actions* (um dump por dia) (o plano gratuito do Supabase não tem backup próprio) |
| RNF011: restauração testada | Teste da seção 11.3, uma vez antes da entrega |

> Os demais RNF (RNF012 a RNF016) não foram mapeados neste guia: o PDF do trabalho não está no repositório para conferir quais deles dependem de deploy (pendência 6 da seção 17.3).

## 15. Segurança operacional

- **Contas:** ative a verificação em duas etapas na Vercel, no Supabase e no GitHub. Como o plano Hobby tem uma conta dona, essa conta é a mais crítica: use senha forte e guarde a recuperação em local seguro.
- **Tokens:** o *Personal Access Token* da Vercel e o `CRON_SECRET` são segredos; troque-os se vazarem.
- **Variáveis:** use *Sensitive* nos segredos e mantenha cada ambiente com valores próprios.
- **Previews protegidos:** mantenha a *Deployment Protection* do ambiente Preview ligada; previews públicos expõem uma API conectada a um banco com dados.
- **Endpoints de jobs:** só respondem com o `CRON_SECRET` (seção 10). Nunca os documente na OpenAPI pública.
- **Papéis do banco:** a API usa `unishop_app`; migração e backup usam papéis próprios (seção 7.1).
- **Segredos do GitHub:** o `DATABASE_URL_BACKUP` (somente leitura) do workflow de backup fica em *Secrets*, nunca no arquivo. O `DATABASE_URL_UNPOOLED` (migração) não vai para o GitHub. Quem sair do grupo perde o acesso ao repositório.
- **Firewall:** o *Attack Challenge Mode* da Vercel pode ser ligado em caso de abuso; ajuste o rate limit da API ao armazenamento escolhido (seção 16).
- **Logs:** nunca registrar senha, JWT, token de cartão ou WhatsApp completo (Backend, seção 18).
- **Rotação:** troque `JWT_SECRET` e as chaves se alguém sair do grupo com acesso a elas. Trocar o `JWT_SECRET` desconecta todos os usuários.

## 16. Riscos

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| **Plano Hobby sem equipe** | Só uma conta é dona; commits de outros autores podem ser bloqueados | Conta única de dono, repositório público ou deploy pelo CLI, ou plano Pro (pendência 1) |
| **E-mail não sai com domínio `vercel.app`** | Sem confirmação de conta, sem recuperação de senha, sem troca de e-mail (RN-ACE-07, RN-ACE-10, RN-PER-02) | Domínio próprio com DNS verificado no Resend (pendência 3) |
| **Tarefas depois da resposta perdidas** | E-mail ao vendedor e estorno não acontecem (RN-NOT-01, RN-PAG-08) | `await` ou `waitUntil` (seção 5.1); `reconcile` refaz estornos (seção 10) |
| **Pix de teste do Mercado Pago pode não gerar webhook de aprovação** | RN-PAG-08, o webhook e o `reconcile` não podem ser testados de ponta a ponta | Prova de conceito antes de montar o resto (seção 12, passo 2; pendência 10) |
| Jobs frequentes no plano Hobby | Pix vencido não expira na hora; webhook perdido não é corrigido | Agendador externo a cada 30 minutos + expiração sob demanda (seção 10) |
| Limite de 4,5 MB por requisição | Imagem acima disso falha com 413 genérico da Vercel | Uma imagem por requisição, até 4 MB; o frontend confere o tamanho antes e trata o 413 (seção 5.3) |
| **Limite de 4 MB contra os 5 MB citados no enunciado** | Possível desvio do requisito, que tem prioridade sobre as decisões do grupo | Limite confirmado pelo grupo; conferir o enunciado do trabalho; se exigir 5 MB, o frontend comprime a imagem antes de enviar (pendência 5) |
| Banco acessível pela internet (regra 4) | Superfície de ataque maior que a de um banco em rede interna | TLS, senha forte, três papéis com privilégio mínimo; **sem lista de IPs no plano gratuito**; exceção aceita pelo grupo |
| Partida a frio e latência até o banco | Primeira chamada lenta após a partida a frio da função; risco para o RNF008 | Funções e banco na mesma região; medir; o Fluid compute reduz as partidas a frio |
| **Pausa do projeto Supabase (1 semana sem atividade)** | Banco indisponível até alguém retomá-lo no painel | Jobs de 30 em 30 minutos e monitor no `/health/db` geram atividade; conferir o painel antes da demonstração |
| **Sem backup automático nem ponto no tempo** | Um erro ou migração ruim só se desfaz com o dump do dia | Workflow diário do GitHub Actions; rodar o workflow à mão antes de migrações arriscadas |
| **Armazenamento de 500 MB** | Banco passa a só leitura ao encher | As imagens ficam no Cloudinary; no banco só texto; acompanhar o tamanho |
| Conexões esgotadas no banco | Erros 500 sob carga | Endereço com **pooler** e `connection_limit=1`, uma instância do Prisma por processo |
| Rate limit em memória | Cada instância conta separado; o limite vira inócuo | Armazenamento compartilhado (por exemplo Upstash Redis) ou aceitar a limitação no escopo acadêmico. **O bloqueio de login (5 erros / 15 min) já é gravado no banco** (Backend §8) e não é afetado |
| Backup do GitHub em repositório público | Vazamento de dados de alunos | Workflow só em repositório privado (seção 11.1) |
| Logs de 1 hora no Hobby | Erros antigos não podem ser investigados | Registrar erros críticos no banco ou enviar a um serviço externo |
| Previews com cópia de dados reais | Exposição de dados de alunos | Previews nascem do branch `development` (fictício), nunca do `production`; preview protegido |
| Limites do plano gratuito (banco, banda, execuções) | Site pausado ou mais lento | Acompanhar o uso; plano pago se o projeto continuar |
| Plano Hobby é de uso pessoal e não comercial | Conflito com os termos se o projeto virar negócio | Confira os termos atuais; migrar para o Pro se houver uso comercial |
| Dois projetos dependentes de endereço | Erro de CORS ao trocar um domínio | Atualizar `FRONTEND_URL`, `VITE_API_URL`, webhook e Google juntos (seção 12) |

## 17. Decisões, pendências e impacto nas outras docs

### 17.1 ADR-005 · Hospedagem

| Critério | Vercel + Supabase (adotada) | Oracle Cloud + Docker (avaliada, não adotada) |
|---|---|---|
| Esforço de deploy | Baixo (`git push`) | Alto (servidor, Docker, proxy, certificados) |
| Experiência do grupo | Adequada para quem nunca fez deploy | Exige administrar servidor |
| Regra 4 (banco fechado) | Cumprida só em parte (banco gerenciado público) | Cumprida |
| Jobs agendados | Precisam virar endpoints + agendador externo (30 min) | Funcionam como estão (`node-cron`) |
| Upload de imagens | Uma por requisição, até 4 MB | Funciona como está (5 MB) |
| Lista de IPs do banco | Indisponível com a Vercel (sem IP fixo) | Possível com firewall do servidor |
| Equipe | Hobby: conta única de dono | Chave SSH por pessoa |
| Backup | Workflow diário (o Supabase gratuito não tem backup próprio) | `pg_dump` diário no servidor |
| Rollback | Instant Rollback, um clique | Imagem anterior por etiqueta |
| Custo | Gratuito, com limites do Hobby e do Supabase (500 MB, pausa em 1 semana) | Gratuito, com risco de capacidade |

**Decisão (fechada pelo grupo):** Vercel + Supabase, pela simplicidade para um grupo que faz o primeiro deploy. A alternativa em servidor próprio **não será documentada**. Se os limites do Hobby, a regra 4 ou os jobs virarem problema, a revisão da hospedagem volta ao grupo como um novo ADR.

### 17.2 Decisões já tomadas que este guia segue

| Tema | Decisão | Origem |
| --- | --- | --- |
| Gateway de pagamento | Mercado Pago | Decisão do grupo (ADR-002) |
| Repasse e pagamento | Conta única de teste; repasse simulado; sem cobrança real | RN-PAG-10 |
| Taxa de serviço | R$ 0,00 (`SERVICE_FEE_PERCENT=0`) | RN-PED-02 |
| Sessão | JWT em `Authorization: Bearer`, sem cookie (por isso `credentials: false`) | RN-ACE-11 |
| Backup | Diário, com restauração testada | RNF011 |
| Jobs agendados | Viram endpoints HTTP protegidos por `CRON_SECRET` | Decisão do grupo |
| Entrada da API | `app.ts` exporta o app; `dev-server.ts` liga a porta só em desenvolvimento | Decisão do grupo |
| Tarefas depois da resposta | `await` no estorno e `waitUntil` no e-mail e na notificação | Decisão do grupo |
| Upload de imagens | Pela API, uma imagem por requisição, até 4 MB, até 5 imagens por anúncio (usa o máximo da Vercel) | Decisão do grupo, confirmada em 16/10/2026 (pendência 5) |
| Login | E-mail e senha, e Google (`@edu.unifor.br`) no MVP; Apple fora | Decisão do grupo, 16/10/2026 (RN-ACE-14) |
| Metas de produto | 500 usuários e 99% de disponibilidade fora do MVP; infraestrutura gratuita | Decisão do grupo, 16/10/2026 |
| Jobs | A cada 30 minutos em produção | Decisão do grupo, 16/10/2026 (mantida após a troca para o Supabase) |
| Hospedagem e banco | Vercel (frontend e API) com PostgreSQL no Supabase (só como banco) | ADR-005, revisado em 30/10/2026 (antes: Neon) |

A decisão "uma única instância da API" do Backend §14 **deixa de valer** na Vercel (a função escala sozinha). Ela é trocada pela exigência de jobs idempotentes (seção 10).

### 17.3 Pendências em aberto

**Estado em 16/10/2026.** As propostas das pendências 2, 4, 8 e 9 passam a valer como decisão: exceção da regra 4 aceita, cron-job.org a cada 30 minutos, rate limit em memória aceito no escopo acadêmico. A pendência 5 (4 MB) foi confirmada pelo grupo. Continuam abertas, porque dependem de ação externa: **1** (verificar o bloqueio de commits no Hobby), **3** (domínio próprio), **6** (conferir o enunciado quanto aos RNF012 a RNF016), **7** (testar o Google), **10** (prova de conceito do Pix de teste e escolha Payments ou Orders), **11** (nome da tabela) e **12** (criar e testar os papéis no Supabase) e **13** (versão do PostgreSQL). Os números 1, 3 e 7 não mudam porque a API os cita.

| # | Pendência | Proposta |
| --- | --- | --- |
| 1 | **Plano da Vercel e equipe:** o Hobby não tem colaboração; commits de outros autores podem ser bloqueados | Conta única de dono (Francisco); verificar o bloqueio antes do primeiro deploy; Pro só se for indispensável |
| 2 | **Exceção à regra 4:** banco do Supabase acessível pela internet, sem lista de IPs utilizável com a Vercel | **Aceita** com TLS, senha forte e três papéis (seção 7.4) |
| 3 | **E-mail em produção:** o Resend exige domínio verificado por DNS, e `vercel.app` não permite | Registrar um domínio próprio barato e apontá-lo para os dois projetos (seção 8) |
| 4 | **Agendador externo** dos jobs frequentes | **Decidido:** cron-job.org (ou similar), a cada 30 minutos, para `expire-pix-payments` e `reconcile-pending-payments` |
| 5 | **Limite de imagem: 4 MB** (confirmado pelo grupo em 16/10/2026; já nos documentos) | Conferir o enunciado; se exigir 5 MB, o frontend comprime antes de enviar (seção 5.3) |
| 6 | **RNF012 a RNF016:** não mapeados neste guia | Conferir o enunciado e acrescentar à seção 14.3 o que depender de deploy |
| 7 | **Login com Google** (MVP) em `vercel.app` | Testar cedo; se recusar, usar o domínio próprio |
| 8 | **Rate limit** (`express-rate-limit`) em memória por instância | **Aceito** no escopo acadêmico; Redis gerenciado (Upstash) só se virar produto |
| 9 | **Versão do Prisma** (ADR-001): client, *driver adapter* e `directUrl` | Felipe confirma ao instalar e ajusta as seções 5.1 e 5.4 |
| 10 | **Pix com credenciais de teste do Mercado Pago:** não foi verificado se o Pix de teste gera o webhook de aprovação; também decide a Payments API ou a Orders API (ADR-002) | Prova de conceito no início do projeto (seção 12, passo 2); registrar o resultado na seção 14.2 |
| 11 | **Nome da tabela de categorias** no teste de restauração | Ana Clara confirma no documento de Banco de Dados |
| 12 | **Papéis do banco no Supabase:** criar `unishop_migrator`, `unishop_app` e `unishop_backup` pelo SQL Editor e testar o login de cada um pelo pooler (`papel.ref-do-projeto`) | Francisco ou Ana Clara confirma antes do primeiro deploy; se não der, um papel só e a exceção registrada aqui |
| 13 | ~~Versão do PostgreSQL no Supabase~~ **Resolvida em 31/10/2026:** o projeto roda a 17.11; imagem do Docker, `pg_dump` e workflow ajustados para a 17 | — |
| 14 | **RLS ligada × papéis `unishop_*`:** a RLS está ligada nas 8 tabelas e `unishop_app` e `unishop_backup` (não donos) ficam sem acesso se não houver política; o `pg_dump` sairia vazio sem erro | Decidido por Francisco em 30/10/2026: política `app_all` para `unishop_app` e `backup_select` para `unishop_backup` em cada tabela, nenhuma para `anon` e `authenticated` (migração `2_rls_politicas`). **Aplicada em 31/10/2026** no projeto `UNISHOP DB`: papéis criados, `unishop_migrator` dono das tabelas e da view, políticas `app_all` e `backup_select` nas 8 tabelas (na `_prisma_migrations` só `backup_select`), `anon` e `authenticated` sem privilégio, Security Advisor sem alertas, migração registrada. **Falta** o passo 6 da 7.5 (login de cada papel pelo pooler, `UPDATE 6` como `unishop_app`, `pg_dump` do `unishop_backup` com contagem de linhas) e repetir no `unishop-dev` |

### 17.4 O que cada pessoa confirma

| Quem | Confirmar |
|---|---|
| Felipe (backend) | `src/app.ts` com `export default app` e sem `listen`; `dev-server.ts` só local; `await`/`waitUntil` nas tarefas depois da resposta (e-mail, notificação, estorno); jobs como endpoints idempotentes com `CRON_SECRET`, comparado com `timingSafeEqual` e testado com `Bearer undefined`; `/health` leve e `/health/db`; upload de uma imagem por requisição (até 4 MB) com `POST /listings`, `POST /listings/:id/images` e `DELETE /listings/:id/images/:imageId`; `trust proxy` e CORS como na seção 9; `GET /health` **não** consulta o banco; seed idempotente e `npm run db:seed`; Prisma com pooler e `directUrl`; prova de conceito do Pix de teste |
| Pedro (API) | O `openapi.yaml` (ainda não existe, pendência 5 do `api.md`) usa o servidor `https://<api>.vercel.app/api/v1`; documentar as rotas de imagem (`POST` e `DELETE /listings/:id/images`) e o limite de 4 MB |
| Francisco (frontend e deploy) | `VITE_API_URL` absoluto; `frontend/vercel.json` com o `rewrite` do React Router; `ImageUploader` com uma imagem por requisição, conferência de 4 MB antes de enviar e tratamento do 413; UptimeRobot no `/health`; `VITE_MP_PUBLIC_KEY` e `VITE_GOOGLE_CLIENT_ID`; bloqueio de commits de outros autores no Hobby; agendador externo; segredo `DATABASE_URL_BACKUP` no GitHub |
| Felipe e Pedro (providers e segurança) | `config/env.ts` com `APP_ENV`, `FRONTEND_URL` em lista e `CRON_SECRET`; travas de produção por `APP_ENV` (`docs/api/api.md`, seção 6.3); lista de variáveis do `api.md` igual à da seção 4.2 deste guia; `openapi.yaml` (pendência 13 do `api.md`) |
| Ana Clara (banco) | Nome das tabelas para o teste de restauração; índices e as restrições do Banco v0.2 presentes nas migrações; os três papéis; compatibilidade com a versão do PostgreSQL do Supabase (pendência 13) |
| Grupo | Pendências 1, 3 e 7 acima (as demais já estão decididas) |

### 17.5 Ajustes em outros documentos

Em 16/10/2026 todos os documentos foram alinhados em conjunto. O quadro registra o estado:

| Documento | Estado |
|---|---|
| `docs/regras-de-negocio/regras-de-negocio.md` (v0.4) | **Aplicado:** 4 MB, Google no MVP, metas de produto fora do MVP, novas regras (ACE-14, ACE-15, PED-10 a PED-13, PAG-12 a PAG-15, entre outras) |
| `docs/banco-de-dados/banco-de-dados.md` (v0.2) | **Aplicado:** estado final do banco, três papéis, `DATABASE_URL_UNPOOLED`, `DATABASE_URL_BACKUP` |
| `docs/backend/backend.md` (v0.3) | **Aplicado:** `app.ts` e `dev-server.ts`; jobs como endpoints a cada 30 minutos; imagens uma por requisição até 4 MB; `waitUntil`; `/health` leve e `/health/db` |
| `docs/api/api.md` (v0.3) | **Aplicado:** `APP_ENV` e travas, variáveis iguais às da seção 4.2, limites do banco revisados para o Supabase, ADRs 001 a 009 |
| `docs/frontend/frontend.md` (v0.4) | **Aplicado:** `VITE_API_URL` absoluto, telas e rotas faltantes, 4 MB, aviso de demonstração |
| `README.md`, `CLAUDE.md`, `docs/skills/skills.md` do repositório | **A atualizar pelo grupo:** nomes de pastas sem acento (`regras-de-negocio`), limite de 4 MB na regra central do `CLAUDE.md`, Google no MVP; o `docs/README.md` deste conjunto traz o índice |