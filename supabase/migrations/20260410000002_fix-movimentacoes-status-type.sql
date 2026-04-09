-- Garante que movimentacoes_societarias.status usa status_aprovacao (não status_receber)
-- Isso resolve "invalid input value for enum status_receber: 'reprovado'"
-- ao tentar salvar aportes com status reprovado.

DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type || COALESCE('.' || udt_name, '')
  INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'movimentacoes_societarias'
    AND column_name = 'status';

  -- Só altera se não estiver usando status_aprovacao
  IF col_type IS DISTINCT FROM 'USER-DEFINED.status_aprovacao' THEN
    -- Primeiro, garante que o enum status_aprovacao existe
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_aprovacao') THEN
      CREATE TYPE public.status_aprovacao AS ENUM ('rascunho', 'pendente', 'aprovado', 'reprovado');
    END IF;

    ALTER TABLE public.movimentacoes_societarias
      ALTER COLUMN status TYPE public.status_aprovacao
      USING CASE
        WHEN status::text IN ('rascunho','pendente','aprovado','reprovado')
          THEN status::text::public.status_aprovacao
        ELSE 'rascunho'::public.status_aprovacao
      END;
  END IF;
END$$;

-- Garante que distribuicoes_lucro.status também usa status_aprovacao
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type || COALESCE('.' || udt_name, '')
  INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'distribuicoes_lucro'
    AND column_name = 'status';

  IF col_type IS DISTINCT FROM 'USER-DEFINED.status_aprovacao' THEN
    ALTER TABLE public.distribuicoes_lucro
      ALTER COLUMN status TYPE public.status_aprovacao
      USING CASE
        WHEN status::text IN ('rascunho','pendente','aprovado','reprovado')
          THEN status::text::public.status_aprovacao
        ELSE 'rascunho'::public.status_aprovacao
      END;
  END IF;
END$$;
