---
title: Documentação Técnica — Regras de Negócio
project: Unishop
version: 0.4.1
date: 2026-10-27
status: vigente com pendências
owners: Francisco Magno (consolidação)
based_on: requisitos RF001–RF024 e RNF001–RNF016 (PDF do trabalho), protótipos do Figma, decisões do grupo
related: docs/banco-de-dados/banco-de-dados.md, docs/backend/backend.md, docs/frontend/frontend.md, docs/api/api.md, docs/deploy/deploy.md
context: README.md, docs/README.md
pendencias: seção 11
language: pt-BR
---

# Documentação Técnica — Regras de Negócio

- Versão 0.4.1 · 27/10/2026
- Consolidação: Francisco Magno (gestão e integração front-back)
- Base: requisitos RF001–RF024 e RNF001–RNF016, protótipos do Figma e decisões do grupo

### Histórico de versões

| Versão | Data | O que mudou |
|---|---|---|
| 0.3 | 13/10/2026 | Regras por domínio, ciclo de vida, decisões de 10/10 e 13/10 e mapa de testes. |
| 0.4 | 16/10/2026 | Promove às regras as decisões que estavam só no Backend (JWT de 2 h, máximo de 5 imagens, cartão abandonado, e-mail ao comprador, 409 sem estoque, anonimização pelo admin, proteção do admin, canal por e-mail, "completar cadastro" do Google). Acrescenta os casos de borda de dinheiro e estoque (pagamento tardio, liquidação com anúncio inativo, exclusão com pedido em aberto, pedido reaproveitado, cancelamento pelo comprador), o vendedor e o produto congelados no pedido, o WhatsApp no anúncio, a troca de senha, o formato do WhatsApp e a definição de "aluno verificado". Limite de imagem de 4 MB. Login com Google entra no MVP. Une as duas tabelas de decisões em uma. Novas seções: escopo do MVP (8), limites de campos e itens proibidos (9), desvios do PDF (10) e pendências (11). Os nomes de tabela e coluna das regras passam a ser os do Banco de Dados. |
| 0.4.1 | 27/10/2026 | O admin edita só o status: da conta (Ativa ou Suspensa) e do anúncio (Ativo ou Pausado, revertendo Vendido). RN-ADM-04 e RN-ADM-08 reescritas, sem edição de dados nem troca de vendedor; decisão de 26/10 na seção 6, desvio do PDF na seção 10 e pendência 6. |

## 1. Como ler este documento

Aqui estão as regras que o sistema precisa respeitar, não importa a tela nem a tecnologia. Frontend, backend, banco e testes seguem este documento; se houver dúvida de comportamento, vale o que está escrito aqui. Os requisitos originais não são repetidos: a coluna **Origem** aponta para eles.

| Convenção | Significado |
|---|---|
| `RN-XXX-nn` | Código da regra. XXX é o domínio: ACE (acesso), PER (perfil), CAT (categorias), ANU (anúncios), EST (estoque), PED (pedidos), PAG (pagamento), NOT (notificações), ADM (administração). |
| Onde se aplica | Frontend (avisa o usuário), Backend (decide) e Banco (restrição no banco de dados). Algumas regras valem em mais de um. |
| Origem | RF ou RNF do PDF. "Grupo" é decisão da equipe; "Equipe" é definição técnica para fechar um ponto que o PDF não cobre. |
| Regra de segurança ou dinheiro | Sempre aplicada no Backend. O Frontend só antecipa o erro para o usuário. |

> Precedência entre documentos: PDF do trabalho, este documento, Banco de Dados, Backend e Frontend, API e Deploy. Quando dois documentos discordam, o de menor precedência é o que se corrige (ver `docs/README.md`).

## 2. Glossário

| Termo | Significado |
|---|---|
| Anúncio / Produto | Item à venda por um aluno. É um item de catálogo que pode ter **várias unidades** (dois livros iguais, duas calculadoras). O aluno diz "anúncio"; o admin diz "produto". |
| Quantidade | Unidades disponíveis em um anúncio. Cai conforme as vendas. |
| Categoria | Uma das seis categorias fixas: Livros e apostilas, Eletrônicos, Alimentos, Materiais de curso, Vestuário e Outros. |
| Forma de negociação | Como a compra acontece: **pagamento pelo site** (cartão ou Pix) ou **contato pelo WhatsApp**. Aparece no pedido e na listagem. |
| Pedido | Compra de uma ou mais unidades de um anúncio por um comprador. Guarda também o vendedor, o nome do produto e a imagem principal no momento da compra (RN-PED-01). |
| Pedido aberto | Pedido Pendente, Em negociação, Pago ou Retirada combinada. Concluído e Cancelado são encerrados. |
| Em negociação | Pedido nascido do contato pelo WhatsApp, ainda sem venda fechada. |
| Retirada | Encontro presencial, combinado por WhatsApp, para entregar o produto. |
| WhatsApp do anúncio | Número de contato gravado no próprio anúncio. Nasce preenchido com o do perfil do aluno e pode ser editado (RN-ANU-01). |
| Aluno verificado | Conta com e-mail **@edu.unifor.br** confirmado: por link enviado ao e-mail (RN-ACE-07) ou por login com Google (RN-ACE-14). O selo "aluno verificado" aparece no vendedor, na página do produto. |
| Administrador | Conta com permissão de gestão de usuários e produtos. |
| Conta suspensa | Conta que não entra no sistema; os anúncios ficam ocultos e os dados são mantidos. |
| Anonimização | Exclusão de perfil: os dados pessoais são apagados e a conta vira "Usuário removido"; o registro continua no banco para o histórico dos pedidos. |

