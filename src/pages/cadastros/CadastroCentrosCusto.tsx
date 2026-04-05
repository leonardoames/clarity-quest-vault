import CadastroGenerico from "./CadastroGenerico";

export default function CadastroCentrosCusto() {
  return (
    <CadastroGenerico
      title="Centros de Custo"
      table="centros_custo"
      fields={[
        { key: "nome", label: "Nome", required: true },
        { key: "descricao", label: "Descrição" },
      ]}
      columns={[
        { key: "nome", label: "Nome" },
        { key: "descricao", label: "Descrição" },
      ]}
    />
  );
}
