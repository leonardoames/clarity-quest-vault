-- Função para criar categorias padrão de E-commerce Brasileiro
CREATE OR REPLACE FUNCTION public.criar_categorias_ecommerce(p_empresa_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.user_has_empresa_access(auth.uid(), p_empresa_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  INSERT INTO public.categorias_financeiras (empresa_id, nome, tipo, ativa) VALUES
    -- RECEITAS
    (p_empresa_id, 'Vendas Marketplace (Mercado Livre)', 'receita', true),
    (p_empresa_id, 'Vendas Marketplace (Shopee)', 'receita', true),
    (p_empresa_id, 'Vendas Marketplace (Amazon)', 'receita', true),
    (p_empresa_id, 'Vendas Marketplace (Magalu)', 'receita', true),
    (p_empresa_id, 'Vendas Loja Própria (Site/App)', 'receita', true),
    (p_empresa_id, 'Vendas WhatsApp / Social Commerce', 'receita', true),
    (p_empresa_id, 'Frete Cobrado do Cliente', 'receita', true),
    (p_empresa_id, 'Estorno Recebido de Fornecedor', 'receita', true),
    (p_empresa_id, 'Cashback / Bonificação Plataforma', 'receita', true),
    -- CUSTOS (CMV)
    (p_empresa_id, 'Compra de Mercadoria / Estoque', 'despesa', true),
    (p_empresa_id, 'Importação (Frete Internacional + II)', 'despesa', true),
    (p_empresa_id, 'Embalagem e Material de Envio', 'despesa', true),
    (p_empresa_id, 'Frete para Entrega ao Cliente', 'despesa', true),
    (p_empresa_id, 'Frete de Devolução / Reverse Logistics', 'despesa', true),
    (p_empresa_id, 'Custo de Produção / Manufatura', 'despesa', true),
    -- TAXAS E COMISSÕES
    (p_empresa_id, 'Comissão Marketplace (Mercado Livre)', 'despesa', true),
    (p_empresa_id, 'Comissão Marketplace (Shopee)', 'despesa', true),
    (p_empresa_id, 'Comissão Marketplace (Amazon)', 'despesa', true),
    (p_empresa_id, 'Comissão Marketplace (Magalu)', 'despesa', true),
    (p_empresa_id, 'Taxa de Anúncio / Publicação', 'despesa', true),
    (p_empresa_id, 'Taxa Antifraude / Checkout', 'despesa', true),
    (p_empresa_id, 'Taxa Gateway de Pagamento', 'despesa', true),
    (p_empresa_id, 'Tarifa de Parcelamento / Adquirente', 'despesa', true),
    -- IMPOSTOS
    (p_empresa_id, 'Simples Nacional / DAS', 'despesa', true),
    (p_empresa_id, 'ICMS / DIFAL', 'despesa', true),
    (p_empresa_id, 'PIS / COFINS', 'despesa', true),
    -- MARKETING
    (p_empresa_id, 'Ads Marketplace (Mercado Ads / Shopee Ads)', 'despesa', true),
    (p_empresa_id, 'Ads Meta (Facebook / Instagram)', 'despesa', true),
    (p_empresa_id, 'Ads Google / YouTube', 'despesa', true),
    (p_empresa_id, 'Influenciadores / UGC', 'despesa', true),
    (p_empresa_id, 'Criação de Conteúdo / Fotografia', 'despesa', true),
    -- OPERACIONAL / TECNOLOGIA
    (p_empresa_id, 'Plataforma E-commerce (VTEX / Nuvemshop / Shopify)', 'despesa', true),
    (p_empresa_id, 'ERP / OMS / WMS', 'despesa', true),
    (p_empresa_id, 'Atendimento ao Cliente / SAC (ferramenta)', 'despesa', true),
    (p_empresa_id, 'Aluguel de Galpão / Armazém', 'despesa', true),
    (p_empresa_id, 'Fulfillment / 3PL', 'despesa', true),
    (p_empresa_id, 'Funcionários Operacionais (separação/embalagem)', 'despesa', true),
    -- DEVOLUÇÕES E PERDAS
    (p_empresa_id, 'Devolução / Chargeback Cliente', 'despesa', true),
    (p_empresa_id, 'Perda de Estoque / Avaria', 'despesa', true),
    (p_empresa_id, 'Multa por Cancelamento de Pedido', 'despesa', true)
  ON CONFLICT DO NOTHING;
END;$$;
