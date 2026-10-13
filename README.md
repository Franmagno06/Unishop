# Unishop

Sistema Web de e-commerce voltado para os alunos da Universidade de Fortaleza (Unifor), para a compra e venda de materiais e artigos de interesse dos alunos (livros, eletrônicos, alimentos, materiais de curso, vestuário, entre outros) dentro do campus.

Trabalho da disciplina **Desenvolvimento de Plataformas Web** — Curso de Ciência da Computação, Turma T242-12, 4º Semestre, Unifor.

## Equipe

| Aluno | Matrícula | Responsabilidade |
|---|---|---|
| Francisco Magno | 2510401 | Gestor/Gerente de Projeto + Integração frontback |
| Ana Clara Macêdo | 2510383 | DER e MER + Banco de Dados |
| Pedro Cândido | 2510367 | Diagrama de Caso de Uso + Frontend + Engenheiro de API |
| Felipe Bessa | 2510472 | Wireframes (Figma) + Backend |

*Obs.: a divisão acima se aplica à fase inicial de desenvolvimento e ao restante do projeto, mas está sujeita a auxílio mútuo entre os membros além das áreas em que estão delegados.*

## Objetivo

Colocar em prática os conhecimentos sobre desenvolvimento Web vistos em sala de aula, aplicando-os na resolução de uma dor real entre os alunos da Unifor.

## Público-alvo

Os alunos da Unifor. Atualmente, cerca de apenas 1.400 alunos (≈5% dos 25 mil matriculados) participam de grupos e comunidades informais para compra e venda de materiais, o que evidencia a necessidade de um canal único e mais acessível para divulgação.

## Tecnologias utilizadas

- **Frontend:** TypeScript (React), Tailwind e HTML
- **Backend:** Node.js com framework Express
- **Banco de dados:** PostgreSQL
- **Prototipação:** Figma

## Principais funcionalidades

O sistema conta com três perfis de atores: **visitante**, **usuário (aluno)** e **administrador**.

### Visitante
- Tela inicial com apresentação da plataforma, carrossel de anúncios recentes, seção "Como funciona", categorias, FAQ e seção de segurança.
- Cadastro restrito a e-mails institucionais (`@edu.unifor.br`), com login via e-mail/senha ou Google/Apple.
- Recuperação de senha por e-mail com link de validade limitada.

### Usuário (aluno)
- Navegação por categorias (Livros e apostilas, Eletrônicos, Alimentos, Materiais de curso, Vestuário e Outros) com busca e filtros.
- Página de produto com galeria de imagens, dados do vendedor e opção de "Fazer pedido".
- Negociação direta via WhatsApp ou pagamento pela plataforma (cartão de crédito ou Pix, processado por gateway externo).
- Perfil do usuário com edição de dados, histórico de pedidos e gerenciamento dos próprios anúncios (pausar, reativar, marcar como vendido ou excluir).
- Publicação de anúncios com nome, categoria, descrição, preço, imagem e contato via WhatsApp.

### Administrador
- Painel restrito com seções de **Usuários** e **Produtos**.
- Indicadores gerais (usuários cadastrados, logados, novos cadastros, produtos ativos/pausados/vendidos).
- Visualização, edição, suspensão e exclusão de usuários e produtos, com registro em log das ações administrativas.

## Requisitos

O levantamento completo de **Requisitos Funcionais** (RF001–RF024) e **Requisitos Não-Funcionais** (RNF001–RNF016), com suas respectivas prioridades, está documentado no arquivo do trabalho (`Trabalho Desenvolvimento Web 2026.pdf`), incluindo regras de segurança (HTTPS, hash de senha, JWT, LGPD), desempenho (tempo de carregamento, usuários simultâneos), acessibilidade (WCAG 2.1 AA) e responsividade. Todos os requisitos são "Essencial", exceto cinco marcados como "Desejável" (RF002.5, RF002.6, RF003.3, RF004.3 e RF004.6).

## Fluxo geral do site

1. O visitante conhece a plataforma na tela inicial e vai para cadastro ou login (e-mail `@edu.unifor.br` obrigatório).
2. Logado, o aluno acessa **Categorias**, escolhe uma categoria, vê a listagem e abre a página do produto.
3. Em "Fazer pedido", escolhe a quantidade e segue por um de dois caminhos: pagamento pelo site (cartão ou Pix, via gateway externo) ou contato direto pelo WhatsApp (pedido "Em negociação").
4. O aluno acompanha as compras em **Meus pedidos**.
5. Para vender, usa "+ Anunciar item", publica e gerencia o anúncio (editar, pausar, reativar, marcar como vendido, excluir).
6. O administrador entra pela mesma tela de login, em rota separada, e acessa o painel para gerenciar usuários e produtos.

## Modelagem

- **Diagrama de Caso de Uso:** mapeia as funcionalidades dos três atores (visitante, usuário e administrador).
- **Diagrama e Modelo de Entidade-Relacionamento (DER/MER):** define as entidades `USUARIO`, `ANUNCIO`, `CATEGORIA` e `PEDIDO`, seus atributos, chaves primárias/estrangeiras e relacionamentos.

## Prototipação

A prototipação (wireframes) foi feita no Figma com base nos requisitos levantados, nos diagramas e no padrão visual da Unifor, contemplando as telas do usuário e do administrador, em versão desktop.

## Stack e ferramentas

| Camada | Tecnologia |
|---|---|
| Frontend | TypeScript com React, Tailwind CSS e HTML |
| Backend | Node.js com Express |
| Banco de dados | PostgreSQL |
| Prototipação | Figma |
| Versionamento | Git, código organizado em camadas |
| Gestão | Trello (Kanban) |

Algumas decisões técnicas ainda são sugestões em avaliação pelo grupo (build com Vite, React Router, TanStack Query, Prisma, gateway de pagamento Mercado Pago, e-mail transacional via Resend/Mailtrap, imagens via Cloudinary/Cloudflare R2, banco em nuvem Neon/Supabase, login social restrito ao Google no MVP).

## Organização do projeto

O acompanhamento das tarefas é feito em um quadro Kanban no Trello, separado em colunas de planejamento, tarefas pendentes, MVP e apresentação final, servindo também como cronograma das entregas.

## Documentação

```text
docs/
├─ contexto-do-projeto.md              # contexto completo do projeto para leitura por IA e novos membros
├─ visao-geral/
│  └─ regras-de-negocio.md             # regras RN-XXX-nn, estados, permissões, testes
├─ frontend/
│  └─ frontend.md                      # estrutura, rotas, componentes, estado, qualidade
├─ backend/                            # a cargo do Felipe Bessa
├─ api/                                # a cargo do Pedro Cândido (openapi.yaml)
└─ banco-de-dados/                     # a cargo da Ana Clara Macêdo
```

Recomenda-se ler `docs/contexto-do-projeto.md` antes dos documentos técnicos: ele resume o que já foi decidido pelo grupo e aponta a fonte de cada informação (PDF do trabalho > decisões do grupo > documentos técnicos > protótipos do Figma).
