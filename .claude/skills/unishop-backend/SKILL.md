---
name: unishop-backend
description: Regras e arquitetura do backend do Unishop (Node.js + Express + TypeScript, Prisma, PostgreSQL, JWT). Use SEMPRE que o usuário criar, editar ou revisar rotas, controllers, services, repositories, middlewares, providers, jobs, autenticação (e-mail e senha, Google, troca de senha), pagamentos (cartão, Pix, webhook, estorno), estoque, pedidos, anúncios, imagens, área admin, logs de auditoria ou erros da API do Unishop, mesmo que não diga "backend" ou "Unishop" explicitamente.
metadata:
  author: unishop-team
  version: "0.3.0"
---

# Backend do Unishop

Resumo operacional da API REST do Unishop (`/api/v1`). Fonte completa e autoritativa: [`docs/backend/backend.md`](../../../docs/backend/backend.md) (v0.3, de 16/10/2026, baseada nas Regras de Negócio v0.4 e no Banco de Dados v0.2). Em dúvida, releia a seção relevante do doc; este arquivo não o substitui. A seção 9 do doc lista todas as rotas e a seção 20 mapeia cada `RN-XXX-nn` ao arquivo onde ela deve morar.

Outras fontes: regras e limites de campos → skill `unishop-rules` ([`docs/regras-de-negócio/regras-de-negócio.md`](../../../docs/regras-de-negócio/regras-de-negócio.md)); tabelas, colunas e `@map` do Prisma → skill `unishop-database` ([`docs/BancoDeDados/bd.md`](../../../docs/BancoDeDados/bd.md)); providers, segredos e webhook → `unishop-api`; Vercel + Neon → `unishop-deploy`.

Prioridade entre fontes (CLAUDE.md): PDF do trabalho > decisões do grupo > docs em `docs/` > Figma. Se algo não está documentado, diga que não está definido; não invente rota, campo ou regra. Pendências abertas que tocam o backend: Payments API × Orders API do Mercado Pago (ADR-002), `email_verified` do Google com e-mail institucional, `openapi.yaml` inexistente.

## Arquitetura

API em camadas, sem estado no servidor (sessão = JWT). Em produção é uma **função serverless na Vercel** (`src/app.ts` exporta o app, sem `listen`); em desenvolvimento roda em `src/dev-server.ts`, com os jobs por `node-cron`. Em produção os jobs são endpoints `GET /api/v1/internal/jobs/:name` protegidos por `CRON_SECRET`.

```
Route → Controller → Service → Repository → PostgreSQL
                       └→ Provider → Google · Gateway de pagamento · E-mail · Storage
```

| Camada | Faz | Não faz |
|---|---|---|
| Route | URL, método, encadeia middlewares | lógica |
| Controller | lê req já validada, chama o service, monta res | banco, regra de negócio |
| Service | regras, conferência de dono, transações | conhecer `req`/`res` |
| Repository | único acesso ao banco | regra de negócio |
| Provider | serviço externo atrás de interface (timeout 10 s) | conhecer o domínio |

Dependências: um módulo usa outro **pelo service**, nunca pelo repository. `admin/` pode usar services de `modules/`; o inverso nunca. Serviço externo só via `shared/providers/`. Operação em mais de uma tabela roda em **transação** aberta pelo service.

Estrutura: `src/modules/` (aluno: auth, users, categories, listings, orders, payments, notifications), `src/admin/` (users, listings, audit-logs; `authenticate` + `authorizeRole("admin")` aplicados **uma vez** em `admin.routes.ts`), `src/shared/` (middlewares, providers, security, errors, utils, types), `src/jobs/`, `prisma/` (schema, migrations, seed), `tests/`. Molde de módulo: `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.rules.ts`, `*.repository.ts`, `*.schemas.ts` (Zod), `*.types.ts`, `index.ts`.

## Regras que nunca podem ser violadas

