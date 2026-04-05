import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/mock-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useEmpresaData } from "@/hooks/useEmpresaData";
import { useEmpresa } from "@/contexts/EmpresaContext";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface DRERow {
  linha: string;
  [month: string]: string | number;
}

function buildDRE(
  contasReceber: Record<string, unknown>[],
  contasPagar: Record<string, unknown>[],
  ano: string,
  mode: "competencia" | "caixa"
): { table: DRERow[]; chart: { mes: string; resultado: number }[]; months: string[] } {
  // Determine which months have data
  const monthSet = new Set<string>();

  const getMonth = (item: Record<string, unknown>): string | null => {
    if (mode === "competencia") {
      const comp = item.competencia as string;
      return comp?.startsWith(ano) ? comp : null;
    } else {
      const dateField = "data_recebimento" in item ? item.data_recebimento : item.data_pagamento;
      const date = dateField as string;
      return date?.startsWith(ano) ? date.substring(0, 7) : null;
    }
  };

  // Aggregate by month
  const receitaByMonth = new Map<string, number>();
  const despesaByMonth = new Map<string, number>();

  contasReceber
    .filter((c) => !["cancelado", "perdido"].includes(c.status as string))
    .filter((c) => mode === "caixa" ? c.status === "recebido" : true)
    .forEach((c) => {
      const m = getMonth(c);
      if (m) {
        monthSet.add(m);
        receitaByMonth.set(m, (receitaByMonth.get(m) || 0) + Number(c.valor || 0));
      }
    });

  contasPagar
    .filter((c) => !["cancelado"].includes(c.status as string))
    .filter((c) => mode === "caixa" ? c.status === "pago" : true)
    .forEach((c) => {
      const m = getMonth(c);
      if (m) {
        monthSet.add(m);
        despesaByMonth.set(m, (despesaByMonth.get(m) || 0) + Number(c.valor || 0));
      }
    });

  const months = Array.from(monthSet).sort();
  if (months.length === 0) {
    // Show all 12 months with zeros
    for (let i = 1; i <= 12; i++) {
      months.push(`${ano}-${String(i).padStart(2, "0")}`);
    }
  }

  const monthKeys = months.map((m) => {
    const idx = parseInt(m.split("-")[1]) - 1;
    return { key: m, label: MONTH_LABELS[idx] || m };
  });

  // Build DRE rows
  const rows: DRERow[] = [];

  const addRow = (linha: string, values: Map<string, number>, negate = false) => {
    const row: DRERow = { linha };
    monthKeys.forEach(({ key, label }) => {
      const v = values.get(key) || 0;
      row[label] = negate ? -v : v;
    });
    rows.push(row);
    return row;
  };

  const calcRow = (linha: string, ...sourceRows: { row: DRERow; sign: number }[]) => {
    const row: DRERow = { linha };
    monthKeys.forEach(({ label }) => {
      row[label] = sourceRows.reduce((sum, { row: r, sign }) => sum + sign * (Number(r[label]) || 0), 0);
    });
    rows.push(row);
    return row;
  };

  const receitaBruta = addRow("Receita Bruta", receitaByMonth);
  
  // Deduções = 5% da receita bruta (simplificação gerencial)
  const deducoesMap = new Map<string, number>();
  months.forEach((m) => {
    deducoesMap.set(m, (receitaByMonth.get(m) || 0) * 0.05);
  });
  const deducoes = addRow("(-) Deduções", deducoesMap, true);
  
  const receitaLiquida = calcRow("Receita Líquida", { row: receitaBruta, sign: 1 }, { row: deducoes, sign: 1 });

  // Custos = categorias marcadas como custo (por enquanto, 30% da despesa total)
  const custosMap = new Map<string, number>();
  months.forEach((m) => {
    custosMap.set(m, (despesaByMonth.get(m) || 0) * 0.3);
  });
  const custos = addRow("(-) Custos", custosMap, true);

  const lucroBruto = calcRow("Lucro Bruto", { row: receitaLiquida, sign: 1 }, { row: custos, sign: 1 });

  // Despesas operacionais = 70% do total de despesas
  const despOpMap = new Map<string, number>();
  months.forEach((m) => {
    despOpMap.set(m, (despesaByMonth.get(m) || 0) * 0.7);
  });
  const despOp = addRow("(-) Despesas Operacionais", despOpMap, true);

  const resultadoOp = calcRow("Resultado Operacional", { row: lucroBruto, sign: 1 }, { row: despOp, sign: 1 });
  const resultadoFinal = calcRow("Resultado Final", { row: resultadoOp, sign: 1 });

  const chart = monthKeys.map(({ label }) => ({
    mes: label,
    resultado: Number(resultadoFinal[label]) || 0,
  }));

  return { table: rows, chart, months: monthKeys.map((mk) => mk.label) };
}

