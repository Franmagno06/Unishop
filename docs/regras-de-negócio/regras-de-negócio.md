---
title: Documentação Técnica — Regras de Negócio
project: Unishop
version: 0.3
date: 2026-10-13
status: rascunho para revisão da equipe
owners: Francisco Magno (consolidação)
context: README.md
related: docs/frontend/frontend.md
sources: requisitos RF001–RF024 e RNF001–RNF016 (PDF do trabalho), protótipos do Figma, decisões do grupo
language: pt-BR
---

# Documentação Técnica — Regras de Negócio

- Versão 0.3 · 13/10/2026
- Consolidação: Francisco Magno (gestão e integração front-back)
- Base: requisitos RF001–RF024 e RNF001–RNF016, protótipos do Figma e decisões do grupo

## 1. Como ler este documento

Aqui estão as regras que o sistema precisa respeitar, não importa a tela nem a tecnologia. Frontend, backend, banco e testes seguem este documento; se houver dúvida de comportamento, vale o que está escrito aqui. Os requisitos originais não são repetidos: a coluna **Origem** aponta para eles.

| Convenção | Significado |
|---|---|
| `RN-XXX-nn` | Código da regra. XXX é o domínio: ACE (acesso), PER (perfil), CAT (categorias), ANU (anúncios), EST (estoque), PED (pedidos), PAG (pagamento), NOT (notificações), ADM (administração). |
| Onde se aplica | Frontend (avisa o usuário), Backend (decide) e Banco (restrição no banco de dados). Algumas regras valem em mais de um. |
| Origem | RF ou RNF do PDF. "Grupo" é decisão da equipe; "Equipe" é definição técnica para fechar um ponto que o PDF não cobre. |
| Regra de segurança ou dinheiro | Sempre aplicada no Backend. O Frontend só antecipa o erro para o usuário. |

## 2. Glossário

| Termo | Significado |
|---|---|
| Anúncio / Produto | Item à venda por um aluno. É um item de catálogo que pode ter **várias unidades** (dois livros iguais, duas calculadoras). O aluno diz "anúncio"; o admin diz "produto". |
| Quantidade | Unidades disponíveis em um anúncio. Cai conforme as vendas. |
| Categoria | Uma das seis categorias fixas: Livros e apostilas, Eletrônicos, Alimentos, Materiais de curso, Vestuário e Outros. |
| Forma de negociação | Como a compra acontece: **pagamento pelo site** (cartão ou Pix) ou **contato pelo WhatsApp**. Aparece no pedido e na listagem. |
| Pedido | Compra de uma ou mais unidades de um anúncio por um comprador. |
| Em negociação | Pedido nascido do contato pelo WhatsApp, ainda sem venda fechada. |
| Retirada | Encontro presencial, combinado por WhatsApp, para entregar o produto. |
| Aluno verificado | Conta cadastrada com e-mail **@edu.unifor.br**. |
| Administrador | Conta com permissão de gestão de usuários e produtos. |
| Conta suspensa | Conta que não entra no sistema; os anúncios ficam ocultos e os dados são mantidos. |

## 3. Quem pode fazer o quê

| Ação | Visitante | Aluno | Admin |
|---|---|---|---|
| Ver a tela inicial, o carrossel de anúncios recentes e as seções informativas | Sim | Sim | Sim |
| Cadastrar-se, entrar e recuperar a senha | Sim | — | — |
| Ver categorias, listagens e página do produto | Não | Sim | Sim |
| Ver o WhatsApp do vendedor | Não | Sim | Sim |
| Fazer pedido e pagar | Não | Sim | Não |
| Criar, editar, pausar, vender e excluir o próprio anúncio | Não | Sim | Não |
| Ver o próprio histórico de pedidos e os pedidos recebidos | Não | Sim | Não |
| Editar e excluir o próprio perfil | Não | Sim | Sim |
| Gerenciar qualquer usuário (editar, suspender, excluir) | Não | Não | Sim |
| Gerenciar qualquer produto (editar, mudar status, trocar vendedor, excluir) | Não | Não | Sim |

> A checagem de permissão é feita sempre no **backend** (RNF004). Esconder um botão no frontend não é controle de acesso.

## 4. Ciclo de vida

### Anúncio

```text
Ativo ──pausar──▶ Pausado ──reativar──▶ Ativo
Ativo ou Pausado ──estoque zerou / marcar como vendido──▶ Vendido
Qualquer estado ──excluir──▶ Excluído (definitivo)
```

