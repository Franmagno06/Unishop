# CLAUDE.md

Contexto para o Claude Code trabalhar no projeto **Unishop**, e-commerce web para alunos da Unifor (trabalho da disciplina Desenvolvimento de Plataformas Web, T242-12).

## Leia primeiro

- [`docs/regras-de-negócio.md`](docs/regras-de-negócio.md) — regras RN-XXX-nn, estados, permissões e cenários de teste.
- [`docs/frontend.md`](docs/frontend.md) — estrutura, rotas, componentes, estado e padrões de qualidade do frontend.
- `Trabalho Desenvolvimento Web 2026.pdf` — requisitos funcionais (RF001–RF024) e não-funcionais (RNF001–RNF016) originais do trabalho.

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
- Citar sempre os códigos de origem ao implementar algo: `RF`/`RNF` (requisitos do PDF) e `RN-XXX-nn` (regras de negócio em `docs/regras-de-negócio.md`).
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
| Frontend | TypeScript + React, Tailwind CSS, HTML |
| Backend | Node.js + Express |
| Banco de dados | PostgreSQL |
| Prototipação | Figma |
| Versionamento | Git, código organizado em camadas |
| Gestão | Trello (Kanban) |

Sugestões ainda em avaliação (não confirmadas): Vite, React Router, TanStack Query, React Hook Form, Zod, Vitest/Testing Library/Playwright no frontend; estrutura em camadas (routes/controller/service/repository) + Prisma no backend; gateway de pagamento Mercado Pago; e-mail via Resend/Mailtrap; imagens via Cloudinary/Cloudflare R2; banco em nuvem Neon/Supabase; login social restrito ao Google no MVP.

## Estrutura esperada do frontend

Por área de ator, mais compartilhado:

```
public/   → visitante (tela inicial, cadastro, login, recuperação de senha)
user/     → aluno logado (categorias, listagens, produto, pedidos, pagamento, anúncios, perfil)
admin/    → administrador (painel, usuários, produtos)
shared/   → componentes e utilitários comuns
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

- Gateway de pagamento: serviço externo, escolha final ainda pendente.
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
docs/
├─ frontend.md              # estrutura, rotas, componentes, estado, qualidade
├─ regras-de-negócio.md     # regras RN-XXX-nn, estados, permissões, testes
├─ backend/                 # a publicar (Felipe Bessa)
├─ api/                     # a publicar (Pedro Cândido)
└─ banco-de-dados/          # a publicar (Ana Clara Macêdo)
```

Protótipo Figma: https://www.figma.com/design/20vFP1b3Ra6UZbJjVssgxD/Unishop-%E2%80%94-Prot%C3%B3tipo
