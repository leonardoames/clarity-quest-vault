
-- 1. Fix importacoes_planilhas RLS policies
DROP POLICY IF EXISTS "insert_importacoes" ON importacoes_planilhas;
DROP POLICY IF EXISTS "update_importacoes" ON importacoes_planilhas;
DROP POLICY IF EXISTS "select_importacoes" ON importacoes_planilhas;
DROP POLICY IF EXISTS "Delete importacoes" ON importacoes_planilhas;

CREATE POLICY "select_importacoes" ON importacoes_planilhas
  FOR SELECT TO authenticated
  USING (user_has_empresa_access(auth.uid(), empresa_id));

CREATE POLICY "insert_importacoes" ON importacoes_planilhas
  FOR INSERT TO authenticated
  WITH CHECK (user_has_empresa_access(auth.uid(), empresa_id) AND user_can_write(auth.uid()));

CREATE POLICY "update_importacoes" ON importacoes_planilhas
  FOR UPDATE TO authenticated
  USING (user_has_empresa_access(auth.uid(), empresa_id) AND user_can_write(auth.uid()));

CREATE POLICY "delete_importacoes" ON importacoes_planilhas
  FOR DELETE TO authenticated
  USING (user_has_empresa_access(auth.uid(), empresa_id) AND has_role(auth.uid(), 'socio_admin'::app_role));

-- 2. Add explicit write policies on user_roles
CREATE POLICY "Only admins insert roles" ON user_roles
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'socio_admin'::app_role));

CREATE POLICY "Only admins update roles" ON user_roles
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'socio_admin'::app_role));

CREATE POLICY "Only admins delete roles" ON user_roles
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'socio_admin'::app_role));
