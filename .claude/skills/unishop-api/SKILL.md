---
name: unishop-api
description: APIs externas e segurança do Unishop (Google Identity, Mercado Pago, Resend/Mailtrap, Cloudinary, WhatsApp wa.me, Turnstile, Supabase (só o banco), Sentry, UptimeRobot, GitHub Actions), modelo "backend-cofre", providers, webhook assinado, segredos e variáveis de ambiente. Use SEMPRE que o usuário integrar, trocar, testar ou revisar qualquer serviço externo, mexer em `shared/providers`, `config/env.ts`, `.env`, chaves, tokens, webhook, assinatura HMAC, idempotência, estorno, timeout/retry, drivers mock, travas de produção, custos e limites gratuitos ou ADRs, mesmo que não diga "API externa" ou "Unishop".
metadata:
  author: unishop-team
  version: "0.3.0"
---

# APIs externas e segurança do Unishop

Resumo operacional. Fonte completa e autoritativa: [`docs/api/api.md`](../../../docs/api/api.md) (v0.3, de 16/10/2026, alinhada às Regras v0.4, Banco v0.2, Backend v0.3 e Deploy v0.3). Em dúvida, releia a seção citada; este arquivo não a substitui. O **contrato da API própria** (`/api/v1`) é outro assunto: rotas e regras estão no `unishop-backend`, e o `openapi.yaml` ainda não existe.

Prioridade entre fontes (CLAUDE.md): PDF do trabalho > decisões do grupo > `docs/` > Figma. Se algo não está documentado, diga que não está definido; não invente campo, rota nem regra. Os limites gratuitos do `api.md` foram conferidos em 16/10/2026 e mudam: confirme na página do provedor antes de depender deles.

## O modelo: backend-cofre (seção 5)

- **Segredo só no backend**, em variáveis de ambiente validadas ao iniciar (`config/env.ts`, Zod) e embrulhadas em `Secret` (nunca imprime). Só os providers chamam `reveal()`.
- O navegador recebe **só chaves públicas** (`VITE_*`: Google Client ID, Public Key do Mercado Pago, site key do Turnstile). Nada com "SECRET"/"TOKEN" privado começa com `VITE_`; um teste varre o `dist/`.
- Classes de credencial: pública, privada, assinatura (webhook secret), infraestrutura. O inventário (seção 5.3) é a fonte de verdade: **toda API nova entra nele**.
- Camadas: classificar → cofre → fronteira (só `shared/providers/`, URLs de provedores são constantes, nunca montadas com dado do usuário) → entrada (webhook) → saída (timeout/retry) → dados e logs (pino com redação) → detecção e rotação (`gitleaks`, runbook).
- Vazou uma chave? Revogue **primeiro**, atualize o segredo e reinicie, procure uso indevido, registre o incidente (runbook, seção 5.5). Apagar o commit não basta.

## Providers (seção 6)

Cada serviço fica atrás de uma interface em `shared/providers/<serviço>/`, com versão falsa para teste. O resto do código só conhece a interface.

