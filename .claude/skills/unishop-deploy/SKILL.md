---
name: unishop-deploy
description: Deploy do Unishop em produção na Vercel (frontend e API serverless) com PostgreSQL no Neon: ambientes, variáveis e segredos por ambiente, `APP_ENV`, `app.ts`/`dev-server.ts`, `vercel.json`, build com Prisma, CORS, jobs agendados por endpoint (Vercel Cron e agendador externo), upload de imagem, `waitUntil`, backup no GitHub Actions, rollback e checklist. Use SEMPRE que o usuário falar de deploy, publicar, "colocar no ar", Vercel, Neon, variáveis de ambiente de produção, preview, domínio, HTTPS, CRON_SECRET, cron, migração em produção, seed, backup, restauração, rollback ou limites do plano Hobby, mesmo que não diga "deploy" ou "Unishop".
metadata:
  author: unishop-team
  version: "0.2.0"
---

# Deploy do Unishop (Vercel + Neon)

Resumo operacional. Fonte completa e autoritativa: [`docs/deploy/deploy.md`](../../../docs/deploy/deploy.md) (v0.3, de 16/10/2026, alinhada ao conjunto v0.4/v0.3). Banco, papéis e migração: skill `unishop-database` ([`docs/BancoDeDados/bd.md`](../../../docs/BancoDeDados/bd.md)). Segredos, providers e travas: [`docs/api/api.md`](../../../docs/api/api.md). Em dúvida, releia a seção citada.

**Seja conservador com o que sai da máquina.** Deploy, push, troca de variável e restauração de banco afetam outras pessoas ou dados de alunos. Só execute quando o usuário pedir, confirme o alvo (produção ou preview) antes, e nunca grave token, senha ou `DATABASE_URL` em arquivo versionado. O grupo é novato em deploy: explique o porquê de cada passo.

## Arquitetura e decisões (ADR-005, fechada)

Dois projetos Vercel do mesmo repositório (`unishop-web` na pasta `frontend`, `unishop-api` na pasta `backend`), em domínios diferentes, mais o banco no Neon (PostgreSQL 18, plano gratuito: 1 GB, 100 CU-h por mês, 10 branches, restauração de 6 h, dorme após 5 min, sem lista de IPs; um branch por ambiente, e os previews nascem do branch `development`, **nunca** do `production`, para não copiar dados de alunos). O CORS fica ativo e estrito. Deploy por `git push`: push em branch/PR gera **preview**; merge na `main` gera **produção**. Gateway: Mercado Pago, com **credenciais de teste também em produção** (RN-PAG-10: conta única de teste, repasse simulado).

## As cinco regras

1. **Nenhum segredo no código:** variáveis no painel da Vercel (*Sensitive*) e `.env` local fora do Git; `.env.example` só com nomes.
2. **Ambientes separados**, cada um com seu banco: produção usa o branch `production`; cada preview ganha um branch; testes usam Docker local `*_test` (a trava `assert-test-db.ts` recusa outro banco).
3. **Só HTTPS** (automático na Vercel).
4. **Banco sem porta aberta: cumprida só em parte.** O Neon é público, com TLS e senha. É uma exceção a aceitar (pendência 2). Nunca coloque a `DATABASE_URL` no frontend, em log ou em print.
5. **CORS só para a origem do site:** `FRONTEND_URL` exata, `https`, sem `*` e sem barra no fim.

## Ambientes e variáveis

`APP_ENV` define o ambiente de verdade (`production`, `preview`, `development`, `test`); na Vercel o `NODE_ENV` é `production` também no Preview. Lista completa na seção 4.2 do deploy e no `.env.example` do `api.md`. Pontos que costumam dar erro:

