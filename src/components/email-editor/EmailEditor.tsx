import { useEffect, useMemo, useRef, useState } from "react";
import { CIS_PRESET, serialize, type Preset } from "@/lib/engine";
import { BlockList } from "./BlockList";
import { BlockEditor } from "./BlockEditor";
import { Preview } from "./Preview";
import { ExportPanel } from "./ExportPanel";
import { CloudPresets } from "./CloudPresets";
import { AdminUsers } from "@/components/auth/AdminUsers";
import { useAuth } from "@/lib/auth";
import {
  CDN_KEY,
  STORAGE_KEY,
  registry,
  stripIds,
  uid,
  withIds,
  type BlockWithId,
} from "./types";

function loadInitial(): { global: Record<string, string>; blocks: BlockWithId[]; name?: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Preset;
      if (parsed && parsed.global && Array.isArray(parsed.blocks)) {
        return { global: { ...parsed.global }, blocks: withIds(parsed), name: parsed.name };
      }
    }
  } catch {
    /* ignore */
  }
  return { global: { ...CIS_PRESET.global }, blocks: withIds(CIS_PRESET), name: CIS_PRESET.name };
}

export function EmailEditor() {
  const initial = useRef<ReturnType<typeof loadInitial> | null>(null);
  if (initial.current === null) initial.current = loadInitial();

  const [name, setName] = useState<string | undefined>(initial.current.name);
  const [globalValues, setGlobalValues] = useState<Record<string, string>>(initial.current.global);
  const [blocks, setBlocks] = useState<BlockWithId[]>(initial.current.blocks);
  const [selectedUid, setSelectedUid] = useState<string | null>(
    initial.current.blocks[0]?._uid ?? null,
  );
  const [cdnBase, setCdnBase] = useState<string>(() => {
    try {
      return localStorage.getItem(CDN_KEY) || "";
    } catch {
      return "";
    }
  });

  const { session, signOut } = useAuth();

  const preset: Preset = useMemo(
    () => ({ name, global: globalValues, blocks: stripIds(blocks) }),
    [name, globalValues, blocks],
  );

  function applyPreset(parsed: Preset) {
    setName(parsed.name);
    setGlobalValues({ ...parsed.global });
    const withUids = withIds(parsed);
    setBlocks(withUids);
    setSelectedUid(withUids[0]?._uid ?? null);
  }

  // Autosave to localStorage.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preset));
    } catch {
      /* quota / disabled — non-fatal */
    }
  }, [preset]);

  const previewHtml = useMemo(
    () => serialize(preset, "content_builder"),
    [preset],
  );

  const selectedBlock = blocks.find((b) => b._uid === selectedUid) ?? null;

  function updateSelectedValues(values: Record<string, string>) {
    if (!selectedBlock) return;
    setBlocks((prev) =>
      prev.map((b) => (b._uid === selectedBlock._uid ? { ...b, values } : b)),
    );
  }

  function addBlock(type: string) {
    const meta = registry.blocks[type];
    if (!meta) return;
    const values: Record<string, string> = {};
    for (const f of meta.fields) {
      if (typeof f.default === "string") values[f.key] = f.default;
    }
    const newBlock: BlockWithId = { _uid: uid(), type, values };
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedUid(newBlock._uid);
  }

  function removeBlock(id: string) {
    setBlocks((prev) => {
      const next = prev.filter((b) => b._uid !== id);
      if (selectedUid === id) {
        setSelectedUid(next[0]?._uid ?? null);
      }
      return next;
    });
  }

  function duplicateBlock(id: string) {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b._uid === id);
      if (idx < 0) return prev;
      const src = prev[idx];
      const copy: BlockWithId = { _uid: uid(), type: src.type, values: { ...src.values } };
      const next = [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
      setSelectedUid(copy._uid);
      return next;
    });
  }

  function loadCisPreset() {
    if (!confirm("Carregar o preset CIS Online? Isso substitui o e-mail atual.")) return;
    setName(CIS_PRESET.name);
    setGlobalValues({ ...CIS_PRESET.global });
    const withUids = withIds(CIS_PRESET);
    setBlocks(withUids);
    setSelectedUid(withUids[0]?._uid ?? null);
  }

  function savePresetToFile() {
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(preset.name || "preset").replace(/[^a-z0-9-_]+/gi, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  function loadPresetFromFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Preset;
        if (!parsed || !parsed.global || !Array.isArray(parsed.blocks)) {
          throw new Error("Formato inválido");
        }
        setName(parsed.name);
        setGlobalValues({ ...parsed.global });
        const withUids = withIds(parsed);
        setBlocks(withUids);
        setSelectedUid(withUids[0]?._uid ?? null);
      } catch (e) {
        alert("Não consegui ler esse preset: " + (e as Error).message);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold sm:text-lg">
            Febracis · Email Builder
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            Editor MC-safe para o Salesforce Marketing Cloud
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={loadCisPreset}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            Começar do preset CIS Online
          </button>
          <button
            type="button"
            onClick={savePresetToFile}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            Salvar preset
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            Carregar preset
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) loadPresetFromFile(f);
              e.target.value = "";
            }}
          />

          <span className="mx-1 h-6 w-px self-center bg-border" />
          <CloudPresets preset={preset} onLoad={applyPreset} />
          <AdminUsers />

          {session && (
            <span className="flex items-center gap-2 self-center pl-1">
              <span className="hidden max-w-[160px] truncate text-[11px] text-muted-foreground sm:inline">
                {session.user.email}
              </span>
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                Sair
              </button>
            </span>
          )}
        </div>
      </header>

      {/* 3-column layout */}
      <div className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,420px)_minmax(0,1fr)]">
        {/* Left */}
        <aside className="min-w-0 rounded-lg border border-border bg-card p-3">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Estrutura
          </h2>
          <BlockList
            blocks={blocks}
            selectedUid={selectedUid}
            onSelect={setSelectedUid}
            onReorder={setBlocks}
            onRemove={removeBlock}
            onDuplicate={duplicateBlock}
            onAdd={addBlock}
          />
        </aside>

        {/* Center */}
        <section className="min-w-0 rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Editar
          </h2>
          <BlockEditor
            block={selectedBlock}
            onChange={updateSelectedValues}
            globalValues={globalValues}
            onGlobalChange={setGlobalValues}
          />
        </section>

        {/* Right */}
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-1 flex-col rounded-lg border border-border bg-card p-3">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Preview
            </h2>
            <Preview html={previewHtml} />
          </div>
          <ExportPanel preset={preset} cdnBase={cdnBase} onCdnChange={setCdnBase} />
        </section>
      </div>
    </div>
  );
}
