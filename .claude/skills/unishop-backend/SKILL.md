---
name: unishop-backend
description: Regras e arquitetura do backend do Unishop (Node.js + Express + TypeScript, PostgreSQL, JWT). Use SEMPRE que o usuário criar, editar ou revisar rotas, controllers, services, repositories, middlewares, providers, jobs, autenticação, pagamentos (cartão, Pix, webhook), estoque, pedidos, anúncios, área admin, logs de auditoria ou erros da API do Unishop, mesmo que não diga "backend" ou "Unishop" explicitamente.
metadata:
  author: unishop-team
  version: "0.1.0"
---

# Backend do Unishop

Resumo operacional da API REST do Unishop (`/api/v1`). Fonte completa e autoritativa: [`docs/backend/backend.md`](../../../docs/backend/backend.md) (v0.2, baseada nas Regras de Negócio v0.3). Em dúvida, releia a seção relevante do doc; este arquivo não o substitui. Regras de negócio: [`docs/regras-de-negócio/regras-de-negócio.md`](../../../docs/regras-de-negócio/regras-de-negócio.md). Seção 20 do doc de backend mapeia cada `RN-XXX-nn` ao arquivo onde ela deve morar.

Prioridade entre fontes (CLAUDE.md): PDF do trabalho > decisões do grupo > docs em `docs/` > Figma. O gateway de pagamento (Mercado Pago) é decisão do grupo. Itens "sugestão" (Prisma, Resend, Cloudinary, Vite etc.) não são decisões; ao usá-los, diga que são propostas. Se algo não está documentado, diga que não está definido; não invente rota, campo ou regra.

## Arquitetura

API em camadas, sem estado no servidor (sessão = JWT), um único processo Node.js que também roda os jobs (node-cron).

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

Estrutura: `src/modules/` (aluno: auth, users, categories, listings, orders, payments, notifications), `src/admin/` (users, listings, audit-logs; `authenticate` + `authorizeRole("admin")` aplicados **uma vez** em `admin.routes.ts`), `src/shared/` (middlewares, providers, errors, utils, types), `src/jobs/`, `prisma/`, `tests/`. Molde de módulo: `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.rules.ts`, `*.repository.ts`, `*.schemas.ts` (Zod), `*.types.ts`, `index.ts`.

## Regras que nunca podem ser violadas

- **Segurança e dinheiro são decididos aqui.** Todo valor, taxa, desconto de estoque e confirmação de pagamento nasce no backend; o frontend só exibe. Papel (`student`/`admin`) vem do banco, nunca do corpo da requisição.
- **Perfis:** admin **não compra, não paga e não anuncia** (`authorizeRole("student")` nessas rotas, 403 `FORBIDDEN`). Aluno só mexe no que é seu (conferência de dono no service; recurso alheio = 403). Anúncio inexistente/oculto para quem pede = 404.
- **E-mail só `@edu.unifor.br`** no cadastro, login e troca (validado no servidor, inclusive no Google). Única exceção: conta admin criada **só por seed**; `register` nunca cria admin.
- **Senha:** bcrypt (custo 12), 8+ caracteres, 1 número, 1 maiúscula. Erro de login genérico (`INVALID_CREDENTIALS`). 5 erros = bloqueio de 15 min (`ACCOUNT_LOCKED`, 429). Conta suspensa = 403 `ACCOUNT_SUSPENDED`.
- **JWT** em `Authorization: Bearer`, com validade (proposta: 2 h, sem refresh). `authenticate` consulta a conta a cada requisição (suspensão e troca de senha valem na hora).
- **Cartão:** só o token do gateway chega ao servidor; nunca dado de cartão.
- **Estoque nunca é reservado.** Desconto atômico: `UPDATE listing SET quantity = quantity - :n WHERE id = :id AND quantity >= :n` (0 linhas = sem estoque) + `CHECK (quantity >= 0)`. Desconta só na liquidação do pagamento ou quando o vendedor conclui a venda por WhatsApp. Quantidade 0 → anúncio `Vendido`.
- **Liquidação única** (`settlePayment`), em transação, idempotente (webhook repetido não duplica): se havia estoque → pedido `Pago`; se não → pedido `Cancelado` + `refundPayment`. É a única rotina que muda o pedido para `Pago`.
- **Webhook** `/payments/webhook`: sem JWT, validado por **assinatura**; consulta o pagamento no gateway antes de confiar no aviso; responde 200 rápido (e-mail e estorno rodam depois da transação).
- **Pedido** congela preço unitário e total; id próprio; aluno não pede o próprio anúncio (`OWN_LISTING`). Pago: vendedor marca `Retirada combinada`, **comprador** confirma o recebimento. WhatsApp (`Em negociação`): vendedor conclui (desconta estoque) ou cancela.
- **Taxa de serviço R$ 0,00** (`SERVICE_FEE_PERCENT=0`); repasse simulado em conta única de teste. Dinheiro em **centavos** (inteiros).
- **Visibilidade de anúncio em um único filtro** no repository (ativo + conta ativa + não excluído) para listagens, busca, carrossel e contagem de categorias. WhatsApp só em rotas autenticadas; `/listings/recent` (carrossel) é a única rota de catálogo pública.
- **Exclusão de perfil = anonimização** ("Usuário removido"); pedidos pagos permanecem. Só o admin reverte `Vendido`, e a ação vai para o log.
- **Auditoria:** toda edição/suspensão/exclusão do admin grava log na **mesma transação** da ação (sem log, sem ação).
- **Upload:** JPG/PNG até 5 MB, tipo conferido pelo conteúdo real (file-type), pelo menos 1 imagem por anúncio; se o banco falhar após o upload, remover do storage.
- **Nunca em log:** senha, JWT, token de cartão, corpo de `/auth` e `/payments`, WhatsApp completo.

