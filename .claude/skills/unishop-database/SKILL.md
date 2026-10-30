---
name: unishop-database
description: Banco de dados do Unishop (PostgreSQL no Supabase, usado só como banco; Prisma): as 8 tabelas em português (usuario, categoria, anuncio, imagem_anuncio, pedido, pagamento, log_admin, token_usuario), colunas, constraints, valores de estado, mapeamento banco × backend com `@map`, migração `0_init` mais migração manual, seed, view `anuncio_visivel`, papéis do banco, consultas críticas, estoque atômico, liquidação de pagamento, anonimização (LGPD) e backup. Use SEMPRE que o usuário falar de schema, `schema.prisma`, migração, tabela, coluna, índice, CHECK, seed, consulta SQL, repository, estoque, exclusão ou anonimização de dados, papéis `unishop_*` ou DER/MER do Unishop, mesmo que não diga "banco de dados" ou "Unishop".
metadata:
  author: unishop-team
  version: "0.2.0"
---

# Banco de dados do Unishop

Resumo operacional. Fonte completa e autoritativa: [`docs/BancoDeDados/bd.md`](../../../docs/BancoDeDados/bd.md) (v0.2, de 16/10/2026; responsável: Ana Clara). Em dúvida, releia a seção citada; este arquivo não a substitui. O documento descreve o **estado final** do banco (não o dump de 07/10/2026 mais ajustes). Regras de negócio: `unishop-rules`. Código que usa o banco: `unishop-backend`. Conexões (pooler × direta), backup e restauração no Supabase: `unishop-deploy`. Boas práticas gerais de SQL, índices e locks: `supabase-postgres-best-practices` (PostgreSQL puro; o Supabase é só o hospedeiro do banco: **não** use Auth, Storage, Realtime nem a API automática dele; a RLS fica ligada sem políticas, decisão de Francisco, ver pendência no CLAUDE.md).

Se algo não está no `bd.md`, diga que não está definido; não invente tabela, coluna ou valor. Divergência entre o MER (`.drawio`) e o banco: o banco vale, e o MER é que será corrigido (seção 12 do doc).

## Convenções

- Tabelas e colunas em **português**, minúsculas, `snake_case`, no singular; PK `id_<tabela>`; FK com o nome da PK referenciada (exceções com papel: `id_comprador`, `id_vendedor`, `id_admin`).
- PK `integer GENERATED ALWAYS AS IDENTITY` (inserir id manual exige `OVERRIDING SYSTEM VALUE`). Dinheiro `numeric(10,2)`, nunca `float`; o backend calcula em centavos e converte ao gravar. Datas `timestamptz`, em UTC.
- Constraints com nome padrão: `fk_<filha>_<pai>`, `<tabela>_pkey`, `ck_<tabela>_<regra>`, `uq_<tabela>_<regra>`, `ix_<tabela>_<uso>`.
- Valores de estado são `varchar` com `CHECK`, **em português** (`pago`, `em_negociacao`); o enum do Prisma usa `@map` para os mesmos valores. Um valor por estado; textos por lado (comprador/vendedor) ficam na interface.
- Nenhuma FK declara `ON DELETE` (= `NO ACTION`): nada se apaga em cascata. **Sem `DELETE` físico no uso normal**: anúncio tem exclusão lógica (`excluido_em`) e usuário é anonimizado.

## As 8 tabelas

