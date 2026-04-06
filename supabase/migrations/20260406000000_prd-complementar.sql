
-- PRD Complementar V1.1 — Gestão de Empresas + Importação de Planilhas

-- =====================================================================
-- 1. Novos campos na tabela empresas
-- =====================================================================
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS moeda_padrao text DEFAULT 'BRL';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS data_inicio_operacional date;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS segmento text;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS observacoes_internas text;

-- =====================================================================
-- 2. Tabela de controle de importações de planilhas
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.importacoes_planilhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('contas_pagar', 'contas_receber', 'aportes')),
  nome_arquivo text,
  total_linhas int DEFAULT 0,
  linhas_validas int DEFAULT 0,
  linhas_com_erro int DEFAULT 0,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluido', 'revertido', 'erro')),
  criado_por uuid REFERENCES auth.users(id),
  criado_em timestamptz DEFAULT now(),
  revertido_por uuid REFERENCES auth.users(id),
  revertido_em timestamptz,
  observacoes text
);

-- =====================================================================
-- 3. Coluna de rastreamento de importação nas tabelas financeiras
--    Permite rollback: cancelar todos os registros de uma importação
-- =====================================================================
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS importacao_id uuid REFERENCES public.importacoes_planilhas(id) ON DELETE SET NULL;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS importacao_id uuid REFERENCES public.importacoes_planilhas(id) ON DELETE SET NULL;
ALTER TABLE public.movimentacoes_societarias ADD COLUMN IF NOT EXISTS importacao_id uuid REFERENCES public.importacoes_planilhas(id) ON DELETE SET NULL;

-- =====================================================================
-- 4. RLS para importacoes_planilhas
-- =====================================================================
ALTER TABLE public.importacoes_planilhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_importacoes" ON public.importacoes_planilhas
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM public.empresa_users
      WHERE user_id = auth.uid() AND ativo = true
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'socio_admin'
    )
  );

CREATE POLICY "insert_importacoes" ON public.importacoes_planilhas
  FOR INSERT WITH CHECK (public.user_can_write(empresa_id));

CREATE POLICY "update_importacoes" ON public.importacoes_planilhas
  FOR UPDATE USING (public.user_can_write(empresa_id));

-- =====================================================================
-- 5. Índices de performance
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_importacoes_empresa_id ON public.importacoes_planilhas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_importacao_id ON public.contas_pagar(importacao_id) WHERE importacao_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contas_receber_importacao_id ON public.contas_receber(importacao_id) WHERE importacao_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movimentacoes_importacao_id ON public.movimentacoes_societarias(importacao_id) WHERE importacao_id IS NOT NULL;
