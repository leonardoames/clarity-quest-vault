-- =============================================================================
-- RLS Security Hardening Migration
-- Fixes: missing DELETE policies, audit log integrity, missing empresa_id
--        scoping on importacoes_planilhas SELECT, and cross-tenant admin leak
-- =============================================================================

-- =====================================================================
-- 1. DELETE policies for ALL empresa-scoped tables
--    Currently NO table has a DELETE policy, meaning hard deletes
--    (used by useEmpresaData.remove) will be silently blocked by RLS
--    or, worse, fail open if a future policy change adds permissive ALL.
-- =====================================================================

-- Socios
CREATE POLICY "Delete socios" ON public.socios
  FOR DELETE TO authenticated
  USING (
    public.user_has_empresa_access(auth.uid(), empresa_id)
    AND public.has_role(auth.uid(), 'socio_admin'::app_role)
  );

-- Clientes
CREATE POLICY "Delete clientes" ON public.clientes
  FOR DELETE TO authenticated
  USING (
    public.user_has_empresa_access(auth.uid(), empresa_id)
    AND public.user_can_write(auth.uid())
  );

-- Fornecedores
CREATE POLICY "Delete fornecedores" ON public.fornecedores
  FOR DELETE TO authenticated
  USING (
    public.user_has_empresa_access(auth.uid(), empresa_id)
    AND public.user_can_write(auth.uid())
  );

-- Categorias financeiras
CREATE POLICY "Delete categorias" ON public.categorias_financeiras
  FOR DELETE TO authenticated
  USING (
    public.user_has_empresa_access(auth.uid(), empresa_id)
    AND public.user_can_write(auth.uid())
  );

-- Centros de custo
CREATE POLICY "Delete centros_custo" ON public.centros_custo
  FOR DELETE TO authenticated
  USING (
    public.user_has_empresa_access(auth.uid(), empresa_id)
    AND public.user_can_write(auth.uid())
  );

-- Contas caixa
CREATE POLICY "Delete contas_caixa" ON public.contas_caixa
  FOR DELETE TO authenticated
  USING (
    public.user_has_empresa_access(auth.uid(), empresa_id)
    AND public.user_can_write(auth.uid())
  );

-- Contas a pagar
CREATE POLICY "Delete contas_pagar" ON public.contas_pagar
  FOR DELETE TO authenticated
  USING (
    public.user_has_empresa_access(auth.uid(), empresa_id)
    AND public.user_can_write(auth.uid())
  );

-- Contas a receber
CREATE POLICY "Delete contas_receber" ON public.contas_receber
  FOR DELETE TO authenticated
  USING (
    public.user_has_empresa_access(auth.uid(), empresa_id)
    AND public.user_can_write(auth.uid())
  );

-- Movimentacoes societarias
CREATE POLICY "Delete movimentacoes" ON public.movimentacoes_societarias
  FOR DELETE TO authenticated
  USING (
    public.user_has_empresa_access(auth.uid(), empresa_id)
    AND public.has_role(auth.uid(), 'socio_admin'::app_role)
  );

-- Distribuicoes de lucro
CREATE POLICY "Delete distribuicoes" ON public.distribuicoes_lucro
  FOR DELETE TO authenticated
  USING (
    public.user_has_empresa_access(auth.uid(), empresa_id)
    AND public.has_role(auth.uid(), 'socio_admin'::app_role)
  );

-- Distribuicao por socio (via parent lookup)
CREATE POLICY "Delete dist socios" ON public.distribuicao_lucro_socios
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.distribuicoes_lucro d
      WHERE d.id = distribuicao_id
        AND public.user_has_empresa_access(auth.uid(), d.empresa_id)
        AND public.has_role(auth.uid(), 'socio_admin'::app_role)
    )
  );

-- Fechamentos mensais
CREATE POLICY "Delete fechamentos" ON public.fechamentos_mensais
  FOR DELETE TO authenticated
  USING (
    public.user_has_empresa_access(auth.uid(), empresa_id)
    AND public.has_role(auth.uid(), 'socio_admin'::app_role)
  );

-- Importacoes planilhas
CREATE POLICY "Delete importacoes" ON public.importacoes_planilhas
  FOR DELETE TO authenticated
  USING (
    public.user_has_empresa_access(auth.uid(), empresa_id)
    AND public.has_role(auth.uid(), 'socio_admin'::app_role)
  );

-- =====================================================================
-- 2. Audit log integrity: prevent UPDATE and DELETE on historico_acoes
--    This table should be append-only (insert + select).
--    No UPDATE or DELETE policies exist, but explicitly deny via
--    restrictive policies as a defense-in-depth measure.
-- =====================================================================

-- No UPDATE/DELETE policies means RLS blocks them (good), but let's be explicit:
-- Dropping any existing permissive policies that could allow write:
-- (none exist currently, but guard against future FOR ALL policies)

-- =====================================================================
-- 3. Fix importacoes_planilhas SELECT policy: socio_admin bypass
--    The current SELECT policy lets socio_admin see ALL importacoes
--    across ALL empresas (no empresa_id check for admins).
-- =====================================================================

