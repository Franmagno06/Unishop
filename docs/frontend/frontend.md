---
title: Documentação Técnica — Frontend
project: Unishop
version: 0.3
date: 2026-10-13
status: rascunho para revisão da equipe
owners: Pedro Cândido (frontend e API), Francisco Magno (integração front-back)
context: README.md
related: docs/regras-de-negocio.md
language: pt-BR (código e pastas em inglês; interface em português)
---

# Documentação Técnica — Frontend

- Versão 0.3 · 13/10/2026
- Responsáveis: Pedro Cândido (frontend e API) · Francisco Magno (integração front-back)
- Regras de negócio: ver "Documentação Técnica — Regras de Negócio" (docs/regras-de-negocio.md)

## 1. Objetivo

O frontend é a aplicação web que visitantes, alunos e administradores usam no Unishop. Ele mostra os anúncios, conduz a compra e a venda e consome a API REST do backend (`/api/v1`). Regras de segurança e de dinheiro ficam sempre no backend; o frontend valida só para responder rápido ao usuário.

São três atores, e cada um tem uma **área** própria no código, com layout, rotas e telas separados:

| Área | Ator | O que faz |
|---|---|---|
| `public` | Visitante | Vê a tela inicial, cria conta, entra e recupera a senha. |
| `user` | Aluno logado | Navega nas categorias, compra, anuncia, acompanha pedidos e edita o perfil. |
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
```

## 5. Estrutura de pastas

Organizada por **área** (um ator por área) e, dentro dela, por funcionalidade. O que é usado pelas três áreas fica em `shared/`.

```text
frontend/
├─ public/                 # favicon, logo, imagens estáticas
├─ index.html
├─ vite.config.ts · tsconfig.json · .env.example
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
   │  │  └─ auth/          # Login, Register, ForgotPassword, CheckEmail,
   │  │                    # ResetPassword, ResetSuccess
   │  ├─ user/             # ALUNO LOGADO
   │  │  ├─ layout/        # AppLayout, AppHeader
   │  │  ├─ routes.tsx
   │  │  ├─ categories/
   │  │  ├─ listings/      # listagem, produto, criar/editar, gerenciar
   │  │  ├─ orders/        # Meus pedidos, MakeOrderModal
   │  │  ├─ checkout/      # Pagamento, Pedido confirmado
   │  │  └─ profile/       # Perfil, Editar perfil
   │  └─ admin/            # ADMINISTRADOR
   │     ├─ layout/        # AdminLayout, AdminSidebar
   │     ├─ routes.tsx
   │     ├─ users/         # lista, detalhes, editar
   │     └─ products/      # lista, ver, editar
   ├─ shared/              # usado pelas 3 áreas
   │  ├─ components/ui/    # Button, Input, Modal, Badge, Card, Table, Pagination,
   │  │                    # ConfirmDialog, Toast, Skeleton, EmptyState
   │  ├─ hooks/            # useDebounce, usePagination, useCopyToClipboard
   │  ├─ lib/              # api.ts (cliente HTTP), queryClient
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

Depois do login, o aluno vai para `/categorias` (RF003.4) e o admin para `/admin/usuarios`. As páginas de Termos de uso e Política de privacidade entram quando os textos forem definidos.

### Área `user` (aluno logado, `PrivateRoute`)

| Rota | Tela | RF |
|---|---|---|
| `/categorias` | Categorias, com busca | RF006 |
| `/categorias/:id` | Anúncios da categoria, com filtro e ordenação | RF007 |
| `/produtos/:id` | Página do produto, com botão "Fazer pedido" | RF008, RF009 |
| `/pagamento/:pedidoId` | Pagamento por cartão ou Pix | RF010 |
| `/pedido-confirmado/:pedidoId` | Confirmação do pedido | RF011 |
| `/perfil` | Perfil e "Meus anúncios" | RF012 |
| `/perfil/editar` | Editar perfil e excluir perfil | RF013 |
| `/meus-pedidos` | Histórico de compras | RF014 |
| `/anunciar` | Criar anúncio | RF015, RF016 |
| `/anuncios/:id/gerenciar` | Gerenciar anúncio (status, pedidos recebidos, indicadores) | RF017 |
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
Login com Google (MVP) ▶ servidor confere @edu.unifor.br ▶ Categorias
```

### Compra

```text
Categorias ▶ Anúncios da categoria ▶ Página do produto ▶ "Fazer pedido" (pop-up)
   ├─ "Seguir para o pagamento" ▶ Pagamento (cartão ou Pix) ▶ Pedido confirmado ▶ Meus pedidos
   └─ "Entrar em contato com o vendedor" ▶ WhatsApp ▶ pedido "Em negociação"
```

No pop-up o aluno escolhe a **quantidade** (limitada ao estoque). Pelo pagamento, o pedido nasce como pendente e vira "Pago" quando o gateway confirma. Pelo WhatsApp, o pedido nasce como "Em negociação".

### Venda

```text
Anunciar item ▶ "Anúncio publicado!" ▶ Perfil (Meus anúncios) ▶ Gerenciar anúncio
   ▶ Editar / Pausar / Reativar / Marcar como vendido / Excluir
   ▶ Pedidos recebidos ▶ WhatsApp do comprador
