import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useEmpresaData } from "@/hooks/useEmpresaData";

interface FluxoItem {
  id: string;
  tipo: "entrada" | "saida";
  descricao: string;
  contraparte: string | null;
  categoria: string | null;
  conta: string | null;
  forma_pagamento: string | null;
  data: string;
  valor: number;
}

const FORMA_LABEL: Record<string, string> = {
  pix: "PIX", boleto: "Boleto", transferencia: "Transferência",
  cartao_credito: "Cartão Créd.", cartao_debito: "Cartão Déb.",
  dinheiro: "Dinheiro", cheque: "Cheque", outro: "Outro",
};

function mesAno(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function labelMes(ym: string) {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export default function FluxoCaixa() {
  const { empresaAtual } = useEmpresa();
  const { data: contasBancarias } = useEmpresaData<any>("contas_caixa", { orderBy: "nome" });

  const [mes, setMes] = useState(mesAno(new Date()));
  const [contaFiltro, setContaFiltro] = useState("todas");
  const [items, setItems] = useState<FluxoItem[]>([]);
  const [loading, setLoading] = useState(false);

  const navMes = (delta: number) => {
    const [y, m] = mes.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMes(mesAno(d));
  };

  useEffect(() => {
    if (!empresaAtual?.id) return;
    loadFluxo();
  }, [empresaAtual?.id, mes, contaFiltro]);

  const loadFluxo = async () => {
    if (!empresaAtual?.id) return;
    setLoading(true);

    try {
      const inicioMes = `${mes}-01`;
      const [y, m] = mes.split("-").map(Number);
      const fimMes = new Date(y, m, 0).toISOString().split("T")[0];

      const contaFilter = contaFiltro !== "todas" ? contaFiltro : null;

      // Filtro de período: registro cai no mês se data_movimento OU data_pagamento estiver no intervalo.
      // Usa sintaxe PostgREST aninhada em um único .or() para evitar conflito de parâmetros.
      const filtroPagar =
        `and(data_movimento.gte.${inicioMes},data_movimento.lte.${fimMes}),` +
        `and(data_pagamento.gte.${inicioMes},data_pagamento.lte.${fimMes})`;

      const filtroReceber =
        `and(data_movimento.gte.${inicioMes},data_movimento.lte.${fimMes}),` +
        `and(data_recebimento.gte.${inicioMes},data_recebimento.lte.${fimMes})`;

      let qPagar = (supabase as any)
        .from("contas_pagar")
        .select("id, descricao, valor, data_movimento, data_pagamento, forma_pagamento, fornecedores(nome), categorias_financeiras(nome), contas_caixa(nome), conta_caixa_id")
        .eq("empresa_id", empresaAtual.id)
        .eq("status", "pago")
        .or(filtroPagar);

      if (contaFilter) qPagar = qPagar.eq("conta_caixa_id", contaFilter);

      let qReceber = (supabase as any)
        .from("contas_receber")
        .select("id, descricao, valor, data_movimento, data_recebimento, forma_pagamento, clientes(nome), categorias_financeiras(nome), contas_caixa(nome), conta_caixa_id")
        .eq("empresa_id", empresaAtual.id)
        .eq("status", "recebido")
        .or(filtroReceber);

      if (contaFilter) qReceber = qReceber.eq("conta_caixa_id", contaFilter);

      const [{ data: pagar, error: errPagar }, { data: receber, error: errReceber }] =
        await Promise.all([qPagar, qReceber]);

      if (errPagar || errReceber) {
        console.error("FluxoCaixa query error:", errPagar || errReceber);
      }

      const saidas: FluxoItem[] = (pagar || []).map((r: any) => ({
        id: r.id,
        tipo: "saida" as const,
        descricao: r.descricao,
        contraparte: r.fornecedores?.nome || null,
        categoria: r.categorias_financeiras?.nome || null,
        conta: r.contas_caixa?.nome || null,
        forma_pagamento: r.forma_pagamento,
        data: r.data_movimento || r.data_pagamento,
        valor: Number(r.valor),
      }));

      const entradas: FluxoItem[] = (receber || []).map((r: any) => ({
        id: r.id,
        tipo: "entrada" as const,
        descricao: r.descricao,
        contraparte: r.clientes?.nome || null,
        categoria: r.categorias_financeiras?.nome || null,
        conta: r.contas_caixa?.nome || null,
        forma_pagamento: r.forma_pagamento,
        data: r.data_movimento || r.data_recebimento,
        valor: Number(r.valor),
      }));

      const merged = [...saidas, ...entradas].sort((a, b) => a.data.localeCompare(b.data));
      setItems(merged);
    } catch (err) {
      console.error("FluxoCaixa loadFluxo error:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalEntradas = items.filter((i) => i.tipo === "entrada").reduce((s, i) => s + i.valor, 0);
  const totalSaidas = items.filter((i) => i.tipo === "saida").reduce((s, i) => s + i.valor, 0);
  const saldo = totalEntradas - totalSaidas;

  // Running balance
  let runningBalance = 0;
  const itemsWithBalance = items.map((item) => {
    if (item.tipo === "entrada") runningBalance += item.valor;
    else runningBalance -= item.valor;
    return { ...item, saldoAcumulado: runningBalance };
  });

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fluxo de Caixa</h1>
          <p className="text-sm text-muted-foreground mt-1">Movimentações realizadas no período</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navMes(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[160px] text-center capitalize">{labelMes(mes)}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navMes(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Select value={contaFiltro} onValueChange={setContaFiltro}>
          <SelectTrigger className="w-full sm:w-[200px] bg-secondary border-border">
            <SelectValue placeholder="Todas as contas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as contas</SelectItem>
            {contasBancarias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}{c.banco ? ` (${c.banco})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Entradas</span>
          </div>
          <p className="text-2xl font-bold font-mono text-success">{formatCurrency(totalEntradas)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Saídas</span>
          </div>
          <p className="text-2xl font-bold font-mono text-destructive">{formatCurrency(totalSaidas)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Saldo do Período</span>
          </div>
          <p className={`text-2xl font-bold font-mono ${saldo >= 0 ? "text-success" : "text-destructive"}`}>
            {formatCurrency(saldo)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="stat-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Contraparte</th>
                <th>Categoria</th>
                <th>Conta</th>
                <th>Forma</th>
                <th className="text-right">Entrada</th>
                <th className="text-right">Saída</th>
                <th className="text-right">Saldo Acum.</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center text-muted-foreground py-8">Carregando...</td></tr>
              ) : itemsWithBalance.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-muted-foreground py-8">
                    Nenhuma movimentação realizada em {labelMes(mes)}
                  </td>
                </tr>
              ) : itemsWithBalance.map((item) => (
                <tr key={item.id}>
                  <td className="text-muted-foreground text-sm whitespace-nowrap">
                    {new Date(item.data + "T00:00:00").toLocaleDateString("pt-BR")}
                  </td>
                  <td className="font-medium">{item.descricao}</td>
                  <td className="text-muted-foreground text-sm">{item.contraparte || "—"}</td>
                  <td className="text-muted-foreground text-sm">{item.categoria || "—"}</td>
                  <td className="text-muted-foreground text-sm">{item.conta || "—"}</td>
                  <td className="text-muted-foreground text-sm">
                    {item.forma_pagamento ? FORMA_LABEL[item.forma_pagamento] || item.forma_pagamento : "—"}
                  </td>
                  <td className="text-right font-mono text-sm">
                    {item.tipo === "entrada" ? (
                      <span className="text-success">{formatCurrency(item.valor)}</span>
                    ) : "—"}
                  </td>
                  <td className="text-right font-mono text-sm">
                    {item.tipo === "saida" ? (
                      <span className="text-destructive">{formatCurrency(item.valor)}</span>
                    ) : "—"}
                  </td>
                  <td className="text-right font-mono text-sm font-medium">
                    <span className={item.saldoAcumulado >= 0 ? "text-success" : "text-destructive"}>
                      {formatCurrency(item.saldoAcumulado)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
