import { useState } from "react";
import { Plus, Search, Filter, Users as UsersIcon, ArrowUpRight, ArrowDownRight, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/mock-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEmpresaData } from "@/hooks/useEmpresaData";
import { useAuth } from "@/contexts/AuthContext";

const TIPO_LABELS: Record<string, string> = {
  aporte_capital: "Aporte de Capital",
  emprestimo_socio: "Empréstimo do Sócio",
  adiantamento_socio: "Adiantamento do Sócio",
  retirada_socio: "Retirada do Sócio",
  devolucao_socio: "Devolução ao Sócio",
};

const TIPO_ENTRADA: Record<string, boolean> = {
  aporte_capital: true,
  emprestimo_socio: true,
  adiantamento_socio: true,
  retirada_socio: false,
  devolucao_socio: false,
};

export default function Aportes() {
  const { user } = useAuth();
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: movimentacoes, loading, insert, update } = useEmpresaData<Record<string, unknown>>("movimentacoes_societarias", {
    select: "*, socios(nome)",
  });
  const { data: socios } = useEmpresaData<Record<string, unknown>>("socios", { orderBy: "nome" });

  const filtrados = movimentacoes.filter((m) => {
    const matchTipo = filtroTipo === "todos" || m.tipo === filtroTipo;
    const socioNome = ((m as any).socios?.nome || "").toLowerCase();
    const desc = ((m.descricao as string) || "").toLowerCase();
    return matchTipo && (socioNome.includes(busca.toLowerCase()) || desc.includes(busca.toLowerCase()));
  });

  // Resumo por sócio
  const resumoSocios = socios.map((s) => {
    const movs = movimentacoes.filter((m) => m.socio_id === s.id && m.status === "aprovado");
    const totalEntrada = movs.filter((m) => TIPO_ENTRADA[m.tipo as string]).reduce((acc, m) => acc + Number(m.valor), 0);
    const totalSaida = movs.filter((m) => !TIPO_ENTRADA[m.tipo as string]).reduce((acc, m) => acc + Number(m.valor), 0);
    return { id: s.id, nome: s.nome as string, totalAportado: totalEntrada, totalRetirado: totalSaida, saldoLiquido: totalEntrada - totalSaida };
  }).filter((s) => s.totalAportado > 0 || s.totalRetirado > 0);

  const handleSave = async () => {
    if (!form.socio_id || !form.tipo || !form.valor) return;
    await insert({
      socio_id: form.socio_id,
      tipo: form.tipo,
      valor: Number(form.valor),
      data: form.data || new Date().toISOString().split("T")[0],
      descricao: form.descricao || null,
      status: "rascunho",
      criado_por: user?.id,
    } as any);
    setDialogOpen(false);
    setForm({});
  };

  const handleApprove = async (id: string) => {
    await update(id, { status: "aprovado", aprovado_por: user?.id, aprovado_em: new Date().toISOString() } as any);
  };

  const handleReject = async (id: string) => {
    await update(id, { status: "reprovado", observacao_aprovacao: "Reprovado" } as any);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Aportes e Movimentações</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestão societária</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Movimentação</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-lg">
            <DialogHeader><DialogTitle>Nova Movimentação Societária</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Sócio *</Label>
                <Select value={form.socio_id || ""} onValueChange={(v) => setForm({ ...form, socio_id: v })}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecionar sócio" /></SelectTrigger>
                  <SelectContent>
                    {socios.map((s) => <SelectItem key={s.id as string} value={s.id as string}>{s.nome as string}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.tipo || ""} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Tipo de movimentação" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.valor || ""} onChange={(e) => setForm({ ...form, valor: e.target.value })} className="bg-secondary border-border" /></div>
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.data || ""} onChange={(e) => setForm({ ...form, data: e.target.value })} className="bg-secondary border-border" /></div>
              </div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.descricao || ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="bg-secondary border-border" /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>Salvar Rascunho</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {resumoSocios.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resumoSocios.map((s) => (
            <div key={s.id as string} className="stat-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10"><UsersIcon className="h-4 w-4 text-primary" /></div>
                <span className="font-medium">{s.nome}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground block">Aportado</span><span className="font-medium text-success">{formatCurrency(s.totalAportado)}</span></div>
                <div><span className="text-muted-foreground block">Retirado</span><span className="font-medium text-destructive">{formatCurrency(s.totalRetirado)}</span></div>
                <div><span className="text-muted-foreground block">Saldo Líquido</span><span className="font-medium text-primary">{formatCurrency(s.saldoLiquido)}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por sócio ou descrição..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9 bg-secondary border-border" />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-full sm:w-[200px] bg-secondary border-border"><Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TIPO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="stat-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Tipo</th><th>Sócio</th><th>Descrição</th><th className="text-right">Valor</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center text-muted-foreground">Carregando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted-foreground">Nenhuma movimentação</td></tr>
              ) : filtrados.map((m) => (
                <tr key={m.id as string}>
                  <td>
                    <div className="flex items-center gap-2">
                      {TIPO_ENTRADA[m.tipo as string] ? <ArrowUpRight className="h-4 w-4 text-success" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}
                      <span className="text-sm">{TIPO_LABELS[m.tipo as string]}</span>
                    </div>
                  </td>
                  <td className="font-medium">{(m as any).socios?.nome || "—"}</td>
                  <td className="text-muted-foreground">{(m.descricao as string) || "—"}</td>
                  <td className={`text-right font-medium ${TIPO_ENTRADA[m.tipo as string] ? "text-success" : "text-destructive"}`}>{formatCurrency(Number(m.valor))}</td>
                  <td className="text-muted-foreground">{new Date(m.data as string).toLocaleDateString("pt-BR")}</td>
                  <td><StatusBadge status={m.status as string} /></td>
                  <td>
                    {(m.status === "pendente" || m.status === "rascunho") && (
                      <div className="flex gap-1">
                        {m.status === "rascunho" && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => update(m.id as string, { status: "pendente" } as any)}>
                            Enviar
                          </Button>
                        )}
                        {m.status === "pendente" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => handleApprove(m.id as string)}><CheckCircle className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleReject(m.id as string)}><XCircle className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                      </div>
                    )}
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
