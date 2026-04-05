import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, LogOut } from "lucide-react";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { empresas, empresaAtual, setEmpresaAtual } = useEmpresa();
  const { signOut, user } = useAuth();

  // Use mock empresas if DB is empty
  const displayEmpresas = empresas.length > 0 ? empresas : [
    { id: "mock-1", nome: "Empresa Alpha", razao_social: null, cnpj: null, ativa: true },
    { id: "mock-2", nome: "Empresa Beta", razao_social: null, cnpj: null, ativa: true },
    { id: "mock-3", nome: "Empresa Gamma", razao_social: null, cnpj: null, ativa: true },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card/50 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-muted-foreground" />
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={empresaAtual?.id || displayEmpresas[0]?.id}
                onValueChange={(id) => {
                  const emp = displayEmpresas.find((e) => e.id === id);
                  if (emp) setEmpresaAtual(emp);
                }}
              >
                <SelectTrigger className="w-[200px] h-9 bg-secondary border-border text-sm">
                  <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {displayEmpresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground hidden md:block truncate max-w-[150px]">
                {user?.email}
              </span>
              <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
