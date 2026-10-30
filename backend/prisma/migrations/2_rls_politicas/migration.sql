-- ============================================================
-- Unishop: RLS ligada com política por papel
-- Migração manual 2 (depois de 0_init e 1_regras_manuais)
-- Decisão: Francisco, 30/10/2026
-- ============================================================
-- O schema public é exposto pela Data API do Supabase. A RLS fica ligada nas 8
-- tabelas; só unishop_app (leitura e escrita) e unishop_backup (leitura) têm
-- política. anon e authenticated não têm política nem privilégio.
-- Dono da tabela (unishop_migrator, postgres) ignora a RLS: não use FORCE.
--
-- Toda tabela nova precisa do ENABLE ROW LEVEL SECURITY e das duas políticas
-- na própria migração que a cria (acrescente o nome na lista abaixo).
--
-- As políticas só são criadas para papéis que existem. Em banco local (Docker)
-- os papéis unishop_* não existem e a migração roda sem eles. No Supabase, crie
-- os papéis ANTES de rodar este arquivo; se criar depois, rode o bloco de novo
-- (é idempotente).

BEGIN;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['usuario', 'categoria', 'anuncio', 'imagem_anuncio',
                           'pedido', 'pagamento', 'log_admin', 'token_usuario']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'unishop_app') THEN
      EXECUTE format('DROP POLICY IF EXISTS app_all ON public.%I', t);
      EXECUTE format('CREATE POLICY app_all ON public.%I
                      FOR ALL TO unishop_app USING (true) WITH CHECK (true)', t);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'unishop_backup') THEN
      EXECUTE format('DROP POLICY IF EXISTS backup_select ON public.%I', t);
      EXECUTE format('CREATE POLICY backup_select ON public.%I
                      FOR SELECT TO unishop_backup USING (true)', t);
    END IF;
  END LOOP;
END $$;

COMMIT;
