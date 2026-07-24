// Edge Function: gestão de usuários — SÓ superadmin pode criar/excluir.
// Usa o service_role (injetado automaticamente no runtime da função, nunca vai no front).
// Aprovar/rebaixar (mudar role) é feito direto na tabela profiles pelo app (RLS permite superadmin).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const ALLOWED_DOMAIN = "@febracis.com.br";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Sem token" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1) Identifica o chamador pelo JWT
  const caller = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userErr } = await caller.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Não autenticado" }, 401);

  // 2) Confirma que é superadmin (lendo profiles com service_role)
  const { data: prof, error: profErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  if (profErr || !prof || prof.role !== "superadmin") {
    return json({ error: "Apenas superadmins podem gerenciar usuários." }, 403);
  }

  let body: { action?: string; email?: string; password?: string; user_id?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const action = body.action;

  if (action === "create") {
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const role = body.role === "superadmin" ? "superadmin" : "member";
    if (!email.endsWith(ALLOWED_DOMAIN)) {
      return json({ error: `Só e-mails ${ALLOWED_DOMAIN} são permitidos.` }, 400);
    }
    if (password.length < 6) return json({ error: "Senha mínima de 6 caracteres." }, 400);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // já confirmado — pode logar na hora
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? "Falha ao criar usuário." }, 400);
    }
    // O trigger cria o profile; garantimos o papel definido pelo superadmin.
    await admin.from("profiles").update({ role }).eq("id", created.user.id);
    return json({ ok: true, user: { id: created.user.id, email: created.user.email, role } });
  }

  if (action === "delete") {
    const userId = body.user_id ?? "";
    if (!userId) return json({ error: "user_id obrigatório." }, 400);
    if (userId === userData.user.id) {
      return json({ error: "Você não pode excluir a própria conta." }, 400);
    }
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return json({ error: delErr.message }, 400);
    return json({ ok: true });
  }

  return json({ error: "Ação inválida (use 'create' ou 'delete')." }, 400);
});
