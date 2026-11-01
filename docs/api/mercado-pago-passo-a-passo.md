# Mercado Pago: passo a passo para ligar as chaves

Guia prático para trocar o gateway falso pelo Mercado Pago **só preenchendo chaves**. A estrutura do código já existe (Etapas 3, 6, 7 e 8 do `roteiro-backend.md`, escritas em 01/11/2026). Fonte das regras: `docs/api/api.md` (§4.3, §5.6, §6) e `docs/backend/backend.md` (§9.5, §9.6, §11, §14).

**Decisão registrada (ADR-002, pendência P3):** a integração usa a **Payments API** (`/v1/payments`) do Mercado Pago, com cartão por token e Pix com webhook assinado. A Orders API ficou de fora. Se a prova de conceito (passo 6) mostrar que o Pix de teste não gera o webhook, reabra essa decisão.

## 0. O que já funciona sem nenhuma chave

Com `PAYMENT_DRIVER=mock` (o padrão) o fluxo inteiro roda no seu computador: criar pedido, pagar no cartão e no Pix, webhook, liquidação, estorno e jobs. É o jeito de conferir tudo antes de abrir conta no Mercado Pago.

1. `backend/.env`: deixe `PAYMENT_DRIVER=mock` e `APP_ENV=development`.
2. `frontend/.env`: troque `VITE_USE_MOCKS=true` por `VITE_USE_MOCKS=false` (com `true` as telas continuam usando dados de exemplo) e deixe `VITE_MP_PUBLIC_KEY` vazio.
3. Suba o banco, a API (`npm run dev` em `backend/`) e o frontend.
4. No cartão, o frontend manda o token falso `mock_declined` quando o número é `4000 0000 0000 0002` e `mock_approved` nos demais. No Pix, o botão "Já paguei" aprova a cobrança falsa (rota `POST /payments/dev/orders/:id/approve`, que só existe com o gateway falso e `APP_ENV` de desenvolvimento ou teste).

## 1. Criar a aplicação no Mercado Pago

1. Entre em <https://www.mercadopago.com.br/developers/panel/app> com a conta do grupo (use uma conta própria do projeto, não a pessoal de ninguém).
2. **Criar aplicação** → tipo de pagamento **Pagamentos online** → solução **Checkout Transparente** (API de Pagamentos). Os nomes dos menus mudam; confira na documentação vigente.
3. Na aplicação, abra **Credenciais de teste**. Você vai precisar de duas:
   - **Public Key** (começa com `TEST-` ou `APP_USR-`): vai para o frontend. É pública.
   - **Access Token**: vai para o backend. **É segredo.**
4. Em **Contas de teste**, crie um usuário **vendedor** e um **comprador** (o Mercado Pago recomenda testar logado com essas contas).

> RN-PAG-10: em produção o Unishop também usa **credencial de teste**, com repasse simulado. Não existe credencial "real" neste projeto; `PAYMENT_MODE=production` fica bloqueado fora de `APP_ENV=production` e não deve ser usado no escopo acadêmico.

## 2. Onde colocar cada chave

| # | Arquivo | Variável | De onde vem | Segredo? |
|---|---|---|---|---|
| 1 | `backend/.env` | `MP_ACCESS_TOKEN` | Credenciais de teste → Access Token | **Sim** |
| 2 | `backend/.env` | `MP_WEBHOOK_SECRET` | Webhooks → "Assinatura secreta" (passo 4) | **Sim** |
| 3 | `backend/.env` | `PAYMENT_DRIVER` | Troque `mock` por `mercadopago` | Não |
| 4 | `backend/.env` | `PAYMENT_MODE` | Deixe `sandbox` (credencial de teste) | Não |
| 5 | `backend/.env` | `API_PUBLIC_URL` | URL pública da API, **sem barra no fim** (ngrok no desenvolvimento, domínio da Vercel em produção) | Não |
| 6 | `backend/.env` | `CRON_SECRET` | Texto longo e aleatório que você inventa (protege os jobs) | **Sim** |
| 7 | `frontend/.env` | `VITE_MP_PUBLIC_KEY` | Credenciais de teste → Public Key | Não (pública) |
| 8 | `frontend/.env` | `VITE_USE_MOCKS` | `false` | Não |

Regras:

- **Nunca** coloque o Access Token ou a assinatura secreta em arquivo do frontend nem em variável `VITE_*` (tudo que começa com `VITE_` vai para o navegador).
- Os arquivos `.env` ficam fora do Git. Os `.env.example` têm só os nomes.
- Se `PAYMENT_DRIVER=mercadopago` e faltar `MP_ACCESS_TOKEN` ou `MP_WEBHOOK_SECRET`, **o servidor não sobe** e diz qual variável falta.
- Gere o `CRON_SECRET` com: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## 3. Expor a API para o Mercado Pago (desenvolvimento)

