import { Settings as SettingsIcon, Users, Building2, UserCheck, Wallet, Tags, Target, CreditCard, User, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Configuracoes() {
  const navigate = useNavigate();

  const items = [
    { title: "Empresas", desc: "Cadastro e gestão de empresas do grupo", icon: Building2, route: "/configuracoes/empresas" },
    { title: "Usuários e Perfis", desc: "Gerenciar acessos e permissões", icon: Users, route: "/configuracoes/usuarios" },
    { title: "Sócios", desc: "Cadastro de sócios por empresa", icon: UserCheck, route: "/configuracoes/socios" },
    { title: "Clientes", desc: "Cadastro de clientes", icon: Wallet, route: "/configuracoes/clientes" },
    { title: "Fornecedores", desc: "Cadastro de fornecedores", icon: Wallet, route: "/configuracoes/fornecedores" },
    { title: "Categorias Financeiras", desc: "Classificação de receitas e despesas", icon: Tags, route: "/configuracoes/categorias" },
    { title: "Centros de Custo", desc: "Centros de custo para rateio", icon: Target, route: "/configuracoes/centros-custo" },
    { title: "Contas Bancárias", desc: "Contas bancárias para classificação de lançamentos", icon: CreditCard, route: "/configuracoes/contas-caixa" },
    { title: "Importar Planilha", desc: "Importe CSV ou XLSX de contas, receitas e aportes", icon: Upload, route: "/importacao" },
    { title: "Meu Perfil", desc: "Editar nome e alterar senha", icon: User, route: "/configuracoes/meu-perfil" },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerenciar empresas, usuários e cadastros</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <div
            key={item.title}
            className="stat-card cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate(item.route)}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <item.icon className="h-4 w-4 text-muted-foreground" />
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
