---
title: Documentação — Skills do Claude Code
project: Unishop
version: 0.3
date: 2026-10-15
status: rascunho para revisão da equipe
context: CLAUDE.md
related: docs/frontend/frontend.md, docs/backend/backend.md, docs/api/api.md, docs/deploy/deploy.md
---

# Skills do Claude Code

## 1. O que são skills

Skills são pacotes de instruções que o Claude Code carrega **sob demanda** durante uma conversa. Cada skill é uma pasta em `.claude/skills/<nome>/` com um arquivo `SKILL.md` (sempre com esse nome e extensão minúscula, para funcionar em Linux e macOS). O arquivo tem:

- **Cabeçalho YAML** com `name` e `description` (e, opcionalmente, `metadata`). A `description` é o que o Claude lê para decidir se a skill vale a pena naquele momento; por isso ela diz **quando** usar, não só o que a skill é.
- **Corpo em Markdown** com as instruções, regras ou checklist.
- Opcionalmente, pastas de apoio: `references/` (documentos lidos só se necessário), `scripts/` (código que a skill executa) e `assets/`.

O carregamento é em três níveis, para não gastar contexto à toa: (1) só nome e descrição ficam sempre visíveis; (2) o corpo do `SKILL.md` entra quando a skill é acionada; (3) arquivos de apoio são lidos apenas quando o corpo manda.

Skills **não são programas independentes**: são contexto que molda como o Claude trabalha. Algumas trazem scripts, mas é o Claude quem decide executá-los, e sempre sob as permissões do usuário.

## 2. Como usar

- **Automático:** descreva a tarefa normalmente. Se ela combinar com a `description` de uma skill, o Claude a aciona sozinho (ex.: pedir "crie a tela de pagamento" aciona a `unishop-frontend`).
- **Explícito:** cite o nome ("use a skill unishop-backend para revisar esta rota") ou digite `/nome-da-skill`.
- **Combinadas:** uma tarefa pode usar mais de uma skill. Exemplo: criar o componente `Modal` usa `unishop-frontend` (onde ele mora e quais regras seguir), `vercel-composition-patterns` (como projetar a API do componente) e `web-design-guidelines` (foco, Esc, acessibilidade).
- **Revisar antes de confiar:** skills externas rodam com as permissões do usuário. Leia o `SKILL.md` e os scripts antes de instalar, e prefira fontes conhecidas (o instalador exibe uma avaliação de risco).

## 3. Skills instaladas no projeto

Todas ficam em `.claude/skills/`, cada uma com seu conteúdo real (sem symlinks e sem a pasta `.agents/`, que o instalador cria por padrão e foi removida).

