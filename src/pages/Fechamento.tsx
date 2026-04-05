import { useState } from "react";
import { Lock, Unlock, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Fechamento {
  competencia: string;
  status: "aberto" | "em_fechamento" | "fechado";
  fechadoPor?: string;
  fechadoEm?: string;
  pendencias: number;
}

const mockFechamentos: Fechamento[] = [
  { competencia: "2026-04", status: "aberto", pendencias: 3 },
  { competencia: "2026-03", status: "fechado", fechadoPor: "Lucas Mendes", fechadoEm: "2026-04-02", pendencias: 0 },
  { competencia: "2026-02", status: "fechado", fechadoPor: "Lucas Mendes", fechadoEm: "2026-03-03", pendencias: 0 },
  { competencia: "2026-01", status: "fechado", fechadoPor: "Ana Ferreira", fechadoEm: "2026-02-02", pendencias: 0 },
];

const STATUS_CONFIG = {
  aberto: { label: "Aberto", icon: Clock, className: "text-warning" },
  em_fechamento: { label: "Em Fechamento", icon: AlertTriangle, className: "text-primary" },
  fechado: { label: "Fechado", icon: CheckCircle2, className: "text-success" },
};

const mockPendencias = [
  "3 lançamentos em contas a pagar com status 'rascunho'",
  "1 movimentação societária pendente de aprovação",
  "2 contas a receber sem categoria definida",
];

export default function Fechamento() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fechamento Mensal</h1>
          <p className="text-sm text-muted-foreground mt-1">Empresa Alpha</p>
        </div>
      </div>

      <div className="space-y-4">
        {mockFechamentos.map((f) => {
          const config = STATUS_CONFIG[f.status];
          const Icon = config.icon;

          return (
            <div key={f.competencia} className="stat-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-lg bg-secondary ${config.className}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-lg">{f.competencia}</p>
                    {f.fechadoPor && (
                      <p className="text-sm text-muted-foreground">
                        Fechado por {f.fechadoPor} em {new Date(f.fechadoEm!).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                    {f.status === "aberto" && f.pendencias > 0 && (
                      <p className="text-sm text-warning">{f.pendencias} pendência(s) encontrada(s)</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={f.status === "fechado" ? "pago" : f.status === "em_fechamento" ? "pendente" : "rascunho"} />
                  {f.status === "aberto" && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm"><Lock className="h-4 w-4 mr-2" />Iniciar Fechamento</Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border">
                        <DialogHeader><DialogTitle>Fechamento — {f.competencia}</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <div className="stat-card border-warning/30">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="h-4 w-4 text-warning" />
                              <span className="font-medium text-warning">Pendências</span>
                            </div>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              {mockPendencias.map((p, i) => (<li key={i}>• {p}</li>))}
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <Label>Observação</Label>
                            <Textarea placeholder="Observações sobre o fechamento..." className="bg-secondary border-border" />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={() => setDialogOpen(false)}>
                              <Lock className="h-4 w-4 mr-2" />Fechar Mês
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  {f.status === "fechado" && (
                    <Button variant="outline" size="sm"><Unlock className="h-4 w-4 mr-2" />Reabrir</Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
