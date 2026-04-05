
-- ENABLE RLS ON ALL TABLES
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.socios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_societarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribuicoes_lucro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribuicao_lucro_socios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fechamentos_mensais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_acoes ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.user_has_empresa_access(_user_id uuid, _empresa_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.empresa_users WHERE user_id = _user_id AND empresa_id = _empresa_id AND ativo = true)
$$;

CREATE OR REPLACE FUNCTION public.user_can_approve(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('socio_admin', 'financeiro_aprovador'))
$$;

CREATE OR REPLACE FUNCTION public.user_can_write(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('socio_admin', 'financeiro_aprovador', 'financeiro_operador'))
$$;

-- POLICIES: Empresas
CREATE POLICY "Users see their empresas" ON public.empresas FOR SELECT TO authenticated USING (public.user_has_empresa_access(auth.uid(), id));
CREATE POLICY "Admins manage empresas" ON public.empresas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'socio_admin')) WITH CHECK (public.has_role(auth.uid(), 'socio_admin'));

-- POLICIES: User roles
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- POLICIES: Empresa users
CREATE POLICY "Users see own empresa access" ON public.empresa_users FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage empresa users" ON public.empresa_users FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'socio_admin')) WITH CHECK (public.has_role(auth.uid(), 'socio_admin'));

-- MACRO for empresa-scoped tables: SELECT by access, INSERT/UPDATE by write permission
-- Socios
CREATE POLICY "Select socios" ON public.socios FOR SELECT TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Insert socios" ON public.socios FOR INSERT TO authenticated WITH CHECK (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.user_can_write(auth.uid()));
CREATE POLICY "Update socios" ON public.socios FOR UPDATE TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.user_can_write(auth.uid()));

-- Clientes
CREATE POLICY "Select clientes" ON public.clientes FOR SELECT TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Insert clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.user_can_write(auth.uid()));
CREATE POLICY "Update clientes" ON public.clientes FOR UPDATE TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.user_can_write(auth.uid()));

-- Fornecedores
CREATE POLICY "Select fornecedores" ON public.fornecedores FOR SELECT TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Insert fornecedores" ON public.fornecedores FOR INSERT TO authenticated WITH CHECK (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.user_can_write(auth.uid()));
CREATE POLICY "Update fornecedores" ON public.fornecedores FOR UPDATE TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.user_can_write(auth.uid()));

-- Categorias financeiras
CREATE POLICY "Select categorias" ON public.categorias_financeiras FOR SELECT TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Insert categorias" ON public.categorias_financeiras FOR INSERT TO authenticated WITH CHECK (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.user_can_write(auth.uid()));
CREATE POLICY "Update categorias" ON public.categorias_financeiras FOR UPDATE TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.user_can_write(auth.uid()));

-- Centros de custo
CREATE POLICY "Select centros_custo" ON public.centros_custo FOR SELECT TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Insert centros_custo" ON public.centros_custo FOR INSERT TO authenticated WITH CHECK (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.user_can_write(auth.uid()));
CREATE POLICY "Update centros_custo" ON public.centros_custo FOR UPDATE TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.user_can_write(auth.uid()));

-- Contas caixa
CREATE POLICY "Select contas_caixa" ON public.contas_caixa FOR SELECT TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Insert contas_caixa" ON public.contas_caixa FOR INSERT TO authenticated WITH CHECK (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.user_can_write(auth.uid()));
CREATE POLICY "Update contas_caixa" ON public.contas_caixa FOR UPDATE TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.user_can_write(auth.uid()));

-- Contas a pagar
CREATE POLICY "Select contas_pagar" ON public.contas_pagar FOR SELECT TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Insert contas_pagar" ON public.contas_pagar FOR INSERT TO authenticated WITH CHECK (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.user_can_write(auth.uid()));
CREATE POLICY "Update contas_pagar" ON public.contas_pagar FOR UPDATE TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.user_can_write(auth.uid()));

-- Contas a receber
CREATE POLICY "Select contas_receber" ON public.contas_receber FOR SELECT TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Insert contas_receber" ON public.contas_receber FOR INSERT TO authenticated WITH CHECK (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.user_can_write(auth.uid()));
CREATE POLICY "Update contas_receber" ON public.contas_receber FOR UPDATE TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.user_can_write(auth.uid()));

-- Movimentações societárias
CREATE POLICY "Select movimentacoes" ON public.movimentacoes_societarias FOR SELECT TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Insert movimentacoes" ON public.movimentacoes_societarias FOR INSERT TO authenticated WITH CHECK (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.user_can_write(auth.uid()));
CREATE POLICY "Update movimentacoes" ON public.movimentacoes_societarias FOR UPDATE TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.user_can_write(auth.uid()));

-- Distribuições de lucro (somente admin)
CREATE POLICY "Select distribuicoes" ON public.distribuicoes_lucro FOR SELECT TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Insert distribuicoes" ON public.distribuicoes_lucro FOR INSERT TO authenticated WITH CHECK (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.has_role(auth.uid(), 'socio_admin'));
CREATE POLICY "Update distribuicoes" ON public.distribuicoes_lucro FOR UPDATE TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.has_role(auth.uid(), 'socio_admin'));

-- Distribuição por sócio
CREATE POLICY "Select dist socios" ON public.distribuicao_lucro_socios FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.distribuicoes_lucro d WHERE d.id = distribuicao_id AND public.user_has_empresa_access(auth.uid(), d.empresa_id))
);
CREATE POLICY "Insert dist socios" ON public.distribuicao_lucro_socios FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.distribuicoes_lucro d WHERE d.id = distribuicao_id AND public.user_has_empresa_access(auth.uid(), d.empresa_id) AND public.has_role(auth.uid(), 'socio_admin'))
);

-- Fechamentos mensais (somente aprovadores)
CREATE POLICY "Select fechamentos" ON public.fechamentos_mensais FOR SELECT TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Insert fechamentos" ON public.fechamentos_mensais FOR INSERT TO authenticated WITH CHECK (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.user_can_approve(auth.uid()));
CREATE POLICY "Update fechamentos" ON public.fechamentos_mensais FOR UPDATE TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id) AND public.user_can_approve(auth.uid()));

-- Histórico de ações
CREATE POLICY "Select historico" ON public.historico_acoes FOR SELECT TO authenticated USING (public.user_has_empresa_access(auth.uid(), empresa_id));
CREATE POLICY "Insert historico" ON public.historico_acoes FOR INSERT TO authenticated WITH CHECK (public.user_has_empresa_access(auth.uid(), empresa_id));
