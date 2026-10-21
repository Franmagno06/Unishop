---
title: Roteiro de desenvolvimento das telas do frontend
project: Unishop
version: 0.1
date: 2026-10-21
status: rascunho para revisão da equipe
context: CLAUDE.md
related: docs/frontend/frontend.md, docs/regras-de-negócio/regras-de-negócio.md, docs/skills/skills.md, docs/backend/backend.md
---

### Histórico de versões

| Versão | Data | O que mudou |
|---|---|---|
| 0.1 | 21/10/2026 | Primeira versão: ciclo de cada tela, divergências Figma × documentos, componentes compartilhados, ordem das telas por fase e fichas de cada tela. |

# Roteiro de desenvolvimento das telas

## 1. Objetivo e como usar

Este roteiro diz **em que ordem** as telas do frontend são feitas e **como cada uma passa do Figma até o PR**. Ele não repete o que já está nos outros documentos: aponta para eles.

| Preciso saber... | Veja |
|---|---|
| Estrutura de pastas, rotas, componentes e estados de tela | [`frontend.md`](frontend.md) §5, §7, §9 e §12 |
| Regras e limites de campo | [`regras-de-negócio.md`](../regras-de-negócio/regras-de-negócio.md) |
| Rotas e erros da API (para os dados de exemplo terem o mesmo formato) | [`backend.md`](../backend/backend.md) §9 |
| Quais skills usar em cada fase | [`skills.md`](../skills/skills.md) §8 |

Se este roteiro e outro documento discordarem, vale o outro (ordem de precedência do `CLAUDE.md`), e este roteiro é corrigido.

## 2. Princípios

1. **Figma é a base visual.** As telas seguem o protótipo; o grupo avisa quando houver mudança (combinado em 20/10/2026).
2. **Divergência com regra fechada vira pergunta.** Se o Figma pedir algo que contradiz uma decisão do grupo ou um documento, não se escolhe sozinho: registra-se na seção 4 e pergunta-se.
3. **Telas antes da API.** Todas as telas são feitas primeiro, com dados de exemplo no formato do contrato (`backend.md` §9). O `openapi.yaml` e o backend só começam depois (combinado em 20/10/2026).
4. **Sem inventar.** Rota, campo ou comportamento que não esteja nos documentos, no PDF ou no Figma é registrado como "não definido".
5. **Toda tela termina com revisão, testes e estudo** (seção 3.4).

## 3. Ciclo de cada tela

### 3.1 Ideação (antes de escrever código)

Resultado: uma nota curta no cartão do Trello ou na descrição do PR. Sem a nota, a tela não começa.

- [ ] **Regras** (`unishop-rules`): códigos `RF` e `RN-XXX-nn` da tela, limites de campo (Regras §9) e o que é MVP (§8).
- [ ] **Contexto técnico** (`unishop-frontend`): rota, área, estados obrigatórios (`frontend.md` §12), códigos de erro que a tela pode receber.
- [ ] **Figma:** ler o quadro e a captura; listar o que o protótipo **não** mostra (carregando, vazio, erro, 403, 429, celular).
- [ ] **Divergências:** conferir a seção 4 e acrescentar o que aparecer.
- [ ] **Componentes** (`vercel-composition-patterns`): o que já existe em `shared/components/ui` e o que falta criar.
- [ ] **Dados de exemplo:** o formato segue o contrato de `backend.md` §9, para a troca pela API mexer só no serviço.
- [ ] **Estudo:** módulos do roadmap ligados à tela (campo "Estudo" de cada ficha).

### 3.2 Implementação

1. Estrutura da funcionalidade: `pages/`, `components/`, `hooks/`, `services/`, `schemas/`, `types/` (`frontend.md` §5).
2. Fluxo de dados: componente → hook → `services/` (o componente nunca chama a API direto).
3. Tokens do Figma (`@theme` em `src/styles/index.css`), sem valores soltos.
4. Texto de interface em português; código, pastas e arquivos em inglês; citar `RF` e `RN-XXX-nn` nos comentários onde a regra mora.
5. Nada de `dangerouslySetInnerHTML` com texto de usuário; links externos com `rel="noopener noreferrer"`; ação irreversível pede confirmação em modal.

