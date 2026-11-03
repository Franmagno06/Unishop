-- ============================================================
-- Unishop: avaliação do item de um pedido concluído
-- Migração manual 4 (depois de 0_init, 1_regras_manuais, 2_rls_politicas e 3_motivo_cancelamento)
-- Origem: RN-AVA-01 a 05 (Regras v0.4.4); bd.md §4.9
-- ============================================================
-- Uma avaliação por pedido concluído (id_pedido único), feita só pelo comprador. O nome do autor
-- vem do join com usuario (a conta anonimizada aparece como "Usuário removido"), sem coluna própria.
-- Sem ON DELETE: nada apaga em cascata (a avaliação sobrevive à anonimização da conta).
--
-- Tabela nova: ENABLE ROW LEVEL SECURITY e as duas políticas na própria migração, como manda a
-- 2_rls_politicas (só para papéis que existem; em banco local sem papéis unishop_* roda sem eles).

BEGIN;

CREATE TABLE public.avaliacao (
  id_avaliacao  integer GENERATED ALWAYS AS IDENTITY,
  id_pedido     integer       NOT NULL,
  id_anuncio    integer       NOT NULL,
  id_avaliador  integer       NOT NULL,
  nota          numeric(2,1)  NOT NULL,
  comentario    varchar(500)  NOT NULL DEFAULT '',
  data_criacao  timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT avaliacao_pkey PRIMARY KEY (id_avaliacao),
  CONSTRAINT uq_avaliacao_pedido UNIQUE (id_pedido),
  CONSTRAINT fk_avaliacao_pedido FOREIGN KEY (id_pedido) REFERENCES public.pedido (id_pedido),
  CONSTRAINT fk_avaliacao_anuncio FOREIGN KEY (id_anuncio) REFERENCES public.anuncio (id_anuncio),
  CONSTRAINT fk_avaliacao_avaliador FOREIGN KEY (id_avaliador) REFERENCES public.usuario (id_usuario),
  -- RN-AVA-03: de 0 a 5, em passos de 0,5.
  CONSTRAINT ck_avaliacao_nota CHECK (nota >= 0 AND nota <= 5 AND (nota * 2) = trunc(nota * 2))
);

CREATE INDEX ix_avaliacao_anuncio ON public.avaliacao (id_anuncio, data_criacao DESC);

ALTER TABLE public.avaliacao ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'unishop_app') THEN
    DROP POLICY IF EXISTS app_all ON public.avaliacao;
    CREATE POLICY app_all ON public.avaliacao
      FOR ALL TO unishop_app USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'unishop_backup') THEN
    DROP POLICY IF EXISTS backup_select ON public.avaliacao;
    CREATE POLICY backup_select ON public.avaliacao
      FOR SELECT TO unishop_backup USING (true);
  END IF;
END $$;

COMMIT;
