// Camada de acesso ao Supabase: presets, exports (HTML final) e upload de
// imagens para o Storage. Todas exigem usuário autenticado (RLS no banco).
import { supabase } from "./supabase";
import type { Preset } from "./engine";
import type { EmailDoc } from "./doc-model";

function client() {
  if (!supabase)
    throw new Error(
      "Supabase não configurado (faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).",
    );
  return supabase;
}

const BUCKET = "email-assets";

export interface SavedPreset {
  id: string;
  name: string;
  preset: Preset;
  created_at: string;
  updated_at: string;
}

export interface SavedExport {
  id: string;
  name: string;
  mode: string;
  created_at: string;
}

// ---- Presets (e-mails montados) --------------------------------------------

export async function listPresets(): Promise<SavedPreset[]> {
  const { data, error } = await client()
    .from("email_presets")
    .select("id,name,preset,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavedPreset[];
}

export async function savePreset(name: string, preset: Preset): Promise<SavedPreset> {
  const { data, error } = await client()
    .from("email_presets")
    .insert({ name, preset })
    .select("id,name,preset,created_at,updated_at")
    .single();
  if (error) throw error;
  return data as SavedPreset;
}

export async function updatePreset(id: string, name: string, preset: Preset): Promise<void> {
  const { error } = await client().from("email_presets").update({ name, preset }).eq("id", id);
  if (error) throw error;
}

export async function deletePreset(id: string): Promise<void> {
  const { error } = await client().from("email_presets").delete().eq("id", id);
  if (error) throw error;
}

// ---- Documentos do editor composável (EmailDoc v2, mesma tabela) -----------

export interface SavedDoc {
  id: string;
  name: string;
  preset: EmailDoc;
  created_at: string;
  updated_at: string;
}

export async function listDocs(): Promise<SavedDoc[]> {
  const { data, error } = await client()
    .from("email_presets")
    .select("id,name,preset,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as SavedDoc[]).filter((d) => d.preset && d.preset.version === 2);
}

export async function saveDoc(name: string, doc: EmailDoc): Promise<SavedDoc> {
  const { data, error } = await client()
    .from("email_presets")
    .insert({ name, preset: doc })
    .select("id,name,preset,created_at,updated_at")
    .single();
  if (error) throw error;
  return data as SavedDoc;
}

export async function updateDoc(id: string, name: string, doc: EmailDoc): Promise<void> {
  const { error } = await client().from("email_presets").update({ name, preset: doc }).eq("id", id);
  if (error) throw error;
}

export const deleteDoc = deletePreset;

// ---- Exports (HTML final MC-safe) ------------------------------------------

export async function saveExport(
  name: string,
  mode: string,
  html: string,
  presetId?: string,
): Promise<void> {
  const { error } = await client()
    .from("email_exports")
    .insert({ name, mode, html, preset_id: presetId ?? null });
  if (error) throw error;
}

export async function listExports(): Promise<SavedExport[]> {
  const { data, error } = await client()
    .from("email_exports")
    .select("id,name,mode,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavedExport[];
}

// ---- Imagens (Storage) — URL pública vira CDN no Content Builder ------------

export async function uploadImage(file: File): Promise<string> {
  const c = client();
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safe =
    file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .slice(0, 40) || "img";
  const path = `${Date.now()}-${safe}.${ext}`;
  const { error } = await c.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = c.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ---- Gestão de usuários (só superadmin) ------------------------------------

export type Role = "superadmin" | "member" | "pending";

export interface UserProfile {
  id: string;
  email: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
}

// Listar usuários — RLS deixa só superadmin ver todos.
export async function listProfiles(): Promise<UserProfile[]> {
  const { data, error } = await client()
    .from("profiles")
    .select("id,email,role,created_at,updated_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as UserProfile[];
}

// Aprovar (pending→member) ou mudar papel — RLS exige superadmin.
export async function setUserRole(userId: string, role: Role): Promise<void> {
  const { error } = await client().from("profiles").update({ role }).eq("id", userId);
  if (error) throw error;
}

// Criar usuário (via Edge Function com service_role; valida superadmin no servidor).
export async function adminCreateUser(
  email: string,
  password: string,
  role: "member" | "superadmin" = "member",
): Promise<void> {
  const { data, error } = await client().functions.invoke("admin-users", {
    body: { action: "create", email, password, role },
  });
  if (error) throw new Error((data as { error?: string })?.error || error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
}

// Excluir usuário (via Edge Function).
export async function adminDeleteUser(userId: string): Promise<void> {
  const { data, error } = await client().functions.invoke("admin-users", {
    body: { action: "delete", user_id: userId },
  });
  if (error) throw new Error((data as { error?: string })?.error || error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
}
