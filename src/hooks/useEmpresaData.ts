import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useToast } from "@/hooks/use-toast";
import { logAcao } from "@/lib/audit";

type TableName = "fornecedores" | "clientes" | "categorias_financeiras" | "centros_custo" | "contas_caixa" | "socios" | "contas_pagar" | "contas_receber" | "movimentacoes_societarias" | "distribuicoes_lucro" | "fechamentos_mensais";

const TABLES_WITH_STATUS_CANCELADO: TableName[] = [
  "contas_pagar",
  "contas_receber",
  "movimentacoes_societarias",
  "distribuicoes_lucro",
];

const OVERDUE_ELIGIBLE_TABLES: TableName[] = ["contas_pagar", "contas_receber"];

/**
 * Determines auto-status for financial records based on due date.
 * If status is 'pendente' or 'aprovado' and vencimento < today, returns 'vencido'.
 */
function getAutoStatus(
  record: Record<string, unknown>
): string | null {
  const status = record.status as string | undefined;
  const vencimento = record.vencimento as string | undefined;

  if (!status || !vencimento) return null;

  if (
    (status === "pendente" || status === "aprovado") &&
    new Date(vencimento) < new Date(new Date().toISOString().split("T")[0])
  ) {
    return "vencido";
  }
  return null;
}

/**
 * Calculates the final monetary value considering financial adjustments.
 * valor_final = valor_original + juros + multa - desconto + taxas
 */
export function calcularValorFinal(params: {
  valor_original: number;
  juros?: number;
  multa?: number;
  desconto?: number;
  taxas?: number;
}): number {
  const { valor_original, juros = 0, multa = 0, desconto = 0, taxas = 0 } = params;
  return valor_original + juros + multa - desconto + taxas;
}

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

  const fetchData = useCallback(async () => {
    if (!empresaAtual?.id || options?.enabled === false) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let query = (supabase.from(table) as any)
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
      toast({ title: "Erro", description: `Falha ao carregar dados`, variant: "destructive" });
    } else {
      const records = (result as T[]) || [];
      setData(records);

      // Auto-update overdue statuses for eligible tables
      if (OVERDUE_ELIGIBLE_TABLES.includes(table)) {
        const overdueIds = records
          .filter((r) => {
            const rec = r as Record<string, unknown>;
            return getAutoStatus(rec) === "vencido" && rec.status !== "vencido";
          })
          .map((r) => (r as Record<string, unknown>).id as string);

        if (overdueIds.length > 0) {
          // Fire-and-forget batch update for overdue records
          updateOverdueStatuses(overdueIds);
        }
      }
    }
    setLoading(false);
  }, [empresaAtual?.id, table, options?.select, options?.orderBy, JSON.stringify(options?.filters), options?.enabled]);

  const updateOverdueStatuses = useCallback(async (ids: string[]) => {
    if (!empresaAtual?.id || ids.length === 0) return;

    const { error } = await (supabase.from(table) as any)
      .update({ status: "vencido" })
      .in("id", ids)
      .eq("empresa_id", empresaAtual.id);

    if (!error) {
      // Silently update local state to reflect the new status
      setData((prev) =>
        prev.map((item) => {
          const rec = item as Record<string, unknown>;
          if (ids.includes(rec.id as string)) {
            return { ...item, status: "vencido" } as T;
          }
          return item;
        })
      );
    }
  }, [empresaAtual?.id, table]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const insert = async (record: Partial<T>) => {
    if (!empresaAtual?.id) return null;
    const { data: result, error } = await (supabase.from(table) as any)
      .insert({ ...record, empresa_id: empresaAtual.id })
      .select()
      .single();
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return null;
    }
    toast({ title: "Salvo com sucesso" });

    // Audit log
    logAcao({
      tabela: table,
      acao: "criar",
      registro_id: result.id,
      empresa_id: empresaAtual.id,
      detalhes: { dados: record },
    });

    fetchData();
    return result as T;
  };

  const update = async (id: string, record: Partial<T>) => {
    if (!empresaAtual?.id) return false;
    const { error } = await (supabase.from(table) as any)
      .update(record)
      .eq("id", id)
      .eq("empresa_id", empresaAtual.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Atualizado com sucesso" });

    // Audit log
    logAcao({
      tabela: table,
      acao: "atualizar",
      registro_id: id,
      empresa_id: empresaAtual?.id,
      detalhes: { alteracoes: record },
    });

    fetchData();
    return true;
  };

  const remove = async (id: string) => {
    if (!empresaAtual?.id) return null;

    const { data: result, error } = await (supabase.from(table) as any)
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaAtual.id)
      .select()
      .single();

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return { data: null, error };
    }

    toast({ title: "Removido com sucesso" });

    logAcao({
      tabela: table,
      acao: "deletar",
      registro_id: id,
      empresa_id: empresaAtual.id,
      detalhes: { dados: result },
    });

    fetchData();
    return { data: result as T, error: null };
  };

  const softDelete = async (id: string) => {
    // Tables that use status='cancelado' for soft delete vs ativo=false
    if (TABLES_WITH_STATUS_CANCELADO.includes(table)) {
      return update(id, { status: "cancelado" } as unknown as Partial<T>);
    }
    return update(id, { ativo: false } as unknown as Partial<T>);
  };

  return {
    data,
    loading,
    refetch: fetchData,
    insert,
    update,
    remove,
    softDelete,
    updateOverdueStatuses,
  };
}
