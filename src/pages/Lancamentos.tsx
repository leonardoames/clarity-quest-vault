import { useState, useMemo } from "react";
import {
  Plus, Search, Filter, Copy, CheckCircle, XCircle, ChevronDown, ChevronUp,
  ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, Wallet,
  TrendingUp, TrendingDown, Pencil, Activity,
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
type QuickCreate = { type: "fornecedor" | "cliente" | "categoria" | "centro_custo"; nome: string; tipo?: string };

function campo(form: Form, k: string) { return form[k] || ""; }
function toSv(v: string) { return v || "__none__"; }
function fromSv(v: string, key: string, set: (k: string, v: string) => void) {
  set(key, v === "__none__" ? "" : v);
}
function mesAno(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function labelMes(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export default function Lancamentos() {
  const { user } = useAuth();
  const { empresaAtual } = useEmpresa();
  const { toast } = useToast();

  // Filters
  const [mes, setMes] = useState(mesAno(new Date()));
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroConta, setFiltroConta] = useState("todas");
  const [busca, setBusca] = useState("");
  const [modoExtrato, setModoExtrato] = useState(false);

  // Dialog state
  const [dialogTipo, setDialogTipo] = useState<"pagar" | "receber" | null>(null);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [form, setForm] = useState<Form>({});
  const [showAjustes, setShowAjustes] = useState(false);
  const [showRecorrencia, setShowRecorrencia] = useState(false);
  const [qc, setQc] = useState<QuickCreate | null>(null);

  const sf = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const navMes = (delta: number) => {
    const [y, m] = mes.split("-").map(Number);
    setMes(mesAno(new Date(y, m - 1 + delta, 1)));
  };

  // Data
  const { data: contasPagar, loading: lpagar, insert: insertPagar, update: updatePagar } =
    useEmpresaData<any>("contas_pagar", {
      select: "*, fornecedores(nome), categorias_financeiras(nome), centros_custo(nome), contas_caixa(nome, banco)",
    });
  const { data: contasReceber, loading: lreceber, insert: insertReceber, update: updateReceber } =
    useEmpresaData<any>("contas_receber", {
      select: "*, clientes(nome), categorias_financeiras(nome), centros_custo(nome), contas_caixa(nome, banco)",
    });
  const { data: fornecedores, insert: insertFornecedor } = useEmpresaData<any>("fornecedores", { orderBy: "nome" });
  const { data: clientes, insert: insertCliente } = useEmpresaData<any>("clientes", { orderBy: "nome" });
  const { data: categorias, insert: insertCategoria } = useEmpresaData<any>("categorias_financeiras", { orderBy: "nome" });
  const { data: centrosCusto, insert: insertCentroCusto } = useEmpresaData<any>("centros_custo", { orderBy: "nome" });
  const { data: contasBancarias } = useEmpresaData<any>("contas_caixa", { orderBy: "nome" });

  const loading = lpagar || lreceber;

  // Merge and filter all records
  const lancamentos = useMemo(() => {
    const pagar = contasPagar.map((c: any) => ({ ...c, _tipo: "pagar" as const }));
    const receber = contasReceber.map((c: any) => ({ ...c, _tipo: "receber" as const }));

    return [...pagar, ...receber]
      .filter((c) => {
        if (c.competencia !== mes) return false;
        if (filtroTipo !== "todos" && c._tipo !== filtroTipo) return false;
        if (modoExtrato) {
          if (!["pago", "recebido"].includes(c.status)) return false;
        } else if (filtroStatus !== "todos" && c.status !== filtroStatus) return false;
        if (filtroCategoria !== "todas" && c.categoria_id !== filtroCategoria) return false;
        if (filtroConta !== "todas" && c.conta_caixa_id !== filtroConta) return false;
        if (busca) {
          const b = busca.toLowerCase();
          const match =
            (c.descricao || "").toLowerCase().includes(b) ||
            (c.fornecedores?.nome || "").toLowerCase().includes(b) ||
            (c.clientes?.nome || "").toLowerCase().includes(b) ||
            (c.nota_fiscal || "").toLowerCase().includes(b);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const da = modoExtrato
          ? (a.data_pagamento || a.data_recebimento || a.data_movimento || a.vencimento || "")
          : (a.vencimento || "");
        const db = modoExtrato
          ? (b.data_pagamento || b.data_recebimento || b.data_movimento || b.vencimento || "")
          : (b.vencimento || "");
        return da.localeCompare(db);
      });
  }, [contasPagar, contasReceber, mes, filtroTipo, filtroStatus, filtroCategoria, filtroConta, busca, modoExtrato]);

  const totalSaidas = useMemo(
    () => lancamentos.filter((c) => c._tipo === "pagar").reduce((s: number, c: any) => s + Number(c.valor || 0), 0),
    [lancamentos],
  );
  const totalEntradas = useMemo(
    () => lancamentos.filter((c) => c._tipo === "receber").reduce((s: number, c: any) => s + Number(c.valor || 0), 0),
    [lancamentos],
  );

  // Running balance for extrato mode
  const lancamentosComSaldo = useMemo(() => {
    if (!modoExtrato) return lancamentos;
    let bal = 0;
    return lancamentos.map((c: any) => {
      if (c._tipo === "receber") bal += Number(c.valor || 0);
      else bal -= Number(c.valor || 0);
      return { ...c, saldoAcumulado: bal };
    });
  }, [lancamentos, modoExtrato]);

  // Handlers
  const openNew = (tipo: "pagar" | "receber") => {
    setDialogTipo(tipo);
    setEditingRow(null);
    setForm({});
    setShowAjustes(false);
    setShowRecorrencia(false);
  };

  const openEdit = (row: any) => {
    setDialogTipo(row._tipo);
    setEditingRow(row);
    const f: Form = {};
    [
      "descricao","valor","vencimento","competencia","fornecedor_id","cliente_id",
      "categoria_id","centro_custo_id","conta_caixa_id","forma_pagamento","data_movimento",
      "data_prevista","nota_fiscal","valor_original","juros","multa","desconto","taxas",
      "recorrencia","qtd_recorrencia","observacoes",
    ].forEach((k) => { if (row[k] != null) f[k] = String(row[k]); });
    if (row.agendado) f.agendado = "true";
    setForm(f);
    setShowAjustes(false);
    setShowRecorrencia(false);
  };

  const closeDialog = () => {
    setDialogTipo(null);
    setEditingRow(null);
    setForm({});
  };

  const handleVencimentoChange = (v: string) => {
    setForm((p) => ({ ...p, vencimento: v, competencia: p.competencia || v.substring(0, 7) }));
  };

  const buildRecord = (status: string) => {
    const base = {
      descricao: campo(form, "descricao"),
      valor: Number(campo(form, "valor")),
      vencimento: campo(form, "vencimento"),
      competencia: campo(form, "competencia") || campo(form, "vencimento").substring(0, 7),
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
    };
    return dialogTipo === "pagar"
      ? { ...base, fornecedor_id: campo(form, "fornecedor_id") || null }
      : { ...base, cliente_id: campo(form, "cliente_id") || null };
  };

  const handleSave = async (status: string) => {
    if (!campo(form, "descricao") || !campo(form, "valor") || !campo(form, "vencimento")) return;
    const record = buildRecord(status) as any;
    if (editingRow) {
      if (dialogTipo === "pagar") await updatePagar(editingRow.id, record);
      else await updateReceber(editingRow.id, record);
    } else {
      if (dialogTipo === "pagar") await insertPagar(record);
      else await insertReceber(record);
    }
    closeDialog();
  };

  const handleDuplicate = async (row: any) => {
    const base = {
      descricao: row.descricao, valor: row.valor, vencimento: row.vencimento,
      competencia: row.competencia, categoria_id: row.categoria_id,
      centro_custo_id: row.centro_custo_id, conta_caixa_id: row.conta_caixa_id,
      forma_pagamento: row.forma_pagamento, recorrencia: row.recorrencia,
      origem_lancamento: "manual", status: "rascunho", criado_por: user?.id,
    } as any;
    if (row._tipo === "pagar") await insertPagar({ ...base, fornecedor_id: row.fornecedor_id });
    else await insertReceber({ ...base, cliente_id: row.cliente_id });
  };

  const handleApprove = async (row: any) => {
    const upd = { status: "aprovado", aprovado_por: user?.id, aprovado_em: new Date().toISOString() } as any;
    if (row._tipo === "pagar") await updatePagar(row.id, upd);
    else await updateReceber(row.id, upd);
  };

  const handleReject = async (row: any) => {
    if (row._tipo === "pagar") await updatePagar(row.id, { status: "rascunho" } as any);
    else await updateReceber(row.id, { status: "rascunho" } as any);
  };

  const handleMarkDone = async (row: any) => {
    const today = new Date().toISOString().split("T")[0];
    if (row._tipo === "pagar") {
      await updatePagar(row.id, { status: "pago", data_pagamento: today, data_movimento: today } as any);
    } else {
      await updateReceber(row.id, { status: "recebido", data_recebimento: today, data_movimento: today } as any);
    }
  };

  const handleMarkLost = async (row: any) => {
    await updateReceber(row.id, { status: "perdido" } as any);
  };

  const handleQuickCreate = async () => {
    if (!qc?.nome.trim()) return;
    let result: any = null;
    if (qc.type === "fornecedor") {
      result = await insertFornecedor({ nome: qc.nome, ativo: true } as any);
      if (result) sf("fornecedor_id", result.id);
    } else if (qc.type === "cliente") {
      result = await insertCliente({ nome: qc.nome, ativo: true } as any);
      if (result) sf("cliente_id", result.id);
    } else if (qc.type === "categoria") {
      result = await insertCategoria({ nome: qc.nome, tipo: qc.tipo || "despesa", ativa: true } as any);
      if (result) sf("categoria_id", result.id);
    } else if (qc.type === "centro_custo") {
      result = await insertCentroCusto({ nome: qc.nome, ativo: true } as any);
      if (result) sf("centro_custo_id", result.id);
    }
    setQc(null);
  };

  const handleSeedCategorias = async () => {
    if (!empresaAtual?.id) return;
    await (supabase.rpc as any)("criar_categorias_padrao", { p_empresa_id: empresaAtual.id });
    toast({ title: "Categorias padrão criadas" });
  };

  const isPagar = dialogTipo === "pagar";
  const formInvalid = !campo(form, "descricao") || !campo(form, "valor") || !campo(form, "vencimento");
  const colSpan = modoExtrato ? 11 : 10;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Lançamentos</h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            {lancamentos.length} registro(s) · {labelMes(mes)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => openNew("receber")}
            className="text-success border-success/30 hover:bg-success/10"
          >
            <ArrowUpCircle className="h-4 w-4 mr-2" />Nova Entrada
          </Button>
          <Button
            variant="outline"
            onClick={() => openNew("pagar")}
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <ArrowDownCircle className="h-4 w-4 mr-2" />Nova Saída
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Month navigation */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navMes(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[150px] text-center capitalize">{labelMes(mes)}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navMes(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>

        {/* Tipo */}
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[130px] bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="receber">Entradas</SelectItem>
            <SelectItem value="pagar">Saídas</SelectItem>
          </SelectContent>
        </Select>

        {/* Status */}
        <Select value={filtroStatus} onValueChange={setFiltroStatus} disabled={modoExtrato}>
          <SelectTrigger className="w-[140px] bg-secondary border-border">
            <Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["todos","rascunho","pendente","aprovado","pago","recebido","vencido","em_atraso","perdido","cancelado"].map((s) => (
              <SelectItem key={s} value={s}>
                {s === "todos" ? "Todos" : s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Categoria */}
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="w-[150px] bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas categ.</SelectItem>
            {categorias.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Conta */}
        <Select value={filtroConta} onValueChange={setFiltroConta}>
          <SelectTrigger className="w-[150px] bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas contas</SelectItem>
            {contasBancarias.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Modo Extrato */}
        <Button
          variant={modoExtrato ? "default" : "outline"}
          size="sm"
          className="shrink-0"
          onClick={() => setModoExtrato(!modoExtrato)}
        >
          <Activity className="h-4 w-4 mr-2" />Extrato
        </Button>

        {categorias.length === 0 && (
          <Button variant="outline" size="sm" onClick={handleSeedCategorias} className="text-xs">
            + Categorias padrão
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Entradas</span>
          </div>
          <p className="text-2xl font-bold font-mono text-success">{formatCurrency(totalEntradas)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Saídas</span>
          </div>
          <p className="text-2xl font-bold font-mono text-destructive">{formatCurrency(totalSaidas)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Saldo do Período</span>
          </div>
          <p className={`text-2xl font-bold font-mono ${totalEntradas - totalSaidas >= 0 ? "text-success" : "text-destructive"}`}>
            {formatCurrency(totalEntradas - totalSaidas)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="stat-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Vencimento</th>
                <th>Descrição</th>
                <th>Contraparte</th>
                <th>Categoria</th>
                <th>Forma</th>
                <th>Conta</th>
                <th className="text-right">Valor</th>
                <th>Situação</th>
                {modoExtrato && <th className="text-right">Saldo Acum.</th>}
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={colSpan} className="text-center text-muted-foreground py-8">Carregando...</td></tr>
              ) : lancamentosComSaldo.length === 0 ? (
                <tr><td colSpan={colSpan} className="text-center text-muted-foreground py-8">Nenhum lançamento encontrado</td></tr>
              ) : lancamentosComSaldo.map((c: any) => (
                <tr key={`${c._tipo}-${c.id}`}>
                  <td>
                    {c._tipo === "pagar" ? (
                      <span className="flex items-center gap-1 text-xs text-destructive font-medium whitespace-nowrap">
                        <ArrowDownCircle className="h-3.5 w-3.5" />Saída
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-success font-medium whitespace-nowrap">
                        <ArrowUpCircle className="h-3.5 w-3.5" />Entrada
                      </span>
                    )}
                  </td>
                  <td className="text-muted-foreground text-sm whitespace-nowrap">
                    {c.vencimento ? new Date(c.vencimento + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td>
                    <div>
                      <p className="font-medium">{c.descricao}</p>
                      {c.nota_fiscal && <p className="text-xs text-muted-foreground">NF: {c.nota_fiscal}</p>}
                    </div>
                  </td>
                  <td className="text-muted-foreground text-sm">
                    {c.fornecedores?.nome || c.clientes?.nome || "—"}
                  </td>
                  <td className="text-muted-foreground text-sm">
                    {c.categorias_financeiras?.nome || "—"}
                  </td>
                  <td className="text-muted-foreground text-sm">
                    {c.forma_pagamento ? FORMA_LABEL[c.forma_pagamento] || c.forma_pagamento : "—"}
                  </td>
                  <td className="text-muted-foreground text-sm">
                    {c.contas_caixa ? `${c.contas_caixa.nome}${c.contas_caixa.banco ? ` (${c.contas_caixa.banco})` : ""}` : "—"}
                  </td>
                  <td className={`text-right font-medium font-mono ${c._tipo === "pagar" ? "text-destructive" : "text-success"}`}>
                    {c._tipo === "pagar" ? "−" : "+"}{formatCurrency(Number(c.valor))}
                  </td>
                  <td><StatusBadge status={c.status} /></td>
                  {modoExtrato && (
                    <td className="text-right font-mono text-sm font-medium">
                      <span className={(c.saldoAcumulado || 0) >= 0 ? "text-success" : "text-destructive"}>
                        {formatCurrency(c.saldoAcumulado || 0)}
                      </span>
                    </td>
                  )}
                  <td>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar" onClick={() => handleDuplicate(c)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {c.status === "pendente" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-success" title="Aprovar" onClick={() => handleApprove(c)}>
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Reprovar" onClick={() => handleReject(c)}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {c.status === "aprovado" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-success" onClick={() => handleMarkDone(c)}>
                          {c._tipo === "pagar" ? "Pagar" : "Receber"}
                        </Button>
                      )}
                      {c.status === "vencido" && c._tipo === "receber" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleMarkLost(c)}>
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
      <Dialog open={dialogTipo !== null} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRow ? "Editar Lançamento" : isPagar ? "Nova Saída" : "Nova Entrada"}
              {" — "}
              <span className={isPagar ? "text-destructive" : "text-success"}>
                {isPagar ? "Contas a Pagar" : "Contas a Receber"}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-2">

            {/* Essencial */}
            <div className="space-y-3">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Dados Essenciais</p>
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Input
                  value={campo(form, "descricao")}
                  onChange={(e) => sf("descricao", e.target.value)}
                  className="bg-secondary border-border"
                  placeholder={isPagar ? "Ex: Aluguel escritório" : "Ex: Venda de produto"}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$) *</Label>
                  <Input type="number" step="0.01" min="0" value={campo(form, "valor")} onChange={(e) => sf("valor", e.target.value)} className="bg-secondary border-border" />
                </div>
                <div className="space-y-2">
                  <Label>Vencimento *</Label>
                  <Input type="date" value={campo(form, "vencimento")} onChange={(e) => handleVencimentoChange(e.target.value)} className="bg-secondary border-border" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Competência</Label>
                  <Input type="month" value={campo(form, "competencia")} onChange={(e) => sf("competencia", e.target.value)} className="bg-secondary border-border" />
                </div>
                <div className="space-y-2">
                  <Label>{isPagar ? "Data Prevista de Pagamento" : "Data Prevista de Recebimento"}</Label>
                  <Input type="date" value={campo(form, "data_prevista")} onChange={(e) => sf("data_prevista", e.target.value)} className="bg-secondary border-border" />
                </div>
              </div>
            </div>

            {/* Partes e Classificação */}
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Partes e Classificação</p>
              {isPagar ? (
                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <div className="flex gap-2">
                    <Select value={toSv(campo(form, "fornecedor_id"))} onValueChange={(v) => fromSv(v, "fornecedor_id", sf)}>
                      <SelectTrigger className="bg-secondary border-border flex-1"><SelectValue placeholder="Selecionar fornecedor" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Nenhum —</SelectItem>
                        {fornecedores.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" className="shrink-0" title="Novo fornecedor" onClick={() => setQc({ type: "fornecedor", nome: "" })}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <div className="flex gap-2">
                    <Select value={toSv(campo(form, "cliente_id"))} onValueChange={(v) => fromSv(v, "cliente_id", sf)}>
                      <SelectTrigger className="bg-secondary border-border flex-1"><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Nenhum —</SelectItem>
                        {clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" className="shrink-0" title="Novo cliente" onClick={() => setQc({ type: "cliente", nome: "" })}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <div className="flex gap-2">
                    <Select value={toSv(campo(form, "categoria_id"))} onValueChange={(v) => fromSv(v, "categoria_id", sf)}>
                      <SelectTrigger className="bg-secondary border-border flex-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Nenhuma —</SelectItem>
                        {categorias
                          .filter((c: any) => isPagar ? ["despesa","ambos"].includes(c.tipo) : ["receita","ambos"].includes(c.tipo))
                          .map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" className="shrink-0" title="Nova categoria" onClick={() => setQc({ type: "categoria", nome: "", tipo: isPagar ? "despesa" : "receita" })}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Centro de Custo</Label>
                  <div className="flex gap-2">
                    <Select value={toSv(campo(form, "centro_custo_id"))} onValueChange={(v) => fromSv(v, "centro_custo_id", sf)}>
                      <SelectTrigger className="bg-secondary border-border flex-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Nenhum —</SelectItem>
                        {centrosCusto.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" className="shrink-0" title="Novo centro de custo" onClick={() => setQc({ type: "centro_custo", nome: "" })}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Conta Bancária</Label>
                  <Select value={toSv(campo(form, "conta_caixa_id"))} onValueChange={(v) => fromSv(v, "conta_caixa_id", sf)}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Nenhuma —</SelectItem>
                      {contasBancarias.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}{c.banco ? ` (${c.banco})` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isPagar ? "Forma de Pagamento" : "Forma de Recebimento"}</Label>
                  <Select value={toSv(campo(form, "forma_pagamento"))} onValueChange={(v) => fromSv(v, "forma_pagamento", sf)}>
                    <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Não informado —</SelectItem>
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
                <Input value={campo(form, "nota_fiscal")} onChange={(e) => sf("nota_fiscal", e.target.value)} placeholder="Número NF, boleto..." className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Data do Movimento</Label>
                <Input type="date" value={campo(form, "data_movimento")} onChange={(e) => sf("data_movimento", e.target.value)} className="bg-secondary border-border" />
              </div>
            </div>

            {/* Ajustes Financeiros */}
            <div className="border-t border-border pt-4">
              <button type="button" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full" onClick={() => setShowAjustes(!showAjustes)}>
                {showAjustes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="text-[10px] font-medium uppercase tracking-widest">Ajustes Financeiros</span>
                <span className="text-xs ml-auto">(juros, multa, desconto, taxas)</span>
              </button>
              {showAjustes && (
                <div className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <Label>Valor Original (R$)</Label>
                    <Input type="number" step="0.01" min="0" value={campo(form, "valor_original")} onChange={(e) => sf("valor_original", e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[["juros","Juros"],["multa","Multa"],["desconto","Desconto"],["taxas","Taxas"]].map(([k, l]) => (
                      <div key={k} className="space-y-2">
                        <Label>{l} (R$)</Label>
                        <Input type="number" step="0.01" min="0" value={campo(form, k)} onChange={(e) => sf(k, e.target.value)} className="bg-secondary border-border" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recorrência */}
            <div className="border-t border-border pt-4">
              <button type="button" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full" onClick={() => setShowRecorrencia(!showRecorrencia)}>
                {showRecorrencia ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="text-[10px] font-medium uppercase tracking-widest">Recorrência</span>
              </button>
              {showRecorrencia && (
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Periodicidade</Label>
                    <Select value={campo(form, "recorrencia") || "nenhuma"} onValueChange={(v) => sf("recorrencia", v)}>
                      <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[["nenhuma","Nenhuma"],["mensal","Mensal"],["bimestral","Bimestral"],["trimestral","Trimestral"],["semestral","Semestral"],["anual","Anual"]].map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Qtd. de Recorrências</Label>
                    <Input type="number" min="1" max="360" value={campo(form, "qtd_recorrencia")} onChange={(e) => sf("qtd_recorrencia", e.target.value)} placeholder="Deixe vazio = indefinido" className="bg-secondary border-border" />
                  </div>
                </div>
              )}
            </div>

            {/* Outros */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={campo(form, "observacoes")} onChange={(e) => sf("observacoes", e.target.value)} rows={2} className="bg-secondary border-border resize-none" />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={campo(form, "agendado") === "true"} onCheckedChange={(v) => sf("agendado", v ? "true" : "false")} />
                <Label className="cursor-pointer">Lançamento agendado</Label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            {!editingRow && (
              <Button variant="secondary" onClick={() => handleSave("rascunho")} disabled={formInvalid}>
                Rascunho
              </Button>
            )}
            <Button onClick={() => handleSave(editingRow ? editingRow.status : "pendente")} disabled={formInvalid}>
              {editingRow ? "Salvar alterações" : "Enviar p/ Aprovação"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Create Dialog */}
      <Dialog open={!!qc} onOpenChange={(o) => { if (!o) setQc(null); }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {qc?.type === "fornecedor" ? "Novo Fornecedor"
                : qc?.type === "cliente" ? "Novo Cliente"
                : qc?.type === "categoria" ? "Nova Categoria"
                : "Novo Centro de Custo"}
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