| Skill | Origem | Para que serve | Quando usar |
|---|---|---|---|
| `unishop-frontend` | Própria | Regras do frontend do Unishop: áreas, rotas, guards, estado, estados de tela, qualidade | Qualquer tela, componente, rota, hook ou serviço do frontend |
| `unishop-backend` | Própria | Regras do backend: camadas, autenticação, pagamentos, estoque, pedidos, admin, erros | Qualquer rota, service, repository, middleware, job ou provider da API |
| `unishop-api` | Própria | APIs externas e segurança: backend-cofre, providers, Mercado Pago, webhook assinado, segredos, variáveis, travas de produção, ADRs | Integrar ou revisar Google, Mercado Pago, Resend, Cloudinary, Turnstile; mexer em `env.ts`, chaves ou webhook |
| `unishop-deploy` | Própria | Deploy na Vercel + Neon: ambientes, `APP_ENV`, `vercel.json`, jobs por endpoint, `waitUntil`, backup, rollback, limites do Hobby | Publicar, configurar variáveis, domínio, cron, migração em produção, backup |
| `vercel-cli-with-tokens` | Vercel | Operar o Vercel CLI com token de acesso (variáveis, logs, deploy) | `vercel env`, `vercel logs`, deploy pelo CLI; sempre sob as regras da `unishop-deploy` |
| `neon-postgres` | Neon | Conexões pooled × direta, migrações, branching, restauração, IP allow list no Neon | Trabalhar com a `DATABASE_URL` e o banco de produção |
| `neon-postgres-branches` | Neon | Escolher e criar o tipo certo de branch (teste de migração, dados sensíveis, reset) | Branch por preview, teste de migração com dados reais, CI |
| `resend` | Resend | API do Resend: envio, idempotência, webhooks, domínios, chaves | Implementar o `resend.provider` do `MailProvider` |
| `email-best-practices` | Resend | Entregabilidade, SPF/DKIM/DMARC, e-mail transacional, acessibilidade e conformidade | Domínio do Resend, e-mails de confirmação e redefinição de senha |
| `vercel-react-best-practices` | Vercel (MIT) | 70 regras de performance de React em 8 categorias | Escrever ou revisar componentes, data fetching e bundle |
| `vercel-composition-patterns` | Vercel (MIT) | Padrões de composição: compound components, contexto, fim do excesso de props booleanas | Projetar `shared/components/ui` e refatorar componentes |
| `web-design-guidelines` | Vercel | Revisão de UI contra as Web Interface Guidelines (busca as regras atuais online) | Auditar acessibilidade, UX e formulários |
| `supabase-postgres-best-practices` | Supabase (MIT) | Boas práticas de PostgreSQL: schema, índices, transações, locks, conexões | Modelagem, migrações, consultas e concorrência de estoque |
| `webapp-testing` | Anthropic | Testar a aplicação local com Playwright (Python): screenshots, logs do console, fluxos | Verificar telas rodando e depurar a interface |
| `skill-creator` | Anthropic | Criar, testar e melhorar skills; otimizar a descrição de acionamento | Criar ou refinar skills do Unishop |

### 3.1 `unishop-frontend`, `unishop-backend`, `unishop-api` e `unishop-deploy` (próprias)

Resumos operacionais, escritos para o Unishop, dos documentos [frontend](../frontend/frontend.md), [backend](../backend/backend.md), [API](../api/api.md) e [deploy](../deploy/deploy.md). A `unishop-api` e a `unishop-deploy` foram criadas com a `skill-creator` em 15/10/2026 e trazem casos de teste em `evals/evals.json` (ainda não executados: a máquina não tem Python, que os scripts de avaliação exigem). Cada uma lista as regras que nunca podem ser violadas, as convenções, os estados e o critério de "pronto", e aponta para a doc completa, que é a fonte de verdade. Também dizem quais outras skills combinar. Não entram no `skills-lock.json`: são mantidas à mão, junto com o código.

Regra de manutenção: se um documento técnico mudar (rota, regra, decisão), a skill correspondente precisa ser revisada.

### 3.2 `vercel-react-best-practices`

Regras ordenadas por impacto: eliminar waterfalls (`async-`), tamanho do bundle (`bundle-`), servidor (`server-`), data fetching no cliente (`client-`), re-renderizações (`rerender-`), renderização (`rendering-`), JavaScript (`js-`) e avançadas (`advanced-`).

**Cobertura para o Unishop:** o frontend é uma SPA Vite, não Next.js. Valem `async-`, `bundle-` (lazy loading das áreas, barrel imports), `client-`, `rerender-`, `rendering-` (sem hidratação) e `js-`. As `server-*` e o que for de SSR não se aplicam.

### 3.3 `vercel-composition-patterns`

Cobre componentes que escalam: compound components, estado levantado, contexto, evitar props booleanas em excesso, APIs do React 19. Cabe aos componentes de `shared/components/ui` (`Button`, `Modal`, `ConfirmDialog`, `Table`...) e aos formulários de anúncio (mesmo componente em modo criar e editar).

### 3.4 `web-design-guidelines`

Busca a versão mais recente das diretrizes direto do repositório da Vercel (precisa de acesso à internet) e aponta violações no formato `arquivo:linha`. Atende à meta de acessibilidade WCAG 2.1 AA (RNF013) e ao critério "funciona por teclado, com rótulos e contraste verificados" da definição de pronto.

### 3.5 `supabase-postgres-best-practices`

