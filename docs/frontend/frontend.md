---
title: Documentação Técnica — Frontend
project: Unishop
version: 0.4
date: 2026-10-16
status: vigente; alinhado ao conjunto de documentos de 16/10/2026
owners: Pedro Cândido (frontend e API), Francisco Magno (integração front-back)
context: README.md
related: docs/regras-de-negocio/regras-de-negocio.md, docs/banco-de-dados/banco-de-dados.md, docs/backend/backend.md, docs/api/api.md, docs/deploy/deploy.md
based_on: Regras de Negócio v0.4, Backend v0.3, API v0.3, Deploy v0.3
language: pt-BR (código e pastas em inglês; interface em português)
---

# Documentação Técnica — Frontend

- Versão 0.4 · 16/10/2026
- Responsáveis: Pedro Cândido (frontend e API) · Francisco Magno (integração front-back)
- Regras de negócio: ver "Documentação Técnica — Regras de Negócio" (docs/regras-de-negocio/regras-de-negocio.md)

### Histórico de versões

| Versão | Data | O que mudou |
|---|---|---|
| 0.3 | 13/10/2026 | Estrutura por área, rotas do protótipo, envio de uma imagem por requisição. |
| 0.4 | 16/10/2026 | Alinhado às Regras v0.4, Backend v0.3 e API v0.3. **Telas e rotas que faltavam:** completar cadastro (Google), trocar senha, confirmar troca de e-mail, confirmar e-mail (atrás da chave), Termos e Privacidade, 404. **Sessão:** JWT em memória com cópia em `sessionStorage` e restauração por `GET /auth/me`. **Pedidos:** cancelar (comprador), encerrar negociação e concluir (vendedor), retirada combinada, pedido aberto reaproveitado. **Pagamento:** aviso de ambiente de demonstração (RN-PAG-15), Pix expirado vira pedido cancelado. **Erros:** conta suspensa, e-mail não confirmado, 429, 502, 413, `TERMS_NOT_ACCEPTED`, `HAS_OPEN_*`. Limite de imagem de **4 MB** confirmado pelo grupo. Tabela de regras no frontend ampliada. Caminhos de pasta sem acento. |

## 1. Objetivo

O frontend é a aplicação web que visitantes, alunos e administradores usam no Unishop. Ele mostra os anúncios, conduz a compra e a venda e consome a API REST do backend (`/api/v1`). Regras de segurança e de dinheiro ficam sempre no backend; o frontend valida só para responder rápido ao usuário.

São três atores, e cada um tem uma **área** própria no código, com layout, rotas e telas separados:

| Área | Ator | O que faz |
|---|---|---|
| `public` | Visitante | Vê a tela inicial, cria conta, entra (e-mail e senha ou Google) e recupera a senha. |
| `user` | Aluno logado | Navega nas categorias, compra, anuncia, acompanha e cancela pedidos, e edita o perfil e a senha. |
| `admin` | Administrador | Gerencia usuários e produtos no painel. |

> O visitante só enxerga a tela inicial (inclusive o carrossel de anúncios recentes). Categorias, listagens e página do produto são telas internas, que exigem login (RF003.4, RF005.1).

## 2. Arquitetura e stack

É uma SPA (página única) que fala com a API Express por HTTPS. As versões exatas ficam no `package.json`; aqui só se registra a escolha.

| Item | Escolha | Para quê |
|---|---|---|
| Linguagem e UI | React + TypeScript | Telas e componentes tipados |
| Build e servidor de dev | Vite | Projeto rápido, recarrega ao salvar |
| Estilo | Tailwind CSS | Estilos por classes, direto no JSX |
| Rotas | React Router | Navegação e guards por área |
| Dados do servidor | TanStack Query | Cache e atualização das listas |
| Formulários e validação | React Hook Form + Zod | Validação dos campos |
| Testes | Vitest, Testing Library, Playwright | Unidade, componente e fluxo completo |
| Login Google | Google Identity Services (botão oficial) | Entrega o ID token que a API valida (`POST /auth/google`) |
| Pagamento | SDK do Mercado Pago (chave pública de teste) | Gera o token do cartão no navegador |
| Design | Figma | Protótipos de usuário e de admin |

## 3. Criando o projeto do zero

Pré-requisito: Node.js (versão LTS) e npm. Confira com `node -v` e `npm -v`. Os comandos abaixo rodam na raiz do monorepo (`unishop/`), onde fica a pasta `frontend/`.

### Passo 1 · Criar o projeto com Vite

O comando oficial é `npm create vite@latest` (ele baixa o criador de projetos do Vite). Escolha o modelo React com TypeScript:

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

### Passo 2 · Rodar para conferir

```bash
npm run dev        # abre em http://localhost:5173
```

Se aparecer a página inicial do Vite com React, a base está certa.

