import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  PieChart,
  Lock,
  Settings,
  TrendingUp,
  Upload,
  Activity,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Contas a Pagar", url: "/contas-pagar", icon: ArrowDownCircle },
  { title: "Contas a Receber", url: "/contas-receber", icon: ArrowUpCircle },
  { title: "Fluxo de Caixa", url: "/fluxo-caixa", icon: Activity },
  { title: "Importar Planilha", url: "/importacao", icon: Upload },
];

const societarioItems = [
  { title: "Aportes e Movimentações", url: "/aportes", icon: Users },
  { title: "Distribuição de Lucros", url: "/distribuicao", icon: PieChart },
];

const gestaoItems = [
  { title: "DRE Gerencial", url: "/dre", icon: TrendingUp },
  { title: "Fechamento Mensal", url: "/fechamento", icon: Lock },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const renderItems = (items: typeof mainItems) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            end={item.url === "/"}
            className="group flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium [&>svg]:text-primary"
          >
            <item.icon className="h-4 w-4 shrink-0 transition-colors" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
            <span
              className="text-primary font-black text-xs tracking-tighter leading-none"
              style={{ fontFamily: 'Space Mono, monospace' }}
            >
              W3
            </span>
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-orange-pulse" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-sidebar-accent-foreground tracking-tight leading-none">
                W3 Finanças
              </p>
              <p className="text-[10px] text-sidebar-foreground/50 mt-0.5 uppercase tracking-widest">
                Gestão Financeira
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-3">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="px-4 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 mb-1">
              Principal
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 px-2">
              {renderItems(mainItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          {!collapsed && (
            <SidebarGroupLabel className="px-4 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 mb-1">
              Societário
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 px-2">
              {renderItems(societarioItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          {!collapsed && (
            <SidebarGroupLabel className="px-4 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 mb-1">
              Gestão
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 px-2">
              {renderItems(gestaoItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border pb-4">
        <SidebarMenu className="px-2 pt-3">
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/configuracoes"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground [&>svg]:text-primary"
              >
                <Settings className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Configurações</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