### 3.3 Revisão (antes do PR)

| Passo | Ferramenta | O que conferir |
|---|---|---|
| 1 | `web-design-guidelines` (precisa de internet) | Rótulos, foco, contraste, erros anunciados, teclado |
| 2 | `vercel-react-best-practices` | Regras `async-`, `bundle-`, `client-`, `rerender-`, `rendering-` e `js-`; ignorar `server-*` e Next.js |
| 3 | Playwright do projeto | Capturas em 320, 390, 768 e 1440 px; sem rolagem horizontal; console sem erro; fluxo principal |
| 4 | Comparar com o Figma | Divergência só se vier de regra ou decisão do grupo |
| 5 | `/code-review` | Outro membro revisa; `/security-review` em login, pagamento, admin ou segredo |

As skills de Emil Kowalski estão **em espera** (decisão de 20/10/2026) e não fazem parte do ciclo até novo aviso.

### 3.4 Fechamento da tarefa

1. **Bateria de testes:**

   ```bash
   cd frontend
   npx tsc -b          # tipos
   npm run lint        # estilo e regras
   npm run build       # build de produção
   npm test            # unidade e componente (Vitest)
   npm run test:e2e    # fluxo (Playwright), quando a tela já tem fluxo
   ```

   O relatório diz o que passou, o que falhou e **o que ficou sem testar**.