### Passo 3 · Instalar o Tailwind CSS

```bash
npm install tailwindcss @tailwindcss/vite
```

Registre o plugin no `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

Crie `src/styles/index.css` com apenas:

```css
@import "tailwindcss";
```

Confirme que o `main.tsx` importa `./styles/index.css`. Para testar, troque o conteúdo do `App.tsx`:

```tsx
export default function App() {
  return <h1 className="p-8 text-3xl font-bold text-indigo-600">Unishop</h1>
}
```

Se o título aparecer grande, azul-arroxeado e em negrito, o Tailwind está funcionando. Apague o `App.css` e o `index.css` que vieram no modelo.

> O Tailwind 4 não usa `tailwind.config.ts`. As cores, fontes e espaçamentos do Figma entram no bloco `@theme` do `src/styles/index.css`. Assim o código usa os mesmos nomes do design e ninguém escreve valor solto.

### Passo 4 · Bibliotecas do projeto

```bash
npm install react-router @tanstack/react-query react-hook-form zod
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

## 4. Como executar

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com recarga automática |
| `npm run build` | Gera a versão de produção na pasta `dist/` |
| `npm run preview` | Abre a versão de produção localmente para conferir |
| `npm run lint` | Verifica o estilo do código |
| `npm run test` | Roda os testes unitários e de componente |

Variáveis de ambiente ficam em `.env` (copie de `.env.example`). No Vite, só as que começam com `VITE_` chegam ao navegador, e por isso nunca devem guardar segredo:

```bash
VITE_API_URL=http://localhost:3000/api/v1
VITE_MP_PUBLIC_KEY=            # chave pública (de teste) do Mercado Pago, usada pelo SDK de pagamento
VITE_GOOGLE_CLIENT_ID=         # Client ID do login com Google (MVP)
VITE_TURNSTILE_SITE_KEY=       # site key do anti-bot (Turnstile); só depois do MVP
```

Em **produção** (Vercel) o site e a API ficam em domínios diferentes, então o `VITE_API_URL` é o endereço completo da API, por exemplo `https://<api>.vercel.app/api/v1`. O Vite lê as variáveis `VITE_*` **na hora do build**: para trocá-las é preciso refazer o deploy do site. As quatro são públicas (a `VITE_TURNSTILE_SITE_KEY` só entra depois do MVP); nunca coloque segredo nelas (nada com "SECRET", "TOKEN" ou chave privada pode começar com `VITE_`; um teste varre o `dist/` depois do build, `docs/api/api.md`, seção 5.8). O guia completo está em [`docs/deploy/deploy.md`](../deploy/deploy.md).

## 5. Estrutura de pastas

Organizada por **área** (um ator por área) e, dentro dela, por funcionalidade. O que é usado pelas três áreas fica em `shared/`.

```text
frontend/
├─ public/                 # favicon, logo, imagens estáticas
├─ index.html
├─ vite.config.ts · tsconfig.json · .env.example
├─ vercel.json             # devolve o index.html em qualquer rota (React Router) e cabeçalhos de segurança
└─ src/
   ├─ main.tsx
   ├─ app/
   │  ├─ App.tsx
   │  ├─ providers/        # AuthProvider, QueryProvider, ToastProvider
   │  └─ router/
   │     ├─ index.tsx      # junta as rotas das 3 áreas
   │     └─ guards/        # GuestRoute, PrivateRoute, AdminRoute
   ├─ areas/
   │  ├─ public/           # VISITANTE
   │  │  ├─ layout/        # PublicLayout, PublicHeader, Footer
   │  │  ├─ routes.tsx
   │  │  ├─ landing/       # LandingPage, Hero, Carousel, FAQ...
   │  │  ├─ auth/          # Login, Register, ForgotPassword, CheckEmail,
   │  │  │                 # ResetPassword, ResetSuccess, VerifyEmail (com a chave ligada)
   │  │  └─ legal/         # Terms, Privacy (textos definidos no desenvolvimento)
   │  ├─ user/             # ALUNO LOGADO
   │  │  ├─ layout/        # AppLayout, AppHeader
   │  │  ├─ routes.tsx
   │  │  ├─ categories/
   │  │  ├─ listings/      # listagem, produto, criar/editar, gerenciar
   │  │  ├─ orders/        # Meus pedidos, MakeOrderModal, cancelar pedido
   │  │  ├─ checkout/      # Pagamento (cartão, Pix, aviso de demonstração), Pedido confirmado
   │  │  ├─ onboarding/    # CompleteProfile (primeiro acesso por Google)
   │  │  └─ profile/       # Perfil, Editar perfil, ChangePassword, ConfirmEmailChange
   │  └─ admin/            # ADMINISTRADOR
   │     ├─ layout/        # AdminLayout, AdminSidebar
   │     ├─ routes.tsx
   │     ├─ users/         # lista, detalhes, editar
   │     └─ products/      # lista, ver, editar
   ├─ shared/              # usado pelas 3 áreas
   │  ├─ components/ui/    # Button, Input, Modal, Badge, Card, Table, Pagination,
   │  │                    # ConfirmDialog, Toast, Skeleton, EmptyState
   │  ├─ hooks/            # useDebounce, usePagination, useCopyToClipboard
   │  ├─ lib/              # api.ts (cliente HTTP), queryClient, session.ts (token)
   │  ├─ utils/            # formatCurrency, formatDate, whatsappLink
   │  ├─ constants/        # rotas, categorias, status
   │  └─ types/
   ├─ styles/              # index.css (Tailwind + tokens do Figma)
   └─ assets/              # ícones e imagens importadas no código
```

