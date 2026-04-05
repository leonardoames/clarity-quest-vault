export interface ContaPagar {
  id: string;
  descricao: string;
  fornecedor: string;
  categoria: string;
  centroCusto: string;
  valor: number;
  vencimento: string;
  competencia: string;
  status: "rascunho" | "pendente" | "aprovado" | "pago" | "vencido" | "cancelado";
}

export interface ContaReceber {
  id: string;
  descricao: string;
  cliente: string;
  categoria: string;
  valor: number;
  vencimento: string;
  competencia: string;
  status: "rascunho" | "pendente" | "aprovado" | "recebido" | "vencido" | "cancelado" | "perdido";
}

export const contasPagar: ContaPagar[] = [
  { id: "1", descricao: "Aluguel escritório", fornecedor: "Imobiliária Central", categoria: "Aluguel", centroCusto: "Administrativo", valor: 4500, vencimento: "2026-04-10", competencia: "2026-04", status: "aprovado" },
  { id: "2", descricao: "Energia elétrica", fornecedor: "CEMIG", categoria: "Utilidades", centroCusto: "Administrativo", valor: 890, vencimento: "2026-04-15", competencia: "2026-04", status: "pendente" },
  { id: "3", descricao: "Software CRM", fornecedor: "SaaS Corp", categoria: "Tecnologia", centroCusto: "Comercial", valor: 1200, vencimento: "2026-04-05", competencia: "2026-04", status: "vencido" },
  { id: "4", descricao: "Consultoria jurídica", fornecedor: "Advocacia Silva", categoria: "Serviços", centroCusto: "Jurídico", valor: 3500, vencimento: "2026-04-20", competencia: "2026-04", status: "rascunho" },
  { id: "5", descricao: "Material de escritório", fornecedor: "Papelaria Express", categoria: "Insumos", centroCusto: "Administrativo", valor: 320, vencimento: "2026-04-12", competencia: "2026-04", status: "pago" },
  { id: "6", descricao: "Internet fibra", fornecedor: "Telecom BR", categoria: "Utilidades", centroCusto: "Administrativo", valor: 450, vencimento: "2026-04-18", competencia: "2026-04", status: "pendente" },
  { id: "7", descricao: "Seguro empresarial", fornecedor: "Seguradora Nacional", categoria: "Seguros", centroCusto: "Administrativo", valor: 2100, vencimento: "2026-04-25", competencia: "2026-04", status: "aprovado" },
];

export const contasReceber: ContaReceber[] = [
  { id: "1", descricao: "Projeto consultoria Q1", cliente: "Tech Solutions", categoria: "Serviços", valor: 25000, vencimento: "2026-04-10", competencia: "2026-04", status: "aprovado" },
  { id: "2", descricao: "Licença software mensal", cliente: "Varejo Plus", categoria: "Licenciamento", valor: 8500, vencimento: "2026-04-05", competencia: "2026-04", status: "recebido" },
  { id: "3", descricao: "Consultoria estratégica", cliente: "Indústria Norte", categoria: "Serviços", valor: 15000, vencimento: "2026-04-15", competencia: "2026-04", status: "pendente" },
  { id: "4", descricao: "Suporte técnico anual", cliente: "Banco Digital", categoria: "Suporte", valor: 36000, vencimento: "2026-04-20", competencia: "2026-04", status: "aprovado" },
  { id: "5", descricao: "Treinamento equipe", cliente: "Startup XYZ", categoria: "Treinamento", valor: 4200, vencimento: "2026-03-30", competencia: "2026-03", status: "vencido" },
  { id: "6", descricao: "Projeto mobile app", cliente: "E-commerce BR", categoria: "Desenvolvimento", valor: 42000, vencimento: "2026-04-28", competencia: "2026-04", status: "rascunho" },
];

export const dashboardData = {
  saldoAtual: 187450.32,
  totalPagar: 12960,
  totalReceber: 130700,
  vencimentos7d: 6590,
  vencimentos15d: 10290,
  vencimentos30d: 12960,
  resultadoCompetencia: 28340,
  resultadoCaixa: 15200,
  aportesNoMes: 50000,
  distribuicaoNoMes: 0,
  despesasPorCategoria: [
    { categoria: "Aluguel", valor: 4500 },
    { categoria: "Tecnologia", valor: 1200 },
    { categoria: "Utilidades", valor: 1340 },
    { categoria: "Serviços", valor: 3500 },
    { categoria: "Seguros", valor: 2100 },
    { categoria: "Insumos", valor: 320 },
  ],
  evolucaoMensal: [
    { mes: "Nov", receita: 85000, despesa: 52000 },
    { mes: "Dez", receita: 92000, despesa: 61000 },
    { mes: "Jan", receita: 78000, despesa: 55000 },
    { mes: "Fev", receita: 95000, despesa: 58000 },
    { mes: "Mar", receita: 110000, despesa: 63000 },
    { mes: "Abr", receita: 130700, despesa: 12960 },
  ],
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function getStatusConfig(status: string) {
  const configs: Record<string, { label: string; className: string }> = {
    rascunho: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
    pendente: { label: "Pendente", className: "bg-warning/15 text-warning" },
    aprovado: { label: "Aprovado", className: "bg-primary/15 text-primary" },
    pago: { label: "Pago", className: "bg-success/15 text-success" },
    recebido: { label: "Recebido", className: "bg-success/15 text-success" },
    vencido: { label: "Vencido", className: "bg-destructive/15 text-destructive" },
    cancelado: { label: "Cancelado", className: "bg-muted text-muted-foreground line-through" },
    perdido: { label: "Perdido", className: "bg-destructive/15 text-destructive" },
  };
  return configs[status] || { label: status, className: "bg-muted text-muted-foreground" };
}
