
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('socio_admin', 'financeiro_aprovador', 'financeiro_operador', 'visualizador');
CREATE TYPE public.status_pagar AS ENUM ('rascunho', 'pendente', 'aprovado', 'pago', 'vencido', 'cancelado');
CREATE TYPE public.status_receber AS ENUM ('rascunho', 'pendente', 'aprovado', 'recebido', 'vencido', 'cancelado', 'perdido');
CREATE TYPE public.tipo_movimentacao AS ENUM ('aporte_capital', 'emprestimo_socio', 'adiantamento_socio', 'retirada_socio', 'devolucao_socio');
CREATE TYPE public.status_aprovacao AS ENUM ('rascunho', 'pendente', 'aprovado', 'reprovado');
CREATE TYPE public.status_fechamento AS ENUM ('aberto', 'em_fechamento', 'fechado');
CREATE TYPE public.tipo_categoria AS ENUM ('receita', 'despesa', 'ambos');
CREATE TYPE public.tipo_recorrencia AS ENUM ('nenhuma', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual');

-- TIMESTAMP TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- TABLES
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  razao_social TEXT,
  cnpj TEXT,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.empresa_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, user_id)
);

CREATE TABLE public.socios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT,
  email TEXT,
  percentual_societario NUMERIC(5,2),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj_cpf TEXT,
  email TEXT,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj_cpf TEXT,
  email TEXT,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.categorias_financeiras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo tipo_categoria NOT NULL DEFAULT 'ambos',
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.centros_custo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.contas_caixa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'corrente',
  saldo_inicial NUMERIC(15,2) NOT NULL DEFAULT 0,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.contas_pagar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  categoria_id UUID REFERENCES public.categorias_financeiras(id),
  centro_custo_id UUID REFERENCES public.centros_custo(id),
  conta_caixa_id UUID REFERENCES public.contas_caixa(id),
  valor NUMERIC(15,2) NOT NULL,
  vencimento DATE NOT NULL,
  competencia TEXT NOT NULL,
  data_pagamento DATE,
  recorrencia tipo_recorrencia NOT NULL DEFAULT 'nenhuma',
  parcela_atual INTEGER,
  total_parcelas INTEGER,
  status status_pagar NOT NULL DEFAULT 'rascunho',
  observacao TEXT,
  criado_por UUID REFERENCES auth.users(id),
  aprovado_por UUID REFERENCES auth.users(id),
  aprovado_em TIMESTAMPTZ,
  observacao_aprovacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.contas_receber (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id),
  categoria_id UUID REFERENCES public.categorias_financeiras(id),
  conta_caixa_id UUID REFERENCES public.contas_caixa(id),
  valor NUMERIC(15,2) NOT NULL,
  vencimento DATE NOT NULL,
  competencia TEXT NOT NULL,
  data_recebimento DATE,
  recorrencia tipo_recorrencia NOT NULL DEFAULT 'nenhuma',
  parcela_atual INTEGER,
  total_parcelas INTEGER,
  status status_receber NOT NULL DEFAULT 'rascunho',
  observacao TEXT,
  criado_por UUID REFERENCES auth.users(id),
  aprovado_por UUID REFERENCES auth.users(id),
  aprovado_em TIMESTAMPTZ,
  observacao_aprovacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.movimentacoes_societarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  socio_id UUID NOT NULL REFERENCES public.socios(id),
  tipo tipo_movimentacao NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao TEXT,
  status status_aprovacao NOT NULL DEFAULT 'rascunho',
  aprovado_por UUID REFERENCES auth.users(id),
  aprovado_em TIMESTAMPTZ,
  observacao_aprovacao TEXT,
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.distribuicoes_lucro (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  competencia TEXT NOT NULL,
  valor_total NUMERIC(15,2) NOT NULL,
  data_efetiva DATE,
  observacao TEXT,
  status status_aprovacao NOT NULL DEFAULT 'rascunho',
  aprovado_por UUID REFERENCES auth.users(id),
  aprovado_em TIMESTAMPTZ,
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.distribuicao_lucro_socios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  distribuicao_id UUID NOT NULL REFERENCES public.distribuicoes_lucro(id) ON DELETE CASCADE,
  socio_id UUID NOT NULL REFERENCES public.socios(id),
  valor NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.fechamentos_mensais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  competencia TEXT NOT NULL,
  status status_fechamento NOT NULL DEFAULT 'aberto',
  fechado_por UUID REFERENCES auth.users(id),
  fechado_em TIMESTAMPTZ,
  reaberto_por UUID REFERENCES auth.users(id),
  reaberto_em TIMESTAMPTZ,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, competencia)
);

CREATE TABLE public.historico_acoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  empresa_id UUID REFERENCES public.empresas(id),
  tabela TEXT NOT NULL,
  registro_id UUID,
  acao TEXT NOT NULL,
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_empresa_users_user ON public.empresa_users(user_id);
CREATE INDEX idx_empresa_users_empresa ON public.empresa_users(empresa_id);
CREATE INDEX idx_contas_pagar_empresa ON public.contas_pagar(empresa_id);
CREATE INDEX idx_contas_pagar_vencimento ON public.contas_pagar(vencimento);
CREATE INDEX idx_contas_pagar_status ON public.contas_pagar(status);
CREATE INDEX idx_contas_receber_empresa ON public.contas_receber(empresa_id);
CREATE INDEX idx_contas_receber_vencimento ON public.contas_receber(vencimento);
CREATE INDEX idx_contas_receber_status ON public.contas_receber(status);
CREATE INDEX idx_movimentacoes_empresa ON public.movimentacoes_societarias(empresa_id);
CREATE INDEX idx_distribuicoes_empresa ON public.distribuicoes_lucro(empresa_id);
CREATE INDEX idx_fechamentos_empresa ON public.fechamentos_mensais(empresa_id);
CREATE INDEX idx_historico_empresa ON public.historico_acoes(empresa_id);
CREATE INDEX idx_socios_empresa ON public.socios(empresa_id);
CREATE INDEX idx_clientes_empresa ON public.clientes(empresa_id);
CREATE INDEX idx_fornecedores_empresa ON public.fornecedores(empresa_id);

-- TRIGGERS
CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_socios_updated_at BEFORE UPDATE ON public.socios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contas_caixa_updated_at BEFORE UPDATE ON public.contas_caixa FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contas_pagar_updated_at BEFORE UPDATE ON public.contas_pagar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contas_receber_updated_at BEFORE UPDATE ON public.contas_receber FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_movimentacoes_updated_at BEFORE UPDATE ON public.movimentacoes_societarias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_distribuicoes_updated_at BEFORE UPDATE ON public.distribuicoes_lucro FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fechamentos_updated_at BEFORE UPDATE ON public.fechamentos_mensais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