```

### Administração

```text
Login ▶ Usuários (buscar, ver, editar, suspender, excluir)
      └▶ Produtos (buscar, filtrar, ver, editar, mudar status, excluir)
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
| `public/auth` | Login, Register, ForgotPassword, CheckEmail, ResetPassword, ResetSuccess | LoginForm, RegisterForm, SocialAuthButtons (Google), PasswordRequirements |
| `user/categories` | CategoriesPage | CategoryCard, CategorySearch |
| `user/listings` | CategoryListingsPage, ProductPage, CreateEditListingPage, ManageListingPage | ListingCard, ListingGrid, ListingFilters, ImageGallery, SellerCard, ListingForm, ImageUploader, ListingStatusBadge, ListingStatsCards, ReceivedOrdersList, PublishedListingModal, MarkAsSoldModal, DeleteListingModal |
| `user/orders` | MyOrdersPage | OrderCard, OrderStatusBadge, MakeOrderModal |
| `user/checkout` | PaymentPage, OrderConfirmedPage | PaymentMethodTabs, CardPaymentForm, PixPayment (QR, copia e cola, contador), OrderSummary |
| `user/profile` | ProfilePage, EditProfilePage | ProfileHeader, MyListingsList, AvatarUploader, DeleteAccountModal (digitar "EXCLUIR") |
| `admin/users` | AdminUsersPage, AdminUserDetailPage, AdminUserEditPage | UsersTable, StatsCards, UserForm, DeleteUserModal, SavedChangesModal |
| `admin/products` | AdminProductsPage, AdminProductDetailPage, AdminProductEditPage | ProductsTable, StatsCards, ProductForm, SellerSearchSelect, DeleteProductModal, SavedChangesModal |

### Layouts (um por área)

| Layout | Navegação |
|---|---|
| `PublicLayout` | Logo, Início, Categorias e Segurança (rolam a página), Entrar, Criar conta; rodapé com suporte, Termos e Privacidade |
| `AppLayout` | Logo, Início, Categorias, Meus anúncios, "+ Anunciar item" e avatar com as iniciais, que leva ao perfil |
| `AdminLayout` | Menu lateral com "Painel admin", Usuários, Produtos, nome e e-mail do admin e "Sair" |

A tela de criar e a de editar anúncio usam o mesmo formulário, em dois modos (RF015.7).

## 10. Dados e estado

- **Sessão:** o login devolve um JWT, enviado em todas as chamadas no cabeçalho `Authorization: Bearer <jwt>`. O `api.ts` aplica o token e, se a API responder 401, encerra a sessão e leva ao login. Como o token fica acessível ao JavaScript, o risco de XSS é tratado com as regras da seção 14.
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
| Auth | `/auth` | Público |
| Usuários | `/users` | Autenticado |
| Categorias | `/categories` | Autenticado |
| Anúncios | `/listings` | Leitura autenticada (o carrossel da home é público) |
| Pedidos | `/orders` | Autenticado |
| Pagamentos | `/payments` | Autenticado; `/payments/webhook` é chamado só pelo gateway |
| Admin | `/admin/users`, `/admin/listings`, `/admin/audit-logs` | Só admin |

- **Login com Google:** o frontend inicia o fluxo e o backend valida o domínio `@edu.unifor.br` e se o e-mail é verificado. O botão do Apple fica fora do MVP.
- **Pagamento:** cartão vira token no navegador pelo SDK do gateway; o backend só recebe o token (RNF006). A confirmação do Pix vem pelo webhook, e a tela consulta o status do pedido.
- **WhatsApp:** link `https://wa.me/55<número>?text=<mensagem>`, montado por `whatsappLink`. Antes de abrir o link, o frontend chama o backend para registrar o contato.

## 12. Estados obrigatórios de cada tela

O protótipo mostra só o caminho feliz. Toda tela que busca dados trata os estados abaixo.

| Estado | O que mostrar |
|---|---|
| Carregando | Esqueleto no lugar do conteúdo; botões de ação desabilitados |
| Vazio | Mensagem e próxima ação ("Nenhum anúncio encontrado — limpar filtros") |
| Erro de rede ou servidor | Mensagem clara e botão "Tentar de novo", sem detalhe técnico |
| Sem permissão (403) | Tela "Acesso negado" com link de volta |
| Não encontrado (404) | Anúncio inexistente, excluído ou pausado: tela amigável |
| Sessão expirada | Aviso e volta ao login, guardando o destino |
| Pix expirado | Aviso e opção de gerar novo código |
| Pagamento recusado | Mensagem de erro e nova tentativa (RF010.8) |
| Sem estoque | Marcado como indisponível; pedido bloqueado |

## 13. O que fica no frontend e o que só no backend

| Regra | Frontend | Backend |
|---|---|---|
| E-mail `@edu.unifor.br` no cadastro | Valida e avisa | Valida e recusa |
| Senha forte e confirmação | Valida e avisa | Valida e recusa |
| Aceite dos Termos no cadastro | Exige a marcação | Registra o aceite |
| Bloqueio após 5 tentativas | Mostra a mensagem | Conta e bloqueia |
| Imagem JPG/PNG até 5 MB | Valida antes de enviar | Valida de novo |
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
- Links externos com `rel="noopener noreferrer"`; todo o tráfego em HTTPS.

## 15. Testes e Definição de Pronto

- **Unitários:** validações (Zod), formatadores de preço e data, `whatsappLink`.
- **Componentes:** formulários, cards, modais, selos de status, guards.
- **Fluxo completo (Playwright):** cadastro e login; compra com Pix; contato por WhatsApp; criar e pausar anúncio; acesso negado a rota admin.

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
| Sessão | JWT no cabeçalho `Authorization: Bearer` |
| Login social | Só Google no MVP; Apple fica fora (custo e e-mail de retransmissão) |
| Login do admin | Mesma tela, rota `/admin/login`, destino no painel admin |
| Tela inicial | Aberta a todos; `GuestRoute` só em login, cadastro e recuperação |
| Gateway | Externo; Mercado Pago é o candidato recomendado, a confirmar pelo grupo |
| Quantidade | Anúncio com várias unidades; escolhida no pop-up "Fazer pedido" |
| Termos e Privacidade | Textos definidos durante o desenvolvimento |