O banco é PostgreSQL puro; a skill vale para qualquer Postgres (o nome vem de quem a mantém). Relevante para: índices e chaves estrangeiras, `CHECK (quantity >= 0)`, transações curtas, bloqueios e deadlocks na compra simultânea da última unidade (RN-EST-04), paginação, pool de conexões e leitura de `EXPLAIN`. Use junto com o trabalho de Ana Clara (banco) e Felipe Bessa (backend). Partes de RLS e específicas do Supabase não se aplicam, pois o controle de acesso fica na API.

### 3.6 `webapp-testing`

Escreve scripts Playwright em Python para abrir a aplicação local, tirar screenshots, ler o console e testar fluxos. Inclui `scripts/with_server.py`, que sobe o backend e o frontend, roda o teste e encerra os servidores. O instalador marcou risco médio porque esse script executa, via shell, os comandos de servidor que a pessoa informa; ele não faz chamadas de rede nem executa nada por conta própria. Complementa (não substitui) os testes automatizados previstos: Vitest/Testing Library e Playwright no repositório.

### 3.7 Skills externas de deploy, banco e e-mail

Instaladas em 15/10/2026 a partir de repositórios oficiais (`vercel-labs/agent-skills`, `neondatabase/agent-skills` e `resend/resend-skills`), revisadas antes de entrar e registradas no `skills-lock.json`.

- **`vercel-cli-with-tokens`:** o token vem do ambiente (`VERCEL_TOKEN`), nunca de `--token`. Ela sugere procurar o token em arquivos `.env` e aceita `vercel deploy --prod`; no Unishop quem manda é a `unishop-deploy`: deploy normal é `git push`, produção só com pedido explícito, e nenhum segredo em arquivo versionado.
- **`neon-postgres` e `neon-postgres-branches`:** só a parte de **banco** do Neon. O projeto não usa Neon Auth, Functions, Object Storage nem AI Gateway (autenticação própria por JWT, API na Vercel).
- **`resend` e `email-best-practices`:** dão os detalhes e armadilhas do Resend e de entregabilidade. Siga a interface `MailProvider` do projeto; partes de caixa de entrada para agentes, marketing, contatos e React Email não se aplicam.

### 3.8 `skill-creator`

Guia o ciclo de criar uma skill: rascunhar, escrever casos de teste, rodar com e sem a skill, comparar resultados e reescrever; também otimiza a `description` para o acionamento correto. Traz scripts de validação (`quick_validate.py`), empacotamento e avaliação em `scripts/`, que usam Python e o CLI `claude`. Use-a ao criar skills novas (por exemplo, `unishop-database` quando o documento de banco for publicado) ou ao ajustar as existentes. Os scripts de avaliação pedem Python e o CLI `claude`.

## 4. Análise de cobertura do projeto

| Necessidade do Unishop | Coberta por | Situação |
|---|---|---|
| Convenções, áreas, rotas e qualidade do frontend | `unishop-frontend` | Coberta |
| Performance de React/Vite | `vercel-react-best-practices` | Coberta (ignorar regras de servidor/Next.js) |
| Arquitetura de componentes (`shared/components/ui`) | `vercel-composition-patterns` | Coberta |
| Acessibilidade e UX | `web-design-guidelines` | Coberta |
| Arquitetura, regras e segurança do backend | `unishop-backend` | Coberta |
| Modelagem e consultas PostgreSQL, concorrência | `supabase-postgres-best-practices` | Coberta |
| Testes E2E e verificação de telas | `webapp-testing` | Coberta (Playwright em Python; testes do repositório usam o Playwright de Node) |
| Criar e manter skills | `skill-creator` | Coberta |
| APIs externas, segurança e segredos (`docs/api/api.md`) | `unishop-api` | Coberta |
| Deploy na Vercel + Neon (`docs/deploy/deploy.md`) | `unishop-deploy` + `vercel-cli-with-tokens` | Coberta |
| Banco no Neon: conexões, branches, restauração | `neon-postgres`, `neon-postgres-branches` | Coberta |
| E-mail transacional (Resend) | `resend`, `email-best-practices` | Coberta |
| Mercado Pago (cartão, Pix, webhook) | `unishop-api` | Coberta pelo doc do projeto; não há skill oficial do Mercado Pago |
| Cloudinary (imagens) | `unishop-api` | Coberta pelo doc do projeto; a skill oficial da Cloudinary não foi instalada |
| Contrato da API própria (`openapi.yaml`) | — | Lacuna: o `openapi.yaml` ainda não existe |
| Modelo de dados do projeto (DER/tabelas) | — | Lacuna: `docs/banco-de-dados/` ainda não foi publicada |
| Revisão de código e segurança | Comandos nativos `/code-review` e `/security-review` | Coberta pelo Claude Code |

