-- ============================================================
-- Unishop: motivo do cancelamento feito pelo sistema
-- Migração manual 3 (depois de 0_init, 1_regras_manuais e 2_rls_politicas)
-- Origem: pendência P9 do roteiro-backend.md; bd.md §4.5 e §6
-- ============================================================
-- A tela mostra por que o pedido foi cancelado pelo sistema, e o pagamento não
-- distingue "acabou o estoque" de "o anúncio saiu do ar" (os dois viram
-- estorno_pendente). Os jobs e a liquidação gravam o motivo ao cancelar.
--
-- Coluna aditiva e anulável: pedido existente fica com NULL, sem preenchimento.
-- Não é tabela nova, então não precisa de RLS nem de política (as da pedido valem).
-- Valores propostos (RN-PAG-08, 12 e 14); a Ana Clara confirma os nomes.

ALTER TABLE public.pedido
  ADD COLUMN motivo_cancelamento varchar(30);

ALTER TABLE public.pedido
  ADD CONSTRAINT ck_pedido_motivo CHECK (
    motivo_cancelamento IS NULL
    OR motivo_cancelamento IN ('vencido', 'sem_estoque', 'anuncio_indisponivel')
  );
