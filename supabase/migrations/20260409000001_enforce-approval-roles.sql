-- =============================================================================
-- Enforce approval role checks at the database level
--
-- Problem: The UPDATE RLS policies use user_can_write() which includes
-- financeiro_operador. This means operadores can set status='aprovado'
-- bypassing the intended approval workflow.
--
-- Solution: A trigger that checks user_can_approve() when status changes
-- to 'aprovado' or 'reprovado' on any table with approval workflows.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_approval_permission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only check when status is being changed TO an approval-related value
  IF (NEW.status IS DISTINCT FROM OLD.status) AND
     (NEW.status IN ('aprovado', 'reprovado')) THEN
    IF NOT public.user_can_approve(auth.uid()) THEN
      RAISE EXCEPTION 'Permission denied: only socio_admin and financeiro_aprovador can approve or reject records';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Apply to contas_pagar
CREATE TRIGGER trg_enforce_approval_contas_pagar
  BEFORE UPDATE ON public.contas_pagar
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_approval_permission();

-- Apply to contas_receber
CREATE TRIGGER trg_enforce_approval_contas_receber
  BEFORE UPDATE ON public.contas_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_approval_permission();

-- Apply to movimentacoes_societarias
CREATE TRIGGER trg_enforce_approval_movimentacoes
  BEFORE UPDATE ON public.movimentacoes_societarias
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_approval_permission();

-- Apply to distribuicoes_lucro
CREATE TRIGGER trg_enforce_approval_distribuicoes
  BEFORE UPDATE ON public.distribuicoes_lucro
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_approval_permission();