Dentro de cada subpasta de área (`listings/`, `users/` etc.) vale o mesmo molde:

```text
<funcionalidade>/
├─ pages/        # telas completas (uma por rota)
├─ components/   # componentes usados só nessa funcionalidade
├─ hooks/        # useXxx (dados, formulários)
├─ services/     # chamadas à API
├─ schemas/      # validação de formulários (Zod)
└─ types/
```

## 6. Regras e convenções

### Regras que mantêm as áreas separadas

| Regra | Motivo |
|---|---|
| `admin/` nunca importa de `user/` ou `public/` (e vice-versa) | As áreas não ficam acopladas |
| O que as áreas dividem sobe para `shared/` | Exemplos: botões, modais, formatadores |
| O `routes.tsx` de cada área é carregado com lazy loading (`React.lazy`) | O código do admin não vai no pacote de quem só compra e vende |
| Cada área tem um guard | `AdminRoute` bloqueia quem não tem perfil admin (RF018.1) |
| O lint (`no-restricted-imports`) barra importação entre áreas | A regra é verificada pela máquina, não pela memória |

> O guard do frontend só melhora a experiência. A barreira de segurança de verdade é o `authorizeRole` do backend, que nega a requisição mesmo que alguém force a URL (RNF004).

### Idioma

Código, pastas e arquivos em inglês; interface e documentos em português do Brasil (RNF014).

| Domínio (PT) | Código (EN) |
|---|---|
| Usuário | `user` |
| Anúncio / Produto | `listing` |
| Categoria | `category` |
| Pedido | `order` |
| Pagamento | `payment` |
| Notificação | `notification` |
| Administrador | `admin` |

### Convenções de código

- Componentes em PascalCase; hooks começam com `use`; arquivos em kebab-case.
- TypeScript em modo estrito, sem `any` sem justificativa em comentário.
- Tipos de requisição e resposta vêm do `openapi.yaml`, não são escritos à mão.
- Componente não chama a API direto: o caminho é componente → hook → `services/`.
- Esquemas Zod ficam em `schemas/` e espelham as regras do backend.
- Pull request só entra com lint e testes verdes e revisão de outro membro.
- Mensagens de erro vêm do `code` da API (tabela da seção 12), nunca do texto técnico. Valores de dinheiro chegam em centavos e só são formatados na tela.

## 7. Rotas e telas

Cada área tem seu `routes.tsx`. A coluna RF liga a tela ao requisito.

### Área `public` (visitante)

`GuestRoute` só nas telas de login, cadastro e recuperação: quem já está logado é redirecionado.

| Rota | Tela | RF |
|---|---|---|
| `/` | Tela inicial (hero, carrossel, como funciona, categorias, FAQ, segurança, rodapé) | RF001 |
| `/cadastro` | Cadastro | RF002 |
| `/login` | Login do aluno | RF003 |
| `/admin/login` | Mesma tela de login, com destino ao painel admin | Decisão 10/10 |
| `/recuperar-senha` | Pedir redefinição | RF004.1 |
| `/recuperar-senha/enviado` | "Verifique seu e-mail" | RF004.3 |
| `/redefinir-senha/:token` | Definir nova senha | RF004.4, RF004.5 |
| `/senha-redefinida` | Confirmação | RF004.7 |
| `/confirmar-email/:token` | Confirma o e-mail do cadastro. **Só existe com a chave `EMAIL_VERIFICATION_REQUIRED` ligada** (fora do MVP) | RF002.5, RN-ACE-07 |
| `/termos` | Termos de uso (texto definido no desenvolvimento) | RN-ACE-06 |
| `/privacidade` | Política de privacidade (idem) | RN-ACE-06, RNF007 |
| `*` | Página não encontrada, com link para a tela inicial | — |

O cadastro e o login mostram também o botão "Entrar com Google" (RN-ACE-14). Depois do login, o aluno vai para `/categorias` (RF003.4) e o admin para `/admin/usuarios`. O `/termos` e o `/privacidade` abrem sem login, para o aluno ler antes de aceitar.