- **Três papéis de banco:** `DATABASE_URL` com pooler (`?pgbouncer=true&connection_limit=1`) e papel `unishop_app` para a API (sem permissão de alterar estrutura); `DATABASE_URL_UNPOOLED` (conexão direta, `directUrl` no `schema.prisma`, papel `unishop_migrator`) só para migração e seed, **fora do GitHub**; `DATABASE_URL_BACKUP` (papel `unishop_backup`, somente leitura) só como segredo do GitHub, para o backup. Criar os papéis no Neon gratuito ainda precisa ser confirmado no painel (pendência 12).
- `EMAIL_VERIFICATION_REQUIRED` (padrão `false`) e `CRON_SECRET` (mínimo de 32 caracteres) entram na lista de variáveis.
- `ADMIN_EMAIL`/`ADMIN_PASSWORD` **não vão para painel**: o seed roda no terminal, uma vez, com as variáveis só naquela sessão.
- Variáveis `VITE_*` são lidas **no build**: trocar uma exige novo deploy do site. As quatro são públicas.
- `unishop-web` e `unishop-api` dependem do endereço um do outro: crie a API, depois o site com o endereço real, depois volte à API para preencher `FRONTEND_URL` e refaça o deploy.
- **Previews não chamam a API de produção** nem recebem webhook do Mercado Pago; servem só para revisão visual.

## O que o código precisa para rodar na Vercel

- `src/app.ts` só **monta** o Express e faz `export default app`; nenhum `listen` em `src/`. O arquivo local é `src/dev-server.ts` (nome escolhido para a Vercel não confundi-lo com a entrada). `npm run dev` usa o `dev-server.ts`.
- **Tarefas depois da resposta:** a função pode ser suspensa quando a resposta sai. Estorno e outras ações de dinheiro: `await` antes de responder (se falhar, o job `reconcile-pending-payments` refaz). E-mail e notificação: `waitUntil` de `@vercel/functions`.
- **Imagens:** uma por requisição, até 4 MB (a Vercel aceita 4,5 MB por requisição); a primeira vai em `POST /listings`, as demais em `POST /listings/:id/images`. O frontend confere o tamanho antes e trata o 413 da Vercel como `FILE_TOO_LARGE`. O limite difere dos 5 MB do RNF005: desvio **confirmado pelo grupo em 16/10/2026**; se o enunciado exigir 5 MB, o frontend comprime antes de enviar (seção 5.3 do deploy).
- `frontend/vercel.json`: `rewrite` para o `index.html` (rotas do React Router), cache imutável em `/assets/` e cabeçalhos de segurança. A CSP vem depois; a lista-base está no `api.md`, seção 5.8.
- Build da API: `bash scripts/vercel-build.sh` = `prisma generate` + `prisma migrate deploy`. Nunca `migrate dev`/`reset` em produção. Migrações **aditivas**, porque o rollback da Vercel não desfaz migração.
- Um só Prisma Client por processo. No Prisma 7 muda a forma de declarar as URLs (`prisma.config.ts`, driver adapter): confira a versão.

## Jobs agendados (seção 10)

Na Vercel não existe processo ligado, então o `node-cron` só roda em desenvolvimento. Cada job é um endpoint `GET /api/v1/internal/jobs/<nome>` protegido por `Authorization: Bearer <CRON_SECRET>` (comparação com `Secret` e `timingSafeEqual`, sem `authenticate`, fora da OpenAPI pública; teste `Bearer undefined` e `Bearer [REDACTED]` = 401). Os jobs são **idempotentes**.

| Job | Frequência | Quem chama |
|---|---|---|
| `expire-pix-payments` | a cada **30 min** | agendador externo (cron-job.org) |
| `reconcile-pending-payments` | a cada **30 min** | agendador externo |
| `cleanup-expired-tokens` | diário | Vercel Cron (`backend/vercel.json`) |

A frequência de 30 minutos é escolha de custo: cada chamada acorda o banco do Neon, e a computação gratuita é limitada. No plano Hobby o Vercel Cron roda **uma vez por dia** (±59 min) e expressão mais frequente faz o **deploy falhar**. GitHub Actions agendado não serve para os dois jobs frequentes (mínimo de 5 min, atrasa, desliga em repo inativo). A API também cancela o pedido pendente vencido (30 min) sob demanda ao lê-lo ou pagá-lo, então o atraso do agendador não aparece para o aluno.

