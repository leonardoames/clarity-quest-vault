import { useState, useEffect } from "react";
import { Plus, ArrowLeft, Pencil, Copy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { logAcao } from "@/lib/audit";

interface Empresa {
  id: string;
  nome: string;
  razao_social: string | null;
  cnpj: string | null;
  moeda_padrao: string;
  data_inicio_operacional: string | null;
  segmento: string | null;
  observacoes_internas: string | null;
  ativa: boolean;
}

interface FormState {
  nome: string;
  razao_social: string;
  cnpj: string;
  moeda_padrao: string;
  data_inicio_operacional: string;
  segmento: string;
  observacoes_internas: string;
}

const EMPTY_FORM: FormState = {
  nome: "",
  razao_social: "",
  cnpj: "",
  moeda_padrao: "BRL",
  data_inicio_operacional: "",
  segmento: "",
  observacoes_internas: "",
};

const MOEDAS = [
  { value: "BRL", label: "BRL — Real Brasileiro" },
  { value: "USD", label: "USD — Dólar Americano" },
  { value: "EUR", label: "EUR — Euro" },
];

function empresaToForm(e: Empresa): FormState {
  return {
    nome: e.nome,
    razao_social: e.razao_social || "",
    cnpj: e.cnpj || "",
    moeda_padrao: e.moeda_padrao || "BRL",
    data_inicio_operacional: e.data_inicio_operacional || "",
    segmento: e.segmento || "",
    observacoes_internas: e.observacoes_internas || "",
  };
}

function EmpresaForm({ form, onChange }: { form: FormState; onChange: (f: FormState) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2">
          <Label>Nome *</Label>
          <Input
            value={form.nome}
            onChange={(e) => onChange({ ...form, nome: e.target.value })}
            className="bg-secondary border-border"
            placeholder="Nome da empresa"
          />
        </div>
        <div className="space-y-2">
          <Label>Razão Social</Label>
          <Input
            value={form.razao_social}
            onChange={(e) => onChange({ ...form, razao_social: e.target.value })}
            className="bg-secondary border-border"
          />
        </div>
        <div className="space-y-2">
          <Label>CNPJ</Label>
          <Input
            value={form.cnpj}
            onChange={(e) => onChange({ ...form, cnpj: e.target.value })}
            className="bg-secondary border-border"
            placeholder="00.000.000/0001-00"
          />
        </div>
        <div className="space-y-2">
          <Label>Moeda Padrão</Label>
          <Select value={form.moeda_padrao} onValueChange={(v) => onChange({ ...form, moeda_padrao: v })}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOEDAS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Início Operacional</Label>
          <Input
            type="date"
            value={form.data_inicio_operacional}
            onChange={(e) => onChange({ ...form, data_inicio_operacional: e.target.value })}
            className="bg-secondary border-border"
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Segmento</Label>
          <Input
            value={form.segmento}
            onChange={(e) => onChange({ ...form, segmento: e.target.value })}
            placeholder="ex: Tecnologia, Varejo, Serviços..."
            className="bg-secondary border-border"
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Observações Internas</Label>
          <Textarea
            value={form.observacoes_internas}
            onChange={(e) => onChange({ ...form, observacoes_internas: e.target.value })}
            rows={3}
            className="bg-secondary border-border resize-none"
          />
        </div>
      </div>
    </div>
  );
}

export default function CadastroEmpresas() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Empresa | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);

  // Inactivation dialog
  const [inactiveOpen, setInactiveOpen] = useState(false);
  const [inactiveTarget, setInactiveTarget] = useState<Empresa | null>(null);
  const [impact, setImpact] = useState<{ pagar: number; receber: number; fechamentos: number } | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  const fetchEmpresas = async () => {
    const { data, error } = await (supabase.from("empresas") as any).select("*").order("nome");
    if (!error) setEmpresas(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchEmpresas(); }, []);

  const handleCreate = async () => {
    if (!createForm.nome) return;
    setSaving(true);
    const { error } = await (supabase.from("empresas") as any).insert({
      nome: createForm.nome,
      razao_social: createForm.razao_social || null,
      cnpj: createForm.cnpj || null,
      moeda_padrao: createForm.moeda_padrao,
      data_inicio_operacional: createForm.data_inicio_operacional || null,
      segmento: createForm.segmento || null,
      observacoes_internas: createForm.observacoes_internas || null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Empresa criada com sucesso" });
      setCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      fetchEmpresas();
    }
    setSaving(false);
  };

  const openEdit = (e: Empresa) => {
    setEditTarget(e);
    setEditForm(empresaToForm(e));
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editTarget || !editForm.nome) return;
    setSaving(true);
    const { error } = await (supabase.from("empresas") as any)
      .update({
        nome: editForm.nome,
        razao_social: editForm.razao_social || null,
        cnpj: editForm.cnpj || null,
        moeda_padrao: editForm.moeda_padrao,
        data_inicio_operacional: editForm.data_inicio_operacional || null,
        segmento: editForm.segmento || null,
        observacoes_internas: editForm.observacoes_internas || null,
      })
      .eq("id", editTarget.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      await logAcao({
        tabela: "empresas",
        acao: "UPDATE",
        registro_id: editTarget.id,
        empresa_id: editTarget.id,
        detalhes: { antes: empresaToForm(editTarget), depois: editForm },
      });
      toast({ title: "Empresa atualizada" });
      setEditOpen(false);
      fetchEmpresas();
    }
    setSaving(false);
  };

  const openClone = (e: Empresa) => {
    setCreateForm({ ...empresaToForm(e), nome: `(Cópia) ${e.nome}`, cnpj: "" });
    setCreateOpen(true);
  };

  const openInactivation = async (e: Empresa) => {
    setInactiveTarget(e);
    setInactiveOpen(true);
    setImpact(null);
    setLoadingImpact(true);

    const [{ count: pagar }, { count: receber }, { count: fechamentos }] = await Promise.all([
      supabase.from("contas_pagar").select("*", { count: "exact", head: true }).eq("empresa_id", e.id),
      supabase.from("contas_receber").select("*", { count: "exact", head: true }).eq("empresa_id", e.id),
      (supabase.from("fechamentos_mensais") as any).select("*", { count: "exact", head: true }).eq("empresa_id", e.id),
    ]);

    setImpact({ pagar: pagar || 0, receber: receber || 0, fechamentos: fechamentos || 0 });
    setLoadingImpact(false);
  };

  const confirmInactivation = async () => {
    if (!inactiveTarget) return;
    setSaving(true);
    await (supabase.from("empresas") as any).update({ ativa: false }).eq("id", inactiveTarget.id);
    await logAcao({
      tabela: "empresas",
      acao: "INATIVAR",
      registro_id: inactiveTarget.id,
      empresa_id: inactiveTarget.id,
    });
    toast({ title: "Empresa inativada", description: "Não aparecerá no dashboard. Histórico preservado." });
    setInactiveOpen(false);
    setSaving(false);
    fetchEmpresas();
  };

  const handleToggleAtiva = (e: Empresa) => {
    if (e.ativa) {
      openInactivation(e);
    } else {
      (supabase.from("empresas") as any).update({ ativa: true }).eq("id", e.id).then(() => {
        toast({ title: "Empresa reativada" });
        fetchEmpresas();
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="page-title">Empresas</h1>
            <p className="text-sm text-muted-foreground mt-1">{empresas.length} empresa(s)</p>
          </div>
        </div>
        <Button onClick={() => { setCreateForm(EMPTY_FORM); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Nova Empresa
        </Button>
      </div>

      <div className="stat-card p-0 overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Razão Social</th>
              <th>CNPJ</th>
              <th>Segmento</th>
              <th>Moeda</th>
              <th>Ativa</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</td></tr>
            ) : empresas.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma empresa cadastrada.</td></tr>
            ) : empresas.map((e) => (
              <tr key={e.id} className={!e.ativa ? "opacity-50" : ""}>
                <td className="font-medium">{e.nome}</td>
                <td className="text-muted-foreground">{e.razao_social || "—"}</td>
                <td className="text-muted-foreground">{e.cnpj || "—"}</td>
                <td className="text-muted-foreground">{e.segmento || "—"}</td>
                <td>
                  <Badge variant="outline" className="text-xs">{e.moeda_padrao || "BRL"}</Badge>
                </td>
                <td>
                  <Switch checked={e.ativa} onCheckedChange={() => handleToggleAtiva(e)} />
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Editar empresa"
                      onClick={() => openEdit(e)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Clonar estrutura"
                      onClick={() => openClone(e)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>Nova Empresa</DialogTitle></DialogHeader>
          <EmpresaForm form={createForm} onChange={setCreateForm} />
          <Button onClick={handleCreate} disabled={saving || !createForm.nome} className="w-full mt-2">
            {saving ? "Criando..." : "Criar Empresa"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>Editar Empresa</DialogTitle></DialogHeader>
          <EmpresaForm form={editForm} onChange={setEditForm} />
          <Button onClick={handleEdit} disabled={saving || !editForm.nome} className="w-full mt-2">
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Inactivation Dialog */}
      <Dialog open={inactiveOpen} onOpenChange={setInactiveOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Inativar Empresa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A empresa <strong className="text-foreground">{inactiveTarget?.nome}</strong> será inativada.
              Dados históricos serão preservados e ela não aparecerá no dashboard.
            </p>

            {loadingImpact ? (
              <p className="text-sm text-muted-foreground">Analisando impacto...</p>
            ) : impact && (
              <div className="rounded-lg border border-border bg-secondary p-4 space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-3">Impacto na inativação</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contas a Pagar</span>
                  <span className="font-medium">{impact.pagar} lançamentos</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contas a Receber</span>
                  <span className="font-medium">{impact.receber} lançamentos</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fechamentos Mensais</span>
                  <span className="font-medium">{impact.fechamentos} registros</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setInactiveOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmInactivation}
                disabled={saving || loadingImpact}
                className="flex-1"
              >
                {saving ? "Inativando..." : "Confirmar Inativação"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
