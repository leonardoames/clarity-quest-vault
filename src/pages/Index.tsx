import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  Users,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { dashboardData, contasPagar, contasReceber, formatCurrency } from "@/lib/mock-data";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_COLORS = [
  "hsl(160, 84%, 39%)",
  "hsl(210, 100%, 56%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(280, 65%, 60%)",
  "hsl(180, 60%, 45%)",
];

export default function Dashboard() {
  const vencidos = [
    ...contasPagar.filter((c) => c.status === "vencido"),
    ...contasReceber.filter((c) => c.status === "vencido"),
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral — Empresa Alpha — Abril 2026
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Saldo Atual"
          value={formatCurrency(dashboardData.saldoAtual)}
          icon={Wallet}
          variant="primary"
          trend="+12% vs mês anterior"
          trendUp
        />
        <StatCard
          title="Total a Pagar"
          value={formatCurrency(dashboardData.totalPagar)}
          icon={ArrowDownCircle}
          variant="danger"
        />
        <StatCard
          title="Total a Receber"
          value={formatCurrency(dashboardData.totalReceber)}
          icon={ArrowUpCircle}
          variant="success"
        />
        <StatCard
          title="Resultado (Competência)"
          value={formatCurrency(dashboardData.resultadoCompetencia)}
          icon={TrendingUp}
          variant="success"
          trend="+8% vs mês anterior"
          trendUp
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Resultado (Caixa)"
          value={formatCurrency(dashboardData.resultadoCaixa)}
          icon={TrendingDown}
          variant="warning"
        />
        <StatCard
          title="Aportes no Mês"
          value={formatCurrency(dashboardData.aportesNoMes)}
          icon={Users}
          variant="primary"
        />
        <StatCard
          title="Venc. próx. 7 dias"
          value={formatCurrency(dashboardData.vencimentos7d)}
          icon={Calendar}
          variant="warning"
        />
        <StatCard
          title="Venc. próx. 30 dias"
          value={formatCurrency(dashboardData.vencimentos30d)}
          icon={Calendar}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart */}
        <div className="stat-card col-span-1 lg:col-span-2">
          <h3 className="section-title">Evolução Mensal</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.evolucaoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 18%)" />
                <XAxis dataKey="mes" stroke="hsl(215, 12%, 52%)" fontSize={12} />
                <YAxis stroke="hsl(215, 12%, 52%)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220, 18%, 11%)",
                    border: "1px solid hsl(220, 16%, 18%)",
                    borderRadius: "8px",
                    color: "hsl(210, 20%, 92%)",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="receita" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} name="Receita" />
                <Bar dataKey="despesa" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Despesa" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="stat-card">
          <h3 className="section-title">Despesas por Categoria</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboardData.despesasPorCategoria}
                  dataKey="valor"
                  nameKey="categoria"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                >
                  {dashboardData.despesasPorCategoria.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220, 18%, 11%)",
                    border: "1px solid hsl(220, 16%, 18%)",
                    borderRadius: "8px",
                    color: "hsl(210, 20%, 92%)",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {dashboardData.despesasPorCategoria.map((item, i) => (
              <div key={item.categoria} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                  <span className="text-muted-foreground">{item.categoria}</span>
                </div>
                <span className="text-foreground font-medium">{formatCurrency(item.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {vencidos.length > 0 && (
        <div className="stat-card border-destructive/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="font-medium text-destructive">Alertas de Atraso</h3>
          </div>
          <div className="space-y-2">
            {vencidos.map((item) => (
              <div key={item.id + item.descricao} className="flex items-center justify-between text-sm py-1.5">
                <div className="flex items-center gap-3">
                  <StatusBadge status="vencido" />
                  <span>{item.descricao}</span>
                </div>
                <span className="font-medium text-destructive">{formatCurrency(item.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
