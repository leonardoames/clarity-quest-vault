import { useState } from "react";
import { Plus, Search, Filter, Users as UsersIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/mock-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TIPO_LABELS: Record<string, string> = {
  aporte_capital: "Aporte de Capital",
  emprestimo_socio: "Empréstimo do Sócio",
  adiantamento_socio: "Adiantamento do Sócio",
  retirada_socio: "Retirada do Sócio",
  devolucao_socio: "Devolução ao Sócio",
};

const TIPO_ICONS: Record<string, boolean> = {
  aporte_capital: true,
  emprestimo_socio: true,
  adiantamento_socio: true,
  retirada_socio: false,
  devolucao_socio: false,
};

// Mock data
const mockMovimentacoes = [
  { id: "1", socio: "Lucas Mendes", tipo: "aporte_capital", valor: 50000, data: "2026-04-01", status: "aprovado", descricao: "Aporte inicial Q2" },
  { id: "2", socio: "Ana Ferreira", tipo: "aporte_capital", valor: 30000, data: "2026-04-01", status: "aprovado", descricao: "Aporte inicial Q2" },
  { id: "3", socio: "Lucas Mendes", tipo: "retirada_socio", valor: 10000, data: "2026-04-10", status: "pendente", descricao: "Retirada mensal" },
  { id: "4", socio: "Ana Ferreira", tipo: "emprestimo_socio", valor: 20000, data: "2026-03-15", status: "aprovado", descricao: "Empréstimo para capital de giro" },
  { id: "5", socio: "Lucas Mendes", tipo: "devolucao_socio", valor: 5000, data: "2026-03-20", status: "rascunho", descricao: "Devolução parcial empréstimo" },
];

const mockResumoSocios = [
  { socio: "Lucas Mendes", totalAportado: 80000, totalRetirado: 10000, saldoLiquido: 70000 },
  { socio: "Ana Ferreira", totalAportado: 50000, totalRetirado: 0, saldoLiquido: 50000 },
];

export default function Aportes() {
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtrados = mockMovimentacoes.filter((m) => {
    const matchTipo = filtroTipo === "todos" || m.tipo === filtroTipo;
    const matchBusca = m.socio.toLowerCase().includes(busca.toLowerCase()) || m.descricao.toLowerCase().includes(busca.toLowerCase());
    return matchTipo && matchBusca;
  });

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Aportes e Movimentações</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestão societária — Empresa Alpha</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Movimentação</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Nova Movimentação Societária</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setDialogOpen(false); }}>
              <div className="space-y-2">
                <Label>Sócio</Label>
                <Select><SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecionar sócio" /></SelectTrigger>
                  <SelectContent><SelectItem value="1">Lucas Mendes</SelectItem><SelectItem value="2">Ana Ferreira</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select><SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Tipo de movimentação" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" placeholder="0,00" className="bg-secondary border-border" /></div>
                <div className="space-y-2"><Label>Data</Label><Input type="date" className="bg-secondary border-border" /></div>
              </div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea placeholder="Observações..." className="bg-secondary border-border" /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar Rascunho</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumo por sócio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockResumoSocios.map((s) => (
          <div key={s.socio} className="stat-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10"><UsersIcon className="h-4 w-4 text-primary" /></div>
              <span className="font-medium">{s.socio}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground block">Aportado</span><span className="font-medium text-success">{formatCurrency(s.totalAportado)}</span></div>
              <div><span className="text-muted-foreground block">Retirado</span><span className="font-medium text-destructive">{formatCurrency(s.totalRetirado)}</span></div>
              <div><span className="text-muted-foreground block">Saldo Líquido</span><span className="font-medium text-primary">{formatCurrency(s.saldoLiquido)}</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por sócio ou descrição..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9 bg-secondary border-border" />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[200px] bg-secondary border-border"><Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TIPO_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="stat-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Tipo</th><th>Sócio</th><th>Descrição</th><th className="text-right">Valor</th><th>Data</th><th>Status</th></tr></thead>
            <tbody>
              {filtrados.map((m) => (
                <tr key={m.id} className="cursor-pointer">
                  <td>
                    <div className="flex items-center gap-2">
                      {TIPO_ICONS[m.tipo] ? <ArrowUpRight className="h-4 w-4 text-success" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}
                      <span className="text-sm">{TIPO_LABELS[m.tipo]}</span>
                    </div>
                  </td>
                  <td className="font-medium">{m.socio}</td>
                  <td className="text-muted-foreground">{m.descricao}</td>
                  <td className={`text-right font-medium ${TIPO_ICONS[m.tipo] ? "text-success" : "text-destructive"}`}>{formatCurrency(m.valor)}</td>
                  <td className="text-muted-foreground">{new Date(m.data).toLocaleDateString("pt-BR")}</td>
                  <td><StatusBadge status={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
