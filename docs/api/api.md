---
title: Documentação Técnica — API (APIs externas e segurança)
project: Unishop
version: 0.3
date: 2026-10-16
status: vigente com pendências
owners: Pedro Cândido (engenheiro de API)
reviewers: Felipe Bessa (backend), Francisco Magno (integração front-back)
based_on: Regras de Negócio v0.4, Backend v0.3, Banco de Dados v0.2, Deploy v0.3
related: docs/regras-de-negocio/regras-de-negocio.md, docs/banco-de-dados/banco-de-dados.md, docs/backend/backend.md, docs/frontend/frontend.md, docs/deploy/deploy.md
context: README.md, docs/README.md
pendencias: seção 12
language: pt-BR (código e pastas em inglês; interface em português)
---

# Documentação Técnica — API (APIs externas e segurança)

- Versão 0.3 · 16/10/2026
- Base: Regras de Negócio v0.4, requisitos RF001–RF024 e RNF001–RNF016, Backend v0.3, Banco de Dados v0.2, Deploy v0.3
- Responsável: Pedro Cândido (engenheiro de API) · Revisores: Felipe Bessa (backend), Francisco Magno (integração front-back)
- Documentos relacionados: Backend (`docs/backend/backend.md`) · Frontend (`docs/frontend/frontend.md`) · Banco de Dados (`docs/banco-de-dados/banco-de-dados.md`) · Deploy (`docs/deploy/deploy.md`) · Regras de Negócio (`docs/regras-de-negocio/regras-de-negocio.md`)

### Histórico de versões

| Versão | Data | O que mudou |
|---|---|---|
| 0.1 | 14/10/2026 | Primeira versão: catálogo das APIs externas e arquitetura de segurança "backend-cofre". |
| 0.2 | 15/10/2026 | Alinhada às decisões fechadas: Mercado Pago como gateway (ADR-002, resta escolher a Payments API ou a Orders API), hospedagem Vercel + Neon (ADR-005), jobs como endpoints, upload de uma imagem por requisição (até 4 MB) e `waitUntil`. Travas de produção passam a usar `APP_ENV` e não exigem mais credencial real de pagamento (RN-PAG-10). `FRONTEND_URL` aceita lista. Variáveis unificadas com o Deploy. ADR-008 (backend-cofre) e ADR-009 (e-mail) renumerados. |
| 0.3 | 16/10/2026 | Alinhada às Regras de Negócio v0.4, ao Banco v0.2 e ao Backend v0.3. Login com Google passa a **MVP**. Limite do Neon corrigido para **1 GB** (e demais limites conferidos em 16/10/2026). `/health` leve e `/health/db`. Três papéis de banco (migração, aplicação e backup somente leitura). PostgreSQL 18 na CI e no Docker. Estorno e liquidação cobrem pagamento tardio e anúncio inativo (RN-PAG-13, 14). Imagem de 4 MB confirmada pelo grupo. Variável `EMAIL_VERIFICATION_REQUIRED`. Metas de 500 usuários e 99% tratadas como metas de produto. Pendências renumeradas (seção 12). |

## Sumário

| # | Seção | # | Seção |
|---|---|---|---|
| 1 | Objetivo e escopo | 7 | Ambientes e credenciais |
| 2 | Arquitetura das APIs no projeto | 8 | Resiliência e contingência |
| 3 | Catálogo de APIs | 9 | Testes das integrações |
| 4 | Fichas das APIs | 10 | Custos e limites |
| 5 | Arquitetura de segurança | 11 | Rastreabilidade: regras e requisitos por API |
| 6 | Como implementar | 12 | Decisões e pendências |


## 1. Objetivo e escopo

Este documento descreve as **APIs que o Unishop usa** e **como elas são protegidas**: o papel de cada uma, como entram na arquitetura, como são implementadas e como guardamos as chaves (credenciais) sem expor o projeto. Ele segue as **Regras de Negócio v0.4**, os requisitos RF001–RF024 e RNF001–RNF016 e o documento de **Backend v0.3**.

Existem dois tipos de API no projeto, e é importante não confundir:

| Tipo | O que é | Onde está documentado |
|---|---|---|
| **API do Unishop** (própria) | A API REST que o frontend chama (`/api/v1`). Nós construímos e mantemos. | Backend (seção 9), `openapi.yaml` |
| **APIs externas** (de terceiros) | Serviços que o backend e o frontend consomem: login Google, pagamento, e-mail, imagens, anti-bot e outros. | **Este documento** |


### O que este documento cobre

- O papel e a ficha de cada API externa (inclusive as sugeridas no início do projeto, **menos a de hospedagem**, que está em `docs/deploy/deploy.md`).
- A **arquitetura de segurança** escolhida para proteger chaves, webhooks e chamadas externas.
- Como implementar: pastas, interfaces, configuração, erros, testes e contingência.


### O que fica fora

- **Hospedagem e deploy** (Vercel + Neon): estão em `docs/deploy/deploy.md`.
- O contrato campo a campo da API do Unishop: `openapi.yaml`, que **ainda não existe** (pendência 5 da seção 12).
- Tabelas e relações do banco: documento de Banco de Dados.

> **Como ler os custos.** Os limites gratuitos citados foram conferidos em pesquisa feita em 14/10/2026 (o do Neon, reconferido em 16/10/2026) e **mudam com frequência**. Antes de depender de um limite, confirme na página oficial do provedor. Onde a informação não foi conferida, o texto diz "conferir".


## 2. Arquitetura das APIs no projeto

A regra central é simples: **o backend é o único lugar que guarda segredos e o único que fala com os provedores usando chaves privadas.** O navegador só recebe chaves públicas, feitas para ficar à vista, e fala diretamente com um provedor apenas quando o SDK dele exige (botão do Google, token do cartão e widget anti-bot).

```text
 NAVEGADOR (SPA)                  BACKEND UNISHOP                       PROVEDORES EXTERNOS
 só chaves públicas               guarda os segredos
 ┌───────────────────┐   HTTPS    ┌────────────────────────┐ valida token ┌──────────────────────────┐
 │ Client ID         │   + JWT    │ API REST (Express)     │ ───────────▶ │ Google Identity          │
 │ Public Key (MP)   │ ─────────▶ │  └─ Providers          │ Access Token │ Mercado Pago             │
 │ site key Turnstile│            │     (um adaptador      │ ───────────▶ │   ▲ webhook assinado     │
 └───┬───────────────┘            │      por serviço)      │ ◀─ ─ ─ ─ ─ ─│ Resend (e-mails)         │
     │ botão · token do cartão ·  └───────▲────────────────┘ upload       │ Cloudinary (imagens)     │
     │ widget (direto ao provedor)        │ GET /health      ───────────▶ │ Cloudflare Turnstile     │
     └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┼─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─▶│ Sentry (erros)           │
                                  UptimeRobot (monitor)                  │ PostgreSQL gerenciado    │
                                                                         └──────────────────────────┘
```


### Papéis

| Papel | Quem exerce | O que faz |
|---|---|---|
| Identidade | Google Identity (Apple fica fora) | Prova que o aluno é dono de uma conta com e-mail institucional |
| Dinheiro | Mercado Pago | Cobra cartão e Pix, avisa por webhook e estorna |
| Comunicação | Resend, Mailtrap (dev), link `wa.me` | E-mails transacionais; contato direto entre aluno e vendedor |
| Mídia | Cloudinary (ou R2) | Guarda e entrega as imagens já comprimidas |
| Proteção contra abuso | Cloudflare Turnstile | Barra robôs em cadastro, login e recuperação de senha |
| Dados | PostgreSQL gerenciado no Neon | Banco em nuvem, com um branch por ambiente (Deploy, seção 7) |
| Operação | Sentry, UptimeRobot, GitHub Actions | Erros, disponibilidade e integração contínua |
| Apoio ao desenvolvimento | ngrok ou Cloudflare Tunnel | Recebe webhooks na máquina local |


### Princípios de arquitetura

- **Backend-cofre.** Segredo só existe no backend. O frontend usa variáveis `VITE_*`, que são públicas por definição (Frontend, seção 4).
- **Um adaptador por serviço.** Cada API fica atrás de uma interface em `shared/providers/` (Backend, seção 13). Trocar de provedor mexe em uma pasta.
- **Quem confirma é o servidor, não o cliente.** Pagamento só vale pelo webhook assinado e pela consulta de volta (RN-PAG-05). O que o navegador diz nunca é prova.
- **Não confiar em provedor.** Toda resposta externa passa por validação, timeout e tratamento de erro; nenhum erro de terceiro vaza ao cliente.
- **Idempotência.** Chamadas que mudam estado (cobrar, estornar) levam chave de idempotência; avisos repetidos não duplicam efeito (RN-PAG-06).
- **Dados mínimos.** Cada provedor recebe só o necessário (LGPD, RNF007). Dado de cartão nunca passa pelo Unishop (RN-PAG-02).
- **Falha controlada.** Se um provedor cair, só a função dele para; o resto do sistema segue (seção 8).


## 3. Catálogo de APIs

Etapa: **MVP** entra na primeira entrega; **Depois** entra quando o MVP estiver estável; **Dev** só existe em desenvolvimento; **Alternativa** é plano B já mapeado.

| API | Papel | Quem chama | Credencial | Etapa |
|---|---|---|---|---|
| Google Identity | Login com Google | Front + Back | Client ID (pública) | MVP |
| Apple Sign In | Login com Apple | Front + Back | Conta paga (US$ 99/ano) | Fora do MVP |
| Mercado Pago | Cartão, Pix, estorno, webhook | Front (token) + Back | Public Key; Access Token e Webhook secret (privadas) | MVP |
| PicPay, PagBank, Asaas, EFI | Gateways alternativos | — | — | Alternativa |
| Resend | E-mail transacional | Back | API key (privada) | MVP |
| Mailtrap | Caixa de teste de e-mail | Back (dev) | Token de teste | Dev |
| Cloudinary | Imagens | Back (upload); navegador baixa da CDN | API key e secret (privadas) | MVP |
| Cloudflare R2 | Armazenamento de imagens | Back | Chaves de acesso (privadas) | Alternativa |
| WhatsApp (`wa.me`) | Contato com o vendedor | Front (link) | Nenhuma | MVP |
| Cloudflare Turnstile | Anti-bot | Front (widget) + Back | Site key (pública); secret (privada) | Depois |
| Neon | PostgreSQL gerenciado | Back | `DATABASE_URL` e `DATABASE_URL_UNPOOLED` (privadas) | MVP |
| Vercel Cron e agendador externo (cron-job.org) | Chamam os endpoints de jobs | Agendador | `CRON_SECRET` (privada) | MVP |
| ngrok ou Cloudflare Tunnel | Webhook na máquina local | Dev | Authtoken (privada, dev) | Dev |
| Sentry | Monitoramento de erros | Back | DSN | Depois |
| UptimeRobot | Monitor de disponibilidade | Externo chama `/health` (leve) | Conta | MVP |
| GitHub Actions | Integração contínua | Repositório | Só credenciais de teste | MVP |

> **Não são APIs:** a biblioteca `qrcode` (desenha o QR Code a partir do texto do Pix) e o Swagger UI (lê o `openapi.yaml`) são bibliotecas locais, sem chave e sem custo.


## 4. Fichas das APIs

Cada ficha traz: para que serve, requisitos e regras atendidos, quem chama, credenciais, como implementar, segurança e como testar.


