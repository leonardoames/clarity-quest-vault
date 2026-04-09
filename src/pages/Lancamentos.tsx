import { useState, useMemo, useEffect } from "react";
import {
  Plus, Search, Filter, Copy, CheckCircle, XCircle, ChevronDown, ChevronUp,
  ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, Wallet,
  TrendingUp, TrendingDown, Pencil, Activity, Trash2, AlertTriangle, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/mock-data";
import { useEmpresaData } from "@/hooks/useEmpresaData";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { gerarLancamentosRecorrentes } from "@/lib/recurrence";
import { isCompetenciaFechada } from "@/pages/Fechamento";

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
  const [periodoTipo, setPeriodoTipo] = useState<"tudo" | "7dias" | "30dias" | "mes">("tudo");
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

  // Seleção em lote
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  type BulkField = { enabled: boolean; value: string };
  const [bulkStatus,      setBulkStatus]      = useState<BulkField>({ enabled: false, value: "pendente" });
  const [bulkCompetencia, setBulkCompetencia] = useState<BulkField>({ enabled: false, value: mesAno(new Date()) });
  const [bulkCategoriaId, setBulkCategoriaId] = useState<BulkField>({ enabled: false, value: "" });
  const [bulkContaId,     setBulkContaId]     = useState<BulkField>({ enabled: false, value: "" });
  const [bulkForma,       setBulkForma]       = useState<BulkField>({ enabled: false, value: "" });

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Pagination
  const PAGE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  const rowKey = (row: any) => `${row._tipo}|${row.id}`;
  const isSelected = (row: any) => selectedIds.has(rowKey(row));
  const toggleSelect = (row: any) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(rowKey(row))) next.delete(rowKey(row)); else next.add(rowKey(row));
    return next;
  });
  const toggleSelectAll = () => {
    if (selectedIds.size === lancamentosComSaldo.length && lancamentosComSaldo.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(lancamentosComSaldo.map((c: any) => rowKey(c))));
    }
  };
  const clearSelection = () => setSelectedIds(new Set());

  const sf = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    // Auto-detecta tipo pelo sinal do valor
    if (k === "valor" && v !== "") {
      const num = parseFloat(v);
      if (!isNaN(num)) {
        if (num < 0) setDialogTipo("pagar");
        else if (num > 0) setDialogTipo("receber");
      }
    }
  };

  const navMes = (delta: number) => {
    const [y, m] = mes.split("-").map(Number);
    setMes(mesAno(new Date(y, m - 1 + delta, 1)));
  };

  // Data
  const { data: contasPagar, loading: lpagar, insert: insertPagar, update: updatePagar, remove: removePagar } =
    useEmpresaData<any>("contas_pagar", {
      select: "*, fornecedores(nome), categorias_financeiras(nome), centros_custo(nome), contas_caixa(nome, banco)",
    });
  const { data: contasReceber, loading: lreceber, insert: insertReceber, update: updateReceber, remove: removeReceber } =
    useEmpresaData<any>("contas_receber", {
      select: "*, clientes(nome), categorias_financeiras(nome), contas_caixa(nome, banco)",
    });
  const { data: fornecedores, insert: insertFornecedor } = useEmpresaData<any>("fornecedores", { orderBy: "nome" });
  const { data: clientes, insert: insertCliente } = useEmpresaData<any>("clientes", { orderBy: "nome" });
  const { data: categorias, insert: insertCategoria } = useEmpresaData<any>("categorias_financeiras", { orderBy: "nome" });
  const { data: centrosCusto, insert: insertCentroCusto } = useEmpresaData<any>("centros_custo", { orderBy: "nome" });
  const { data: contasBancarias } = useEmpresaData<any>("contas_caixa", { orderBy: "nome" });
  const { data: fechamentos } = useEmpresaData<Record<string, unknown>>("fechamentos_mensais", { orderBy: "competencia" });

  const loading = lpagar || lreceber;

  // Merge and filter all records
  const lancamentos = useMemo(() => {
    const pagar = contasPagar.map((c: any) => ({ ...c, _tipo: "pagar" as const }));
    const receber = contasReceber.map((c: any) => ({ ...c, _tipo: "receber" as const }));

    return [...pagar, ...receber]
      .filter((c) => {
        // Period filter
        if (periodoTipo === "mes") {
          const matchesComp = c.competencia === mes;
          const matchesVenc = !c.competencia && (c.vencimento || "").startsWith(mes);
          if (!matchesComp && !matchesVenc) return false;
        } else if (periodoTipo === "7dias" || periodoTipo === "30dias") {
          const days = periodoTipo === "7dias" ? 7 : 30;
          const cutoff = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
          const date = c.vencimento || (c.competencia ? c.competencia + "-01" : null);
          if (!date || date < cutoff) return false;
        }
        // "tudo" — sem filtro de data
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
  }, [contasPagar, contasReceber, periodoTipo, mes, filtroTipo, filtroStatus, filtroCategoria, filtroConta, busca, modoExtrato]);

  // Reset page when filtered results change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setCurrentPage(1); }, [lancamentosComSaldo.length]);

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
      valor: Math.abs(Number(campo(form, "valor"))),
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

  const getRecordCompetencia = (row: any): string => {
    return row.competencia || (row.vencimento ? row.vencimento.substring(0, 7) : "");
  };

  const handleSave = async (status: string) => {
    if (!campo(form, "descricao") || !campo(form, "valor") || !campo(form, "vencimento")) return;
    const record = buildRecord(status) as any;

    // Block save if target competencia is in a closed month
    const comp = record.competencia || record.vencimento?.substring(0, 7) || "";
    if (comp && isCompetenciaFechada(fechamentos, comp)) {
      toast({ title: "Não é possível editar lançamentos de um mês fechado", variant: "destructive" });
      return;
    }
    // Also block if editing a record whose original competencia was closed
    if (editingRow) {
      const originalComp = getRecordCompetencia(editingRow);
      if (originalComp && isCompetenciaFechada(fechamentos, originalComp)) {
        toast({ title: "Não é possível editar lançamentos de um mês fechado", variant: "destructive" });
        return;
      }
    }

    if (editingRow) {
      if (dialogTipo === "pagar") await updatePagar(editingRow.id, record);
      else await updateReceber(editingRow.id, record);
    } else {
      if (dialogTipo === "pagar") await insertPagar(record);
      else await insertReceber(record);

      // Generate recurring entries if applicable
      if (record.recorrencia && record.recorrencia !== 'nenhuma') {
        const table = dialogTipo === "pagar" ? "contas_pagar" : "contas_receber";
        const parcelas = gerarLancamentosRecorrentes(record, table);
        for (const parcela of parcelas) {
          if (dialogTipo === "pagar") await insertPagar(parcela as any);
          else await insertReceber(parcela as any);
        }
        if (parcelas.length > 0) {
          toast({ title: `${parcelas.length} parcelas recorrentes criadas` });
        }
      }
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

  const handleBulkMarkDone = async () => {
    const today = new Date().toISOString().split("T")[0];
    await Promise.all(Array.from(selectedIds).map(key => {
      const [tipo, id] = key.split("|");
      if (tipo === "pagar") return updatePagar(id, { status: "pago", data_pagamento: today, data_movimento: today } as any);
      return updateReceber(id, { status: "recebido", data_recebimento: today, data_movimento: today } as any);
    }));
    clearSelection();
  };

  const handleBulkUpdate = async () => {
    const today = new Date().toISOString().split("T")[0];
    const anyEnabled = bulkStatus.enabled || bulkCompetencia.enabled || bulkCategoriaId.enabled || bulkContaId.enabled || bulkForma.enabled;
    if (!anyEnabled) return;

    await Promise.all(Array.from(selectedIds).map(key => {
      const [tipo, id] = key.split("|");
      const patch: any = {};
      if (bulkStatus.enabled) {
        let s = bulkStatus.value;
        if (tipo === "pagar" && s === "recebido") s = "pago";
        if (tipo === "receber" && s === "pago") s = "recebido";
        patch.status = s;
        if (s === "pago")     { patch.data_pagamento  = today; patch.data_movimento = today; }
        if (s === "recebido") { patch.data_recebimento = today; patch.data_movimento = today; }
      }
      if (bulkCompetencia.enabled && bulkCompetencia.value) patch.competencia    = bulkCompetencia.value;
      if (bulkCategoriaId.enabled && bulkCategoriaId.value) patch.categoria_id  = bulkCategoriaId.value;
      if (bulkContaId.enabled     && bulkContaId.value)     patch.conta_caixa_id = bulkContaId.value;
      if (bulkForma.enabled       && bulkForma.value)       patch.forma_pagamento = bulkForma.value;
      if (tipo === "pagar") return updatePagar(id, patch);
      return updateReceber(id, patch);
    }));

    setBulkDialogOpen(false);
    clearSelection();
  };

  const handleSeedCategorias = async () => {
    if (!empresaAtual?.id) return;
    await (supabase.rpc as any)("criar_categorias_padrao", { p_empresa_id: empresaAtual.id });
    toast({ title: "Categorias padrão criadas" });
  };

  const handleDelete = async (row: any) => {
    const comp = getRecordCompetencia(row);
    if (comp && isCompetenciaFechada(fechamentos, comp)) {
      toast({ title: "Não é possível editar lançamentos de um mês fechado", variant: "destructive" });
      setDeleteTarget(null);
      return;
    }
    if (row._tipo === "pagar") await removePagar(row.id);
    else await removeReceber(row.id);
    setDeleteTarget(null);
  };

  const handleBulkDelete = async () => {
    await Promise.all(Array.from(selectedIds).map(key => {
      const [tipo, id] = key.split("|");
      if (tipo === "pagar") return removePagar(id);
      return removeReceber(id);
    }));
    clearSelection();
  };

  // Pagination computed values
  const totalPages = Math.max(1, Math.ceil(lancamentosComSaldo.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRows = lancamentosComSaldo.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);

  // Helper: check if a record is overdue (vencido visual indicator)
  const isOverdue = (row: any) => {
    if (!row.vencimento) return false;
    const today = new Date().toISOString().split("T")[0];
    return row.vencimento < today && ["pendente", "aprovado"].includes(row.status);
  };

  const isPagar = dialogTipo === "pagar";
  const formInvalid = !campo(form, "descricao") || !campo(form, "valor") || !campo(form, "vencimento");
  const colSpan = modoExtrato ? 13 : 12;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Lançamentos</h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            {lancamentos.length} registro(s) ·{" "}
            {periodoTipo === "mes" ? labelMes(mes)
              : periodoTipo === "7dias" ? "últimos 7 dias"
              : periodoTipo === "30dias" ? "últimos 30 dias"
              : "todo o período"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
        {/* Period selector */}
        <Select value={periodoTipo} onValueChange={(v) => setPeriodoTipo(v as typeof periodoTipo)}>
          <SelectTrigger className="w-[150px] bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tudo">Todo o período</SelectItem>
            <SelectItem value="7dias">Últimos 7 dias</SelectItem>
            <SelectItem value="30dias">Últimos 30 dias</SelectItem>
            <SelectItem value="mes">Mês específico</SelectItem>
          </SelectContent>
        </Select>

        {/* Month navigation — só aparece quando período = mes */}
        {periodoTipo === "mes" && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navMes(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[150px] text-center capitalize">{labelMes(mes)}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navMes(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

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

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-primary/10 border border-primary/20 rounded-lg px-4 py-2.5">
          <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={clearSelection} className="text-xs">
              Limpar seleção
            </Button>
            <Button size="sm" variant="outline" className="text-xs text-success border-success/30 hover:bg-success/10" onClick={handleBulkMarkDone}>
              Marcar Pago / Recebido
            </Button>
            <Button size="sm" className="text-xs" onClick={() => setBulkDialogOpen(true)}>
              <Pencil className="h-3 w-3 mr-1.5" />Editar em lote
            </Button>
            <Button size="sm" variant="outline" className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleBulkDelete}>
              <Trash2 className="h-3 w-3 mr-1.5" />Excluir selecionados
            </Button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <th className="w-8">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={lancamentosComSaldo.length > 0 && selectedIds.size === lancamentosComSaldo.length}
                    ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < lancamentosComSaldo.length; }}
                    onChange={toggleSelectAll}
                  />
                </th>
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
              ) : paginatedRows.map((c: any) => (
                <tr key={`${c._tipo}-${c.id}`} className={isSelected(c) ? "bg-primary/5" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={isSelected(c)}
                      onChange={() => toggleSelect(c)}
                    />
                  </td>
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
                    <div className="flex items-center gap-1.5">
                      {isCompetenciaFechada(fechamentos, getRecordCompetencia(c)) && (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" title="Mês fechado" />
                      )}
                      <div>
                        <p className="font-medium">{c.descricao}</p>
                        {c.nota_fiscal && <p className="text-xs text-muted-foreground">NF: {c.nota_fiscal}</p>}
                      </div>
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
                  <td>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={c.status} />
                      {isOverdue(c) && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-destructive/15 text-destructive border border-destructive/30">
                          <AlertTriangle className="h-3 w-3" />VENCIDO
                        </span>
                      )}
                    </div>
                  </td>
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
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Excluir" onClick={() => setDeleteTarget(c)}>
                        <Trash2 className="h-3.5 w-3.5" />
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
        {/* Pagination Controls */}
        {lancamentosComSaldo.length > PAGE_SIZE && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">
              Mostrando {(safeCurrentPage - 1) * PAGE_SIZE + 1}–{Math.min(safeCurrentPage * PAGE_SIZE, lancamentosComSaldo.length)} de {lancamentosComSaldo.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />Anterior
              </Button>
              <span className="text-sm font-medium">
                {safeCurrentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Próximo<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={dialogTipo !== null} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-xl lg:max-w-3xl">
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

            {/* Informações Básicas */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">Informações Básicas</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">Descrição <span className="text-destructive">*</span></Label>
                <Input
                  value={campo(form, "descricao")}
                  onChange={(e) => sf("descricao", e.target.value)}
                  className="bg-secondary border-primary/30 ring-primary/20 text-base"
                  placeholder={isPagar ? "Ex: Aluguel escritório" : "Ex: Venda de produto"}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">Valor (R$) <span className="text-destructive">*</span></Label>
                  <Input type="number" step="0.01" min="0" value={campo(form, "valor")} onChange={(e) => sf("valor", e.target.value)} className="bg-secondary border-primary/30 ring-primary/20 text-base font-mono" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">Vencimento <span className="text-destructive">*</span></Label>
                  <Input type="date" value={campo(form, "vencimento")} onChange={(e) => handleVencimentoChange(e.target.value)} className="bg-secondary border-primary/30 ring-primary/20 text-base" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Competência</Label>
                  <Input type="month" value={campo(form, "competencia")} onChange={(e) => sf("competencia", e.target.value)} className="bg-secondary border-border" placeholder="AAAA-MM" />
                </div>
                <div className="space-y-2">
                  <Label>{isPagar ? "Data Prevista de Pagamento" : "Data Prevista de Recebimento"}</Label>
                  <Input type="date" value={campo(form, "data_prevista")} onChange={(e) => sf("data_prevista", e.target.value)} className="bg-secondary border-border" />
                </div>
              </div>
            </div>

            {/* Classificação */}
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">Classificação</p>
              </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
              <div className="space-y-2">
                <Label>Nota Fiscal / Documento</Label>
                <Input value={campo(form, "nota_fiscal")} onChange={(e) => sf("nota_fiscal", e.target.value)} placeholder="Número NF, boleto..." className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Data do Movimento</Label>
                <Input type="date" value={campo(form, "data_movimento")} onChange={(e) => sf("data_movimento", e.target.value)} className="bg-secondary border-border" />
              </div>
            </div>

            {/* Financeiro */}
            <div className="border-t border-border pt-4">
              <button type="button" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full" onClick={() => setShowAjustes(!showAjustes)}>
                {showAjustes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <div className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-widest">Financeiro</span>
                </div>
                <span className="text-xs ml-auto text-muted-foreground">(juros, multa, desconto, taxas)</span>
              </button>
              {showAjustes && (
                <div className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <Label>Valor Original (R$)</Label>
                    <Input type="number" step="0.01" min="0" value={campo(form, "valor_original")} onChange={(e) => sf("valor_original", e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                <div className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-widest">Recorrência</span>
                </div>
              </button>
              {showRecorrencia && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-border">
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

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={(o) => { if (!o) setBulkDialogOpen(false); }}>
        <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar em lote — {selectedIds.size} registro(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">Ative apenas os campos que deseja alterar. Os demais permanecem inalterados.</p>

            {/* Status */}
            <div className="flex items-center gap-3">
              <input type="checkbox" className="accent-primary" checked={bulkStatus.enabled} onChange={(e) => setBulkStatus(p => ({ ...p, enabled: e.target.checked }))} />
              <Label className="w-28 shrink-0">Situação</Label>
              <Select disabled={!bulkStatus.enabled} value={bulkStatus.value} onValueChange={(v) => setBulkStatus(p => ({ ...p, value: v }))}>
                <SelectTrigger className="bg-secondary border-border flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["rascunho","pendente","aprovado","pago","recebido","cancelado"].map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Competência */}
            <div className="flex items-center gap-3">
              <input type="checkbox" className="accent-primary" checked={bulkCompetencia.enabled} onChange={(e) => setBulkCompetencia(p => ({ ...p, enabled: e.target.checked }))} />
              <Label className="w-28 shrink-0">Competência</Label>
              <Input type="month" disabled={!bulkCompetencia.enabled} value={bulkCompetencia.value} onChange={(e) => setBulkCompetencia(p => ({ ...p, value: e.target.value }))} className="bg-secondary border-border flex-1" />
            </div>

            {/* Categoria */}
            <div className="flex items-center gap-3">
              <input type="checkbox" className="accent-primary" checked={bulkCategoriaId.enabled} onChange={(e) => setBulkCategoriaId(p => ({ ...p, enabled: e.target.checked }))} />
              <Label className="w-28 shrink-0">Categoria</Label>
              <Select disabled={!bulkCategoriaId.enabled} value={toSv(bulkCategoriaId.value)} onValueChange={(v) => setBulkCategoriaId(p => ({ ...p, value: v === "__none__" ? "" : v }))}>
                <SelectTrigger className="bg-secondary border-border flex-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhuma —</SelectItem>
                  {categorias.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Conta */}
            <div className="flex items-center gap-3">
              <input type="checkbox" className="accent-primary" checked={bulkContaId.enabled} onChange={(e) => setBulkContaId(p => ({ ...p, enabled: e.target.checked }))} />
              <Label className="w-28 shrink-0">Conta</Label>
              <Select disabled={!bulkContaId.enabled} value={toSv(bulkContaId.value)} onValueChange={(v) => setBulkContaId(p => ({ ...p, value: v === "__none__" ? "" : v }))}>
                <SelectTrigger className="bg-secondary border-border flex-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhuma —</SelectItem>
                  {contasBancarias.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}{c.banco ? ` (${c.banco})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Forma */}
            <div className="flex items-center gap-3">
              <input type="checkbox" className="accent-primary" checked={bulkForma.enabled} onChange={(e) => setBulkForma(p => ({ ...p, enabled: e.target.checked }))} />
              <Label className="w-28 shrink-0">Forma pgto.</Label>
              <Select disabled={!bulkForma.enabled} value={toSv(bulkForma.value)} onValueChange={(v) => setBulkForma(p => ({ ...p, value: v === "__none__" ? "" : v }))}>
                <SelectTrigger className="bg-secondary border-border flex-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Não informado —</SelectItem>
                  {FORMA_PGTO.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleBulkUpdate} disabled={!bulkStatus.enabled && !bulkCompetencia.enabled && !bulkCategoriaId.enabled && !bulkContaId.enabled && !bulkForma.enabled}>
              Aplicar alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  <strong>{deleteTarget.descricao}</strong> — {formatCurrency(Number(deleteTarget.valor || 0))}
                  <br />
                  Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
