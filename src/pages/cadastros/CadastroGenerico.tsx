import { useState } from "react";
import { Plus, ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useEmpresaData } from "@/hooks/useEmpresaData";

interface FieldConfig {
  key: string;
  label: string;
  type?: "text" | "number" | "email" | "select";
  options?: { value: string; label: string }[];
  required?: boolean;
}

interface CadastroGenericoProps {
  title: string;
  table: "fornecedores" | "clientes" | "categorias_financeiras" | "centros_custo" | "contas_caixa" | "socios";
  fields: FieldConfig[];
  activeField?: string;
  columns: { key: string; label: string; render?: (val: unknown, row: Record<string, unknown>) => React.ReactNode }[];
}

export default function CadastroGenerico({ title, table, fields, activeField = "ativo", columns }: CadastroGenericoProps) {
  const navigate = useNavigate();
  const { data, loading, insert, update } = useEmpresaData<Record<string, unknown>>(table, { orderBy: "nome" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const sf = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const openCreate = () => {
    setEditingId(null);
    setForm({});
    setDialogOpen(true);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditingId(row.id as string);
    const prefill: Record<string, string> = {};
    fields.forEach((f) => { prefill[f.key] = row[f.key] != null ? String(row[f.key]) : ""; });
    setForm(prefill);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm({});
  };

  const handleSave = async () => {
    if (fields.some((f) => f.required && !form[f.key])) return;

    const record: Record<string, unknown> = {};
    fields.forEach((f) => {
      const v = form[f.key];
      record[f.key] = v && v !== "__none__" ? v : null;
    });

    if (editingId) {
      await update(editingId, record);
    } else {
      await insert(record);
    }
    closeDialog();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await update(id, { [activeField]: !current } as Record<string, unknown>);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="page-title">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{data.length} registro(s)</p>
          </div>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Novo</Button>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar registro" : "Novo registro"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {fields.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label>{f.label}{f.required && " *"}</Label>
                {f.type === "select" ? (
                  <Select
                    value={form[f.key] || "__none__"}
                    onValueChange={(v) => sf(f.key, v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Selecionar —</SelectItem>
                      {f.options?.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={f.type || "text"}
                    value={form[f.key] || ""}
                    onChange={(e) => sf(f.key, e.target.value)}
                    className="bg-secondary border-border"
                    onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                  />
                )}
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={closeDialog}>Cancelar</Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={fields.some((f) => f.required && !form[f.key])}
              >
                {editingId ? "Salvar alterações" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="stat-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                <th>Ativo</th>
                <th>Editar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length + 2} className="text-center text-muted-foreground py-8">Carregando...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={columns.length + 2} className="text-center text-muted-foreground py-8">Nenhum registro</td></tr>
              ) : data.map((row) => (
                <tr key={row.id as string}>
                  {columns.map((c) => (
                    <td key={c.key} className={c.key === "nome" ? "font-medium" : "text-muted-foreground text-sm"}>
                      {c.render ? c.render(row[c.key], row) : (row[c.key] as string) || "—"}
                    </td>
                  ))}
                  <td>
                    <Switch
                      checked={!!row[activeField]}
                      onCheckedChange={() => toggleActive(row.id as string, !!row[activeField])}
                    />
                  </td>
                  <td>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => openEdit(row)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