## 3. Quem pode fazer o quê

| Ação | Visitante | Aluno | Admin |
|---|---|---|---|
| Ver a tela inicial, o carrossel de anúncios recentes e as seções informativas | Sim | Sim | Sim |
| Cadastrar-se, entrar (e-mail e senha, ou Google) e recuperar a senha | Sim | — | — |
| Trocar a própria senha, com a sessão aberta | Não | Sim | Sim |
| Ver categorias, listagens e página do produto | Não | Sim | Sim |
| Ver o WhatsApp do vendedor | Não | Sim | Sim |
| Fazer pedido e pagar | Não | Sim | Não |
| Cancelar o próprio pedido pendente ou em negociação | Não | Sim | Não |
| Criar, editar, pausar, vender e excluir o próprio anúncio | Não | Sim | Não |
| Ver o próprio histórico de pedidos e os pedidos recebidos | Não | Sim | Não |
| Editar e excluir o próprio perfil | Não | Sim | Sim |
| Gerenciar qualquer usuário (ver, suspender ou reativar, excluir) | Não | Não | Sim |
| Gerenciar qualquer produto (ver, mudar status, excluir) | Não | Não | Sim |

> A checagem de permissão é feita sempre no **backend** (RNF004). Esconder um botão no frontend não é controle de acesso.

## 4. Ciclo de vida

### Anúncio

```text
Ativo ──pausar──▶ Pausado ──reativar──▶ Ativo
Ativo ou Pausado ──estoque zerou / marcar como vendido──▶ Vendido
Qualquer estado ──excluir──▶ Excluído (some para os usuários; o registro fica)
```

| De | Para | Quem | Como |
|---|---|---|---|
| Ativo | Pausado | Dono | Some das listagens e buscas; mantém dados e unidades (RF017.7). |
| Pausado | Ativo | Dono | Volta às listagens, se a conta não estiver suspensa e se houver unidades (RF017.8). |
| Ativo ou Pausado | Vendido | Sistema | A quantidade chegou a zero depois de uma venda. |
| Ativo ou Pausado | Vendido | Dono | "Marcar como vendido", com confirmação em modal. Zera as unidades que sobraram (RF017.9). |
| Vendido | Ativo ou Pausado | Admin | Só o admin reverte, e a ação fica registrada no log (RF024.5, RF018.5). Para o dono, Vendido é final. |
| Qualquer | Excluído | Dono ou Admin | Some para os usuários, e o registro fica no histórico (exclusão lógica). Bloqueada se houver pedido Pago ou em Retirada combinada em aberto (RN-ANU-09). Pedidos pagos continuam no histórico do comprador (RF017.11, RF017.12). |

### Pedido

O pedido tem dois caminhos, conforme o pop-up "Fazer pedido" (RF009):

```text
Pagamento pelo site:
  Pendente ──pagamento confirmado──▶ Pago
  Pago ──vendedor marca──▶ Retirada combinada ──comprador confirma──▶ Concluído
  Pendente ──Pix expirou, 30 min sem pagar ou comprador cancela──▶ Cancelado
  Pendente ──pagamento confirmado, mas sem estoque ou anúncio inativo──▶ Cancelado (com estorno)

Contato pelo WhatsApp:
  Em negociação ──vendedor confirma a venda──▶ Concluído
  Em negociação ──vendedor encerra ou comprador cancela──▶ Cancelado
```

| Estado | Significado | Texto na interface |
|---|---|---|
| Pendente | Aguardando pagamento (Pix ou cartão) | "Aguardando pagamento" |
| Pago | Pagamento confirmado | Comprador: "Pago · aguardando retirada" (RF014.3). Vendedor: "Pago · combinar retirada" (RF011.3). |
| Retirada combinada | Encontro marcado | "Retirada combinada" |
| Concluído | Produto entregue | "Concluído" |
| Em negociação | Contato por WhatsApp registrado (RF009.5) | "Em negociação" |
| Cancelado | Pedido encerrado sem venda | "Cancelado" |

A interface usa textos diferentes para cada lado, mas no banco existe **um único valor por estado**. O Pix expirado **não gera novo código no mesmo pedido**: o pedido é cancelado e o aluno faz um novo pedido (RN-PAG-04). Um pedido Cancelado nunca volta a Pendente.

### Conta

```text
Ativa ──5 senhas erradas──▶ Bloqueada por 15 min ──tempo──▶ Ativa
Ativa ──admin suspende──▶ Suspensa ──admin reativa──▶ Ativa
Ativa ou Suspensa ──usuário ou admin exclui──▶ Excluída (anonimizada)
```

