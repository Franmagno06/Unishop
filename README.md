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
- Login por e-mail e senha ou, no MVP, pelo Google (Apple fica de fora).
- Recuperação de senha por e-mail, com link de validade de 30 minutos e uso único.

### Usuário (aluno)
- Navegação por seis categorias fixas (Livros e apostilas, Eletrônicos, Alimentos, Materiais de curso, Vestuário e Outros), com busca, filtro de preço e ordenação.
- Página de produto com galeria de imagens, dados do vendedor e botão "Fazer pedido", em que escolhe a quantidade (limitada ao estoque).
- Dois caminhos de compra: **pagamento pelo site** (cartão ou Pix, via gateway externo) ou **contato por WhatsApp** (pedido "Em negociação").
- Retirada presencial: no pedido pago, o vendedor marca "retirada combinada" e o comprador confirma o recebimento.
- Perfil com edição de dados, troca de e-mail institucional, exclusão de perfil (a conta é anonimizada) e histórico de pedidos.
- Publicação e gerenciamento de anúncios: nome, categoria, descrição, preço, quantidade, pelo menos uma imagem e WhatsApp; editar, pausar, reativar, marcar como vendido ou excluir; indicadores de visualizações, contatos e pedidos.

### Administrador
- Painel restrito com seções de **Usuários** e **Produtos**, acessado pela mesma tela de login do aluno, em rota separada (`/admin/login`).
- Indicadores gerais (usuários cadastrados, logados agora, novos na semana; produtos ativos, pausados e vendidos no mês).
- Visualização, edição, suspensão e exclusão de usuários e produtos, com **log de auditoria** de cada ação.
- O administrador **não compra, não paga e não anuncia**. A conta admin é criada apenas por seed, nunca pelo cadastro público.

## Fluxo geral do site

1. O visitante conhece a plataforma na tela inicial e vai para cadastro ou login (e-mail `@edu.unifor.br` obrigatório).
2. Logado, o aluno acessa **Categorias**, escolhe uma categoria, vê a listagem e abre a página do produto.
3. Em "Fazer pedido", escolhe a quantidade e segue por um de dois caminhos:
   - **Pagamento pelo site:** o pedido nasce "Pendente"; quando o gateway confirma o pagamento, vira "Pago" e o estoque é descontado.
   - **WhatsApp:** o pedido nasce "Em negociação"; o estoque só é descontado quando o vendedor confirma a venda.
4. O aluno acompanha as compras em **Meus pedidos**.
5. Para vender, usa "+ Anunciar item", publica e gerencia o anúncio e os pedidos recebidos.
6. O administrador entra pelo login em rota separada e gerencia usuários e produtos no painel.

### Estados principais

| Entidade | Estados |
|---|---|
| Anúncio | `Ativo`, `Pausado`, `Vendido`, `Excluído` (definitivo) |
| Pedido | `Pendente`, `Pago`, `Retirada combinada`, `Concluído`, `Em negociação`, `Cancelado` |
| Pagamento | `Pendente`, `Aprovado`, `Recusado`, `Expirado`, `Estornado` |
| Conta | `Ativa`, `Bloqueada` (5 senhas erradas, 15 minutos), `Suspensa` (pelo admin) |

## Regras centrais do sistema

Resumo das regras que nunca podem ser violadas. O detalhe está em [Regras de Negócio](docs/regras-de-negócio/regras-de-negócio.md).

- **Segurança no backend.** O frontend só valida para responder rápido; papel, dono do recurso, dinheiro e estoque são sempre decididos no servidor.
- **Domínio institucional.** Cadastro, login e troca de e-mail aceitam apenas `@edu.unifor.br` (exceção: a conta admin criada por seed).
- **Pagamento externo.** Dados de cartão nunca passam pelos servidores do Unishop; o navegador gera um token com o SDK do gateway. A confirmação vem por webhook assinado.
- **Sessão JWT** no cabeçalho `Authorization: Bearer`, com expiração.
- **Estoque sem reserva.** Pix pendente não reserva a unidade: vale o primeiro pagamento confirmado. O desconto é atômico (`UPDATE ... WHERE quantity >= n`) e a quantidade nunca fica negativa. Se o estoque acabar antes da confirmação, o pedido é cancelado e o valor, estornado.
- **Pedido via WhatsApp não desconta estoque** até o vendedor confirmar a conclusão.
- **Preço congelado.** O pedido guarda preço unitário e total do momento da compra.
- **Cada usuário altera só o que é seu**; rotas de admin exigem perfil próprio.
- **Ações irreversíveis** (excluir perfil, excluir anúncio/produto, marcar como vendido) exigem confirmação explícita.
- **Anúncio** tem pelo menos uma imagem (JPG/PNG até 5 MB) e preço maior que zero.
- **WhatsApp** do vendedor só aparece para usuários logados.
- **Taxa de serviço** de R$ 0,00 por enquanto; o repasse ao vendedor é simulado, via conta única de teste.