### Área `user` (aluno logado, `PrivateRoute`)

| Rota | Tela | RF |
|---|---|---|
| `/categorias` | Categorias, com busca | RF006 |
| `/categorias/:id` | Anúncios da categoria, com filtro e ordenação | RF007 |
| `/produtos/:id` | Página do produto, com botão "Fazer pedido" | RF008, RF009 |
| `/pagamento/:pedidoId` | Pagamento por cartão ou Pix | RF010 |
| `/pedido-confirmado/:pedidoId` | Confirmação do pedido | RF011 |
| `/perfil` | Perfil e "Meus anúncios" | RF012 |
| `/completar-cadastro` | Primeiro acesso por Google: aceite dos Termos e, se quiser, curso e WhatsApp. Todas as outras rotas privadas levam para cá enquanto o aceite não for gravado | RN-ACE-06, RN-ACE-14 |
| `/perfil/editar` | Editar nome, curso, WhatsApp, foto e e-mail (pede confirmação por link) e excluir perfil | RF013, RN-PER-02 |
| `/perfil/senha` | Trocar a senha logado (senha atual e nova) | RN-ACE-15 |
| `/confirmar-troca-email/:token` | Confirma a troca de e-mail pelo link recebido | RN-PER-02 |
| `/meus-pedidos` | Histórico de compras, com "Cancelar pedido" (Pendente ou Em negociação) e "Confirmar recebimento" (Retirada combinada) | RF014, RN-PED-08, RN-PED-12 |
| `/anunciar` | Criar anúncio | RF015, RF016 |
| `/anuncios/:id/gerenciar` | Gerenciar anúncio (status, indicadores, pedidos recebidos com "Combinar retirada", "Concluir venda" e "Encerrar negociação") | RF017, RN-PED-08, RN-PED-12 |
| `/anuncios/:id/editar` | Editar anúncio (mesmo formulário da criação) | RF015.7, RF017.6 |

### Área `admin` (`AdminRoute`)

| Rota | Tela | RF |
|---|---|---|
| `/admin/usuarios` | Lista de usuários e indicadores | RF019 |
| `/admin/usuarios/:id` | Detalhes do usuário | RF020 |
| `/admin/usuarios/:id/editar` | Editar usuário | RF021 |
| `/admin/produtos` | Lista de produtos e indicadores | RF022 |
| `/admin/produtos/:id` | Ver produto | RF023 |
| `/admin/produtos/:id/editar` | Editar produto | RF024 |

## 8. Fluxos principais

### Cadastro e entrada

```text
Início ▶ Criar conta (aceite dos Termos) ▶ confirmação de e-mail ▶ Login ▶ Categorias
Login com Google (MVP) ▶ servidor confere @edu.unifor.br ▶ 1º acesso: "Completar cadastro" (aceite dos Termos) ▶ Categorias
                                                           ▶ já cadastrado: Categorias
```

Com a confirmação de e-mail desligada (padrão do MVP), o cadastro por e-mail e senha cai direto no login; a etapa "confirmação de e-mail" só aparece com a chave ligada (RN-ACE-07). Quem entrou por Google define senha, se quiser, pela recuperação de senha (RN-ACE-15).

### Compra

```text
Categorias ▶ Anúncios da categoria ▶ Página do produto ▶ "Fazer pedido" (pop-up)
   ├─ "Seguir para o pagamento" ▶ Pagamento (cartão ou Pix) ▶ Pedido confirmado ▶ Meus pedidos
   └─ "Entrar em contato com o vendedor" ▶ WhatsApp ▶ pedido "Em negociação"
```

No pop-up o aluno escolhe a **quantidade** (limitada ao estoque). Pelo pagamento, o pedido nasce como pendente e vira "Pago" quando o gateway confirma. Pelo WhatsApp, o pedido nasce como "Em negociação".

- **Pedido aberto é reaproveitado.** Se o aluno já tem um pedido Pendente ou Em negociação nesse anúncio e forma de negociação, o novo clique devolve o mesmo pedido (com a quantidade atualizada), e o frontend segue com ele em vez de mostrar erro (RN-PED-10).
- **Pendente expira em 30 minutos** (RN-PAG-12). Na tela de pagamento, o contador mostra o tempo restante.
- **Pix expirado:** a tela mostra "Pedido cancelado" e o botão "Fazer novo pedido". O mesmo código Pix não é reaproveitado (o pedido já foi cancelado).
- **Cancelar:** o comprador cancela pedido Pendente ou Em negociação em "Meus pedidos", com confirmação. Pedido Pago ou em Retirada combinada não tem botão de cancelar: a tela orienta combinar com o vendedor pelo WhatsApp (RN-PED-12).
- **Retirada:** o vendedor marca "Retirada combinada" no pedido pago; o comprador confirma o recebimento e o pedido conclui (RN-PED-08).
- **Aviso de demonstração:** a tela de pagamento e o rodapé mostram que o ambiente é de demonstração e que nenhum valor é cobrado de verdade (RN-PAG-15).