## 5. Regras por domínio

### Acesso e cadastro (ACE)

| Código | Regra | Origem | Onde se aplica |
|---|---|---|---|
| RN-ACE-01 | O cadastro pede nome completo, e-mail institucional, senha e confirmação de senha. Curso e WhatsApp são opcionais no cadastro e entram pelo perfil (RN-PER-01). | RF002.1 | Frontend, Backend |
| RN-ACE-02 | O cadastro só aceita e-mail do domínio **@edu.unifor.br**. | RF002.2, RNF002 | Frontend, Backend |
| RN-ACE-03 | O e-mail é único, sem diferenciar maiúsculas de minúsculas. Cadastro repetido é recusado. | RF002.4 | Backend, Banco |
| RN-ACE-04 | Senha com 8 a 72 caracteres, 1 número e 1 letra maiúscula, igual à confirmação. | RF002.3, RF004.5 | Frontend, Backend |
| RN-ACE-05 | A senha é guardada só como hash (bcrypt, custo 12), nunca em texto. | RNF001 | Backend |
| RN-ACE-06 | O cadastro exige o aceite dos Termos de uso e da Política de privacidade, e a data do aceite é registrada. No primeiro acesso por Google, o aceite é pedido na tela "completar cadastro" (RN-ACE-14). | RNF007 | Frontend, Backend, Banco |
| RN-ACE-07 | A conta é ativada por um link enviado ao e-mail (desejável, **fora do MVP**). Fica atrás de uma chave: desligada, o cadastro nasce ativo com `verificacao = false`; ligada, o login exige o e-mail confirmado. | RF002.5 | Backend |
| RN-ACE-08 | Credencial inválida mostra erro genérico, sem dizer qual campo está errado. | RF003.2 | Frontend, Backend |
| RN-ACE-09 | Após 5 senhas erradas seguidas, o login fica bloqueado por **15 minutos**. | RNF003 | Backend, Banco |
| RN-ACE-10 | A recuperação de senha envia um link por e-mail, válido por 30 minutos e invalidado após o uso. | RF004.2, RF004.6 | Backend, Banco |
| RN-ACE-11 | A sessão usa JWT com validade de **2 horas**, enviado no cabeçalho `Authorization: Bearer`, sem renovação (não há refresh token). Token expirado ou emitido antes da última troca de senha é recusado (401), e o frontend leva ao login. | RNF003 | Frontend, Backend |
| RN-ACE-12 | Conta suspensa não consegue entrar. | RF021.5 | Backend |
| RN-ACE-13 | O admin usa a mesma tela de login, em rota separada, e cai no painel administrativo. O aluno cai em Categorias. | Grupo, RF003.4 | Frontend, Backend |
| RN-ACE-14 | O login com Google está no **MVP**, ao lado do e-mail e senha. O servidor confere o domínio `@edu.unifor.br` e o e-mail verificado pelo Google. A conta criada por Google nasce ativa, **sem senha** e verificada. No primeiro acesso o aluno passa pela tela "completar cadastro" (aceite dos Termos, curso e WhatsApp opcionais). O login com Apple fica fora do MVP. | RF002.6, RF003.3, RNF002, Grupo | Frontend, Backend |
| RN-ACE-15 | O usuário logado (aluno ou admin) troca a própria senha informando a atual e a nova, que segue a RN-ACE-04. Tokens emitidos antes da troca deixam de valer. Conta criada por Google define senha pela recuperação (RN-ACE-10). A senha inicial do admin vem do seed e deve ser trocada no primeiro acesso. | Equipe | Frontend, Backend, Banco |

### Perfil (PER)

