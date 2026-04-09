import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/mock-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useEmpresaData } from "@/hooks/useEmpresaData";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { StatCard } from "@/components/StatCard";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Patterns to classify contas_pagar by category name
const DEDUCTION_PATTERNS = /imposto|tributo|taxa|icms|iss|pis|cofins|csll|irpj|inss|fgts|dedu[cç]/i;
const COST_PATTERNS = /custo|mat[eé]ria|insumo|produ[cç]|cogs|cmv|csv|mercadoria|servi[cç]o.?prestado/i;

interface Categoria {
  id: string;
  nome: string;
  tipo: "receita" | "despesa" | "ambos";
  ativa: boolean;
}

interface ContaFinanceira {
  id: string;
  valor: number;
  competencia: string;
  status: string;
  categoria_id: string | null;
  data_pagamento?: string | null;
  data_recebimento?: string | null;
  juros?: number;
  multa?: number;
  desconto?: number;
  taxas?: number;
}

interface DRERow {
  linha: string;
  isHeader?: boolean;
  isSeparator?: boolean;
  [month: string]: string | number | boolean | undefined;
}

type DREMode = "competencia" | "caixa";

/**
 * Classifies a category into a DRE group based on name patterns.
 */
function classifyCategory(cat: Categoria): "deducao" | "custo" | "despesa_operacional" {
  const nome = cat.nome;
  if (DEDUCTION_PATTERNS.test(nome)) return "deducao";
  if (COST_PATTERNS.test(nome)) return "custo";
  return "despesa_operacional";
}

/**
 * Gets the relevant month key (YYYY-MM) for a financial record based on the DRE mode.
 */
function getMonthKey(item: ContaFinanceira, ano: string, mode: DREMode, isReceita: boolean): string | null {
  if (mode === "competencia") {
    const comp = item.competencia;
    return comp?.startsWith(ano) ? comp : null;
  }
  // Caixa mode: use actual payment/receipt date
  const dateField = isReceita ? item.data_recebimento : item.data_pagamento;
  const date = dateField as string | null;
  return date?.startsWith(ano) ? date.substring(0, 7) : null;
}