### 4.1 Google Identity (login com Google)

| Item | Detalhe |
|---|---|
| Papel | Cadastro e login com a conta Google, por um botão "Entrar com Google" |
| Etapa | **MVP** (decisão do grupo em 16/10/2026) |
| Origem | RN-ACE-14, RF002.6, RF003.3, RNF002 |
| Quem chama | Frontend (SDK Google Identity Services) e Backend (valida o ID token) |
| Credencial | **Client ID**, que é público. Nesse fluxo não é preciso o Client Secret |
| Custo | Gratuito |
| Onde consultar | Documentação "Sign in with Google", em developers.google.com/identity |


### Como funciona

```text
 1. Frontend ▶ Google  abre o fluxo "Entrar com Google" (SDK)
 2. Google ▶ Frontend  ID token assinado pelo Google
 3. Frontend ▶ API     POST /auth/google {idToken}
 4. API                valida assinatura, audiência (Client ID) e expiração do token
 5. API                exige email_verified = true e domínio @edu.unifor.br
 6. API ▶ Banco        busca o usuário pelo google_sub e, se não achar, pelo e-mail
                       (vincula a uma conta existente ou cria: ativa, sem senha, verificada)
 7. API ▶ Frontend     200 {token JWT, usuário, needsTermsAcceptance}
                       ·  403 EMAIL_DOMAIN_NOT_ALLOWED se não for da Unifor
 8. Frontend           no primeiro acesso ▶ tela "completar cadastro" (aceite dos Termos;
                       curso e WhatsApp opcionais) ▶ POST /users/me/complete-profile
```


### Como implementar

1. No Google Cloud Console, criar o projeto "Unishop" e configurar a **tela de consentimento OAuth** (nome, e-mail de suporte, escopos `openid`, `email` e `profile`).
2. Criar a credencial **ID do cliente OAuth** do tipo "Aplicativo da Web" e cadastrar as **origens JavaScript autorizadas** (`http://localhost:5173` em desenvolvimento e o domínio real em produção). Use um cliente para desenvolvimento e outro para produção.
3. Guardar o Client ID em `VITE_GOOGLE_CLIENT_ID` (frontend) e `GOOGLE_CLIENT_ID` (backend).
4. Frontend: carregar o script do Google Identity Services, desenhar o botão e, ao receber o `credential` (o ID token), enviar a `POST /auth/google`.
5. Backend: verificar o token com `google-auth-library` e emitir o **JWT do Unishop**. Do Google guardamos apenas o e-mail e o identificador `sub` (coluna `usuario.google_sub`).

```ts
// shared/providers/oauth/google.provider.ts
import { OAuth2Client } from 'google-auth-library'

const client = new OAuth2Client(env.google.clientId)

export async function verifyGoogleIdToken(idToken: string) {
  const ticket = await client.verifyIdToken({ idToken, audience: env.google.clientId })
  const p = ticket.getPayload()

  if (!p?.email || !p.email_verified) throw new AppError('EMAIL_NOT_VERIFIED', 403)
  if (!p.email.toLowerCase().endsWith('@' + env.allowedEmailDomain)) {
    throw new AppError('EMAIL_DOMAIN_NOT_ALLOWED', 403)
  }
  return { googleId: p.sub, email: p.email.toLowerCase(), name: p.name ?? '' }
}
```

| O backend confere | Por quê |
|---|---|
| Assinatura, emissor e validade do token | Garante que o token veio do Google e não expirou (a biblioteca faz) |
| `aud` igual ao nosso Client ID | Impede aceitar um token emitido para outro aplicativo |
| `email_verified` = verdadeiro | O Google só afirma o e-mail se ele foi verificado |
| E-mail terminando em `@edu.unifor.br` | RN-ACE-02 e RNF002. O parâmetro `hd` do Google é só uma dica na tela e **não substitui** essa checagem |


### Segurança

- Nunca usar nome ou e-mail enviados pelo frontend: só o que está **dentro do token verificado**.
- Limitar as origens autorizadas no Google Cloud; um cliente OAuth por ambiente.
- Erros: `EMAIL_NOT_VERIFIED` e `EMAIL_DOMAIN_NOT_ALLOWED` (403) e `TOKEN_INVALID` (401).

> **Risco conhecido.** Em um endereço `vercel.app` o Google pode recusar a origem JavaScript autorizada (pendência 7 do Deploy); com domínio próprio o risco cai. O login só funciona se o e-mail `@edu.unifor.br` estiver vinculado a uma conta Google. Teste com um e-mail real antes de fechar o RF002.6 (pendência 3 da seção 12). Se o Google não entregar `email_verified`, o plano B é manter o login por e-mail e senha. O aceite dos Termos do primeiro acesso é registrado na tela "completar cadastro" (RN-ACE-06, RN-ACE-14).


### 4.2 Apple Sign In

| Item | Detalhe |
|---|---|
| Papel | Login com a conta Apple |
| Etapa | **Fora do MVP** |
| Origem | RF002.6, RF003.3, RN-ACE-14 (Apple fica fora) |
| Custo | **US$ 99 por ano** (conta no Apple Developer Program) |

- **Por que fora:** o custo anual e o risco de o usuário esconder o e-mail. Nesse caso a Apple entrega um endereço de retransmissão, que **não** termina em `@edu.unifor.br` e quebraria a RN-ACE-02.
- **Para entrar no futuro:** alguém do grupo precisa de conta paga; o backend teria um `apple.provider.ts` com a mesma interface `OAuthProvider`; e o aluno teria de aceitar compartilhar o e-mail real. Sem isso, o login é recusado com `EMAIL_DOMAIN_NOT_ALLOWED`.
- Nada no código do MVP depende da Apple: basta a interface `OAuthProvider` já existir.


### 4.3 Mercado Pago (cartão, Pix, estorno e webhook)

| Item | Detalhe |
|---|---|
| Papel | Cobrar cartão e Pix, avisar pagamentos por webhook, cancelar cobranças e estornar |
| Etapa | MVP |
| Origem | RN-PAG-01 a 14, RN-PED-02, RNF006, RF010 |
| Quem chama | Frontend (SDK MercadoPago.js: só gera o token do cartão) e Backend (cobranças, consulta, cancelamento e estorno) |
| Credenciais | **Public Key** (frontend, pública); **Access Token** e **Webhook secret** (backend, privadas) |
| Custo | Sem mensalidade. Há **tarifa por transação em produção** (conferir). O ambiente de testes é gratuito |
| Onde consultar | mercadopago.com.br/developers |

> **Gateway decidido: Mercado Pago (ADR-002).** Falta escolher a forma de integração. O Mercado Pago oferece duas: a **Payments API** (`/v1/payments`) e a **Orders API** (`/v1/orders`), que o próprio provedor destaca como evolução. Os conceitos que usamos são os mesmos nas duas (token do cartão, chave de idempotência, expiração do Pix, webhook assinado e estorno). O adaptador esconde a diferença; **confirme na documentação vigente os nomes exatos dos campos antes de implementar.**


### Operações que o Unishop usa

Exemplos na Payments API. Os nomes exatos dos campos devem ser conferidos na documentação vigente.

| Operação do Unishop | Chamada ao Mercado Pago | Quando acontece |
|---|---|---|
| Cobrar no cartão | `POST /v1/payments` com o token do cartão, parcelas e `X-Idempotency-Key` | `POST /payments/card` |
| Gerar Pix | `POST /v1/payments` com Pix, valor e `date_of_expiration` (30 min) e `X-Idempotency-Key` | `POST /payments/pix` |
| Consultar pagamento | `GET /v1/payments/{id}` | Webhook e job de conferência |
| Cancelar Pix pendente | `PUT /v1/payments/{id}` com status `cancelled` | Job `expire-pix-payments` |
| Estornar | `POST /v1/payments/{id}/refunds` (com `X-Idempotency-Key`) | Pedido não pôde ser honrado: sem estoque, anúncio inativo ou pagamento tardio (RN-PAG-08, 13, 14) |

- **Estorno de Pix pode ficar "em processo"** (por exemplo, por falha na comunicação com o Banco Central). O Mercado Pago permite pedir uma resposta mais clara com o cabeçalho `X-Render-In-Process-Refunds: true`. Por isso o job `reconcile-pending-payments` refaz estornos pendentes (Backend, seção 14).
- **Chave de idempotência:** gerada de forma determinística por operação e **por tentativa** (por exemplo, `pedido:42:pix:1`, `pedido:42:pix:2`) e gravada junto do pagamento (`pagamento.chave_idempotencia`). Repetir a mesma chamada não cria cobrança duplicada, e uma nova tentativa após recusa usa outro número.
- **Valor:** em centavos no código; o gateway recebe o valor total já calculado pelo backend (RN-PED-02). Taxa de serviço = R$ 0,00.
- **Repasse (RN-PAG-10):** tudo é cobrado em uma conta única de teste; o repasse ao vendedor é simulado. **Não usamos divisão de pagamento (split).**


### Fluxos

```text
 1. Frontend ▶ API      POST /orders {anúncio, quantidade}
 2. API                 valida: anúncio ativo, comprador diferente do dono, quantidade ≤ disponível
                        (sem reservar)
 3. API ▶ Banco         cria o pedido "Pendente" com vendedor, produto, imagem, preço unitário e total
                        congelados, ou reaproveita o pedido pendente do comprador (RN-PED-10)
 4. API ▶ Frontend      201 {pedido, subtotal, taxa R$ 0,00, total}
 5. Frontend ▶ API      POST /payments/pix {pedido}
 6. API ▶ Gateway       cria a cobrança Pix (total, expira em 30 min, referência = pedido)
 7. Gateway ▶ API       QR Code e código "copia e cola"
 8. API ▶ Banco         grava o pagamento "Pendente" com a data de expiração
 9. API ▶ Frontend      201 {QR Code, copia e cola, expira em}

    Pix pendente NÃO reserva a unidade: vale o primeiro pagamento confirmado (RN-PAG-08).
```

```text
    ── o aluno paga no aplicativo do banco ──

10. Gateway ▶ API       POST /payments/webhook (aviso de pagamento aprovado)
11. API                 valida a assinatura do aviso
12. API ▶ Gateway       consulta o pagamento (não confia só no aviso) ▶ status: aprovado
13. API ▶ Banco         transação: trava o pedido (idempotente) e desconta o estoque (atômico)
    ├─ HAVIA ESTOQUE
    │   14. API ▶ Banco       pedido "Pago" e pagamento "Aprovado"; se quantidade = 0, anúncio "Vendido"
    │   15. API               notifica o vendedor sobre a venda
    └─ NÃO PODE SER HONRADO: estoque acabou, anúncio inativo ou pedido já cancelado (RN-PAG-08, 13, 14)
        14. API ▶ Banco       pedido "Cancelado" e pagamento "estorno_pendente"
        15. API ▶ Gateway     estorna o valor; o pagamento vira "Estornado"; e-mail ao comprador
16. API ▶ Gateway       200 OK
```

