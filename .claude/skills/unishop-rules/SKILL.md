---
name: unishop-rules
description: Regras de negócio do Unishop (códigos RN-ACE, RN-PER, RN-CAT, RN-ANU, RN-EST, RN-PED, RN-PAG, RN-NOT, RN-ADM), ciclo de vida de anúncio, pedido e conta, permissões por ator (visitante, aluno, admin), escopo do MVP, limites de campos, itens proibidos e desvios do PDF. Use SEMPRE que o usuário perguntar "qual é a regra", "pode ou não pode", "isso entra no MVP", "qual o limite do campo", citar um RF, RNF ou RN-XXX-nn, escrever critério de aceite ou teste de regra, decidir comportamento de tela ou rota que a documentação não mostra, ou conferir se um documento contradiz as regras, mesmo que não diga "regra de negócio" ou "Unishop".
metadata:
  author: unishop-team
  version: "0.1.0"
---

# Regras de negócio do Unishop

Índice operacional. Fonte completa e autoritativa: [`docs/regras-de-negócio/regras-de-negócio.md`](../../../docs/regras-de-negócio/regras-de-negócio.md) (v0.4, de 16/10/2026; consolidação: Francisco). Este arquivo **não lista as 88 regras**: aponta onde está cada uma e guarda o que mais se consulta. Para o texto exato de uma regra, abra o documento na seção indicada.

Se uma regra não estiver no documento, no PDF (`Trabalho Desenvolvimento Web 2026.pdf`) ou nas decisões do grupo (CLAUDE.md), diga que **não está definida**; não invente. Quando duas fontes discordam: PDF > decisões do grupo > Regras de Negócio > Banco de Dados > Backend e Frontend > API e Deploy > Figma; corrige-se o de menor precedência.

## Onde está cada coisa no documento

| Seção | Conteúdo |
|---|---|
| 2 | Glossário (anúncio × produto, aluno verificado, estoque...) |
| 3 | Quem pode fazer o quê (visitante × aluno × admin) |
| 4 | Ciclo de vida de anúncio, pedido e conta, com transições e quem as faz |
| 5 | As regras por domínio: ACE (acesso), PER (perfil), CAT (categorias), ANU (anúncios), EST (estoque), PED (pedidos), PAG (pagamento), NOT (notificações), ADM (administração) |
| 6 | Decisões do grupo, com datas (vale a mais recente) |
| 7 | Mapa de testes por regra |
| 8 | Escopo do MVP: o que entra, o que fica para depois, o que fica fora |
| 9 | Limites de campos e itens proibidos |
| 10 | Desvios do PDF aceitos pelo grupo |
| 11 | Pendências |

## Permissões em uma linha

Visitante: só a tela inicial (com carrossel), cadastro, login e recuperação de senha. Aluno: catálogo, WhatsApp do vendedor, pedidos, anúncios e perfil próprios, troca de senha. Admin: gerencia **qualquer** usuário e produto, mas **não compra, não paga e não anuncia**; conta nasce só por seed. Toda checagem é no **backend** (RNF004).

## Limites de campos (seção 9)

| Campo | Limite |
|---|---|
| Nome do usuário | 3 a 150 caracteres |
| E-mail | até 150, `@edu.unifor.br` |
| Senha | 8 a 72 caracteres, 1 número e 1 maiúscula |
| Curso | até 100 (opcional) |
| WhatsApp | 10 ou 11 dígitos, com DDD |
| Nome do anúncio | 3 a 150 |
| Descrição | 10 a 2.000, sem HTML |
| Preço | R$ 0,01 a R$ 99.999,99 |
| Quantidade | 1 a 999 |
| Imagens do anúncio | 1 a 5, JPG ou PNG, até **4 MB** cada |
| Foto de perfil | JPG ou PNG, até 4 MB |
| Busca | até 100 caracteres |

Esses valores são propostas da equipe que esperam confirmação final do grupo (pendência 4 do documento), mas valem como referência até lá.

Itens proibidos no anúncio: armas e munições; drogas, cigarros e bebidas alcoólicas; medicamentos controlados; falsificados, roubados ou de origem duvidosa; documentos pessoais e contas de serviços; conteúdo adulto, ofensivo ou discriminatório; animais. O admin remove (RN-ADM-09) e o vendedor recebe e-mail com o motivo.