### Venda

```text
Anunciar item ▶ "Anúncio publicado!" ▶ Perfil (Meus anúncios) ▶ Gerenciar anúncio
   ▶ Editar / Pausar / Reativar / Marcar como vendido / Excluir
   ▶ Pedidos recebidos ▶ WhatsApp do comprador ▶ Combinar retirada (pago) · Concluir venda (negociação) · Encerrar negociação
```

### Administração

```text
Login ▶ Usuários (buscar, ver, editar, suspender, excluir)
      └▶ Produtos (buscar, filtrar, ver, editar, mudar status, excluir)

O admin não suspende nem exclui a própria conta, e o último admin não é removido (RN-ADM-12): o frontend esconde essas ações para a própria conta e mostra a mensagem da API (`ADMIN_PROTECTED`) se mesmo assim for recusada. O histórico de auditoria (`/admin/audit-logs`) não tem tela no MVP.
```

## 9. Componentes

### Em `shared/components/ui`

| Componente | Variações e estados |
|---|---|
| `Button` | Primário, secundário, perigo, WhatsApp, Google; padrão, hover, foco, desabilitado, carregando |
| `Input` | Padrão, foco, erro, sucesso, desabilitado |
| `Modal` e `ConfirmDialog` | Neutro e de perigo; foco preso; Esc fecha |
| `Badge` | Status de anúncio e de pedido; sempre com texto, nunca só cor |
| `Card`, `Table`, `Pagination` | Base dos cards e das tabelas |
| `Toast`, `Skeleton`, `EmptyState` | Retorno de ações, carregando, vazio |

### Por área

| Área | Telas | Componentes principais |
|---|---|---|
| `public/landing` | LandingPage | HeroSection, RecentListingsCarousel, HowItWorks, CategoriesShowcase, FaqAccordion, SecuritySection |
| `public/auth` | Login, Register, ForgotPassword, CheckEmail, ResetPassword, ResetSuccess, VerifyEmail | LoginForm, RegisterForm, SocialAuthButtons (Google), PasswordRequirements |
| `public/legal` | TermsPage, PrivacyPage | LegalDocument |
| `user/onboarding` | CompleteProfilePage | CompleteProfileForm (aceite dos Termos, curso, WhatsApp) |
| `user/categories` | CategoriesPage | CategoryCard, CategorySearch |
| `user/listings` | CategoryListingsPage, ProductPage, CreateEditListingPage, ManageListingPage | ListingCard, ListingGrid, ListingFilters, ImageGallery, SellerCard, ListingForm, ImageUploader, ListingStatusBadge, ListingStatsCards, ReceivedOrdersList (ações do vendedor), PublishedListingModal, MarkAsSoldModal, DeleteListingModal |
| `user/orders` | MyOrdersPage | OrderCard, OrderStatusBadge, MakeOrderModal, CancelOrderDialog, ConfirmReceiptDialog |
| `user/checkout` | PaymentPage, OrderConfirmedPage | PaymentMethodTabs, CardPaymentForm, PixPayment (QR, copia e cola, contador), OrderSummary, DemoEnvironmentNotice |
| `user/profile` | ProfilePage, EditProfilePage, ChangePasswordPage, ConfirmEmailChangePage | ProfileHeader, MyListingsList, AvatarUploader, ChangePasswordForm, ChangeEmailForm, DeleteAccountModal (digitar "EXCLUIR") |
| `admin/users` | AdminUsersPage, AdminUserDetailPage, AdminUserEditPage | UsersTable, StatsCards, UserStatusForm, DeleteUserModal, SavedChangesModal |
| `admin/products` | AdminProductsPage, AdminProductDetailPage, AdminProductEditPage | ProductsTable, StatsCards, ProductStatusForm, ProductGallery, DeleteProductModal, SavedChangesModal |

### Layouts (um por área)

| Layout | Navegação |
|---|---|
| `PublicLayout` | Logo, Início, Categorias e Segurança (rolam a página), Entrar, Criar conta; rodapé com suporte, Termos, Privacidade e o aviso de ambiente de demonstração |
| `AppLayout` | Logo, Início, Categorias, Meus anúncios, "+ Anunciar item" e avatar com as iniciais, que leva ao perfil (com "Trocar senha" e "Sair"); rodapé com o aviso de demonstração |
| `AdminLayout` | Menu lateral com "Painel admin", Usuários, Produtos, nome e e-mail do admin e "Sair" |

A tela de criar e a de editar anúncio usam o mesmo formulário, em dois modos (RF015.7).

## 10. Dados e estado

