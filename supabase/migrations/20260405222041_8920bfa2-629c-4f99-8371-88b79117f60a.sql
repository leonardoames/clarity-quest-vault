-- 1. Fix cross-tenant admin on empresas: scope to empresa access
DROP POLICY "Admins manage empresas" ON public.empresas;
CREATE POLICY "Admins manage empresas" ON public.empresas
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'socio_admin'::app_role)
    AND user_has_empresa_access(auth.uid(), id)
  )
  WITH CHECK (
    has_role(auth.uid(), 'socio_admin'::app_role)
    AND user_has_empresa_access(auth.uid(), id)
  );

-- 2. Fix cross-tenant admin on empresa_users: scope to empresa access
DROP POLICY "Admins manage empresa users" ON public.empresa_users;
CREATE POLICY "Admins manage empresa users" ON public.empresa_users
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'socio_admin'::app_role)
    AND user_has_empresa_access(auth.uid(), empresa_id)
  )
  WITH CHECK (
    has_role(auth.uid(), 'socio_admin'::app_role)
    AND user_has_empresa_access(auth.uid(), empresa_id)
  );

-- 3. Fix audit log spoofing: enforce user_id = auth.uid()
DROP POLICY "Insert historico" ON public.historico_acoes;
CREATE POLICY "Insert historico" ON public.historico_acoes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_empresa_access(auth.uid(), empresa_id)
    AND user_id = auth.uid()
  );