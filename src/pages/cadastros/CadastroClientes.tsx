import CadastroGenerico from "./CadastroGenerico";

export default function CadastroClientes() {
  return (
    <CadastroGenerico
      title="Clientes"
      table="clientes"
      fields={[
        { key: "nome", label: "Nome", required: true },
        { key: "cnpj_cpf", label: "CNPJ/CPF" },
        { key: "email", label: "Email", type: "email" },
        { key: "telefone", label: "Telefone" },
      ]}
      columns={[
        { key: "nome", label: "Nome" },
        { key: "cnpj_cpf", label: "CNPJ/CPF" },
        { key: "email", label: "Email" },
        { key: "telefone", label: "Telefone" },
      ]}
    />
  );
}
