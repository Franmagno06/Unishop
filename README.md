# Unishop

Sistema Web de e-commerce voltado para os alunos da Universidade de Fortaleza (Unifor), para a compra e venda de materiais e artigos de interesse dos alunos (livros, eletrônicos, alimentos, materiais de curso, vestuário, entre outros) dentro do campus. A retirada é sempre presencial, combinada entre comprador e vendedor via WhatsApp.

Trabalho da disciplina **Desenvolvimento de Plataformas Web** — Curso de Ciência da Computação, Turma T242-12, 4º Semestre, Unifor.

## Sumário

1. [Equipe](#equipe)
2. [Objetivo e público-alvo](#objetivo-e-público-alvo)
3. [Atores e funcionalidades](#atores-e-funcionalidades)
4. [Fluxo geral do site](#fluxo-geral-do-site)
5. [Regras centrais do sistema](#regras-centrais-do-sistema)
6. [Arquitetura](#arquitetura)
7. [Stack e ferramentas](#stack-e-ferramentas)
8. [Estrutura do repositório](#estrutura-do-repositório)
9. [Backend em resumo](#backend-em-resumo)
10. [Frontend em resumo](#frontend-em-resumo)
11. [Requisitos](#requisitos)
12. [Modelagem e prototipação](#modelagem-e-prototipação)
13. [Documentação](#documentação)
14. [Decisões do grupo e pendências](#decisões-do-grupo-e-pendências)
15. [Organização do projeto](#organização-do-projeto)

## Equipe

| Aluno | Matrícula | Responsabilidade |
|---|---|---|
| Francisco Magno | 2510401 | Gestor/Gerente de Projeto + Integração front-back |
| Ana Clara Macêdo | 2510383 | DER e MER + Banco de Dados |
| Pedro Cândido | 2510367 | Diagrama de Caso de Uso + Frontend + Engenheiro de API |
| Felipe Bessa | 2510472 | Wireframes (Figma) + Backend |

*Obs.: a divisão acima se aplica à fase inicial de desenvolvimento e ao restante do projeto, mas está sujeita a auxílio mútuo entre os membros além das áreas em que estão delegados.*

## Objetivo e público-alvo

**Objetivo:** colocar em prática os conhecimentos sobre desenvolvimento Web vistos em sala de aula, aplicando-os na resolução de uma dor real entre os alunos da Unifor.

**Público-alvo:** os alunos da Unifor. Atualmente, cerca de apenas 1.400 alunos (≈5% dos 25 mil matriculados) participam de grupos e comunidades informais para compra e venda de materiais, o que evidencia a necessidade de um canal único e mais acessível para divulgação.

## Atores e funcionalidades

O sistema tem três atores: **visitante**, **usuário (aluno logado)** e **administrador**. O catálogo (categorias, listagens e página do produto) só abre para aluno autenticado; o visitante enxerga apenas a tela inicial.

### Visitante
- Tela inicial com apresentação da plataforma, carrossel de anúncios recentes, seção "Como funciona", categorias, FAQ e seção de segurança.
- Cadastro restrito a e-mails institucionais (`@edu.unifor.br`), com aceite dos Termos de uso e confirmação de e-mail por link.
- Login por e-mail e senha ou pelo Google (entra no MVP; no primeiro acesso, tela "completar cadastro" com aceite dos Termos). Apple fica de fora.
- Recuperação de senha por e-mail, com link de validade de 30 minutos e uso único.

### Usuário (aluno)
- Navegação por seis categorias fixas (Livros e apostilas, Eletrônicos, Alimentos, Materiais de curso, Vestuário e Outros), com busca, filtro de preço e ordenação.
- Página de produto com galeria de imagens, dados do vendedor e botão "Fazer pedido", em que escolhe a quantidade (limitada ao estoque).
- Dois caminhos de compra: **pagamento pelo site** (cartão ou Pix, via gateway externo) ou **contato por WhatsApp** (pedido "Em negociação").
- Retirada presencial: no pedido pago, o vendedor marca "retirada combinada" e o comprador confirma o recebimento.
- Perfil com edição de dados, troca de senha, troca de e-mail institucional, exclusão de perfil (a conta é anonimizada) e histórico de pedidos.
- Cancelamento do próprio pedido Pendente ou Em negociação; o vendedor pode encerrar a negociação.
- Publicação e gerenciamento de anúncios: nome, categoria, descrição, preço, quantidade, de 1 a 5 imagens e WhatsApp; editar, pausar, reativar, marcar como vendido ou excluir; indicadores de visualizações, contatos e pedidos.

### Administrador
- Painel restrito com seções de **Usuários** e **Produtos**, acessado pela mesma tela de login do aluno, em rota separada (`/admin/login`).
- Indicadores gerais (usuários cadastrados, logados agora, novos na semana; produtos ativos, pausados e vendidos no mês).
- Visualização, edição, suspensão e exclusão de usuários e produtos, com **log de auditoria** de cada ação.
- O administrador **não compra, não paga e não anuncia**. A conta admin é criada apenas por seed, nunca pelo cadastro público.

## Fluxo geral do site

1. O visitante conhece a plataforma na tela inicial e vai para cadastro ou login (e-mail `@edu.unifor.br` obrigatório).
2. Logado, o aluno acessa **Categorias**, escolhe uma categoria, vê a listagem e abre a página do produto.
3. Em "Fazer pedido", escolhe a quantidade e segue por um de dois caminhos:
   - **Pagamento pelo site:** o pedido nasce "Pendente"; quando o gateway confirma o pagamento, vira "Pago" e o estoque é descontado. Sem pagamento em 30 minutos, o pedido é cancelado.
   - **WhatsApp:** o pedido nasce "Em negociação"; o estoque só é descontado quando o vendedor confirma a venda.
4. O aluno acompanha as compras em **Meus pedidos**.
5. Para vender, usa "+ Anunciar item", publica e gerencia o anúncio e os pedidos recebidos.
6. O administrador entra pelo login em rota separada e gerencia usuários e produtos no painel.

### Estados principais

| Entidade | Estados |
|---|---|
| Anúncio | `Ativo`, `Pausado`, `Vendido`, `Excluído` (definitivo) |
| Pedido | `Pendente`, `Pago`, `Retirada combinada`, `Concluído`, `Em negociação`, `Cancelado` |
| Pagamento | `Pendente`, `Aprovado`, `Recusado`, `Expirado`, `Estorno pendente`, `Estornado` (um pedido pode ter várias tentativas, mas só uma em andamento) |
| Conta | `Ativa`, `Suspensa` (pelo admin), `Excluída` (anonimizada). O bloqueio de 15 minutos após 5 senhas erradas é temporário e não é um estado da conta |

No banco, os estados são gravados em português, minúsculos e sem acento (`pago`, `em_negociacao`, `retirada_combinada`...). O anúncio "Excluído" não é um status: é exclusão lógica.

## Regras centrais do sistema

Resumo das regras que nunca podem ser violadas. O detalhe está em [Regras de Negócio](docs/regras-de-negócio/regras-de-negócio.md).

- **Segurança no backend.** O frontend só valida para responder rápido; papel, dono do recurso, dinheiro e estoque são sempre decididos no servidor.
- **Domínio institucional.** Cadastro, login e troca de e-mail aceitam apenas `@edu.unifor.br` (exceção: a conta admin criada por seed).
- **Pagamento externo.** Dados de cartão nunca passam pelos servidores do Unishop; o navegador gera um token com o SDK do gateway. A confirmação vem por webhook assinado.
- **Sessão JWT** de 2 horas no cabeçalho `Authorization: Bearer`, sem refresh token.
- **Estoque sem reserva.** Pix pendente não reserva a unidade: vale o primeiro pagamento confirmado. O desconto é atômico (`UPDATE ... WHERE quantidade >= n`) e a quantidade nunca fica negativa. Se o estoque acabar antes da confirmação, ou o anúncio deixar de estar ativo, ou o pagamento chegar com o pedido já cancelado, o pedido é cancelado e o valor, estornado.
- **Pedido via WhatsApp não desconta estoque** até o vendedor confirmar a conclusão.
- **Pedido congelado.** O pedido guarda vendedor, nome do produto, imagem, quantidade, preço unitário e taxa do momento da compra. Cada comprador tem um pedido aberto por anúncio e forma de negociação.
- **Cada usuário altera só o que é seu**; rotas de admin exigem perfil próprio.
- **Ações irreversíveis** (excluir perfil, excluir anúncio/produto, marcar como vendido) exigem confirmação explícita. Excluir é lógico (anúncio) ou por anonimização (usuário), e fica bloqueado enquanto houver pedido Pago ou em Retirada combinada em aberto.
- **Anúncio** tem de 1 a 5 imagens (JPG/PNG), preço de R$ 0,01 a R$ 99.999,99 e quantidade de 1 a 999. A imagem tem até **4 MB** (o PDF cita 5 MB; desvio confirmado pelo grupo em 16/10/2026 por causa do limite de 4,5 MB por requisição na Vercel), enviada uma por requisição.
- **Produção em modo de demonstração.** O Mercado Pago roda com credenciais de teste e a tela avisa que nenhum valor é cobrado de verdade.
- **WhatsApp** do vendedor só aparece para usuários logados.
- **Taxa de serviço** de R$ 0,00 por enquanto; o repasse ao vendedor é simulado, via conta única de teste.

## Arquitetura

SPA em React que consome uma API REST em Node.js/Express (`/api/v1`), sem sessão guardada no servidor. Em produção, o frontend é um site estático na Vercel e a API roda como função serverless (o `app.ts` é exportado, sem `listen`). Em desenvolvimento, o `dev-server.ts` liga a porta e os jobs com `node-cron`.

```text
 Navegador (SPA React)
        │   HTTPS · JSON · JWT
        ▼
 ┌─────────────────────────────────────────────────┐
 │  Vercel                                         │
 │   ├─ Frontend ........ site estático (Vite)     │
 │   └─ API REST ........ Express + TypeScript     │
 │                        (função serverless)      │
 └───┬───────────┬────────────┬───────────┬────────┘
     ▼           ▼            ▼           ▼
 PostgreSQL   Google      Mercado      Resend e Cloudinary
 (Supabase)   (login)     Pago         (e-mails e imagens)
                          (cartão e Pix)
                            ▲
                            └── webhook: o gateway avisa quando o pagamento é aprovado

 Agendadores (Vercel Cron e cron-job.org) ──▶ GET /api/v1/internal/jobs/:name  (com CRON_SECRET)
```

> Decididos pelo grupo: **Mercado Pago** (pagamento), **Vercel + Supabase** (hospedagem e banco), **Resend** (e-mail; Mailtrap em desenvolvimento), **Cloudinary** (imagens) e **Google** (login social). Os segredos ficam só no backend ("backend-cofre"). O código acessa todos os serviços por interfaces (providers), o que permite trocá-los sem mexer nas regras de negócio.

### Camadas do backend

```text
Requisição HTTP ▶ Route ▶ Controller ▶ Service ▶ Repository ▶ PostgreSQL
                                          └────▶ Providers ▶ serviços externos
```

| Camada | Responsabilidade |
|---|---|
| Route | Define método e URL e encadeia middlewares (autenticação, validação, upload) |
| Controller | Lê a requisição já validada, chama o service e monta a resposta HTTP |
| Service | Regras de negócio, conferência de dono e transações |
| Repository | Único ponto de acesso ao banco |
| Provider | Conversa com um serviço externo atrás de uma interface |

## Stack e ferramentas

| Camada | Tecnologia |
|---|---|
| Frontend | TypeScript com React, Tailwind CSS e HTML |
| Backend | Node.js com Express |
| Banco de dados | PostgreSQL 18 |
| Prototipação | Figma |
| Versionamento | Git, código organizado em camadas |
| Gestão | Trello (Kanban) |

### Serviços e bibliotecas decididos

Os documentos técnicos foram alinhados em conjunto pelo grupo em 16/10/2026. As escolhas abaixo valem; as pendências restantes estão no [CLAUDE.md](CLAUDE.md) e nos documentos de [Regras de Negócio](docs/regras-de-negócio/regras-de-negócio.md), [banco de dados](docs/BancoDeDados/bd.md), [API](docs/api/api.md), [backend](docs/backend/backend.md) e [deploy](docs/deploy/deploy.md).

| Área | Decisão |
|---|---|
| Frontend | Vite, React Router, TanStack Query, React Hook Form + Zod, Vitest, Testing Library e Playwright |
| Backend | Estrutura route/controller/service/repository, Prisma (ORM), Zod, bcrypt, jsonwebtoken, node-cron (só em desenvolvimento), pino, helmet, Vitest + Supertest |
| Hospedagem e banco | Vercel (frontend e API) e Supabase (PostgreSQL, usado só como banco; plano gratuito de 500 MB, sem backup automático) |
| Pagamento | Mercado Pago (cartão por token e Pix com webhook), em modo de teste |
| E-mail | Resend (produção, com domínio próprio) e Mailtrap (desenvolvimento) |
| Imagens | Cloudinary (Cloudflare R2 fica como alternativa) |
| Ambiente local | Docker Compose para o PostgreSQL de desenvolvimento e o de testes |
| Login social | Google, no MVP; Apple fora |
| Monitoramento | UptimeRobot no `/health` |
| Depois do MVP | Cloudflare Turnstile (anti-bot), Sentry e confirmação de e-mail por link |

## Estrutura do repositório

Estado atual: o repositório contém a documentação e as skills do Claude Code. As pastas `frontend/` e `backend/` serão criadas na fase de implementação, seguindo as estruturas abaixo (definidas na documentação técnica).

```text
Unishop/
├─ CLAUDE.md                 # contexto e regras para o Claude Code
├─ README.md
├─ skills-lock.json          # origem das skills externas instaladas
├─ .claude/skills/           # skills do Claude Code: unishop-frontend, unishop-backend, unishop-api, unishop-deploy,
│                            # unishop-database, unishop-rules, vercel-cli-with-tokens, resend, email-best-practices,
│                            # vercel-react-best-practices,
│                            # vercel-composition-patterns, web-design-guidelines, supabase-postgres-best-practices,
│                            # webapp-testing, skill-creator
├─ docs/
│  ├─ frontend/frontend.md
│  ├─ backend/backend.md
│  ├─ api/api.md
│  ├─ deploy/deploy.md
│  ├─ BancoDeDados/bd.md
│  ├─ regras-de-negócio/regras-de-negócio.md
│  └─ skills/skills.md
├─ frontend/                 # (a criar) SPA React, organizada por área
└─ backend/                  # (a criar) API Express, em camadas
```

## Backend em resumo

Detalhes completos em [Documentação do Backend](docs/backend/backend.md) (v0.3, baseada nas Regras de Negócio v0.4 e no Banco de Dados v0.2).

### Estrutura planejada

```text
backend/
├─ prisma/                   # schema, migrações (0_init + manual) e seed (6 categorias + conta admin)
├─ src/
│  ├─ app.ts · dev-server.ts · config/ · routes/index.ts
│  ├─ modules/               # ALUNO: auth, users, categories, listings, orders, payments, notifications
│  ├─ admin/                 # ADMINISTRADOR: users, listings, audit-logs (proteção aplicada uma vez)
│  ├─ shared/                # middlewares, providers, errors, utils, types
│  └─ jobs/                  # tarefas agendadas
└─ tests/                    # unit, integration e helpers
```

Cada módulo segue o mesmo molde: `routes`, `controller`, `service`, `rules`, `repository`, `schemas` (Zod) e `types`.

### Módulos e rotas (proposta, base `/api/v1`)

| Módulo | Rotas principais | Acesso |
|---|---|---|
| auth | `/auth/register`, `/auth/login`, `/auth/google`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/me` (e `/auth/verify-email` e `/auth/resend-verification`, só com a chave `EMAIL_VERIFICATION_REQUIRED`) | Público (exceto `me`) |
| users | `/users/me` (perfil), `/users/me/password`, `/users/me/complete-profile` (Google), `/users/me/avatar`, `/users/me/email-change` e `/confirm`, exclusão (`DELETE`) | Aluno ou admin |
| categories | `GET /categories` (seis categorias fixas, sem escrita) | Aluno |
| listings | `/listings`, `/listings/recent` (carrossel público), `/listings/mine`, `/listings/:id` (e `/management`), imagens (`POST` e `DELETE /listings/:id/images`) e ações pause, reactivate, mark-sold | Aluno; dono nas escritas |
| orders | `/orders`, `/orders/contact`, `/orders/mine`, `/orders/received`, `/orders/:id`, `/orders/:id/arrange-pickup`, `confirm-receipt`, `complete`, `cancel` | Aluno (comprador ou vendedor) |
| payments | `/payments/card`, `/payments/pix`, `/payments/webhook` | Comprador; webhook só do gateway |
| admin | `/admin/users` (e `/stats`), `/admin/listings` (e `/stats`), `/admin/audit-logs` | Somente admin |
| técnica | `GET /health` (leve, para o monitor) e `GET /health/db` (consulta o banco) | Público |
| jobs | `GET /internal/jobs/:name`, protegido por `CRON_SECRET` | Só os agendadores |

O contrato final (campos, exemplos e códigos de resposta) ficará no `openapi.yaml`, que ainda não existe (pendência do [documento de API](docs/api/api.md)).

### Pagamentos

- Cartão: o navegador envia os dados direto ao gateway e recebe um token; o backend só recebe o token.
- Pix: a cobrança expira em 30 minutos; o webhook confirma, o backend consulta o gateway antes de confiar no aviso e a liquidação é idempotente. Pix expirado cancela o pedido.
- Pix e cartão passam pela mesma rotina de liquidação, em transação, que é a única a mudar o pedido para "Pago". Ela só conclui se o anúncio estiver ativo, o vendedor não estiver suspenso e houver estoque; caso contrário, cancela o pedido e estorna.
- Pagamento aprovado depois de o pedido já estar cancelado também é estornado, e o comprador é avisado por e-mail.

### Jobs agendados

Em desenvolvimento rodam com `node-cron`; em produção cada job é um endpoint chamado por um agendador, e todos são idempotentes.

| Job | Frequência | Quem chama | Função |
|---|---|---|---|
| `expire-pix-payments` | A cada 30 minutos | cron-job.org | Cancela pedidos pendentes há mais de 30 minutos (Pix vencido ou cartão abandonado); não há estoque a devolver |
| `reconcile-pending-payments` | A cada 30 minutos | cron-job.org | Corrige pagamentos que perderam o webhook e refaz estornos que falharam |
| `cleanup-expired-tokens` | Diário | Vercel Cron | Apaga tokens de confirmação e de senha vencidos ou usados |

O pedido vencido também é cancelado sob demanda, quando alguém o lê ou paga.

### Padrões de resposta

- Sucesso: `{ "data": ... }`, com `meta` de paginação nas listas (`page`, `limit`, `total`, `totalPages`).
- Erro: `{ "error": { "code", "message", "details", "requestId" } }`, com códigos em inglês (`OUT_OF_STOCK`, `INVALID_CREDENTIALS`...) e mensagens em português.
- Dinheiro calculado em centavos (inteiros); datas em ISO 8601 UTC.

### Segurança

HTTPS e HSTS, senha com hash bcrypt, JWT de 2 horas (sem refresh token no MVP), bloqueio após 5 erros de senha por 15 minutos, validação Zod em toda entrada, consultas parametrizadas (o RNF005 cita "NoSQL Injection", mas o banco é PostgreSQL: o risco real é SQL Injection), limite de requisições por IP, upload conferido pelo conteúdo real do arquivo, logs sem dados sensíveis e anonimização de dados pessoais na exclusão de perfil (LGPD).

## Frontend em resumo

Detalhes completos em [Documentação do Frontend](docs/frontend/frontend.md) (v0.4).

- SPA React + TypeScript, organizada por **área** (um ator por área): `public` (visitante), `user` (aluno logado) e `admin` (administrador), mais `shared/` para o que é comum.
- As áreas não se importam entre si; o `routes.tsx` de cada uma é carregado sob demanda (lazy loading).
- Guards de rota: `GuestRoute`, `PrivateRoute` e `AdminRoute`. O guard só melhora a experiência; a barreira real de segurança é o backend.
- Sessão: JWT em memória com cópia em `sessionStorage`, restaurada por `GET /auth/me`.
- Telas além do fluxo principal: completar cadastro (Google), trocar senha, confirmar troca de e-mail, Termos e Privacidade e 404.
- Fluxo de dados: componente → hook → `services/` → API. Estado do servidor com TanStack Query; filtros e paginação na URL.
- Toda tela que busca dados trata os estados: carregando, vazio, erro, 403, 404, sessão expirada, conta suspensa, Pix expirado (vira pedido cancelado), pagamento recusado, sem estoque e limite de requisições (429).
- A tela de pagamento e o rodapé avisam que o ambiente é de demonstração.
- Qualidade: responsivo (mobile-first), acessibilidade WCAG 2.1 AA, páginas principais em até 3 s e testes de componente e de fluxo completo.

## Requisitos

O levantamento completo de **Requisitos Funcionais** (RF001–RF024) e **Requisitos Não-Funcionais** (RNF001–RNF016), com suas respectivas prioridades, está documentado no arquivo do trabalho (`Trabalho Desenvolvimento Web 2026.pdf`), incluindo regras de segurança (HTTPS, hash de senha, JWT, LGPD), desempenho (tempo de carregamento, usuários simultâneos), acessibilidade (WCAG 2.1 AA) e responsividade. Todos os requisitos são "Essencial", exceto cinco marcados como "Desejável" (RF002.5, RF002.6, RF003.3, RF004.3 e RF004.6).

As regras de negócio derivadas dos requisitos são identificadas como `RN-XXX-nn` e agrupadas por domínio: ACE (acesso), PER (perfil), CAT (categorias), ANU (anúncios), EST (estoque), PED (pedidos), PAG (pagamento), NOT (notificações) e ADM (administração). Ao implementar algo, o código de origem (`RF`/`RNF` e `RN-XXX-nn`) deve ser citado.

## Modelagem e prototipação

- **Diagrama de Caso de Uso:** mapeia as funcionalidades dos três atores (visitante, usuário e administrador).
- **DER/MER:** modelo conceitual do banco, mantido em `mer_unishop.drawio` (ainda a atualizar com as divergências da seção 12 do [documento de Banco de Dados](docs/BancoDeDados/bd.md)).
- **Prototipação:** wireframes no Figma, com base nos requisitos, nos diagramas e no padrão visual da Unifor, cobrindo as telas do usuário e do administrador em versão desktop. As telas de celular e tablet são derivadas delas.

### Banco de dados em resumo

Detalhes completos em [Documentação do Banco de Dados](docs/BancoDeDados/bd.md) (v0.2, responsável: Ana Clara Macêdo). O documento descreve o **estado final** do banco, que já incorpora as lacunas do DER original (quantidade e galeria de imagens no anúncio, tokens, dados de pagamento, auditoria, aceite dos Termos, tentativas de login e chave própria do pedido).

| Tabela | Papel |
|---|---|
| `usuario` | Aluno ou administrador; e-mail único sem diferenciar maiúsculas; senha anulável (conta Google) |
| `categoria` | As 6 categorias fixas (seed) |
| `anuncio` | Produto à venda, com preço, quantidade, WhatsApp, status e exclusão lógica |
| `imagem_anuncio` | De 1 a 5 fotos por anúncio (URL, `public_id` na Cloudinary e ordem) |
| `pedido` | Compra ou contato; guarda comprador, vendedor, produto, preço e taxa congelados |
| `pagamento` | Cobrança (Pix ou cartão); várias tentativas por pedido, uma em andamento |
| `log_admin` | Auditoria das ações do administrador |
| `token_usuario` | Links de uso único (recuperação de senha, troca de e-mail, confirmação de e-mail) |

- PostgreSQL 18, chaves `GENERATED ALWAYS AS IDENTITY`, dinheiro em `numeric(10,2)` e datas em `timestamptz` (UTC). Nomes de tabela, coluna e estado em português; o backend mapeia para inglês com `@map` do Prisma.
- Estrutura criada e evoluída **só pelo Prisma**: migração `0_init` mais uma migração manual (`CHECK`, índices parciais, view `anuncio_visivel` e papéis). O dump de 07/10/2026 não é restaurado.
- Três papéis de banco: `unishop_migrator`, `unishop_app` e `unishop_backup` (somente leitura).
- Nenhuma FK apaga em cascata: anúncio tem exclusão lógica e usuário é anonimizado (LGPD), de modo que o pedido pago sobrevive.

## Documentação

| Documento | Conteúdo |
|---|---|
| [Protótipo no Figma](https://www.figma.com/design/20vFP1b3Ra6UZbJjVssgxD/Unishop-%E2%80%94-Prot%C3%B3tipo?node-id=0-1&t=aaGA4eqvMXvN19lh-0) | Wireframes de alta fidelidade das telas do usuário e do administrador |
| [docs/frontend/frontend.md](docs/frontend/frontend.md) | Estrutura, rotas, componentes, estado, sessão e padrões de qualidade do frontend (v0.4) |
| [docs/backend/backend.md](docs/backend/backend.md) | Arquitetura, camadas, autenticação, módulos e rotas, pagamentos, estados, jobs, erros, segurança e mapa das regras de negócio no backend (v0.3) |
| [docs/regras-de-negócio/regras-de-negócio.md](docs/regras-de-negócio/regras-de-negócio.md) | Regras de negócio (RN-XXX-nn), estados, permissões, escopo do MVP, limites de campos, desvios do PDF e cenários de teste (v0.4) |
| [docs/BancoDeDados/bd.md](docs/BancoDeDados/bd.md) | Dicionário das 8 tabelas, valores dos estados, mapeamento banco × backend, consultas críticas, anonimização, migração pelo Prisma, papéis e SQL da migração manual (v0.2) |
| [docs/skills/skills.md](docs/skills/skills.md) | O que são as skills do Claude Code, as instaladas no projeto e como usá-las |
| [CLAUDE.md](CLAUDE.md) | Contexto, regras de idioma e prioridades de fontes para o Claude Code |
| [docs/api/api.md](docs/api/api.md) | APIs externas (Google, Mercado Pago, Resend, Cloudinary, Turnstile e outras), arquitetura de segurança "backend-cofre", providers, variáveis e ADRs 001 a 009 (v0.3). O contrato `openapi.yaml` ainda não existe |
| [docs/deploy/deploy.md](docs/deploy/deploy.md) | Deploy na Vercel + Supabase: ambientes, segredos, CORS, jobs, backup, atualização e reversão (v0.3) |

Precedência entre os documentos técnicos (quando dois discordam, corrige-se o de menor precedência): Regras de Negócio, Banco de Dados, Backend e Frontend, API e Deploy. Em caso de conflito entre fontes em geral, vale esta ordem: (1) PDF do trabalho, (2) decisões do grupo, (3) documentos técnicos em `docs/`, (4) protótipos no Figma.

> Os documentos técnicos citam as pastas `regras-de-negocio` e `banco-de-dados` sem acento e mencionam um `docs/README.md` (índice). No repositório, as pastas atuais são `docs/regras-de-negócio/` e `docs/BancoDeDados/`, e o índice ainda não existe.

## Decisões do grupo e pendências

### Decisões já fechadas

- Domínio institucional oficial: `@edu.unifor.br`.
- Anúncio é item único, mas pode ter várias unidades (de 1 a 999) e de 1 a 5 imagens.
- Taxa de serviço de R$ 0,00 por enquanto; repasse ao vendedor simulado, via conta única de teste.
- Login do admin: mesma tela do aluno, rota separada, redirecionamento ao painel admin.
- Login social: Google entra no MVP; Apple fica de fora (custo anual e possível e-mail de retransmissão fora do domínio institucional).
- Gateway de pagamento: Mercado Pago, com credenciais de teste também em produção.
- Hospedagem: Vercel (frontend e API) com banco PostgreSQL no Supabase; guia em [Deploy](docs/deploy/deploy.md).
- ORM: Prisma. Imagens: Cloudinary. E-mail: Resend (Mailtrap em desenvolvimento), que também é o canal de notificação.
- JWT de 2 horas, sem refresh token.
- Imagem de até 4 MB, uma por requisição (desvio do PDF confirmado em 16/10/2026).
- Jobs a cada 30 minutos (agendador externo) e um diário (Vercel Cron).
- Termos de uso e Política de privacidade: versão mínima no MVP, conteúdo definido durante o desenvolvimento.

### Fora do MVP (decidido)

Confirmação de e-mail por link (atrás da chave `EMAIL_VERIFICATION_REQUIRED`), Turnstile, Sentry, tela de notificações, prazo para negociação por WhatsApp, refresh token, cancelamento de pedido Pago pelo sistema, deduplicação de visualizações, limite de requisições compartilhado (Redis) e teste de carga de 500 usuários.

### Pendências relevantes

- `openapi.yaml`: não existe e depende do Pedro (a partir da seção 9 do Backend).
- Domínio próprio, necessário para o Resend verificar o envio de e-mail (e, se preciso, para o login do Google).
- Testar se o e-mail `@edu.unifor.br` entrega `email_verified` no login com Google.
- Prova de conceito do Pix de teste do Mercado Pago e escolha entre Payments API e Orders API.
- Criar e testar no Supabase os três papéis do banco (SQL Editor, login pelo pooler) e conferir a versão do PostgreSQL; testar a migração em um banco vazio; atualizar o MER.
- Conferir no PDF os RNF012 a RNF016 e se commits de outros autores são bloqueados no plano Hobby da Vercel.
- Escrever os Termos de uso e a Política de privacidade; o grupo confirmar os limites de campos e a lista de itens proibidos (Regras de Negócio, seção 9).

A lista completa está em [Regras de Negócio](docs/regras-de-negócio/regras-de-negócio.md) (seção 11), [Banco de Dados](docs/BancoDeDados/bd.md) (seção 15), [API](docs/api/api.md) (seção 12), [Backend](docs/backend/backend.md) (seção 21) e [Deploy](docs/deploy/deploy.md) (seção 17.3).

## Organização do projeto

O acompanhamento das tarefas é feito em um quadro Kanban no Trello, separado em colunas de planejamento, tarefas pendentes, MVP e apresentação final, servindo também como cronograma das entregas.
