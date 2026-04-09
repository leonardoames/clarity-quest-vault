import { useState, useMemo } from "react";
import {
  Plus, Search, Filter, Copy, CheckCircle, XCircle, ChevronDown, ChevronUp, Trash2, ChevronLeft, ChevronRight,
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
import { useEmpresaData, calcularValorFinal } from "@/hooks/useEmpresaData";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useRole } from "@/hooks/useRole";
import { AlertTriangle } from "lucide-react";

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
type QuickCreate = { type: "fornecedor" | "categoria" | "centro_custo"; nome: string; tipo?: string };

function campo(form: Form, k: string) { return form[k] || ""; }
// Converte valor do Select: vazio → sentinel e sentinel → vazio
function toSv(v: string) { return v || "__none__"; }
function fromSv(v: string, key: string, set: (k: string, v: string) => void) {
  set(key, v === "__none__" ? "" : v);
}

export default function ContasPagar() {
  const { empresaAtual } = useEmpresa();
  const { user } = useAuth();
  const { toast } = useToast();
  const { canWrite, canApprove, isVisualizador } = useRole();

  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showAjustes, setShowAjustes] = useState(false);
  const [showRecorrencia, setShowRecorrencia] = useState(false);
  const [form, setForm] = useState<Form>({});
  const [qc, setQc] = useState<QuickCreate | null>(null);

  const sf = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const filters = filtroStatus !== "todos" ? { status: filtroStatus } : {};
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const { data: contas, loading, insert, update, remove } = useEmpresaData<any>("contas_pagar", {
    select: "*, fornecedores(nome), categorias_financeiras(nome), centros_custo(nome), contas_caixa(nome, banco)",
    filters,
  });
  const { data: fornecedores, insert: insertFornecedor } = useEmpresaData<any>("fornecedores", { orderBy: "nome" });
  const { data: categorias, insert: insertCategoria } = useEmpresaData<any>("categorias_financeiras", { orderBy: "nome" });
  const { data: centrosCusto, insert: insertCentroCusto } = useEmpresaData<any>("centros_custo", { orderBy: "nome" });
  const { data: contasBancarias } = useEmpresaData<any>("contas_caixa", { orderBy: "nome" });

  const filtrados = contas.filter((c) => {
    const b = busca.toLowerCase();
    return (c.descricao || "").toLowerCase().includes(b)
      || (c.fornecedores?.nome || "").toLowerCase().includes(b)
      || (c.nota_fiscal || "").toLowerCase().includes(b);
  });

  const totalFiltrado = filtrados.reduce((s, c) => s + Number(c.valor || 0), 0);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / ITEMS_PER_PAGE));
  const paginados = filtrados.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Auto-compute valor final in real-time
  const valorFinal = useMemo(() => {
    const valor = Number(campo(form, "valor")) || 0;
    const juros = Number(campo(form, "juros")) || 0;
    const multa = Number(campo(form, "multa")) || 0;
    const desconto = Number(campo(form, "desconto")) || 0;
    const taxas = Number(campo(form, "taxas")) || 0;
    return calcularValorFinal({ valor_original: valor, juros, multa, desconto, taxas });
  }, [form]);

  // Reset page when filters change
  const handleBuscaChange = (v: string) => { setBusca(v); setPage(1); };
  const handleFiltroChange = (v: string) => { setFiltroStatus(v); setPage(1); };

  const handleDelete = async (c: any) => {
    const confirmed = window.confirm(`Tem certeza que deseja excluir "${c.descricao}"?`);
    if (!confirmed) return;
    await remove(c.id);
  };

  const isVencido = (c: any) =>
    c.vencimento && new Date(c.vencimento) < new Date() && ['pendente', 'aprovado'].includes(c.status);

  const handleSeedCategorias = async () => {
    if (!empresaAtual?.id) return;
    await (supabase.rpc as any)("criar_categorias_padrao", { p_empresa_id: empresaAtual.id });
    toast({ title: "Categorias padrão criadas" });
  };

  const handleQuickCreate = async () => {
    if (!qc?.nome.trim()) return;
    let result: any = null;
    if (qc.type === "fornecedor") {
      result = await insertFornecedor({ nome: qc.nome, ativo: true } as any);
      if (result) sf("fornecedor_id", result.id);
    } else if (qc.type === "categoria") {
      result = await insertCategoria({ nome: qc.nome, tipo: qc.tipo || "despesa", ativa: true } as any);
      if (result) sf("categoria_id", result.id);
    } else if (qc.type === "centro_custo") {
      result = await insertCentroCusto({ nome: qc.nome, ativo: true } as any);
      if (result) sf("centro_custo_id", result.id);
    }
    setQc(null);
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
    fornecedor_id: campo(form, "fornecedor_id") || null,
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
    observacao: campo(form, "observacao") || null,
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
      competencia: c.competencia, fornecedor_id: c.fornecedor_id,
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

  const handleMarkPaid = async (id: string) =>
    update(id, { status: "pago", data_pagamento: new Date().toISOString().split("T")[0], data_movimento: new Date().toISOString().split("T")[0] } as any);

  return (
    <div className="space-y-6">
      {/* Read-only notice */}
      {isVisualizador && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-sm text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Você tem acesso somente leitura. Não é possível criar, editar ou excluir lançamentos.
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Contas a Pagar</h1>
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
            placeholder="Buscar por descrição, fornecedor ou NF..."
            value={busca} onChange={(e) => handleBuscaChange(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        <Select value={filtroStatus} onValueChange={handleFiltroChange}>
          <SelectTrigger className="w-[160px] bg-secondary border-border">
            <Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["todos","rascunho","pendente","aprovado","pago","vencido","cancelado"].map((s) => (
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
                <th>Fornecedor</th>
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
              ) : paginados.map((c) => (
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
                  <td className="text-muted-foreground">{c.fornecedores?.nome || "—"}</td>
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
                  <td>
                    {isVencido(c) ? (
                      <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500 ring-1 ring-inset ring-red-500/20">
                        Vencido
                      </span>
                    ) : (
                      <StatusBadge status={c.status} />
                    )}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar" onClick={() => handleDuplicate(c)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {canApprove && c.status === "pendente" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-success" title="Aprovar" onClick={() => handleApprove(c.id)}>
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Reprovar" onClick={() => handleReject(c.id)}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {canWrite && c.status === "aprovado" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-success" onClick={() => handleMarkPaid(c.id)}>
                          Pagar
                        </Button>
                      )}
                      {canWrite && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Excluir" onClick={() => handleDelete(c)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Mostrando {((page - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(page * ITEMS_PER_PAGE, filtrados.length)} de {filtrados.length}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-xl lg:max-w-2xl">
          <DialogHeader><DialogTitle>Novo Lançamento — Contas a Pagar</DialogTitle></DialogHeader>
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-2">

            {/* Dados Principais */}
            <div className="space-y-3">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Dados Principais</p>
              <div className="space-y-2">
                <Label>Descrição <span className="text-red-500">*</span></Label>
                <Input value={campo(form,"descricao")} onChange={(e) => sf("descricao", e.target.value)} className="bg-secondary border-border text-lg" placeholder="Ex: Aluguel escritório abril" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$) <span className="text-red-500">*</span></Label>
                  <Input type="number" step="0.01" min="0" value={campo(form,"valor")} onChange={(e) => sf("valor", e.target.value)} className="bg-secondary border-border text-lg" />
                  {(Number(campo(form, "juros")) || Number(campo(form, "multa")) || Number(campo(form, "desconto")) || Number(campo(form, "taxas"))) ? (
                    <p className="text-sm font-medium text-primary">
                      Valor Final: {formatCurrency(valorFinal)}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Vencimento <span className="text-red-500">*</span></Label>
                  <Input type="date" value={campo(form,"vencimento")} onChange={(e) => handleVencimentoChange(e.target.value)} className="bg-secondary border-border" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Competência</Label>
                  <Input type="month" value={campo(form,"competencia")} onChange={(e) => sf("competencia", e.target.value)} className="bg-secondary border-border" />
                </div>
                <div className="space-y-2">
                  <Label>Data Prevista de Pagamento</Label>
                  <Input type="date" value={campo(form,"data_prevista")} onChange={(e) => sf("data_prevista", e.target.value)} className="bg-secondary border-border" />
                </div>
              </div>
            </div>

            {/* Classificação */}
            <div className="space-y-3 border-t border-border pt-4 mt-4">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Classificação</p>
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <div className="flex gap-2">
                  <Select value={toSv(campo(form,"fornecedor_id"))} onValueChange={(v) => fromSv(v, "fornecedor_id", sf)}>
                    <SelectTrigger className="bg-secondary border-border flex-1"><SelectValue placeholder="Selecionar fornecedor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Nenhum —</SelectItem>
                      {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" className="shrink-0" title="Cadastrar novo fornecedor" onClick={() => setQc({ type: "fornecedor", nome: "" })}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <div className="flex gap-2">
                    <Select value={toSv(campo(form,"categoria_id"))} onValueChange={(v) => fromSv(v, "categoria_id", sf)}>
                      <SelectTrigger className="bg-secondary border-border flex-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Nenhuma —</SelectItem>
                        {categorias.filter((c) => ["despesa","ambos"].includes(c.tipo)).map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" className="shrink-0" title="Cadastrar nova categoria" onClick={() => setQc({ type: "categoria", nome: "", tipo: "despesa" })}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Centro de Custo</Label>
                  <div className="flex gap-2">
                    <Select value={toSv(campo(form,"centro_custo_id"))} onValueChange={(v) => fromSv(v, "centro_custo_id", sf)}>
                      <SelectTrigger className="bg-secondary border-border flex-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Nenhum —</SelectItem>
                        {centrosCusto.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" className="shrink-0" title="Cadastrar novo centro de custo" onClick={() => setQc({ type: "centro_custo", nome: "" })}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Conta Bancária</Label>
                  <Select value={toSv(campo(form,"conta_caixa_id"))} onValueChange={(v) => fromSv(v, "conta_caixa_id", sf)}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Nenhuma —</SelectItem>
                      {contasBancarias.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}{c.banco ? ` (${c.banco})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select value={toSv(campo(form,"forma_pagamento"))} onValueChange={(v) => fromSv(v, "forma_pagamento", sf)}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Não informado —</SelectItem>
                      {FORMA_PGTO.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Pagamento */}
            <div className="border-t pt-4 mt-4">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-3">Pagamento</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nota Fiscal / Documento</Label>
                <Input value={campo(form,"nota_fiscal")} onChange={(e) => sf("nota_fiscal", e.target.value)} placeholder="Número NF, boleto..." className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Data do Movimento</Label>
                <Input type="date" value={campo(form,"data_movimento")} onChange={(e) => sf("data_movimento", e.target.value)} className="bg-secondary border-border" />
              </div>
            </div>

            {/* Ajustes Financeiros (collapsible) */}
            <div className="border-t pt-4 mt-4">
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Textarea value={campo(form,"observacao")} onChange={(e) => sf("observacao", e.target.value)} rows={2} className="bg-secondary border-border resize-none" />
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
          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-border">
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

      {/* Quick Create Dialog */}
      <Dialog open={!!qc} onOpenChange={(o) => { if (!o) setQc(null); }}>
        <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {qc?.type === "fornecedor" ? "Novo Fornecedor" : qc?.type === "categoria" ? "Nova Categoria" : "Novo Centro de Custo"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={qc?.nome || ""}
                onChange={(e) => setQc((p) => p ? { ...p, nome: e.target.value } : null)}
                className="bg-secondary border-border"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleQuickCreate(); }}
              />
            </div>
            {qc?.type === "categoria" && (
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={qc.tipo || "despesa"} onValueChange={(v) => setQc((p) => p ? { ...p, tipo: v } : null)}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="despesa">Despesa</SelectItem>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="ambos">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setQc(null)}>Cancelar</Button>
            <Button onClick={handleQuickCreate} disabled={!qc?.nome.trim()}>Criar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
