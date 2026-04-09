import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_ROLES = ["socio_admin", "financeiro_aprovador", "financeiro_operador", "visualizador"] as const;

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // ── Auth: verify caller is authenticated ────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Não autenticado" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: caller },
      error: authErr,
    } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !caller) {
      return jsonResponse({ error: "Não autenticado" }, 401);
    }

    // ── Auth: verify caller is socio_admin ──────────────────────────────────
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "socio_admin")
      .maybeSingle();

    if (!callerRole) {
      return jsonResponse({ error: "Sem permissão: apenas socio_admin pode gerenciar usuários" }, 403);
    }

    // ── Caller's empresas (used for scoping throughout) ─────────────────────
    const { data: callerEmpresaRows, error: callerEmpresaErr } = await supabaseAdmin
      .from("empresa_users")
      .select("empresa_id")
      .eq("user_id", caller.id)
      .eq("ativo", true);

    if (callerEmpresaErr) {
      return jsonResponse({ error: "Erro ao verificar empresas do administrador" }, 500);
    }

    const callerEmpresaIds: string[] = (callerEmpresaRows ?? []).map((r: any) => r.empresa_id);

    // ── Parse body ──────────────────────────────────────────────────────────
    const body = await req.json();
    const action: string = typeof body?.action === "string" ? body.action : "";

    // ════════════════════════════════════════════════════════════════════════
    // action: list_users
    // Returns only users that share at least one empresa with the calling admin.
    // ════════════════════════════════════════════════════════════════════════
    if (action === "list_users") {
      if (callerEmpresaIds.length === 0) {
        // Admin has no empresas — return empty list
        return jsonResponse([]);
      }

      // All empresa_user rows for the caller's empresas (gives us the in-scope user_ids)
      const { data: scopedEmpresaUsers, error: euErr } = await supabaseAdmin
        .from("empresa_users")
        .select("user_id, empresa_id, ativo, empresas(nome)")
        .in("empresa_id", callerEmpresaIds);

      if (euErr) {
        return jsonResponse({ error: "Erro ao listar usuários" }, 500);
      }

      // Collect unique user_ids that are in scope
      const scopedUserIds: string[] = [
        ...new Set((scopedEmpresaUsers ?? []).map((r: any) => r.user_id as string)),
      ];

      if (scopedUserIds.length === 0) {
        return jsonResponse([]);
      }

      // Fetch roles for all scoped users
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", scopedUserIds);

      // Fetch auth user details for all scoped users
      // supabase admin listUsers is paginated; fetch only the users we need via getUserById
      // To avoid N+1 we use listUsers and filter client-side (typical tenant size is small)
      const { data: { users: allAuthUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const authMap = new Map<string, any>();
      for (const au of allAuthUsers ?? []) {
        if (scopedUserIds.includes(au.id)) {
          authMap.set(au.id, au);
        }
      }

      // Build result map
      const userMap = new Map<string, any>();
      for (const userId of scopedUserIds) {
        const au = authMap.get(userId);
        if (!au) continue; // auth record missing — skip
        userMap.set(userId, {
          id: au.id,
          email: au.email ?? "",
          must_reset_password: au.user_metadata?.must_reset_password ?? false,
          created_at: au.created_at,
          empresas: [],
          roles: [],
        });
      }

      // Attach empresa links
      for (const eu of scopedEmpresaUsers ?? []) {
        const u = userMap.get(eu.user_id);
        if (u) {
          u.empresas.push({
            empresa_id: eu.empresa_id,
            empresa_nome: (eu as any).empresas?.nome ?? null,
            ativo: eu.ativo,
          });
        }
      }

      // Attach roles
      for (const r of roles ?? []) {
        const u = userMap.get(r.user_id);
        if (u) u.roles.push(r.role);
      }

      return jsonResponse(Array.from(userMap.values()));
    }

    // ════════════════════════════════════════════════════════════════════════
    // action: create_user
    // ════════════════════════════════════════════════════════════════════════
    if (action === "create_user") {
      const { email, password, role, empresa_ids } = body;

      if (!email || typeof email !== "string" || !email.includes("@")) {
        return jsonResponse({ error: "Email inválido" }, 400);
      }
      if (!password || typeof password !== "string" || password.length < 6) {
        return jsonResponse({ error: "Senha deve ter pelo menos 6 caracteres" }, 400);
      }
      if (!role || !VALID_ROLES.includes(role)) {
        return jsonResponse({ error: "Perfil inválido" }, 400);
      }

      // Ensure all requested empresa_ids are ones the caller administers
      const requestedIds: string[] = Array.isArray(empresa_ids) ? empresa_ids : [];
      const unauthorizedIds = requestedIds.filter((id) => !callerEmpresaIds.includes(id));
      if (unauthorizedIds.length > 0) {
        return jsonResponse({ error: "Sem permissão para vincular uma ou mais empresas solicitadas" }, 403);
      }

      // Create the auth user
      const { data: newUserData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { must_reset_password: true },
      });

      if (createErr || !newUserData?.user) {
        return jsonResponse({ error: createErr?.message ?? "Falha ao criar usuário" }, 400);
      }

      const newUserId = newUserData.user.id;

      // Insert role
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUserId, role });

      if (roleErr) {
        // Best-effort cleanup
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        return jsonResponse({ error: "Falha ao atribuir perfil ao usuário" }, 500);
      }

      // Link to empresas
      if (requestedIds.length > 0) {
        const links = requestedIds.map((eid) => ({
          user_id: newUserId,
          empresa_id: eid,
          ativo: true,
        }));
        const { error: linkErr } = await supabaseAdmin.from("empresa_users").insert(links);
        if (linkErr) {
          return jsonResponse({ error: "Falha ao vincular empresas ao usuário" }, 500);
        }
      }

      return jsonResponse({ user_id: newUserId });
    }

    // ════════════════════════════════════════════════════════════════════════
    // action: update_role
    // Only allowed for users that share at least one empresa with the caller.
    // ════════════════════════════════════════════════════════════════════════
    if (action === "update_role") {
      const { user_id, role } = body;

      if (!user_id || typeof user_id !== "string") {
        return jsonResponse({ error: "user_id é obrigatório" }, 400);
      }
      if (!role || !VALID_ROLES.includes(role)) {
        return jsonResponse({ error: "Perfil inválido" }, 400);
      }

      // Scope check: target user must share at least one empresa with caller
      if (callerEmpresaIds.length === 0) {
        return jsonResponse({ error: "Sem permissão: administrador não possui empresas vinculadas" }, 403);
      }
      const { data: sharedEmpresa } = await supabaseAdmin
        .from("empresa_users")
        .select("empresa_id")
        .eq("user_id", user_id)
        .in("empresa_id", callerEmpresaIds)
        .limit(1)
        .maybeSingle();

      if (!sharedEmpresa) {
        return jsonResponse({ error: "Sem permissão para alterar o perfil deste usuário" }, 403);
      }

      // Replace role (delete then insert to avoid duplicates)
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
      const { error: insertErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id, role });

      if (insertErr) {
        return jsonResponse({ error: "Falha ao atualizar perfil" }, 500);
      }

      return jsonResponse({ success: true });
    }

    // ════════════════════════════════════════════════════════════════════════
    // action: link_empresa
    // Caller must have access to the target empresa.
    // ════════════════════════════════════════════════════════════════════════
    if (action === "link_empresa") {
      const { user_id, empresa_id } = body;

      if (!user_id || typeof user_id !== "string") {
        return jsonResponse({ error: "user_id é obrigatório" }, 400);
      }
      if (!empresa_id || typeof empresa_id !== "string") {
        return jsonResponse({ error: "empresa_id é obrigatório" }, 400);
      }

      // Scope check: caller must belong to this empresa
      if (!callerEmpresaIds.includes(empresa_id)) {
        return jsonResponse({ error: "Sem permissão para vincular usuários a esta empresa" }, 403);
      }

      const { error: upsertErr } = await supabaseAdmin
        .from("empresa_users")
        .upsert(
          { user_id, empresa_id, ativo: true },
          { onConflict: "user_id,empresa_id" }
        );

      if (upsertErr) {
        return jsonResponse({ error: "Falha ao vincular empresa" }, 500);
      }

      return jsonResponse({ success: true });
    }

    // ════════════════════════════════════════════════════════════════════════
    // action: unlink_empresa
    // Caller must have access to the target empresa.
    // ════════════════════════════════════════════════════════════════════════
    if (action === "unlink_empresa") {
      const { user_id, empresa_id } = body;

      if (!user_id || typeof user_id !== "string") {
        return jsonResponse({ error: "user_id é obrigatório" }, 400);
      }
      if (!empresa_id || typeof empresa_id !== "string") {
        return jsonResponse({ error: "empresa_id é obrigatório" }, 400);
      }

      // Scope check: caller must belong to this empresa
      if (!callerEmpresaIds.includes(empresa_id)) {
        return jsonResponse({ error: "Sem permissão para desvincular usuários desta empresa" }, 403);
      }

      const { error: updateErr } = await supabaseAdmin
        .from("empresa_users")
        .update({ ativo: false })
        .eq("user_id", user_id)
        .eq("empresa_id", empresa_id);

      if (updateErr) {
        return jsonResponse({ error: "Falha ao desvincular empresa" }, 500);
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Ação inválida" }, 400);
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