| Código | Regra | Origem | Onde se aplica |
|---|---|---|---|
| RN-PER-01 | O aluno edita foto, nome, curso e WhatsApp, com as mesmas validações do cadastro. | RF013.1, RF013.2 | Frontend, Backend |
| RN-PER-02 | Trocar o e-mail institucional exige confirmação no novo endereço, que também deve ser `@edu.unifor.br`, antes de a troca valer. | RF013.4 | Frontend, Backend |
| RN-PER-03 | Ao mudar o WhatsApp do perfil, o novo número é aplicado aos anúncios **ativos** do aluno. Depois disso, o aluno ainda pode editar o número de um anúncio. | RF013.3 | Backend |
| RN-PER-04 | O WhatsApp só aparece para usuários logados. | RF015.4, RNF007 | Backend |
| RN-PER-05 | Foto de perfil em JPG ou PNG, até **4 MB**. | RNF005, Grupo | Frontend, Backend |
| RN-PER-06 | Excluir o perfil exige digitar "EXCLUIR". A conta é anonimizada (dados pessoais apagados, token de sessão deixa de valer) e os anúncios saem do ar. É **bloqueada** enquanto houver pedido Pago ou em Retirada combinada em aberto, como comprador ou vendedor. Pedidos Pendentes e Em negociação são cancelados. Pedidos pagos permanecem no histórico da outra parte, com o nome "Usuário removido". | RF013.7, RF013.8, RF017.12, RNF007 | Frontend, Backend, Banco |
| RN-PER-07 | O WhatsApp é guardado só com dígitos: 10 ou 11, com DDD. | RF013.2, Equipe | Frontend, Backend |

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
| RN-ANU-01 | Só aluno logado cria anúncio. Obrigatórios: nome, categoria, descrição, preço, quantidade e WhatsApp. O WhatsApp é gravado **no anúncio**, nasce preenchido com o do perfil e é editável. Sem WhatsApp no perfil, o aluno o informa no próprio anúncio. | RF015.1, RF015.3 | Frontend, Backend, Banco |
| RN-ANU-02 | Preço maior que zero, com duas casas decimais. | RF015.1 | Frontend, Backend, Banco |
| RN-ANU-03 | Pelo menos **1 e no máximo 5** imagens, em JPG ou PNG, de até **4 MB** cada. A página do produto mostra galeria com miniaturas. | RF015.2, RF008.1, Grupo | Frontend, Backend |
| RN-ANU-04 | Só o dono (ou o admin) edita, pausa ou exclui o anúncio. | RNF004, RF017 | Backend |
| RN-ANU-05 | Anúncio pausado, vendido, excluído ou de conta suspensa não aparece em listagem nem busca. | RF007.4 | Backend |
| RN-ANU-06 | A listagem filtra por faixa de preço e ordena por mais recentes e preço. | RF007.3 | Frontend, Backend |
| RN-ANU-07 | O anúncio novo aparece no topo de "Meus anúncios" e da listagem da categoria. | RF016.3 | Backend |
| RN-ANU-08 | O dono vê indicadores: visualizações, contatos pelo WhatsApp e pedidos recebidos. O backend faz a contagem. | RF017.3 | Backend, Banco |
| RN-ANU-09 | A exclusão pede confirmação em modal. O anúncio some para os usuários e o registro continua no histórico (exclusão lógica). É **bloqueada** enquanto houver pedido Pago ou em Retirada combinada em aberto; pedidos Pendentes e Em negociação são cancelados. Pedidos pagos continuam no histórico do comprador. | RF017.11, RF017.12 | Frontend, Backend, Banco |
| RN-ANU-10 | O aluno não faz pedido do próprio anúncio. | Equipe | Frontend, Backend |
| RN-ANU-11 | A visualização soma +1 a cada abertura da página do produto por quem não é o dono. No MVP não se deduplica por pessoa. | RF017.3, Equipe | Backend, Banco |
| RN-ANU-12 | Os campos do anúncio e do perfil seguem os limites da seção 9. Itens da lista de proibidos (seção 9) não podem ser anunciados e são removidos pelo admin (RN-ADM-09). | RF015.1, Equipe | Frontend, Backend |

### Estoque (EST)

| Código | Regra | Origem | Onde se aplica |
|---|---|---|---|
| RN-EST-01 | Um anúncio tem N unidades (N ≥ 1), definidas pelo vendedor. | Grupo | Frontend, Backend, Banco |
| RN-EST-02 | O comprador escolhe a quantidade no pop-up "Fazer pedido", sem ultrapassar as unidades disponíveis. | Equipe | Frontend, Backend |
| RN-EST-03 | O estoque diminui quando a venda se fecha: pedido pago pelo site, ou pedido do WhatsApp concluído pelo vendedor. | Equipe | Backend, Banco |
| RN-EST-04 | O desconto é **atômico**: `UPDATE anuncio SET quantidade = quantidade - n WHERE id_anuncio = ? AND quantidade >= n`. Se nenhuma linha for alterada, não há estoque. | Equipe | Backend, Banco |
| RN-EST-05 | A quantidade nunca fica negativa (restrição CHECK no banco). Anúncio ativo tem pelo menos 1 unidade. | Equipe | Banco |
| RN-EST-06 | Quando a quantidade chega a zero, o anúncio passa a Vendido. | Equipe | Backend |

### Pedidos (PED)