```text
 1. Frontend ▶ Gateway  o SDK envia os dados do cartão e recebe um token (nunca passam pelo Unishop)
 2. Frontend ▶ API      POST /payments/card {pedido, token, parcelas}
 3. API ▶ Gateway       cria o pagamento usando o token  ▶  aprovado ou recusado
    ├─ RECUSADO
    │   4. API ▶ Banco       pagamento "Recusado"; o pedido continua "Pendente"
    │   5. API ▶ Frontend    402 PAYMENT_DECLINED ▶ o aluno pode tentar de novo (RN-PAG-07)
    └─ APROVADO ▶ mesma liquidação do Pix
        4. API ▶ Banco       transação: confere anúncio ativo e desconta o estoque (atômico)
        ├─ havia estoque ▶ pedido "Pago"; notifica o vendedor; API ▶ Frontend 200 {status: pago}
        ├─ estoque acabou ▶ pedido "Cancelado"; estorna o valor; API ▶ Frontend 409 OUT_OF_STOCK
        └─ anúncio inativo ▶ pedido "Cancelado"; estorna o valor; API ▶ Frontend 409 LISTING_UNAVAILABLE
```

Cada tentativa de cobrança é uma linha em `pagamento` (só uma pode estar em andamento). O Pix expirado cancela o pedido e o aluno faz um novo (RN-PAG-04).


### Como o status do Mercado Pago vira status do Unishop

| Status no Mercado Pago | Pagamento no Unishop | Efeito no pedido |
|---|---|---|
| `approved` | Aprovado | Liquidação: desconta estoque e marca "Pago" |
| `pending`, `in_process` | Pendente | Nenhum |
| `rejected` | Recusado | Segue "Pendente"; o aluno tenta de novo |
| `cancelled` ou Pix vencido | Expirado | "Cancelado" (RN-PAG-04) |
| `approved`, mas o pedido não pode ser honrado | Estorno pendente | "Cancelado"; o job refaz o estorno até dar certo (RN-PAG-08, 13, 14) |
| `refunded` | Estornado | Já estava "Cancelado" (sem estoque, anúncio inativo ou pagamento tardio) |


### Como implementar

1. Criar a conta e a **aplicação** no painel do Mercado Pago e anotar as credenciais de **teste**.
2. Criar **usuários de teste** (comprador e vendedor) e usar os **cartões de teste** e o **Pix simulado** do sandbox.
3. Frontend: carregar o SDK, criar o token do cartão com a **Public Key** e enviar só o token ao backend.
4. Backend: implementar `mercadopago.provider.ts` (interface `PaymentGateway`, Backend seção 11) com timeout, idempotência e mapeamento de status.
5. Cadastrar a **URL do webhook** no painel (em desenvolvimento, a URL do túnel; seção 4.9) e copiar a **assinatura secreta** para `MP_WEBHOOK_SECRET`.
6. Validar a assinatura de todo aviso (seção 5.6) e só então consultar o pagamento.
7. **Enquanto valer a RN-PAG-10** (conta única de teste, repasse simulado), a produção do trabalho também usa as credenciais de **teste**, com `PAYMENT_MODE=sandbox`. Credenciais reais (`PAYMENT_MODE=production`) só entram se o grupo mudar essa regra, e nunca fora do ambiente de produção.


### Segurança

- O **Access Token** nunca vai ao frontend nem ao Git. Só o `mercadopago.provider.ts` o lê, por meio do wrapper `Secret` (seção 6).
- Dado de cartão **nunca** passa pelo servidor do Unishop (RN-PAG-02, RNF006): só o token.
- Mapear `rejected` para `PAYMENT_DECLINED` com mensagem amigável; **não** repassar `status_detail` cru.
- Credenciais de teste e reais são **separadas**, e o sistema recusa iniciar se houver credencial **real** fora do ambiente de produção (seção 6.3). O contrário (produção com credencial de teste) é permitido enquanto valer a RN-PAG-10.
- **Webhook e previews:** a URL do webhook é cadastrada uma vez por aplicação no painel; o endereço de cada preview da Vercel muda, então previews **não recebem webhook**. O teste ponta a ponta é local (túnel) ou em produção.

> **Alternativas já mapeadas:** PicPay e PagBank (ambos com sandbox de Pix e cartão) e Asaas e EFI (conferir). Como o backend só conhece a interface `PaymentGateway`, trocar de gateway significa escrever um novo adaptador. Critérios para trocar: tarifa, qualidade do sandbox, estorno de Pix e assinatura de webhook.


### 4.4 Resend e Mailtrap (e-mail transacional)

| Item | Detalhe |
|---|---|
| Papel | Enviar e-mails de redefinição de senha, troca de e-mail, venda realizada, anúncio excluído e pedido cancelado com estorno (e de confirmação de conta, quando a chave RN-ACE-07 estiver ligada) |
| Etapa | MVP (Mailtrap só em desenvolvimento) |
| Origem | RN-ACE-07, RN-ACE-10, RN-PER-02, RN-NOT-01, RN-NOT-02, RN-NOT-03 |
| Quem chama | Backend |
| Credencial | **API key** do Resend (privada) e um **domínio verificado** (registros DNS SPF e DKIM) |
| Custo | Plano gratuito do Resend: **3.000 e-mails por mês, limite de 100 por dia e 1 domínio**. Mailtrap: plano gratuito (conferir limites) |
| Onde consultar | resend.com/docs |

```text
 1. Service ▶ MailProvider   send({ para, modelo, dados })   (na Vercel, dentro de `waitUntil`; Backend, seção 11)
 2. MailProvider             monta o e-mail em português a partir do modelo; leva só os dados necessários
 3. MailProvider ▶ Resend    POST /emails  (Authorization: Bearer RESEND_API_KEY)
 4. Resend ▶ MailProvider    200 {id}

    ── falha temporária (timeout ou erro 5xx) ──
 5. MailProvider             tenta de novo, até 3 vezes, com espera crescente

    ── falha definitiva (depois das tentativas, ou erro 4xx) ──
 6. MailProvider ▶ Service   erro EXTERNAL_SERVICE_ERROR (sem a chave e sem o corpo do e-mail)
 7. Service                  registra em log e segue: o e-mail nunca bloqueia a resposta ao aluno
                             (as tentativas acontecem dentro do `waitUntil`, que mantém a função viva até terminar)
```


### Como implementar

1. Criar a conta no Resend, **adicionar e verificar o domínio** (SPF e DKIM; DMARC é recomendado).
2. Criar uma **API key só com permissão de envio** (e, se o painel permitir, limitada ao domínio). Guardar em `RESEND_API_KEY`.
3. Implementar `resend.provider.ts` (interface `MailProvider`) e os modelos em português em `providers/mail/templates/`.
4. Escolher o driver por ambiente: `MAIL_DRIVER=resend` (produção), `mailtrap` (desenvolvimento) ou `console` (testes). Produção recusa `console`.
5. Montar os links com `FRONTEND_URL` e com **tokens de uso único** (Backend, seção 8).

- **Segurança:** nunca enviar senha por e-mail; links levam token aleatório (só o hash vai ao banco) e têm validade (30 minutos na redefinição de senha, RN-ACE-10).
- **Domínio próprio é necessário** para enviar a destinatários reais em produção (conferir a regra do plano). Um endereço `vercel.app` não permite verificar o domínio por DNS. Veja a pendência 2 e a pendência 3 do Deploy.
- **Cota:** 100 e-mails por dia é o limite que mais cedo estoura. E-mails de segurança (confirmação e redefinição) têm prioridade sobre avisos de venda.


### 4.5 Cloudinary (imagens) e Cloudflare R2 (alternativa)

| Item | Detalhe |
|---|---|
| Papel | Guardar e entregar as imagens dos anúncios e as fotos de perfil, já comprimidas e redimensionadas |
| Etapa | MVP |
| Origem | RN-ANU-03, RN-PER-05, RNF005, RNF009 |
| Quem chama | Backend (upload e exclusão). O navegador só **baixa** as imagens da CDN |
| Credenciais | `cloud name` (público); **API key** e **API secret** (privados), reunidos em `CLOUDINARY_URL` |
| Custo | Plano gratuito: **25 créditos por mês**. Um crédito equivale a 1 GB de armazenamento, ou 1 GB de banda, ou 1.000 transformações |
| Onde consultar | cloudinary.com/documentation |

```text
 1. Frontend ▶ API      POST /listings (multipart: dados do anúncio + a 1ª imagem)
 2. API                 só aluno; valida nome, categoria, descrição, preço > 0, quantidade ≥ 1,
                        WhatsApp e a imagem (JPG/PNG de até 4 MB, tipo pelo conteúdo real)
 3. API ▶ Storage       envia a imagem
 4. Storage ▶ API       URL segura da imagem
 5. API ▶ Banco         em uma transação: cria o anúncio (status Ativo) e registra a imagem
 6. API ▶ Frontend      201 {anúncio, categoria}
 7. Frontend ▶ API      (se houver mais imagens) POST /listings/:id/images, uma chamada por imagem
 8. Frontend            ao terminar ▶ pop-up "Anúncio publicado!"

    Se o banco falhar no passo 5, a imagem já enviada é removida do storage.
```

> **Uma imagem por requisição, até 4 MB.** Na Vercel uma requisição aceita no máximo 4,5 MB no total, então cada imagem sobe em uma chamada própria (Backend, seção 9.4; Deploy, seção 5.3). O PDF do trabalho (RNF005) fala em 5 MB; o grupo adotou 4 MB, e o desvio está registrado em Regras de Negócio, seção 10.


### Como implementar

1. Criar a conta e anotar `cloud name`, API key e API secret. Guardar em `CLOUDINARY_URL`.
2. Validar o arquivo **antes** de enviar: tipo real (JPEG ou PNG) e 4 MB por imagem (Backend, seção 16).
3. Enviar pelo **backend** (upload do servidor para a Cloudinary), com nome gerado e pasta por ambiente, por exemplo `unishop/prod/listings/{id}/`.
4. Gravar no banco o `public_id` e a URL. Excluir a imagem da Cloudinary quando o anúncio for excluído ou quando a transação falhar.
5. Entregar sempre com transformação na URL (formato e qualidade automáticos e largura limitada).

| Uso | Transformação sugerida na URL |
|---|---|
| Miniatura (listagem) | `f_auto,q_auto,w_300,h_300,c_fill` |
| Galeria (página do produto) | `f_auto,q_auto,w_900` |
| Foto de perfil | `f_auto,q_auto,w_200,h_200,c_fill,g_face` |

- **Por que o upload sai do backend:** o segredo nunca chega ao navegador. A alternativa (upload assinado direto do navegador) amplia a superfície de ataque e foi descartada no MVP.
- **Sem uploads "sem assinatura"** (unsigned) liberados na conta.
- **Alternativa:** Cloudflare R2 (armazenamento compatível com S3, com plano gratuito, conferir). Nesse caso, a compressão e o redimensionamento passam a ser nossos (por exemplo, com a biblioteca `sharp`). Decisão final no ADR-004.


### 4.6 WhatsApp (link wa.me)

| Item | Detalhe |
|---|---|
| Papel | Abrir a conversa com o vendedor com a mensagem sobre o anúncio já preenchida |
| Etapa | MVP |
| Origem | RF009.4, RN-PED-05, RN-PER-04, RF014.5, RF017.5 |
| Quem chama | O **frontend** monta e abre o link. O backend registra o contato antes (Backend, seção 10) |
| Credencial | **Nenhuma**. Não é uma API |
| Custo | Gratuito |

```ts
// frontend: shared/utils/whatsappLink.ts
export function whatsappLink(phoneDigits: string, message: string) {
  // phoneDigits: só números, com DDD (ex.: 85991234567). Acrescenta o 55 do Brasil.
  const phone = phoneDigits.startsWith('55') ? phoneDigits : '55' + phoneDigits
  return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message)
}

// Exemplo de mensagem:
// 'Olá! Vi seu anúncio "Cálculo I" no Unishop e tenho interesse em 1 unidade.'
```

