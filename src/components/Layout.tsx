import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, ChevronDown, LogOut } from "lucide-react";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PAGE_NAMES: Record<string, string> = {
  "/": "Dashboard",
  "/lancamentos": "Lancamentos",
  "/importacao": "Importar Planilha",
  "/aportes": "Aportes e Movimentacoes",
  "/distribuicao": "Distribuicao de Lucros",
  "/dre": "DRE Gerencial",
  "/fechamento": "Fechamento Mensal",
  "/configuracoes": "Configuracoes",
};

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { empresas, empresaAtual, setEmpresaAtual } = useEmpresa();
  const { signOut, user } = useAuth();
  const location = useLocation();

  const currentPageName = PAGE_NAMES[location.pathname] ||
    Object.entries(PAGE_NAMES).find(([path]) => path !== "/" && location.pathname.startsWith(path))?.[1] ||
    "";

  const displayEmpresas = empresas.length > 0 ? empresas : [
    { id: "mock-1", nome: "Empresa Alpha", razao_social: null, cnpj: null, ativa: true },
    { id: "mock-2", nome: "Empresa Beta", razao_social: null, cnpj: null, ativa: true },
    { id: "mock-3", nome: "Empresa Gamma", razao_social: null, cnpj: null, ativa: true },
  ];

  const corPrincipal = empresaAtual?.cor_principal || "#f97316";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar corEmpresa={corPrincipal} />
        <div className="flex-1 flex flex-col min-w-0">

          {/* Barra de identidade da empresa — 3px sólida com glow */}
          <div
            className="w-full shrink-0"
            style={{
              height: '3px',
              background: `linear-gradient(90deg, ${corPrincipal} 0%, ${corPrincipal}bb 55%, transparent 100%)`,
              boxShadow: `0 0 18px 0 ${corPrincipal}44`,
            }}
          />

          <header
            className="flex items-center justify-between border-b border-border px-4 bg-card/60 backdrop-blur-md shrink-0"
            style={{
              height: '52px',
              boxShadow: `0 1px 0 0 hsl(0 0% 14%), 0 4px 16px -4px ${corPrincipal}18`,
            }}
          >
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />

              {/* Chip da empresa — visivel em todos os tamanhos */}
              <div
                className="flex items-center gap-2 px-2.5 py-1 rounded-md border"
                style={{
                  borderColor: `${corPrincipal}33`,
                  background: `${corPrincipal}0d`,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: corPrincipal, boxShadow: `0 0 6px 0 ${corPrincipal}` }}
                />
                {empresaAtual?.logo_url ? (
                  <img src={empresaAtual.logo_url} alt="" className="h-4 w-4 object-contain rounded shrink-0" />
                ) : null}
                <span className="text-xs font-semibold tracking-tight text-foreground/90 max-w-[120px] sm:max-w-[180px] truncate">
                  {empresaAtual?.nome || displayEmpresas[0]?.nome || "\u2014"}
                </span>
              </div>

              {/* Current page name / breadcrumb */}
              {currentPageName && (
                <>
                  <span className="hidden sm:block text-muted-foreground/40 text-xs">/</span>
                  <span className="hidden sm:block text-xs text-muted-foreground font-medium truncate max-w-[200px]">
                    {currentPageName}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Seletor de empresa compacto */}
              <Select
                value={empresaAtual?.id || displayEmpresas[0]?.id}
                onValueChange={(id) => {
                  const emp = displayEmpresas.find((e) => e.id === id);
                  if (emp) setEmpresaAtual(emp);
                }}
              >
                <SelectTrigger className="h-8 w-8 bg-secondary/60 border-border hover:bg-secondary p-0 flex items-center justify-center [&>svg.lucide-chevron-down]:hidden">
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </SelectTrigger>
                <SelectContent align="end">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 pt-1 pb-1.5">Trocar empresa</p>
                  {displayEmpresas.map((e) => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Separador vertical */}
              <div className="h-5 w-px bg-border" />

              {user?.email && (
                <span className="text-[11px] text-muted-foreground hidden md:block truncate max-w-[160px]">
                  {user.email}
                </span>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                title="Sair"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </header>

          <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