| Código | Regra | Origem | Onde se aplica |
|---|---|---|---|
| RN-PED-01 | O pedido guarda comprador, **vendedor**, anúncio, **nome do produto e imagem principal**, quantidade, preço unitário e total no momento da compra. Tudo fica congelado: mudar o anúncio, trocar o dono ou apagar a imagem depois não altera o pedido. | Equipe | Backend, Banco |
| RN-PED-02 | **valor_total = preço × quantidade + taxa de serviço**. A taxa é R$ 0,00 por enquanto. | RF010.6, Grupo | Backend |
| RN-PED-03 | O pedido tem identificador próprio (`id_pedido`) e número exibido na confirmação e no histórico. O anúncio excluído de forma lógica não apaga o pedido. | RF011.1, RF017.12 | Backend, Banco |
| RN-PED-04 | O pop-up "Fazer pedido" oferece dois caminhos: seguir para o pagamento ou falar com o vendedor no WhatsApp. | RF009.3, RF009.4 | Frontend |
| RN-PED-05 | O contato pelo WhatsApp registra um pedido "Em negociação" para o vendedor, sem reservar nem descontar estoque. | RF009.5 | Backend |
| RN-PED-06 | "Meus pedidos" lista do mais recente para o mais antigo, com imagem, nome, preço, número, data, status e contato do vendedor. | RF014.1–RF014.5 | Frontend, Backend |
| RN-PED-07 | O vendedor vê os pedidos recebidos em "Gerenciar anúncio", com nome do comprador, forma de negociação, data e status. | RF017.4 | Frontend, Backend |
| RN-PED-08 | Pedido pago: o vendedor marca "retirada combinada" e o comprador confirma o recebimento, que conclui o pedido. | RF011.3, RF014.3 | Frontend, Backend |
| RN-PED-09 | A entrega é presencial; comprador e vendedor combinam por WhatsApp. | Escopo | Frontend |
| RN-PED-10 | Cada comprador tem **um pedido aberto por anúncio e forma de negociação** (Pendente ou Em negociação). Um novo clique reaproveita esse pedido, atualizando a quantidade se ela mudou, em vez de criar outro. | Equipe | Backend, Banco |
| RN-PED-11 | A negociação pelo WhatsApp **não tem prazo** no MVP: fica "Em negociação" até alguém encerrar. | Grupo | Backend |
| RN-PED-12 | O comprador pode cancelar o próprio pedido Pendente ou Em negociação. O vendedor pode encerrar a negociação (Em negociação para Cancelado). Pedido Pago ou em Retirada combinada não se cancela pelo sistema no MVP. | Grupo | Frontend, Backend |
| RN-PED-13 | Ao concluir uma negociação, se o estoque não bastar, a conclusão é recusada (409) e o pedido continua "Em negociação". | Equipe | Backend |

### Pagamento (PAG)

| Código | Regra | Origem | Onde se aplica |
|---|---|---|---|
| RN-PAG-01 | O pagamento é processado por gateway externo, em cartão ou Pix. O gateway é o Mercado Pago (decisão do grupo). | RF010.7, RNF006, Grupo | Backend |
| RN-PAG-02 | Dados de cartão nunca passam pelo servidor do Unishop: o cartão vira token no navegador pelo SDK do gateway. | RF010.7, RNF006 | Frontend, Backend |
| RN-PAG-03 | O cartão coleta número, nome impresso, validade, CVV e parcelas, validando cada campo. | RF010.2 | Frontend |
| RN-PAG-04 | O Pix gera QR Code e código "copia e cola", e expira em 30 minutos. Expirado, o pedido é cancelado e o aluno faz um **novo pedido** (não há novo código no mesmo pedido). | RF010.3, RF010.4 | Frontend, Backend |
| RN-PAG-05 | Quem confirma o pagamento é o **webhook** do gateway (assinado e idempotente). O retorno do navegador não confirma nada. | RF010.5 | Backend |
| RN-PAG-06 | Webhook repetido não desconta estoque duas vezes nem cria um segundo pedido pago. | Equipe | Backend, Banco |
| RN-PAG-07 | Pagamento recusado mostra mensagem de erro e permite tentar de novo no mesmo pedido. | RF010.8 | Frontend, Backend |
| RN-PAG-08 | Pix pendente **não reserva** a unidade: vale o primeiro pagamento confirmado. Se o estoque acabou antes da confirmação, o pedido é cancelado e o valor, estornado. | Equipe | Backend |
| RN-PAG-09 | O resumo mostra item, vendedor, subtotal, taxa de serviço e total. | RF010.6 | Frontend |
| RN-PAG-10 | O valor é cobrado em uma conta única de teste, e o repasse ao vendedor é simulado no escopo acadêmico. A produção usa as credenciais de **teste** do gateway. | Equipe | Backend |
| RN-PAG-11 | A tela só mostra "pago" quando o pedido está como Pago no backend. | RF011.1 | Frontend, Backend |
| RN-PAG-12 | Pedido Pendente sem pagamento aprovado é cancelado **30 minutos** depois de criado. Vale para Pix e para cartão abandonado. | Equipe | Backend |
| RN-PAG-13 | Se um pagamento for aprovado depois de o pedido já estar Cancelado, o valor é **estornado automaticamente** e o comprador é avisado por e-mail (RN-NOT-03). | Grupo | Backend |
| RN-PAG-14 | A liquidação só conclui o pedido se o anúncio estiver **ativo** (não pausado, vendido nem excluído), se a conta do vendedor não estiver suspensa e se houver estoque. Caso contrário o pedido é cancelado e o valor estornado, pelo mesmo caminho da RN-PAG-08. | Grupo | Backend |
| RN-PAG-15 | A tela de pagamento e o rodapé avisam que o ambiente é de **demonstração** e que nenhum valor é cobrado de verdade (RN-PAG-10). | Equipe | Frontend |

### Notificações (NOT)

| Código | Regra | Origem | Onde se aplica |
|---|---|---|---|
| RN-NOT-01 | O vendedor é notificado por e-mail quando há venda confirmada. | RF011.2 | Backend |
| RN-NOT-02 | O vendedor é notificado por e-mail quando o admin exclui o produto dele. | RF023.7 | Backend |
| RN-NOT-03 | O comprador é notificado por e-mail quando o pedido pago é cancelado por falta de estoque ou anúncio inativo, com o estorno (RN-PAG-13, RN-PAG-14). | Equipe | Backend |
| RN-NOT-04 | O canal de notificação é o **e-mail**. Não há tela de notificações no MVP. | Grupo | Backend |

