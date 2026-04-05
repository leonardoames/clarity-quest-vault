import { useState } from "react";
import { Plus, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/mock-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const mockDistribuicoes = [
  {
    id: "1", competencia: "2026-03", valorTotal: 30000, dataEfetiva: "2026-03-28", status: "aprovado",
    socios: [{ socio: "Lucas Mendes", valor: 18000 }, { socio: "Ana Ferreira", valor: 12000 }],
  },
  {
    id: "2", competencia: "2026-02", valorTotal: 25000, dataEfetiva: "2026-02-27", status: "aprovado",
    socios: [{ socio: "Lucas Mendes", valor: 15000 }, { socio: "Ana Ferreira", valor: 10000 }],
  },
  {
    id: "3", competencia: "2026-04", valorTotal: 35000, dataEfetiva: null, status: "pendente",
    socios: [{ socio: "Lucas Mendes", valor: 21000 }, { socio: "Ana Ferreira", valor: 14000 }],
  },
];

export default function Distribuicao() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const totalDistribuido = mockDistribuicoes
    .filter((d) => d.status === "aprovado")
    .reduce((s, d) => s + d.valorTotal, 0);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Distribuição de Lucros</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Total distribuído: {formatCurrency(totalDistribuido)}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Distribuição</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader><DialogTitle>Nova Distribuição de Lucro</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setDialogOpen(false); }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Competência</Label><Input type="month" className="bg-secondary border-border" /></div>
                <div className="space-y-2"><Label>Data Efetiva</Label><Input type="date" className="bg-secondary border-border" /></div>
              </div>
              <div className="space-y-3">
                <Label>Valores por Sócio</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm w-32">Lucas Mendes</span>
                    <Input type="number" step="0.01" placeholder="0,00" className="bg-secondary border-border" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm w-32">Ana Ferreira</span>
                    <Input type="number" step="0.01" placeholder="0,00" className="bg-secondary border-border" />
                  </div>
                </div>
              </div>
              <div className="space-y-2"><Label>Observação</Label><Textarea className="bg-secondary border-border" /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar Rascunho</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {mockDistribuicoes.map((d) => (
          <div key={d.id} className="stat-card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10"><PieChart className="h-4 w-4 text-warning" /></div>
                <div>
                  <p className="font-medium">Competência {d.competencia}</p>
                  <p className="text-sm text-muted-foreground">
                    {d.dataEfetiva ? `Pago em ${new Date(d.dataEfetiva).toLocaleDateString("pt-BR")}` : "Pagamento pendente"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-warning">{formatCurrency(d.valorTotal)}</span>
                <StatusBadge status={d.status} />
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <div className="grid grid-cols-2 gap-4">
                {d.socios.map((s) => (
                  <div key={s.socio} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{s.socio}</span>
                    <span className="font-medium">{formatCurrency(s.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
