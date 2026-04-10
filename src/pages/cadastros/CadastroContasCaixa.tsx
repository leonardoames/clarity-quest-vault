import { useState } from "react";
import { Plus, ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/mock-data";
import { useEmpresaData } from "@/hooks/useEmpresaData";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface ContaCaixa {
  [key: string]: unknown;
  id: string;
  nome: string;
  tipo: string | null;
  banco: string | null;
  agencia: string | null;
  numero_conta: string | null;
  digito: string | null;
  saldo_inicial: number | null;
  descricao: string | null;
  ativa: boolean;
}

interface FormState {
  nome: string;
  tipo: string;
  banco: string;
  agencia: string;
  numero_conta: string;
  digito: string;
  saldo_inicial: string;
  descricao: string;
}

const EMPTY_FORM: FormState = {
  nome: "", tipo: "corrente", banco: "", agencia: "",
  numero_conta: "", digito: "", saldo_inicial: "", descricao: "",
};

const TIPO_LABELS: Record<string, string> = {
  corrente: "Conta Corrente",
  poupanca: "Poupança",
  caixa: "Caixa",
  investimento: "Investimento",
};

function ContaForm({ form, onChange }: { form: FormState; onChange: (f: FormState) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nome *</Label>
        <Input
          value={form.nome}
          onChange={(e) => onChange({ ...form, nome: e.target.value })}
          className="bg-secondary border-border"
          placeholder="Ex: Conta Principal Bradesco"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={form.tipo} onValueChange={(v) => onChange({ ...form, tipo: v })}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="corrente">Conta Corrente</SelectItem>
              <SelectItem value="poupanca">Poupança</SelectItem>
              <SelectItem value="caixa">Caixa</SelectItem>
              <SelectItem value="investimento">Investimento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Banco</Label>
          <Input
            value={form.banco}
            onChange={(e) => onChange({ ...form, banco: e.target.value })}
            className="bg-secondary border-border"
            placeholder="Ex: Bradesco, Itaú, Nubank..."
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Agência</Label>
          <Input
            value={form.agencia}
            onChange={(e) => onChange({ ...form, agencia: e.target.value })}
            className="bg-secondary border-border"
            placeholder="0000"
          />
        </div>
        <div className="space-y-2">
          <Label>Conta</Label>
          <Input
            value={form.numero_conta}
            onChange={(e) => onChange({ ...form, numero_conta: e.target.value })}
            className="bg-secondary border-border"
            placeholder="00000"
          />
        </div>
        <div className="space-y-2">
          <Label>Dígito</Label>
          <Input
            value={form.digito}
            onChange={(e) => onChange({ ...form, digito: e.target.value })}
            className="bg-secondary border-border"
            placeholder="0"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Saldo Inicial (R$)</Label>
        <Input
          type="number"
          step="0.01"
          value={form.saldo_inicial}
          onChange={(e) => onChange({ ...form, saldo_inicial: e.target.value })}
          className="bg-secondary border-border"
          placeholder="0,00"
        />
      </div>
      <div className="space-y-2">
        <Label>Descrição / Observação</Label>
        <Input
          value={form.descricao}
          onChange={(e) => onChange({ ...form, descricao: e.target.value })}
          className="bg-secondary border-border"
          placeholder="Uso interno, finalidade da conta..."
        />
      </div>
    </div>
  );
}

export default function CadastroContasCaixa() {
  const { empresaAtual } = useEmpresa();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: contas, loading, insert, update } = useEmpresaData<ContaCaixa>("contas_caixa", {
    orderBy: "nome",
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ContaCaixa | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const buildPayload = (f: FormState) => ({
    nome: f.nome,
    tipo: f.tipo || null,
    banco: f.banco || null,
    agencia: f.agencia || null,
    numero_conta: f.numero_conta || null,
    digito: f.digito || null,
    saldo_inicial: f.saldo_inicial ? Number(f.saldo_inicial) : null,
    descricao: f.descricao || null,
  });

  const handleCreate = async () => {
    if (!form.nome) return;
    const ok = await insert(buildPayload(form) as any);
    if (ok) {
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    }
  };

  const openEdit = (c: ContaCaixa) => {
    setEditTarget(c);
    setForm({
      nome: c.nome,
      tipo: c.tipo || "corrente",
      banco: c.banco || "",
      agencia: c.agencia || "",
      numero_conta: c.numero_conta || "",
      digito: c.digito || "",
      saldo_inicial: c.saldo_inicial?.toString() || "",
      descricao: c.descricao || "",
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editTarget || !form.nome) return;
    const ok = await update(editTarget.id, buildPayload(form) as any);
    if (ok) setEditOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="page-title">Contas Bancárias</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {empresaAtual?.nome
                ? <>Empresa: <strong className="text-foreground">{empresaAtual.nome}</strong> — {contas.length} conta(s)</>
                : "Selecione uma empresa no topo"}
            </p>
          </div>
        </div>
        <Button
          onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}
          disabled={!empresaAtual?.id}
        >
          <Plus className="h-4 w-4 mr-2" />Nova Conta
        </Button>
      </div>

      <div className="stat-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Banco</th>
              <th>Tipo</th>
              <th>Agência / Conta</th>
              <th className="text-right">Saldo Inicial</th>
              <th>Ativa</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</td></tr>
            ) : contas.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhuma conta cadastrada para {empresaAtual?.nome || "esta empresa"}.
                </td>
              </tr>
            ) : contas.map((c) => (
              <tr key={c.id} className={!c.ativa ? "opacity-50" : ""}>
                <td className="font-medium">{c.nome}</td>
                <td className="text-muted-foreground">{c.banco || "—"}</td>
                <td>
                  {c.tipo ? (
                    <Badge variant="outline" className="text-xs">{TIPO_LABELS[c.tipo] || c.tipo}</Badge>
                  ) : "—"}
                </td>
                <td className="text-muted-foreground text-sm font-mono">
                  {c.agencia || c.numero_conta ? (
                    <>
                      {c.agencia && <span>Ag: {c.agencia} </span>}
                      {c.numero_conta && <span>CC: {c.numero_conta}{c.digito ? `-${c.digito}` : ""}</span>}
                    </>
                  ) : "—"}
                </td>
                <td className="text-right font-mono">
                  {c.saldo_inicial != null ? formatCurrency(c.saldo_inicial) : "—"}
                </td>
                <td>
                  <Switch
                    checked={c.ativa}
                    onCheckedChange={() => update(c.id, { ativa: !c.ativa } as any)}
                  />
                </td>
                <td>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Editar"
                    onClick={() => openEdit(c)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Conta Bancária — {empresaAtual?.nome}</DialogTitle>
          </DialogHeader>
          <ContaForm form={form} onChange={setForm} />
          <Button onClick={handleCreate} disabled={!form.nome} className="w-full mt-2">
            Criar Conta
          </Button>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-lg">
          <DialogHeader><DialogTitle>Editar Conta Bancária</DialogTitle></DialogHeader>
          <ContaForm form={form} onChange={setForm} />
          <Button onClick={handleEdit} disabled={!form.nome} className="w-full mt-2">
            Salvar Alterações
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
