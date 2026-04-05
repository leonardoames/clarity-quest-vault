import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useToast } from "@/hooks/use-toast";

type TableName = "fornecedores" | "clientes" | "categorias_financeiras" | "centros_custo" | "contas_caixa" | "socios" | "contas_pagar" | "contas_receber" | "movimentacoes_societarias" | "distribuicoes_lucro" | "fechamentos_mensais" | "distribuicao_lucro_socios";

export function useEmpresaData<T extends Record<string, unknown>>(
  table: TableName,
  options?: {
    select?: string;
    orderBy?: string;
    filters?: Record<string, unknown>;
    enabled?: boolean;
  }
) {
  const { empresaAtual } = useEmpresa();
  const { toast } = useToast();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!empresaAtual?.id || options?.enabled === false) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let query = supabase
      .from(table)
      .select(options?.select || "*")
      .eq("empresa_id", empresaAtual.id);

    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (value !== undefined && value !== null && value !== "todos") {
          query = query.eq(key, value);
        }
      }
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy);
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data: result, error } = await query;

    if (error) {
      toast({ title: "Erro", description: `Falha ao carregar ${table}`, variant: "destructive" });
    } else {
      setData((result as T[]) || []);
    }
    setLoading(false);
  }, [empresaAtual?.id, table, options?.select, options?.orderBy, JSON.stringify(options?.filters), options?.enabled]);

  useEffect(() => { fetch(); }, [fetch]);

  const insert = async (record: Partial<T>) => {
    if (!empresaAtual?.id) return null;
    const { data: result, error } = await supabase
      .from(table)
      .insert({ ...record, empresa_id: empresaAtual.id } as never)
      .select()
      .single();
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return null;
    }
    toast({ title: "Salvo com sucesso" });
    fetch();
    return result;
  };

  const update = async (id: string, record: Partial<T>) => {
    const { error } = await supabase
      .from(table)
      .update(record as never)
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Atualizado com sucesso" });
    fetch();
    return true;
  };

  return { data, loading, refetch: fetch, insert, update };
}