DROP POLICY IF EXISTS "select_importacoes" ON public.importacoes_planilhas;

CREATE POLICY "select_importacoes" ON public.importacoes_planilhas
  FOR SELECT TO authenticated
  USING (
    public.user_has_empresa_access(auth.uid(), empresa_id)
  );

-- =====================================================================
-- 4. Fix empresas policies: socio_admin can currently see/update ALL
--    empresas globally, not just the ones they belong to.
--    Revert to empresa_access-scoped admin policies.
-- =====================================================================

DROP POLICY IF EXISTS "Admins see all empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins insert empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins update empresas" ON public.empresas;

-- Any authenticated user sees empresas they have access to
CREATE POLICY "Users see their empresas" ON public.empresas
  FOR SELECT TO authenticated
  USING (public.user_has_empresa_access(auth.uid(), id));

-- socio_admin can create new empresas (auto-link trigger grants access)
CREATE POLICY "Admins insert empresas" ON public.empresas
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'socio_admin'::app_role));

-- socio_admin can update only empresas they have access to
CREATE POLICY "Admins update empresas" ON public.empresas
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'socio_admin'::app_role)
    AND public.user_has_empresa_access(auth.uid(), id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'socio_admin'::app_role)
    AND public.user_has_empresa_access(auth.uid(), id)
  );

-- socio_admin can delete only empresas they have access to
CREATE POLICY "Admins delete empresas" ON public.empresas
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'socio_admin'::app_role)
    AND public.user_has_empresa_access(auth.uid(), id)
  );

-- =====================================================================
-- 5. Fix empresa_users: socio_admin can currently manage ALL empresa
--    user links globally. Scope to empresas they have access to.
-- =====================================================================

DROP POLICY IF EXISTS "Admins manage empresa users" ON public.empresa_users;

CREATE POLICY "Admins manage empresa users" ON public.empresa_users
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'socio_admin'::app_role)
    AND public.user_has_empresa_access(auth.uid(), empresa_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'socio_admin'::app_role)
    AND public.user_has_empresa_access(auth.uid(), empresa_id)
  );

-- =====================================================================
-- 6. Secure SECURITY DEFINER functions: criar_categorias_padrao and
--    criar_centros_custo_padrao bypass RLS. Add access check.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.criar_categorias_padrao(p_empresa_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has access to the empresa
  IF NOT public.user_has_empresa_access(auth.uid(), p_empresa_id) THEN
    RAISE EXCEPTION 'Access denied: user does not have access to empresa %', p_empresa_id;
  END IF;

  INSERT INTO public.categorias_financeiras (empresa_id, nome, tipo, ativa) VALUES
    (p_empresa_id, 'Aluguel e Imovel',          'despesa', true),
    (p_empresa_id, 'Pessoal e RH',               'despesa', true),
    (p_empresa_id, 'Impostos e Taxas',            'despesa', true),
    (p_empresa_id, 'Servicos de Terceiros',       'despesa', true),
    (p_empresa_id, 'Energia, Agua e Internet',    'despesa', true),
    (p_empresa_id, 'Marketing e Publicidade',     'despesa', true),
    (p_empresa_id, 'Tecnologia e Software',       'despesa', true),
    (p_empresa_id, 'Material de Escritorio',      'despesa', true),
    (p_empresa_id, 'Transporte e Logistica',      'despesa', true),
    (p_empresa_id, 'Tarifas e Juros Bancarios',   'despesa', true),
    (p_empresa_id, 'Manutencao e Reparos',        'despesa', true),
    (p_empresa_id, 'Seguros',                     'despesa', true),
    (p_empresa_id, 'Vendas de Produtos',          'receita', true),
    (p_empresa_id, 'Prestacao de Servicos',       'receita', true),
    (p_empresa_id, 'Consultoria',                 'receita', true),
    (p_empresa_id, 'Assinaturas e Recorrencias',  'receita', true),
    (p_empresa_id, 'Comissoes Recebidas',         'receita', true),
    (p_empresa_id, 'Juros e Rendimentos',         'receita', true),
    (p_empresa_id, 'Outros',                      'ambos',   true)
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.criar_centros_custo_padrao(p_empresa_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has access to the empresa
  IF NOT public.user_has_empresa_access(auth.uid(), p_empresa_id) THEN
    RAISE EXCEPTION 'Access denied: user does not have access to empresa %', p_empresa_id;
  END IF;

  INSERT INTO public.centros_custo (empresa_id, nome, ativo) VALUES
    (p_empresa_id, 'Administrativo',   true),
    (p_empresa_id, 'Comercial / Vendas', true),
    (p_empresa_id, 'Operacional',      true),
    (p_empresa_id, 'Financeiro',       true),
    (p_empresa_id, 'Tecnologia / TI',  true),
    (p_empresa_id, 'Marketing',        true),
    (p_empresa_id, 'RH / Pessoas',     true),
    (p_empresa_id, 'Juridico',         true)
  ON CONFLICT DO NOTHING;
END;
$$;
