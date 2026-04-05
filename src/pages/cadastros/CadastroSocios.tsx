import CadastroGenerico from "./CadastroGenerico";

export default function CadastroSocios() {
  return (
    <CadastroGenerico
      title="Sócios"
      table="socios"
      fields={[
        { key: "nome", label: "Nome", required: true },
        { key: "cpf", label: "CPF" },
        { key: "email", label: "Email", type: "email" },
        { key: "percentual_societario", label: "Percentual (%)", type: "number" },
      ]}
      columns={[
        { key: "nome", label: "Nome" },
        { key: "cpf", label: "CPF" },
        { key: "email", label: "Email" },
        { key: "percentual_societario", label: "%", render: (v) => v ? `${v}%` : "—" },
      ]}
    />
  );
}