| Interface | Implementação de produção | Falsa (dev/teste) | Variáveis |
|---|---|---|---|
| `OAuthProvider` | `google.provider` (`google-auth-library`), **MVP** | mock | `GOOGLE_CLIENT_ID` |
| `PaymentGateway` | `mercadopago.provider` | `mock.provider` | `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `PAYMENT_MODE`, `PAYMENT_DRIVER` |
| `MailProvider` | `resend.provider` | `mailtrap`, `console` | `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_DRIVER` |
| `StorageProvider` | `cloudinary.provider` | `local.provider` | `CLOUDINARY_URL`, `CLOUDINARY_UPLOAD_FOLDER`, `STORAGE_DRIVER` |
| `AntiBotProvider` | `turnstile.provider` (depois do MVP) | `noop.provider` | `TURNSTILE_SECRET_KEY`, `ANTIBOT_DRIVER` |

Provider novo exige: interface, implementação, versão `mock`, variáveis em `env.ts` e `.env.example` e uma linha no inventário. Chamada externa passa por `http-client.ts` (timeout, retry só em chamada idempotente, circuit breaker). Erro de provedor nunca vai cru ao cliente: vira `EXTERNAL_SERVICE_ERROR` (502/503).

## Travas de produção (seção 6.3 e 6.4)

As travas usam `APP_ENV` (`development`, `test`, `preview`, `production`), **não** `NODE_ENV`: na Vercel o `NODE_ENV` é `production` também no Preview.

- Credencial **real** de pagamento (`PAYMENT_MODE=production`) só com `APP_ENV=production`; senão o servidor não sobe.
- Produção com credencial de **teste** (`PAYMENT_MODE=sandbox`) **é permitida**: a RN-PAG-10 manda cobrar em conta única de teste, com repasse simulado.
- `mock`, `console` e `local` são proibidos em produção. O `noop` do anti-bot fica liberado até o Turnstile entrar.
- `EMAIL_VERIFICATION_REQUIRED` (`true`/`false`, padrão `false`) liga a confirmação de e-mail por link (RN-ACE-07, fora do MVP).
- `FRONTEND_URL` é uma lista de origens `https` separadas por vírgula, sem `*` e sem barra no fim em `preview` e `production`.

## Mercado Pago (gateway decidido, seção 4.3)

- Decidido: Mercado Pago (ADR-002). Em aberto: Payments API ou Orders API; confirme os nomes de campo na documentação vigente antes de implementar.
- Cartão vira token no navegador (SDK); o backend só recebe o token. Dado de cartão nunca passa pelo servidor (RN-PAG-02, RNF006).
- Cobrança e estorno levam `X-Idempotency-Key` determinística (`pedido:42:pix:1`). Repetir a chamada não duplica.
- Status: `approved` → liquidação (desconta estoque, pedido `Pago`); `pending`/`in_process` → nada; `rejected` → `PAYMENT_DECLINED` (402), pedido segue `Pendente`; `cancelled`/Pix vencido → `Expirado`; `refunded` → `Estornado`. Pagamento `approved` que não pode ser honrado (sem estoque, anúncio inativo ou pedido já cancelado) vai para `estorno_pendente`, e o job de estorno chama o gateway (RN-PAG-08, 13, 14). Cada nova tentativa é outra linha em `pagamento`, e a chave de idempotência inclui o número da tentativa. Nunca repasse `status_detail` cru.
- Estorno de Pix pode ficar "em processo": o job `reconcile-pending-payments` refaz (até 10 tentativas, erro em `ultimo_erro`). Na Vercel o estorno usa `await` antes de responder.

## Webhook (seção 5.6)

Ordem fixa em `POST /payments/webhook`, sem JWT: limite próprio folgado (300/min/IP) → `x-signature` e `x-request-id` presentes (senão 400) → HMAC SHA-256 do manifesto `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` com `MP_WEBHOOK_SECRET`, comparado em **tempo constante** (senão 401 e log) → `ts` dentro de 5 min (senão 401, possível replay) → **consulta o pagamento** no gateway, sem confiar no corpo → evento já processado? 200 → liquidação (`settlePayment`, transação, idempotente) → 200. Resposta de erro sem detalhe; o motivo vai só para o log, sem corpo.

## Saída: timeouts (seção 5.7)

Google 5 s · Mercado Pago cobrar 15 s (retry só com a mesma chave de idempotência, até 2) · consultar 10 s (2 retries) · estornar 15 s (pelo job) · Resend 10 s (3 retries, dentro de `waitUntil`) · Cloudinary 20 s por imagem (1 tentativa; se falhar, o anúncio não é criado) · Turnstile 5 s · banco 5 s. Retry sempre com espera crescente e variação.

## Decisões vigentes e armadilhas

- **ADRs** (numeração única): 001 ORM (Prisma) · 002 gateway (Mercado Pago) · 003 login só Google · 004 imagens (Cloudinary) · 005 hospedagem (Vercel + Supabase) · 006 anti-bot · 007 observabilidade · 008 backend-cofre · 009 e-mail (Resend).
- **Imagens passam pela API**, uma por requisição, até **4 MB** (Vercel aceita 4,5 MB por requisição), de 1 a 5 por anúncio. Sem upload assinado direto do navegador. O RNF005 fala em 5 MB: desvio **confirmado pelo grupo em 16/10/2026** (Regras §10).
- **E-mail e domínio:** o Resend só envia a destinatários reais com domínio verificado por DNS (SPF/DKIM); um endereço `vercel.app` não permite. Limite gratuito: 100 e-mails/dia, e e-mail de segurança tem prioridade.
- **Previews da Vercel não recebem webhook** (a URL é única por aplicação). Teste de pagamento: local com túnel (ngrok/Cloudflare Tunnel) ou produção.
- **Tarefas depois da resposta** (`waitUntil`/`await`): ver `unishop-deploy`.
- **Login com Google é MVP** (ADR-003). O servidor confere o domínio e o `email_verified`; o e-mail `@edu.unifor.br` pode não vir verificado pelo Google (pendência 3), então teste com uma conta real. Google em `vercel.app` pode ser recusado como origem autorizada; teste cedo. Apple fica fora do MVP.
- **Banco:** Supabase gratuito, só como banco (500 MB, 2 projetos, pausa em 1 semana, sem backup nem branching; versão do PostgreSQL a conferir) com três papéis: `DATABASE_URL` (Transaction pooler, porta 6543, `unishop_app`), `DATABASE_URL_UNPOOLED` (Session pooler ou direta, porta 5432, `unishop_migrator`, só migração e seed) e `DATABASE_URL_BACKUP` (`unishop_backup`, somente leitura, só como segredo do GitHub). Todas são credenciais privadas. Não há chave `anon` nem `service_role` no projeto: não use o SDK do Supabase.
- **Saúde:** `GET /health` leve (monitor UptimeRobot) e `GET /health/db` (confere o banco).
- Login do admin e do aluno usam o mesmo endpoint; o perfil vem na resposta.

## Pendências abertas que afetam o código

(numeração da seção 12 do `api.md` v0.3) Payments API × Orders API (1) · domínio próprio para o Resend (2) · `email_verified` do Google com e-mail institucional (3) · termos do UptimeRobot gratuito (4) · `openapi.yaml` (5) · criar e testar os três papéis do banco no Supabase (6) · versão do PostgreSQL do Supabase (7). Turnstile e Sentry estão decididos como depois do MVP. Se a tarefa depende de uma delas, avise em vez de decidir sozinho.

## Skills que complementam esta

- Regras do servidor, rotas e estados → `unishop-backend`; regras de negócio e escopo do MVP → `unishop-rules`; tabelas e papéis do banco → `unishop-database`.
- Hospedagem, variáveis por ambiente, CORS, jobs e backup → `unishop-deploy`.
- Detalhes e armadilhas da API do Resend (idempotência, webhooks, domínios) → `resend`; entregabilidade e SPF/DKIM/DMARC → `email-best-practices`. Siga a interface `MailProvider` do projeto; ignore o que for de caixa de entrada para agentes, marketing ou contatos, que o Unishop não usa.
- Banco Supabase, projetos por ambiente e conexões → `unishop-deploy` e `unishop-database`.
- Antes do PR, em mudança de pagamento ou segredo → `/security-review`.
