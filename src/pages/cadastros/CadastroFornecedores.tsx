import CadastroGenerico from "./CadastroGenerico";

export default function CadastroFornecedores() {
  return (
    <CadastroGenerico
      title="Fornecedores"
      table="fornecedores"
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
