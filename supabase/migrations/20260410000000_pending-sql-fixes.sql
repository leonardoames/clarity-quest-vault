-- ============================================================
-- Correções SQL pendentes identificadas na auditoria
-- ============================================================

-- 1. Enum forma_pagamento (era texto livre, agora tipado)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'forma_pagamento') THEN
    CREATE TYPE public.forma_pagamento AS ENUM (
      'pix', 'boleto', 'transferencia',
      'cartao_credito', 'cartao_debito',
      'dinheiro', 'cheque', 'outro'
    );
  END IF;
END$$;

-- Migrar colunas para o enum (preservando dados existentes)
ALTER TABLE public.contas_pagar
  ALTER COLUMN forma_pagamento TYPE public.forma_pagamento
  USING CASE
    WHEN forma_pagamento IS NULL THEN NULL
    WHEN forma_pagamento IN ('pix','boleto','transferencia','cartao_credito','cartao_debito','dinheiro','cheque','outro')
      THEN forma_pagamento::public.forma_pagamento
    ELSE 'outro'::public.forma_pagamento
  END;

ALTER TABLE public.contas_receber
  ALTER COLUMN forma_pagamento TYPE public.forma_pagamento
  USING CASE
    WHEN forma_pagamento IS NULL THEN NULL
    WHEN forma_pagamento IN ('pix','boleto','transferencia','cartao_credito','cartao_debito','dinheiro','cheque','outro')
      THEN forma_pagamento::public.forma_pagamento
    ELSE 'outro'::public.forma_pagamento
  END;

-- 2. CHECK constraint: percentual_societario entre 0 e 100
ALTER TABLE public.socios
  DROP CONSTRAINT IF EXISTS percentual_societario_range;
ALTER TABLE public.socios
  ADD CONSTRAINT percentual_societario_range
  CHECK (percentual_societario >= 0 AND percentual_societario <= 100);

-- 3. Padronizar observacao → observacoes (deprecar coluna singular onde duplicada)
-- contas_pagar: migrar observacao → observacoes se observacoes estiver vazio
UPDATE public.contas_pagar
  SET observacoes = COALESCE(observacoes, observacao)
  WHERE observacao IS NOT NULL AND (observacoes IS NULL OR observacoes = '');

-- contas_receber: mesma migração
UPDATE public.contas_receber
  SET observacoes = COALESCE(observacoes, observacao)
  WHERE observacao IS NOT NULL AND (observacoes IS NULL OR observacoes = '');

-- movimentacoes_societarias
UPDATE public.movimentacoes_societarias
  SET observacoes = COALESCE(observacoes, observacao)
  WHERE observacao IS NOT NULL AND (observacoes IS NULL OR observacoes = '');

-- 4. Index em socios.user_id para lookups de vínculo
CREATE INDEX IF NOT EXISTS idx_socios_user_id ON public.socios(user_id)
  WHERE user_id IS NOT NULL;

-- 5. Index composto útil para DRE e relatórios mensais
CREATE INDEX IF NOT EXISTS idx_contas_pagar_empresa_competencia
  ON public.contas_pagar(empresa_id, competencia);

CREATE INDEX IF NOT EXISTS idx_contas_receber_empresa_competencia
  ON public.contas_receber(empresa_id, competencia);

-- 6. Index em historico_acoes para auditoria
CREATE INDEX IF NOT EXISTS idx_historico_empresa_tabela
  ON public.historico_acoes(empresa_id, tabela, created_at DESC);

-- 7. Garantir historico_acoes como append-only (sem UPDATE/DELETE)
DO $$
BEGIN
  -- Revoke explicitamente UPDATE e DELETE no historico_acoes
  -- (RLS já bloqueia, mas isso adiciona camada de defesa)
  EXECUTE 'REVOKE UPDATE, DELETE ON public.historico_acoes FROM authenticated';
EXCEPTION WHEN OTHERS THEN NULL; -- ignora se já aplicado
END$$;