- Guardar o telefone **só com dígitos** e validar o tamanho (10 ou 11 dígitos com DDD).
- O número do vendedor só aparece em respostas de rotas **autenticadas** (RN-PER-04). Links externos levam `rel="noopener noreferrer"`.
- **Por que não usar a API oficial do WhatsApp Business:** exige cadastro e aprovação e é cobrada por conversa (conferir), sem necessidade para o que o Unishop faz.


### 4.7 Cloudflare Turnstile (anti-bot)

| Item | Detalhe |
|---|---|
| Papel | Barrar robôs em cadastro, login e recuperação de senha, sem pedir "clique nos semáforos" |
| Etapa | **Depois do MVP** (recomendado antes de abrir o sistema a todos os alunos) |
| Origem | RNF003, RN-ACE-09 |
| Quem chama | Frontend (widget) e Backend (verificação) |
| Credenciais | **Site key** (pública, vai no HTML) e **Secret key** (privada, só no servidor) |
| Custo | Gratuito. Plano Free com até 20 *widgets* e desafios sem limite; sem SLA no plano gratuito (conferir) |
| Onde consultar | developers.cloudflare.com/turnstile |

```text
 1. Frontend ▶ Turnstile   o widget roda o desafio (usa só a site key, que é pública)
 2. Turnstile ▶ Frontend   token de uso único (vale por poucos minutos)
 3. Frontend ▶ API         POST /auth/login {e-mail, senha, turnstileToken}
 4. API ▶ Turnstile        POST siteverify {secret, response, remoteip}
 5. Turnstile ▶ API        { success: true | false }
    ├─ success = true  ▶ API segue o login normal (Backend, seção 8)
    └─ success = false, token repetido ou expirado
                       ▶ API ▶ Frontend: 403 BOT_CHECK_FAILED (a tela pede para repetir o desafio)
```

```ts
// shared/providers/antibot/turnstile.provider.ts
export async function verifyTurnstile(token: string, ip?: string) {
  const body = new URLSearchParams({
    secret: env.turnstile.secret.reveal(),
    response: token,
  })
  if (ip) body.set('remoteip', ip)

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(5000),
  })
  const data = (await res.json()) as { success: boolean }
  return data.success === true
}
```

- Cada widget tem seu par de chaves; use **um widget por ambiente** e restrinja os **domínios permitidos** (hostnames) de cada um.
- Para desenvolvimento, a Cloudflare publica **chaves de teste** (por exemplo, uma site key que sempre passa); use só em `development` e `test`.
- O token é de **uso único** e expira em poucos minutos: o backend nunca reaproveita.
- **Política se o Turnstile cair (decidida):** em `/auth/register` e `/auth/forgot-password`, falha fechada (503). Em `/auth/login`, falha aberta com limite de 3 tentativas por minuto por IP, para não trancar todos os alunos por uma queda do provedor.


### 4.8 PostgreSQL gerenciado (Neon)

> O **deploy e a hospedagem** estão em `docs/deploy/deploy.md`. Aqui entram só os aspectos de API e credencial do banco em nuvem.

| Item | Detalhe |
|---|---|
| Papel | Banco PostgreSQL em nuvem do ambiente de produção e dos previews (o desenvolvimento e os testes usam o banco local do Docker) |
| Etapa | MVP |
| Origem | RNF015, RNF011 |
| Quem chama | Backend, pelo ORM |
| Credenciais | `DATABASE_URL` (com *pooler*, usada pela API) e `DATABASE_URL_UNPOOLED` (conexão direta, usada pela migração e pelo backup). Privadas: usuário e senha dentro da URL |
| Custo | Neon, plano Free (conferido em 16/10/2026): **100 CU-horas por projeto por mês, 1 GB de armazenamento por projeto, 10 branches, janela de restauração de 6 horas e 5 GB de transferência de saída**. O banco "dorme" após 5 minutos sem uso e isso não pode ser desligado. PostgreSQL 14 a 18, escolhido na criação do projeto. Supabase fica como alternativa mapeada (conferir) |

- **Limite de 1 GB:** basta para o MVP porque as imagens ficam na Cloudinary, não no banco. Crie o projeto com **PostgreSQL 18**, a versão do restante da documentação (Banco de Dados e Deploy).
- **Risco para a disponibilidade (RNF011):** no plano gratuito do Neon, o processamento é suspenso quando o limite mensal acaba, e o banco "acorda" devagar depois de dormir. Planeje isso antes da demonstração.
- **TLS obrigatório:** `sslmode=require` na URL de conexão.
- **Duas conexões e três papéis:** a migração (`prisma migrate deploy`, `directUrl`) usa `DATABASE_URL_UNPOOLED` com o papel `unishop_migrator`; a API usa `DATABASE_URL` com *pooler* (`?pgbouncer=true&connection_limit=1`) e o papel `unishop_app`, **sem permissão de alterar a estrutura**; o backup usa `DATABASE_URL_BACKUP`, com o papel `unishop_backup`, **somente leitura** (Banco de Dados, seção 10). A integração do Neon entrega um usuário só; os três papéis são criados à parte (Deploy, seção 7), e é preciso conferir no painel como criá-los no plano gratuito (pendência 6).
- **Não há lista de IPs permitidos** (*IP Allow*) no plano gratuito: a proteção do banco é a senha forte, o TLS e os papéis com pouca permissão.
- **Um branch por ambiente** (produção e um por preview), não um por pessoa. **Dados reais de produção nunca vão para desenvolvimento** (LGPD); o branch de preview **não** pode nascer de uma cópia da produção: o branch pai dos previews é o de desenvolvimento, só com dados fictícios (Deploy, seção 7.2).
- Backup diário (workflow do GitHub Actions) e restauração testada seguem o RNF011 (Deploy, seção 11).


### 4.9 Túnel para webhook local (ngrok ou Cloudflare Tunnel)

| Item | Detalhe |
|---|---|
| Papel | Dar uma URL pública temporária ao `localhost`, para o Mercado Pago entregar o webhook durante o desenvolvimento |
| Etapa | **Só desenvolvimento** |
| Credencial | Ngrok: *authtoken* (privada, só do desenvolvedor). Cloudflare Tunnel rápido: sem conta para testes simples (conferir) |
| Custo | Gratuito (conferir limites) |

```bash
ngrok http 3000
# ou
cloudflared tunnel --url http://localhost:3000
```

- A URL muda a cada execução no plano gratuito: **atualize a URL do webhook no painel** do gateway toda vez.
- Na Vercel, **previews não recebem webhook** (a URL cadastrada é única por aplicação); o túnel é o caminho para testar o pagamento ponta a ponta fora de produção.
- O webhook continua exigindo **assinatura válida**; o túnel não é desculpa para relaxar a verificação.
- **Nunca em produção.** Feche o túnel ao terminar. O authtoken fica fora do Git, como qualquer segredo.


### 4.10 Sentry (monitoramento de erros)

| Item | Detalhe |
|---|---|
| Papel | Capturar erros inesperados do backend (e, depois, do frontend) com contexto para corrigir rápido |
| Etapa | Depois do MVP |
| Origem | RNF016 (qualidade), RNF011 |
| Credencial | **DSN** do projeto. Não é um segredo forte, mas não deve ser publicado à toa |
| Custo | Plano Developer gratuito: **1 usuário e 5.000 erros por mês** (conferir) |

- **Atenção:** o plano gratuito tem **1 usuário**, e o grupo tem 4 pessoas. Decisão do grupo: adiar o Sentry (ou usar uma conta compartilhada).
- **Privacidade (RNF007):** configurar para **não enviar dados pessoais** e remover antes do envio: e-mail, WhatsApp, cabeçalho `Authorization`, corpo de `/auth` e `/payments`.
- Cada evento leva o `requestId` e o ambiente como *tags*, para ligar o erro ao log da aplicação.
- Erros esperados (400, 401, 403, 404) **não** vão para o Sentry; só os 5xx e as exceções.


### 4.11 UptimeRobot (disponibilidade)

| Item | Detalhe |
|---|---|
| Papel | Chamar `GET /api/v1/health` (leve) a cada 5 minutos e avisar por e-mail se a API cair. A meta de 99% é de produto e não é medida no MVP (Regras de Negócio, seção 6) |
| Etapa | MVP |
| Origem | RNF011 |
| Credencial | Só a conta no serviço. **Nenhuma chave no código** |
| Custo | Plano gratuito: **50 monitores com checagem a cada 5 minutos**. Os termos do plano gratuito já mudaram (uso não comercial): **conferir**. Alternativa: StatusCake (plano gratuito com 10 monitores) |

- O `/health` responde 200 **sem consultar o banco**, para o monitor não acordar o Neon a cada checagem (o plano gratuito conta o tempo de computação). A rota `/health/db` faz `SELECT 1` e responde 200 ou 503; é para conferir o deploy, não para o monitor. Nenhuma das duas **revela versão, caminho ou erro detalhado**.
- A rota não exige login, por isso não retorna nenhum dado do sistema.


### 4.12 GitHub Actions (integração contínua)

| Item | Detalhe |
|---|---|
| Papel | Rodar lint e testes a cada *pull request* e a cada envio ao repositório |
| Etapa | MVP |
| Origem | RNF016 |
| Credenciais | O `GITHUB_TOKEN` automático e, se necessário, *secrets* de **teste** |
| Custo | Gratuito dentro dos limites do plano (conferir a cota de minutos em repositório privado) |

```yaml
# .github/workflows/ci.yml
name: ci
on: [pull_request, push]

permissions:
  contents: read            # permissão mínima do GITHUB_TOKEN

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:18
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: unishop_test }
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4       # fixe as ações pelo hash do commit
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
        working-directory: backend          # o projeto é um monorepo; repita para frontend/
      - run: npm run lint && npm run test
        working-directory: backend
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/unishop_test
          PAYMENT_DRIVER: mock
          MAIL_DRIVER: console
```

- **Nenhuma credencial de produção** na CI. Só banco de teste, drivers `mock` e `console`.
- *Pull requests* vindos de *forks* não recebem *secrets* (padrão do GitHub).
- O Dependabot e o `npm audit` entram na rotina da cadeia de suprimentos (seção 5.9).


## 5. Arquitetura de segurança

Esta seção responde à pergunta: **como proteger as APIs, as chaves e o projeto, de um jeito que caiba no nosso tamanho e na nossa arquitetura atual?**


### 5.1 O modelo escolhido: "backend-cofre"

O modelo se chama **backend-cofre**: o backend é o cofre e a única fronteira com os provedores; os segredos entram por variáveis de ambiente, ficam embrulhados em um objeto que não se deixa imprimir, e só os adaptadores (`providers/`) os leem. Em volta disso, entram camadas de defesa para a entrada (webhooks), a saída (chamadas externas), os dados, os logs e a rotação.

Foi escolhido comparando com as alternativas, pelos critérios de segurança, custo, simplicidade para um grupo de 4 pessoas e aderência à arquitetura que já existe (monorepo, Express, providers e Docker):

