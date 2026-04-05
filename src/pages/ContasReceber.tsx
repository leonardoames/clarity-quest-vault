import { useState } from "react";
import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { contasReceber, formatCurrency } from "@/lib/mock-data";

export default function ContasReceber() {
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busca, setBusca] = useState("");

  const filtrados = contasReceber.filter((c) => {
    const matchStatus = filtroStatus === "todos" || c.status === filtroStatus;
    const matchBusca = c.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      c.cliente.toLowerCase().includes(busca.toLowerCase());
    return matchStatus && matchBusca;
  });

  const totalFiltrado = filtrados.reduce((s, c) => s + c.valor, 0);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Contas a Receber</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtrados.length} lançamentos · Total: {formatCurrency(totalFiltrado)}
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Lançamento
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição ou cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[160px] bg-secondary border-border">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="recebido">Recebido</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
            <SelectItem value="perdido">Perdido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="stat-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Cliente</th>
                <th>Categoria</th>
                <th className="text-right">Valor</th>
                <th>Vencimento</th>
                <th>Competência</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((conta) => (
                <tr key={conta.id} className="cursor-pointer">
                  <td className="font-medium">{conta.descricao}</td>
                  <td className="text-muted-foreground">{conta.cliente}</td>
                  <td className="text-muted-foreground">{conta.categoria}</td>
                  <td className="text-right font-medium">{formatCurrency(conta.valor)}</td>
                  <td className="text-muted-foreground">
                    {new Date(conta.vencimento).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="text-muted-foreground">{conta.competencia}</td>
                  <td><StatusBadge status={conta.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