## Plano Hobby: limites que mudam o trabalho

Uso pessoal e **não comercial**; **sem colaboração em equipe** (uma conta é dona dos dois projetos, proposta: Francisco); 100 deploys por dia; logs de execução de cerca de 1 hora; função com até 300 s. Verifique antes do primeiro deploy se commits de outros autores são bloqueados em repositório privado. Se forem: repositório público, deploy pelo CLI pelo dono, ou Pro.

## Backup e restauração (RNF011)

Backup **diário** por workflow do GitHub Actions (`pg_dump` 18 da conexão direta, segredo `DATABASE_URL_BACKUP` com o papel somente leitura `unishop_backup`, retenção de 7 dias) **somente em repositório privado**, mais a restauração a um ponto no tempo do Neon (janela de 6 h). Restauração testada em banco descartável antes da entrega (resultado esperado: 6 categorias na tabela `categoria`). Os dumps contêm dados de alunos: o `pg_dump` precisa ter a mesma versão principal do Neon; nunca restaure sobre produção sem confirmação explícita. **LGPD:** depois de restaurar um backup, reaplique a anonimização das contas excluídas (`status_conta = 'excluida'`); dumps antigos guardam os dados até a rotação de 7 dias, limitação que consta nos Termos.

## Rollback

Só código: *Instant Rollback* no painel. Código e banco: restaure o banco (ponto no tempo ou dump) e depois reverta o código. Site e API revertem separados: confira a compatibilidade.

## Usando as skills instaladas sem quebrar as regras acima

- `vercel-cli-with-tokens`: útil para `vercel env`, `vercel logs` e deploy pelo CLI. O token vem de `VERCEL_TOKEN` no **ambiente** (nunca em `--token`, nunca commitado). Não faça `vercel deploy --prod` nem `vercel env rm` sem o usuário pedir. Deploy normal é `git push`.
- `neon-postgres` e `neon-postgres-branches`: conexão pooled × direta, branches, restauração. Use para o **banco**; o projeto **não** adota Neon Auth, Functions, Object Storage nem AI Gateway (a autenticação é o JWT do backend e a API roda na Vercel).
- `supabase-postgres-best-practices`: SQL, índices e locks em PostgreSQL puro; vale para o Neon.
- Não há skill de deploy-to-vercel instalada de propósito: o fallback dela envia o projeto a um endpoint sem login.

## Verificação (seção 14)

Do computador do usuário (Git Bash ou WSL; no Windows os comandos do guia são bash): HTTP redireciona para HTTPS; `/api/v1/health` responde `{"status":"ok"}` sem consultar o banco (é a do monitor) e `/api/v1/health/db` responde 200 com o banco no ar; HSTS presente; F5 em `/categorias` não dá 404; origem estranha sem `Access-Control-*`; endpoint de job sem segredo = 401; imagem de 3,9 MB sobe e uma acima de 4 MB é recusada com a mensagem do Unishop; Pix de teste gera o webhook e baixa o estoque (em produção ou local, **não em preview**); e-mail de recuperação chega a um `@edu.unifor.br` qualquer (depende de domínio próprio); workflow de backup roda.

## Pendências que bloqueiam ou mudam o deploy

Numeração da seção 17.3 do deploy v0.3. Abertas: plano/equipe do Hobby (1) · **domínio próprio para o Resend** (3) · RNF012 a RNF016 não mapeados (6) · login com Google em `vercel.app` (7) · prova de conceito do Pix de teste do Mercado Pago e Payments × Orders API (10) · nome da tabela de categorias no teste de restauração, que é `categoria` (11) · criar os três papéis no Neon gratuito (12). Decididas: exceção da regra 4 (2), cron-job.org a cada 30 min (4), 4 MB (5), rate limit em memória (8). Cite a pendência em vez de decidir sozinho.