- **Sessão:** o login devolve um JWT (validade de 2 horas, sem renovação, RN-ACE-11), enviado em todas as chamadas no cabeçalho `Authorization: Bearer <jwt>`. O token fica **em memória** (módulo `session.ts`) e, para sobreviver ao F5, numa **cópia em `sessionStorage`**, que some ao fechar a aba. Ao abrir o app com um token guardado, o `AuthProvider` chama `GET /auth/me`: se responder 200, restaura a sessão; se responder 401, apaga o token e leva ao login. Nunca use `localStorage` para o token. O `api.ts` aplica o token e, se a API responder 401 em qualquer chamada, encerra a sessão e leva ao login, guardando o destino. Como o token fica acessível ao JavaScript, o risco de XSS é tratado com as regras da seção 14. Não há refresh token nem "sair" no servidor: "Sair" apaga o token no navegador.
- **Troca de senha:** `POST /users/me/password` devolve um **token novo**; o frontend substitui o antigo na hora, senão o token antigo (emitido antes da troca) seria recusado (401). A tela só pede a senha atual e a nova.
- **Primeiro acesso por Google:** enquanto o aceite dos Termos não é gravado, a API responde 403 `TERMS_NOT_ACCEPTED` nas rotas privadas. O `PrivateRoute` consulta o `GET /auth/me` e, se o aceite estiver pendente, leva para `/completar-cadastro`; só depois o aluno segue para `/categorias`.
- **Guards:** `GuestRoute` (quem já está logado sai de login e cadastro), `PrivateRoute` (aluno) e `AdminRoute` (admin). Sem sessão, vai ao login guardando o destino; sem permissão, mostra "acesso negado".
- **Dados do servidor:** TanStack Query, com uma chave por recurso (anúncios, anúncio, pedidos). Depois de criar, editar ou pagar, as chaves afetadas são atualizadas.
- **Estado de tela:** só o que pertence à tela (modal aberto, aba ativa). Sem store global.
- **URL como estado:** busca, categoria, preço, ordenação e página ficam na query string, para compartilhar o link e voltar com o botão do navegador.
- **Formulários:** o esquema Zod espelha as regras do backend; o erro final sempre vem do backend.

## 11. Integração com a API

| Item | Combinado |
|---|---|
| Prefixo | `/api/v1` |
| Autenticação | `Authorization: Bearer <jwt>` |
| Paginação | `?page=&limit=` |
| Resposta e erro | Formato único, definido no `openapi.yaml` |

| Grupo | Base | Acesso |
|---|---|---|
| Auth | `/auth` | Público (`GET /auth/me` exige login) |
| Usuários | `/users` | Autenticado (inclui `POST /users/me/password` e `POST /users/me/complete-profile`) |
| Categorias | `/categories` | Autenticado |
| Anúncios | `/listings` | Leitura autenticada (o carrossel da home é público) |
| Pedidos | `/orders` | Autenticado |
| Pagamentos | `/payments` | Autenticado; `/payments/webhook` é chamado só pelo gateway |
| Admin | `/admin/users`, `/admin/listings`, `/admin/audit-logs` | Só admin |

- **Login com Google (MVP):** o botão oficial do Google devolve um ID token; o frontend o envia para `POST /auth/google`, e o backend valida o domínio `@edu.unifor.br` e se o e-mail é verificado. Domínio errado volta como `EMAIL_DOMAIN_NOT_ALLOWED`. O botão do Apple fica fora do MVP.
- **Pagamento:** cartão vira token no navegador pelo SDK do gateway; o backend só recebe o token (RNF006). A confirmação do Pix vem pelo webhook, e a tela consulta o status do pedido (`GET /orders/:id`); o "pago" mostrado vem **sempre** do pedido na API, nunca do retorno do SDK (RN-PAG-11). Com credenciais de teste, a tela avisa que é demonstração (RN-PAG-15).
- **Cancelamento e ações do pedido:** `POST /orders/:id/cancel` (comprador ou vendedor), `/arrange-pickup`, `/confirm-receipt` e `/complete`. Concluir uma negociação sem estoque responde 409 e o pedido continua "Em negociação" (RN-PED-13): mostre a mensagem e mantenha o botão.
- **WhatsApp:** link `https://wa.me/55<número>?text=<mensagem>`, montado por `whatsappLink`. Antes de abrir o link, o frontend chama o backend para registrar o contato.
- **Imagens (uma por requisição):** na Vercel, cada requisição aceita no máximo 4,5 MB no total. Por isso o `ImageUploader` envia **uma imagem por chamada**, de até **4 MB** (limite confirmado pelo grupo em 16/10/2026, nas Regras v0.4). No anúncio, o frontend publica com a primeira imagem (`POST /listings`) e acrescenta as demais, em sequência, com `POST /listings/:id/images`; mostra o progresso (ex.: "2 de 4") e, se uma falhar, deixa o aluno tentar de novo sem perder o anúncio. O anúncio tem no máximo **5 imagens**; o seletor bloqueia a sexta. A foto de perfil usa `PUT /users/me/avatar` (JPG ou PNG, até 4 MB). **Confira o tamanho antes de enviar**: um arquivo acima de 4,5 MB é barrado pela própria Vercel com um erro genérico (413), sem a mensagem do Unishop.
- **Erro 413 da Vercel:** trate também o 413 como "imagem grande demais", para o aluno ver a mesma mensagem de `FILE_TOO_LARGE`.