- **Segurança e dinheiro são decididos aqui.** Todo valor, taxa, desconto de estoque e confirmação de pagamento nasce no backend; o frontend só exibe. Papel (`aluno`/`admin`) vem do banco, nunca do corpo da requisição.
- **Perfis:** admin **não compra, não paga e não anuncia** (403 `FORBIDDEN`). Aluno só mexe no que é seu (conferência de dono no service; recurso alheio = 403). Anúncio inexistente/oculto para quem pede = 404. O admin não suspende nem exclui a própria conta, e o último admin ativo não sai (RN-ADM-12, `ADMIN_PROTECTED`).
- **E-mail só `@edu.unifor.br`** no cadastro, login e troca (validado no servidor, inclusive no Google, que também confere o e-mail verificado). Única exceção: conta admin criada **só por seed**; `register` nunca cria admin.
- **Senha:** bcrypt (custo 12), 8 a 72 caracteres, 1 número, 1 maiúscula. Erro de login genérico (`INVALID_CREDENTIALS`). 5 erros = bloqueio de 15 min (`ACCOUNT_LOCKED`, 429). Conta suspensa = 403 `ACCOUNT_SUSPENDED`. Troca logado: `POST /users/me/password` (senha atual; devolve token novo; `CURRENT_PASSWORD_INVALID`).
- **Login com Google (MVP, RN-ACE-14):** conta nasce ativa, **sem senha** e verificada; o primeiro acesso passa por `POST /users/me/complete-profile` (aceite dos Termos; sem aceite, `TERMS_NOT_ACCEPTED`).
- **JWT HS256 de 2 h** em `Authorization: Bearer`, sem refresh token (RN-ACE-11). `authenticate` consulta a conta a cada requisição: suspensão e troca de senha (`senha_alterada_em`) valem na hora.
- **Cartão:** só o token do gateway chega ao servidor; nunca dado de cartão.
- **Estoque nunca é reservado.** Desconto atômico: `UPDATE ... SET quantidade = quantidade - :n WHERE id = :id AND quantidade >= :n` (0 linhas = sem estoque) + `CHECK` no banco. Desconta só na liquidação do pagamento ou quando o vendedor conclui a venda por WhatsApp (se o estoque não bastar, 409 e o pedido segue Em negociação). Quantidade 0 → anúncio `Vendido`.
- **Liquidação única** (`settlePayment`), em transação, idempotente (webhook repetido não duplica; trava o pedido com `FOR UPDATE`): só conclui se o anúncio estiver **ativo**, o vendedor com conta ativa e houver estoque → pedido `Pago`; senão `Cancelado` + estorno (RN-PAG-08, 14). Pagamento aprovado com pedido já cancelado também é estornado, com e-mail ao comprador (RN-PAG-13, RN-NOT-03). É a única rotina que muda o pedido para `Pago`.
- **Webhook** `/payments/webhook`: sem JWT, validado por **assinatura**; consulta o pagamento no gateway antes de confiar no aviso; responde 200 rápido. Na Vercel, o **estorno usa `await` antes de responder** e o e-mail/notificação usam `waitUntil` (`@vercel/functions`). Assinatura HMAC e janela de 5 min: `unishop-api`.
- **Pedido:** congela vendedor, produto, imagem, quantidade, preço unitário e taxa; id próprio; aluno não pede o próprio anúncio (`OWN_LISTING`). **Um pedido aberto por comprador, anúncio e forma:** novo clique reaproveita (RN-PED-10). Comprador cancela Pendente e Em negociação; vendedor encerra a negociação; Pago e Retirada combinada não se cancelam pelo sistema no MVP (RN-PED-12). Pago: vendedor marca `Retirada combinada`, **comprador** confirma o recebimento.
- **Pendente há mais de 30 min sem pagamento aprovado = Cancelado** (Pix vencido ou cartão abandonado), no job e também **sob demanda** ao ler ou pagar o pedido. Pix expirado não gera novo código: cancela, e o aluno faz outro pedido (RN-PAG-04, 12). Cada nova tentativa de pagamento cria uma linha de `pagamento`; só uma pode estar em andamento.
- **Taxa de serviço R$ 0,00**; repasse simulado em conta única de teste; produção usa credenciais de teste do Mercado Pago (RN-PAG-10). Dinheiro em **centavos** (inteiros) no código.
- **Visibilidade de anúncio em um único filtro** no repository (ativo + conta ativa + não excluído; no banco, a view `anuncio_visivel`) para listagens, busca, carrossel e contagem de categorias. WhatsApp só em rotas autenticadas; `/listings/recent` (carrossel) é a única rota de catálogo pública.
- **Exclusão é lógica ou por anonimização**, nunca `DELETE` físico: anúncio recebe `excluido_em`; perfil e usuário viram "Usuário removido". Ambas ficam **bloqueadas** com pedido Pago ou em Retirada combinada em aberto (409 `HAS_OPEN_PAID_ORDERS`); Pendentes e Em negociação são cancelados. Admin trocar o vendedor de anúncio com pedido aberto = 409 `HAS_OPEN_ORDERS`. Só o admin reverte `Vendido`, e a ação vai para o log.
- **Auditoria:** toda edição/suspensão/exclusão do admin grava `log_admin` na **mesma transação** da ação (sem log, sem ação).
- **Upload:** JPG/PNG, tipo conferido pelo conteúdo real (file-type); de 1 a 5 imagens por anúncio; **uma imagem por requisição, até 4 MB** (limite de 4,5 MB da Vercel; desvio do PDF confirmado pelo grupo em 16/10/2026). A primeira vai em `POST /listings`; as demais em `POST /listings/:id/images`; remoção em `DELETE /listings/:id/images/:imageId` (o anúncio mantém pelo menos 1). Se o banco falhar após o upload, remover do storage.
- **Nunca em log:** senha, JWT, token de cartão, corpo de `/auth` e `/payments`, WhatsApp completo.

