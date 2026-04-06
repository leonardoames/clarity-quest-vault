-- PRD: Campos expandidos em contas_pagar/receber + contas bancárias aprimoradas
-- + categorias e centros de custo padrão de mercado

-- =====================================================================
-- 1. Aprimorar contas_caixa → Contas Bancárias
-- =====================================================================
ALTER TABLE public.contas_caixa ADD COLUMN IF NOT EXISTS banco text;
ALTER TABLE public.contas_caixa ADD COLUMN IF NOT EXISTS agencia text;
ALTER TABLE public.contas_caixa ADD COLUMN IF NOT EXISTS numero_conta text;
ALTER TABLE public.contas_caixa ADD COLUMN IF NOT EXISTS digito text;
ALTER TABLE public.contas_caixa ADD COLUMN IF NOT EXISTS descricao text;

-- =====================================================================
-- 2. Novos campos em contas_pagar
-- =====================================================================
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS forma_pagamento text;
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS data_movimento date;
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS data_prevista date;
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS nota_fiscal text;
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS valor_original numeric(15,2);
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS juros numeric(15,2) DEFAULT 0;
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS multa numeric(15,2) DEFAULT 0;
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS desconto numeric(15,2) DEFAULT 0;
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS taxas numeric(15,2) DEFAULT 0;
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS agendado boolean DEFAULT false;
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS origem_lancamento text DEFAULT 'manual';
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS qtd_recorrencia int;

-- =====================================================================
-- 3. Novos campos em contas_receber
-- =====================================================================
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS forma_pagamento text;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS data_movimento date;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS data_prevista date;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS nota_fiscal text;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS valor_original numeric(15,2);
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS juros numeric(15,2) DEFAULT 0;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS multa numeric(15,2) DEFAULT 0;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS desconto numeric(15,2) DEFAULT 0;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS taxas numeric(15,2) DEFAULT 0;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS agendado boolean DEFAULT false;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS origem_lancamento text DEFAULT 'manual';
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS qtd_recorrencia int;

-- =====================================================================
-- 4. Função para criar categorias padrão de mercado em uma empresa
--    Chamada pelo frontend via RPC quando empresa não tem categorias
-- =====================================================================
CREATE OR REPLACE FUNCTION public.criar_categorias_padrao(p_empresa_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.categorias_financeiras (empresa_id, nome, tipo, ativa) VALUES
    -- Despesas
    (p_empresa_id, 'Aluguel e Imóvel',          'despesa', true),
    (p_empresa_id, 'Pessoal e RH',               'despesa', true),
    (p_empresa_id, 'Impostos e Taxas',            'despesa', true),
    (p_empresa_id, 'Serviços de Terceiros',       'despesa', true),
    (p_empresa_id, 'Energia, Água e Internet',    'despesa', true),
    (p_empresa_id, 'Marketing e Publicidade',     'despesa', true),
    (p_empresa_id, 'Tecnologia e Software',       'despesa', true),
    (p_empresa_id, 'Material de Escritório',      'despesa', true),
    (p_empresa_id, 'Transporte e Logística',      'despesa', true),
    (p_empresa_id, 'Tarifas e Juros Bancários',   'despesa', true),
    (p_empresa_id, 'Manutenção e Reparos',        'despesa', true),
    (p_empresa_id, 'Seguros',                     'despesa', true),
    -- Receitas
    (p_empresa_id, 'Vendas de Produtos',          'receita', true),
    (p_empresa_id, 'Prestação de Serviços',       'receita', true),
    (p_empresa_id, 'Consultoria',                 'receita', true),
    (p_empresa_id, 'Assinaturas e Recorrências',  'receita', true),
    (p_empresa_id, 'Comissões Recebidas',         'receita', true),
    (p_empresa_id, 'Juros e Rendimentos',         'receita', true),
    -- Ambos
    (p_empresa_id, 'Outros',                      'ambos',   true)
  ON CONFLICT DO NOTHING;
END;
$$;

-- =====================================================================
-- 5. Função para criar centros de custo padrão
-- =====================================================================
CREATE OR REPLACE FUNCTION public.criar_centros_custo_padrao(p_empresa_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.centros_custo (empresa_id, nome, ativo) VALUES
    (p_empresa_id, 'Administrativo',   true),
    (p_empresa_id, 'Comercial / Vendas', true),
    (p_empresa_id, 'Operacional',      true),
    (p_empresa_id, 'Financeiro',       true),
    (p_empresa_id, 'Tecnologia / TI',  true),
    (p_empresa_id, 'Marketing',        true),
    (p_empresa_id, 'RH / Pessoas',     true),
    (p_empresa_id, 'Jurídico',         true)
  ON CONFLICT DO NOTHING;
END;
$$;