O Mercado Pago precisa chamar a sua API de fora do seu computador. Use um túnel:

1. Instale o ngrok (ou o Cloudflare Tunnel) e rode `ngrok http 3000`.
2. Copie a URL `https://xxxx.ngrok-free.app` para `API_PUBLIC_URL` no `backend/.env` e reinicie a API.
3. A API manda ao Mercado Pago, em cada cobrança, o endereço `API_PUBLIC_URL/api/v1/payments/webhook`.

Atenção: `API_PUBLIC_URL` também é a base das URLs das imagens do driver local; com o túnel ligado elas passam a sair pelo ngrok. É esperado em desenvolvimento.

## 4. Cadastrar o webhook e pegar a assinatura secreta

1. Na aplicação: **Webhooks** → **Configurar notificações** → ambiente **Teste**.
2. **URL:** `https://xxxx.ngrok-free.app/api/v1/payments/webhook` (a mesma do passo 3).
3. **Eventos:** marque **Pagamentos** (`payment`).
4. Salve e copie a **Assinatura secreta** para `MP_WEBHOOK_SECRET`.
5. Use o botão **Simular notificação** do painel para ver chegar um aviso. Um aviso simulado tem um ID que não existe na sua base: a API responde 200 e ignora (esperado).

Como a API se defende (você não precisa configurar): confere `x-signature` e `x-request-id` (sem eles, 400), calcula o HMAC SHA-256 e compara em tempo constante (errado, 401), recusa avisos com mais de 5 minutos (replay) e **consulta o pagamento no Mercado Pago** antes de mudar qualquer coisa. O pedido só vira "Pago" por esse caminho.

## 5. Testar

1. Reinicie a API e o frontend. Confira no log que não há erro de variável.
2. Entre com um aluno, abra um anúncio de **outro** aluno e siga para o pagamento.
3. **Cartão:** use os cartões de teste do Mercado Pago (confirme os números na página "Cartões de teste" da documentação, pois mudam). O **nome do titular** define o resultado: `APRO` aprova, `OTHE` recusa, `CONT` fica pendente. Validade futura e CVV `123`.
4. **Pix:** gere o código na aba Pix. Veja o passo 6 sobre como aprovar.
5. Confirme no banco: `pedido.status_pedido = 'pago'`, `pagamento.status_pagamento = 'aprovado'` e o estoque do anúncio descontado.
6. Recuse um cartão: deve vir 402 e o pedido continua Pendente; uma nova tentativa cria **outra linha** em `pagamento`.

## 6. Prova de conceito do Pix (pendência P3)

É o único ponto que ninguém confirmou ainda: **o Pix gerado com credencial de teste dispara o webhook de aprovação?** Faça uma vez e registre o resultado aqui:

1. Gere um Pix de teste pelo Unishop (passo 5).
2. Procure no painel do Mercado Pago, em **Atividade** da conta de teste ou na documentação de "Testar Pix", a forma de simular o pagamento.
3. Veja se chega `POST /payments/webhook` (log da API ou painel do ngrok em `http://127.0.0.1:4040`).
4. Se **não** chegar, use o job de conciliação (`reconcile-pending-payments`, passo 8): ele consulta o pagamento no Mercado Pago e liquida mesmo sem o aviso.

Resultado da prova (preencher): `________________________`.

## 7. Produção (Vercel + Supabase)

Variáveis do projeto da API na Vercel (ambiente **Production**):

| Variável | Valor |
|---|---|
| `APP_ENV` | `production` |
| `PAYMENT_DRIVER` | `mercadopago` (com `mock` a API recusa subir) |
| `PAYMENT_MODE` | `sandbox` (credencial de teste, RN-PAG-10) |
| `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` | As mesmas de teste, ou de outra aplicação de teste só da produção |
| `API_PUBLIC_URL` | URL pública da API (ex.: `https://api-unishop.vercel.app`, sem barra no fim) |
| `CRON_SECRET` | Texto longo e aleatório (diferente do de desenvolvimento) |

Frontend (Production): `VITE_MP_PUBLIC_KEY`, `VITE_API_URL` e `VITE_USE_MOCKS` ausente ou `false`.

No painel do Mercado Pago, cadastre **outro** webhook (ou troque a URL) apontando para `https://<api-publica>/api/v1/payments/webhook`. **Previews da Vercel não recebem webhook** (a URL cadastrada é uma só): teste pagamento no local com túnel ou na produção.

Jobs (sem processo vivo na Vercel; detalhes em `docs/deploy/deploy.md`):

| Job | Frequência | Quem chama |
|---|---|---|
| `expire-pix-payments` | a cada 30 min | cron-job.org |
| `reconcile-pending-payments` | a cada 30 min | cron-job.org |
| `cleanup-expired-tokens` | diário | Vercel Cron |

