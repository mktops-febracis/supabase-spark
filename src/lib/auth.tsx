// Contexto de autenticação (Supabase Auth) + papel do usuário (profiles.role).
// Só resolve no cliente (useEffect), evitando acesso a storage no SSR.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// Regra de negócio: só e-mails deste domínio podem cadastrar/logar.
// Enforce real fica no banco (trigger em auth.users) — aqui é só UX.
export const ALLOWED_EMAIL_DOMAIN = "febracis.com.br";

export function isAllowedEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@" + ALLOWED_EMAIL_DOMAIN);
}

export type Role = "superadmin" | "member" | "pending";

interface AuthState {
  session: Session | null;
  loading: boolean;
  role: Role | null;
  roleLoading: boolean;
  refreshRole: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  role: null,
  roleLoading: true,
  refreshRole: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const refreshRole = useCallback(async () => {
    if (!supabase) {
      setRole(null);
      setRoleLoading(false);
      return;
    }
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) {
      setRole(null);
      setRoleLoading(false);
      return;
    }
    setRoleLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", uid)
      .single();
    setRole(error || !data ? "pending" : (data.role as Role));
    setRoleLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setRoleLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
      if (data.session) refreshRole();
      else setRoleLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) refreshRole();
      else {
        setRole(null);
        setRoleLoading(false);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [refreshRole]);

  async function signOut() {
    await supabase?.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{ session, loading, role, roleLoading, refreshRole, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
