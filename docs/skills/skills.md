---
title: Documentação — Skills do Claude Code
project: Unishop
version: 0.5
date: 2026-10-20
status: rascunho para revisão da equipe
context: CLAUDE.md
related: docs/regras-de-negócio/regras-de-negócio.md, docs/BancoDeDados/bd.md, docs/frontend/frontend.md, docs/backend/backend.md, docs/api/api.md, docs/deploy/deploy.md
---

### Histórico de versões

| Versão | Data | O que mudou |
|---|---|---|
| 0.3 | 15/10/2026 | Skills `unishop-api` e `unishop-deploy`, análise de cobertura e skills externas de deploy, banco e e-mail. |
| 0.4 | 16/10/2026 | Revisão das quatro skills `unishop-*` contra o conjunto de documentos de 16/10 (Regras v0.4, Banco v0.2, Backend v0.3, Frontend v0.4, API v0.3, Deploy v0.3). Duas skills novas: `unishop-database` e `unishop-rules`. Quadro "Quando usar em cada etapa do projeto" (seção 7). Análise de cobertura atualizada. |
| 0.5 | 20/10/2026 | Sete skills de Emil Kowalski (UX/UI e animação) instaladas. Roteiro de ideação, implementação e revisão de cada tela do frontend (seção 8), com a lista das próximas telas e seus quadros no Figma. |

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
| `unishop-database` | Própria | Banco: as 8 tabelas em português, `@map` do Prisma, constraints, migração `0_init` + manual, seed, papéis, estoque atômico, liquidação, anonimização | Schema, migração, repository, consulta SQL, seed, exclusão ou anonimização de dados |
| `unishop-rules` | Própria | Regras de negócio: índice das RN-XXX-nn, ciclo de vida, permissões, escopo do MVP, limites de campos, desvios do PDF | Dúvida de "pode ou não pode", critério de aceite, teste de regra, conflito entre documentos |
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
| `emil-design-eng` | Emil Kowalski (MIT) | Polimento de UI, detalhes de componente e decisões de animação | Acabamento visual das telas (início, login, cadastro) |
| `animate` | Emil Kowalski (MIT) | Construir animação escolhendo curva, duração e propriedades; só anima o que faz sentido | Transições, feedback de botão, aparecer e sumir de elementos |
| `animation-performance` | Emil Kowalski (MIT) | Animação sem perder quadros (propriedades baratas, CSS × JS, `will-change`) | Animação travando ou escolha entre CSS e JS |
| `review-animations` | Emil Kowalski (MIT) | Revisão rigorosa do código de animação (só roda quando chamada) | Depois de escrever animação, antes do PR |
| `find-animation-opportunities` | Emil Kowalski (MIT) | Aponta onde animar e onde não animar (só leitura) | Revisar uma tela pronta |
| `break-ui` | Emil Kowalski (MIT) | Testa a tela com dados extremos (nome e e-mail longos, listas vazias, números enormes) | Formulários de login e cadastro, cartões de anúncio |
| `mobile-native` | Emil Kowalski (MIT) | Ajustes para o site parecer app no celular (zoom em campo, `100vh`, toque, área segura) | Telas pensadas para celular |

> As skills de Emil Kowalski vêm de `github.com/emilkowalski/skills` (commit `2d22863`, 11/10/2026). Foram lidas por inteiro (só Markdown, sem scripts) antes de entrar. Ficaram de fora `animate-expo`, `write-swift` (não se aplicam), `ask-sonner` e `pick-ui-library` (a stack do projeto está fechada, sem Sonner), `apple-design`, `prototype`, `improve-animations` e `animation-vocabulary` (podem entrar depois). A regra de cada skill é sugestão de acabamento: **não** muda regra de negócio nem a stack, e em conflito valem os documentos do projeto.

### 3.1 `unishop-frontend`, `unishop-backend`, `unishop-api`, `unishop-deploy`, `unishop-database` e `unishop-rules` (próprias)