## 12. Estados obrigatórios de cada tela

O protótipo mostra só o caminho feliz. Toda tela que busca dados trata os estados abaixo.

| Estado | O que mostrar |
|---|---|
| Carregando | Esqueleto no lugar do conteúdo; botões de ação desabilitados |
| Vazio | Mensagem e próxima ação ("Nenhum anúncio encontrado — limpar filtros") |
| Erro de rede ou servidor (500, 502, 503) | Mensagem clara e botão "Tentar de novo", sem detalhe técnico |
| Muitas tentativas (429 `TOO_MANY_REQUESTS`) | "Muitas tentativas. Tente de novo em instantes", respeitando o `retryAfter` |
| Conta bloqueada por tentativas (429 `ACCOUNT_LOCKED`) | "Conta bloqueada por 15 minutos" com o tempo restante |
| Credenciais inválidas (401 `INVALID_CREDENTIALS`) | Mensagem única, sem dizer se o e-mail existe |
| Conta suspensa (403 `ACCOUNT_SUSPENDED`) | "Sua conta está suspensa. Fale com o suporte" |
| E-mail não confirmado (403 `EMAIL_NOT_VERIFIED`) | Aviso e "Reenviar e-mail" (só com a chave ligada) |
| Domínio recusado (`EMAIL_DOMAIN_NOT_ALLOWED`) | "Use seu e-mail @edu.unifor.br" |
| Aceite pendente (403 `TERMS_NOT_ACCEPTED`) | Leva à tela "Completar cadastro" |
| Sem permissão (403) | Tela "Acesso negado" com link de volta |
| Não encontrado (404) | Anúncio inexistente, excluído ou pausado: tela amigável |
| Sessão expirada (401) | Aviso e volta ao login, guardando o destino |
| Pix expirado | "Pedido cancelado" e botão "Fazer novo pedido" |
| Pagamento recusado | Mensagem de erro e nova tentativa (RF010.8) |
| Sem estoque | Marcado como indisponível; pedido bloqueado |
| Anúncio indisponível (`LISTING_UNAVAILABLE`) | "Este anúncio não está mais disponível" e volta à lista |
| Próprio anúncio (`OWN_LISTING`) | Esconde "Fazer pedido" no próprio anúncio (RN-ANU-10) |
| Imagem grande demais (413 ou `FILE_TOO_LARGE`) | "A imagem passa de 4 MB" |
| Imagem de tipo inválido | "Use JPG ou PNG" |
| Exclusão bloqueada (409 `HAS_OPEN_PAID_ORDERS`) | Explica que há pedido pago ou em retirada combinada em aberto |
| Anúncio com pedido aberto (409 `HAS_OPEN_ORDERS`) | Mostra a mensagem da API |
| Senha atual errada (`CURRENT_PASSWORD_INVALID`) | Erro no campo "senha atual" |
| Ação sobre admin (`ADMIN_PROTECTED`) | Mensagem da API; botão oculto na própria conta |

## 13. O que fica no frontend e o que só no backend

| Regra | Frontend | Backend |
|---|---|---|
| E-mail `@edu.unifor.br` no cadastro | Valida e avisa | Valida e recusa |
| Senha forte e confirmação | Valida e avisa | Valida e recusa |
| Aceite dos Termos no cadastro | Exige a marcação | Registra o aceite |
| Bloqueio após 5 tentativas | Mostra a mensagem | Conta e bloqueia |
| Imagem JPG/PNG de até 4 MB, no máximo 5 por anúncio (RN-ANU-03, RN-PER-05) | Valida tipo, tamanho e quantidade antes de enviar, uma imagem por requisição | Valida de novo |
| WhatsApp com 10 ou 11 dígitos, com DDD (RN-PER-07) | Máscara e validação | Guarda só os dígitos |
| Limites de campos e itens proibidos (Regras, seção 9; RN-ANU-12) | Limita a digitação e mostra o contador | Valida e recusa; o admin remove o proibido |
| Um pedido aberto por anúncio e forma (RN-PED-10) | Segue com o pedido devolvido | Reaproveita o pedido |
| Cancelar pedido (RN-PED-12) | Mostra o botão só nos status permitidos | Autoriza e valida o status |
| Pendente expira em 30 minutos (RN-PAG-12) | Mostra o contador | Cancela (job e sob demanda) |
| Aviso de ambiente de demonstração (RN-PAG-15) | Mostra na tela de pagamento e no rodapé | — |
| Excluir perfil: digitar "EXCLUIR" (RN-PER-06) | Exige o texto | Anonimiza; recusa com pedido pago em aberto |
| Trocar senha (RN-ACE-15) | Valida a nova senha e a confirmação | Confere a senha atual e devolve um token novo |
| Login só com @edu.unifor.br (Google, RN-ACE-14) | Mostra o botão | Valida o domínio e o e-mail verificado |
| Quantidade menor ou igual ao estoque | Limita o seletor | Desconta no banco, de forma atômica |
| Confirmação de pagamento | Só exibe o status | Recebe o webhook do gateway |
| Admin ou dono do anúncio | Esconde botões e guarda rotas | Autoriza cada chamada |
| WhatsApp só para logado | Não renderiza | Não envia o dado |

