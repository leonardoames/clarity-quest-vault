import { useState } from "react";
import {
  Plus, Search, Filter, Copy, CheckCircle, XCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/mock-data";
import { useEmpresaData } from "@/hooks/useEmpresaData";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";

const FORMA_PGTO = [
  { value: "pix", label: "PIX" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência (TED/DOC)" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cheque", label: "Cheque" },
  { value: "outro", label: "Outro" },
];

const FORMA_LABEL: Record<string, string> = {
  pix: "PIX", boleto: "Boleto", transferencia: "Transferência",
  cartao_credito: "Cartão Créd.", cartao_debito: "Cartão Déb.",
  dinheiro: "Dinheiro", cheque: "Cheque", outro: "Outro",
};

type Form = Record<string, string>;

function campo(form: Form, k: string) { return form[k] || ""; }

export default function ContasReceber() {
  const { empresaAtual } = useEmpresa();
  const { user } = useAuth();
  const { toast } = useToast();

  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showAjustes, setShowAjustes] = useState(false);
  const [showRecorrencia, setShowRecorrencia] = useState(false);
  const [form, setForm] = useState<Form>({});
  const sf = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const filters = filtroStatus !== "todos" ? { status: filtroStatus } : {};
  const { data: contas, loading, insert, update } = useEmpresaData<any>("contas_receber", {
    select: "*, clientes(nome), categorias_financeiras(nome), centros_custo(nome), contas_caixa(nome, banco)",
    filters,
  });
  const { data: clientes } = useEmpresaData<any>("clientes", { orderBy: "nome" });
  const { data: categorias } = useEmpresaData<any>("categorias_financeiras", { orderBy: "nome" });
  const { data: centrosCusto } = useEmpresaData<any>("centros_custo", { orderBy: "nome" });
  const { data: contasBancarias } = useEmpresaData<any>("contas_caixa", { orderBy: "nome" });

  const filtrados = contas.filter((c) => {
    const b = busca.toLowerCase();
    return (c.descricao || "").toLowerCase().includes(b)
      || (c.clientes?.nome || "").toLowerCase().includes(b)
      || (c.nota_fiscal || "").toLowerCase().includes(b);
  });

  const totalFiltrado = filtrados.reduce((s, c) => s + Number(c.valor || 0), 0);

  const handleSeedCategorias = async () => {
    if (!empresaAtual?.id) return;
    await (supabase.rpc as any)("criar_categorias_padrao", { p_empresa_id: empresaAtual.id });
    toast({ title: "Categorias padrão criadas" });
  };

  const openNew = () => {
    setForm({});
    setShowAjustes(false);
    setShowRecorrencia(false);
    setDialogOpen(true);
  };

  const handleVencimentoChange = (v: string) => {
    setForm((p) => ({
      ...p,
      vencimento: v,
      competencia: p.competencia || v.substring(0, 7),
    }));
  };

  const buildRecord = (status: string) => ({
    descricao: campo(form, "descricao"),
    valor: Number(campo(form, "valor")),
    vencimento: campo(form, "vencimento"),
    competencia: campo(form, "competencia") || campo(form, "vencimento").substring(0, 7),
    cliente_id: campo(form, "cliente_id") || null,
    categoria_id: campo(form, "categoria_id") || null,
    centro_custo_id: campo(form, "centro_custo_id") || null,
    conta_caixa_id: campo(form, "conta_caixa_id") || null,
    forma_pagamento: campo(form, "forma_pagamento") || null,
    data_movimento: campo(form, "data_movimento") || null,
    data_prevista: campo(form, "data_prevista") || null,
    nota_fiscal: campo(form, "nota_fiscal") || null,
    valor_original: campo(form, "valor_original") ? Number(campo(form, "valor_original")) : null,
    juros: Number(campo(form, "juros")) || 0,
    multa: Number(campo(form, "multa")) || 0,
    desconto: Number(campo(form, "desconto")) || 0,
    taxas: Number(campo(form, "taxas")) || 0,
    agendado: campo(form, "agendado") === "true",
    origem_lancamento: "manual",
    recorrencia: (campo(form, "recorrencia") || "nenhuma") as any,
    qtd_recorrencia: campo(form, "qtd_recorrencia") ? Number(campo(form, "qtd_recorrencia")) : null,
    observacoes: campo(form, "observacoes") || null,
    status,
    criado_por: user?.id,
  });

  const handleSave = async (status: string) => {
    if (!campo(form, "descricao") || !campo(form, "valor") || !campo(form, "vencimento")) return;
    await insert(buildRecord(status) as any);
    setDialogOpen(false);
    setForm({});
  };

  const handleDuplicate = async (c: any) => {
    await insert({
      descricao: c.descricao, valor: c.valor, vencimento: c.vencimento,
      competencia: c.competencia, cliente_id: c.cliente_id,
      categoria_id: c.categoria_id, centro_custo_id: c.centro_custo_id,
      conta_caixa_id: c.conta_caixa_id, forma_pagamento: c.forma_pagamento,
      recorrencia: c.recorrencia, origem_lancamento: "manual", status: "rascunho",
      criado_por: user?.id,
    } as any);
  };

  const handleApprove = async (id: string) =>
    update(id, { status: "aprovado", aprovado_por: user?.id, aprovado_em: new Date().toISOString() } as any);

  const handleReject = async (id: string) =>
    update(id, { status: "rascunho" } as any);

  const handleMarkReceived = async (id: string) =>
    update(id, { status: "recebido", data_recebimento: new Date().toISOString().split("T")[0], data_movimento: new Date().toISOString().split("T")[0] } as any);

  const handleMarkLost = async (id: string) =>
    update(id, { status: "perdido" } as any);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Contas a Receber</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtrados.length} lançamentos · Total: {formatCurrency(totalFiltrado)}
          </p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Lançamento</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição, cliente ou NF..."
            value={busca} onChange={(e) => setBusca(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[160px] bg-secondary border-border">
            <Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["todos","rascunho","pendente","aprovado","recebido","vencido","perdido","cancelado"].map((s) => (
              <SelectItem key={s} value={s}>{s === "todos" ? "Todos" : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {categorias.length === 0 && (
          <Button variant="outline" size="sm" onClick={handleSeedCategorias} className="text-xs">
            + Categorias padrão
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="stat-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Cliente</th>
                <th>Forma Pgto</th>
                <th>Conta</th>
                <th className="text-right">Valor</th>
                <th>Vencimento</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center text-muted-foreground py-8">Carregando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-muted-foreground py-8">Nenhum lançamento</td></tr>
              ) : filtrados.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div>
                      <p className="font-medium">{c.descricao}</p>
                      {c.nota_fiscal && <p className="text-xs text-muted-foreground">NF: {c.nota_fiscal}</p>}
                      {c.categorias_financeiras?.nome && (
                        <p className="text-xs text-muted-foreground">{c.categorias_financeiras.nome}</p>
                      )}
                    </div>
                  </td>
                  <td className="text-muted-foreground">{c.clientes?.nome || "—"}</td>
                  <td className="text-muted-foreground text-sm">
                    {c.forma_pagamento ? FORMA_LABEL[c.forma_pagamento] || c.forma_pagamento : "—"}
                  </td>
                  <td className="text-muted-foreground text-sm">
                    {c.contas_caixa ? `${c.contas_caixa.nome}${c.contas_caixa.banco ? ` (${c.contas_caixa.banco})` : ""}` : "—"}
                  </td>
                  <td className="text-right font-medium font-mono">{formatCurrency(Number(c.valor))}</td>
                  <td className="text-muted-foreground text-sm">
                    {c.vencimento ? new Date(c.vencimento + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar" onClick={() => handleDuplicate(c)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {c.status === "pendente" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-success" title="Aprovar" onClick={() => handleApprove(c.id)}>
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Reprovar" onClick={() => handleReject(c.id)}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {c.status === "aprovado" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-success" onClick={() => handleMarkReceived(c.id)}>
                          Receber
                        </Button>
                      )}
                      {c.status === "vencido" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleMarkLost(c.id)}>
                          Perda
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

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader><DialogTitle>Novo Lançamento — Contas a Receber</DialogTitle></DialogHeader>
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-2">

            {/* Essencial */}
            <div className="space-y-3">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Dados Essenciais</p>
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Input value={campo(form,"descricao")} onChange={(e) => sf("descricao", e.target.value)} className="bg-secondary border-border" placeholder="Ex: Venda de produto / Prestação de serviço" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$) *</Label>
                  <Input type="number" step="0.01" min="0" value={campo(form,"valor")} onChange={(e) => sf("valor", e.target.value)} className="bg-secondary border-border" />
                </div>
                <div className="space-y-2">
                  <Label>Vencimento *</Label>
                  <Input type="date" value={campo(form,"vencimento")} onChange={(e) => handleVencimentoChange(e.target.value)} className="bg-secondary border-border" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Competência</Label>
                  <Input type="month" value={campo(form,"competencia")} onChange={(e) => sf("competencia", e.target.value)} className="bg-secondary border-border" />
                </div>
                <div className="space-y-2">
                  <Label>Data Prevista de Recebimento</Label>
                  <Input type="date" value={campo(form,"data_prevista")} onChange={(e) => sf("data_prevista", e.target.value)} className="bg-secondary border-border" />
                </div>
              </div>
            </div>

            {/* Partes */}
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Partes e Classificação</p>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={campo(form,"cliente_id")} onValueChange={(v) => sf("cliente_id", v)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Nenhum —</SelectItem>
                    {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={campo(form,"categoria_id")} onValueChange={(v) => sf("categoria_id", v)}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— Nenhuma —</SelectItem>
                      {categorias.filter((c) => ["receita","ambos"].includes(c.tipo)).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Centro de Custo</Label>
                  <Select value={campo(form,"centro_custo_id")} onValueChange={(v) => sf("centro_custo_id", v)}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— Nenhum —</SelectItem>
                      {centrosCusto.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Conta Bancária</Label>
                  <Select value={campo(form,"conta_caixa_id")} onValueChange={(v) => sf("conta_caixa_id", v)}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— Nenhuma —</SelectItem>
                      {contasBancarias.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}{c.banco ? ` (${c.banco})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Forma de Recebimento</Label>
                  <Select value={campo(form,"forma_pagamento")} onValueChange={(v) => sf("forma_pagamento", v)}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— Não informado —</SelectItem>
                      {FORMA_PGTO.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Documento e Data */}
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
              <div className="space-y-2">
                <Label>Nota Fiscal / Documento</Label>
                <Input value={campo(form,"nota_fiscal")} onChange={(e) => sf("nota_fiscal", e.target.value)} placeholder="Número NF..." className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Data do Movimento</Label>
                <Input type="date" value={campo(form,"data_movimento")} onChange={(e) => sf("data_movimento", e.target.value)} className="bg-secondary border-border" />
              </div>
            </div>

            {/* Ajustes Financeiros (collapsible) */}
            <div className="border-t border-border pt-4">
              <button
                type="button"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                onClick={() => setShowAjustes(!showAjustes)}
              >
                {showAjustes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="text-[10px] font-medium uppercase tracking-widest">Ajustes Financeiros</span>
                <span className="text-xs ml-auto">(juros, multa, desconto, taxas)</span>
              </button>
              {showAjustes && (
                <div className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <Label>Valor Original (R$)</Label>
                    <Input type="number" step="0.01" min="0" value={campo(form,"valor_original")} onChange={(e) => sf("valor_original", e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[["juros","Juros"],["multa","Multa"],["desconto","Desconto"],["taxas","Taxas"]].map(([k,l]) => (
                      <div key={k} className="space-y-2">
                        <Label>{l} (R$)</Label>
                        <Input type="number" step="0.01" min="0" value={campo(form,k)} onChange={(e) => sf(k, e.target.value)} className="bg-secondary border-border" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recorrência (collapsible) */}
            <div className="border-t border-border pt-4">
              <button
                type="button"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                onClick={() => setShowRecorrencia(!showRecorrencia)}
              >
                {showRecorrencia ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="text-[10px] font-medium uppercase tracking-widest">Recorrência</span>
              </button>
              {showRecorrencia && (
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Periodicidade</Label>
                    <Select value={campo(form,"recorrencia") || "nenhuma"} onValueChange={(v) => sf("recorrencia", v)}>
                      <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[["nenhuma","Nenhuma"],["mensal","Mensal"],["bimestral","Bimestral"],["trimestral","Trimestral"],["semestral","Semestral"],["anual","Anual"]].map(([v,l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Qtd. de Recorrências</Label>
                    <Input type="number" min="1" max="360" value={campo(form,"qtd_recorrencia")} onChange={(e) => sf("qtd_recorrencia", e.target.value)} placeholder="Deixe vazio = indefinido" className="bg-secondary border-border" />
                  </div>
                </div>
              )}
            </div>

            {/* Outros */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={campo(form,"observacoes")} onChange={(e) => sf("observacoes", e.target.value)} rows={2} className="bg-secondary border-border resize-none" />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={campo(form,"agendado") === "true"}
                  onCheckedChange={(v) => sf("agendado", v ? "true" : "false")}
                />
                <Label className="cursor-pointer">Lançamento agendado</Label>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => { setDialogOpen(false); setForm({}); }}>Cancelar</Button>
            <Button variant="secondary" onClick={() => handleSave("rascunho")}
              disabled={!campo(form,"descricao") || !campo(form,"valor") || !campo(form,"vencimento")}>
              Rascunho
            </Button>
            <Button onClick={() => handleSave("pendente")}
              disabled={!campo(form,"descricao") || !campo(form,"valor") || !campo(form,"vencimento")}>
              Enviar p/ Aprovação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