Resumos operacionais, escritos para o Unishop, dos documentos [frontend](../frontend/frontend.md) (v0.4), [backend](../backend/backend.md) (v0.3), [API](../api/api.md) (v0.3), [deploy](../deploy/deploy.md) (v0.3), [banco de dados](../BancoDeDados/bd.md) (v0.2) e [regras de negócio](../regras-de-negócio/regras-de-negócio.md) (v0.4). Em 16/10/2026 as quatro primeiras foram revisadas contra o conjunto atualizado (4 MB confirmado, Google no MVP, jobs de 30 minutos, três papéis de banco, estados em português, liquidação com anúncio ativo, exclusão lógica) e as duas últimas foram criadas com a `skill-creator`. Todas trazem casos de teste em `evals/evals.json` (ainda não executados: a máquina não tem Python, que os scripts de avaliação e o visualizador exigem). Cada uma lista as regras que nunca podem ser violadas, as convenções, os estados e o critério de "pronto", e aponta para a doc completa, que é a fonte de verdade. Também dizem quais outras skills combinar. Não entram no `skills-lock.json`: são mantidas à mão, junto com o código.

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
| Modelo de dados do projeto (tabelas, migração, papéis, anonimização) | `unishop-database` + `supabase-postgres-best-practices` | Coberta (`docs/BancoDeDados/bd.md` v0.2) |
| Regras de negócio, escopo do MVP, limites de campos, desvios do PDF | `unishop-rules` | Coberta (`docs/regras-de-negócio/` v0.4) |
| Revisão de código e segurança | Comandos nativos `/code-review` e `/security-review` | Coberta pelo Claude Code |

**Não instaladas de propósito:** `deploy-to-vercel` (foi instalada, revisada e **removida**: o plano B dela envia o projeto inteiro, sem login, a um endpoint da Vercel e vem com um `Archive.zip` solto; o Unishop publica por `git push`); `vercel-optimize` (foco em Next.js e em projetos já no ar; reavaliar depois do deploy); `neon`, `neon-auth`, `neon-functions`, `neon-object-storage`, `neon-ai-gateway`, `neon-realtime` e `neon-postgres-egress-optimizer` (empurram recursos do Neon que o projeto não usa); `react-email` e `agent-email-inbox` (fora da stack de e-mail); `cloudinary-docs` (oficial, mas busca documentação em tempo de execução e a auditoria do `skills.sh` a marca como risco médio; a `unishop-api` cobre o uso do Unishop); skills do Mercado Pago (só existem as da comunidade, nenhuma oficial); `supabase` (o banco em nuvem é o Neon, não o Supabase); `vercel-react-native-skills` (o produto é web); `vercel-react-view-transitions` (animações de rota não são requisito); `frontend-design` (o projeto segue fielmente o Figma, e a skill incentiva criar estilos novos); `writing-guidelines` (a documentação é em português do Brasil); `docx`, `pdf`, `pptx`, `xlsx` e demais skills de documentos (fora do escopo do código).

**Skills avaliadas e não criadas (16/10/2026):** *testes* (as estratégias de teste já estão em Backend §19, Frontend e nas Regras §7, e `webapp-testing` cobre a execução no navegador; uma skill própria só repetiria esses textos) e *manutenção da documentação* (o fluxo "documento mudou, revisar a skill" já está no `CLAUDE.md` e na seção 3.1). Reavaliar se o código revelar um fluxo repetido que nenhuma skill cubra.

**Próximos passos sugeridos:** (1) quando o `openapi.yaml` existir, acrescentar o contrato à `unishop-backend`, à `unishop-frontend` e à `unishop-api` (e criar `unishop-openapi` só se o arquivo ficar grande); (2) instalar Python e rodar os casos de `evals/evals.json` das seis skills `unishop-*` e, depois, a otimização da descrição de acionamento (`run_loop`); (3) revisar as skills sempre que os documentos mudarem de versão, atualizando o campo `version` delas.

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

O `CLAUDE.md` traz um quadro "Skills do projeto: quando usar" que liga cada tipo de tarefa à skill certa, para o Claude acioná-las no contexto correto, e o fluxo por etapa do trabalho (seção 7 deste documento). Se uma skill for adicionada, removida ou renomeada, atualize aquele quadro e a tabela da seção 3.

## 7. Quando usar em cada etapa do projeto

O projeto hoje está só em documentação; as etapas abaixo valem para quando o grupo liberar o código. Em cada uma, a skill da coluna "Começar por" dá o contexto do Unishop, e as "Combinar com" trazem a técnica geral.

