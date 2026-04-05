import { useState } from "react";
import { Plus, ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { useEffect } from "react";

interface Empresa {
  id: string;
  nome: string;
  razao_social: string | null;
  cnpj: string | null;
  ativa: boolean;
}

export default function CadastroEmpresas() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", razao_social: "", cnpj: "" });

  const fetchEmpresas = async () => {
    const { data, error } = await supabase.from("empresas").select("*").order("nome");
    if (!error) setEmpresas(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchEmpresas(); }, []);

  const handleSave = async () => {
    if (!form.nome) return;
    const { error } = await supabase.from("empresas").insert({
      nome: form.nome,
      razao_social: form.razao_social || null,
      cnpj: form.cnpj || null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Empresa criada" });
      setDialogOpen(false);
      setForm({ nome: "", razao_social: "", cnpj: "" });
      fetchEmpresas();
    }
  };

  const toggleAtiva = async (id: string, ativa: boolean) => {
    await supabase.from("empresas").update({ ativa: !ativa }).eq("id", id);
    fetchEmpresas();
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Empresa</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Nova Empresa</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="bg-secondary border-border" /></div>
              <div className="space-y-2"><Label>Razão Social</Label><Input value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} className="bg-secondary border-border" /></div>
              <div className="space-y-2"><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} className="bg-secondary border-border" /></div>
              <Button onClick={handleSave} className="w-full" disabled={!form.nome}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="stat-card p-0 overflow-hidden">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Razão Social</th><th>CNPJ</th><th>Ativa</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center text-muted-foreground">Carregando...</td></tr>
            ) : empresas.map((e) => (
              <tr key={e.id}>
                <td className="font-medium">{e.nome}</td>
                <td className="text-muted-foreground">{e.razao_social || "—"}</td>
                <td className="text-muted-foreground">{e.cnpj || "—"}</td>
                <td><Switch checked={e.ativa} onCheckedChange={() => toggleAtiva(e.id, e.ativa)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
