import { useState } from "react";
import { formatCurrency } from "@/lib/mock-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const dreCompetencia = [
  { linha: "Receita Bruta", jan: 78000, fev: 95000, mar: 110000, abr: 130700 },
  { linha: "(-) Deduções", jan: -3900, fev: -4750, mar: -5500, abr: -6535 },
  { linha: "Receita Líquida", jan: 74100, fev: 90250, mar: 104500, abr: 124165 },
  { linha: "(-) Custos", jan: -25000, fev: -28000, mar: -30000, abr: -32000 },
  { linha: "Lucro Bruto", jan: 49100, fev: 62250, mar: 74500, abr: 92165 },
  { linha: "(-) Despesas Operacionais", jan: -30000, fev: -30000, mar: -33000, abr: -35000 },
  { linha: "Resultado Operacional", jan: 19100, fev: 32250, mar: 41500, abr: 57165 },
  { linha: "Resultado Final", jan: 19100, fev: 32250, mar: 41500, abr: 57165 },
];

const dreCaixa = [
  { linha: "Receita Bruta", jan: 65000, fev: 88000, mar: 105000, abr: 8500 },
  { linha: "(-) Deduções", jan: -3250, fev: -4400, mar: -5250, abr: -425 },
  { linha: "Receita Líquida", jan: 61750, fev: 83600, mar: 99750, abr: 8075 },
  { linha: "(-) Custos", jan: -22000, fev: -26000, mar: -28000, abr: -320 },
  { linha: "Lucro Bruto", jan: 39750, fev: 57600, mar: 71750, abr: 7755 },
  { linha: "(-) Despesas Operacionais", jan: -28000, fev: -29000, mar: -32000, abr: -4500 },
  { linha: "Resultado Operacional", jan: 11750, fev: 28600, mar: 39750, abr: 3255 },
  { linha: "Resultado Final", jan: 11750, fev: 28600, mar: 39750, abr: 3255 },
];

const chartData = [
  { mes: "Jan", competencia: 19100, caixa: 11750 },
  { mes: "Fev", competencia: 32250, caixa: 28600 },
  { mes: "Mar", competencia: 41500, caixa: 39750 },
  { mes: "Abr", competencia: 57165, caixa: 3255 },
];

function DRETable({ data }: { data: typeof dreCompetencia }) {
  const isResultado = (linha: string) => linha.includes("Resultado") || linha.includes("Lucro Bruto") || linha.includes("Receita Líquida");

  return (
    <div className="stat-card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-64">Linha</th>
              <th className="text-right">Jan</th>
              <th className="text-right">Fev</th>
              <th className="text-right">Mar</th>
              <th className="text-right">Abr</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.linha} className={isResultado(row.linha) ? "font-semibold" : ""}>
                <td className={isResultado(row.linha) ? "text-foreground" : "text-muted-foreground"}>
                  {row.linha}
                </td>
                {(["jan", "fev", "mar", "abr"] as const).map((m) => (
                  <td key={m} className={`text-right ${row[m] < 0 ? "text-destructive" : isResultado(row.linha) ? "text-success" : ""}`}>
                    {formatCurrency(row[m])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DRE() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">DRE Gerencial</h1>
          <p className="text-sm text-muted-foreground mt-1">Empresa Alpha — 2026</p>
        </div>
        <Select defaultValue="2026">
          <SelectTrigger className="w-[120px] bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="2026">2026</SelectItem><SelectItem value="2025">2025</SelectItem></SelectContent>
        </Select>
      </div>

      {/* Gráfico comparativo */}
      <div className="stat-card">
        <h3 className="section-title">Resultado Final — Comparação</h3>
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
          <DRETable data={dreCompetencia} />
        </TabsContent>
        <TabsContent value="caixa" className="mt-4">
          <DRETable data={dreCaixa} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