## 14. Qualidade

### Responsividade e navegadores (RNF012)

- Funciona em celular, tablet e desktop, nas versões atuais de Chrome, Firefox, Safari e Edge.
- Abordagem mobile-first, com os pontos de quebra padrão do Tailwind (`sm`, `md`, `lg`, `xl`). Os protótipos do Figma cobrem o desktop, e as telas de celular e tablet são derivadas deles.

### Acessibilidade (RNF013)

- Meta WCAG 2.1 nível AA: contraste, foco visível, navegação por teclado, rótulo em todo campo, texto alternativo nas imagens.
- Modais prendem o foco e fecham com Esc; erros de formulário são anunciados a leitores de tela.

### Desempenho (RNF008, RNF009)

- Páginas principais em até 3 s.
- Rotas de cada área carregadas sob demanda (lazy loading), principalmente a do admin.
- Listagens paginadas; imagens com tamanho definido e carregamento tardio.
- Busca com atraso (debounce).

### Segurança (RNF005, RNF006, RNF007)

- Dados de cartão nunca passam pelo Unishop: usar o SDK do gateway.
- Proibido `dangerouslySetInnerHTML` com texto de usuário (título e descrição do anúncio), contra XSS.
- Nenhum segredo no código do frontend; só variáveis `VITE_*` públicas.
- WhatsApp só é exibido a usuários logados.
- Ações irreversíveis sempre pedem confirmação em modal (RNF014).
- O token de sessão nunca vai para `localStorage`, para a URL nem para logs do console; só memória e `sessionStorage`.
- Links externos com `rel="noopener noreferrer"`; todo o tráfego em HTTPS.

## 15. Testes e Definição de Pronto

- **Unitários:** validações (Zod), formatadores de preço e data, `whatsappLink`.
- **Componentes:** formulários, cards, modais, selos de status, guards.
- **Fluxo completo (Playwright):** cadastro e login; login com Google (com o Google simulado) e "completar cadastro"; compra com Pix; Pix expirado; contato por WhatsApp; cancelar pedido; criar e pausar anúncio; envio de imagem acima de 4 MB; troca de senha; F5 mantém a sessão; acesso negado a rota admin.

### Uma tela está pronta quando

1. Está fiel ao Figma, usando os tokens do tema.
2. Trata os estados da seção 12.
3. Funciona por teclado, com rótulos e contraste verificados.
4. Está integrada à API real, sem erros no console.
5. Tem teste de componente, e o fluxo crítico tem teste de fluxo completo.
6. O pull request foi revisado e está verde.

## 16. Decisões adotadas

| Tema | Decisão |
|---|---|
| Acesso ao catálogo | Só logado; o visitante vê a tela inicial |
| Estrutura | Por área (`public`, `user`, `admin`) mais `shared/` |
| Sessão | JWT no cabeçalho `Authorization: Bearer`, guardado em memória com cópia em `sessionStorage` e restaurado por `GET /auth/me` |
| Login | E-mail e senha, e Google (`@edu.unifor.br`) no MVP; Apple fora (custo e e-mail de retransmissão) |
| Imagens | JPG ou PNG, até 4 MB cada (confirmado pelo grupo em 16/10/2026), até 5 por anúncio, uma por requisição |
| Ambiente de pagamento | Produção com credenciais de teste; aviso de demonstração na tela (RN-PAG-15) |
| Notificações | Só por e-mail; sem tela de notificações no MVP (RN-NOT-04) |
| Login do admin | Mesma tela, rota `/admin/login`, destino no painel admin |
| Tela inicial | Aberta a todos; `GuestRoute` só em login, cadastro e recuperação |
| Gateway | Externo: Mercado Pago (decisão do grupo) |
| Quantidade | Anúncio com várias unidades; escolhida no pop-up "Fazer pedido" |
| Termos e Privacidade | Páginas `/termos` e `/privacidade`; textos definidos durante o desenvolvimento |