// Barreira de login: só renderiza o app para usuários autenticados.
// Cadastro/login restritos a e-mails @febracis.com.br (UX aqui + trigger no banco).
import { useState, type FormEvent, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth, isAllowedEmail, ALLOWED_EMAIL_DOMAIN } from "@/lib/auth";

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      {children}
    </div>
  );
}

function ConfigMissing() {
  return (
    <Centered>
      <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center">
        <h1 className="text-lg font-semibold">Supabase não configurado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Defina <code className="font-mono">VITE_SUPABASE_URL</code> e{" "}
          <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> nas variáveis de
          ambiente do projeto (Lovable → Settings → Environment, e um{" "}
          <code className="font-mono">.env</code> local) e recarregue.
        </p>
      </div>
    </Centered>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (!isSupabaseConfigured) return <ConfigMissing />;
  if (loading) return <Centered><span className="text-sm text-muted-foreground">Carregando…</span></Centered>;
  if (!session) return <LoginForm />;
  return <>{children}</>;
}

function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!isAllowedEmail(email)) {
      setError(`Só e-mails @${ALLOWED_EMAIL_DOMAIN} podem acessar.`);
      return;
    }
    if (password.length < 6) {
      setError("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    if (!supabase) return;

    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo(
          "Cadastro criado. Se a confirmação por e-mail estiver ativa, confirme pelo link enviado; senão já pode entrar.",
        );
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // onAuthStateChange cuida do resto.
      }
    } catch (err) {
      setError((err as Error).message || "Falha na autenticação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Centered>
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-lg border border-border bg-card p-6"
      >
        <h1 className="text-lg font-semibold">Febracis · Email Builder</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {mode === "signin" ? "Entre com seu e-mail" : "Crie sua conta"} @
          {ALLOWED_EMAIL_DOMAIN}
        </p>

        <label className="mt-4 block text-xs font-medium">E-mail</label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={`nome@${ALLOWED_EMAIL_DOMAIN}`}
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          required
        />

        <label className="mt-3 block text-xs font-medium">Senha</label>
        <input
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          required
        />

        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        {info && <p className="mt-3 text-xs text-muted-foreground">{info}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? "…" : mode === "signin" ? "Entrar" : "Cadastrar"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setInfo(null);
          }}
          className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "signin"
            ? "Não tem conta? Cadastre-se"
            : "Já tem conta? Entrar"}
        </button>
      </form>
    </Centered>
  );
}
