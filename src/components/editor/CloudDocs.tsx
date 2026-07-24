// Salvar / abrir e-mails do editor composável na nuvem (Supabase).
import { useState } from "react";
import { CloudUpload, FolderOpen, Trash2, Loader2 } from "lucide-react";
import type { EmailDoc } from "@/lib/doc-model";
import { isSupabaseConfigured } from "@/lib/supabase";
import { listDocs, saveDoc, deleteDoc, type SavedDoc } from "@/lib/cloud";

export function CloudDocs({ doc, onLoad }: { doc: EmailDoc; onLoad: (d: EmailDoc) => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SavedDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!isSupabaseConfigured) return null;

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      setItems(await listDocs());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function onSave() {
    const name = prompt("Nome do e-mail para salvar na nuvem:", doc.meta.title || "E-mail");
    if (!name) return;
    setLoading(true);
    setErr(null);
    try {
      await saveDoc(name, doc);
      if (open) await refresh();
      alert("Salvo na nuvem ✓");
    } catch (e) {
      setErr((e as Error).message);
      alert("Erro ao salvar: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onSave}
        className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
      >
        <CloudUpload className="h-3.5 w-3.5" /> Salvar
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          refresh();
        }}
        className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
      >
        <FolderOpen className="h-3.5 w-3.5" /> Abrir
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <h2 className="text-sm font-semibold">Meus e-mails na nuvem</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-input px-3 py-1 text-xs hover:bg-accent"
              >
                Fechar
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              {loading && (
                <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
                </p>
              )}
              {err && <p className="p-2 text-xs text-destructive">{err}</p>}
              {!loading && items.length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum e-mail salvo ainda.
                </p>
              )}
              <ul className="flex flex-col gap-1">
                {items.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-center gap-2 rounded-md border border-border p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{it.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(it.updated_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onLoad(it.preset);
                        setOpen(false);
                      }}
                      className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Abrir
                    </button>
                    <button
                      type="button"
                      title="Excluir"
                      onClick={async () => {
                        if (!confirm(`Excluir "${it.name}"?`)) return;
                        await deleteDoc(it.id);
                        refresh();
                      }}
                      className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