function DRETable({ data, months }: { data: DRERow[]; months: string[] }) {
  const isResultado = (linha: string) =>
    linha.includes("Resultado") || linha.includes("Lucro Bruto") || linha.includes("Receita Líquida");

  // Compute acumulado (sum of all months per row)
  return (
    <div className="stat-card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-56">Linha</th>
              {months.map((m) => (
                <th key={m} className="text-right">{m}</th>
              ))}
              <th className="text-right font-semibold">Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const acumulado = months.reduce((s, m) => s + (Number(row[m]) || 0), 0);
              return (
                <tr key={row.linha} className={isResultado(row.linha) ? "font-semibold" : ""}>
                  <td className={isResultado(row.linha) ? "text-foreground" : "text-muted-foreground"}>
                    {row.linha}
                  </td>
                  {months.map((m) => {
                    const v = Number(row[m]) || 0;
                    return (
                      <td key={m} className={`text-right ${v < 0 ? "text-destructive" : isResultado(row.linha) && v > 0 ? "text-success" : ""}`}>
                        {formatCurrency(v)}
                      </td>
                    );
                  })}
                  <td className={`text-right font-medium ${acumulado < 0 ? "text-destructive" : isResultado(row.linha) && acumulado > 0 ? "text-success" : ""}`}>
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

  const { data: contasReceber, loading: lr } = useEmpresaData<Record<string, unknown>>("contas_receber");
  const { data: contasPagar, loading: lp } = useEmpresaData<Record<string, unknown>>("contas_pagar");

  const loading = lr || lp;

  const dreComp = useMemo(() => buildDRE(contasReceber, contasPagar, ano, "competencia"), [contasReceber, contasPagar, ano]);
  const dreCaixa = useMemo(() => buildDRE(contasReceber, contasPagar, ano, "caixa"), [contasReceber, contasPagar, ano]);

  // Chart comparing competência vs caixa resultado final
  const chartData = useMemo(() => {
    return dreComp.months.map((mes, i) => ({
      mes,
      competencia: Number(dreComp.table[dreComp.table.length - 1]?.[mes]) || 0,
      caixa: Number(dreCaixa.table[dreCaixa.table.length - 1]?.[mes]) || 0,
    }));
  }, [dreComp, dreCaixa]);

  const years = Array.from({ length: 3 }, (_, i) => String(Number(currentYear) - i));

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">DRE Gerencial</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {empresaAtual?.nome || "—"} — {ano}
          </p>
        </div>
        <Select value={ano} onValueChange={setAno}>
          <SelectTrigger className="w-[120px] bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Carregando...</div>
      ) : contasReceber.length === 0 && contasPagar.length === 0 ? (
        <div className="stat-card text-center py-12">
          <p className="text-muted-foreground">Nenhum dado financeiro. Crie lançamentos em Contas a Pagar/Receber para visualizar a DRE.</p>
        </div>
      ) : (
        <>
          {/* Gráfico comparativo */}
          <div className="stat-card">
            <h3 className="section-title">Resultado Final — Competência vs Caixa</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 18%)" />
                  <XAxis dataKey="mes" stroke="hsl(215, 12%, 52%)" fontSize={12} />
                  <YAxis stroke="hsl(215, 12%, 52%)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(220, 18%, 11%)", border: "1px solid hsl(220, 16%, 18%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)" }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="competencia" fill="hsl(210, 100%, 56%)" radius={[4, 4, 0, 0]} name="Competência" />
                  <Bar dataKey="caixa" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} name="Caixa" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <Tabs defaultValue="competencia">
            <TabsList className="bg-secondary">
              <TabsTrigger value="competencia">Por Competência</TabsTrigger>
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