| Alternativa | Segurança | Custo e esforço | Veredito |
|---|---|---|---|
| Arquivo `.env` compartilhado pelo grupo (chat, drive) | Fraca: cópias soltas, sem controle | Nenhum | **Descartada** |
| **Variáveis de ambiente + wrapper `Secret` + fronteira de providers + camadas de defesa** | Boa: segredo só no backend, validado e sem vazar em log | Baixo: usa o que o projeto já tem | **Escolhida** |
| Gerenciador de segredos em nuvem (por exemplo, o da própria hospedagem ou um serviço dedicado) | Muito boa: auditoria e rotação assistida | Médio: depende do deploy | **Evolução futura**, se a hospedagem oferecer |
| HashiCorp Vault | Excelente | Alto: exige operar um servidor | Descartada (excessiva) |
| API gateway dedicado (Kong e similares) | Boa para muitas APIs | Alto | Descartada: há um só backend e o Express com middlewares basta |

> O modelo escolhido é compatível com o **Deploy**: em produção, os segredos vêm das *Environment Variables* da Vercel (marcadas como *Sensitive*) sem mudar uma linha de código, porque o backend só lê variáveis de ambiente.


### 5.2 Zonas de confiança

```text
 Z1 · NAVEGADOR
   Chaves PÚBLICAS: Google Client ID, Mercado Pago Public Key, Turnstile site key
        │  TLS + JWT  (nunca carrega segredo)
        ▼
 Z2 · BACKEND (COFRE)  ◀ · · · · · · · · Z4 · DEV E CI
   SEGREDOS só em variáveis de ambiente:    só credenciais de TESTE
   MP Access Token e webhook secret,        (sandbox, Mailtrap)
   Resend key, Cloudinary secret,           nunca as de produção
   Turnstile secret, JWT_SECRET, DATABASE_URL
        │  TLS + segredo · timeout · retry · log sem segredo
        ▼                                  ▲
 Z3 · PROVEDORES EXTERNOS ─ ─ ─ ─ ─ ─ ─ ─ ┘  webhook: assinatura HMAC + consulta de volta
   Não são confiáveis até provar
```

Regra de ouro: **o que cruza da Z2 para a Z1 é só dado de negócio**, nunca uma credencial privada. O que entra na Z2 vindo da Z3 (webhook) só é aceito depois de assinatura válida e de ser **conferido de volta** no provedor.


### 5.3 Classificação e inventário de credenciais

| Classe | O que é | Pode ir ao navegador? | Pode ir ao Git? |
|---|---|---|---|
| **Pública** | Identificador feito para ficar à vista (Client ID, Public Key, site key) | Sim | Não é preciso (vai no `.env.example` vazio) |
| **Privada** | Dá poder de agir em nome do Unishop (tokens, API secrets, senha do banco) | **Nunca** | **Nunca** |
| **Assinatura** | Prova a origem de um aviso (webhook secret) | Nunca | Nunca |
| **Infraestrutura** | Acesso a ferramentas de operação (DSN, authtoken do túnel) | Nunca | Nunca |

Inventário (um item por credencial; este quadro é a fonte de verdade e deve ser atualizado a cada API nova):

| Credencial | Classe | Onde vive | Quem lê | Rotação |
|---|---|---|---|---|
| `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` | Pública | Env do backend e do frontend | Frontend, `google.provider` | Só se recriar o app |
| `VITE_MP_PUBLIC_KEY` | Pública | Env do frontend | Frontend | Junto das credenciais |
| `VITE_TURNSTILE_SITE_KEY` | Pública | Env do frontend | Frontend | Se recriar o widget |
| `MP_ACCESS_TOKEN` | Privada | Env do backend | `mercadopago.provider` | Semestral e se vazar |
| `MP_WEBHOOK_SECRET` | Assinatura | Env do backend | Verificação do webhook | Se vazar |
| `RESEND_API_KEY` | Privada | Env do backend | `resend.provider` | Semestral e se vazar |
| `CLOUDINARY_URL` (API secret) | Privada | Env do backend | `cloudinary.provider` | Semestral e se vazar |
| `TURNSTILE_SECRET_KEY` | Privada | Env do backend | `turnstile.provider` | Se vazar |
| `DATABASE_URL` (com *pooler*, papel `unishop_app`) | Privada | Env do backend | ORM | Semestral e se vazar |
| `DATABASE_URL_UNPOOLED` (direta, papel `unishop_migrator`) | Privada | Env do build da migração e terminal de quem faz o seed. **Fora** do GitHub | Migrações | Semestral e se vazar |
| `DATABASE_URL_BACKUP` (direta, papel `unishop_backup`, somente leitura) | Privada | Só segredo do GitHub, usado pelo workflow de backup | Backup | Semestral e se vazar |
| `CRON_SECRET` | Privada | Env do backend e agendador externo (cron-job.org) | Endpoints de jobs | Semestral e se vazar |
| `JWT_SECRET` | Privada | Env do backend | `authenticate`, `auth` | Semestral e se vazar |
| `ADMIN_PASSWORD` | Privada (uso único) | Só ao rodar o `seed` | `prisma/seed.ts` | Trocar no 1º login do admin |
| `SENTRY_DSN` | Infraestrutura | Env do backend | Inicialização do Sentry | Se vazar |
| `NGROK_AUTHTOKEN` | Infraestrutura | Máquina do dev | `ngrok` | Se vazar |


### 5.4 Camadas de defesa

```text
 1 · CLASSIFICAR       pública, privada, assinatura ou infraestrutura
   ▼
 2 · COFRE             variáveis de ambiente validadas ao iniciar + wrapper Secret
   ▼
 3 · FRONTEIRA         só os providers leem segredo; URLs dos provedores fixas no código
   ▼
 4 · ENTRADA           webhook: assinatura HMAC, janela de tempo, idempotência, consulta de volta
   ▼
 5 · SAÍDA             timeout, retry só em chamada idempotente, circuit breaker, cotas
   ▼
 6 · DADOS E LOGS      dados mínimos para terceiros; logs com redação de segredos
   ▼
 7 · DETECÇÃO E ROTAÇÃO   secret scanning, runbook de vazamento, rotação periódica
```

| Camada | Ameaça que reduz | Controles | Onde |
|---|---|---|---|
| 2 · Cofre | Segredo copiado, esquecido ou impresso | Variáveis de ambiente, `.env` fora do Git, validação ao iniciar, wrapper `Secret` | `config/env.ts` |
| 3 · Fronteira | Segredo usado em lugar errado; chamada a URL arbitrária (SSRF) | Só providers leem segredo; **URLs dos provedores são constantes**, nunca montadas com dado do usuário | `shared/providers/` |
| 4 · Entrada | Aviso falso, repetido ou antigo (*replay*) | Assinatura HMAC, janela de tempo, idempotência, consulta de volta | `payments.webhook.ts` |
| 5 · Saída | Provedor lento ou fora do ar derrubando a API | Timeout, retry com espera, circuit breaker, mapeamento de erros | `http-client.ts` |
| 6 · Dados e logs | Vazamento de dado pessoal ou segredo | Redação nos logs, dados mínimos, Sentry sem dado pessoal | `redact.ts`, pino |
| 7 · Detecção | Segredo commitado; chave esquecida | `gitleaks` no commit, alertas do provedor, rotação e *runbook* | Repositório, CI |


### 5.5 Ciclo de vida de uma credencial

```text
 1 · CRIAR       no painel do provedor, com chave dedicada
   ▼
 2 · GUARDAR     nos secrets do ambiente (nunca no Git)  ◀──────────────┐
   ▼                                                                    │ nova chave
 3 · INJETAR     variável de ambiente no início do processo             │
   ▼                                                                    │
 4 · USAR        só no provider, via Secret                             │
   ▼                                                                    │
 5 · MONITORAR   uso, erros e alertas do provedor ── vazou? ──▶ 7 · REVOGAR (invalida e recria) ─▶ volta ao 1
   ▼
 6 · ROTACIONAR  por calendário ou quando alguém sair ──────────────────┘
```

| Quando | Ação |
|---|---|
| A cada semestre | Rotacionar as credenciais privadas do inventário (5.3) |
| Quando alguém sai do grupo ou perde o acesso | Rotacionar **tudo** que essa pessoa conhecia |
| Ao trocar de ambiente (desenvolvimento para produção) | Criar credenciais novas; **nunca reaproveitar** as de teste |
| Suspeita de vazamento | Executar o *runbook* abaixo na hora |


### Runbook: uma chave vazou

1. **Revogar ou regenerar** a credencial no painel do provedor **imediatamente**. Não espere investigar.
2. Atualizar o *secret* do ambiente e reiniciar o backend.
3. Procurar uso indevido: painel de uso do provedor, logs de chamadas e, no caso do Mercado Pago, pagamentos e estornos recentes.
4. Se a chave foi enviada ao Git, **considere-a comprometida mesmo depois de apagar o commit**. Revogue primeiro; só depois limpe o histórico (por exemplo, com `git filter-repo`).
5. Registrar o incidente: data, o que vazou, o que foi feito e quem fez.
6. Descobrir o motivo e corrigir o controle que falhou (por exemplo, instalar o `gitleaks` no commit).

> **Rotação do `JWT_SECRET`.** Trocar o segredo derruba todas as sessões. Para fazer sem aviso, o backend aceita o segredo anterior por 2 horas (a validade do token). Decisão do grupo.


### 5.6 Proteção da entrada: webhooks

O webhook é a porta por onde um terceiro nos diz "este pagamento foi aprovado". É o ponto mais perigoso do projeto, porque dele depende o dinheiro e o estoque. Por isso vale a defesa em profundidade:

```text
Gateway chama POST /payments/webhook
 ├─ dentro do limite próprio do webhook?    não ▶ 429  (folgado: 300 por minuto por IP)
 ├─ x-signature e x-request-id presentes?   não ▶ 400
 ├─ HMAC SHA-256 confere?                   não ▶ 401 (registra tentativa suspeita)
 ├─ ts dentro da janela de 5 min?           não ▶ 401 (possível replay)
 ├─ consulta o pagamento na API do gateway  (não confia só no aviso)
 ├─ evento já processado?                   sim ▶ 200 OK (nada a fazer)
 └─ liquidação do pagamento (Backend, seção 11) ▶ 200 OK
```

O Mercado Pago envia o cabeçalho `x-signature` no formato `ts=...,v1=...`. A verificação monta um texto com o `id` do evento, o `x-request-id` e o `ts`, calcula um HMAC SHA-256 com a assinatura secreta e compara com o `v1`:

```ts
// shared/security/webhook-signature.ts
import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyMpSignature(o: {
  xSignature: string   // cabeçalho x-signature
  xRequestId: string   // cabeçalho x-request-id
  dataId: string       // data.id da query string (conferir a regra de minúsculas)
  secret: string       // MP_WEBHOOK_SECRET, já revelado pelo provider
  maxAgeMs?: number
}): boolean {
  const parts = Object.fromEntries(o.xSignature.split(',').map(p => p.trim().split('=')))
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false

  const manifest = 'id:' + o.dataId + ';request-id:' + o.xRequestId + ';ts:' + ts + ';'
  const expected = createHmac('sha256', o.secret).update(manifest).digest('hex')

  const a = Buffer.from(expected)
  const b = Buffer.from(v1)
  // comparação em tempo constante
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false

  // aceita ts em segundos ou milissegundos
  const tsMs = ts.length <= 10 ? Number(ts) * 1000 : Number(ts)
  // janela de tempo contra replay
  return Math.abs(Date.now() - tsMs) <= (o.maxAgeMs ?? 5 * 60_000)
}
```

