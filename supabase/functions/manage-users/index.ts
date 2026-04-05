import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "socio_admin")
      .maybeSingle();

    if (!callerRole) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action : "";
    const payload = body || {};

    if (action === "create_user") {
      const { email, password, role, empresa_ids } = payload;

      // Validate inputs
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return new Response(JSON.stringify({ error: "Email inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!password || typeof password !== "string" || password.length < 6) {
        return new Response(JSON.stringify({ error: "Senha deve ter pelo menos 6 caracteres" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const validRoles = ["socio_admin", "financeiro_aprovador", "financeiro_operador", "visualizador"];
      if (!role || !validRoles.includes(role)) {
        return new Response(JSON.stringify({ error: "Perfil inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create user
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { must_reset_password: true },
      });

      if (createErr) {
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Assign role
      await supabaseAdmin.from("user_roles").insert({
        user_id: newUser.user!.id,
        role,
      });

      // Link to empresas
      if (empresa_ids?.length) {
        const links = empresa_ids.map((eid: string) => ({
          user_id: newUser.user!.id,
          empresa_id: eid,
        }));
        await supabaseAdmin.from("empresa_users").insert(links);
      }

      return new Response(JSON.stringify({ user_id: newUser.user!.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_users") {
      // Get all empresa_users with roles
      const { data: empresaUsers } = await supabaseAdmin
        .from("empresa_users")
        .select("user_id, empresa_id, ativo, empresas(nome)");

      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role");

      // Get all auth users
      const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers();

      const userMap = new Map<string, any>();
      for (const au of authUsers) {
        userMap.set(au.id, {
          id: au.id,
          email: au.email,
          must_reset_password: au.user_metadata?.must_reset_password ?? false,
          created_at: au.created_at,
          empresas: [],
          roles: [],
        });
      }

      for (const eu of empresaUsers || []) {
        const u = userMap.get(eu.user_id);
        if (u) {
          u.empresas.push({
            empresa_id: eu.empresa_id,
            empresa_nome: (eu as any).empresas?.nome,
            ativo: eu.ativo,
          });
        }
      }

      for (const r of roles || []) {
        const u = userMap.get(r.user_id);
        if (u) u.roles.push(r.role);
      }

      return new Response(JSON.stringify(Array.from(userMap.values())), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      const { user_id, role } = payload;
      const validRoles = ["socio_admin", "financeiro_aprovador", "financeiro_operador", "visualizador"];
      if (!user_id || !role || !validRoles.includes(role)) {
        return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
      await supabaseAdmin.from("user_roles").insert({ user_id, role });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "link_empresa") {
      const { user_id, empresa_id } = payload;
      await supabaseAdmin.from("empresa_users").upsert(
        { user_id, empresa_id, ativo: true },
        { onConflict: "user_id,empresa_id" }
      );
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "unlink_empresa") {
      const { user_id, empresa_id } = payload;
      await supabaseAdmin
        .from("empresa_users")
        .update({ ativo: false })
        .eq("user_id", user_id)
        .eq("empresa_id", empresa_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
