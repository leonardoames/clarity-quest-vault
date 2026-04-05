import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { EmpresaProvider } from "@/contexts/EmpresaContext";
import { Layout } from "@/components/Layout";
import Login from "./pages/Login";
import ResetSenha from "./pages/ResetSenha";
import Index from "./pages/Index";
import ContasPagar from "./pages/ContasPagar";
import ContasReceber from "./pages/ContasReceber";
import Aportes from "./pages/Aportes";
import Distribuicao from "./pages/Distribuicao";
import DRE from "./pages/DRE";
import Fechamento from "./pages/Fechamento";
import Configuracoes from "./pages/Configuracoes";
import GestaoUsuarios from "./pages/GestaoUsuarios";
import CadastroEmpresas from "./pages/cadastros/CadastroEmpresas";
import CadastroFornecedores from "./pages/cadastros/CadastroFornecedores";
import CadastroClientes from "./pages/cadastros/CadastroClientes";
import CadastroCategorias from "./pages/cadastros/CadastroCategorias";
import CadastroCentrosCusto from "./pages/cadastros/CadastroCentrosCusto";
import CadastroContasCaixa from "./pages/cadastros/CadastroContasCaixa";
import CadastroSocios from "./pages/cadastros/CadastroSocios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (user.user_metadata?.must_reset_password) {
    return <ResetSenha />;
  }

  return (
    <EmpresaProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/contas-pagar" element={<ContasPagar />} />
          <Route path="/contas-receber" element={<ContasReceber />} />
          <Route path="/aportes" element={<Aportes />} />
          <Route path="/distribuicao" element={<Distribuicao />} />
          <Route path="/dre" element={<DRE />} />
          <Route path="/fechamento" element={<Fechamento />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/configuracoes/usuarios" element={<GestaoUsuarios />} />
          <Route path="/configuracoes/empresas" element={<CadastroEmpresas />} />
          <Route path="/configuracoes/fornecedores" element={<CadastroFornecedores />} />
          <Route path="/configuracoes/clientes" element={<CadastroClientes />} />
          <Route path="/configuracoes/categorias" element={<CadastroCategorias />} />
          <Route path="/configuracoes/centros-custo" element={<CadastroCentrosCusto />} />
          <Route path="/configuracoes/contas-caixa" element={<CadastroContasCaixa />} />
          <Route path="/configuracoes/socios" element={<CadastroSocios />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </EmpresaProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