function buildDRE(
  contasReceber: ContaFinanceira[],
  contasPagar: ContaFinanceira[],
  categorias: Categoria[],
  ano: string,
  mode: DREMode
): {
  table: DRERow[];
  chartData: { mes: string; receitas: number; despesas: number }[];
  months: string[];
  resultadoAnual: number;
  receitaAnual: number;
  despesaAnual: number;
} {
  // Build category lookup
  const catMap = new Map<string, Categoria>();
  categorias.forEach((c) => catMap.set(c.id, c));

  // Initialize all 12 months
  const allMonths: string[] = [];
  for (let i = 1; i <= 12; i++) {
    allMonths.push(`${ano}-${String(i).padStart(2, "0")}`);
  }
  const monthKeys = allMonths.map((m) => {
    const idx = parseInt(m.split("-")[1]) - 1;
    return { key: m, label: MONTH_LABELS[idx] };
  });

  // Aggregate receitas (contas_receber)
  const receitaByMonth = new Map<string, number>();
  const jurosRecebidosByMonth = new Map<string, number>();

  contasReceber
    .filter((c) => !["cancelado", "perdido"].includes(c.status))
    .filter((c) => (mode === "caixa" ? c.status === "recebido" : true))
    .forEach((c) => {
      const m = getMonthKey(c, ano, mode, true);
      if (m) {
        receitaByMonth.set(m, (receitaByMonth.get(m) || 0) + Number(c.valor || 0));
        // Track juros received if field exists
        const juros = Number(c.juros || 0);
        if (juros > 0) {
          jurosRecebidosByMonth.set(m, (jurosRecebidosByMonth.get(m) || 0) + juros);
        }
      }
    });

  // Classify and aggregate contas_pagar by DRE category
  const deducoesByMonth = new Map<string, number>();
  const custosByMonth = new Map<string, number>();
  const despOpByMonth = new Map<string, number>();
  const jurosPagosByMonth = new Map<string, number>();

  contasPagar
    .filter((c) => c.status !== "cancelado")
    .filter((c) => (mode === "caixa" ? c.status === "pago" : true))
    .forEach((c) => {
      const m = getMonthKey(c, ano, mode, false);
      if (!m) return;

      const valor = Number(c.valor || 0);
      const juros = Number(c.juros || 0);

      // Track juros paid if field exists
      if (juros > 0) {
        jurosPagosByMonth.set(m, (jurosPagosByMonth.get(m) || 0) + juros);
      }

      // Classify based on category
      const cat = c.categoria_id ? catMap.get(c.categoria_id) : null;
      if (cat) {
        const classification = classifyCategory(cat);
        switch (classification) {
          case "deducao":
            deducoesByMonth.set(m, (deducoesByMonth.get(m) || 0) + valor);
            break;
          case "custo":
            custosByMonth.set(m, (custosByMonth.get(m) || 0) + valor);
            break;
          case "despesa_operacional":
            despOpByMonth.set(m, (despOpByMonth.get(m) || 0) + valor);
            break;
        }
      } else {
        // No category assigned -> treat as operational expense
        despOpByMonth.set(m, (despOpByMonth.get(m) || 0) + valor);
      }
    });

  // Build DRE rows
  const rows: DRERow[] = [];

  const makeValueRow = (linha: string, values: Map<string, number>, negate = false, isHeader = false): DRERow => {
    const row: DRERow = { linha, isHeader };
    monthKeys.forEach(({ key, label }) => {
      const v = values.get(key) || 0;
      row[label] = negate ? -v : v;
    });
    rows.push(row);
    return row;
  };

  const makeCalcRow = (linha: string, isHeader: boolean, ...sources: { row: DRERow; sign: number }[]): DRERow => {
    const row: DRERow = { linha, isHeader };
    monthKeys.forEach(({ label }) => {
      row[label] = sources.reduce((sum, { row: r, sign }) => sum + sign * (Number(r[label]) || 0), 0);
    });
    rows.push(row);
    return row;
  };

  const makeSeparator = (): void => {
    rows.push({ linha: "", isSeparator: true });
  };

  // 1. Receita Bruta
  const receitaBruta = makeValueRow("Receita Bruta", receitaByMonth, false, true);

  // 2. (-) Deducoes sobre Receita
  const deducoes = makeValueRow("(-) Deduções sobre Receita", deducoesByMonth, true);

  makeSeparator();

  // 3. = Receita Liquida
  const receitaLiquida = makeCalcRow("= Receita Líquida", true,
    { row: receitaBruta, sign: 1 },
    { row: deducoes, sign: 1 }
  );

  // 4. (-) Custos dos Serviços/Produtos
  const custos = makeValueRow("(-) Custos dos Serviços/Produtos", custosByMonth, true);

  makeSeparator();

  // 5. = Lucro Bruto
  const lucroBruto = makeCalcRow("= Lucro Bruto", true,
    { row: receitaLiquida, sign: 1 },
    { row: custos, sign: 1 }
  );

  // 6. (-) Despesas Operacionais
  const despOp = makeValueRow("(-) Despesas Operacionais", despOpByMonth, true);

  makeSeparator();

  // 7. = Resultado Operacional
  const resultadoOp = makeCalcRow("= Resultado Operacional", true,
    { row: lucroBruto, sign: 1 },
    { row: despOp, sign: 1 }
  );

  // 8. (+/-) Resultado Financeiro = juros recebidos - juros pagos
  const resultadoFinMap = new Map<string, number>();
  allMonths.forEach((m) => {
    const recebidos = jurosRecebidosByMonth.get(m) || 0;
    const pagos = jurosPagosByMonth.get(m) || 0;
    const resultado = recebidos - pagos;
    if (resultado !== 0) resultadoFinMap.set(m, resultado);
  });
  const resultadoFin = makeValueRow("(+/-) Resultado Financeiro", resultadoFinMap);

  makeSeparator();

  // 9. = Resultado Líquido
  const resultadoLiquido = makeCalcRow("= Resultado Líquido", true,
    { row: resultadoOp, sign: 1 },
    { row: resultadoFin, sign: 1 }
  );

  // Calculate annual totals
  const labels = monthKeys.map((mk) => mk.label);
  const resultadoAnual = labels.reduce((s, l) => s + (Number(resultadoLiquido[l]) || 0), 0);
  const receitaAnual = labels.reduce((s, l) => s + (Number(receitaBruta[l]) || 0), 0);
  const despesaTotalAnual = labels.reduce((s, l) => {
    return s + Math.abs(Number(deducoes[l]) || 0) + Math.abs(Number(custos[l]) || 0) + Math.abs(Number(despOp[l]) || 0);
  }, 0);

  // Chart data: receitas vs despesas by month
  const chartData = monthKeys.map(({ key, label }) => ({
    mes: label,
    receitas: receitaByMonth.get(key) || 0,
    despesas: (deducoesByMonth.get(key) || 0) + (custosByMonth.get(key) || 0) + (despOpByMonth.get(key) || 0),
  }));

  return {
    table: rows,
    chartData,
    months: labels,
    resultadoAnual,
    receitaAnual,
    despesaAnual: despesaTotalAnual,
  };
}

