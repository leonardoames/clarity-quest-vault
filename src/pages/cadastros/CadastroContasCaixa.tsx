import CadastroGenerico from "./CadastroGenerico";
import { formatCurrency } from "@/lib/mock-data";

export default function CadastroContasCaixa() {
  return (
    <CadastroGenerico
      title="Contas de Caixa"
      table="contas_caixa"
      activeField="ativa"
      fields={[
        { key: "nome", label: "Nome", required: true },
        { key: "tipo", label: "Tipo", type: "select", options: [
          { value: "corrente", label: "Conta Corrente" },
          { value: "poupanca", label: "Poupança" },
          { value: "caixa", label: "Caixa" },
          { value: "investimento", label: "Investimento" },
        ]},
        { key: "saldo_inicial", label: "Saldo Inicial", type: "number" },
      ]}
      columns={[
        { key: "nome", label: "Nome" },
        { key: "tipo", label: "Tipo" },
        { key: "saldo_inicial", label: "Saldo Inicial", render: (v) => formatCurrency(Number(v) || 0) },
      ]}
    />
  );
}