| De | Para | Quem | Como |
|---|---|---|---|
| Ativo | Pausado | Dono | Some das listagens e buscas; mantém dados e unidades (RF017.7). |
| Pausado | Ativo | Dono | Volta às listagens, se a conta não estiver suspensa (RF017.8). |
| Ativo ou Pausado | Vendido | Sistema | A quantidade chegou a zero depois de uma venda. |
| Ativo ou Pausado | Vendido | Dono | "Marcar como vendido", com confirmação em modal. Zera as unidades que sobraram (RF017.9). |
| Vendido | Ativo ou Pausado | Admin | Só o admin reverte, e a ação fica registrada no log (RF024.5, RF018.5). Para o dono, Vendido é final. |
| Qualquer | Excluído | Dono ou Admin | Remoção permanente. Pedidos pagos continuam no histórico do comprador (RF017.11, RF017.12). |

### Pedido

O pedido tem dois caminhos, conforme o pop-up "Fazer pedido" (RF009):

```text
Pagamento pelo site:
  Pendente ──pagamento confirmado──▶ Pago
  Pago ──vendedor marca──▶ Retirada combinada ──comprador confirma──▶ Concluído
  Pendente ──Pix expirou / abandonado──▶ Cancelado

Contato pelo WhatsApp:
  Em negociação ──vendedor confirma a venda──▶ Concluído
  Em negociação ──vendedor encerra a negociação──▶ Cancelado
```

| Estado | Significado | Texto na interface |
|---|---|---|
| Pendente | Aguardando pagamento (Pix ou cartão) | "Aguardando pagamento" |
| Pago | Pagamento confirmado | Comprador: "Pago · aguardando retirada" (RF014.3). Vendedor: "Pago · combinar retirada" (RF011.3). |
| Retirada combinada | Encontro marcado | "Retirada combinada" |
| Concluído | Produto entregue | "Concluído" |
| Em negociação | Contato por WhatsApp registrado (RF009.5) | "Em negociação" |
| Cancelado | Pedido encerrado sem venda | "Cancelado" |

A interface usa textos diferentes para cada lado, mas no banco existe **um único valor por estado**.

### Conta

```text
Ativa ──5 senhas erradas──▶ Bloqueada por 15 min ──tempo──▶ Ativa
Ativa ──admin suspende──▶ Suspensa ──admin reativa──▶ Ativa
```

## 5. Regras por domínio

### Acesso e cadastro (ACE)

| Código | Regra | Origem | Onde se aplica |
|---|---|---|---|
| RN-ACE-01 | O cadastro pede nome completo, e-mail institucional, senha e confirmação de senha. | RF002.1 | Frontend, Backend |
| RN-ACE-02 | O cadastro só aceita e-mail do domínio **@edu.unifor.br**. | RF002.2, RNF002 | Frontend, Backend |
| RN-ACE-03 | O e-mail é único. Cadastro repetido é recusado. | RF002.4 | Backend, Banco |
| RN-ACE-04 | Senha com no mínimo 8 caracteres, 1 número e 1 letra maiúscula, igual à confirmação. | RF002.3, RF004.5 | Frontend, Backend |
| RN-ACE-05 | A senha é guardada só como hash (bcrypt ou Argon2), nunca em texto. | RNF001 | Backend |
| RN-ACE-06 | O cadastro exige o aceite dos Termos de uso e da Política de privacidade, e a data do aceite é registrada. | RNF007 | Frontend, Backend, Banco |
| RN-ACE-07 | A conta é ativada por um link enviado ao e-mail antes do primeiro acesso (desejável). | RF002.5 | Backend |
| RN-ACE-08 | Credencial inválida mostra erro genérico, sem dizer qual campo está errado. | RF003.2 | Frontend, Backend |
| RN-ACE-09 | Após 5 senhas erradas seguidas, o login fica bloqueado por **15 minutos**. | RNF003 | Backend |
| RN-ACE-10 | A recuperação de senha envia um link por e-mail, válido por 30 minutos e invalidado após o uso. | RF004.2, RF004.6 | Backend, Banco |
| RN-ACE-11 | A sessão usa JWT com validade, enviado no cabeçalho `Authorization: Bearer`. Rota protegida sem sessão válida leva ao login. | RNF003 | Frontend, Backend |
| RN-ACE-12 | Conta suspensa não consegue entrar. | RF021.5 | Backend |
| RN-ACE-13 | O admin usa a mesma tela de login, em rota separada, e cai no painel administrativo. O aluno cai em Categorias. | Grupo, RF003.4 | Frontend, Backend |
| RN-ACE-14 | Login com Google (desejável) exige o domínio `@edu.unifor.br` e e-mail verificado, conferidos no servidor. O login com Apple fica fora do MVP. | RF002.6, RF003.3, RNF002 | Backend |

