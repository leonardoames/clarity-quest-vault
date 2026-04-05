import { useState } from "react";
import { Plus, Search, Filter, Copy, Edit, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/mock-data";
import { useEmpresaData } from "@/hooks/useEmpresaData";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function ContasPagar() {
  const { empresaAtual } = useEmpresa();
  const { user } = useAuth();
  const { toast } = useToast();
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filters = filtroStatus !== "todos" ? { status: filtroStatus } : {};
  const { data: contas, loading, insert, update } = useEmpresaData<Record<string, unknown>>("contas_pagar", {
    select: "*, fornecedores(nome), categorias_financeiras(nome), centros_custo(nome)",
    filters,
  });
  const { data: fornecedores } = useEmpresaData<Record<string, unknown>>("fornecedores", { orderBy: "nome" });
  const { data: categorias } = useEmpresaData<Record<string, unknown>>("categorias_financeiras", { orderBy: "nome" });
  const { data: centrosCusto } = useEmpresaData<Record<string, unknown>>("centros_custo", { orderBy: "nome" });

  const [form, setForm] = useState<Record<string, string>>({});

  const filtrados = contas.filter((c) => {
    const desc = (c.descricao as string || "").toLowerCase();
    const forn = ((c as any).fornecedores?.nome as string || "").toLowerCase();
    return desc.includes(busca.toLowerCase()) || forn.includes(busca.toLowerCase());
  });

  const totalFiltrado = filtrados.reduce((s, c) => s + Number(c.valor || 0), 0);

  const handleSave = async (status: string = "rascunho") => {
    if (!form.descricao || !form.valor || !form.vencimento || !form.competencia) return;
    await insert({
      descricao: form.descricao,
      valor: Number(form.valor),
      vencimento: form.vencimento,
      competencia: form.competencia,
      fornecedor_id: form.fornecedor_id || null,
      categoria_id: form.categoria_id || null,
      centro_custo_id: form.centro_custo_id || null,
      observacao: form.observacao || null,
      status,
      criado_por: user?.id,
      recorrencia: (form.recorrencia || "nenhuma") as any,
      parcela_atual: form.parcela_atual ? Number(form.parcela_atual) : null,
      total_parcelas: form.total_parcelas ? Number(form.total_parcelas) : null,
    } as any);
    setDialogOpen(false);
    setForm({});
  };

  const handleDuplicate = async (conta: Record<string, unknown>) => {
    await insert({
      descricao: conta.descricao,
      valor: conta.valor,
      vencimento: conta.vencimento,
      competencia: conta.competencia,
      fornecedor_id: conta.fornecedor_id,
      categoria_id: conta.categoria_id,
      centro_custo_id: conta.centro_custo_id,
      observacao: conta.observacao,
      status: "rascunho",
      criado_por: user?.id,
      recorrencia: conta.recorrencia,
    } as any);
  };

  const handleApprove = async (id: string) => {
    await update(id, { status: "aprovado", aprovado_por: user?.id, aprovado_em: new Date().toISOString() } as any);
  };

  const handleReject = async (id: string) => {
    await update(id, { status: "rascunho", observacao_aprovacao: "Reprovado" } as any);
  };

  const handleMarkPaid = async (id: string) => {
    await update(id, { status: "pago", data_pagamento: new Date().toISOString().split("T")[0] } as any);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtrados.length} lançamentos · Total: {formatCurrency(totalFiltrado)}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Lançamento</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader><DialogTitle>Novo Lançamento — Contas a Pagar</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Input value={form.descricao || ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="bg-secondary border-border" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$) *</Label>
                  <Input type="number" step="0.01" value={form.valor || ""} onChange={(e) => setForm({ ...form, valor: e.target.value })} className="bg-secondary border-border" />
                </div>
                <div className="space-y-2">
                  <Label>Vencimento *</Label>
                  <Input type="date" value={form.vencimento || ""} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} className="bg-secondary border-border" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Competência *</Label>
                <Input type="month" value={form.competencia || ""} onChange={(e) => setForm({ ...form, competencia: e.target.value })} className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Select value={form.fornecedor_id || ""} onValueChange={(v) => setForm({ ...form, fornecedor_id: v })}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {fornecedores.map((f) => <SelectItem key={f.id as string} value={f.id as string}>{f.nome as string}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={form.categoria_id || ""} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {categorias.filter((c) => ["despesa", "ambos"].includes(c.tipo as string)).map((c) => <SelectItem key={c.id as string} value={c.id as string}>{c.nome as string}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Centro de Custo</Label>
                  <Select value={form.centro_custo_id || ""} onValueChange={(v) => setForm({ ...form, centro_custo_id: v })}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {centrosCusto.map((c) => <SelectItem key={c.id as string} value={c.id as string}>{c.nome as string}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Recorrência</Label>
                  <Select value={form.recorrencia || "nenhuma"} onValueChange={(v) => setForm({ ...form, recorrencia: v })}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhuma">Nenhuma</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="bimestral">Bimestral</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="semestral">Semestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Parcelas (atual/total)</Label>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="1" value={form.parcela_atual || ""} onChange={(e) => setForm({ ...form, parcela_atual: e.target.value })} className="bg-secondary border-border" />
                    <Input type="number" placeholder="1" value={form.total_parcelas || ""} onChange={(e) => setForm({ ...form, total_parcelas: e.target.value })} className="bg-secondary border-border" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observação</Label>
                <Textarea value={form.observacao || ""} onChange={(e) => setForm({ ...form, observacao: e.target.value })} className="bg-secondary border-border" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setDialogOpen(false); setForm({}); }}>Cancelar</Button>
                <Button variant="secondary" onClick={() => handleSave("rascunho")}>Salvar Rascunho</Button>
                <Button onClick={() => handleSave("pendente")}>Enviar p/ Aprovação</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por descrição ou fornecedor..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9 bg-secondary border-border" />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[160px] bg-secondary border-border">
            <Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="stat-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Fornecedor</th>
                <th>Categoria</th>
                <th>Centro de Custo</th>
                <th className="text-right">Valor</th>
                <th>Vencimento</th>
                <th>Competência</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center text-muted-foreground">Carregando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-muted-foreground">Nenhum lançamento encontrado</td></tr>
              ) : filtrados.map((conta) => (
                <tr key={conta.id as string}>
                  <td className="font-medium">{conta.descricao as string}</td>
                  <td className="text-muted-foreground">{(conta as any).fornecedores?.nome || "—"}</td>
                  <td className="text-muted-foreground">{(conta as any).categorias_financeiras?.nome || "—"}</td>
                  <td className="text-muted-foreground">{(conta as any).centros_custo?.nome || "—"}</td>
                  <td className="text-right font-medium">{formatCurrency(Number(conta.valor))}</td>
                  <td className="text-muted-foreground">{new Date(conta.vencimento as string).toLocaleDateString("pt-BR")}</td>
                  <td className="text-muted-foreground">{conta.competencia as string}</td>
                  <td><StatusBadge status={conta.status as string} /></td>
                  <td>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar" onClick={() => handleDuplicate(conta)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {conta.status === "pendente" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-success" title="Aprovar" onClick={() => handleApprove(conta.id as string)}>
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Reprovar" onClick={() => handleReject(conta.id as string)}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {conta.status === "aprovado" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-success" onClick={() => handleMarkPaid(conta.id as string)}>
                          Pagar
                        </Button>
                      )}
                    </div>
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