- **Comparação em tempo constante** (`timingSafeEqual`) para não vazar a assinatura por diferença de tempo.
- **Janela de 5 minutos** no `ts` contra reenvio de avisos antigos. Se o relógio do servidor estiver errado, a verificação falha: mantenha o horário sincronizado.
- **Idempotência:** a liquidação trava o pedido e ignora aviso já processado (RN-PAG-06).
- **Consulta de volta:** mesmo com assinatura válida, o status vem de `GET /v1/payments/{id}`, não do corpo do aviso.
- A rota do webhook usa um **limite de requisições próprio e folgado** (300 por minuto por IP), separado do `rateLimiter` geral, e **não usa JWT**. A defesa principal é a assinatura (Backend, seção 16).
- Aviso inválido responde 401/400 **sem detalhe**, e o motivo vai só para o log (sem o corpo).


### 5.7 Proteção da saída: chamadas aos provedores

| Provedor | Tempo limite | Novas tentativas | Observação |
|---|---|---|---|
| Google (chaves do token) | 5 s | 1 | A biblioteca guarda as chaves públicas em cache |
| Mercado Pago, criar cobrança | 15 s | Só com a **mesma** `X-Idempotency-Key` (até 2) | Nunca repetir sem chave de idempotência |
| Mercado Pago, consultar | 10 s | 2, com espera crescente | Chamada segura de repetir |
| Mercado Pago, estornar | 15 s | Pelo job de conferência | Com chave de idempotência. O estorno usa `await` antes de responder (Backend, seção 11) |
| Resend | 10 s | 3, com espera crescente | Dentro de `waitUntil`; falha não bloqueia a resposta |
| Cloudinary (upload de uma imagem de até 4 MB) | 20 s | 1 | Se falhar, o anúncio não é criado |
| Turnstile | 5 s | 0 | Política de falha na seção 4.7 |
| Banco (pool) | 5 s | 0 | Falha vira 503 |
| Sentry | Assíncrono | 0 | Nunca bloqueia a requisição |

- **Circuit breaker simples:** depois de 5 falhas seguidas em 30 segundos, o provider "abre" por 60 segundos e responde `EXTERNAL_SERVICE_ERROR` sem chamar o provedor; depois testa uma chamada. Pode ser feito com a biblioteca `opossum` ou com um contador simples. Na Vercel cada instância tem o **seu** estado, então o circuit breaker protege cada instância e não o sistema todo: o efeito é menor do que num servidor único, e os timeouts continuam sendo a defesa principal.
- **Espera crescente com variação** (*backoff* com *jitter*) nas novas tentativas, para não martelar um provedor em dificuldade.
- **Cotas monitoradas:** o backend registra o consumo de e-mails e de chamadas e avisa antes de bater no limite gratuito.
- Erro de provedor **nunca** vai cru ao cliente: vira `EXTERNAL_SERVICE_ERROR` (502 ou 503), como no Backend, seção 15.


### 5.8 Segredos no frontend e política de conteúdo (CSP)

- No frontend só entram variáveis `VITE_*`, e **todas são públicas**. Nada com "SECRET", "TOKEN" ou "KEY" privada pode começar com `VITE_`.
- Um **teste automático** varre a pasta `dist/` depois do `build` e falha se encontrar o nome ou o formato de uma credencial privada (seção 9).
- O frontend deve receber uma **política de segurança de conteúdo (CSP)** que só permite carregar scripts e conexões dos provedores que usamos. Na Vercel ela entra como cabeçalho no `frontend/vercel.json` (Deploy, seção 5.2); o Deploy deixa a CSP para uma etapa futura, e a **lista abaixo é a base** para escrevê-la (conferir os endereços na documentação de cada SDK). Dono proposto: Francisco, junto do Deploy:

| Provedor | O que o frontend carrega | Diretiva da CSP |
|---|---|---|
| Google Identity | Script e janela do botão de login | `script-src`, `frame-src`, `connect-src` |
| Mercado Pago | SDK que gera o token do cartão | `script-src`, `connect-src`, `frame-src` |
| Cloudflare Turnstile | Script e *iframe* do widget | `script-src`, `frame-src` |
| Cloudinary | Imagens entregues pela CDN | `img-src` |
| API do Unishop | Chamadas `/api/v1` | `connect-src` |


### 5.9 Detecção e cadeia de suprimentos

- **Impedir o segredo antes do commit:** `gitleaks` como verificação local no commit e na CI. Se o plano do repositório oferecer a varredura de segredos do GitHub, ative também (conferir).
- **Dependências:** `package-lock.json` versionado, `npm ci` na CI, `npm audit` e Dependabot. SDKs de provedores (Mercado Pago, Google, Resend, Cloudinary) com **versão fixa** e atualização revisada em *pull request*.
- **Permissão mínima em todo lugar:** chaves dedicadas ao Unishop (nunca a chave pessoal de alguém), com o menor poder possível; `GITHUB_TOKEN` só de leitura; três papéis de banco: aplicação sem poder de alterar estrutura e backup somente leitura.
- **Alertas dos provedores:** ligar os avisos de uso e de erro no painel de cada um.


### 5.10 Segurança da API própria (a fronteira com o frontend)

Os controles da API do Unishop estão no documento de Backend. Aqui fica o resumo, porque eles fazem parte da mesma arquitetura de segurança:

| Controle | Resumo | Onde está |
|---|---|---|
| Autenticação | JWT com validade, no cabeçalho `Authorization: Bearer` | Backend, seção 8 |
| Autorização | Perfil por `authorizeRole`; dono conferido no service | Backend, seções 8 e 16 |
| Limite e bloqueio | `rateLimiter` por IP; 5 erros de login bloqueiam por 15 min | Backend, seções 6 e 8 |
| Validação | Zod em toda entrada; ORM parametrizado; texto sem HTML | Backend, seção 16 |
| Cabeçalhos e CORS | `helmet`; CORS só para `FRONTEND_URL` | Backend, seção 6 |
| Erros | Formato único, sem *stack trace* | Backend, seção 15 |
| Anti-bot | Turnstile em cadastro, login e recuperação de senha | Seção 4.7 deste documento |


## 6. Como implementar

Tudo o que toca um provedor externo mora em `backend/src/shared/` e segue o mesmo molde. Isso estende a pasta `providers/` já descrita no Backend (seção 5).


### 6.1 Pastas

```text
backend/src/
├─ config/
│  └─ env.ts                      # lê e valida as variáveis (segredos viram Secret)
└─ shared/
   ├─ security/
   │  ├─ secret.ts                # wrapper Secret: nunca imprime o valor
   │  ├─ webhook-signature.ts     # HMAC + janela de tempo (seção 5.6)
   │  └─ redact.ts                # campos sensíveis que o logger esconde
   └─ providers/
      ├─ http-client.ts           # chamada externa com timeout, retry e circuit breaker
      ├─ oauth/                   # interface · google.provider
      ├─ payment-gateway/         # interface · mercadopago.provider · mock.provider
      ├─ mail/                    # interface · resend · mailtrap · console · templates/
      ├─ storage/                 # interface · cloudinary.provider · local.provider
      ├─ antibot/                 # interface · turnstile.provider · noop.provider
      └─ index.ts                 # escolhe a implementação de cada interface pelo ambiente
```


### 6.2 Contratos (interfaces)

O resto do sistema só conhece estas interfaces. Os nomes dos métodos são sugestão; o importante é a fronteira.

```ts
// shared/providers/*/ *.interface.ts  (resumo)

interface OAuthProvider {
  verifyIdToken(idToken: string): Promise<{ googleId: string; email: string; name: string }>
}

interface PaymentGateway {
  createCardPayment(i: CardInput): Promise<GatewayPayment>
  createPixPayment(i: PixInput): Promise<GatewayPix>
  getPayment(id: string): Promise<GatewayPayment>
  cancelPayment(id: string): Promise<void>
  refundPayment(id: string, idempotencyKey: string): Promise<GatewayRefund>
  verifyWebhook(i: { headers: Headers; query: Query }): boolean
}
// CardInput = { token, amountCents, installments, reference, idempotencyKey }
// PixInput  = { amountCents, expiresAt, reference, idempotencyKey }

interface MailProvider {
  send(i: { to: string; template: MailTemplate; data: object }): Promise<void>
}

interface StorageProvider {
  upload(i: { buffer: Buffer; folder: string }): Promise<{ publicId: string; url: string }>
  remove(publicId: string): Promise<void>
}

interface AntiBotProvider {
  verify(token: string, ip?: string): Promise<boolean>
}
```


### 6.3 Configuração e segredos

O wrapper `Secret` impede que um segredo vaze por descuido em um `console.log`, em um `JSON.stringify` ou em uma mensagem de erro. O valor só sai quando o provider chama `reveal()`.

```ts
// shared/security/secret.ts
export class Secret {
  #value: string
  constructor(value: string) { this.#value = value }
  reveal(): string { return this.#value }                 // só os providers chamam
  toString() { return '[REDACTED]' }
  toJSON() { return '[REDACTED]' }
  [Symbol.for('nodejs.util.inspect.custom')]() { return '[REDACTED]' }
}
```

```ts
// config/env.ts
import { z } from 'zod'
import { Secret } from '../shared/security/secret'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),   // para as bibliotecas; a Vercel usa 'production' também no Preview
  APP_ENV: z.enum(['development', 'test', 'preview', 'production']), // o ambiente DE VERDADE, definido por ambiente no painel da Vercel
  PORT: z.coerce.number().default(3000),
  // uma ou mais origens, separadas por vírgula (Deploy, seção 9)
  FRONTEND_URL: z.string().transform(s => s.split(',').map(o => o.trim())).pipe(z.array(z.string().url()).min(1)),
  ALLOWED_EMAIL_DOMAIN: z.string().default('edu.unifor.br'),
  DATABASE_URL: z.string().min(1),                  // com pooler
  DATABASE_URL_UNPOOLED: z.string().optional(),     // só no build da migração e no backup
  CRON_SECRET: z.string().min(32),
  EMAIL_VERIFICATION_REQUIRED: z.enum(['true', 'false']).default('false'),  // RN-ACE-07
  JWT_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  MP_ACCESS_TOKEN: z.string().min(1),
  MP_WEBHOOK_SECRET: z.string().min(1),
  PAYMENT_MODE: z.enum(['sandbox', 'production']),
  PAYMENT_DRIVER: z.enum(['mercadopago', 'mock']),
  MAIL_DRIVER: z.enum(['resend', 'mailtrap', 'console']),
  STORAGE_DRIVER: z.enum(['cloudinary', 'local']),
  ANTIBOT_DRIVER: z.enum(['turnstile', 'noop']),
  // ... demais variáveis
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  // mostra só o NOME das variáveis com problema, nunca o valor
  const names = parsed.error.issues.map(i => i.path.join('.')).join(', ')
  console.error('Configuração inválida:', names)
  process.exit(1)
}
const e = parsed.data

// trava de segurança: credencial REAL de pagamento só no ambiente de produção.
// O contrário (produção com credencial de teste) é permitido enquanto valer a RN-PAG-10
// (conta única de teste, repasse simulado). Por isso a trava usa APP_ENV, e não NODE_ENV,
// que na Vercel é 'production' também no Preview.
if (e.PAYMENT_MODE === 'production' && e.APP_ENV !== 'production') {
  console.error('Credencial real de pagamento fora do ambiente de produção')
  process.exit(1)
}

export const env = Object.freeze({
  appEnv: e.APP_ENV,
  nodeEnv: e.NODE_ENV,
  cronSecret: new Secret(e.CRON_SECRET),
  frontendUrls: e.FRONTEND_URL,
  port: e.PORT,
  allowedEmailDomain: e.ALLOWED_EMAIL_DOMAIN,
  emailVerificationRequired: e.EMAIL_VERIFICATION_REQUIRED === 'true',
  jwtSecret: new Secret(e.JWT_SECRET),
  google: { clientId: e.GOOGLE_CLIENT_ID },
  mp: {
    accessToken: new Secret(e.MP_ACCESS_TOKEN),
    webhookSecret: new Secret(e.MP_WEBHOOK_SECRET),
  },
  drivers: {
    payment: e.PAYMENT_DRIVER, mail: e.MAIL_DRIVER,
    storage: e.STORAGE_DRIVER, antibot: e.ANTIBOT_DRIVER,
  },
})
```