### Perfil (PER)

| Código | Regra | Origem | Onde se aplica |
|---|---|---|---|
| RN-PER-01 | O aluno edita foto, nome, curso e WhatsApp, com as mesmas validações do cadastro. | RF013.1, RF013.2 | Frontend, Backend |
| RN-PER-02 | Trocar o e-mail institucional exige confirmação no novo endereço, que também deve ser `@edu.unifor.br`, antes de a troca valer. | RF013.4 | Frontend, Backend |
| RN-PER-03 | Ao mudar o WhatsApp, ele é atualizado em todos os anúncios ativos do aluno. | RF013.3 | Backend |
| RN-PER-04 | O WhatsApp só aparece para usuários logados. | RF015.4, RNF007 | Backend |
| RN-PER-05 | Foto de perfil em JPG ou PNG, até 5 MB. | RNF005 | Frontend, Backend |
| RN-PER-06 | Excluir o perfil exige digitar "EXCLUIR". A conta é anonimizada (dados pessoais apagados) e os anúncios saem do ar. Pedidos pagos permanecem no histórico da outra parte, com o nome "Usuário removido". | RF013.7, RF013.8, RF017.12, RNF007 | Frontend, Backend, Banco |

### Categorias (CAT)

| Código | Regra | Origem | Onde se aplica |
|---|---|---|---|
| RN-CAT-01 | Existem seis categorias fixas: Livros e apostilas, Eletrônicos, Alimentos, Materiais de curso, Vestuário e Outros. | RF006.1 | Backend, Banco |
| RN-CAT-02 | Cada categoria mostra a quantidade de anúncios ativos. | RF006.2 | Backend |
| RN-CAT-03 | A busca por texto procura itens ou categorias. | RF006.3 | Frontend, Backend |
| RN-CAT-04 | Categorias e listagens só estão disponíveis para aluno logado. | RF003.4, RF005.1 | Frontend, Backend |

### Anúncios (ANU)

| Código | Regra | Origem | Onde se aplica |
|---|---|---|---|
| RN-ANU-01 | Só aluno logado cria anúncio. Obrigatórios: nome, categoria, descrição, preço, quantidade e WhatsApp (preenchido com o do cadastro, editável). | RF015.1, RF015.3 | Frontend, Backend, Banco |
| RN-ANU-02 | Preço maior que zero, com duas casas decimais. | RF015.1 | Frontend, Backend, Banco |
| RN-ANU-03 | Pelo menos uma imagem em JPG ou PNG, até 5 MB cada. A página do produto mostra galeria com miniaturas. | RF015.2, RF008.1 | Frontend, Backend |
| RN-ANU-04 | Só o dono (ou o admin) edita, pausa ou exclui o anúncio. | RNF004, RF017 | Backend |
| RN-ANU-05 | Anúncio pausado, vendido, excluído ou de conta suspensa não aparece em listagem nem busca. | RF007.4 | Backend |
| RN-ANU-06 | A listagem filtra por faixa de preço e ordena por mais recentes e preço. | RF007.3 | Frontend, Backend |
| RN-ANU-07 | O anúncio novo aparece no topo de "Meus anúncios" e da listagem da categoria. | RF016.3 | Backend |
| RN-ANU-08 | O dono vê indicadores: visualizações, contatos pelo WhatsApp e pedidos recebidos. O backend faz a contagem. | RF017.3 | Backend, Banco |
| RN-ANU-09 | A exclusão é permanente e pede confirmação em modal. Pedidos pagos continuam no histórico do comprador. | RF017.11, RF017.12 | Frontend, Backend, Banco |
| RN-ANU-10 | O aluno não faz pedido do próprio anúncio. | Equipe | Frontend, Backend |

### Estoque (EST)

| Código | Regra | Origem | Onde se aplica |
|---|---|---|---|
| RN-EST-01 | Um anúncio tem N unidades (N ≥ 1), definidas pelo vendedor. | Grupo | Frontend, Backend, Banco |
| RN-EST-02 | O comprador escolhe a quantidade no pop-up "Fazer pedido", sem ultrapassar as unidades disponíveis. | Equipe | Frontend, Backend |
| RN-EST-03 | O estoque diminui quando a venda se fecha: pedido pago pelo site, ou pedido do WhatsApp concluído pelo vendedor. | Equipe | Backend, Banco |
| RN-EST-04 | O desconto é **atômico**: `UPDATE listing SET quantity = quantity - n WHERE id = ? AND quantity >= n`. Se nenhuma linha for alterada, não há estoque. | Equipe | Backend, Banco |
| RN-EST-05 | A quantidade nunca fica negativa (restrição CHECK no banco). | Equipe | Banco |
| RN-EST-06 | Quando a quantidade chega a zero, o anúncio passa a Vendido. | Equipe | Backend |

