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

  const displayEmpresas = empresas.length > 0 ? empresas : [
    { id: "mock-1", nome: "Empresa Alpha", razao_social: null, cnpj: null, ativa: true },
    { id: "mock-2", nome: "Empresa Beta", razao_social: null, cnpj: null, ativa: true },
    { id: "mock-3", nome: "Empresa Gamma", razao_social: null, cnpj: null, ativa: true },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Linha laranja no topo do header */}
          <div className="h-[2px] w-full bg-gradient-to-r from-primary via-warning to-transparent shrink-0" />

          <header className="h-13 flex items-center justify-between border-b border-border px-4 bg-card/40 backdrop-blur-sm shrink-0" style={{ height: '52px' }}>
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
            </div>

            <div className="flex items-center gap-3">
              <Select
                value={empresaAtual?.id || displayEmpresas[0]?.id}
                onValueChange={(id) => {
                  const emp = displayEmpresas.find((e) => e.id === id);
                  if (emp) setEmpresaAtual(emp);
                }}
              >
                <SelectTrigger className="w-[190px] h-8 bg-secondary border-border text-xs font-medium">
                  <Building2 className="h-3 w-3 mr-1.5 text-muted-foreground shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {displayEmpresas.map((e) => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {user?.email && (
                <span className="text-[11px] text-muted-foreground hidden md:block truncate max-w-[140px]">
                  {user.email}
                </span>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
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