## Convenções

- Código em inglês; banco em português, com `@map`/`@@map` do Prisma (ver `unishop-database`); mensagens ao usuário em português; códigos de erro em inglês (`OUT_OF_STOCK`).
- Arquivos kebab-case com a camada no nome; TypeScript estrito; sem `any` sem justificativa.
- Rotas no plural; ação fora do CRUD vira sub-rota (`POST /listings/:id/pause`). JSON camelCase; datas ISO 8601 UTC.
- Sucesso: `{ data }` ou `{ data, meta: { page, limit, total, totalPages } }`. Erro: `{ error: { code, message, details, requestId } }`; Zod → 400 `VALIDATION_ERROR`; nunca stack trace ao cliente. `limit` padrão 20, máximo 50.
- Service recebe repositories e providers por parâmetro (injeção simples) para testar com mock.
- **Cite o código da regra** (`RN-EST-04`) em comentário no ponto do código e no nome do teste que a cobre.
- Um valor por estado no banco; textos por lado (comprador/vendedor) ficam na interface. Transições validadas em `*.rules.ts` (`assertCanTransition`).
- Segredos só via `config/env.ts` (validado ao iniciar; `Secret` não imprime); `.env` nunca vai para o Git. `EMAIL_VERIFICATION_REQUIRED` (padrão `false`) liga a confirmação de e-mail por link (RN-ACE-07).
- Rotas técnicas: `GET /health` (leve, sem banco; é a do monitor) e `GET /health/db` (`SELECT 1`).
- Commits `feat:`, `fix:`, `docs:`; PR só com lint e testes verdes e revisão de outro membro.

## Estados (valores gravados no banco, em português)

- Anúncio (`anuncio.status`): `ativo` ⇄ `pausado`; → `vendido` (estoque zerou ou dono marcou); "Excluído" = `excluido_em` preenchido.
- Pedido (`pedido.status_pedido`): site `pendente` → `pago` → `retirada_combinada` → `concluido`; `pendente` → `cancelado`; WhatsApp `em_negociacao` → `concluido`/`cancelado`. Cancelado nunca volta a pendente.
- Pagamento (`pagamento.status_pagamento`): `pendente` → `aprovado`; `recusado` (nova tentativa, nova linha); `expirado`; `estorno_pendente` → `estornado` (job refaz até 10 vezes).
- Conta (`usuario.status_conta`): `ativa`, `suspensa` (só admin reverte), `excluida` (anonimizada). O bloqueio de 15 min usa `bloqueado_ate`.

## Jobs (produção: endpoints; desenvolvimento: node-cron)

`expire-pix-payments` e `reconcile-pending-payments` a cada **30 minutos** (cron-job.org); `cleanup-expired-tokens` diário (Vercel Cron). Todos idempotentes. Autenticação só pelo `Bearer <CRON_SECRET>` com `timingSafeEqual`; teste obrigatório de `Bearer undefined` e `Bearer [REDACTED]` = 401.

## Pronto quando (por rota)

1. Descrita no `openapi.yaml`. 2. Zod na entrada e erros com os códigos do doc. 3. `authorizeRole` + conferência de dono, com teste. 4. Regra no service, consulta no repository, citando `RN-XXX-nn`. 5. Testes unitários e de integração verdes (Vitest + Supertest; cobertura mínima proposta de 80% em auth, payments, listings, orders). 6. Nada sensível em log. 7. Conferida com o frontend.

Casos de teste obrigatórios: duas compras simultâneas da última unidade (só uma conclui); webhook duplicado e sem assinatura; Pix expirado cancela o pedido; estoque acabou antes da confirmação cancela e estorna; pagamento tardio em pedido cancelado é estornado; liquidação com anúncio pausado cancela e estorna; 5ª senha errada bloqueia; token anterior à troca de senha = 401; aluno em rota admin = 403; admin não faz pedido nem anuncia; exclusão bloqueada com pedido pago em aberto; visitante no catálogo = 401.

## Skills que complementam esta

- Regras de negócio, limites de campos, escopo do MVP e desvios do PDF → `unishop-rules`.
- Tabelas, constraints, anonimização, migração Prisma e papéis do banco → `unishop-database`.
- Integração com Google, Mercado Pago, Resend, Cloudinary, Turnstile, segredos, variáveis, travas de produção, webhook → `unishop-api`.
- Hospedagem, `app.ts`/`dev-server.ts`, jobs por endpoint, `waitUntil`, migração e backup em produção → `unishop-deploy`.
- Schema, índice, transação, lock ou query lenta no PostgreSQL → `supabase-postgres-best-practices` (sem adotar nada específico do Supabase; o banco é o PostgreSQL do Neon). Branches e conexões do Neon → `neon-postgres` e `neon-postgres-branches`.
- Revisão final de código com `code-review` / `security-review` antes do PR.
- Para criar ou melhorar skills do projeto → `skill-creator`.