## Convenções

- Código em inglês; mensagens ao usuário em português; códigos de erro em inglês (`OUT_OF_STOCK`).
- Arquivos kebab-case com a camada no nome; TypeScript estrito; sem `any` sem justificativa.
- Rotas no plural; ação fora do CRUD vira sub-rota (`POST /listings/:id/pause`). JSON camelCase; datas ISO 8601 UTC.
- Sucesso: `{ data }` ou `{ data, meta: { page, limit, total, totalPages } }`. Erro: `{ error: { code, message, details, requestId } }`; Zod → 400 `VALIDATION_ERROR`; nunca stack trace ao cliente. `limit` padrão 20, máximo 50.
- Service recebe repositories e providers por parâmetro (injeção simples) para testar com mock.
- **Cite o código da regra** (`RN-EST-04`) em comentário no ponto do código e no nome do teste que a cobre.
- Um valor por estado no banco; textos por lado (comprador/vendedor) ficam na interface. Transições validadas em `*.rules.ts` (`assertCanTransition`).
- Segredos só via `config/env.ts` (validado ao iniciar); `.env` nunca vai para o Git.
- Commits `feat:`, `fix:`, `docs:`; PR só com lint e testes verdes e revisão de outro membro.

## Estados

- Anúncio: `Ativo` ⇄ `Pausado`; → `Vendido` (estoque zerou ou dono marcou); → `Excluído` (definitivo).
- Pedido: `pending` → `paid` → `pickup_arranged` → `completed`; `pending` → `canceled`; `negotiating` → `completed`/`canceled`.
- Pagamento: `Pendente` → `Aprovado` → `Estornado`; `Pendente` → `Recusado` (nova tentativa) ou `Expirado` (Pix > 30 min).
- Conta: `Ativa`, `Bloqueada` (15 min, passa sozinha), `Suspensa` (só admin reverte), `Excluída` (anonimizada).

## Pronto quando (por rota)

1. Descrita no `openapi.yaml`. 2. Zod na entrada e erros com os códigos do doc. 3. `authorizeRole` + conferência de dono, com teste. 4. Regra no service, consulta no repository, citando `RN-XXX-nn`. 5. Testes unitários e de integração verdes (Vitest + Supertest; cobertura mínima proposta de 80% em auth, payments, listings, orders). 6. Nada sensível em log. 7. Conferida com o frontend.

Casos de teste obrigatórios: duas compras simultâneas da última unidade (só uma conclui); webhook duplicado e sem assinatura; Pix expirado cancela o pedido; estoque acabou antes da confirmação cancela e estorna; 5ª senha errada bloqueia; aluno em rota admin = 403; admin não faz pedido nem anuncia; visitante no catálogo = 401.

## Skills que complementam esta

- Schema, migração, índice, transação, lock ou query lenta no PostgreSQL → `supabase-postgres-best-practices` (use-a junto, sem adotar nada específico do Supabase; o banco é PostgreSQL puro).
- Revisão final de código com `code-review` / `security-review` antes do PR.
- Para criar ou melhorar skills do projeto → `skill-creator`.
