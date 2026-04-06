import { useState, useEffect, useRef } from "react";
import {
  Upload, ArrowLeft, ArrowRight, CheckCircle, RotateCcw,
  Download, FileSpreadsheet, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportType = "contas_pagar" | "contas_receber" | "aportes" | "extrato";
type Step = 1 | 2 | 3 | 4;

interface SystemField {
  name: string;
  label: string;
  required: boolean;
  type: "text" | "number" | "date" | "enum";
  enumValues?: string[];
  keywords: string[];
}

interface ValidatedRow {
  values: Record<string, string>;
  errors: string[];
  valid: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SYSTEM_FIELDS: Record<ImportType, SystemField[]> = {
  contas_pagar: [
    { name: "descricao", label: "Descrição", required: true, type: "text", keywords: ["descri", "nome", "histor", "lancam", "item"] },
    { name: "valor", label: "Valor (R$)", required: true, type: "number", keywords: ["valor", "montante", "quantia", "amount", "preco"] },
    { name: "vencimento", label: "Vencimento", required: true, type: "date", keywords: ["vencim", "prazo", "venc", "due", "data pag"] },
    { name: "competencia", label: "Competência (YYYY-MM)", required: false, type: "text", keywords: ["compet", "period", "mes", "month", "ref"] },
    { name: "fornecedor", label: "Fornecedor", required: false, type: "text", keywords: ["fornec", "credor", "supplier", "vendor", "empresa"] },
    { name: "categoria", label: "Categoria", required: false, type: "text", keywords: ["categ", "classif", "grupo", "tipo conta"] },
    { name: "forma_pagamento", label: "Forma de Pagamento", required: false, type: "enum", enumValues: ["pix","boleto","transferencia","cartao_credito","cartao_debito","dinheiro","cheque","outro"], keywords: ["forma", "pagam", "modalid", "meio pag", "payment"] },
    { name: "nota_fiscal", label: "Nota Fiscal / Documento", required: false, type: "text", keywords: ["nota", "nf", "nfe", "fiscal", "docum", "numero nf"] },
    { name: "data_movimento", label: "Data do Movimento", required: false, type: "date", keywords: ["data mov", "mov", "liquidac", "baixa", "quitac"] },
    { name: "data_prevista", label: "Data Prevista", required: false, type: "date", keywords: ["prevista", "previsao", "estimad"] },
    { name: "valor_original", label: "Valor Original (R$)", required: false, type: "number", keywords: ["original", "bruto", "face"] },
    { name: "juros", label: "Juros (R$)", required: false, type: "number", keywords: ["juros", "juro", "interest"] },
    { name: "multa", label: "Multa (R$)", required: false, type: "number", keywords: ["multa", "penalid", "mora"] },
    { name: "desconto", label: "Desconto (R$)", required: false, type: "number", keywords: ["desconto", "discount", "abatim"] },
    { name: "taxas", label: "Taxas (R$)", required: false, type: "number", keywords: ["taxa", "fee", "tarifas", "encargo"] },
    { name: "status", label: "Status / Situação", required: false, type: "text", keywords: ["status", "situac", "estado", "situacao", "pago", "quitad"] },
    { name: "observacoes", label: "Observações", required: false, type: "text", keywords: ["obs", "coment", "remark", "detalhe"] },
  ],
  contas_receber: [
    { name: "descricao", label: "Descrição", required: true, type: "text", keywords: ["descri", "nome", "histor", "servico", "item"] },
    { name: "valor", label: "Valor (R$)", required: true, type: "number", keywords: ["valor", "montante", "quantia", "amount"] },
    { name: "vencimento", label: "Vencimento", required: true, type: "date", keywords: ["vencim", "prazo", "venc", "due", "data rec"] },
    { name: "competencia", label: "Competência (YYYY-MM)", required: false, type: "text", keywords: ["compet", "period", "mes", "ref"] },
    { name: "cliente", label: "Cliente", required: false, type: "text", keywords: ["client", "devedor", "pagador", "contratante"] },
    { name: "categoria", label: "Categoria", required: false, type: "text", keywords: ["categ", "classif", "grupo"] },
    { name: "forma_pagamento", label: "Forma de Recebimento", required: false, type: "enum", enumValues: ["pix","boleto","transferencia","cartao_credito","cartao_debito","dinheiro","cheque","outro"], keywords: ["forma", "recebim", "modalid", "meio rec", "payment"] },
    { name: "nota_fiscal", label: "Nota Fiscal / Documento", required: false, type: "text", keywords: ["nota", "nf", "nfe", "fiscal", "docum", "numero nf"] },
    { name: "data_movimento", label: "Data do Movimento", required: false, type: "date", keywords: ["data mov", "mov", "liquidac", "baixa"] },
    { name: "data_prevista", label: "Data Prevista", required: false, type: "date", keywords: ["prevista", "previsao", "estimad"] },
    { name: "valor_original", label: "Valor Original (R$)", required: false, type: "number", keywords: ["original", "bruto", "face"] },
    { name: "juros", label: "Juros (R$)", required: false, type: "number", keywords: ["juros", "juro", "interest"] },
    { name: "multa", label: "Multa (R$)", required: false, type: "number", keywords: ["multa", "penalid", "mora"] },
    { name: "desconto", label: "Desconto (R$)", required: false, type: "number", keywords: ["desconto", "discount", "abatim"] },
    { name: "taxas", label: "Taxas (R$)", required: false, type: "number", keywords: ["taxa", "fee", "tarifas", "encargo"] },
    { name: "status", label: "Status / Situação", required: false, type: "text", keywords: ["status", "situac", "estado", "situacao", "recebid", "quitad"] },
    { name: "observacoes", label: "Observações", required: false, type: "text", keywords: ["obs", "coment", "detalhe"] },
  ],
  aportes: [
    { name: "descricao", label: "Descrição", required: true, type: "text", keywords: ["descri", "histor", "nome", "operac"] },
    { name: "valor", label: "Valor (R$)", required: true, type: "number", keywords: ["valor", "montante", "quantia"] },
    { name: "data", label: "Data", required: true, type: "date", keywords: ["data", "date", "lancam", "operac"] },
    { name: "socio", label: "Sócio", required: true, type: "text", keywords: ["socio", "partner", "investidor", "nome socio"] },
    {
      name: "tipo",
      label: "Tipo",
      required: true,
      type: "enum",
      enumValues: ["aporte_capital", "emprestimo_socio", "adiantamento_socio", "retirada_socio", "devolucao_socio"],
      keywords: ["tipo", "operac", "modalid", "natureza"],
    },
    { name: "observacoes", label: "Observações", required: false, type: "text", keywords: ["obs", "nota", "coment"] },
  ],
  extrato: [
    { name: "descricao",   label: "Descrição",                                          required: true,  type: "text",   keywords: ["descri", "histor", "lancam", "memorial", "detalhe", "movimento"] },
    { name: "valor",       label: "Valor (negativo = despesa, positivo = receita)",      required: true,  type: "number", keywords: ["valor", "montante", "amount", "credito", "debito", "movim"] },
    { name: "data",        label: "Data",                                               required: true,  type: "date",   keywords: ["data", "date", "lancam", "operac"] },
    { name: "categoria",   label: "Categoria",                                          required: false, type: "text",   keywords: ["categ", "classif", "grupo"] },
    { name: "observacoes", label: "Observações",                                        required: false, type: "text",   keywords: ["obs", "coment", "detalhe"] },
  ],
};

const TYPE_LABELS: Record<ImportType, string> = {
  contas_pagar:   "Contas a Pagar",
  contas_receber: "Contas a Receber",
  aportes:        "Aportes e Movimentações",
  extrato:        "Extrato Bancário (auto-split)",
};

const STEP_LABELS = ["Tipo e Arquivo", "Mapeamento", "Validação", "Importar"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeStr(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function autoDetectMapping(headers: string[], fields: SystemField[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const field of fields) {
    const match = headers.find((h) => field.keywords.some((kw) => normalizeStr(h).includes(kw)));
    mapping[field.name] = match || "";
  }
  return mapping;
}

function parseDate(val: string): string | null {
  const v = (val || "").trim();
  if (!v) return null;
  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // BR barra: DD/MM/YYYY ou D/M/YYYY
  const brSlash = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brSlash) {
    const [, d, m, y] = brSlash;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // BR traço: DD-MM-YYYY ou D-M-YYYY (padrão ABNT)
  const brDash = v.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (brDash) {
    const [, d, m, y] = brDash;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // DD.MM.YYYY
  const brDot = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (brDot) {
    const [, d, m, y] = brDot;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function parseNumber(val: string): number | null {
  if (!val) return null;
  const s = val.trim();
  // Detecta notação de negativo com parênteses: (1.500,00) → -1500.00
  const isParenNeg = s.startsWith("(") && s.endsWith(")");
  // Remove símbolos monetários, espaços, parênteses
  const cleaned = s.replace(/[R$\s%()]/g, "");
  // Formato BR: ponto = milhar, vírgula = decimal  →  remove pontos, troca vírgula por ponto
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(normalized);
  if (isNaN(n)) return null;
  return isParenNeg && n > 0 ? -n : n;
}

// Mapeia texto livre de status para o enum do sistema
function parseStatus(val: string, tipo: ImportType): string {
  const v = normalizeStr(val || "").replace(/[^a-z\s]/g, "").trim();
  if (!v) return "pendente";

  if (/recebid/.test(v)) return "recebido";
  if (/pago|quitado|liquidado|baixado|concluido/.test(v)) {
    return tipo === "contas_receber" ? "recebido" : "pago";
  }
  if (/vencido|atraso|inadimpl/.test(v)) return "vencido";
  if (/aprovado|autorizado/.test(v)) return "aprovado";
  if (/cancelado|anulado|estornado/.test(v)) return "cancelado";
  if (/perdido|irrecuperavel/.test(v)) return "perdido";
  if (/rascunho|draft/.test(v)) return "rascunho";
  // "a pagar", "a receber", "em aberto", "pendente", "aberto"
  if (/pendente|aberto|pagar|receber/.test(v)) return "pendente";

  return "pendente";
}

// Tenta inserir registros; se PostgREST reclamar de coluna inexistente,
// remove essa coluna de todos os registros e tenta de novo (até 8x).
// Isso garante que uma migração não aplicada não trave a importação inteira.
async function insertWithRetry(
  table: string,
  records: Record<string, unknown>[]
): Promise<{ count: number; error?: string }> {
  let recs = records.map((r) => ({ ...r }));
  for (let attempt = 0; attempt < 8; attempt++) {
    const { error } = await (supabase.from(table) as any).insert(recs);
    if (!error) return { count: recs.length };
    // Detecta "Could not find the 'coluna' column ... in the schema cache"
    const colMatch = error.message.match(/find the '(\w+)' column/);
    if (colMatch?.[1]) {
      const bad = colMatch[1];
      recs = recs.map((r) => { const c = { ...r }; delete c[bad]; return c; });
      continue;
    }
    return { count: 0, error: error.message };
  }
  return { count: 0, error: "Falha após múltiplas tentativas de ajuste de schema" };
}

function deriveCompetencia(dateStr: string): string {
  if (!dateStr || !dateStr.match(/^\d{4}-\d{2}/)) return "";
  return dateStr.substring(0, 7);
}

function validateRow(
  rawRow: string[],
  headers: string[],
  mapping: Record<string, string>,
  fields: SystemField[]
): ValidatedRow {
  const values: Record<string, string> = {};
  const errors: string[] = [];

  for (const field of fields) {
    const header = mapping[field.name];
    if (!header) {
      values[field.name] = "";
      continue;
    }
    const idx = headers.indexOf(header);
    values[field.name] = idx >= 0 ? (rawRow[idx] || "") : "";
  }

  for (const field of fields) {
    const val = values[field.name] || "";

    if (field.required && !val) {
      errors.push(`"${field.label}" é obrigatório`);
      continue;
    }
    if (!val) continue;

    if (field.type === "number") {
      const n = parseNumber(val);
      if (n === null) errors.push(`"${field.label}" inválido: "${val}" (use formato 1.500,00 ou -500,00)`);
    }
    if (field.type === "date") {
      if (!parseDate(val)) errors.push(`Data inválida em "${field.label}": "${val}" (use DD-MM-AAAA)`);
    }
    if (field.type === "enum" && field.enumValues) {
      if (!field.enumValues.includes(val)) {
        errors.push(`"${field.label}" inválido. Valores aceitos: ${field.enumValues.join(", ")}`);
      }
    }
  }

  return { values, errors, valid: errors.length === 0 };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Importacao() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { empresaAtual } = useEmpresa();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [importType, setImportType] = useState<ImportType>("contas_pagar");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: number; dbError?: string } | null>(null);
  const [pastImports, setPastImports] = useState<any[]>([]);
  const [reverting, setReverting] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (empresaAtual) fetchPastImports();
  }, [empresaAtual]);

  const fetchPastImports = async () => {
    if (!empresaAtual) return;
    const { data } = await (supabase.from("importacoes_planilhas") as any)
      .select("*")
      .eq("empresa_id", empresaAtual.id)
      .order("criado_em", { ascending: false })
      .limit(20);
    setPastImports(data || []);
  };

  const parseFile = async (f: File): Promise<{ hdrs: string[]; dataRows: string[][] }> => {
    const buffer = await f.arrayBuffer();
    const isCsv = f.name.toLowerCase().endsWith(".csv");
    // CSV: tenta Windows-1252 (ABNT) para suportar acentos e cedilha
    const wb = XLSX.read(buffer, { type: "array", raw: false, codepage: isCsv ? 1252 : undefined });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const all: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }) as string[][];
    const hdrs = (all[0] || []).map((h) => String(h).trim()).filter(Boolean);
    const dataRows = all
      .slice(1)
      .filter((r) => r.some((c) => c !== "" && c != null))
      .map((r) => r.map((c) => String(c || "").trim()));
    return { hdrs, dataRows };
  };

  const handleFileChange = async (f: File) => {
    try {
      const { hdrs, dataRows } = await parseFile(f);
      if (hdrs.length === 0) {
        toast({ title: "Arquivo vazio ou sem cabeçalho", variant: "destructive" });
        return;
      }
      setFile(f);
      setHeaders(hdrs);
      setRows(dataRows);
      setMapping(autoDetectMapping(hdrs, SYSTEM_FIELDS[importType]));
      setValidatedRows([]);
      setImportResult(null);
      setStep(2);
    } catch {
      toast({ title: "Erro ao ler arquivo", description: "Verifique se é um CSV ou XLSX válido.", variant: "destructive" });
    }
  };

  const handleValidate = () => {
    const fields = SYSTEM_FIELDS[importType];
    const validated = rows.map((row) => validateRow(row, headers, mapping, fields));
    setValidatedRows(validated);
    setStep(3);
  };

  const handleImport = async () => {
    if (!empresaAtual || !user) return;
    setImporting(true);

    const validRows = validatedRows.filter((r) => r.valid);

    // 1. Tenta criar registro de rastreamento (não-bloqueante — RLS pode impedir em alguns planos)
    let importacaoId: string | null = null;
    try {
      const { data: importRec } = await (supabase.from("importacoes_planilhas") as any)
        .insert({
          empresa_id: empresaAtual.id,
          tipo: importType,
          nome_arquivo: file?.name || null,
          total_linhas: rows.length,
          linhas_validas: validRows.length,
          linhas_com_erro: rows.length - validRows.length,
          status: "processando",
          criado_por: user.id,
        })
        .select()
        .single();
      if (importRec?.id) importacaoId = importRec.id;
    } catch {
      // Segue sem rastreamento
    }

    // 2. Fetch lookup data for name matching
    const [{ data: fornecedores }, { data: clientes }, { data: socios }, { data: categorias }] =
      await Promise.all([
        supabase.from("fornecedores").select("id, nome").eq("empresa_id", empresaAtual.id),
        supabase.from("clientes").select("id, nome").eq("empresa_id", empresaAtual.id),
        supabase.from("socios").select("id, nome").eq("empresa_id", empresaAtual.id),
        (supabase.from("categorias_financeiras") as any).select("id, nome").eq("empresa_id", empresaAtual.id),
      ]);

    const findId = (list: any[] | null, name: string) =>
      (list || []).find((item) => normalizeStr(item.nome) === normalizeStr(name))?.id || null;

    // 3. Insert records in batches of 50
    let successCount = 0;
    let dbError: string | undefined;

    if (importType === "contas_pagar" || importType === "contas_receber") {
      const table = importType;

      const buildRec = (r: ValidatedRow) => {
        const v = r.values;
        const vencimento = parseDate(v.vencimento) || "";
        const competencia = v.competencia || deriveCompetencia(vencimento);
        const status = v.status ? parseStatus(v.status, importType) : "pendente";
        const isPago = status === "pago" || status === "recebido";
        const dataMovimento = parseDate(v.data_movimento) || (isPago ? vencimento : null);

        // Campos obrigatórios (sempre presentes no schema original)
        const rec: any = {
          empresa_id: empresaAtual!.id,
          descricao: v.descricao,
          valor: parseNumber(v.valor) || 0,
          vencimento,
          competencia: competencia || null,
          categoria_id: v.categoria ? findId(categorias, v.categoria) : null,
          observacoes: v.observacoes || null,
          status,
          ...(importacaoId ? { importacao_id: importacaoId } : {}),
        };

        // Campos do schema expandido — enviados apenas quando têm valor,
        // para não quebrar se a migration ainda não foi aplicada
        if (v.forma_pagamento) rec.forma_pagamento = v.forma_pagamento;
        if (v.nota_fiscal) rec.nota_fiscal = v.nota_fiscal;
        if (dataMovimento) rec.data_movimento = dataMovimento;
        if (parseDate(v.data_prevista)) rec.data_prevista = parseDate(v.data_prevista);
        const vOrig = parseNumber(v.valor_original);
        if (vOrig != null) rec.valor_original = vOrig;
        const juros = parseNumber(v.juros);
        if (juros) rec.juros = juros;
        const multa = parseNumber(v.multa);
        if (multa) rec.multa = multa;
        const desconto = parseNumber(v.desconto);
        if (desconto) rec.desconto = desconto;
        const taxas = parseNumber(v.taxas);
        if (taxas) rec.taxas = taxas;

        if (importType === "contas_pagar") {
          rec.fornecedor_id = v.fornecedor ? findId(fornecedores, v.fornecedor) : null;
          if (status === "pago" && dataMovimento) rec.data_pagamento = dataMovimento;
        } else {
          rec.cliente_id = v.cliente ? findId(clientes, v.cliente) : null;
          if (status === "recebido" && dataMovimento) rec.data_recebimento = dataMovimento;
        }
        return rec;
      };

      for (let i = 0; i < validRows.length; i += 50) {
        const batch = validRows.slice(i, i + 50).map(buildRec);
        const { count, error: batchErr } = await insertWithRetry(table, batch);
        successCount += count;
        if (batchErr && !dbError) dbError = batchErr;
      }
    } else if (importType === "aportes") {
      const records = validRows.map((r) => {
        const v = r.values;
        return {
          empresa_id: empresaAtual!.id,
          descricao: v.descricao,
          valor: parseNumber(v.valor) || 0,
          data: parseDate(v.data) || "",
          socio_id: v.socio ? findId(socios, v.socio) : null,
          tipo: v.tipo as any,
          observacoes: v.observacoes || null,
          status: "pendente" as any,
          ...(importacaoId ? { importacao_id: importacaoId } : {}),
        };
      });

      for (let i = 0; i < records.length; i += 50) {
        const { count, error: batchErr } = await insertWithRetry("movimentacoes_societarias", records.slice(i, i + 50));
        successCount += count;
        if (batchErr && !dbError) dbError = batchErr;
      }
    } else if (importType === "extrato") {
      // Extrato bancário: valor negativo → contas_pagar, positivo → contas_receber
      const today = new Date().toISOString().split("T")[0];
      const pagRecords: any[] = [];
      const recRecords: any[] = [];

      for (const r of validRows) {
        const v = r.values;
        const valor = parseNumber(v.valor) ?? 0;
        const vencimento = parseDate(v.data) || today;
        const rec = {
          empresa_id: empresaAtual!.id,
          descricao: v.descricao,
          valor: Math.abs(valor),
          vencimento,
          competencia: deriveCompetencia(vencimento) || null,
          observacoes: v.observacoes || null,
          status: "pendente",
          ...(importacaoId ? { importacao_id: importacaoId } : {}),
        };
        if (valor < 0) pagRecords.push(rec);
        else recRecords.push(rec);
      }

      for (let i = 0; i < pagRecords.length; i += 50) {
        const { count, error: e } = await insertWithRetry("contas_pagar", pagRecords.slice(i, i + 50));
        successCount += count;
        if (e && !dbError) dbError = e;
      }
      for (let i = 0; i < recRecords.length; i += 50) {
        const { count, error: e } = await insertWithRetry("contas_receber", recRecords.slice(i, i + 50));
        successCount += count;
        if (e && !dbError) dbError = e;
      }
    }

    // 4. Atualiza rastreamento (se existir)
    if (importacaoId) {
      await (supabase.from("importacoes_planilhas") as any)
        .update({ status: dbError ? "erro" : "concluido", linhas_validas: successCount })
        .eq("id", importacaoId);
    }

    setImportResult({ success: successCount, errors: validRows.length - successCount, dbError });
    setImporting(false);
    fetchPastImports();
    if (dbError) {
      toast({ title: "Erro ao inserir no banco", description: dbError, variant: "destructive" });
    } else {
      toast({ title: `${successCount} registros importados com sucesso` });
    }
  };

  const handleRevert = async (imp: any) => {
    if (!user) return;
    setReverting(imp.id);

    const tableMap: Record<string, string> = {
      contas_pagar: "contas_pagar",
      contas_receber: "contas_receber",
      aportes: "movimentacoes_societarias",
    };
    const table = tableMap[imp.tipo];

    await (supabase.from(table) as any)
      .update({ status: "cancelado" })
      .eq("importacao_id", imp.id)
      .in("status", ["rascunho", "pendente"]);

    await (supabase.from("importacoes_planilhas") as any)
      .update({ status: "revertido", revertido_por: user.id, revertido_em: new Date().toISOString() })
      .eq("id", imp.id);

    toast({ title: "Importação revertida", description: "Registros pendentes foram cancelados." });
    setReverting(null);
    fetchPastImports();
  };

  const handleDownloadTemplate = () => {
    const fields = SYSTEM_FIELDS[importType];
    const header = fields.map((f) => f.label);
    const example = fields.map((f) => {
      if (f.name === "status") return "Pendente";
      if (f.name === "valor" && importType === "extrato") return "-1.500,00";
      if (f.type === "number") return "1.500,00";
      if (f.type === "date") return "31-12-2026";
      if (f.type === "enum") return f.enumValues?.[0] || "";
      return "Exemplo";
    });
    const ws = XLSX.utils.aoa_to_sheet([header, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    XLSX.writeFile(wb, `template_${importType}.xlsx`);
  };

  const fields = SYSTEM_FIELDS[importType];
  const validCount = validatedRows.filter((r) => r.valid).length;
  const errorCount = validatedRows.filter((r) => !r.valid).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="page-title">Importar Planilha</h1>
            <p className="text-sm text-muted-foreground mt-1">
              CSV ou XLSX — {empresaAtual?.nome || "Selecione uma empresa"}
            </p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center">
        {STEP_LABELS.map((label, idx) => {
          const s = (idx + 1) as Step;
          const active = step === s;
          const done = step > s;
          return (
            <div key={s} className="flex items-center flex-1 min-w-0">
              <div className={cn("flex items-center gap-2 text-sm shrink-0",
                active ? "text-primary font-medium" : done ? "text-success" : "text-muted-foreground")}>
                <div className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  active ? "bg-primary text-primary-foreground" :
                  done ? "bg-success/20 text-success" :
                  "bg-secondary text-muted-foreground"
                )}>
                  {done ? "✓" : s}
                </div>
                <span className="hidden md:block truncate">{label}</span>
              </div>
              {idx < STEP_LABELS.length - 1 && (
                <div className="flex-1 h-px bg-border mx-3" />
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Step 1: Type + File ─── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="stat-card space-y-4">
            <h2 className="font-medium text-sm uppercase tracking-widest text-muted-foreground">Tipo de Importação</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(Object.keys(TYPE_LABELS) as ImportType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setImportType(t)}
                  className={cn(
                    "p-4 rounded-lg border text-left transition-all",
                    importType === t
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40 bg-secondary"
                  )}
                >
                  <p className="font-medium text-sm">{TYPE_LABELS[t]}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t === "contas_pagar"   ? "Despesas, pagamentos, obrigações" :
                     t === "contas_receber" ? "Receitas, cobranças, créditos" :
                     t === "extrato"        ? "Valor negativo=despesa, positivo=receita" :
                     "Aportes, retiradas, empréstimos"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="stat-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-sm uppercase tracking-widest text-muted-foreground">Arquivo</h2>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Baixar Template
              </Button>
            </div>

            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all",
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              )}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFileChange(f);
              }}
            >
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">Clique ou arraste o arquivo aqui</p>
              <p className="text-xs text-muted-foreground mt-1">Formatos: .csv, .xlsx, .xls</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }}
            />
          </div>
        </div>
      )}

      {/* ─── Step 2: Column Mapping ─── */}
      {step === 2 && (
        <div className="stat-card space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-medium">Mapeamento de Colunas</h2>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{file?.name}</span> — {rows.length} linha(s)
            </p>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Campo do Sistema</th>
                <th>Coluna no Arquivo</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr key={field.name}>
                  <td>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{field.label}</span>
                      {field.required ? (
                        <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">obrigatório</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">opcional</Badge>
                      )}
                      {field.type === "enum" && (
                        <span className="text-[10px] text-muted-foreground hidden lg:inline">
                          ({field.enumValues?.join(" | ")})
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <Select
                      value={mapping[field.name] || "__skip__"}
                      onValueChange={(v) =>
                        setMapping({ ...mapping, [field.name]: v === "__skip__" ? "" : v })
                      }
                    >
                      <SelectTrigger className="bg-secondary border-border h-8 text-sm max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__skip__">— Ignorar —</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
            <Button onClick={handleValidate} className="flex-1">
              Validar Dados <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Preview + Validation ─── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="stat-card text-center">
              <p className="text-2xl font-bold font-mono">{rows.length}</p>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">Total</p>
            </div>
            <div className="stat-card text-center border-success/20">
              <p className="text-2xl font-bold text-success font-mono">{validCount}</p>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">Válidas</p>
            </div>
            <div className="stat-card text-center" style={{ borderColor: errorCount > 0 ? "hsl(var(--destructive) / 0.2)" : undefined }}>
              <p className={cn("text-2xl font-bold font-mono", errorCount > 0 ? "text-destructive" : "text-muted-foreground")}>
                {errorCount}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">Com Erro</p>
            </div>
          </div>

          {errorCount > 0 && (
            <div className="stat-card border-destructive/30 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h3 className="font-medium text-destructive text-sm">Erros encontrados (serão ignorados)</h3>
              </div>
              {validatedRows
                .filter((r) => !r.valid)
                .slice(0, 10)
                .map((r, i) => (
                  <div key={i} className="text-xs">
                    <span className="text-muted-foreground">Linha {i + 1}: </span>
                    <span>{r.errors.join("; ")}</span>
                  </div>
                ))}
              {errorCount > 10 && (
                <p className="text-xs text-muted-foreground">… e mais {errorCount - 10} linhas com erro.</p>
              )}
            </div>
          )}

          {validCount > 0 && (
            <div className="stat-card space-y-3">
              <h3 className="font-medium text-sm">
                Preview — primeiras {Math.min(5, validCount)} linhas válidas
              </h3>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      {fields.filter((f) => mapping[f.name]).map((f) => (
                        <th key={f.name}>{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validatedRows
                      .filter((r) => r.valid)
                      .slice(0, 5)
                      .map((r, i) => (
                        <tr key={i}>
                          {fields.filter((f) => mapping[f.name]).map((f) => (
                            <td key={f.name} className="text-sm">{r.values[f.name] || "—"}</td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
            <Button onClick={() => setStep(4)} disabled={validCount === 0} className="flex-1">
              Prosseguir para Importação <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── Step 4: Import ─── */}
      {step === 4 && (
        <div className="stat-card space-y-4">
          {!importResult ? (
            <>
              <h2 className="font-medium">Confirmar Importação</h2>
              <div className="rounded-lg bg-secondary border border-border p-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Empresa</span>
                  <span className="font-medium">{empresaAtual?.nome}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tipo</span>
                  <span className="font-medium">{TYPE_LABELS[importType]}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Registros válidos</span>
                  <span className="font-medium text-success">{validCount}</span>
                </div>
                {errorCount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ignorados (erro)</span>
                    <span className="font-medium text-destructive">{errorCount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status dos registros</span>
                  <span className="font-medium">
                    {SYSTEM_FIELDS[importType].some((f) => f.name === "status") && mapping["status"]
                      ? "Conforme coluna mapeada na planilha"
                      : "Pendente (padrão)"}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(3)}>Voltar</Button>
                <Button onClick={handleImport} disabled={importing || validCount === 0} className="flex-1">
                  {importing ? "Importando..." : `Importar ${validCount} registros`}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                {importResult.dbError ? (
                  <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-success shrink-0" />
                )}
                <div>
                  <h2 className="font-medium">
                    {importResult.dbError ? "Erro na importação" : "Importação concluída"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {importResult.success} importados
                    {importResult.errors > 0 && `, ${importResult.errors} falharam`}
                  </p>
                </div>
              </div>
              {importResult.dbError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive font-mono break-all">
                  {importResult.dbError}
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1);
                    setFile(null);
                    setImportResult(null);
                    setValidatedRows([]);
                    setHeaders([]);
                    setRows([]);
                  }}
                  className="flex-1"
                >
                  Nova Importação
                </Button>
                <Button
                  onClick={() =>
                    navigate(
                      importType === "aportes" ? "/aportes" :
                      importType === "contas_pagar" ? "/contas-pagar" : "/contas-receber"
                    )
                  }
                  className="flex-1"
                >
                  Ver Registros
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Past Imports / Rollback ─── */}
      {pastImports.length > 0 && (
        <div className="stat-card space-y-4">
          <h2 className="font-medium text-sm uppercase tracking-widest text-muted-foreground">
            Histórico de Importações
          </h2>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Arquivo</th>
                  <th>Tipo</th>
                  <th>Registros</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pastImports.map((imp) => (
                  <tr key={imp.id}>
                    <td className="text-sm max-w-[180px] truncate">{imp.nome_arquivo || "—"}</td>
                    <td>
                      <Badge variant="outline" className="text-xs">
                        {TYPE_LABELS[imp.tipo as ImportType] || imp.tipo}
                      </Badge>
                    </td>
                    <td className="text-sm font-mono">
                      {imp.linhas_validas}/{imp.total_linhas}
                    </td>
                    <td>
                      <Badge className={cn("text-xs border",
                        imp.status === "concluido" ? "bg-success/20 text-success border-success/30" :
                        imp.status === "revertido" ? "bg-muted text-muted-foreground border-border" :
                        imp.status === "erro" ? "bg-destructive/20 text-destructive border-destructive/30" :
                        "bg-warning/20 text-warning border-warning/30"
                      )}>
                        {imp.status}
                      </Badge>
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {new Date(imp.criado_em).toLocaleDateString("pt-BR")}
                    </td>
                    <td>
                      {imp.status === "concluido" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:bg-destructive/10"
                          disabled={reverting === imp.id}
                          onClick={() => handleRevert(imp)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          {reverting === imp.id ? "Revertendo..." : "Reverter"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
