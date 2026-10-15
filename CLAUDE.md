# CLAUDE.md

Contexto para o Claude Code trabalhar no projeto **Unishop**, e-commerce web para alunos da Unifor (trabalho da disciplina Desenvolvimento de Plataformas Web, T242-12).

## Leia primeiro

- [`docs/regras-de-negócio/regras-de-negócio.md`](docs/regras-de-negócio/regras-de-negócio.md) — regras RN-XXX-nn, estados, permissões e cenários de teste.
- [`docs/frontend/frontend.md`](docs/frontend/frontend.md) — estrutura, rotas, componentes, estado e padrões de qualidade do frontend.
- [`docs/backend/backend.md`](docs/backend/backend.md) — arquitetura em camadas, autenticação, módulos e rotas, pagamentos, estados, jobs, erros, segurança e mapa das regras RN no backend.
- [`docs/deploy/deploy.md`](docs/deploy/deploy.md) — deploy em produção (Vercel + Neon): ambientes, segredos, CORS, jobs agendados, backup, atualização e reversão.
- [`docs/skills/skills.md`](docs/skills/skills.md) — skills do Claude Code instaladas no projeto e como usá-las.
- `Trabalho Desenvolvimento Web 2026.pdf` — requisitos funcionais (RF001–RF024) e não-funcionais (RNF001–RNF016) originais do trabalho.

## Skills do projeto: quando usar

As skills ficam em `.claude/skills/` (detalhes e análise de cobertura em [`docs/skills/skills.md`](docs/skills/skills.md)). Acione a skill certa pelo contexto da tarefa; mais de uma pode valer ao mesmo tempo.

| Contexto da tarefa | Skill |
|---|---|
| Telas, rotas, guards, componentes, hooks, services, formulários, estados de tela do frontend | `unishop-frontend` |
| Rotas, controllers, services, repositories, middlewares, providers, jobs, autenticação, pagamentos, estoque, pedidos, admin, erros da API | `unishop-backend` |
| Performance de React: waterfalls, bundle, re-renders, lazy loading (SPA Vite: ignorar regras `server-*` e de Next.js) | `vercel-react-best-practices` |
| Projetar `shared/components/ui`, compound components, contexto, excesso de props booleanas | `vercel-composition-patterns` |
| Revisar UI, acessibilidade (WCAG 2.1 AA), formulários, foco e contraste | `web-design-guidelines` |
| Schema, migração, índice, transação, lock, consulta lenta, concorrência de estoque no PostgreSQL | `supabase-postgres-best-practices` |
| Rodar a aplicação local no navegador, screenshots, console, fluxos Playwright | `webapp-testing` |
| Criar, testar ou melhorar skills do projeto | `skill-creator` |

Fluxo sugerido por momento do trabalho (quando o código existir):

| Momento | O que fazer |
|---|---|
| Antes de codar | Ler a regra em `docs/` e acionar `unishop-frontend` e/ou `unishop-backend` |
| Banco | `supabase-postgres-best-practices` ao definir schema, migração e concorrência de estoque |
| Ao escrever tela ou componente | `unishop-frontend` + `vercel-composition-patterns` (componentes de `shared/components/ui`) |
| Depois de escrever a tela | `web-design-guidelines` (acessibilidade e UX), `vercel-react-best-practices` (performance) |
| Verificar rodando | `webapp-testing` (screenshots, console, fluxo) |
| Antes do PR | `/code-review` e, em mudança sensível (auth, pagamento, admin), `/security-review` |
| Documentação mudou | Revisar a skill `unishop-*` correspondente |

Enquanto o projeto estiver só em documentação, as skills `unishop-*` servem para revisar e manter a coerência dos documentos, não para gerar código.

Regras de uso:

- `web-design-guidelines` busca as regras online: precisa de internet.
- `webapp-testing` precisa de Python e dos servidores de front e back rodando; o `scripts/with_server.py` executa via shell os comandos de servidor informados (risco médio), então confira o comando antes de rodar.
- As skills `unishop-*` são resumos; a fonte de verdade são os documentos em `docs/`. Em conflito, vale o documento (e, acima dele, o PDF e as decisões do grupo).
- Tarefa que cruza front e back (ex.: fluxo de pagamento): use `unishop-frontend` e `unishop-backend` juntas.
- Mudou um documento técnico, uma rota ou uma decisão? Revise a skill `unishop-*` correspondente.
- Skill nova ou removida: atualize esta tabela, `docs/skills/skills.md` e o `skills-lock.json` (só para skills externas).
- Uma pasta só para skills: `.claude/skills/<nome>/SKILL.md`. Não manter `.agents/` nem symlinks.
- Ainda sem skill própria: API (`docs/api/`) e banco (`docs/banco-de-dados/`), pois os documentos não foram publicados, e deploy (`docs/deploy/`).

