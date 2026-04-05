import { useMemo } from "react";
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, TrendingUp, TrendingDown,
  AlertTriangle, Calendar, Users,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/mock-data";
import { useEmpresaData } from "@/hooks/useEmpresaData";
import { useEmpresa } from "@/contexts/EmpresaContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const CHART_COLORS = [
  "hsl(160, 84%, 39%)", "hsl(210, 100%, 56%)", "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)", "hsl(280, 65%, 60%)", "hsl(180, 60%, 45%)",
];

export default function Dashboard() {
  const { empresaAtual } = useEmpresa();
  const { data: contasPagar, loading: lpagar } = useEmpresaData<Record<string, unknown>>("contas_pagar");
  const { data: contasReceber, loading: lreceber } = useEmpresaData<Record<string, unknown>>("contas_receber");
  const { data: movimentacoes } = useEmpresaData<Record<string, unknown>>("movimentacoes_societarias");
  const { data: distribuicoes } = useEmpresaData<Record<string, unknown>>("distribuicoes_lucro");

  const loading = lpagar || lreceber;

  const stats = useMemo(() => {
    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const in7 = new Date(now.getTime() + 7 * 86400000);
    const in15 = new Date(now.getTime() + 15 * 86400000);
    const in30 = new Date(now.getTime() + 30 * 86400000);

    const cpPendentes = contasPagar.filter((c) => !["pago", "cancelado"].includes(c.status as string));
    const crPendentes = contasReceber.filter((c) => !["recebido", "cancelado", "perdido"].includes(c.status as string));
    const totalPagar = cpPendentes.reduce((s, c) => s + Number(c.valor || 0), 0);
    const totalReceber = crPendentes.reduce((s, c) => s + Number(c.valor || 0), 0);

    const venc7d = cpPendentes.filter((c) => new Date(c.vencimento as string) <= in7).reduce((s, c) => s + Number(c.valor || 0), 0);
    const venc15d = cpPendentes.filter((c) => new Date(c.vencimento as string) <= in15).reduce((s, c) => s + Number(c.valor || 0), 0);
    const venc30d = cpPendentes.filter((c) => new Date(c.vencimento as string) <= in30).reduce((s, c) => s + Number(c.valor || 0), 0);

    // Resultado por competência do mês atual
    const receitaComp = contasReceber.filter((c) => (c.competencia as string) === mesAtual && c.status !== "cancelado" && c.status !== "perdido")
      .reduce((s, c) => s + Number(c.valor || 0), 0);
    const despesaComp = contasPagar.filter((c) => (c.competencia as string) === mesAtual && c.status !== "cancelado")
      .reduce((s, c) => s + Number(c.valor || 0), 0);

    // Resultado por caixa do mês atual
    const receitaCaixa = contasReceber.filter((c) => c.status === "recebido" && (c.data_recebimento as string || "").startsWith(mesAtual))
      .reduce((s, c) => s + Number(c.valor || 0), 0);
    const despesaCaixa = contasPagar.filter((c) => c.status === "pago" && (c.data_pagamento as string || "").startsWith(mesAtual))
      .reduce((s, c) => s + Number(c.valor || 0), 0);

    const aportesNoMes = movimentacoes.filter((m) => m.status === "aprovado" && (m.data as string || "").startsWith(mesAtual) &&
      ["aporte_capital", "emprestimo_socio", "adiantamento_socio"].includes(m.tipo as string))
      .reduce((s, m) => s + Number(m.valor || 0), 0);

    const distNoMes = distribuicoes.filter((d) => d.status === "aprovado" && (d.competencia as string) === mesAtual)
      .reduce((s, d) => s + Number(d.valor_total || 0), 0);

    // Despesas por categoria (usando descrição como fallback)
    const catMap = new Map<string, number>();
    contasPagar.filter((c) => (c.competencia as string) === mesAtual && c.status !== "cancelado").forEach((c) => {
      const cat = "Geral";
      catMap.set(cat, (catMap.get(cat) || 0) + Number(c.valor || 0));
    });
    const despesasPorCategoria = Array.from(catMap.entries()).map(([categoria, valor]) => ({ categoria, valor }))
      .sort((a, b) => b.valor - a.valor).slice(0, 6);

    const vencidos = [
      ...contasPagar.filter((c) => c.status === "vencido"),
      ...contasReceber.filter((c) => c.status === "vencido"),
    ];

    return {
      totalPagar, totalReceber, venc7d, venc15d, venc30d,
      resultadoCompetencia: receitaComp - despesaComp,
      resultadoCaixa: receitaCaixa - despesaCaixa,
      saldoAtual: totalReceber - totalPagar,
      aportesNoMes, distNoMes,
      despesasPorCategoria, vencidos,
    };
  }, [contasPagar, contasReceber, movimentacoes, distribuicoes]);

  if (loading) {
    return <div className="text-center text-muted-foreground py-12">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral — {empresaAtual?.nome || "Selecione uma empresa"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Saldo Projetado" value={formatCurrency(stats.saldoAtual)} icon={Wallet} variant="primary" />
        <StatCard title="Total a Pagar" value={formatCurrency(stats.totalPagar)} icon={ArrowDownCircle} variant="danger" />
        <StatCard title="Total a Receber" value={formatCurrency(stats.totalReceber)} icon={ArrowUpCircle} variant="success" />
        <StatCard title="Resultado (Competência)" value={formatCurrency(stats.resultadoCompetencia)} icon={TrendingUp} variant={stats.resultadoCompetencia >= 0 ? "success" : "danger"} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Resultado (Caixa)" value={formatCurrency(stats.resultadoCaixa)} icon={TrendingDown} variant={stats.resultadoCaixa >= 0 ? "success" : "warning"} />
        <StatCard title="Aportes no Mês" value={formatCurrency(stats.aportesNoMes)} icon={Users} variant="primary" />
        <StatCard title="Venc. próx. 7 dias" value={formatCurrency(stats.venc7d)} icon={Calendar} variant="warning" />
        <StatCard title="Venc. próx. 30 dias" value={formatCurrency(stats.venc30d)} icon={Calendar} />
      </div>

      {stats.vencidos.length > 0 && (
        <div className="stat-card border-destructive/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="font-medium text-destructive">Alertas de Atraso</h3>
          </div>
          <div className="space-y-2">
            {stats.vencidos.map((item) => (
              <div key={item.id as string} className="flex items-center justify-between text-sm py-1.5">
                <div className="flex items-center gap-3">
                  <StatusBadge status="vencido" />
                  <span>{item.descricao as string}</span>
                </div>
                <span className="font-medium text-destructive">{formatCurrency(Number(item.valor))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {contasPagar.length === 0 && contasReceber.length === 0 && (
        <div className="stat-card text-center py-12">
          <p className="text-muted-foreground">Nenhum dado financeiro ainda. Comece criando lançamentos em Contas a Pagar ou Contas a Receber.</p>
        </div>
      )}
    </div>
  );
}