## Arquitetura

SPA em React que consome uma API REST em Node.js/Express (`/api/v1`), sem sessão guardada no servidor. Um único processo Node.js atende a API e executa os jobs agendados.

```text
 Navegador (SPA React)
        │   HTTPS · JSON · JWT
        ▼
 ┌─────────────────────────────────────────────────┐
 │  Servidor Unishop  (um único processo Node.js)  │
 │   ├─ API REST ........ Express + TypeScript     │
 │   └─ Jobs agendados .. node-cron                │
 └───┬───────────┬────────────┬───────────┬────────┘
     ▼           ▼            ▼           ▼
 PostgreSQL   Google      Mercado      Resend e Cloudinary
 (dados)      (login)     Pago         (e-mails e imagens)
                          (cartão e Pix)
                            ▲
                            └── webhook: o gateway avisa quando o pagamento é aprovado
```

> Os serviços externos (Google, Mercado Pago, Resend, Cloudinary) são **propostas em avaliação** pelo grupo; o código os acessa sempre por interfaces (providers), o que permite trocá-los sem mexer nas regras de negócio.

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
| Banco de dados | PostgreSQL |
| Prototipação | Figma |
| Versionamento | Git, código organizado em camadas |
| Gestão | Trello (Kanban) |

### Sugestões em avaliação

Itens abaixo constam na documentação técnica como proposta e **ainda não foram decididos pelo grupo**:

| Área | Sugestão |
|---|---|
| Frontend | Vite, React Router, TanStack Query, React Hook Form + Zod, Vitest, Testing Library e Playwright |
| Backend | Estrutura route/controller/service/repository, Prisma (ORM), Zod, bcrypt, jsonwebtoken, node-cron, pino, helmet, Vitest + Supertest |
| Pagamento | Mercado Pago (gateway candidato; escolha final pendente) |
| E-mail | Resend (produção) e Mailtrap (desenvolvimento) |
| Imagens | Cloudinary ou Cloudflare R2 |
| Banco em nuvem | Neon ou Supabase |
| Ambiente local | Docker Compose para PostgreSQL e aplicação |
| Login social | Somente Google no MVP (desejável) |

## Estrutura do repositório

Estado atual: o repositório contém a documentação e as skills do Claude Code. As pastas `frontend/` e `backend/` serão criadas na fase de implementação, seguindo as estruturas abaixo (definidas na documentação técnica).

```text
Unishop/
├─ CLAUDE.md                 # contexto e regras para o Claude Code
├─ README.md
├─ skills-lock.json          # origem das skills externas instaladas
├─ .claude/skills/           # skills do Claude Code (unishop-frontend, vercel-react-best-practices, web-design-guidelines)
├─ docs/
│  ├─ frontend/frontend.md
│  ├─ backend/backend.md
│  ├─ regras-de-negócio/regras-de-negócio.md
│  └─ skills/skills.md
├─ frontend/                 # (a criar) SPA React, organizada por área
└─ backend/                  # (a criar) API Express, em camadas
```

## Backend em resumo

Detalhes completos em [Documentação do Backend](docs/backend/backend.md) (v0.2, baseada nas Regras de Negócio v0.3).

### Estrutura planejada

