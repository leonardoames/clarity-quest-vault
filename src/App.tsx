import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner, toast } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { EmpresaProvider } from "@/contexts/EmpresaContext";
import { Layout } from "@/components/Layout";
import { useRole } from "@/hooks/useRole";
import Login from "./pages/Login";
import ResetSenha from "./pages/ResetSenha";
import Index from "./pages/Index";
import Lancamentos from "./pages/Lancamentos";
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
import MeuPerfil from "./pages/MeuPerfil";
import Importacao from "./pages/Importacao";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: string[];
}) {
  const { role, loading } = useRole();

  const isDenied =
    !loading &&
    requiredRole &&
    (role === null || !requiredRole.includes(role));

  useEffect(() => {
    if (isDenied) {
      toast.error("Sem permissão para acessar esta página");
    }
  }, [isDenied]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Verificando permissões...</div>
      </div>
    );
  }

  if (isDenied) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

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
          <Route path="/lancamentos" element={<Lancamentos />} />
          <Route path="/contas-pagar" element={<Navigate to="/lancamentos" replace />} />
          <Route path="/contas-receber" element={<Navigate to="/lancamentos" replace />} />
          <Route path="/fluxo-caixa" element={<Navigate to="/lancamentos" replace />} />
          <Route path="/aportes" element={<Aportes />} />
          <Route path="/distribuicao" element={<ProtectedRoute requiredRole={["socio_admin", "financeiro_aprovador"]}><Distribuicao /></ProtectedRoute>} />
          <Route path="/dre" element={<DRE />} />
          <Route path="/fechamento" element={<ProtectedRoute requiredRole={["socio_admin", "financeiro_aprovador"]}><Fechamento /></ProtectedRoute>} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/configuracoes/usuarios" element={<ProtectedRoute requiredRole={["socio_admin"]}><GestaoUsuarios /></ProtectedRoute>} />
          <Route path="/configuracoes/empresas" element={<ProtectedRoute requiredRole={["socio_admin"]}><CadastroEmpresas /></ProtectedRoute>} />
          <Route path="/configuracoes/fornecedores" element={<CadastroFornecedores />} />
          <Route path="/configuracoes/clientes" element={<CadastroClientes />} />
          <Route path="/configuracoes/categorias" element={<CadastroCategorias />} />
          <Route path="/configuracoes/centros-custo" element={<CadastroCentrosCusto />} />
          <Route path="/configuracoes/contas-caixa" element={<CadastroContasCaixa />} />
          <Route path="/configuracoes/socios" element={<CadastroSocios />} />
          <Route path="/configuracoes/meu-perfil" element={<MeuPerfil />} />
          <Route path="/importacao" element={<Importacao />} />
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
