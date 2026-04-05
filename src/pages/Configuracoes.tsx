import { Settings as SettingsIcon } from "lucide-react";

export default function Configuracoes() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerenciar empresas, usuários e cadastros</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: "Empresas", desc: "Cadastro e gestão de empresas do grupo" },
          { title: "Usuários e Perfis", desc: "Gerenciar acessos e permissões" },
          { title: "Sócios", desc: "Cadastro de sócios por empresa" },
          { title: "Clientes", desc: "Cadastro de clientes" },
          { title: "Fornecedores", desc: "Cadastro de fornecedores" },
          { title: "Categorias Financeiras", desc: "Classificação de receitas e despesas" },
          { title: "Centros de Custo", desc: "Centros de custo para rateio" },
          { title: "Contas de Caixa", desc: "Contas internas de caixa" },
        ].map((item) => (
          <div key={item.title} className="stat-card cursor-pointer hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <SettingsIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