### Pedidos (PED)

| Código | Regra | Origem | Onde se aplica |
|---|---|---|---|
| RN-PED-01 | O pedido guarda comprador, anúncio, quantidade, preço unitário e total no momento da compra (o preço fica congelado). | Equipe | Backend, Banco |
| RN-PED-02 | **valor_total = preço × quantidade + taxa de serviço**. A taxa é R$ 0,00 por enquanto. | RF010.6, Grupo | Backend |
| RN-PED-03 | O pedido tem identificador próprio (`id_pedido`) e número exibido na confirmação e no histórico. O anúncio excluído de forma lógica não apaga o pedido. | RF011.1, RF017.12 | Backend, Banco |
| RN-PED-04 | O pop-up "Fazer pedido" oferece dois caminhos: seguir para o pagamento ou falar com o vendedor no WhatsApp. | RF009.3, RF009.4 | Frontend |
| RN-PED-05 | O contato pelo WhatsApp registra um pedido "Em negociação" para o vendedor, sem reservar nem descontar estoque. | RF009.5 | Backend |
| RN-PED-06 | "Meus pedidos" lista do mais recente para o mais antigo, com imagem, nome, preço, número, data, status e contato do vendedor. | RF014.1–RF014.5 | Frontend, Backend |
| RN-PED-07 | O vendedor vê os pedidos recebidos em "Gerenciar anúncio", com nome do comprador, forma de negociação, data e status. | RF017.4 | Frontend, Backend |
| RN-PED-08 | Pedido pago: o vendedor marca "retirada combinada" e o comprador confirma o recebimento, que conclui o pedido. | RF011.3, RF014.3 | Frontend, Backend |
| RN-PED-09 | A entrega é presencial; comprador e vendedor combinam por WhatsApp. | Escopo | Frontend |

### Pagamento (PAG)

| Código | Regra | Origem | Onde se aplica |
|---|---|---|---|
| RN-PAG-01 | O pagamento é processado por gateway externo, em cartão ou Pix. O gateway é o Mercado Pago (decisão do grupo). | RF010.7, RNF006, Grupo | Backend |
| RN-PAG-02 | Dados de cartão nunca passam pelo servidor do Unishop: o cartão vira token no navegador pelo SDK do gateway. | RF010.7, RNF006 | Frontend, Backend |
| RN-PAG-03 | O cartão coleta número, nome impresso, validade, CVV e parcelas, validando cada campo. | RF010.2 | Frontend |
| RN-PAG-04 | O Pix gera QR Code e código "copia e cola", e expira em 30 minutos. Expirado, o pedido é cancelado. | RF010.3, RF010.4 | Frontend, Backend |
| RN-PAG-05 | Quem confirma o pagamento é o **webhook** do gateway (assinado e idempotente). O retorno do navegador não confirma nada. | RF010.5 | Backend |
| RN-PAG-06 | Webhook repetido não desconta estoque duas vezes nem cria um segundo pedido pago. | Equipe | Backend, Banco |
| RN-PAG-07 | Pagamento recusado mostra mensagem de erro e permite tentar de novo. | RF010.8 | Frontend, Backend |
| RN-PAG-08 | Pix pendente **não reserva** a unidade: vale o primeiro pagamento confirmado. Se o estoque acabou antes da confirmação, o pedido é cancelado e o valor, estornado. | Equipe | Backend |
| RN-PAG-09 | O resumo mostra item, vendedor, subtotal, taxa de serviço e total. | RF010.6 | Frontend |
| RN-PAG-10 | O valor é cobrado em uma conta única de teste, e o repasse ao vendedor é simulado no escopo acadêmico. | Equipe | Backend |
| RN-PAG-11 | A tela só mostra "pago" quando o pedido está como Pago no backend. | RF011.1 | Frontend, Backend |

### Notificações (NOT)

| Código | Regra | Origem | Onde se aplica |
|---|---|---|---|
| RN-NOT-01 | O vendedor é notificado quando há venda confirmada. | RF011.2 | Backend |
| RN-NOT-02 | O vendedor é notificado quando o admin exclui o produto dele. | RF023.7 | Backend |

### Administração (ADM)

