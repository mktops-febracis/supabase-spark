// Painel de gestão de usuários — visível/usável só por superadmin.
// Aprovar/rebaixar = update direto em profiles (RLS). Criar/excluir = Edge Function.
import { useEffect, useState } from "react";
import { useAuth, isAllowedEmail, ALLOWED_EMAIL_DOMAIN } from "@/lib/auth";
import {
  listProfiles,
  setUserRole,
  adminCreateUser,
  adminDeleteUser,
  type UserProfile,
  type Role,
} from "@/lib/cloud";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const btn =
  "rounded-md border border-input bg-background px-2.5 py-1 text-[11px] font-medium hover:bg-accent disabled:opacity-60";

const roleLabel: Record<Role, string> = {
  superadmin: "Superadmin",
  member: "Membro",
  pending: "Pendente",
};

export function AdminUsers() {
  const { role, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // novo usuário
  const [nEmail, setNEmail] = useState("");
  const [nPass, setNPass] = useState("");
  const [nRole, setNRole] = useState<"member" | "superadmin">("member");
  const [creating, setCreating] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setUsers(await listProfiles());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  if (role !== "superadmin") return null;

  async function changeRole(u: UserProfile, r: Role) {
    try {
      await setUserRole(u.id, r);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: r } : x)));
    } catch (e) {
      window.alert("Falha: " + (e as Error).message);
    }
  }

  async function create() {
    setError(null);
    if (!isAllowedEmail(nEmail)) {
      setError(`Só e-mails @${ALLOWED_EMAIL_DOMAIN}.`);
      return;
    }
    if (nPass.length < 6) {
      setError("Senha mínima de 6 caracteres.");
      return;
    }
    setCreating(true);
    try {
      await adminCreateUser(nEmail.trim().toLowerCase(), nPass, nRole);
      setNEmail("");
      setNPass("");
      setNRole("member");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function remove(u: UserProfile) {
    if (u.id === session?.user.id) {
      window.alert("Você não pode excluir a própria conta.");
      return;
    }
    if (!window.confirm(`Excluir ${u.email}? Isso remove o login e os acessos.`)) return;
    try {
      await adminDeleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (e) {
      window.alert("Falha ao excluir: " + (e as Error).message);
    }
  }

  const pending = users.filter((u) => u.role === "pending");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          Usuários
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestão de usuários</DialogTitle>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Criar usuário */}
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-semibold">Criar usuário</p>
          <div className="flex flex-wrap items-end gap-2">
            <input
              type="email"
              value={nEmail}
              onChange={(e) => setNEmail(e.target.value)}
              placeholder={`nome@${ALLOWED_EMAIL_DOMAIN}`}
              className="min-w-[180px] flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="text"
              value={nPass}
              onChange={(e) => setNPass(e.target.value)}
              placeholder="senha (≥6)"
              className="w-32 rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={nRole}
              onChange={(e) => setNRole(e.target.value as "member" | "superadmin")}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
            >
              <option value="member">Membro</option>
              <option value="superadmin">Superadmin</option>
            </select>
            <button type="button" onClick={create} disabled={creating} className={btn}>
              {creating ? "Criando…" : "Criar"}
            </button>
          </div>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}

        {/* Pendentes em destaque */}
        {pending.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {pending.length} aguardando validação
          </p>
        )}

        {/* Lista */}
        <ul className="max-h-80 divide-y divide-border overflow-y-auto">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{u.email}</p>
                <p className="text-[10px] text-muted-foreground">
                  {roleLabel[u.role]}
                  {u.id === session?.user.id ? " · você" : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1">
                {u.role === "pending" && (
                  <button type="button" className={btn} onClick={() => changeRole(u, "member")}>
                    Aprovar
                  </button>
                )}
                {u.role === "member" && (
                  <button type="button" className={btn} onClick={() => changeRole(u, "superadmin")}>
                    ↑ Superadmin
                  </button>
                )}
                {u.role === "superadmin" && u.id !== session?.user.id && (
                  <button type="button" className={btn} onClick={() => changeRole(u, "member")}>
                    ↓ Membro
                  </button>
                )}
                {u.id !== session?.user.id && (
                  <button
                    type="button"
                    className="rounded-md border border-input bg-background px-2.5 py-1 text-[11px] text-destructive hover:bg-accent"
                    onClick={() => remove(u)}
                  >
                    Excluir
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
