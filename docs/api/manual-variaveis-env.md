# Manual das variáveis de ambiente (`.env`) do Unishop

Para quem vai rodar o projeto no próprio computador. Cada pessoa tem o seu `.env`, que **nunca vai para o Git** (já está no `.gitignore`). Os modelos são os arquivos `.env.example`.

Tempo estimado: 20 a 30 minutos, a maior parte no painel do Mercado Pago.

## 0. Regras de ouro

1. **Nunca** coloque token, chave ou senha em commit, print, grupo de WhatsApp ou chat. Cada um gera os seus.
2. Só use credenciais **de teste** (as que começam com `TEST-`). O Unishop é uma demonstração; nenhum dinheiro real é cobrado.
3. Depois de mudar qualquer `.env`, **reinicie** o backend (e o front, se mudou o `frontend/.env`). Eles só leem o arquivo ao subir.
4. Cuidado com o banco: confira que o `DATABASE_URL` aponta para o **seu banco de desenvolvimento**, nunca para o `unishop-prod`.

## 1. Criar os dois arquivos

Na raiz do projeto:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

No Windows (PowerShell): `Copy-Item backend\.env.example backend\.env` e `Copy-Item frontend\.env.example frontend\.env`.

## 2. `backend/.env`: o que preencher

### 2.1 Já vêm prontas (não mexa)
`NODE_ENV`, `PORT`, `APP_ENV=development`, `JWT_EXPIRES_IN`, `ALLOWED_EMAIL_DOMAIN`, `SERVICE_FEE_PERCENT`, `PIX_EXPIRATION_MINUTES`, `EMAIL_VERIFICATION_REQUIRED`, `LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCK_MINUTES`, `PAYMENT_MODE=sandbox`, `MAIL_DRIVER=console`, `STORAGE_DRIVER=local`, `ANTIBOT_DRIVER=noop`.

### 2.2 Você precisa preencher

| Variável | O que colocar | Como conseguir |
|---|---|---|
| `DATABASE_URL` | Endereço do banco | **Docker local** (recomendado): deixe o valor do exemplo (`postgresql://dev:dev@localhost:5432/unishop_dev`) e suba o banco com `docker compose up -d`. Banco remoto de desenvolvimento: peça a URL a quem administra o `Unishop-dev`. |
| `FRONTEND_URL` | Onde o front roda | Deixe `http://localhost:5173`. |
| `JWT_SECRET` | Texto longo e aleatório (mínimo 32 caracteres) | Gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` e cole. Cada pessoa gera o seu. |
| `CRON_SECRET` | Outro texto longo e aleatório | Mesmo comando acima. É a senha dos jobs agendados. |
| `ADMIN_EMAIL` e `ADMIN_PASSWORD` | Login do admin criado pelo seed | Invente um e-mail e uma senha só para o seu ambiente. Só o `npm run db:seed` lê esses dois. |

### 2.3 Pagamento (Mercado Pago)

Primeiro decida o modo:

- **Modo simples (`PAYMENT_DRIVER=mock`)**: o pagamento é simulado no seu computador. Não precisa de conta no Mercado Pago, nem de `MP_ACCESS_TOKEN`, nem de webhook. Serve para desenvolver as telas. É o padrão do arquivo de exemplo.
- **Modo real de teste (`PAYMENT_DRIVER=mercadopago`)**: cobra pelo Mercado Pago em modo teste. Siga os passos abaixo.

Passos do modo real de teste:

1. Crie (ou use) uma conta no Mercado Pago e abra **Suas integrações**: `https://www.mercadopago.com.br/developers/panel/app`. Crie uma aplicação se não tiver (tipo "Checkout Transparente", pagamentos online).
2. No menu lateral da aplicação, abra **Credenciais de teste**.
   - Copie o **Access Token** (`TEST-...`) para `MP_ACCESS_TOKEN` no `backend/.env`. Para ver o valor, clique no ícone de olho; o Mercado Pago pode pedir um código por SMS.
   - Copie a **Public Key** (`TEST-...`) para `VITE_MP_PUBLIC_KEY` no `frontend/.env` (seção 3).
3. Mude `PAYMENT_DRIVER=mercadopago`.
4. Preencha `MP_WEBHOOK_SECRET`. **Obrigatório** com `PAYMENT_DRIVER=mercadopago`: sem ele o backend não sobe.
   - Para só testar cartão, qualquer texto aleatório de 40 ou mais caracteres serve.
   - O valor de verdade vem do passo 5 (webhook). Só é necessário se quiser testar o webhook ou o Pix aprovado.

| Variável | Valor |
|---|---|
| `PAYMENT_DRIVER` | `mercadopago` |
| `PAYMENT_MODE` | `sandbox` (não mude) |
| `MP_ACCESS_TOKEN` | Access Token de teste (`TEST-...`) |
| `MP_WEBHOOK_SECRET` | Assinatura secreta do webhook (passo 5) ou texto aleatório provisório |

### 2.4 Webhook (passo 5): só se for testar o webhook ou o Pix

O Mercado Pago precisa chamar a sua API de fora do seu computador, então é preciso um túnel público. **Cartão funciona sem isso.**

1. Instale o `cloudflared` (`winget install Cloudflare.cloudflared`) e, com o backend rodando, execute:

   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

   Ele mostra uma URL `https://algo.trycloudflare.com`. Copie, **sem barra no final**. Ela muda toda vez que o túnel reinicia.
