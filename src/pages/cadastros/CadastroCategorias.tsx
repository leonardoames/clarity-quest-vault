import CadastroGenerico from "./CadastroGenerico";
import React from "react";
import { Button } from "@/components/ui/button";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function CadastroCategorias() {
  const { empresaAtual } = useEmpresa();
  const { toast } = useToast();

  const handleCriarPadrao = async () => {
    if (!empresaAtual?.id) return;
    await (supabase.rpc as any)("criar_categorias_padrao", { p_empresa_id: empresaAtual.id });
    toast({ title: "Categorias padrão criadas" });
  };

  const handleCriarEcommerce = async () => {
    if (!empresaAtual?.id) return;
    await (supabase.rpc as any)("criar_categorias_ecommerce", { p_empresa_id: empresaAtual.id });
    toast({ title: "Categorias e-commerce criadas" });
  };

  return (
    <CadastroGenerico
      title="Categorias Financeiras"
      table="categorias_financeiras"
      activeField="ativa"
      fields={[
        { key: "nome", label: "Nome", required: true },
        { key: "tipo", label: "Tipo", type: "select", options: [
          { value: "receita", label: "Receita" },
          { value: "despesa", label: "Despesa" },
          { value: "ambos", label: "Ambos" },
        ]},
      ]}
      columns={[
        { key: "nome", label: "Nome" },
        { key: "tipo", label: "Tipo", render: (v: unknown): React.ReactNode => {
          const labels: Record<string, string> = { receita: "Receita", despesa: "Despesa", ambos: "Ambos" };
          return labels[v as string] || String(v);
        }},
      ]}
      extraActions={
        <>
          <Button variant="outline" size="sm" onClick={handleCriarPadrao}>
            Criar Categorias Padrão
          </Button>
          <Button variant="outline" size="sm" onClick={handleCriarEcommerce}>
            Categorias E-commerce
          </Button>
        </>
      }
    />
  );
}