| Etapa | Começar por | Combinar com | Observação |
|---|---|---|---|
| 1. Entender o que construir | `unishop-rules` | Documento de regras (§4 a 5 e §8) | Confirme o escopo do MVP (§8), os limites de campos (§9) e os desvios do PDF (§10) antes de estimar tarefas |
| 2. Preparar banco e esqueleto do backend | `unishop-database`, `unishop-backend` | `supabase-postgres-best-practices`, `neon-postgres`, `neon-postgres-branches` | Gerar `schema.prisma`, migração `0_init`, migração manual e seed; testar a migração em banco vazio |
| 3. Contrato da API | `unishop-backend`, `unishop-api` | — | Escrever o `openapi.yaml` (pendência de Pedro) antes de o frontend consumir as rotas |
| 4. Integrar serviços externos | `unishop-api` | `resend`, `email-best-practices`; `/security-review` | Comece pelo Pix de teste do Mercado Pago (prova de conceito) e pelo Google; domínio próprio para o Resend |
| 5. Regras do servidor (auth, pedidos, pagamentos, admin) | `unishop-backend` | `unishop-rules`, `unishop-database` | Cada rota cita `RN-XXX-nn`; testes de concorrência de estoque e de webhook |
| 6. Telas do frontend | `unishop-frontend` | Roteiro da seção 8: ideação com `unishop-rules`, `emil-design-eng`, `vercel-composition-patterns`, `mobile-native` e `break-ui`; revisão com `web-design-guidelines`, `vercel-react-best-practices`, `review-animations` e `break-ui` | Trate todos os estados de tela; sessão, imagem de 4 MB e aviso de demonstração |
| 7. Verificar rodando | `webapp-testing` | `unishop-frontend` | Screenshots, console e fluxos de ponta a ponta (cadastro, compra por Pix de teste, anúncio) |
| 8. Publicar | `unishop-deploy` | `vercel-cli-with-tokens`, `neon-postgres`, `unishop-api` | Só executar deploy, troca de variável ou restauração quando o usuário pedir, confirmando o alvo |
| 9. Antes do PR | `/code-review` | `/security-review` em auth, pagamento, admin ou segredo | Conferir se algum documento ou skill precisa mudar |
| 10. Manter | `skill-creator` | — | Documento mudou? Revisar a skill correspondente, atualizar `version` e os casos em `evals/` |

## 8. Roteiro de cada tela do frontend: ideação, implementação e revisão

> **Em 20/10/2026 o gestor pausou o uso das skills de Emil Kowalski** (`emil-design-eng`, `animate`, `animation-performance`, `review-animations`, `find-animation-opportunities`, `break-ui`, `mobile-native`): ficam instaladas, mas o roteiro abaixo roda sem elas até novo aviso. Valem normalmente `unishop-rules`, `unishop-frontend`, `vercel-composition-patterns`, `web-design-guidelines`, `vercel-react-best-practices` e o Playwright. Toda tarefa termina com revisão, bateria de testes e indicação de estudo no roadmap (CLAUDE.md, "Fluxo de trabalho com o gestor").

Toda tela nova passa pelas três fases abaixo, nesta ordem. As skills só sugerem acabamento e padrões: **não mudam regra de negócio, stack nem rota**, e em conflito valem os documentos (ordem do `CLAUDE.md`). Só entram aqui skills que estão em `.claude/skills/`.

### 8.1 Ideação (antes de escrever código)

Resultado: uma nota curta (no cartão do Trello ou na descrição do PR) com as decisões abaixo. Sem nota, a tela não começa.

| Passo | Skill ou fonte | O que decidir e registrar |
|---|---|---|
| 1. Regras | `unishop-rules` | Códigos `RN-XXX-nn` e `RF` da tela, limites de campo (Regras §9), o que é MVP (§8) e o que o Figma mostra que o documento não permite (ex.: botão da Apple) |
| 2. Contexto técnico | `unishop-frontend` (e `unishop-backend` se usar a API) | Rota, área, guard, endpoints e códigos de erro; lista dos estados obrigatórios da tela (frontend.md §12) |
| 3. Design | Figma (quadro da tabela 8.3) | Ler o quadro e a captura; anotar o que o protótipo não mostra (carregando, vazio, erro, 403, 429) |
| 4. Componentes | `vercel-composition-patterns` | O que já existe em `shared/components/ui` e o que falta criar; sem props booleanas em excesso |
| 5. Movimento e acabamento | `emil-design-eng`, `find-animation-opportunities` | O que anima e por quê (frequência de uso, propósito, curva, duração abaixo de 300 ms); o que **não** anima; comportamento com `prefers-reduced-motion`. A `find-animation-opportunities` só lê e propõe |
| 6. Celular | `mobile-native` | Teclado e `inputmode` dos campos, zoom em campo, `100dvh`, área segura, alvos de toque, `hover` só com ponteiro fino |
| 7. Casos extremos | `break-ui` (só a lista) | Nome e e-mail longos, lista vazia, números enormes, texto sem espaço, emoji; decidir truncar, quebrar ou limitar |

