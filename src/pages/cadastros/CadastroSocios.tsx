import { useState, useEffect } from "react";
import { Plus, ArrowLeft, Pencil, Link2, Unlink2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaData } from "@/hooks/useEmpresaData";

interface Socio {
  id: string;
  nome: string;
  cpf: string | null;
  email: string | null;
  percentual_societario: number | null;
  ativo: boolean;
  user_id: string | null;
  empresa_id: string;
}

interface FormState {
  nome: string;
  cpf: string;
  email: string;
  percentual_societario: string;
}

interface SystemUser {
  id: string;
  email: string;
  roles: string[];
  empresas: { empresa_id: string; empresa_nome: string; ativo: boolean }[];
}

const EMPTY_FORM: FormState = { nome: "", cpf: "", email: "", percentual_societario: "" };

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function isValidCpfFormat(cpf: string): boolean {
  if (!cpf) return true; // CPF is optional
  return /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf);
}

function SocioForm({
  form,
  onChange,
  alocado,
  disponivel,
}: {
  form: FormState;
  onChange: (f: FormState) => void;
  alocado: number;
  disponivel: number;
}) {
  const cpfInvalid = form.cpf.length > 0 && !isValidCpfFormat(form.cpf);
  const newPercent = form.percentual_societario ? parseFloat(form.percentual_societario) : 0;
  const totalAfter = alocado + newPercent;
  const exceedsLimit = totalAfter > 100;

  return (
    <div className="space-y-4">
      {/* Progress bar for percentage allocation */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{alocado.toFixed(2)}% alocado (outros sócios)</span>
          <span>{disponivel.toFixed(2)}% disponível</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              exceedsLimit ? "bg-destructive" : totalAfter === 100 ? "bg-green-500" : "bg-primary"
            }`}
            style={{ width: `${Math.min(totalAfter, 100)}%` }}
          />
        </div>
        {exceedsLimit && (
          <p className="text-xs text-destructive font-medium">
            Total seria {totalAfter.toFixed(2)}% — excede o limite de 100%
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Nome *</Label>
        <Input
          value={form.nome}
          onChange={(e) => onChange({ ...form, nome: e.target.value })}
          className="bg-secondary border-border"
          placeholder="Nome completo do sócio"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>CPF</Label>
          <Input
            value={form.cpf}
            onChange={(e) => onChange({ ...form, cpf: formatCpf(e.target.value) })}
            placeholder="000.000.000-00"
            className={`bg-secondary border-border ${cpfInvalid ? "border-destructive" : ""}`}
            maxLength={14}
          />
          {cpfInvalid && (
            <p className="text-xs text-destructive">Formato inválido. Use XXX.XXX.XXX-XX</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Participação (%)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={form.percentual_societario}
            onChange={(e) => onChange({ ...form, percentual_societario: e.target.value })}
            className={`bg-secondary border-border ${exceedsLimit ? "border-destructive" : ""}`}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => onChange({ ...form, email: e.target.value })}
          placeholder="email@empresa.com"
          className="bg-secondary border-border"
        />
      </div>
    </div>
  );
}

export default function CadastroSocios() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { empresaAtual } = useEmpresa();
  const { session } = useAuth();

  const { data: socios, loading, insert, update } = useEmpresaData<Socio>("socios", { orderBy: "nome" });

  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Socio | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [vincularOpen, setVincularOpen] = useState(false);
  const [vincularTarget, setVincularTarget] = useState<Socio | null>(null);

  // Load system users once (lazy — only when needed)
  const loadUsers = async () => {
    if (usersLoaded || !session) return;
    setLoadingUsers(true);
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "list_users" },
    });
    if (!error) {
      setSystemUsers(data || []);
      setUsersLoaded(true);
    }
    setLoadingUsers(false);
  };

  // Auto-load users if any sócio already has a user_id (to show emails in table)
  useEffect(() => {
    if (socios.some((s) => s.user_id) && !usersLoaded) {
      loadUsers();
    }
  }, [socios]);

  // Build map userId → user for fast lookup
  const userMap = new Map(systemUsers.map((u) => [u.id, u]));

  // Users linked to current empresa (for vincular dialog)
  const linkedUserIds = new Set(
    socios.filter((s) => s.user_id && s.id !== vincularTarget?.id).map((s) => s.user_id!)
  );
  const availableUsers = systemUsers.filter((u) =>
    u.empresas.some((e) => e.empresa_id === empresaAtual?.id && e.ativo)
  );

  const openVincular = (s: Socio) => {
    setVincularTarget(s);
    loadUsers();
    setVincularOpen(true);
  };

  const handleVincular = async (userId: string) => {
    if (!vincularTarget) return;
    const ok = await update(vincularTarget.id, { user_id: userId } as any);
    if (ok) {
      setVincularOpen(false);
      toast({ title: "Usuário vinculado ao sócio" });
    }
  };

  const handleDesvincular = async (s: Socio) => {
    await update(s.id, { user_id: null } as any);
    toast({ title: "Vínculo removido" });
  };

  const getOtherSociosTotal = (excludeId?: string) => {
    return socios
      .filter((s) => s.ativo && s.percentual_societario != null && s.id !== excludeId)
      .reduce((sum, s) => sum + (s.percentual_societario || 0), 0);
  };

  const validatePercentageAndCpf = (excludeId?: string): boolean => {
    if (form.cpf && !isValidCpfFormat(form.cpf)) {
      toast({ title: "CPF inválido", description: "Use o formato XXX.XXX.XXX-XX", variant: "destructive" });
      return false;
    }
    if (form.percentual_societario) {
      const newPercent = parseFloat(form.percentual_societario);
      const othersTotal = getOtherSociosTotal(excludeId);
      if (othersTotal + newPercent > 100) {
        toast({
          title: "Percentual excede 100%",
          description: `Outros sócios somam ${othersTotal.toFixed(2)}%. O máximo permitido é ${(100 - othersTotal).toFixed(2)}%.`,
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const handleCreate = async () => {
    if (!form.nome) return;
    if (!validatePercentageAndCpf()) return;
    const ok = await insert({
      nome: form.nome,
      cpf: form.cpf || null,
      email: form.email || null,
      percentual_societario: form.percentual_societario ? parseFloat(form.percentual_societario) : null,
    } as any);
    if (ok) {
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    }
  };

  const openEdit = (s: Socio) => {
    setEditTarget(s);
    setForm({
      nome: s.nome,
      cpf: s.cpf || "",
      email: s.email || "",
      percentual_societario: s.percentual_societario?.toString() || "",
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editTarget || !form.nome) return;
    if (!validatePercentageAndCpf(editTarget.id)) return;
    const ok = await update(editTarget.id, {
      nome: form.nome,
      cpf: form.cpf || null,
      email: form.email || null,
      percentual_societario: form.percentual_societario ? parseFloat(form.percentual_societario) : null,
    } as any);
    if (ok) setEditOpen(false);
  };

  const totalPercentual = socios
    .filter((s) => s.ativo && s.percentual_societario != null)
    .reduce((sum, s) => sum + (s.percentual_societario || 0), 0);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="page-title">Sócios</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {empresaAtual?.nome
                ? <>Empresa: <strong className="text-foreground">{empresaAtual.nome}</strong> — {socios.length} sócio(s)</>
                : "Selecione uma empresa no topo"}
            </p>
          </div>
        </div>
        <Button
          onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}
          disabled={!empresaAtual?.id}
        >
          <Plus className="h-4 w-4 mr-2" />Novo Sócio
        </Button>
      </div>

      {/* Participação total */}
      {socios.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">
            Total de participação registrada:{" "}
            <span className={totalPercentual > 100 ? "text-destructive font-medium" : totalPercentual === 100 ? "text-success font-medium" : "text-warning font-medium"}>
              {totalPercentual.toFixed(2)}%
            </span>
            {totalPercentual > 100 && " — excede 100%"}
            {totalPercentual < 100 && totalPercentual > 0 && " — incompleto"}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      <div className="stat-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF</th>
              <th>Email</th>
              <th>%</th>
              <th>Usuário do Sistema</th>
              <th>Ativo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</td></tr>
            ) : socios.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum sócio cadastrado para {empresaAtual?.nome || "esta empresa"}.
                </td>
              </tr>
            ) : socios.map((s) => {
              const linkedUser = s.user_id ? userMap.get(s.user_id) : null;
              return (
                <tr key={s.id} className={!s.ativo ? "opacity-50" : ""}>
                  <td className="font-medium">{s.nome}</td>
                  <td className="text-muted-foreground">{s.cpf || "—"}</td>
                  <td className="text-muted-foreground">{s.email || "—"}</td>
                  <td>
                    {s.percentual_societario != null ? (
                      <span className="font-mono text-sm font-medium">{s.percentual_societario}%</span>
                    ) : "—"}
                  </td>
                  <td>
                    {s.user_id ? (
                      <Badge className="text-xs bg-success/20 text-success border-success/30 max-w-[180px] truncate block">
                        {linkedUser ? linkedUser.email : s.user_id.slice(0, 8) + "…"}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Não vinculado</span>
                    )}
                  </td>
                  <td>
                    <Switch
                      checked={s.ativo}
                      onCheckedChange={() => update(s.id, { ativo: !s.ativo } as any)}
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Editar"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {s.user_id ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          title="Remover vínculo com usuário"
                          onClick={() => handleDesvincular(s)}
                        >
                          <Unlink2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-primary hover:bg-primary/10"
                          title="Vincular a um usuário do sistema"
                          onClick={() => openVincular(s)}
                        >
                          <Link2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Info box about the linking model */}
      <div className="rounded-lg border border-border bg-secondary/50 px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Sobre a vinculação de sócios</p>
        <p>
          Um <strong>sócio</strong> representa a participação societária (financeiro). Um <strong>usuário do sistema</strong> representa o acesso ao sistema.
          Use o ícone <Link2 className="inline h-3 w-3" /> para vincular os dois quando se tratar da mesma pessoa — evitando duplicação de dados.
        </p>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Sócio — {empresaAtual?.nome}</DialogTitle>
          </DialogHeader>
          <SocioForm form={form} onChange={setForm} alocado={getOtherSociosTotal()} disponivel={Math.max(0, 100 - getOtherSociosTotal())} />
          <Button onClick={handleCreate} disabled={!form.nome} className="w-full mt-2">
            Criar Sócio
          </Button>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-lg">
          <DialogHeader><DialogTitle>Editar Sócio</DialogTitle></DialogHeader>
          <SocioForm form={form} onChange={setForm} alocado={getOtherSociosTotal(editTarget?.id)} disponivel={Math.max(0, 100 - getOtherSociosTotal(editTarget?.id))} />
          <Button onClick={handleEdit} disabled={!form.nome} className="w-full mt-2">
            Salvar Alterações
          </Button>
        </DialogContent>
      </Dialog>

      {/* Vincular Usuário Dialog */}
      <Dialog open={vincularOpen} onOpenChange={setVincularOpen}>
        <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular Usuário — {vincularTarget?.nome}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Selecione a conta de sistema correspondente a este sócio.
            Somente usuários com acesso a <strong className="text-foreground">{empresaAtual?.nome}</strong> são listados.
          </p>
          {loadingUsers ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Carregando usuários...</p>
          ) : availableUsers.length === 0 ? (
            <div className="rounded-lg bg-secondary p-4 text-sm text-muted-foreground">
              Nenhum usuário com acesso a esta empresa encontrado.
              Crie ou vincule usuários em <strong>Configurações → Usuários e Permissões</strong>.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {availableUsers.map((u) => {
                const alreadyLinked = linkedUserIds.has(u.id);
                return (
                  <Button
                    key={u.id}
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    disabled={alreadyLinked}
                    onClick={() => handleVincular(u.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{u.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.roles.map((r) => ({
                            socio_admin: "Sócio Admin",
                            financeiro_aprovador: "Financeiro Aprovador",
                            financeiro_operador: "Financeiro Operador",
                            visualizador: "Visualizador",
                          }[r] || r)).join(", ")}
                        </p>
                      </div>
                      {alreadyLinked && (
                        <Badge variant="outline" className="text-xs shrink-0 ml-auto">
                          Já vinculado
                        </Badge>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