### Administração (ADM)

| Código | Regra | Origem | Onde se aplica |
|---|---|---|---|
| RN-ADM-01 | O painel só abre para perfil de administrador, inclusive se a URL for digitada. A verificação é feita no backend. | RF018.1, RNF004 | Frontend, Backend |
| RN-ADM-02 | A lista de usuários mostra indicadores (cadastrados, logados agora, novos na semana), busca por nome ou e-mail e status de acesso. Os indicadores contam só **alunos** com conta ativa ou suspensa; admin e contas excluídas ficam de fora, e "logado agora" conta só contas ativas. | RF019.1–RF019.4 | Frontend, Backend |
| RN-ADM-03 | "Logado agora" significa atividade nos últimos **5 minutos** (campo `ultimo_acesso` do Banco); depois disso mostra o tempo desde o último acesso. | RF019.3 | Backend, Banco |
| RN-ADM-04 | O admin vê os dados do usuário (foto, nome, e-mail institucional, curso, WhatsApp) **só para consulta**. A edição se limita ao **status da conta** (Ativa ou Suspensa, RN-ADM-05); `excluida` vem só da ação Excluir (RN-ADM-06). Desvio do PDF (seção 10). | RF021.1–RF021.3 | Frontend, Backend |
| RN-ADM-05 | O admin suspende e reativa contas. Suspender impede o login e oculta os anúncios, sem apagar dados. | RF021.4, RF021.5 | Backend |
| RN-ADM-06 | Excluir usuário **anonimiza** a conta, com o mesmo tratamento da RN-PER-06: os anúncios saem do ar e os pedidos pagos permanecem no histórico. É bloqueada enquanto houver pedido Pago ou em Retirada combinada em aberto. Pede confirmação em modal. | RF020.6, RF020.7 | Frontend, Backend |
| RN-ADM-07 | A lista de produtos mostra indicadores (ativos, pausados e vendidos no mês), busca por nome ou vendedor, filtro por categoria e paginação. | RF022.1–RF022.5 | Frontend, Backend |
| RN-ADM-08 | O admin altera **só o status do anúncio**: Ativo ou Pausado, e reverte Vendido para um dos dois (seção 4). Dados, imagens e vendedor aparecem só para consulta; **não há troca de vendedor**. Desvio do PDF (seção 10). | RF024.2–RF024.5 | Frontend, Backend |
| RN-ADM-09 | Excluir produto remove o anúncio, notifica o vendedor e pede confirmação em modal. É bloqueada enquanto houver pedido Pago ou em Retirada combinada em aberto. | RF023.6, RF023.7 | Frontend, Backend |
| RN-ADM-10 | Edição, suspensão e exclusão feitas pelo admin ficam registradas em log, com data e responsável. | RF018.5 | Backend, Banco |
| RN-ADM-11 | A conta admin é criada por script (seed), nunca pelo cadastro público. Por isso ela é a exceção da regra do domínio `@edu.unifor.br`. | Equipe | Backend |
| RN-ADM-12 | O admin não suspende nem exclui a própria conta, e o último admin ativo não pode ser removido. | Equipe | Backend |

## 6. Decisões do grupo

Uma tabela só, com a data de cada decisão. Quando duas decisões tratam do mesmo tema, vale a mais recente.

| Tema | Decisão | Data |
|---|---|---|
| Domínio oficial | `@edu.unifor.br` | 10/10 |
| Anúncio | Item único, com várias unidades quando o vendedor tiver mais de uma. | 10/10 |
| Taxa de serviço | R$ 0,00 por enquanto. | 10/10 |
| Login do admin | Mesma tela do aluno, rota separada, destino no painel admin. | 10/10 |
| Catálogo | Só para aluno logado; o visitante vê a tela inicial. | 13/10 |
| Pedido | Dois caminhos: pagamento pelo site ou contato pelo WhatsApp ("Em negociação"). | 13/10 |
| Gateway | Mercado Pago. Substitui a decisão de 10/10 ("será escolhido"). | 13/10 |
| Repasse | Conta única de teste, repasse simulado. | 13/10 |
| Estoque no WhatsApp | Não desconta em "Em negociação"; desconta quando o vendedor conclui. | 13/10 |
| Imagem do anúncio | Pelo menos uma, obrigatória; no máximo cinco. | 13/10 e 15/10 |
| Sessão | JWT no cabeçalho `Authorization: Bearer`, validade de 2 horas. | 13/10 e 15/10 |
| Hospedagem | Vercel (frontend e API) e Neon (PostgreSQL). | 15/10 |
| Termos de uso e Privacidade | Textos mínimos escritos antes da entrega (seção 11). Substitui "serão definidos durante o desenvolvimento". | 16/10 |
| Login social | **Google no MVP**, junto do e-mail e senha, com o domínio `@edu.unifor.br` conferido no servidor. Apple fora (custo de US$ 99 por ano e e-mail de retransmissão fora do domínio). Substitui "Google e Apple desejáveis" (10/10). | 16/10 |
| Imagem de 4 MB | Limite de **4 MB** por imagem, uma por requisição (limite da hospedagem). | 16/10 |
| Infraestrutura | Gratuita. A meta de 500 usuários simultâneos é meta de produto, **não é medida no MVP**; se o projeto seguir como produto depois da avaliação, a meta e a infraestrutura são revistas. | 16/10 |
| Casos de borda de dinheiro | Pagamento tardio estornado, liquidação só com anúncio ativo, exclusão bloqueada com pedido em aberto, pedido aberto reaproveitado, cancelamento pelo comprador (RN-PAG-13, RN-PAG-14, RN-PER-06, RN-PED-10, RN-PED-12). | 16/10 |
| Edição pelo admin | O admin edita **só o status**: da conta (Ativa ou Suspensa) e do anúncio (Ativo ou Pausado, revertendo Vendido). Os dados ficam só para consulta, sem troca de vendedor e sem punições ou prazos de suspensão. Substitui a edição completa da v0.4 (RN-ADM-04, RN-ADM-08). Pedido do gestor; registrado em 27/10. | 26/10 |