2. **Estudo:** indicar os módulos do [Roadmap de Estudo](https://claude.ai/artifact/8ZMbqd3vKb2QLVbsADSjeN) ligados ao que foi feito e o porquê.
3. **Entrega:** branch própria, commit, PR para a `main` e revisão de outro membro (módulo F1 do roadmap). Conferir o `git status` antes do commit: nada de `.env` nem `node_modules`.
4. **Atualizar** a tabela da seção 6 (status da tela).

### 3.5 Definição de pronto (resumo)

A tela está pronta quando: fiel ao Figma com os tokens do tema; todos os estados tratados; funciona só por teclado, com rótulos e contraste verificados; sem erro de console; tem teste de componente (e de fluxo se for crítica); bateria da seção 3.4 verde; PR revisado.

## 4. Divergências conhecidas: Figma × documentos

Decisões já tomadas (o Figma está desatualizado nesses pontos e o gestor atualiza depois):

| Onde | O Figma mostra | O que o projeto faz | Motivo |
|---|---|---|---|
| Login e cadastro | Botão "Continuar com Apple" | Não existe | Apple fora do MVP (RN-ACE-14) |
| Cadastro | Campos Curso e WhatsApp | Não existem no cadastro; entram em Editar perfil | O backend não os recebe no cadastro (`backend.md` §9); RN-PER-01 |
| Início, seção Segurança | "e-mail @unifor.br" | `@edu.unifor.br` | Domínio oficial (RN-ACE-02) |

Pontos ainda **sem decisão** (adotado um padrão provisório, a confirmar):

| Tela | Ponto | Padrão provisório |
|---|---|---|
| Cabeçalho logado | Menu do avatar (Perfil, Trocar senha, Sair) previsto no `frontend.md` §9, mas não desenhado | Avatar com "PF" fixo, link para `/perfil`; o menu entra com o perfil |
| Cabeçalho logado | Navegação no celular não desenhada | Linha de links com rolagem horizontal abaixo de `md` |
| Categorias | Busca de **itens** (RN-CAT-03) não desenhada | Filtra só as categorias; "Itens encontrados" entra na tela 07, com o `ListingCard` |
| Categorias | Foto de cada categoria | Bloco azul-claro, como no Figma, até haver fotos |

## 5. Infraestrutura compartilhada

### 5.1 Já existe (21/10/2026)

`AppLayout` e `AppHeader` (avatar "PF"), `Card`, `Skeleton`, `EmptyState`, `useDebounce`, `RouteFallback` (tela de carregamento da primeira abertura), `playwright.config.ts` e a pasta `e2e/` (testes de fluxo). Desde 20/10/2026: `Button` e `ButtonLink`, `Field`, `Checkbox`, `Logo`, `FormError`, `FormNotice`; `PublicLayout` e `AuthLayout` (com link "pular para o conteúdo"); `api.ts`, `session.ts`, `query-client.ts`; `format-currency`, `use-document-title`; tokens do Figma, fontes e testes configurados.

### 5.2 A criar, na ordem em que as telas pedem

| Peça | Nasce na tela | Usada também em |
|---|---|---|
| `Pagination`, `Badge` | 07 | 05, 05c, 05d, admin |
| `ListingCard`, `ListingGrid` | 07 | 04 (itens da busca), 05 (Meus anúncios) |
| `Modal`, `ConfirmDialog` (foco preso, Esc fecha) | 08d | 05b, 05d, admin |
| `ImageGallery`, `SellerCard` | 08a | 05d |
| `Toast` | quando uma tela precisar | Várias |
| `ImageUploader` (1 imagem por requisição, até 4 MB, 1 a 5 imagens) | 06 | 05b (foto de perfil) |
| `AdminLayout`, `AdminSidebar`, `Table` | A01 | Todas as telas admin |

### 5.3 Entra com a API (depois das telas)

`PrivateRoute` e `AdminRoute` (validando que o destino `from` começa com `/` e nunca com `//`), `AuthProvider` com `GET /auth/me`, tratamento de 401, 403 e 429 em todas as telas, troca dos dados de exemplo pelos serviços reais e o `openapi.yaml`.

### 5.4 Modo de demonstração e conta de teste (21/10/2026)

Enquanto a API não existe, o login e o cadastro respondem com dados de exemplo. Liga com `VITE_USE_MOCKS=true` no `.env` (já vem assim no `.env.example`) e **só em desenvolvimento** (`npm run dev`): no build de produção o código de exemplo e as contas **não entram** (conferido com `grep` no `dist/`, com a flag desligada e ligada).

| Entrada | Resultado na tela |
|---|---|
| `aluno.teste@edu.unifor.br` + `Senha1234` | Entra e vai para `/categorias` |
| "Esqueci minha senha" com qualquer e-mail | Vai a "Verifique seu e-mail"; o botão "Abrir link do e-mail (simulação)" abre a tela de nova senha. Depois de redefinir, o login aceita a **senha nova** (e recusa a antiga) até recarregar a página. "Simular link expirado" e "Simular link inválido" mostram os alertas de erro. Redefinir zera o bloqueio de login |
| `admin.teste@unishop.local` + `Admin1234` | Entra pela `/admin/login` e vai para `/admin/usuarios` (tela ainda não existe) |
| Outro e-mail ou senha | Alerta "Não foi possível entrar. E-mail ou senha incorretos." (a senha é limpa e recebe o foco) |
| 5 senhas erradas seguidas; depois a tentativa seguinte | Alerta "Conta bloqueada. Tente de novo em 15 minutos." (RN-ACE-09) |
| `suspenso@edu.unifor.br` | Alerta "Conta suspensa" (RN-ACE-12) |
| Cadastro com `aluno.teste@edu.unifor.br` | Erro no campo do e-mail: "já tem cadastro" (409) |
| Cadastro com outro e-mail `@edu.unifor.br` | Cria a conta e leva ao login com "Conta criada!" |

**Componentes de erro** (em `shared/components/ui`): `ErrorAlert`, `SuccessAlert` e `InfoAlert` (caixa com faixa colorida, ícone, título e mensagem), `FieldError` (ícone e texto abaixo do campo) e o estado de erro do `Field` e do `Checkbox`. Em `areas/public/auth`: `PasswordRequirements` (lista que marca cada requisito da senha) e `MockModeNotice`. A cor de erro é o `--danger` (`#c62828`) do botão "Perigo" do Figma; o Figma não desenha os estados de erro, então o visual segue o padrão dos grandes sites.

**Quando a API chegar:** apagar `auth.mock.ts`, `auth.mock.test.ts`, `test-accounts.ts`, `demo-reset-token.ts`, `mock-mode.ts`, o `MockModeNotice`, o `DemoResetLinks` e a flag `VITE_USE_MOCKS`; o `auth.service.ts` já chama a API real quando o modo está desligado.

### 5.5 Botão "Voltar" (21/10/2026)

`BackLink` (`shared/components/ui`): volta para **a tela anterior do site**; se a tela foi aberta direto (link, F5, e-mail), vai ao destino padrão. É um link de verdade (Ctrl+clique abre em outra aba). Destinos padrão: login e cadastro → tela inicial; "Esqueceu a senha?" e "Criar nova senha" → login; "Verifique seu e-mail" → "Esqueceu a senha?". "Senha redefinida!" não tem "Voltar" (tem "Ir para o login"). Fica no **topo** do formulário (o Figma põe o da 03b embaixo do botão).

### 5.6 Sessão reativa, cabeçalho único e menu do perfil (21/10/2026)

- `session.ts` avisa quando o token muda e guarda também o papel (aluno ou admin, só para a interface; o backend continua sendo a barreira). `useSession()` e `useLogout()` (apaga o token, limpa o cache do TanStack Query e volta à tela inicial, trocando a entrada do histórico).
- `SiteHeader` (`shared/components/layout`) substitui `PublicHeader` e `AppHeader`: visitante (Entrar e Criar conta), aluno (Meus anúncios, "+ Anunciar item" e avatar) e admin (sem "Anunciar item"; o menu tem "Painel admin").
- `ProfileMenu`: avatar "PF" fixo (decisão de 21/10) com cartão no canto: "Ver perfil" e **"Sair" em vermelho**. Abre ao passar o mouse, ao clicar ou tocar e por Enter ou Espaço; fecha com Esc (devolve o foco ao avatar), clique ou toque fora e Tab para fora.
- Tela inicial logada: o botão do topo vira "Ver categorias" e o rodapé esconde "Criar conta". `GuestRoute`: aluno logado vai a Categorias e admin ao painel.
- Ainda **sem** `PrivateRoute`/`AuthProvider`/`GET /auth/me` (entram com a API).

## 6. Ordem das telas

Status: **Feito**, **Em andamento**, **A fazer**.

| Fase | Ordem | Tela | Rota | Figma | Status |
|---|---|---|---|---|---|
| 0 | — | Início | `/` | 01 (`3:81`) | Feito (20/10) |
| 0 | — | Cadastro | `/cadastro` | 02 (`3:176`) | Feito (20/10) |
| 0 | — | Login (e `/admin/login`) | `/login` | 03 (`3:250`) | Feito (20/10) |
| 0 | — | Estados de erro do login e do cadastro, com conta de teste | `/login`, `/cadastro` | sem quadro (padrão de alerta dos grandes sites) | Feito (21/10), ver §5.4 |
| 0 | — | Botão "← Voltar" nas telas de entrada | login, cadastro e recuperação | sem quadro (o Figma só tem na 03b) | Feito (21/10), ver §5.5 |
| 0 | — | Cabeçalho que muda com a sessão e menu do perfil (Ver perfil, Sair) | todas | sem quadro (o Figma não desenha o menu) | Feito (21/10), ver §5.6 |
| 1 | 1 | Esqueci a senha | `/recuperar-senha` | 03b (`10:325`) | Feito (21/10) |
| 1 | 2 | E-mail enviado | `/recuperar-senha/enviado` | 03c (`10:363`) | Feito (21/10) |
| 1 | 3 | Nova senha | `/redefinir-senha/:token` | 03d (`10:401`) | Feito (21/10) |
| 1 | 4 | Senha redefinida | `/senha-redefinida` | 03e (`10:440`) | Feito (21/10) |
| 2 | 5 | Categorias | `/categorias` | 04 (`3:292`) | Feito (21/10), com dados de exemplo e sem guard |
| 2 | 6 | Anúncios da categoria | `/categorias/:id` | 07 (`8:140`) | A fazer |
| 2 | 7 | Produto | `/produtos/:id` | 08a (`8:211`) | A fazer |
| 2 | 8 | Fazer pedido (pop-up) | no produto | 08d (`26:366`) | A fazer |
| 3 | 9 | Pagamento: cartão e Pix | `/pagamento/:pedidoId` | 09a (`8:375`), 09b (`8:445`) | A fazer |
| 3 | 10 | Pedido confirmado | `/pedido-confirmado/:pedidoId` | 10 (`8:512`) | A fazer |
| 3 | 11 | Meus pedidos | `/meus-pedidos` | 05c (`23:337`) | A fazer |
| 4 | 12 | Perfil e Meus anúncios | `/perfil` | 05 (`3:347`) | A fazer |
| 4 | 13 | Editar perfil e excluir conta | `/perfil/editar` | 05b (`10:484`) | A fazer |
| 4 | 14 | Anunciar item | `/anunciar` | 06 (`3:395`) | A fazer |
| 4 | 15 | Anúncio publicado | pop-up em `/anunciar` | 06b (`10:551`) | A fazer |
| 4 | 16 | Gerenciar anúncio (e pausado) | `/anuncios/:id/gerenciar` | 05d (`35:464`), 05e (`35:617`) | A fazer |
| 4 | 17 | Editar anúncio | `/anuncios/:id/editar` | usa o quadro 06 | A fazer |
| 5 | 18 | Admin: usuários (lista, detalhes, editar) | `/admin/usuarios...` | A01 (`61:602`), A02 (`62:529`), A02b (`65:702`) | A fazer |
| 5 | 19 | Admin: produtos (lista, ver, editar) | `/admin/produtos...` | A03 (`63:552`), A04 (`65:626`), A05 (`63:724`) | A fazer |
| 6 | 20 | Completar cadastro, Trocar senha, Confirmar troca de e-mail, 403, 404 e sessão expirada | ver `frontend.md` §7 | **sem quadro no Figma** | A fazer (pedir o desenho) |
| 6 | 21 | Termos de uso e Política de privacidade | `/termos`, `/privacidade` | sem quadro | Existem só como "em elaboração"; texto é do Francisco |

**Por que esta ordem:** as telas de recuperação de senha completam o fluxo de entrada já feito; Categorias abre a área logada e cria a infraestrutura dela; o `ListingCard` nasce na tela 07 e é reaproveitado por Categorias, Perfil e Meus anúncios; Produto precisa da galeria e do pop-up de pedido antes do Pagamento; Anunciar vem depois do Perfil porque o `ImageUploader` é reaproveitado na foto de perfil; o painel admin vem por último por ter layout próprio.

## 7. Fichas das telas

Para cada tela: regras, componentes novos, estados além do caminho feliz e módulos de estudo (roadmap). Os estados comuns (carregando, erro de rede, 401, 403, 404) de `frontend.md` §12 valem para todas e não se repetem.

### Fase 1 · Recuperação de senha (03b a 03e)

- **Regras:** RF004.1 a RF004.7, RN-ACE-04 (senha), RN-ACE-10 (link de 30 minutos, uso único).
- **Rotas e API futura:** `POST /auth/forgot-password`; `POST /auth/reset-password {token, nova senha, confirmação}`.
- **Componentes:** reaproveita `AuthLayout`, `Field`, `FormError`; indicador dos requisitos da senha (`PasswordRequirements`).
- **Estados especiais:** link expirado ou já usado; resposta igual exista ou não o e-mail (não revelar cadastro); 429.
- **Estudo:** B3 (formulários e validação), B2 (parâmetro `:token`), E1 (token de recuperação).

### Fase 2 · Navegação do catálogo

**Ordem 5 · Categorias** (Figma 04; plano aprovado em 21/10)
- **Regras:** RF006, RN-CAT-01 a 04. Contagem "N anúncios" (singular para 1).
- **Componentes:** `AppLayout`, `AppHeader`, `Card`, `Skeleton`, `EmptyState`, `CategorySearch` (texto em `?q=`), `CategoryCard`.
- **Estados especiais:** busca sem resultado (limpar busca).
- **Acesso sem API:** pelo link "Categorias" do cabeçalho da tela inicial; sem guard até a API.
- **Estudo:** B1, B2 (seções 4 e 5), B4.

**Ordem 6 · Anúncios da categoria** (Figma 07)
- **Regras:** RF007, RN-ANU-05 (só anúncio ativo), RN-ANU-06 (filtro de preço e ordenação).
- **Componentes:** `ListingCard`, `ListingGrid`, `ListingFilters`, `Pagination`, `Badge`.
- **Estado na URL:** categoria, preço, ordenação e página na query string.
- **Estudo:** B2 (busca e parâmetros na URL), B1, B4.

**Ordem 7 · Produto** (Figma 08a)
- **Regras:** RF008, RN-ANU-03 (galeria), RN-ANU-10 (esconder "Fazer pedido" no próprio anúncio), RN-PER-04 (WhatsApp só logado), RN-EST-02.
- **Componentes:** `ImageGallery`, `SellerCard` (selo de aluno verificado), botão "Fazer pedido".
- **Estados especiais:** anúncio indisponível (`LISTING_UNAVAILABLE`), próprio anúncio (`OWN_LISTING`), sem estoque, 404.
- **Estudo:** B4, B1, A2.

**Ordem 8 · Fazer pedido, pop-up** (Figma 08d)
- **Regras:** RF009, RN-PED-04 (dois caminhos), RN-PED-05, RN-PED-10 (reaproveita pedido aberto), RN-EST-02 (quantidade até o disponível).
- **Componentes:** `Modal` com foco preso e Esc, `MakeOrderModal`, `whatsappLink`.
- **Estudo:** B4 (acessibilidade de modal), B1 (`useMutation`).

### Fase 3 · Compra

**Ordem 9 · Pagamento (cartão e Pix)** (Figma 09a e 09b)
- **Regras:** RF010, RN-PAG-02 e 03 (cartão vira token no navegador; campos), RN-PAG-04 (Pix expira em 30 min; pedido cancelado, novo pedido), RN-PAG-07 (recusado: tentar de novo), RN-PAG-09 (resumo), RN-PAG-11 (só mostra "pago" se o pedido estiver Pago), RN-PAG-15 (aviso de demonstração).
- **Componentes:** `PaymentMethodTabs`, `CardPaymentForm`, `PixPayment` (QR Code, copia e cola, contador), `OrderSummary`, `DemoEnvironmentNotice`.
- **Estados especiais:** Pix expirado, pagamento recusado, sem estoque após pagar (estorno), 429.
- **Dados de exemplo:** o SDK do Mercado Pago ainda não está integrado; o cartão usa campos e validação, sem token real. Nunca se envia dado de cartão ao servidor do Unishop.
- **Estudo:** E3 (integrações), B3 (formulários), C1.

**Ordem 10 · Pedido confirmado** (Figma 10) — RF011, RN-PED-03 (número do pedido), RN-PAG-11. **Estudo:** B1.

**Ordem 11 · Meus pedidos** (Figma 05c)
- **Regras:** RF014, RN-PED-06 (do mais recente ao mais antigo), RN-PED-08 ("Confirmar recebimento" em Retirada combinada), RN-PED-12 ("Cancelar pedido" só em Pendente e Em negociação).
- **Componentes:** `OrderCard`, `OrderStatusBadge`, `CancelOrderDialog`, `ConfirmReceiptDialog`.
- **Estudo:** B1, B4.

### Fase 4 · Venda e perfil

**Ordem 12 · Perfil e Meus anúncios** (Figma 05) — RF012; `ProfileHeader`, `MyListingsList` (reaproveita `ListingCard`). **Estudo:** B4.

**Ordem 13 · Editar perfil e excluir conta** (Figma 05b)
- **Regras:** RF013, RN-PER-01, 02, 05, 06 e 07 (nome, curso, WhatsApp só dígitos com DDD, foto até 4 MB, e-mail novo pede confirmação, excluir pede digitar "EXCLUIR").
- **Componentes:** `AvatarUploader`, `DeleteAccountModal`, `ChangeEmailForm`.
- **Estados especiais:** exclusão bloqueada (`HAS_OPEN_PAID_ORDERS`), imagem grande demais, tipo inválido.
- **Estudo:** B3, E2 (LGPD e anonimização).

**Ordens 14 e 15 · Anunciar item e anúncio publicado** (Figma 06 e 06b)
- **Regras:** RF015, RF016, RN-ANU-01 a 03 e 12 (obrigatórios, preço, 1 a 5 imagens JPG ou PNG de até 4 MB), RN-ANU-07.
- **Componentes:** `ListingForm` (modos criar e editar), `ImageUploader` (uma imagem por requisição, com progresso "2 de 4" e nova tentativa), `PublishedListingModal`.
- **Estados especiais:** `FILE_TOO_LARGE`, tipo inválido, falha em uma imagem sem perder o anúncio.
- **Estudo:** B3, B4, C3 (upload).

**Ordem 16 · Gerenciar anúncio e anúncio pausado** (Figma 05d e 05e)
- **Regras:** RF017, RN-ANU-04, 08 e 09, RN-PED-07, 08, 12 e 13, RN-EST-06.
- **Componentes:** `ListingStatusBadge`, `ListingStatsCards`, `ReceivedOrdersList` ("Combinar retirada", "Concluir venda", "Encerrar negociação"), `MarkAsSoldModal`, `DeleteListingModal`.
- **Estados especiais:** `HAS_OPEN_ORDERS`, `HAS_OPEN_PAID_ORDERS`, conclusão recusada por estoque (409: mostrar a mensagem e manter o botão).
- **Estudo:** B1, B4.

**Ordem 17 · Editar anúncio** — mesmo formulário da criação (RF015.7, RF017.6). **Estudo:** B3.

### Fase 5 · Administração

- **Regras:** RF019 a RF024, RN-ADM-02, 04, 06, 07 e 11; admin não compra, não paga nem anuncia.
- **Componentes:** `AdminLayout` (menu lateral), `UsersTable`, `ProductsTable`, `StatsCards`, `UserForm`, `ProductForm`, `SellerSearchSelect`, modais de excluir e de "salvo".
- **Estados especiais:** `ADMIN_PROTECTED` (botão oculto na própria conta; último admin não é removido).
- **Estudo:** B2 (`AdminRoute` e layout aninhado), E2 (autorização), B4.

### Fase 6 · Telas sem desenho

Pedir ao grupo o desenho no Figma de: **Completar cadastro** (RN-ACE-06 e 14: aceite dos Termos, curso e WhatsApp opcionais), **Trocar senha** (RN-ACE-15), **Confirmar troca de e-mail** (RN-PER-02) e as telas de **403, 404 e sessão expirada**. Até lá, não se inventa o visual.

## 8. Quando a API chegar

1. Escrever o `openapi.yaml` (Pedro) e gerar os tipos a partir dele.
2. Trocar os dados de exemplo pelos serviços reais, tela por tela, sem mexer nos componentes.
3. Criar `PrivateRoute`, `AdminRoute` e `AuthProvider`; tratar 401, 403 e 429 em todas as telas.
4. Integrar o Google Identity Services e o SDK do Mercado Pago.
5. Rodar de novo a bateria da seção 3.4 e os fluxos de ponta a ponta (cadastro, compra por Pix de teste, anúncio).

## 9. Pendências que afetam as telas

- Fotos das categorias e do carrossel da tela inicial (hoje, blocos azul-claros).
- Número de WhatsApp do suporte (`VITE_SUPPORT_WHATSAPP`) e texto de Termos e Privacidade.
- Desenho das telas da Fase 6 e do menu do avatar.
- Logo otimizado (o PNG atual tem 506 KB para aparecer em 48 px).
- Links âncora da tela inicial que recarregam a página, e a tela inicial carregada com `lazy` (achados da revisão de 20/10).
- Testes ainda faltando: `RegisterPage`, tela inicial, carrossel e FAQ.
