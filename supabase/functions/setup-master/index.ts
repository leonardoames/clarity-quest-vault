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

    const email = "lucas@w3pagamentos.com.br";
    const password = "123456";

    // Check if user already exists
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const existing = users.find(u => u.email === email);

    let userId: string;

    if (existing) {
      userId = existing.id;
      // Update metadata to force reset
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { must_reset_password: true },
      });
    } else {
      const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { must_reset_password: true },
      });
      if (error) throw error;
      userId = newUser.user!.id;
    }

    // Ensure socio_admin role
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "socio_admin")
      .maybeSingle();

    if (!existingRole) {
      await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role: "socio_admin",
      });
    }

    // Link to all empresas
    const { data: empresas } = await supabaseAdmin.from("empresas").select("id");
    if (empresas?.length) {
      for (const emp of empresas) {
        await supabaseAdmin.from("empresa_users").upsert(
          { user_id: userId, empresa_id: emp.id, ativo: true },
          { onConflict: "user_id,empresa_id" }
        );
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