function DRETable({ data, months }: { data: DRERow[]; months: string[] }) {
  return (
    <div className="stat-card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="min-w-[180px] sm:w-64">Linha</th>
              {months.map((m) => (
                <th key={m} className="text-right">{m}</th>
              ))}
              <th className="text-right font-semibold">Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              if (row.isSeparator) {
                return (
                  <tr key={`sep-${idx}`}>
                    <td colSpan={months.length + 2} className="h-1 p-0">
                      <div className="border-t border-border/50" />
                    </td>
                  </tr>
                );
              }

              const acumulado = months.reduce((s, m) => s + (Number(row[m]) || 0), 0);
              const isResult = row.isHeader === true;
              const isNegativeLine = row.linha.startsWith("(-)");
              const isPositiveLine = row.linha.startsWith("(+");

              return (
                <tr
                  key={row.linha}
                  className={
                    isResult
                      ? "font-semibold bg-secondary/30"
                      : ""
                  }
                >
                  <td
                    className={
                      isResult
                        ? "text-foreground font-semibold"
                        : isNegativeLine
                        ? "text-destructive/80"
                        : isPositiveLine
                        ? "text-success/80"
                        : "text-muted-foreground"
                    }
                  >
                    {row.linha}
                  </td>
                  {months.map((m) => {
                    const v = Number(row[m]) || 0;
                    return (
                      <td
                        key={m}
                        className={`text-right tabular-nums ${
                          v < 0
                            ? "text-destructive"
                            : v > 0 && isResult
                            ? "text-success"
                            : ""
                        }`}
                      >
                        {formatCurrency(v)}
                      </td>
                    );
                  })}
                  <td
                    className={`text-right font-medium tabular-nums ${
                      acumulado < 0
                        ? "text-destructive"
                        : acumulado > 0 && isResult
                        ? "text-success"
                        : ""
                    }`}
                  >
                    {formatCurrency(acumulado)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DRE() {
  const { empresaAtual } = useEmpresa();
  const currentYear = new Date().getFullYear().toString();
  const [ano, setAno] = useState(currentYear);

  const { data: rawContasReceber, loading: lr } = useEmpresaData<Record<string, unknown>>("contas_receber");
  const { data: rawContasPagar, loading: lp } = useEmpresaData<Record<string, unknown>>("contas_pagar");
  const { data: rawCategorias, loading: lc } = useEmpresaData<Record<string, unknown>>("categorias_financeiras");

  const loading = lr || lp || lc;

  // Cast to typed arrays
  const contasReceber = rawContasReceber as unknown as ContaFinanceira[];
  const contasPagar = rawContasPagar as unknown as ContaFinanceira[];
  const categorias = rawCategorias as unknown as Categoria[];

  const dreComp = useMemo(
    () => buildDRE(contasReceber, contasPagar, categorias, ano, "competencia"),
    [contasReceber, contasPagar, categorias, ano]
  );
  const dreCaixa = useMemo(
    () => buildDRE(contasReceber, contasPagar, categorias, ano, "caixa"),
    [contasReceber, contasPagar, categorias, ano]
  );

  // Chart comparing receitas vs despesas (competencia mode)
  const chartData = dreComp.chartData;

  const years = Array.from({ length: 5 }, (_, i) => String(Number(currentYear) - i));

  const resultadoAnual = dreComp.resultadoAnual;
  const receitaAnual = dreComp.receitaAnual;
  const despesaAnual = dreComp.despesaAnual;
  const margemLiquida = receitaAnual > 0 ? ((resultadoAnual / receitaAnual) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">DRE Gerencial</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Demonstrativo de Resultado do Exercicio — {empresaAtual?.nome || "—"} — {ano}
          </p>
        </div>
        <Select value={ano} onValueChange={setAno}>
          <SelectTrigger className="w-[120px] bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Carregando...</div>
      ) : contasReceber.length === 0 && contasPagar.length === 0 ? (
        <div className="stat-card text-center py-12">
          <p className="text-muted-foreground">
            Nenhum dado financeiro. Crie lancamentos em Contas a Pagar/Receber para visualizar a DRE.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Resultado Liquido do Ano"
              value={formatCurrency(resultadoAnual)}
              icon={resultadoAnual >= 0 ? TrendingUp : TrendingDown}
              variant={resultadoAnual >= 0 ? "success" : "danger"}
              trend={`Margem: ${margemLiquida}%`}
              trendUp={resultadoAnual >= 0}
            />
            <StatCard
              title="Receita Bruta"
              value={formatCurrency(receitaAnual)}
              icon={TrendingUp}
              variant="primary"
            />
            <StatCard
              title="Total Despesas + Custos"
              value={formatCurrency(despesaAnual)}
              icon={DollarSign}
              variant={despesaAnual > receitaAnual ? "danger" : "warning"}
            />
          </div>

          {/* Chart: Receitas vs Despesas */}
          <div className="stat-card">
            <h3 className="section-title">Receitas vs Despesas por Mes</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 18%)" />
                  <XAxis dataKey="mes" stroke="hsl(215, 12%, 52%)" fontSize={12} />
                  <YAxis
                    stroke="hsl(215, 12%, 52%)"
                    fontSize={12}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(220, 18%, 11%)",
                      border: "1px solid hsl(220, 16%, 18%)",
                      borderRadius: "8px",
                      color: "hsl(210, 20%, 92%)",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="receitas" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} name="Receitas" />
                  <Bar dataKey="despesas" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DRE Tables */}
          <Tabs defaultValue="competencia">
            <TabsList className="bg-secondary">
              <TabsTrigger value="competencia">Por Competencia</TabsTrigger>
              <TabsTrigger value="caixa">Por Caixa</TabsTrigger>
            </TabsList>
            <TabsContent value="competencia" className="mt-4">
              <DRETable data={dreComp.table} months={dreComp.months} />
            </TabsContent>
            <TabsContent value="caixa" className="mt-4">
              <DRETable data={dreCaixa.table} months={dreCaixa.months} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