2. No `backend/.env`, ponha essa URL em `API_PUBLIC_URL` e reinicie o backend.
3. No painel do Mercado Pago, abra **Webhooks → Configurar notificações → Modo de teste**:
   - **URL para teste:** `https://algo.trycloudflare.com/api/v1/payments/webhook`
   - **Eventos:** marque **Pagamentos**.
   - Clique em **Salvar configurações** e confirme. O painel gera a **Assinatura secreta**.
4. Clique no ícone de olho da Assinatura secreta, copie e cole em `MP_WEBHOOK_SECRET`. Reinicie o backend.
5. Para conferir: **Simular notificação** no painel, evento **Pagamentos**. A resposta deve ser **200 - OK**.

### 2.5 Variáveis que podem ficar vazias por enquanto
`GOOGLE_CLIENT_ID` (login com Google), `RESEND_API_KEY`, `MAIL_FROM` e `CLOUDINARY_URL` (e-mail e imagens reais; em desenvolvimento o e-mail sai no console e as imagens ficam em disco), `DATABASE_URL_UNPOOLED` (só produção).

## 3. `frontend/.env`: o que preencher

| Variável | Valor |
|---|---|
| `VITE_API_URL` | `http://localhost:3000/api/v1` |
| `VITE_MP_PUBLIC_KEY` | Public Key de teste do Mercado Pago (`TEST-...`). Sem ela, o front usa um cartão simulado. |
| `VITE_USE_MOCKS` | `false` para usar a API de verdade. `true` mostra só dados de exemplo e não chama o backend. |
| `VITE_GOOGLE_CLIENT_ID` | Opcional. Só se for usar o login com Google. |
| `VITE_SUPPORT_WHATSAPP` | Opcional. Número com DDI (ex.: `5585900000000`). |
| `VITE_TURNSTILE_SITE_KEY` | Deixe vazio (fica para depois do MVP). |

## 4. Subir tudo e testar

```bash
# banco local
docker compose up -d

# backend (em um terminal)
cd backend
npm install
npx prisma migrate deploy
npm run db:seed     # cria as 6 categorias e o admin (usa ADMIN_EMAIL e ADMIN_PASSWORD)
npm run dev

# frontend (em outro terminal)
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`. Cadastre-se com um e-mail `@edu.unifor.br`. Com o backend no ar, `http://localhost:3000/api/v1/health/db` deve responder 200.

### Cartões de teste (use só estes; cartão real é recusado)

| Campo | Valor |
|---|---|
| Número | `5031 4332 1540 6351` (Mastercard) |
| Titular | `APRO` (aprova) |
| Validade | `11/30` |
| CVV | `123` |

Outros titulares simulam resultados: `OTHE` (recusado), `FUND` (sem saldo), `SECU` (CVV inválido), `EXPI` (validade), `CONT` (pendente).

Para comprar, entre com **outra conta** de aluno que não seja a dona do anúncio (o dono não compra o próprio item e admin não compra).

## 5. Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| Backend não sobe e cita `MP_WEBHOOK_SECRET` ou `MP_ACCESS_TOKEN` | Está com `PAYMENT_DRIVER=mercadopago` e falta a variável. Preencha ou volte para `mock`. |
| Mudei o `.env` e nada mudou | Reinicie o backend. O `npm run dev` não relê o `.env`. |
| Pagamento fica "Pendente" | Pix não é aprovado no ambiente de teste. Teste com cartão `APRO`. |
| Erro 403 "Payer email forbidden" ao pagar | O e-mail do pagador é igual ao da conta dona da aplicação do Mercado Pago. Use outro e-mail. |
| `Invalid users involved` | Misturou credencial de conta de teste de vendedor com e-mail de comprador de teste. Use o Access Token da própria aplicação (`Credenciais de teste`). |
| Webhook responde 401 | `MP_WEBHOOK_SECRET` diferente da Assinatura secreta do painel (confira que é a do **Modo de teste**). |
| Webhook responde 400 | A chamada não veio do Mercado Pago (faltam os cabeçalhos de assinatura). |
| Login do aluno falha | Confira se o `DATABASE_URL` é o mesmo banco onde você criou a conta (Docker local ou o remoto). |
| Cartão aprovado no Mercado Pago, mas o pedido segue pendente | O aviso do webhook não chegou. Verifique o túnel e a URL no painel. |

## 6. Resumo em uma tela

```
backend/.env
  DATABASE_URL          -> Docker local (padrão do exemplo)
  JWT_SECRET            -> gerar (32+ caracteres)
  CRON_SECRET           -> gerar
  ADMIN_EMAIL/PASSWORD  -> inventar (só para o seed)
  PAYMENT_DRIVER        -> mock (simples) ou mercadopago (teste real)
  MP_ACCESS_TOKEN       -> painel MP > Credenciais de teste
  MP_WEBHOOK_SECRET     -> painel MP > Webhooks > Assinatura secreta
  API_PUBLIC_URL        -> URL do túnel (só se usar o webhook)

frontend/.env
  VITE_API_URL          -> http://localhost:3000/api/v1
  VITE_MP_PUBLIC_KEY    -> painel MP > Credenciais de teste > Public Key
  VITE_USE_MOCKS        -> false
```

Dúvida sobre o fluxo completo do Mercado Pago: [`mercado-pago-passo-a-passo.md`](mercado-pago-passo-a-passo.md).
