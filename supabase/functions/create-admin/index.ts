import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const adminEmail = "admin@pendataan.app";
    const adminPassword = "Admin2024!";

    // Check if admin already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAdmin = existingUsers?.users?.find(u => u.email === adminEmail);

    let adminUserId: string;

    if (existingAdmin) {
      adminUserId = existingAdmin.id;
    } else {
      // Create admin user with auto-confirm
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { display_name: "Administrator" },
      });

      if (createError) throw createError;
      adminUserId = newUser.user.id;
    }

    // Ensure admin role exists
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", adminUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (!existingRole) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: adminUserId, role: "admin" });
      if (roleError) throw roleError;
    }

    // Ensure profile has display_name
    await supabaseAdmin
      .from("profiles")
      .update({ display_name: "Administrator" })
      .eq("user_id", adminUserId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin account created/verified",
        credentials: { email: adminEmail, password: adminPassword },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
