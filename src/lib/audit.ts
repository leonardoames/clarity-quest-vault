import { supabase } from "@/integrations/supabase/client";

export async function logAcao(params: {
  tabela: string;
  acao: string;
  registro_id?: string;
  empresa_id?: string;
  detalhes?: Record<string, unknown>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await (supabase.from("historico_acoes") as any).insert({
    user_id: user.id,
    tabela: params.tabela,
    acao: params.acao,
    registro_id: params.registro_id || null,
    empresa_id: params.empresa_id || null,
    detalhes: params.detalhes || null,
  });
}