```text
backend/
├─ prisma/                   # schema, migrações e seed (6 categorias + conta admin)
├─ src/
│  ├─ server.ts · app.ts · config/ · routes/index.ts
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
| auth | `/auth/register`, `/auth/login`, `/auth/google`, `/auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/me` | Público (exceto `me`) |
| users | `/users/me` (perfil, avatar, troca de e-mail, exclusão) | Aluno ou admin |
| categories | `GET /categories` (seis categorias fixas, sem escrita) | Aluno |
| listings | `/listings`, `/listings/recent` (carrossel público), `/listings/mine`, `/listings/:id` e ações pause, reactivate, mark-sold | Aluno; dono nas escritas |
| orders | `/orders`, `/orders/contact`, `/orders/mine`, `/orders/received`, `/orders/:id/arrange-pickup`, `confirm-receipt`, `complete`, `cancel` | Aluno (comprador ou vendedor) |
| payments | `/payments/card`, `/payments/pix`, `/payments/webhook` | Comprador; webhook só do gateway |
| admin | `/admin/users`, `/admin/listings`, `/admin/audit-logs` | Somente admin |
| técnica | `GET /health` | Público |

O contrato final (campos, exemplos e códigos de resposta) ficará no `openapi.yaml`, do documento de API.

### Pagamentos

- Cartão: o navegador envia os dados direto ao gateway e recebe um token; o backend só recebe o token.
- Pix: a cobrança expira em 30 minutos; o webhook confirma, o backend consulta o gateway antes de confiar no aviso e a liquidação é idempotente.
- Pix e cartão passam pela mesma rotina de liquidação, em transação, que é a única a mudar o pedido para "Pago".

### Jobs agendados

| Job | Frequência | Função |
|---|---|---|
| `expire-pix-payments` | A cada minuto | Cancela pedidos pendentes vencidos (não há estoque a devolver) |
| `cleanup-expired-tokens` | Diário | Apaga tokens de confirmação e de senha vencidos ou usados |
| `reconcile-pending-payments` | A cada 5 minutos | Corrige pagamentos que perderam o webhook e refaz estornos que falharam |

### Padrões de resposta

- Sucesso: `{ "data": ... }`, com `meta` de paginação nas listas (`page`, `limit`, `total`, `totalPages`).
- Erro: `{ "error": { "code", "message", "details", "requestId" } }`, com códigos em inglês (`OUT_OF_STOCK`, `INVALID_CREDENTIALS`...) e mensagens em português.
- Dinheiro calculado em centavos (inteiros); datas em ISO 8601 UTC.

### Segurança

HTTPS e HSTS, senha com hash bcrypt, JWT com validade (proposta de 2 horas, sem refresh token no MVP), bloqueio após 5 erros de senha por 15 minutos, validação Zod em toda entrada, consultas parametrizadas (o RNF005 cita "NoSQL Injection", mas o banco é PostgreSQL: o risco real é SQL Injection), limite de requisições por IP, upload conferido pelo conteúdo real do arquivo, logs sem dados sensíveis e anonimização de dados pessoais na exclusão de perfil (LGPD).

## Frontend em resumo

Detalhes completos em [Documentação do Frontend](docs/frontend/frontend.md).

- SPA React + TypeScript, organizada por **área** (um ator por área): `public` (visitante), `user` (aluno logado) e `admin` (administrador), mais `shared/` para o que é comum.
- As áreas não se importam entre si; o `routes.tsx` de cada uma é carregado sob demanda (lazy loading).
- Guards de rota: `GuestRoute`, `PrivateRoute` e `AdminRoute`. O guard só melhora a experiência; a barreira real de segurança é o backend.
- Fluxo de dados: componente → hook → `services/` → API. Estado do servidor com TanStack Query (proposta); filtros e paginação na URL.
- Toda tela que busca dados trata os estados: carregando, vazio, erro, 403, 404, sessão expirada, Pix expirado, pagamento recusado e sem estoque.
- Qualidade: responsivo (mobile-first), acessibilidade WCAG 2.1 AA, páginas principais em até 3 s e testes de componente e de fluxo completo.

## Requisitos

O levantamento completo de **Requisitos Funcionais** (RF001–RF024) e **Requisitos Não-Funcionais** (RNF001–RNF016), com suas respectivas prioridades, está documentado no arquivo do trabalho (`Trabalho Desenvolvimento Web 2026.pdf`), incluindo regras de segurança (HTTPS, hash de senha, JWT, LGPD), desempenho (tempo de carregamento, usuários simultâneos), acessibilidade (WCAG 2.1 AA) e responsividade. Todos os requisitos são "Essencial", exceto cinco marcados como "Desejável" (RF002.5, RF002.6, RF003.3, RF004.3 e RF004.6).

As regras de negócio derivadas dos requisitos são identificadas como `RN-XXX-nn` e agrupadas por domínio: ACE (acesso), PER (perfil), CAT (categorias), ANU (anúncios), EST (estoque), PED (pedidos), PAG (pagamento), NOT (notificações) e ADM (administração). Ao implementar algo, o código de origem (`RF`/`RNF` e `RN-XXX-nn`) deve ser citado.

## Modelagem e prototipação

- **Diagrama de Caso de Uso:** mapeia as funcionalidades dos três atores (visitante, usuário e administrador).
- **DER/MER:** define as entidades `USUARIO`, `ANUNCIO`, `CATEGORIA` e `PEDIDO`, seus atributos, chaves e relacionamentos.
- **Prototipação:** wireframes no Figma, com base nos requisitos, nos diagramas e no padrão visual da Unifor, cobrindo as telas do usuário e do administrador em versão desktop. As telas de celular e tablet são derivadas delas.

### Lacunas conhecidas entre o DER original e as decisões do grupo

O modelo de dados ainda precisa evoluir (responsável: Ana Clara Macêdo):

- Coluna de quantidade no anúncio (decisão de várias unidades).
- Galeria de imagens por anúncio (o DER original guarda uma imagem só, mas a página do produto exige galeria).
- Tabelas ou colunas para tokens de confirmação/recuperação/troca de e-mail, dados de pagamento, log de auditoria, notificações, tentativas de login e último acesso, e aceite dos Termos.
- O pedido precisa de `id_pedido` próprio e exclusão lógica do anúncio, pois a chave composta atual conflita com a regra de que pedido pago sobrevive à exclusão do anúncio (RF017.12).

## Documentação

| Documento | Conteúdo |
|---|---|
| [Protótipo no Figma](https://www.figma.com/design/20vFP1b3Ra6UZbJjVssgxD/Unishop-%E2%80%94-Prot%C3%B3tipo?node-id=0-1&t=aaGA4eqvMXvN19lh-0) | Wireframes de alta fidelidade das telas do usuário e do administrador |
| [docs/frontend/frontend.md](docs/frontend/frontend.md) | Estrutura, rotas, componentes, estado e padrões de qualidade do frontend |
| [docs/backend/backend.md](docs/backend/backend.md) | Arquitetura, camadas, autenticação, módulos e rotas, pagamentos, estados, jobs, erros, segurança e mapa das regras de negócio no backend |
| [docs/regras-de-negócio/regras-de-negócio.md](docs/regras-de-negócio/regras-de-negócio.md) | Regras de negócio (RN-XXX-nn), estados, permissões e cenários de teste |
| [docs/skills/skills.md](docs/skills/skills.md) | O que são as skills do Claude Code, as instaladas no projeto e como usá-las |
| [CLAUDE.md](CLAUDE.md) | Contexto, regras de idioma e prioridades de fontes para o Claude Code |
| `docs/api/` | Especificação da API (`openapi.yaml`) *(a publicar)* |
| `docs/banco-de-dados/` | DER, MER e modelagem do banco *(a publicar)* |

Em caso de conflito entre fontes, vale esta ordem: (1) PDF do trabalho, (2) decisões do grupo, (3) documentos técnicos em `docs/`, (4) protótipos no Figma.

## Decisões do grupo e pendências

### Decisões já fechadas

- Domínio institucional oficial: `@edu.unifor.br`.
- Anúncio é item único, mas pode ter várias unidades.
- Taxa de serviço de R$ 0,00 por enquanto; repasse ao vendedor simulado, via conta única de teste.
- Login do admin: mesma tela do aluno, rota separada, redirecionamento ao painel admin.
- Login social: só Google entra no MVP; Apple fica de fora (custo anual e possível e-mail de retransmissão fora do domínio institucional).
- Gateway de pagamento: serviço externo; a escolha final ainda está pendente.
- Termos de uso e Política de privacidade: conteúdo definido durante o desenvolvimento.

### Pendências relevantes

- Escolha definitiva de ORM, gateway, storage de imagens e provedor de e-mail.
- Máximo de imagens por anúncio (proposta: 5).
- Canal de notificação ao vendedor e ao comprador (proposta: e-mail).
- Validade do JWT (proposta: 2 horas, sem refresh token).
- Aceite dos Termos e dados faltantes no primeiro acesso por Google.
- Nomes de tabelas e colunas (as regras misturam português e inglês), a definir no documento de Banco de Dados.

A lista completa está na seção 21 de [docs/backend/backend.md](docs/backend/backend.md).

## Organização do projeto

O acompanhamento das tarefas é feito em um quadro Kanban no Trello, separado em colunas de planejamento, tarefas pendentes, MVP e apresentação final, servindo também como cronograma das entregas.
