import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, TrendingUp,
  AlertTriangle, Calendar, Users, Clock, Bell, ArrowRight,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/mock-data";
import { useEmpresaData } from "@/hooks/useEmpresaData";
import { useEmpresa } from "@/contexts/EmpresaContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = [
  "hsl(22,93%,52%)", "hsl(38,92%,50%)", "hsl(142,69%,40%)",
  "hsl(217,91%,60%)", "hsl(271,81%,56%)", "hsl(0,72%,51%)",
];

function last6Months(): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return result;
}

function shortMonth(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

export default function Dashboard() {
  const { empresaAtual } = useEmpresa();

  const { data: contasPagar, loading: lpagar } = useEmpresaData<any>("contas_pagar", {
    select: "id, descricao, valor, status, vencimento, competencia, data_pagamento, categorias_financeiras(nome)",
  });
  const { data: contasReceber, loading: lreceber } = useEmpresaData<any>("contas_receber", {
    select: "id, descricao, valor, status, vencimento, competencia, data_recebimento",
  });
  const { data: movimentacoes } = useEmpresaData<any>("movimentacoes_societarias", {
    select: "id, tipo, valor, status, data, socios(nome)",
  });

  const loading = lpagar || lreceber;
  const meses = last6Months();
  const mesAtual = meses[meses.length - 1];

  const stats = useMemo(() => {
    const now = new Date();
    const hoje = now.toISOString().split("T")[0];
    const in7  = new Date(now.getTime() +  7 * 86400000).toISOString().split("T")[0];
    const in30 = new Date(now.getTime() + 30 * 86400000).toISOString().split("T")[0];

    const cpPendentes = contasPagar.filter((c: any) => !["pago","cancelado"].includes(c.status));
    const crPendentes = contasReceber.filter((c: any) => !["recebido","cancelado","perdido"].includes(c.status));

    const totalPagar   = cpPendentes.reduce((s: number, c: any) => s + Number(c.valor || 0), 0);
    const totalReceber = crPendentes.reduce((s: number, c: any) => s + Number(c.valor || 0), 0);

    const venc7d  = cpPendentes.filter((c: any) => c.vencimento <= in7) .reduce((s: number, c: any) => s + Number(c.valor || 0), 0);
    const venc30d = cpPendentes.filter((c: any) => c.vencimento <= in30).reduce((s: number, c: any) => s + Number(c.valor || 0), 0);
    const vencidos = cpPendentes.filter((c: any) => c.vencimento < hoje);
    const vencimentosHoje = [
      ...cpPendentes.filter((c: any) => c.vencimento === hoje).map((c: any) => ({ ...c, _tipo: "pagar" as const })),
      ...crPendentes.filter((c: any) => c.vencimento === hoje).map((c: any) => ({ ...c, _tipo: "receber" as const })),
    ];

    const receitaComp = contasReceber
      .filter((c: any) => c.competencia === mesAtual && !["cancelado","perdido"].includes(c.status))
      .reduce((s: number, c: any) => s + Number(c.valor || 0), 0);
    const despesaComp = contasPagar
      .filter((c: any) => c.competencia === mesAtual && c.status !== "cancelado")
      .reduce((s: number, c: any) => s + Number(c.valor || 0), 0);

    const receitaCaixa = contasReceber
      .filter((c: any) => c.status === "recebido" && (c.data_recebimento || "").startsWith(mesAtual))
      .reduce((s: number, c: any) => s + Number(c.valor || 0), 0);
    const despesaCaixa = contasPagar
      .filter((c: any) => c.status === "pago" && (c.data_pagamento || "").startsWith(mesAtual))
      .reduce((s: number, c: any) => s + Number(c.valor || 0), 0);

    // Despesas por categoria no mês atual
    const catMap = new Map<string, number>();
    contasPagar
      .filter((c: any) => c.competencia === mesAtual && c.status !== "cancelado")
      .forEach((c: any) => {
        const cat = c.categorias_financeiras?.nome || "Sem categoria";
        catMap.set(cat, (catMap.get(cat) || 0) + Number(c.valor || 0));
      });
    const despesasPorCategoria = Array.from(catMap.entries())
      .map(([categoria, valor]) => ({ categoria, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6);

    // Trend 6 meses
    const trend = meses.map((ym) => ({
      mes: shortMonth(ym),
      Receitas: contasReceber
        .filter((c: any) => c.competencia === ym && !["cancelado","perdido"].includes(c.status))
        .reduce((s: number, c: any) => s + Number(c.valor || 0), 0),
      Despesas: contasPagar
        .filter((c: any) => c.competencia === ym && c.status !== "cancelado")
        .reduce((s: number, c: any) => s + Number(c.valor || 0), 0),
    }));

    // Aportes por sócio (histórico)
    const socioMap = new Map<string, number>();
    movimentacoes
      .filter((m: any) => ["aporte_capital","emprestimo_socio"].includes(m.tipo) && m.status !== "cancelado")
      .forEach((m: any) => {
        const nome = m.socios?.nome || "Desconhecido";
        socioMap.set(nome, (socioMap.get(nome) || 0) + Number(m.valor || 0));
      });
    const aportesPorSocio = Array.from(socioMap.entries())
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);
    const totalAportes = aportesPorSocio.reduce((s, a) => s + a.valor, 0);

    return {
      totalPagar, totalReceber, venc7d, venc30d, vencidos, vencimentosHoje,
      resultadoCompetencia: receitaComp - despesaComp,
      resultadoCaixa: receitaCaixa - despesaCaixa,
      saldoProjetado: totalReceber - totalPagar,
      despesasPorCategoria, trend,
      aportesPorSocio, totalAportes,
    };
  }, [contasPagar, contasReceber, movimentacoes, mesAtual]);

  if (loading) return <div className="text-center text-muted-foreground py-12">Carregando...</div>;

  const semDados = contasPagar.length === 0 && contasReceber.length === 0;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {empresaAtual?.nome || "Selecione uma empresa"} —{" "}
            {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Vencimentos Hoje */}
      {stats.vencimentosHoje.length > 0 && (
        <div className="stat-card border-warning/30">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-warning" />
            <h3 className="font-medium text-warning text-sm">{stats.vencimentosHoje.length} vencimento(s) hoje</h3>
          </div>
          <div className="space-y-1">
            {stats.vencimentosHoje.map((item: any) => (
              <div key={`hoje-${item._tipo}-${item.id}`} className="flex items-center justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <StatusBadge status={item.status} />
                  <span className="truncate">{item.descricao}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                    {item._tipo === "pagar" ? "a pagar" : "a receber"}
                  </span>
                </div>
                <span className={`font-medium ml-4 shrink-0 ${item._tipo === "pagar" ? "text-destructive" : "text-success"}`}>
                  {formatCurrency(Number(item.valor))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Saldo Projetado"         value={formatCurrency(stats.saldoProjetado)}       icon={Wallet}          variant={stats.saldoProjetado >= 0 ? "success" : "danger"} />
        <StatCard title="Total a Pagar"            value={formatCurrency(stats.totalPagar)}           icon={ArrowDownCircle} variant="danger" />
        <StatCard title="Total a Receber"          value={formatCurrency(stats.totalReceber)}         icon={ArrowUpCircle}   variant="success" />
        <StatCard title="Resultado Competência"    value={formatCurrency(stats.resultadoCompetencia)} icon={TrendingUp}      variant={stats.resultadoCompetencia >= 0 ? "success" : "danger"} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Resultado Caixa"          value={formatCurrency(stats.resultadoCaixa)}  icon={Wallet}    variant={stats.resultadoCaixa >= 0 ? "success" : "warning"} />
        <StatCard title="Total Aportes"            value={formatCurrency(stats.totalAportes)}    icon={Users}     variant="primary" />
        <StatCard title="Vence em 7 dias"          value={formatCurrency(stats.venc7d)}          icon={Clock}     variant={stats.venc7d > 0 ? "warning" : undefined} />
        <StatCard title="Vence em 30 dias"         value={formatCurrency(stats.venc30d)}         icon={Calendar}  variant={stats.venc30d > 0 ? "warning" : undefined} />
      </div>

      {/* Alertas */}
      {stats.vencidos.length > 0 && (
        <div className="stat-card border-destructive/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="font-medium text-destructive text-sm">{stats.vencidos.length} conta(s) a pagar vencida(s)</h3>
          </div>
          <div className="space-y-1">
            {stats.vencidos.slice(0, 6).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <StatusBadge status="vencido" />
                  <span className="truncate">{item.descricao}</span>
                  <span className="text-muted-foreground text-xs shrink-0">
                    {new Date(item.vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <span className="font-medium text-destructive ml-4 shrink-0">{formatCurrency(Number(item.valor))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {semDados ? (
        <div className="stat-card text-center py-12">
          <p className="text-muted-foreground">Nenhum dado ainda. Crie lançamentos ou importe uma planilha.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Receitas vs Despesas — 6 meses */}
          <div className="stat-card space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Receitas vs Despesas — últimos 6 meses</h3>
            <ResponsiveContainer width="100%" height="100%" minHeight={220} className="min-h-[220px] lg:min-h-[300px]">
              <BarChart data={stats.trend} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} width={40} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Receitas" fill="hsl(142,69%,40%)" radius={[4,4,0,0]} />
                <Bar dataKey="Despesas" fill="hsl(0,72%,51%)"   radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Despesas por categoria */}
          <div className="stat-card space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Despesas por Categoria — mês atual</h3>
            {stats.despesasPorCategoria.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Nenhuma despesa lançada no mês</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minHeight={220} className="min-h-[220px] lg:min-h-[300px]">
                <PieChart>
                  <Pie data={stats.despesasPorCategoria} dataKey="valor" nameKey="categoria" cx="50%" cy="50%" outerRadius={80} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {stats.despesasPorCategoria.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Aportes por sócio */}
          {stats.aportesPorSocio.length > 0 && (
            <div className="stat-card space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Aportes por Sócio — histórico total</h3>
              <div className="space-y-2.5">
                {stats.aportesPorSocio.map((s, i) => {
                  const pct = stats.totalAportes > 0 ? (s.valor / stats.totalAportes) * 100 : 0;
                  return (
                    <div key={s.nome} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{s.nome}</span>
                        <span className="text-muted-foreground font-mono text-xs">
                          {formatCurrency(s.valor)} · {pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground border-t border-border pt-2">
                Total aportado: <span className="font-medium">{formatCurrency(stats.totalAportes)}</span>
              </p>
            </div>
          )}

          {/* Ultimos lancamentos */}
          <div className="stat-card space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Ultimos Lancamentos</h3>
            <div className="space-y-0">
              {[
                ...contasPagar.slice(0, 6).map((c: any) => ({ ...c, _tipo: "pagar" })),
                ...contasReceber.slice(0, 6).map((c: any) => ({ ...c, _tipo: "receber" })),
              ]
                .sort((a, b) => ((b.created_at || "") > (a.created_at || "") ? 1 : -1))
                .slice(0, 5)
                .map((item) => (
                  <div key={`${item._tipo}-${item.id}`} className="flex items-center justify-between text-sm py-2 border-b border-border/40 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusBadge status={item.status} />
                      <span className="truncate text-sm">{item.descricao}</span>
                    </div>
                    <span className={`font-medium font-mono ml-4 shrink-0 text-sm ${item._tipo === "pagar" ? "text-destructive" : "text-success"}`}>
                      {item._tipo === "pagar" ? "\u2212" : "+"}{formatCurrency(Number(item.valor))}
                    </span>
                  </div>
                ))}
            </div>
            <Link
              to="/lancamentos"
              className="flex items-center justify-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium pt-2 border-t border-border/40 transition-colors"
            >
              Ver todos os lancamentos
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

        </div>
      )}
    </div>
  );
}
