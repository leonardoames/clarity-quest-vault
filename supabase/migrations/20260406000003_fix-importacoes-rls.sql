-- Corrige policies de importacoes_planilhas
-- O bug: user_can_write(empresa_id) passava o UUID da empresa em vez do UUID do usuário.
-- Padrão correto (igual às demais tabelas): user_can_write(auth.uid())

DROP POLICY IF EXISTS "insert_importacoes" ON public.importacoes_planilhas;
DROP POLICY IF EXISTS "update_importacoes" ON public.importacoes_planilhas;

CREATE POLICY "insert_importacoes" ON public.importacoes_planilhas
  FOR INSERT WITH CHECK (
    public.user_has_empresa_access(auth.uid(), empresa_id)
    AND public.user_can_write(auth.uid())
  );

CREATE POLICY "update_importacoes" ON public.importacoes_planilhas
  FOR UPDATE USING (
    public.user_has_empresa_access(auth.uid(), empresa_id)
    AND public.user_can_write(auth.uid())
  );
