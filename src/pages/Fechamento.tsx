import { useState } from "react";
import { Lock, Unlock, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useEmpresaData } from "@/hooks/useEmpresaData";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG = {
  aberto: { label: "Aberto", icon: Clock, className: "text-warning" },
  em_fechamento: { label: "Em Fechamento", icon: AlertTriangle, className: "text-primary" },
  fechado: { label: "Fechado", icon: CheckCircle2, className: "text-success" },
};

export default function Fechamento() {
  const { empresaAtual } = useEmpresa();
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedComp, setSelectedComp] = useState<string | null>(null);
  const [observacao, setObservacao] = useState("");

  const { data: fechamentos, loading, refetch, update } = useEmpresaData<Record<string, unknown>>("fechamentos_mensais", {
    orderBy: "competencia",
  });

  // Count pending items for current month
  const { data: contasPagarPendentes } = useEmpresaData<Record<string, unknown>>("contas_pagar", {
    filters: { status: "rascunho" },
  });
  const { data: contasReceberPendentes } = useEmpresaData<Record<string, unknown>>("contas_receber", {
    filters: { status: "rascunho" },
  });
  const { data: movPendentes } = useEmpresaData<Record<string, unknown>>("movimentacoes_societarias", {
    filters: { status: "rascunho" },
  });

  const pendencias = [
    ...(contasPagarPendentes.length > 0 ? [`${contasPagarPendentes.length} conta(s) a pagar em rascunho`] : []),
    ...(contasReceberPendentes.length > 0 ? [`${contasReceberPendentes.length} conta(s) a receber em rascunho`] : []),
    ...(movPendentes.length > 0 ? [`${movPendentes.length} movimentação(ões) societária(s) em rascunho`] : []),
  ];

  // Generate months list (current + last 11)
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const fechamentoMap = new Map(fechamentos.map((f) => [f.competencia as string, f]));

  const handleFechar = async (competencia: string) => {
    const existing = fechamentoMap.get(competencia);
    if (existing) {
      await update(existing.id as string, {
        status: "fechado",
        fechado_por: user?.id,
        fechado_em: new Date().toISOString(),
        observacao,
      } as any);
    } else {
      await (supabase.from("fechamentos_mensais") as any).insert({
        empresa_id: empresaAtual?.id,
        competencia,
        status: "fechado",
        fechado_por: user?.id,
        fechado_em: new Date().toISOString(),
        observacao,
      });
      toast({ title: "Mês fechado" });
      refetch();
    }
    setDialogOpen(false);
    setObservacao("");
  };

  const handleReabrir = async (id: string) => {
    await update(id, {
      status: "aberto",
      reaberto_por: user?.id,
      reaberto_em: new Date().toISOString(),
    } as any);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fechamento Mensal</h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de fechamento por competência</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Carregando...</div>
      ) : (
        <div className="space-y-4">
          {months.map((comp) => {
            const fech = fechamentoMap.get(comp);
            const status = (fech?.status as string) || "aberto";
            const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.aberto;
            const Icon = config.icon;

            return (
              <div key={comp} className="stat-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg bg-secondary ${config.className}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-lg">{comp}</p>
                      {fech?.fechado_por && (
                        <p className="text-sm text-muted-foreground">
                          Fechado em {new Date(fech.fechado_em as string).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                      {status === "aberto" && pendencias.length > 0 && comp === months[0] && (
                        <p className="text-sm text-warning">{pendencias.length} pendência(s)</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={status === "fechado" ? "pago" : status === "em_fechamento" ? "pendente" : "rascunho"} />
                    {status !== "fechado" && (
                      <Button
                        size="sm"
                        onClick={() => { setSelectedComp(comp); setDialogOpen(true); }}
                      >
                        <Lock className="h-4 w-4 mr-2" />Fechar Mês
                      </Button>
                    )}
                    {status === "fechado" && (
                      <Button variant="outline" size="sm" onClick={() => handleReabrir(fech!.id as string)}>
                        <Unlock className="h-4 w-4 mr-2" />Reabrir
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Fechamento — {selectedComp}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {pendencias.length > 0 && selectedComp === months[0] && (
              <div className="stat-card border-warning/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="font-medium text-warning">Pendências</span>
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {pendencias.map((p, i) => <li key={i}>• {p}</li>)}
                </ul>
              </div>
            )}
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Observações sobre o fechamento..." className="bg-secondary border-border" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => selectedComp && handleFechar(selectedComp)}>
                <Lock className="h-4 w-4 mr-2" />Fechar Mês
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