## 7. Mapa de testes

O RNF016 exige testes de autenticação, pagamento e status de anúncio. Mínimo esperado:

| Área | Regras | Casos mínimos |
|---|---|---|
| Autenticação | ACE-02, 03, 04, 06, 09, 10, 11, 12, 14, 15 | E-mail fora do domínio; e-mail repetido com maiúsculas; senha fraca; sem aceite dos Termos; 5ª tentativa errada; link expirado; usuário suspenso; token expirado (2 h); token anterior à troca de senha; Google com e-mail de outro domínio ou não verificado; troca de senha com a atual errada. |
| Pagamento | PAG-04 a 08, 12 a 14; PED-02 | Webhook duplicado; Pix expirado cancela; pedido pendente de 30 min cancela; total correto; pagamento recusado; estoque acabou antes da confirmação; pagamento aprovado em pedido já cancelado é estornado; pagamento com anúncio pausado cancela e estorna. |
| Estoque | EST-03 a 06 | Duas compras simultâneas da última unidade; quantidade nunca negativa; WhatsApp não desconta até concluir; concluir sem estoque devolve 409 (PED-13). |
| Anúncio e permissões | ANU-03, 04, 05, 09; EST-06; ADM-01, 06, 08, 09, 12 | Máximo de 5 imagens; pausar e reativar; excluído some e o pedido permanece; exclusão bloqueada com pedido pago em aberto; aluno em rota admin ou em anúncio alheio recebe 403; edição do admin aceita só o status (outros campos são recusados); admin não suspende a si mesmo. |
| Pedido | PED-04, 05, 08, 10, 11, 12 | Os dois caminhos do pop-up; ordem do histórico; transições de status; novo clique reaproveita o pedido aberto; comprador cancela o pendente; vendedor encerra a negociação. |
| Perfil | PER-05, 06, 07 | Foto acima de 4 MB; exclusão bloqueada com pedido pago em aberto; WhatsApp com formato inválido. |
| Acesso ao catálogo | CAT-04 | Visitante não acessa categorias, listagem nem produto. |

## 8. Escopo do MVP

Tudo que está nas seções 5 e 6 entra no MVP, exceto o que a tabela abaixo manda para depois ou para fora.

| Item | Situação | Observação |
|---|---|---|
| Cadastro e login com e-mail e senha | MVP | RN-ACE-01 a 15 |
| Login com Google (`@edu.unifor.br`) | MVP | RN-ACE-14 |
| Login com Apple | Fora | Custo e e-mail de retransmissão |
| Confirmação de e-mail por link | Depois | RN-ACE-07; entra ligando a chave |
| Anti-bot (Turnstile) | Depois | Antes de abrir a todos os alunos |
| Monitoramento de erros (Sentry) | Depois | O plano gratuito tem 1 usuário |
| Monitor de disponibilidade (UptimeRobot) | MVP | Chama o `/health` leve |
| Pagamento com Mercado Pago em modo de teste | MVP | RN-PAG-10 |
| Cobrança real e repasse real ao vendedor | Fora | Conta única de teste |
| Estorno automático | MVP | RN-PAG-08, 13 e 14 |
| Cancelamento de pedido Pago ou Retirada combinada pelo sistema | Depois | Combinar por WhatsApp; ver pendência 2 |
| Notificação por e-mail | MVP | RN-NOT-01 a 04 |
| Tela de notificações | Depois | RN-NOT-04 |
| Prazo para negociação por WhatsApp | Depois | RN-PED-11 |
| Termos de uso e Política de privacidade | MVP | Textos mínimos |
| Refresh token e logout no servidor | Depois | RN-ACE-11 |
| Deduplicar visualizações | Depois | RN-ANU-11 |
| Limite de requisições compartilhado entre instâncias (Redis) | Depois | Aceito em memória por instância no MVP |
| Teste de carga de 500 usuários simultâneos | Depois | Meta de produto (seção 6) |

