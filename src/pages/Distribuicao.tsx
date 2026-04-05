import { useState } from "react";
import { Plus, PieChart, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/mock-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEmpresaData } from "@/hooks/useEmpresaData";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Distribuicao() {
  const { empresaAtual } = useEmpresa();
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [socioValues, setSocioValues] = useState<Record<string, string>>({});

  const { data: distribuicoes, loading, refetch, update } = useEmpresaData<Record<string, unknown>>("distribuicoes_lucro");
  const { data: distSocios } = useEmpresaData<Record<string, unknown>>("distribuicao_lucro_socios", {
    select: "*, socios(nome)",
  });
  const { data: socios } = useEmpresaData<Record<string, unknown>>("socios", { orderBy: "nome" });

  const totalDistribuido = distribuicoes
    .filter((d) => d.status === "aprovado")
    .reduce((s, d) => s + Number(d.valor_total || 0), 0);

  const handleSave = async () => {
    if (!form.competencia || !empresaAtual?.id) return;
    const valorTotal = Object.values(socioValues).reduce((s, v) => s + (Number(v) || 0), 0);
    if (valorTotal <= 0) return;

    const { data: dist, error } = await (supabase.from("distribuicoes_lucro") as any)
      .insert({
        empresa_id: empresaAtual.id,
        competencia: form.competencia,
        valor_total: valorTotal,
        data_efetiva: form.data_efetiva || null,
        observacao: form.observacao || null,
        status: "rascunho",
        criado_por: user?.id,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    const socioInserts = Object.entries(socioValues)
      .filter(([, v]) => Number(v) > 0)
      .map(([socioId, valor]) => ({
        distribuicao_id: dist.id,
        socio_id: socioId,
        valor: Number(valor),
      }));

    if (socioInserts.length > 0) {
      await (supabase.from("distribuicao_lucro_socios") as any).insert(socioInserts);
    }

    toast({ title: "Distribuição criada" });
    setDialogOpen(false);
    setForm({});
    setSocioValues({});
    refetch();
  };

  const handleApprove = async (id: string) => {
    await update(id, { status: "aprovado", aprovado_por: user?.id, aprovado_em: new Date().toISOString() } as any);
  };

  const handleReject = async (id: string) => {
    await update(id, { status: "reprovado" } as any);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Distribuição de Lucros</h1>
          <p className="text-sm text-muted-foreground mt-1">Total distribuído: {formatCurrency(totalDistribuido)}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Distribuição</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader><DialogTitle>Nova Distribuição de Lucro</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Competência *</Label><Input type="month" value={form.competencia || ""} onChange={(e) => setForm({ ...form, competencia: e.target.value })} className="bg-secondary border-border" /></div>
                <div className="space-y-2"><Label>Data Efetiva</Label><Input type="date" value={form.data_efetiva || ""} onChange={(e) => setForm({ ...form, data_efetiva: e.target.value })} className="bg-secondary border-border" /></div>
              </div>
              <div className="space-y-3">
                <Label>Valores por Sócio</Label>
                {socios.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Cadastre sócios em Configurações primeiro</p>
                ) : (
                  <div className="space-y-2">
                    {socios.map((s) => (
                      <div key={s.id as string} className="flex items-center gap-3">
                        <span className="text-sm w-40 truncate">{s.nome as string}</span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={socioValues[s.id as string] || ""}
                          onChange={(e) => setSocioValues({ ...socioValues, [s.id as string]: e.target.value })}
                          className="bg-secondary border-border"
                        />
                      </div>
                    ))}
                    <p className="text-sm text-muted-foreground">
                      Total: {formatCurrency(Object.values(socioValues).reduce((s, v) => s + (Number(v) || 0), 0))}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-2"><Label>Observação</Label><Textarea value={form.observacao || ""} onChange={(e) => setForm({ ...form, observacao: e.target.value })} className="bg-secondary border-border" /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>Salvar Rascunho</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Carregando...</div>
      ) : distribuicoes.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">Nenhuma distribuição registrada</div>
      ) : (
        <div className="space-y-4">
          {distribuicoes.map((d) => {
            const sociosDistribuicao = distSocios.filter((ds) => ds.distribuicao_id === d.id);
            return (
              <div key={d.id as string} className="stat-card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10"><PieChart className="h-4 w-4 text-warning" /></div>
                    <div>
                      <p className="font-medium">Competência {d.competencia as string}</p>
                      <p className="text-sm text-muted-foreground">
                        {d.data_efetiva ? `Pago em ${new Date(d.data_efetiva as string).toLocaleDateString("pt-BR")}` : "Pagamento pendente"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-warning">{formatCurrency(Number(d.valor_total))}</span>
                    <StatusBadge status={d.status as string} />
                    {d.status === "pendente" && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => handleApprove(d.id as string)}><CheckCircle className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleReject(d.id as string)}><XCircle className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                    {d.status === "rascunho" && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => update(d.id as string, { status: "pendente" } as any)}>
                        Enviar
                      </Button>
                    )}
                  </div>
                </div>
                {sociosDistribuicao.length > 0 && (
                  <div className="border-t border-border pt-3">
                    <div className="grid grid-cols-2 gap-4">
                      {sociosDistribuicao.map((s) => (
                        <div key={s.id as string} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{(s as any).socios?.nome || "—"}</span>
                          <span className="font-medium">{formatCurrency(Number(s.valor))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