## Ordem de prioridade entre fontes

Quando houver conflito, vale nesta ordem:

1. PDF do trabalho (requisitos RF/RNF, divisão de responsabilidades)
2. Decisões do grupo (ver seção "Decisões do grupo" abaixo)
3. Documentos técnicos em `docs/`
4. Protótipos no Figma

Itens marcados como "sugestão" nesta ou em outras docs **não** foram decididos pelo grupo — não tratar como definitivo.

## Regras de idioma e nomenclatura

- Responder sempre em português do Brasil.
- Código, pastas e nomes de arquivo ficam em **inglês**.
- Interface (textos visíveis ao usuário) e documentação ficam em **português**.
- Citar sempre os códigos de origem ao implementar algo: `RF`/`RNF` (requisitos do PDF) e `RN-XXX-nn` (regras de negócio em `docs/regras-de-negócio/regras-de-negócio.md`).
- Se uma informação não estiver documentada, dizer que não está definida — não inventar regra, rota, campo ou decisão.

## Visão geral do sistema

Sistema web onde alunos verificados (e-mail `@edu.unifor.br`) anunciam e compram materiais e itens de interesse (livros, eletrônicos, alimentos, materiais de curso, vestuário, outros) dentro do campus. A retirada é sempre presencial, combinada via WhatsApp. Três atores: **visitante**, **usuário (aluno logado)** e **administrador**. O catálogo só é acessível a aluno autenticado.

## Equipe e responsabilidades

| Membro | Responsabilidade |
|---|---|
| Pedro Cândido | Diagrama de Caso de Uso, Frontend, Engenheiro de API |
| Felipe Bessa | Wireframes (Figma), Backend |
| Ana Clara Macêdo | DER e MER, Banco de Dados |
| Francisco Magno | Gestor de Projeto, Integração front-back |

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | TypeScript + React, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form + Zod, HTML |
| Testes (frontend) | Vitest, Testing Library, Playwright |
| Backend | Node.js + Express, Prisma (ORM) |
| Banco de dados | PostgreSQL |
| Prototipação | Figma |
| Versionamento | Git, código organizado em camadas |
| Gestão | Trello (Kanban) |

Decisões fechadas da stack: Vite, Tailwind CSS, Prisma, React Router, TanStack Query, React Hook Form, Zod e Vitest/Testing Library/Playwright, e estrutura do backend em camadas (routes/controller/service/repository). O projeto ainda não foi iniciado: a documentação está sendo completada, então não criar código nem estrutura de pastas até o grupo liberar.

Sugestões ainda em avaliação (não confirmadas): e-mail via Resend/Mailtrap; imagens via Cloudinary/Cloudflare R2; login social restrito ao Google no MVP.

## Estrutura esperada do frontend

Por área de ator, mais compartilhado:

```
public/   → visitante (tela inicial, cadastro, login, recuperação de senha)
user/     → aluno logado (categorias, listagens, produto, pedidos, pagamento, anúncios, perfil)
admin/    → administrador (painel, usuários, produtos)
shared/   → componentes e utilitários comuns
```

## Estrutura esperada do backend

Em camadas (route → controller → service → repository), com serviços externos atrás de providers. Detalhes em [`docs/backend/backend.md`](docs/backend/backend.md).

```
backend/src/
├─ modules/   → aluno: auth, users, categories, listings, orders, payments, notifications
├─ admin/     → administrador: users, listings, audit-logs (proteção aplicada uma vez)
├─ shared/    → middlewares, providers, errors, utils, types
└─ jobs/      → expirar Pix, limpar tokens, conciliar pagamentos
```

## Regras centrais a nunca violar