## 9. Limites de campos e itens proibidos

Os valores abaixo são o limite de cada campo. O Frontend valida para responder rápido, o Backend recusa o que passar (400 `VALIDATION_ERROR`) e, onde o Banco tem restrição, ela segue estes valores.

| Campo | Limite | Observação |
|---|---|---|
| Nome do usuário | 3 a 150 caracteres | Banco: `varchar(150)` |
| E-mail | Até 150 caracteres, `@edu.unifor.br` | RN-ACE-02 |
| Senha | 8 a 72 caracteres | O bcrypt só lê 72 bytes |
| Curso | Até 100 caracteres | Opcional |
| WhatsApp | 10 ou 11 dígitos, com DDD | RN-PER-07 |
| Nome do anúncio | 3 a 150 caracteres | |
| Descrição do anúncio | 10 a 2.000 caracteres | Texto sem HTML |
| Preço | De R$ 0,01 a R$ 99.999,99 | `numeric(10,2)` |
| Quantidade | De 1 a 999 | RN-EST-01 |
| Imagens do anúncio | 1 a 5, JPG ou PNG, até 4 MB cada | RN-ANU-03 |
| Foto de perfil | JPG ou PNG, até 4 MB | RN-PER-05 |
| Texto de busca | Até 100 caracteres | |

**Itens proibidos.** Não podem ser anunciados: armas e munições; drogas, cigarros e bebidas alcoólicas; medicamentos de venda controlada; produtos falsificados, roubados ou de origem duvidosa; documentos pessoais e contas de serviços; conteúdo adulto, ofensivo ou discriminatório; animais. O admin remove o anúncio (RN-ADM-09), e o vendedor recebe o aviso por e-mail com o motivo.

## 10. Desvios do PDF do trabalho

O PDF do trabalho tem precedência sobre este documento. Cada ponto abaixo foge do PDF e está registrado aqui como exceção do grupo; o que não está nesta lista segue o PDF.

| Desvio | Requisitos do PDF | Regra e decisão | Situação |
|---|---|---|---|
| Imagem de até 4 MB | RF015.2, RF024.4, RNF005 (5 MB) | RN-ANU-03, RN-PER-05 | Confirmado pelo grupo em 16/10/2026 |
| Produção com credenciais de teste | RF010.7 | RN-PAG-10, RN-PAG-15 | Exceção registrada; aviso na tela |
| Exclusão lógica e anonimização no lugar de "excluir" | RF013.8, RF017.11, RF020.7 | RN-PER-06, RN-ANU-09, RN-ADM-06 | Exceção registrada (LGPD e histórico de pedidos) |
| Apple fora do MVP | RF002.6, RF003.3, RNF002 | RN-ACE-14 | Item "desejável"; Google entra no MVP |
| Confirmação de e-mail fora do MVP | RF002.5 | RN-ACE-07 | Item "desejável"; entra ligando a chave |
| Metas de 500 usuários e 99% | RNF010, RNF011 | Seção 6 | Meta de produto; não é medida no MVP |
| Admin não compra nem anuncia | Não está no PDF | Seção 3 | Regra do grupo |
| Admin edita só o status (conta e anúncio), sem editar dados nem trocar o vendedor | RF021.1–RF021.3, RF024.2–RF024.5 | RN-ADM-04, RN-ADM-08 | Decisão de 26/10/2026 (seção 6); conferir o texto exato no PDF (pendência 6) |

O texto do RNF005 cita "NoSQL Injection", mas o banco é PostgreSQL: o risco real é **SQL Injection**. A correção é no PDF do trabalho, que não é editado por este grupo; a documentação técnica usa "SQL Injection".

## 11. Pendências

| # | Pendência | Proposta |
|---|---|---|
| 1 | O admin que precisa remover um anúncio ou usuário com pedido Pago em aberto fica bloqueado (RN-ADM-06, RN-ADM-09) | Aceitar no MVP; se for problema, o admin cancela o pedido com estorno antes de excluir |
| 2 | Pedido Pago ou em Retirada combinada não tem cancelamento pelo sistema (RN-PED-12) | Combinar por WhatsApp no MVP; cancelamento com estorno entra depois |
| 3 | Os textos dos Termos de uso e da Política de privacidade ainda não existem | Francisco escreve a versão mínima, com a versão do aceite e a limitação dos backups (Deploy, seção 11) |
| 4 | Os valores da seção 9 e a lista de itens proibidos são propostas da equipe | O grupo confirma ou ajusta antes de o Frontend e o Backend implementarem |
| 5 | Se o projeto seguir como produto depois da avaliação, a meta de 500 usuários e o plano de hospedagem voltam à mesa | Revisar o Deploy (limites do plano gratuito) |
| 6 | A edição só de status (26/10) foge de RF021.1–RF021.3 e RF024.2–RF024.5; o texto exato desses itens não foi conferido no PDF | Conferir no PDF quais subitens deixam de ser atendidos e confirmar o desvio com o grupo antes da entrega |