**Não instaladas de propósito:** `deploy-to-vercel` (foi instalada, revisada e **removida**: o plano B dela envia o projeto inteiro, sem login, a um endpoint da Vercel e vem com um `Archive.zip` solto; o Unishop publica por `git push`); `vercel-optimize` (foco em Next.js e em projetos já no ar; reavaliar depois do deploy); `neon`, `neon-auth`, `neon-functions`, `neon-object-storage`, `neon-ai-gateway`, `neon-realtime` e `neon-postgres-egress-optimizer` (empurram recursos do Neon que o projeto não usa); `react-email` e `agent-email-inbox` (fora da stack de e-mail); `cloudinary-docs` (oficial, mas busca documentação em tempo de execução e a auditoria do `skills.sh` a marca como risco médio; a `unishop-api` cobre o uso do Unishop); skills do Mercado Pago (só existem as da comunidade, nenhuma oficial); `supabase` (o banco em nuvem é o Neon, não o Supabase); `vercel-react-native-skills` (o produto é web); `vercel-react-view-transitions` (animações de rota não são requisito); `frontend-design` (o projeto segue fielmente o Figma, e a skill incentiva criar estilos novos); `writing-guidelines` (a documentação é em português do Brasil); `docx`, `pdf`, `pptx`, `xlsx` e demais skills de documentos (fora do escopo do código).

**Próximos passos sugeridos:** (1) quando o documento de banco de dados for publicado, criar `unishop-database` com a `skill-creator`; (2) quando o `openapi.yaml` existir, acrescentar o contrato à `unishop-backend` e à `unishop-api`; (3) instalar Python e rodar os casos de `evals/evals.json` das skills `unishop-api` e `unishop-deploy` e, depois, a otimização da descrição de acionamento.

## 5. Instalar, atualizar e criar skills

Instalar uma skill externa (clona o repositório e copia a skill escolhida):

```bash
npx skills add <url-do-repositório> --skill <nome-da-skill>
```

O instalador guarda o conteúdo em `.agents/skills/` e cria um symlink em `.claude/skills/`. Neste projeto mantemos **uma pasta só**: depois de instalar, copie a skill para `.claude/skills/<nome>/` no lugar do symlink e apague `.agents/`.

```bash
# exemplo, a partir da raiz do projeto
rm .claude/skills/<nome> && cp -r .agents/skills/<nome> .claude/skills/<nome> && rm -rf .agents
```

Listar o que um repositório oferece antes de instalar:

```bash
npx skills add <url-do-repositório> --list
```

O `skills-lock.json`, na raiz, registra origem, caminho e hash de cada skill externa instalada. Skills próprias não entram nele.

Para criar uma skill nova, peça ao Claude para usar a `skill-creator` descrevendo o que a skill deve fazer. Boas práticas da própria skill-creator: descrição que diga quando acionar (e um pouco "insistente", para não deixar de disparar), corpo enxuto, detalhes em `references/` e teste com prompts reais antes de adotar.

## 6. Como o `CLAUDE.md` usa as skills

O `CLAUDE.md` traz um quadro "Skills do projeto: quando usar" que liga cada tipo de tarefa à skill certa, para o Claude acioná-las no contexto correto. Se uma skill for adicionada, removida ou renomeada, atualize aquele quadro e a tabela da seção 3.
