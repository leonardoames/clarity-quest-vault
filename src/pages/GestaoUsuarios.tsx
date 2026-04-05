import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Shield, Building2, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UserData {
  id: string;
  email: string;
  must_reset_password: boolean;
  created_at: string;
  empresas: { empresa_id: string; empresa_nome: string; ativo: boolean }[];
  roles: string[];
}

const roleLabels: Record<string, string> = {
  socio_admin: "Sócio Admin",
  financeiro_aprovador: "Financeiro Aprovador",
  financeiro_operador: "Financeiro Operador",
  visualizador: "Visualizador",
};

const roleBadgeClass: Record<string, string> = {
  socio_admin: "bg-primary/20 text-primary border-primary/30",
  financeiro_aprovador: "bg-accent/20 text-accent border-accent/30",
  financeiro_operador: "bg-chart-4/20 text-chart-4 border-chart-4/30",
  visualizador: "bg-muted text-muted-foreground border-border",
};

export default function GestaoUsuarios() {
  const { session } = useAuth();
  const { empresas } = useEmpresa();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("financeiro_operador");
  const [selectedEmpresas, setSelectedEmpresas] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "list_users" },
    });
    if (error) {
      toast({ title: "Erro", description: "Falha ao carregar usuários", variant: "destructive" });
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (session) fetchUsers();
  }, [session]);

  const handleCreate = async () => {
    if (!newEmail || !newPassword) return;
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: {
        action: "create_user",
        email: newEmail,
        password: newPassword,
        role: newRole,
        empresa_ids: selectedEmpresas,
      },
    });
    if (error || data?.error) {
      toast({ title: "Erro", description: data?.error || "Falha ao criar usuário", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Usuário criado com sucesso" });
      setDialogOpen(false);
      setNewEmail("");
      setNewPassword("");
      setNewRole("financeiro_operador");
      setSelectedEmpresas([]);
      fetchUsers();
    }
    setCreating(false);
  };

  const handleChangeRole = async (userId: string, role: string) => {
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "update_role", user_id: userId, role },
    });
    if (error || data?.error) {
      toast({ title: "Erro", description: "Falha ao alterar perfil", variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado" });
      fetchUsers();
    }
  };

  const handleLinkEmpresa = async (userId: string, empresaId: string) => {
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "link_empresa", user_id: userId, empresa_id: empresaId },
    });
    if (error || data?.error) {
      toast({ title: "Erro", description: "Falha ao vincular empresa", variant: "destructive" });
    } else {
      toast({ title: "Empresa vinculada" });
      fetchUsers();
    }
  };

  const handleUnlinkEmpresa = async (userId: string, empresaId: string) => {
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "unlink_empresa", user_id: userId, empresa_id: empresaId },
    });
    if (error || data?.error) {
      toast({ title: "Erro", description: "Falha ao desvincular", variant: "destructive" });
    } else {
      toast({ title: "Empresa desvinculada" });
      fetchUsers();
    }
  };

  const toggleEmpresaSelection = (id: string) => {
    setSelectedEmpresas((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="page-title">Usuários e Permissões</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie acessos, perfis e vínculos com empresas</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Usuário</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@empresa.com" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Senha temporária</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Perfil de acesso</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Empresas vinculadas</Label>
                <div className="flex flex-wrap gap-2">
                  {empresas.map((emp) => (
                    <Badge
                      key={emp.id}
                      variant="outline"
                      className={`cursor-pointer transition-colors ${
                        selectedEmpresas.includes(emp.id)
                          ? "bg-primary/20 text-primary border-primary/50"
                          : "hover:bg-secondary"
                      }`}
                      onClick={() => toggleEmpresaSelection(emp.id)}
                    >
                      {emp.nome}
                    </Badge>
                  ))}
                  {empresas.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma empresa cadastrada</p>
                  )}
                </div>
              </div>
              <Button onClick={handleCreate} disabled={creating || !newEmail || !newPassword} className="w-full">
                {creating ? "Criando..." : "Criar Usuário"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Carregando usuários...</div>
      ) : (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              {users.length} usuário(s) cadastrado(s)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Email</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Empresas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="border-border">
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>
                      <Select
                        value={u.roles[0] || "visualizador"}
                        onValueChange={(val) => handleChangeRole(u.id, val)}
                      >
                        <SelectTrigger className="w-[180px] bg-secondary border-border h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(roleLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.empresas.filter((e) => e.ativo).map((e) => (
                          <Badge
                            key={e.empresa_id}
                            variant="outline"
                            className="text-xs cursor-pointer hover:bg-destructive/20 hover:border-destructive/50"
                            onClick={() => handleUnlinkEmpresa(u.id, e.empresa_id)}
                            title="Clique para desvincular"
                          >
                            <Building2 className="h-3 w-3 mr-1" />
                            {e.empresa_nome}
                          </Badge>
                        ))}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-primary/20 hover:border-primary/50">
                              <UserPlus className="h-3 w-3" />
                            </Badge>
                          </DialogTrigger>
                          <DialogContent className="bg-card border-border">
                            <DialogHeader>
                              <DialogTitle>Vincular empresa a {u.email}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-2">
                              {empresas.map((emp) => {
                                const linked = u.empresas.some((e) => e.empresa_id === emp.id && e.ativo);
                                return (
                                  <Button
                                    key={emp.id}
                                    variant={linked ? "secondary" : "outline"}
                                    className="w-full justify-start"
                                    disabled={linked}
                                    onClick={() => handleLinkEmpresa(u.id, emp.id)}
                                  >
                                    <Building2 className="h-4 w-4 mr-2" />
                                    {emp.nome}
                                    {linked && <span className="ml-auto text-xs text-muted-foreground">Já vinculado</span>}
                                  </Button>
                                );
                              })}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.must_reset_password ? (
                        <Badge variant="outline" className="text-xs bg-chart-5/20 text-chart-5 border-chart-5/30">
                          Reset pendente
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-accent/20 text-accent border-accent/30">
                          Ativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
