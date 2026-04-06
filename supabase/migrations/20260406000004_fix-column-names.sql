-- Ajusta nomes de colunas para coincidir com o que o frontend usa
-- =========================================================

-- 1. observacoes (plural) — frontend usa essa forma em todo lugar
--    A coluna original observacao (singular) permanece por compatibilidade
ALTER TABLE public.contas_pagar            ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.contas_receber          ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.movimentacoes_societarias ADD COLUMN IF NOT EXISTS observacoes text;

-- 2. centro_custo_id estava ausente em contas_receber
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.centros_custo(id);

-- 3. importacao_id em movimentacoes_societarias (caso migration anterior não tenha rodado)
ALTER TABLE public.movimentacoes_societarias
  ADD COLUMN IF NOT EXISTS importacao_id uuid REFERENCES public.importacoes_planilhas(id) ON DELETE SET NULL;