- O catálogo (categorias, listagens, produtos) só abre para aluno autenticado; verificação de papel sempre no backend, nunca só no frontend.
- Cadastro/login/edição de e-mail aceitam apenas domínio `@edu.unifor.br`.
- Dados de cartão nunca passam pelos servidores do Unishop — pagamento sempre via gateway externo.
- Sessão via JWT, enviado no cabeçalho `Authorization: Bearer`, com expiração.
- Cada usuário só altera os próprios dados/anúncios/pedidos; rotas de admin exigem perfil próprio.
- Ações irreversíveis (excluir perfil, excluir anúncio/produto, marcar como vendido) exigem confirmação explícita do usuário.
- Anúncio tem pelo menos uma imagem (JPG/PNG até 5 MB) obrigatória.
- Pedido feito via WhatsApp não desconta estoque; só desconta quando o vendedor confirma a conclusão.
- Estoque nunca é reservado (Pix pendente não reserva); desconto atômico na confirmação do pagamento. Se o estoque acabar antes, o pedido é cancelado e o valor estornado.
- Administrador não compra, não paga e não anuncia; a conta admin só nasce por seed.
- Valor, taxa e confirmação de pagamento são calculados e decididos só no backend (webhook assinado, idempotente).

## Vocabulário

| Domínio (PT) | Código (EN) |
|---|---|
| Usuário | `user` |
| Anúncio / Produto | `listing` |
| Categoria | `category` |
| Pedido | `order` |
| Pagamento | `payment` |
| Notificação | `notification` |
| Administrador | `admin` |

Nota: o aluno diz "anúncio"; o admin diz "produto" — mesma entidade (`listing`), termo muda conforme a tela.

Estados do anúncio: `Ativo`, `Pausado`, `Vendido`, `Excluído` (definitivo).
Estados do pedido: `Pendente`, `Pago`, `Retirada combinada`, `Concluído`, `Em negociação`, `Cancelado`.
Estados da conta: `Ativa`, `Bloqueada` (5 senhas erradas, 15 min), `Suspensa` (pelo admin).

## Decisões do grupo já fechadas

- Gateway de pagamento: Mercado Pago (ADR-002). Cartão por token e Pix com webhook assinado.
- Hospedagem: Vercel (frontend e API) com banco PostgreSQL no Neon (ADR-005). Detalhes e limites do plano Hobby em [`docs/deploy/deploy.md`](docs/deploy/deploy.md).
- Domínio institucional oficial: `@edu.unifor.br`.
- Anúncio é item único, mas pode ter quantidade (várias unidades).
- Taxa de serviço: R$ 0,00 por enquanto.
- Login do admin: mesma tela do aluno, rota separada, redireciona ao painel admin.
- Login social: apenas Google entra no MVP; Apple fica de fora (custo anual e possível e-mail de retransmissão fora do domínio institucional).
- Termos de uso e Política de privacidade: conteúdo será definido durante o desenvolvimento.
- Repasse ao vendedor: simulado, via conta única de teste.

## Pontos em aberto no modelo de dados

Ao mexer em banco/backend, atenção a estes gaps conhecidos entre o PDF/DER original e as decisões do grupo:

- Falta coluna de quantidade no anúncio (decisão do grupo já exige suporte a múltiplas unidades).
- DER original guarda uma imagem por anúncio, mas a página do produto exige galeria (RF008.1).
- Faltam tabelas/colunas para: tokens de recuperação/confirmação/troca de e-mail; dados de pagamento (gateway, código Pix, expiração, taxa); log de auditoria do admin (RF018.5); notificações (RF011.2); tentativas de login e último acesso; aceite dos Termos (RNF007).
- Chave composta do pedido (`id_anuncio`, `numero_pedido`) conflita com RF017.12 (pedido pago deve sobreviver à exclusão do anúncio) — proposta é `id_pedido` próprio + exclusão lógica do anúncio.
- RNF005 menciona "NoSQL Injection", mas o banco é PostgreSQL — o correto é SQL Injection; tratar como erro de digitação do PDF, não como requisito literal.

## Estrutura de documentação

```
README.md                                  # apresentação do projeto
skills-lock.json                           # origem e hash das skills externas
docs/
├─ frontend/frontend.md                    # estrutura, rotas, componentes, estado, qualidade
├─ regras-de-negócio/regras-de-negócio.md  # regras RN-XXX-nn, estados, permissões, testes
├─ backend/backend.md                      # arquitetura, rotas, pagamentos, segurança (v0.2)
├─ deploy/deploy.md                        # deploy na Vercel + Neon (v0.2)
├─ skills/skills.md                        # skills do Claude Code no projeto
├─ api/                     # a publicar (Pedro Cândido)
└─ banco-de-dados/          # a publicar (Ana Clara Macêdo)
```

Protótipo Figma: https://www.figma.com/design/20vFP1b3Ra6UZbJjVssgxD/Unishop-%E2%80%94-Prot%C3%B3tipo