Cada chamada é `GET https://<api-publica>/api/v1/internal/jobs/<nome>` com o cabeçalho `Authorization: Bearer <CRON_SECRET>`. Sem o cabeçalho, ou com `Bearer undefined`, a resposta é 401. Em desenvolvimento, o `dev-server.ts` agenda os três com `node-cron`.

## 8. Rodar um job à mão (conferir se está tudo certo)

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" http://localhost:3000/api/v1/internal/jobs/reconcile-pending-payments
```

Resposta esperada: `{"data":{"synced":0,"refunded":0}}`. Rodar duas vezes dá o mesmo resultado (idempotente).

## 9. Se algo der errado

| Sintoma | Causa provável |
|---|---|
| A API não sobe e cita `MP_ACCESS_TOKEN` ou `MP_WEBHOOK_SECRET` | `PAYMENT_DRIVER=mercadopago` sem as chaves no `backend/.env` |
| A API não sobe e cita `APP_ENV=production` | `PAYMENT_MODE=production` fora de produção, ou `PAYMENT_DRIVER=mock` em produção |
| Webhook responde 401 | `MP_WEBHOOK_SECRET` diferente da "Assinatura secreta" do painel (confira se é a do ambiente **Teste**) |
| Webhook responde 400 | Chamada sem `x-signature`/`x-request-id` (não veio do Mercado Pago) |
| Pagamento aprovado no Mercado Pago, mas o pedido segue Pendente | O aviso não chegou (túnel fora do ar, URL errada). Rode `reconcile-pending-payments` |
| `502 EXTERNAL_SERVICE_ERROR` ao pagar | Access Token inválido, valor inválido ou o Mercado Pago fora do ar. O motivo detalhado não vai ao cliente; veja o log da API (`[mercadopago] chamada falhou (HTTP …)`) |
| Cartão sempre recusado | Titular diferente de `APRO` nos cartões de teste, ou cartão de produção com credencial de teste |
| `409 PAYMENT_IN_PROGRESS` | Já existe cobrança pendente no pedido; aguarde, pague ou cancele o pedido |
| Botão "Já paguei" não aprova | É esperado com `PAYMENT_DRIVER=mercadopago`: ele só consulta o pedido |

## 10. Limites conhecidos e decisões em aberto

- **CPF do pagador.** No Brasil o Mercado Pago costuma pedir o documento do pagador no cartão. O formulário do Unishop não tem esse campo e o backend manda só o e-mail. Se o Mercado Pago recusar a cobrança por falta de documento, é preciso acrescentar o CPF ao formulário (decisão do grupo, mexe em tela, em `payments.routes.ts` e no provider). Só a prova de conceito confirma.
- **Tokenização.** O frontend usa `createCardToken` do SDK (os dados do cartão passam pelo JavaScript da página, mas nunca pelo servidor do Unishop). A alternativa mais segura são os *Secure Fields* do Mercado Pago, que trocam os campos do cartão por campos hospedados por eles; exigem refazer o `CardPaymentForm`.
- **Parcelas.** Sempre 1x.
- **Repasse.** Simulado (RN-PAG-10): não há split nem conta do vendedor no Mercado Pago.
- **Estorno.** A API pede estorno **total** e, se falhar, o pagamento fica `estorno_pendente` e o job refaz até 10 vezes (`ultimo_erro` guarda o motivo).
- **E-mail.** Venda confirmada e estorno saem pelo `MailProvider`. Hoje só existe o provider de console (imprime no terminal). Resend e Mailtrap entram na Etapa 10, depois do domínio próprio.
- **Banco de produção.** A migração `3_motivo_cancelamento` ainda não foi aplicada no `unishop-prod`. Os pedidos cancelados por vencimento ou falta de estoque dependem dela: rode `npx prisma migrate deploy` com a `DATABASE_URL_UNPOOLED` do prod **depois** de a Ana Clara confirmar os três motivos.
- **`openapi.yaml`** ainda não existe; as rotas novas estão em `docs/backend/backend.md` §9.5 e §9.6.

## 11. Checklist final

- [ ] Conta e aplicação criadas no Mercado Pago, com credenciais de teste.
- [ ] `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET` no `backend/.env`; `PAYMENT_DRIVER=mercadopago`.
- [ ] `VITE_MP_PUBLIC_KEY` no `frontend/.env`; `VITE_USE_MOCKS=false`.
- [ ] `CRON_SECRET` definido.
- [ ] Túnel no ar, `API_PUBLIC_URL` preenchida, webhook cadastrado no painel.
- [ ] Cartão aprovado, cartão recusado e Pix testados; resultado do Pix registrado no passo 6.
- [ ] Migração `3_motivo_cancelamento` aplicada no prod (quando for publicar).
- [ ] Variáveis de produção e jobs configurados (quando for publicar).
- [ ] `/security-review` antes de abrir o PR (mudança de pagamento, webhook e segredo).