| Tabela | Backend (Prisma) | Pontos que importam |
|---|---|---|
| `usuario` | `user` | E-mail único em `lower(email)` (`uq_usuario_email_lower`); `senha_hash` anulável + `google_sub` único (conta Google); `tipo_usuario` (`aluno`/`admin`); `status_conta` (`ativa`/`suspensa`/`excluida`); `verificacao`, `data_aceite_termos`, `tentativas_login`, `bloqueado_ate`, `senha_alterada_em`, `ultimo_acesso`; `ck_usuario_credencial` |
| `categoria` | `category` | 6 linhas fixas do seed; `nome` único |
| `anuncio` | `listing` | `preco` 0,01 a 99.999,99; `quantidade` 0 a 999 (`ck_anuncio_qtd`); `status` `ativo`/`pausado`/`vendido`; `whatsapp` no anúncio; `excluido_em`, `vendido_em`; contadores `visualizacoes` e `contatos`; `ck_anuncio_ativo_com_estoque` |
| `imagem_anuncio` | `listingImage` | `url_imagem`, `public_id` (Cloudinary), `ordem` 1 a 5 única por anúncio; o mínimo de 1 imagem é do **backend** |
| `pedido` | `order` | `id_pedido` próprio; `id_comprador` e `id_vendedor`; congela `nome_produto`, `imagem_url`, `quantidade`, `preco_unitario`, `taxa_servico`; `valor_total = preco × qtd + taxa`; `forma_negociacao` (`pagamento_site`/`whatsapp`); `uq_pedido_aberto` (um pedido aberto por comprador, anúncio e forma); `atualizado_em` para os jobs |
| `pagamento` | `payment` | Várias linhas por pedido (uma por tentativa), `uq_pagamento_ativo` permite só uma `pendente`/`aprovado`; `id_transacao_gateway` (único parcial); `chave_idempotencia` única (inclui a tentativa); `data_expiracao`; `tentativas_estorno`, `ultimo_erro`. **Nunca dado de cartão** |
| `log_admin` | `auditLog` | `acao`, `entidade` (`usuario`/`anuncio`), `id_entidade` **sem FK de propósito**, `detalhes jsonb`; só inserção, na mesma transação da ação do admin |
| `token_usuario` | `userToken` | Só `token_hash` (o valor em claro vai por e-mail); `tipo` (`confirmacao_email`/`redefinicao_senha`/`troca_email`), `expira_em`, `usado_em`, `novo_email` |

Outros mapeamentos: `anuncio.quantidade` → `listing.quantity`, `anuncio.preco` → `listing.price`, `anuncio.excluido_em` → `listing.deletedAt`, `usuario.ultimo_acesso` → `user.lastSeen`, `usuario.tipo_usuario` → `user.role` (`aluno` → `student`), `pedido.valor_total` → `order.totalAmount`, `pedido.preco_unitario` → `order.unitPrice`.

## Valores de estado

- `pedido.status_pedido`: `pendente`, `pago`, `retirada_combinada`, `concluido`, `em_negociacao` (padrão do banco, só do WhatsApp; no site o backend informa `pendente`), `cancelado`.
- `pagamento.status_pagamento`: `pendente`, `aprovado`, `recusado`, `expirado`, `estorno_pendente`, `estornado`; `forma_pagamento`: `pix`, `cartao`.
- "Bloqueada por 15 min" e "e-mail não confirmado" **não são** valores de `status_conta`: usam `bloqueado_ate` e `verificacao`. "Excluído" do anúncio não é status: é `excluido_em`.

## Operações críticas (seção 9 do doc)

- **Visibilidade única (RN-ANU-05):** toda listagem pública usa o mesmo filtro: `status = 'ativo'`, `excluido_em IS NULL` e dono com `status_conta = 'ativa'`. A view `anuncio_visivel` guarda isso; o Prisma não lê view sem o recurso `views`, então use `$queryRaw` ou repita o filtro em **uma** função do repository.
- **Estoque atômico (RN-EST-04):** `UPDATE anuncio SET quantidade = quantidade - :n WHERE id_anuncio = :id AND quantidade >= :n`; 0 linhas = sem estoque. Zerou? Na mesma transação, `status = 'vendido'`, `vendido_em = now()`.
- **Liquidação (RN-PAG-14):** transação única: `SELECT ... FOR UPDATE` no pedido; se já `pago`, não faz nada (idempotência); confere `anuncio_visivel` e estoque; se honra, pedido `pago` e pagamento `aprovado`; se não, pedido `cancelado` e pagamento `estorno_pendente`. E-mail e chamada ao gateway ficam **fora** da transação.
- **Jobs:** pedidos `pendente` há mais de 30 min sem pagamento aprovado; Pix vencido (`data_expiracao < now()` com `pendente`); estornos (`estorno_pendente` com `tentativas_estorno < 10`).
- **Indicadores do admin:** só `tipo_usuario = 'aluno'`; "logado agora" = `ultimo_acesso` nos últimos 5 min e conta `ativa`; cadastrados e novos na semana excluem `excluida`.

## Anonimização (RN-PER-06, RN-ADM-06)