### 8.2 Implementação

1. Seguir a nota da ideação e o checklist da `unishop-frontend` (tokens do Figma, estados, teclado, console limpo, teste).
2. Animação nova: `animate` (decide a curva, a duração e as propriedades; só `transform` e `opacity`).
3. Texto de interface em português, código em inglês; citar `RF` e `RN-XXX-nn` nos comentários onde a regra mora.

### 8.3 Revisão (antes do PR)

| Passo | Skill ou ferramenta | O que conferir |
|---|---|---|
| 1. Acessibilidade e UX | `web-design-guidelines` (precisa de internet) | WCAG 2.1 AA: rótulos, foco, contraste, erros anunciados, navegação por teclado |
| 2. Performance | `vercel-react-best-practices` | Só as regras `async-`, `bundle-`, `client-`, `rerender-`, `rendering-` e `js-`; ignorar `server-*` e Next.js |
| 3. Movimento | `review-animations` (só roda quando chamada de propósito); `animation-performance` se travar | Curva, duração, `transition: all`, `scale(0)`, hover sem media query. A saída é uma tabela Antes / Depois / Por quê |
| 4. Dados extremos | `break-ui` | Renderizar a tela com o pior caso realista. A skill cria um alternador "Demo / Pior caso": **remover antes do PR** |
| 5. Rodando | `webapp-testing` ou o Playwright do projeto | Capturas em 1440 px e 390 px, console sem erro, fluxo principal. A `webapp-testing` precisa de Python, que ainda não está instalado; enquanto isso, usar o `@playwright/test` do frontend |
| 6. Fidelidade | Figma | Comparar a captura da tela com o quadro; divergência só se vier de regra ou decisão do grupo, e registrada na nota |
| 7. Código | `/code-review`; `/security-review` em login, pagamento, admin ou segredo | Outro membro revisa, com lint e testes verdes |

### 8.4 Próximas telas (ordem sugerida, ainda não decidida pelo grupo)

> A ordem completa, o ciclo de cada tela e as fichas por tela estão em [`docs/frontend/roteiro-telas.md`](../frontend/roteiro-telas.md). A tabela abaixo é o resumo.

Tela inicial, login e cadastro já existem (20/10/2026). Os quadros são do Figma "Unishop — Protótipo", página "Fluxo — Telas — Usuário". Os estados obrigatórios (frontend.md §12) valem para todas.

| Ordem | Tela | Rota | Quadro no Figma |
|---|---|---|---|
| 1 | Esqueci a senha; e-mail enviado; nova senha; senha redefinida | `/recuperar-senha`, `/recuperar-senha/enviado`, `/redefinir-senha/:token`, `/senha-redefinida` | 03b, 03c, 03d, 03e |
| 2 | Categorias | `/categorias` | 04 |
| 3 | Anúncios da categoria | `/categorias/:id` | 07 |
| 4 | Produto e pop-up "Fazer pedido" | `/produtos/:id` | 08a, 08d |
| 5 | Pagamento (cartão e Pix) e pedido confirmado | `/pagamento/:pedidoId`, `/pedido-confirmado/:pedidoId` | 09a, 09b, 10 |
| 6 | Perfil, editar perfil e excluir | `/perfil`, `/perfil/editar` | 05, 05b |
| 7 | Anunciar e anúncio publicado | `/anunciar` | 06, 06b |
| 8 | Meus pedidos | `/meus-pedidos` | 05c |
| 9 | Gerenciar anúncio (e pausado) | `/anuncios/:id/gerenciar` | 05d, 05e |
| 10 | Painel do administrador | `/admin/*` | página "Administrador" |

Sem quadro identificado no Figma: "Completar cadastro", "Trocar senha", "Confirmar troca de e-mail" e as telas de erro (403, 404 e sessão expirada). Conferir com quem desenhou antes de criar.
