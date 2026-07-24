// Salvar/abrir e-mails no Supabase (tabela email_presets). Compartilhado entre
// a equipe autenticada. Substitui, na nuvem, o que antes só ia p/ localStorage.
import { useState } from "react";
import type { Preset } from "@/lib/engine";
import {
  listPresets,
  savePreset,
  deletePreset,
  type SavedPreset,
} from "@/lib/cloud";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  preset: Preset;
  onLoad: (preset: Preset) => void;
}

const btn =
  "rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-60";

export function CloudPresets({ preset, onLoad }: Props) {
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SavedPreset[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const name =
      window.prompt("Nome para salvar na nuvem:", preset.name || "E-mail sem nome")?.trim();
    if (!name) return;
    setSaving(true);
    setError(null);
    try {
      await savePreset(name, preset);
      window.alert(`Salvo na nuvem como "${name}".`);
    } catch (e) {
      window.alert("Falha ao salvar: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function refresh() {
    setLoadingList(true);
    setError(null);
    try {
      setItems(await listPresets());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingList(false);
    }
  }

  return (
    <>
      <button type="button" onClick={save} disabled={saving} className={btn}>
        {saving ? "Salvando…" : "Salvar na nuvem"}
      </button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) refresh();
        }}
      >
        <DialogTrigger asChild>
          <button type="button" className={btn}>
            Abrir da nuvem
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>E-mails salvos na nuvem</DialogTitle>
          </DialogHeader>
          {loadingList && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!loadingList && !error && items.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum e-mail salvo ainda.</p>
          )}
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{it.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Atualizado {new Date(it.updated_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className={btn}
                    onClick={() => {
                      onLoad(it.preset);
                      setOpen(false);
                    }}
                  >
                    Abrir
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-xs text-destructive hover:bg-accent"
                    onClick={async () => {
                      if (!window.confirm(`Excluir "${it.name}"?`)) return;
                      try {
                        await deletePreset(it.id);
                        setItems((prev) => prev.filter((p) => p.id !== it.id));
                      } catch (e) {
                        window.alert("Falha ao excluir: " + (e as Error).message);
                      }
                    }}
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