### 6.4 Composição dos providers e trava de produção

Em desenvolvimento e teste, é possível usar versões falsas (`mock`, `console`, `local`, `noop`). **Em produção, as que mexem com dinheiro, e-mail e arquivos são proibidas** (`mock`, `console`, `local`): o servidor se recusa a iniciar. O anti-bot `noop` fica **liberado enquanto o Turnstile não entra** (ele é "depois do MVP", seção 4.7); quando o Turnstile for implantado, o `noop` também passa a ser proibido em produção. O **Preview** não é produção: pode usar `mailtrap` e a conta de teste do Mercado Pago.

```ts
// shared/providers/index.ts
export function buildProviders(env: Env) {
  if (env.appEnv === 'production') {
    const d = env.drivers
    const fake = d.payment === 'mock' || d.mail === 'console' || d.storage === 'local'
    // quando o Turnstile entrar:  || d.antibot === 'noop'
    if (fake) {
      throw new Error('Driver de teste não pode rodar em produção')
    }
  }
  return {
    payment: env.drivers.payment === 'mercadopago'
      ? new MercadoPagoProvider(env.mp)
      : new MockPaymentGateway(),
    mail: pickMail(env),
    storage: pickStorage(env),
    antibot: pickAntiBot(env),
    oauth: new GoogleProvider(env.google),
  }
}
```

- Os services recebem os providers por parâmetro (injeção simples), o que permite testar com `mock`.
- Um provider novo exige: interface, implementação, versão `mock`, variáveis no `env.ts` e no `.env.example`, e uma linha no inventário da seção 5.3.


### 6.5 Chamadas externas com timeout e nova tentativa

```ts
// shared/providers/http-client.ts
export async function callExternal<T>(
  provider: string,
  fn: (signal: AbortSignal) => Promise<T>,
  opts: { timeoutMs: number; retries: number } = { timeoutMs: 10_000, retries: 2 },
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn(AbortSignal.timeout(opts.timeoutMs))
    } catch (err) {
      if (attempt >= opts.retries || !isRetryable(err)) {
        logger.warn({ provider, attempt }, 'falha em serviço externo')  // sem corpo e sem chave
        throw new ExternalServiceError(provider)  // o erro original não vai ao cliente
      }
      await sleep(2 ** attempt * 300 + Math.random() * 100)  // espera crescente
    }
  }
}
// Use SÓ em chamadas seguras de repetir (consultas) ou com chave de idempotência.
```


### 6.6 Logs sem segredos

```ts
// shared/security/redact.ts + logger
import pino from 'pino'

export const logger = pino({
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-signature"]',
      'req.body.password',
      'req.body.token',
      '*.accessToken', '*.apiKey', '*.secret',
    ],
    censor: '[REDACTED]',
  },
})
```

- Cada chamada externa registra: provedor, operação, duração, status e `requestId`. **Nunca** o corpo, a chave ou dado pessoal.
- O Sentry é configurado sem dados pessoais (seção 4.10).


### 6.7 Como os erros dos provedores viram erros do Unishop

| Situação no provedor | Erro do Unishop | Status |
|---|---|---|
| Cartão ou Pix recusado pelo Mercado Pago | `PAYMENT_DECLINED` | 402 |
| Pix vencido (o pedido foi cancelado) | `PIX_EXPIRED` | 409 |
| Anúncio saiu do ar durante o pagamento | `LISTING_UNAVAILABLE` | 409 |
| Token do Google inválido ou expirado | `TOKEN_INVALID` | 401 |
| E-mail do Google não verificado ou fora do domínio | `EMAIL_NOT_VERIFIED` / `EMAIL_DOMAIN_NOT_ALLOWED` | 403 |
| Desafio anti-bot reprovado | `BOT_CHECK_FAILED` | 403 |
| Timeout, erro 5xx ou circuit breaker aberto | `EXTERNAL_SERVICE_ERROR` | 502 ou 503 |
| Limite do provedor excedido (cota) | `EXTERNAL_SERVICE_ERROR` (e alerta no log) | 503 |

O código `BOT_CHECK_FAILED` é novo e deve entrar na tabela de erros do Backend (seção 15) quando o Turnstile for implementado.


## 7. Ambientes e credenciais

Cada ambiente usa **credenciais próprias**. Credencial de teste nunca vai para produção, e a de produção nunca aparece em desenvolvimento, na CI ou no computador de alguém.

| API | Desenvolvimento | Testes automáticos | Produção |
|---|---|---|---|
| Google | Cliente OAuth "Unishop Dev" (origem `localhost:5173`) | Mock do provider | Cliente OAuth "Unishop" (domínio real) |
| Mercado Pago | Credenciais de **teste**, usuários de teste, `PAYMENT_MODE=sandbox`, túnel para webhook | `mock` | Credenciais de **teste** enquanto valer a RN-PAG-10 (`PAYMENT_MODE=sandbox`); reais só se o grupo mudar a regra. O Preview também usa teste, mas não recebe webhook |
| Resend / Mailtrap | Mailtrap (caixa de teste) | `console` | Resend, domínio verificado (Preview: Mailtrap) |
| Cloudinary | Pasta `unishop/dev/` (ou conta separada) | `local` | Pasta `unishop/prod/` (`CLOUDINARY_UPLOAD_FOLDER`) |
| Turnstile | Chaves de teste da Cloudflare | `noop` | `noop` até o Turnstile entrar; depois, widget de produção com hostname restrito |
| PostgreSQL | Docker local (`docker-compose.yml`, imagem `postgres:18`) | Docker local de testes (`docker-compose.test.yml`), em memória | Branch `production` do Neon (PostgreSQL 18); um branch por preview, derivado do branch de desenvolvimento |
| Sentry | Desligado ou `environment=development` | Desligado | `environment=production` |


### `.env.example` completo

```bash
# Gerais
NODE_ENV=development
APP_ENV=development         # development | test | preview | production (definido por ambiente na Vercel)
PORT=3000
FRONTEND_URL=http://localhost:5173   # uma ou mais origens, separadas por vírgula
ALLOWED_EMAIL_DOMAIN=edu.unifor.br

# Banco
DATABASE_URL=               # em produção: endereço com pooler (?pgbouncer=true&connection_limit=1)
DATABASE_URL_UNPOOLED=      # conexão direta (papel de migração); só migração e seed. O backup usa DATABASE_URL_BACKUP (só no GitHub)

# Sessão (própria)
JWT_SECRET=                 # mínimo de 32 caracteres aleatórios
JWT_EXPIRES_IN=2h

# Jobs agendados (produção)
CRON_SECRET=                # mínimo de 32 caracteres; protege /api/v1/internal/jobs/*

# Confirmação de e-mail por link (RN-ACE-07): desligada no MVP
EMAIL_VERIFICATION_REQUIRED=false

# Google
GOOGLE_CLIENT_ID=

# Mercado Pago
PAYMENT_MODE=sandbox        # sandbox = credenciais de teste (valem também na produção do trabalho, RN-PAG-10) | production = reais
PAYMENT_DRIVER=mock         # mock | mercadopago
MP_ACCESS_TOKEN=
MP_WEBHOOK_SECRET=

# E-mail
MAIL_DRIVER=console         # console | mailtrap | resend
MAIL_FROM=no-reply@seudominio.com
RESEND_API_KEY=

# Imagens
STORAGE_DRIVER=local        # local | cloudinary
CLOUDINARY_URL=
CLOUDINARY_UPLOAD_FOLDER=unishop-dev   # unishop-prod em produção

# Anti-bot
ANTIBOT_DRIVER=noop         # noop | turnstile
TURNSTILE_SECRET_KEY=

# Observabilidade
SENTRY_DSN=

# Regras de negócio
SERVICE_FEE_PERCENT=0
PIX_EXPIRATION_MINUTES=30
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCK_MINUTES=15

# Só para o seed da conta admin
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

```bash
# frontend/.env.example  (SÓ valores públicos)
VITE_API_URL=http://localhost:3000/api/v1
VITE_GOOGLE_CLIENT_ID=
VITE_MP_PUBLIC_KEY=
VITE_TURNSTILE_SITE_KEY=
```

> O `.env.example` **não tem valores reais**: serve só de lista. O arquivo `.env` real está no `.gitignore`. Segredos de produção ficam nas *Environment Variables* da Vercel, marcadas como *Sensitive* (documento de Deploy, seção 4). A lista de variáveis do Deploy (seção 4.2) e esta devem ser mantidas iguais; no Deploy, `APP_ENV` e os drivers de produção são `production`, `mercadopago`, `resend`, `cloudinary` e `noop` (até o Turnstile entrar).


## 8. Resiliência e contingência

Se um provedor cair, só a função dele para. Esta tabela define o comportamento esperado:

| Provedor fora do ar | O que o aluno vê | O que o sistema faz |
|---|---|---|
| Mercado Pago | "Pagamento temporariamente indisponível". O contato por WhatsApp continua funcionando | `EXTERNAL_SERVICE_ERROR`; o circuit breaker evita insistir; o job de conferência corrige pagamentos que ficaram pendentes |
| Google | O botão falha; o login com e-mail e senha segue | Registra o erro; nada mais é afetado |
| Resend | E-mails chegam atrasados ou não chegam | Tenta de novo (3 vezes), registra em log e segue; reenvio manual por `resend-verification` e `forgot-password` |
| Cloudinary | "Não foi possível enviar a imagem. Tente de novo" | Falha o upload (502); **nada** é gravado no banco |
| Turnstile | Conforme a política da seção 4.7 | Falha fechada em cadastro e recuperação; aberta com limite no login |
| PostgreSQL | "Sistema indisponível" | `/health/db` responde 503; a API responde 503 |
| Sentry ou UptimeRobot | Nada | Nada: são só de apoio |


### Quando o limite gratuito acaba

| Provedor | Efeito | Plano B |
|---|---|---|
| Resend (100 por dia) | E-mails recusados até o dia seguinte | Priorizar e-mails de segurança; trocar de plano ou de provedor (a interface `MailProvider` permite) |
| Cloudinary (créditos) | Entrega ou upload limitados até renovar | Reduzir transformações; migrar para R2 (ADR-004) |
| Neon (CU-horas) | Banco suspenso até renovar | Subir de plano; ou usar Supabase |
| Sentry (5.000 erros) | Eventos descartados | Aumentar a amostragem de descarte ou trocar de plano |


## 9. Testes das integrações

| Tipo | O que testar | Como |
|---|---|---|
| Unitário | Verificação de assinatura (válida, adulterada, `ts` antigo); `Secret` não aparece em `toString`, `JSON.stringify` nem `console.log`; mapeamento de status do gateway; `whatsappLink` | Vitest |
| Integração com provedor falso | Cobrança aprovada, recusada, sem estoque (estorno), Pix vencido; webhook duplicado; e-mail com falha temporária; upload que falha e desfaz o anúncio | Vitest + Supertest, com `mock` ou respostas gravadas |
| Contrato | Respostas de exemplo de Mercado Pago, Google e Resend gravadas, para perceber quando o provedor muda | Respostas gravadas versionadas |
| Sandbox (manual, antes da entrega) | Pix pago, cartão aprovado e recusado, estorno e webhook real, pelo túnel | Contas de teste do Mercado Pago |


### Testes de segurança

| Teste | Resultado esperado |
|---|---|
| Iniciar com variável obrigatória ausente | O servidor **não sobe** e mostra só o nome da variável |
| `APP_ENV` diferente de `production` com `PAYMENT_MODE=production` (credencial real fora da produção) | O servidor **não sobe** |
| `APP_ENV=production` com `PAYMENT_MODE=sandbox` | O servidor **sobe** (RN-PAG-10: produção usa conta de teste) |
| `APP_ENV=production` com driver `mock`, `console` ou `local` (e `noop`, depois que o Turnstile entrar) | O servidor **não sobe** |
| `FRONTEND_URL` com `*` ou `http://` em `preview` ou `production` (uma lista de origens `https` é válida) | O servidor **não sobe** com `*` ou `http://`; sobe com a lista |
| Chamar `/api/v1/internal/jobs/<nome>` sem o `CRON_SECRET`, com `Bearer undefined` ou com `Bearer [REDACTED]` | 401, e o job não roda |
| Varrer a pasta `dist/` do frontend depois do `build` | Nenhum nome ou formato de credencial privada |
| Logger com objeto contendo `accessToken`, `apiKey` e `Authorization` | Todos aparecem como `[REDACTED]` |
| Webhook sem assinatura, com assinatura errada ou com `ts` de 10 minutos atrás | 401 ou 400, e nenhum efeito no pedido |
| Mesmo webhook enviado duas vezes | Um único efeito (RN-PAG-06) |
| `gitleaks` na CI | Falha se houver segredo no commit |


