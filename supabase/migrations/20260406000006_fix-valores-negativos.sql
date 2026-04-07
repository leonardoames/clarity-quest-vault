-- ============================================================
-- Corrige registros importados antes do auto-split por sinal
-- ============================================================

-- 1. Move contas_pagar com valor > 0 para contas_receber
--    (eram entradas que foram roteadas errado)
INSERT INTO public.contas_receber (
  empresa_id, descricao, valor, vencimento, competencia,
  categoria_id, centro_custo_id, conta_caixa_id,
  forma_pagamento, data_movimento, data_prevista, nota_fiscal,
  valor_original, juros, multa, desconto, taxas,
  agendado, recorrencia, qtd_recorrencia,
  observacoes, status, criado_por, importacao_id
)
SELECT
  empresa_id, descricao, ABS(valor), vencimento, competencia,
  categoria_id, centro_custo_id, conta_caixa_id,
  forma_pagamento, data_movimento, data_prevista, nota_fiscal,
  valor_original, juros, multa, desconto, taxas,
  agendado, recorrencia, qtd_recorrencia,
  observacoes, status, criado_por, importacao_id
FROM public.contas_pagar
WHERE valor > 0;

DELETE FROM public.contas_pagar WHERE valor > 0;

-- 2. Move contas_receber com valor < 0 para contas_pagar
--    (eram saídas que foram roteadas errado)
INSERT INTO public.contas_pagar (
  empresa_id, descricao, valor, vencimento, competencia,
  categoria_id, centro_custo_id, conta_caixa_id,
  forma_pagamento, data_movimento, data_prevista, nota_fiscal,
  valor_original, juros, multa, desconto, taxas,
  agendado, recorrencia, qtd_recorrencia,
  observacoes, status, criado_por, importacao_id
)
SELECT
  empresa_id, descricao, ABS(valor), vencimento, competencia,
  categoria_id, centro_custo_id, conta_caixa_id,
  forma_pagamento, data_movimento, data_prevista, nota_fiscal,
  valor_original, juros, multa, desconto, taxas,
  agendado, recorrencia, qtd_recorrencia,
  observacoes, status, criado_por, importacao_id
FROM public.contas_receber
WHERE valor < 0;

DELETE FROM public.contas_receber WHERE valor < 0;

-- 3. Garante que nenhum valor negativo restante existe (duplo negativo)
UPDATE public.contas_pagar  SET valor = ABS(valor) WHERE valor < 0;
UPDATE public.contas_receber SET valor = ABS(valor) WHERE valor < 0;