A linha de `usuario` **não é apagada**: `nome = 'Usuário removido'`, `email = 'removido_<id>@removido.invalid'`, `senha_hash`, `google_sub`, `whatsapp`, `curso`, `foto_perfil` = `NULL`, `status_conta = 'excluida'`; anúncios do usuário recebem `excluido_em`; pedidos `pendente` e `em_negociacao` são cancelados; tokens pendentes são apagados. **Bloqueada** com pedido `pago` ou `retirada_combinada` em aberto (409 `HAS_OPEN_PAID_ORDERS`). Backup ou ponto de restauração anterior guarda os dados antigos até vencer (Supabase gratuito: sem ponto no tempo; dumps: 7 dias): ao restaurar, **reaplique** a anonimização.

## Migração, seed e papéis

- **Caminho único: Prisma.** `0_init` gerado do `schema.prisma` (`prisma migrate diff --from-empty --to-schema-datamodel ... --script`; em versões novas a opção é `--to-schema`) + uma **segunda migração escrita à mão** (`prisma migrate dev --create-only`) com o SQL da seção 14: `CHECK`, índices parciais, índice sobre `lower(email)`, view e permissões. O dump de 07/10/2026 **não** é restaurado no Supabase. Mudança futura: altere o `schema.prisma`, gere a migração, revise o SQL e, se envolver `CHECK` ou índice parcial, acrescente à migração manual. Em produção, só `migrate deploy`; migrações **aditivas**.
- **Seed** (`npm run db:seed`, idempotente): 6 categorias com `ON CONFLICT (nome) DO NOTHING` e a conta admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD` só na sessão do terminal, nunca em painel; senha entra como hash; exceção do domínio `@edu.unifor.br`; senha a trocar no primeiro acesso, RN-ACE-15). As seis: Livros e apostilas, Eletrônicos, Alimentos, Materiais de curso, Vestuário, Outros.
- **Três papéis:** `unishop_migrator` (dono do schema; `DATABASE_URL_UNPOOLED`, Session pooler ou direta, porta 5432), `unishop_app` (`SELECT/INSERT/UPDATE/DELETE`, **sem DDL**; `DATABASE_URL`, Transaction pooler, porta 6543, `?pgbouncer=true`) e `unishop_backup` (`SELECT`; `DATABASE_URL_BACKUP`, Session pooler). Pelo pooler o usuário é `papel.ref-do-projeto`. Criados pelo SQL Editor. TLS obrigatório (`sslmode=require`). Dado real de produção nunca vai para desenvolvimento nem preview: dois projetos, `unishop-prod` e `unishop-dev` (o plano gratuito não tem branches). **Revogue todo acesso de `anon` e `authenticated` às tabelas** (o Supabase dá esse acesso por padrão; bloco SQL em "Papéis e permissões" do doc). Testar o login de cada papel pelo pooler ainda está pendente (pendência 1 do doc).
- **Supabase gratuito (conferido em 30/10/2026):** 500 MB por projeto (imagens ficam na Cloudinary), 2 projetos ativos, sem branching, sem backup automático nem ponto no tempo, pausa após 1 semana sem atividade, conexão direta só IPv6 (sem IPv6, Session pooler). Versão do PostgreSQL a conferir (os docs assumem 18).
- **Teste de integridade (deve falhar):** preço negativo, `quantidade = -1`, `status_pedido` inválido, e-mails que só diferem em maiúsculas, duas cobranças `pendente` no mesmo pedido. Rode a seção 14 em banco vazio antes de o backend implementar pedidos (pendência 5).

## Regras que o banco não garante (ficam no backend)

Admin não compra, dono não compra o próprio anúncio, mínimo de 1 imagem, admin não remove o último admin e a checagem do domínio `@edu.unifor.br`. Busca por texto: `ILIKE` no MVP; `pg_trgm` só se ficar lenta.

## Skills que complementam esta

- Regras que o banco apoia, limites de campos → `unishop-rules`. Repository, service e rotas → `unishop-backend`.
- Supabase: conexões pooler × direta, ambientes por projeto, backup e produção → `unishop-deploy`; boas práticas de SQL → `supabase-postgres-best-practices`.
- SQL, índices, locks e planos de execução → `supabase-postgres-best-practices`.
