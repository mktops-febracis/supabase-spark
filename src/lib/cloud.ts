// Camada de acesso ao Supabase: presets, exports (HTML final) e upload de
// imagens para o Storage. Todas exigem usuário autenticado (RLS no banco).
import { supabase } from "./supabase";
import type { Preset } from "./engine";

function client() {
  if (!supabase) throw new Error("Supabase não configurado (faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).");
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
  const { error } = await client()
    .from("email_presets")
    .update({ name, preset })
    .eq("id", id);
  if (error) throw error;
}

export async function deletePreset(id: string): Promise<void> {
  const { error } = await client().from("email_presets").delete().eq("id", id);
  if (error) throw error;
}

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
  const safe = file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-").slice(0, 40) || "img";
  const path = `${Date.now()}-${safe}.${ext}`;
  const { error } = await c.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = c.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
