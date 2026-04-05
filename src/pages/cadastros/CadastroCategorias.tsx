import CadastroGenerico from "./CadastroGenerico";
import React from "react";

export default function CadastroCategorias() {
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
    />
  );
}
