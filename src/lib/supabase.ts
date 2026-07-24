// Cliente Supabase (browser). Usa as VITE_* injetadas no build (Lovable → Settings →
// Environment) quando existirem; caso contrário, cai no fallback público abaixo.
// A URL e a chave ANON são públicas por design (vão no bundle do front de qualquer forma);
// o que protege o banco é o RLS, não o sigilo da chave. Por isso é seguro embuti-las e o
// app deixa de depender da config de env do painel (não quebra em rebuild).
import { createClient } from "@supabase/supabase-js";

const FALLBACK_URL = "https://njyvkjxbqlqcsxuaqqju.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qeXZranhicWxxY3N4dWFxcWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MTA5MzQsImV4cCI6MjEwMDQ4NjkzNH0.oKVP6fg8TrospHoHrbvjqZq5F793m4ujOl_NAkVBtq4";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || FALLBACK_URL;
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || FALLBACK_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
