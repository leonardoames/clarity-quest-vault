import { useState } from "react";
import { Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  const [form, setForm] = useState<Record<string, string>>({});

  const handleSave = async () => {
    const missing = fields.filter((f) => f.required && !form[f.key]);
    if (missing.length > 0) return;

    const record: Record<string, unknown> = {};
    fields.forEach((f) => {
      record[f.key] = form[f.key] || null;
    });

    const result = await insert(record);
    if (result) {
      setDialogOpen(false);
      setForm({});
    }
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Novo registro</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {fields.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label>{f.label}{f.required && " *"}</Label>
                  {f.type === "select" ? (
                    <Select value={form[f.key] || ""} onValueChange={(v) => setForm({ ...form, [f.key]: v })}>
                      <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        {f.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={f.type || "text"}
                      value={form[f.key] || ""}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      className="bg-secondary border-border"
                    />
                  )}
                </div>
              ))}
              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="stat-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                <th>Ativo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length + 1} className="text-center text-muted-foreground">Carregando...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="text-center text-muted-foreground">Nenhum registro</td></tr>
              ) : data.map((row) => (
                <tr key={row.id as string}>
                  {columns.map((c) => (
                    <td key={c.key} className={c.key === "nome" ? "font-medium" : "text-muted-foreground"}>
                      {c.render ? c.render(row[c.key], row) : (row[c.key] as string) || "—"}
                    </td>
                  ))}
                  <td><Switch checked={row[activeField] as boolean} onCheckedChange={() => toggleActive(row.id as string, row[activeField] as boolean)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
