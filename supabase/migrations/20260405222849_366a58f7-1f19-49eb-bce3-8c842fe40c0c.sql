-- 1. Fix empresas: socio_admin can see ALL and create freely
DROP POLICY "Admins manage empresas" ON public.empresas;
DROP POLICY "Users see their empresas" ON public.empresas;

-- socio_admin sees ALL empresas
CREATE POLICY "Admins see all empresas" ON public.empresas
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'socio_admin'::app_role)
    OR user_has_empresa_access(auth.uid(), id)
  );

-- socio_admin can create empresas (no prior access needed)
CREATE POLICY "Admins insert empresas" ON public.empresas
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'socio_admin'::app_role));

-- socio_admin can update any empresa
CREATE POLICY "Admins update empresas" ON public.empresas
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'socio_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'socio_admin'::app_role));

-- 2. Fix empresa_users: socio_admin manages ALL links
DROP POLICY "Admins manage empresa users" ON public.empresa_users;

CREATE POLICY "Admins manage empresa users" ON public.empresa_users
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'socio_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'socio_admin'::app_role));

-- 3. Auto-link creator to new empresa
CREATE OR REPLACE FUNCTION public.auto_link_empresa_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.empresa_users (user_id, empresa_id, ativo)
  VALUES (auth.uid(), NEW.id, true)
  ON CONFLICT (user_id, empresa_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_link_empresa_creator
  AFTER INSERT ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_empresa_creator();