## Regras que mais aparecem (e que erram fácil)

- **Estoque sem reserva** (RN-EST, RN-PAG-08): Pix pendente não reserva; vale o primeiro pagamento confirmado; desconto atômico; perdeu a corrida = pedido cancelado e estorno.
- **Dois caminhos de pedido** (RN-PED-04, 05): site (`Pendente` → `Pago`...) ou WhatsApp (`Em negociação`, sem desconto de estoque até o vendedor concluir; sem estoque suficiente na conclusão = 409).
- **Pedido aberto reaproveitado** (RN-PED-10) e **cancelamento** (RN-PED-12): comprador cancela Pendente e Em negociação; vendedor encerra a negociação; Pago e Retirada combinada **não** se cancelam pelo sistema no MVP.
- **30 minutos** (RN-PAG-04, 12): Pix e cartão abandonado; pedido vencido é Cancelado e o aluno faz outro (não há novo código).
- **Liquidação** (RN-PAG-13, 14): só conclui com anúncio ativo, vendedor com conta ativa e estoque; pagamento tardio em pedido cancelado é estornado, com e-mail ao comprador (RN-NOT-03).
- **Exclusão** (RN-ANU-09, RN-PER-06, RN-ADM-06, 09): lógica ou por anonimização, **bloqueada** com pedido Pago ou em Retirada combinada em aberto.
- **Login** (RN-ACE-09 a 15): 5 erros = bloqueio de 15 min; JWT de 2 h sem refresh; Google no MVP com "completar cadastro"; troca de senha logado invalida tokens antigos.
- **Admin** (RN-ADM-11, 12): conta só por seed; não suspende nem exclui a si mesmo; o último admin ativo não sai; troca de vendedor só sem pedido aberto (RN-ADM-08).
- **Produção em demonstração** (RN-PAG-10, 15): credenciais de teste do Mercado Pago, repasse simulado e aviso na tela de pagamento e no rodapé.
- **Notificação** (RN-NOT-01 a 04): só por e-mail; não há tela de notificações no MVP.

## Escopo do MVP (seção 8)

**Entra:** cadastro e login (e-mail e senha, e Google), troca e recuperação de senha, UptimeRobot no `/health`, pagamento de teste com Mercado Pago, estorno automático, e-mails de notificação, Termos e Privacidade (textos mínimos).
**Depois do MVP:** confirmação de e-mail por link (chave `EMAIL_VERIFICATION_REQUIRED`), Turnstile, Sentry, tela de notificações, prazo para negociação por WhatsApp, refresh token e logout no servidor, deduplicar visualizações, limite de requisições compartilhado (Redis), teste de carga de 500 usuários, cancelamento de pedido Pago pelo sistema.
**Fora:** login com Apple; cobrança real e repasse real ao vendedor.

## Desvios do PDF (seção 10)

Imagem de 4 MB (RF015.2, RF024.4, RNF005; confirmado 16/10) · produção com credenciais de teste (RF010.7) · exclusão lógica e anonimização no lugar de "excluir" (RF013.8, RF017.11, RF020.7) · Apple fora (RF002.6, RF003.3) · confirmação de e-mail fora do MVP (RF002.5) · metas de 500 usuários e 99% como metas de produto (RNF010, RNF011) · admin não compra nem anuncia (regra do grupo). O que não está nessa lista segue o PDF. O RNF005 cita "NoSQL Injection", mas o banco é PostgreSQL: leia como **SQL Injection** (a correção seria no PDF, que o grupo não edita).

## Como usar nas tarefas

- **Ao implementar:** cite `RF`/`RNF` e `RN-XXX-nn` no código, no teste e no PR.
- **Ao escrever teste ou critério de aceite:** parta da seção 7 (mapa de testes) e das transições da seção 4.
- **Ao encontrar contradição entre documentos:** aponte as duas passagens, diga qual vale pela precedência e proponha a correção no de menor precedência; não resolva em silêncio.
- **Ao mudar uma regra:** a mudança é do grupo; atualize o documento (com data na seção 6) e revise `unishop-backend`, `unishop-frontend` e `unishop-database` se tocarem nela.

## Skills que complementam esta

`unishop-backend` (como o servidor aplica), `unishop-frontend` (como a tela mostra), `unishop-database` (o que o banco garante), `unishop-api` (serviços externos), `unishop-deploy` (produção).