## 10. Custos e limites

> Limites **conferidos em pesquisa em 14/10/2026**. Planos e termos mudam: confirme na página oficial antes de depender deles. "Conferir" indica informação não verificada.

| API | Limite gratuito | Risco para o projeto | Plano B |
|---|---|---|---|
| Google Identity | Gratuito | Depende de o e-mail da Unifor ser conta Google | Login com e-mail e senha (continua no MVP) |
| Apple Sign In | **US$ 99/ano** | Custo e e-mail de retransmissão | Fora do MVP |
| Mercado Pago | Sem mensalidade; **tarifa por transação com credenciais reais** (conferir). Com a RN-PAG-10 só se usa o modo de teste | Taxa sobre cada venda, se o grupo mudar a RN-PAG-10 | PicPay, PagBank, Asaas, EFI |
| Resend | **3.000 e-mails/mês, 100/dia, 1 domínio** | Estourar 100 por dia | Mailtrap só em dev; outro provedor |
| Cloudinary | **25 créditos/mês** (1 crédito = 1 GB de armazenamento, ou 1 GB de banda, ou 1.000 transformações) | Imagens muito acessadas | Cloudflare R2 |
| Cloudflare Turnstile | Gratuito; **até 20 widgets**; sem SLA no gratuito | Queda do provedor | Política de falha (4.7) |
| Neon | **100 CU-horas e 1 GB** por projeto por mês; 10 branches; restauração de 6 h; dorme em 5 min (conferido em 16/10/2026) | Suspender ao atingir o limite; arranque lento (soma-se à partida a frio da função, RNF008). Jobs e monitor que acordam o banco gastam CU-horas, por isso os jobs rodam de 30 em 30 minutos e o `/health` não consulta o banco. Cada branch de preview também consome o limite | Supabase (conferir) |
| Vercel (Hobby) | Gratuito, de uso não comercial; sem equipe; cron só diário; logs de cerca de 1 h; 100 deploys/dia | Ver Deploy, seção 6 e pendência 1 | Plano Pro, se necessário |
| Sentry | **1 usuário, 5.000 erros/mês** | Só 1 pessoa no gratuito | Adiar, ou conta compartilhada |
| UptimeRobot | **50 monitores, checagem a cada 5 min** (termos de uso: conferir) | Restrição de uso comercial (conferir) | StatusCake (10 monitores) |
| GitHub Actions | Gratuito dentro da cota (conferir) | Minutos em repositório privado | Rodar testes localmente |
| ngrok / Cloudflare Tunnel | Gratuito (conferir) | URL que muda | Cloudflare Tunnel |


## 11. Rastreabilidade: regras e requisitos por API

| API | Regras de Negócio | Requisitos |
|---|---|---|
| Google Identity | RN-ACE-02, RN-ACE-06, RN-ACE-14 | RF002.6, RF003.3, RNF002 |
| Mercado Pago | RN-PAG-01 a 14, RN-PED-01, RN-PED-02, RN-EST-03, RN-EST-04 | RF010, RF011, RNF006 |
| Resend (e Mailtrap) | RN-ACE-07, RN-ACE-10, RN-PER-02, RN-NOT-01 a 04 | RF002.5, RF004.2, RF013.4, RF011.2, RF023.7 |
| Cloudinary (e R2) | RN-ANU-03, RN-PER-05 | RF015.2, RF008.1, RNF005 (desvio de 4 MB), RNF009 |
| WhatsApp `wa.me` | RN-PED-05, RN-PER-04 | RF009.4, RF014.5, RF017.5, RNF007 |
| Cloudflare Turnstile | RN-ACE-09 | RNF003 |
| PostgreSQL gerenciado (Neon) | RN-EST-05 (CHECK), RN-PED-03 | RNF011, RNF015 |
| Vercel Cron e agendador externo | RN-PAG-04, RN-PAG-05, RN-PAG-08, RN-PAG-12, RN-PAG-13, RN-ACE-10 | RNF011 |
| Sentry, UptimeRobot, GitHub Actions | — | RNF011, RNF016 |
| Arquitetura de segurança (seção 5) | RN-ADM-01, RN-PAG-02, RN-PAG-05, RN-PAG-06 | RNF001, RNF003, RNF004, RNF005, RNF006, RNF007 |


## 12. Decisões e pendências


### Decisões adotadas

| Tema | Decisão |
|---|---|
| Modelo de segurança | **Backend-cofre**: segredos só no backend, em variáveis de ambiente validadas, embrulhados em `Secret`, lidos só pelos providers (ADR-008) |
| Fronteira com provedores | Uma interface por serviço, em `shared/providers/`, com versão `mock` |
| Chaves públicas e privadas | Só `VITE_*` no frontend, todas públicas; teste que varre o `dist/` |
| Webhook | Assinatura HMAC, janela de 5 minutos, idempotência e consulta de volta |
| Pagamento | **Mercado Pago (ADR-002, decidido)**; cartão por token; Pix com webhook; repasse simulado; produção usa credenciais de teste (RN-PAG-10) |
| Login social | **Google no MVP** (domínio conferido no servidor); Apple fora |
| Upload de imagem | Pelo backend, para a Cloudinary; uma imagem por requisição, até 4 MB (confirmado pelo grupo em 16/10/2026); sem upload assinado direto do navegador |
| WhatsApp | Link `wa.me`, sem API |
| Ambientes | Credenciais separadas por ambiente; `APP_ENV` define o ambiente; drivers `mock`, `console` e `local` proibidos em produção; credencial real de pagamento só em produção |
| Hospedagem e banco | **Vercel + Neon (ADR-005, decidido)**; documentado em `docs/deploy/deploy.md` |
| Jobs agendados | Endpoints `/api/v1/internal/jobs/:name` com `CRON_SECRET`; Vercel Cron no diário e agendador externo a cada 30 minutos (Backend, seção 14) |
| Banco | Neon, PostgreSQL 18, três papéis (migração, aplicação, backup somente leitura); previews derivados do branch de desenvolvimento |
| Monitoramento | UptimeRobot no MVP, chamando o `/health` leve |


### Registros de decisão (ADRs) ligados a este documento

Numeração única para todos os documentos (a mesma do Backend e do Deploy):

| ADR | Tema | Estado |
|---|---|---|
| ADR-001 | ORM (Prisma) | **Decidido** |
| ADR-002 | Gateway de pagamento (Mercado Pago) e forma de integração (Payments API ou Orders API) | **Gateway decidido: Mercado Pago.** Falta escolher a Payments API ou a Orders API |
| ADR-003 | Login social só com Google (MVP), sem Apple; e-mail e senha continuam | Decidido |
| ADR-004 | Armazenamento de imagens: Cloudinary no MVP (R2 fica como alternativa) | **Decidido** |
| ADR-005 | Hospedagem e banco: Vercel + Neon (`docs/deploy/deploy.md`) | **Decidido** |
| ADR-006 | Anti-bot (Turnstile) depois do MVP, com a política de falha da seção 4.7 | **Decidido** |
| ADR-007 | Observabilidade: UptimeRobot e Sentry depois do MVP (Sentry sem dado pessoal) | **Decidido** |
| ADR-008 | Modelo de segurança "backend-cofre" (era ADR-005 na v0.1 deste documento) | **Decidido** |
| ADR-009 | Provedor de e-mail transacional (Resend; Mailtrap em desenvolvimento) | **Decidido** |


### Pendências em aberto

As propostas que o grupo fechou em 15/10/2026 (Sentry adiado, Turnstile depois do MVP, Cloudinary, segredo anterior do JWT aceito por 2 horas, política de falha do Turnstile, priorização dos e-mails de segurança, sem *staging*) viraram decisão e estão nas tabelas acima. Fecharam-se também a pergunta do limite de imagem (4 MB, confirmado pelo grupo em 16/10/2026) e a separação dos papéis do banco (Banco de Dados, seção 10). Continuam abertas as que dependem de uma ação ou resposta externa:

| # | Pendência | Proposta |
|---|---|---|
| 1 | Escolher a Payments API ou a Orders API do Mercado Pago (ADR-002; o gateway já está decidido) | Decidir depois de ler a documentação vigente e testar no sandbox, junto da prova de conceito do Pix de teste (Deploy, seção 17) |
| 2 | Domínio próprio para o Resend verificar (SPF e DKIM). Quem controla o DNS? | Registrar um domínio do projeto; sem ele, só testes com Mailtrap |
| 3 | O e-mail `@edu.unifor.br` está vinculado a uma conta Google e entrega `email_verified`? | Testar com um e-mail real antes de fechar o RF002.6 |
| 4 | Termos do plano gratuito do UptimeRobot (uso não comercial) | Conferir; se for barrado, usar StatusCake |
| 5 | **O `openapi.yaml` (contrato da API do Unishop) não existe**, e o frontend, o backend e as skills dependem dele | Pedro escreve a partir do Backend §9 e deste documento, antes de o frontend consumir as rotas; definir prazo |
| 6 | Criar os três papéis do banco no Neon gratuito: confirmar no painel como criar papéis com senha | Francisco ou Ana Clara confirma antes do primeiro deploy; se não for possível, usar um papel só e registrar a exceção no Deploy |