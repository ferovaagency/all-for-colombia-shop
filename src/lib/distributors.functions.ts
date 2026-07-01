import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });

  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("No autorizado");
}

export const adminListDistributors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
  await assertAdmin(context);

  const { data, error } = await context.supabase
    .from("distributors")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { distributors: data ?? [] };
});

export const adminRejectDistributor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { error } = await context.supabase
      .from("distributors")
      .update({ status: "rejected" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminApproveDistributor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        password: z.string().min(8).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch the distributor record
    const { data: dist, error: fetchErr } = await context.supabase
      .from("distributors")
      .select("id, email, contact_name, company_name, auth_user_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!dist) throw new Error("Distribuidor no encontrado");

    let authUserId = dist.auth_user_id;

    if (!authUserId) {
      // Try to find an existing Auth user with this email (in case of re-approval)
      const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
      const found = existing?.users?.find(
        (u) => u.email?.toLowerCase() === dist.email.toLowerCase(),
      );

      if (found) {
        authUserId = found.id;
        const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(found.id, {
          password: data.password,
          email_confirm: true,
        });
        if (updErr) throw new Error(`Auth update: ${updErr.message}`);
      } else {
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: dist.email,
          password: data.password,
          email_confirm: true,
          user_metadata: {
            company_name: dist.company_name,
            contact_name: dist.contact_name,
            role: "distributor",
          },
        });
        if (createErr) throw new Error(`Auth create: ${createErr.message}`);
        authUserId = created.user.id;
      }
    } else {
      // Already linked — just reset password
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password: data.password,
        email_confirm: true,
      });
      if (updErr) throw new Error(`Auth update: ${updErr.message}`);
    }

    // Mark approved and link
    const { error: updateErr } = await context.supabase
      .from("distributors")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        auth_user_id: authUserId,
      })
      .eq("id", data.id);
    if (updateErr) throw new Error(updateErr.message);

    return { ok: true, email: dist.email, contact_name: dist.contact_name, company_name: dist.company_name };
  });