| Código | Regra | Origem | Onde se aplica |
|---|---|---|---|
| RN-ADM-01 | O painel só abre para perfil de administrador, inclusive se a URL for digitada. A verificação é feita no backend. | RF018.1, RNF004 | Frontend, Backend |
| RN-ADM-02 | A lista de usuários mostra indicadores (cadastrados, logados agora, novos na semana), busca por nome ou e-mail e status de acesso. | RF019.1–RF019.4 | Frontend, Backend |
| RN-ADM-03 | "Logado agora" significa atividade nos últimos **5 minutos** (campo `last_seen`); depois disso mostra o tempo desde o último acesso. | RF019.3 | Backend, Banco |
| RN-ADM-04 | O admin edita usuário (foto, nome, e-mail institucional, curso, WhatsApp) com as validações do cadastro. | RF021.1–RF021.3 | Frontend, Backend |
| RN-ADM-05 | O admin suspende e reativa contas. Suspender impede o login e oculta os anúncios, sem apagar dados. | RF021.4, RF021.5 | Backend |
| RN-ADM-06 | Excluir usuário remove a conta e os anúncios dele, com confirmação em modal. | RF020.6, RF020.7 | Frontend, Backend |
| RN-ADM-07 | A lista de produtos mostra indicadores (ativos, pausados e vendidos no mês), busca por nome ou vendedor, filtro por categoria e paginação. | RF022.1–RF022.5 | Frontend, Backend |
| RN-ADM-08 | O admin edita produto, inclusive trocar o vendedor responsável e o status (Ativo, Pausado, Vendido). | RF024.2–RF024.5 | Frontend, Backend |
| RN-ADM-09 | Excluir produto remove o anúncio, notifica o vendedor e pede confirmação em modal. | RF023.6, RF023.7 | Frontend, Backend |
| RN-ADM-10 | Edição, suspensão e exclusão feitas pelo admin ficam registradas em log, com data e responsável. | RF018.5 | Backend, Banco |
| RN-ADM-11 | A conta admin é criada por script (seed), nunca pelo cadastro público. Por isso ela é a exceção da regra do domínio `@edu.unifor.br`. | Equipe | Backend |

## 6. Decisões do grupo

### Reunião de 10/10/2026

| Tema | Decisão |
|---|---|
| Gateway de pagamento | Serviço externo; qual será usado ainda será escolhido. |
| Domínio oficial | `@edu.unifor.br` |
| Anúncio | Item único, com várias unidades quando o vendedor tiver mais de uma. |
| Taxa de serviço | R$ 0,00 por enquanto. |
| Login do admin | Mesma tela do aluno, rota separada, destino no painel admin. |
| Google e Apple | Desejável; só entra se houver tempo. |
| Termos de uso e Privacidade | Serão definidos durante o desenvolvimento. |

### Alinhamento entre frontend e regras de negócio (13/10/2026)

| Tema | Decisão |
|---|---|
| Catálogo | Só para aluno logado; o visitante vê a tela inicial. |
| Pedido | Dois caminhos: pagamento pelo site ou contato pelo WhatsApp ("Em negociação"). |
| Login social | Só Google no MVP. O Apple custa US$ 99 por ano e pode entregar e-mail de retransmissão fora do domínio institucional. |
| Gateway | Mercado Pago (decisão do grupo). |
| Repasse | Conta única de teste, repasse simulado. |
| Estoque no WhatsApp | Não desconta em "Em negociação"; desconta quando o vendedor conclui. |
| Imagem do anúncio | Pelo menos uma, obrigatória. |
| Sessão | JWT no cabeçalho `Authorization: Bearer`. |

## 7. Mapa de testes

O RNF016 exige testes de autenticação, pagamento e status de anúncio. Mínimo esperado:

| Área | Regras | Casos mínimos |
|---|---|---|
| Autenticação | ACE-02, 04, 06, 09, 10, 11, 12 | E-mail fora do domínio; senha fraca; sem aceite dos Termos; 5ª tentativa errada; link expirado; usuário suspenso. |
| Pagamento | PAG-04 a 08; PED-02 | Webhook duplicado; Pix expirado; total correto; pagamento recusado; estoque acabou antes da confirmação. |
| Estoque | EST-03 a 06 | Duas compras simultâneas da última unidade; quantidade nunca negativa; WhatsApp não desconta até concluir. |
| Anúncio e permissões | ANU-04, 05, 09; EST-06; ADM-01 | Pausar e reativar; excluído some e o pedido permanece; aluno em rota admin ou em anúncio alheio recebe 403. |
| Pedido | PED-04, 05, 08 | Os dois caminhos do pop-up; ordem do histórico; transições de status. |
| Acesso ao catálogo | CAT-04 | Visitante não acessa categorias, listagem nem produto. |