// Shell do editor composável: toolbar + canvas + inspetor + preview (iframe) + export.
import { useEffect, useMemo, useState } from "react";
import { Plus, Undo2, Redo2, Download, Copy, Eraser } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { type EmailDoc, emptyDoc } from "@/lib/doc-model";
import { renderDoc, validate } from "@/lib/render";
import { Preview } from "@/components/email-editor/Preview";
import { useEditorStore } from "./useEditorStore";
import { EditorCanvas } from "./EditorCanvas";
import { EditorInspector } from "./EditorInspector";

const DOC_KEY = "febracis-email-builder:doc";

function loadInitial(): EmailDoc {
  try {
    const raw = localStorage.getItem(DOC_KEY);
    if (raw) {
      const d = JSON.parse(raw) as EmailDoc;
      if (d && d.version === 2 && Array.isArray(d.sections)) return d;
    }
  } catch {
    /* ignore */
  }
  return emptyDoc();
}

export function EditorShell() {
  const [state, dispatch] = useEditorStore(loadInitial());
  const { doc, selectedId } = state;
  const [showExport, setShowExport] = useState(false);

  // autosave local
  useEffect(() => {
    try {
      localStorage.setItem(DOC_KEY, JSON.stringify(doc));
    } catch {
      /* quota */
    }
  }, [doc]);

  const html = useMemo(() => renderDoc(doc, "content_builder"), [doc]);
  const report = useMemo(() => validate(html), [html]);

  function copyHtml() {
    navigator.clipboard?.writeText(html);
  }
  function downloadHtml() {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(doc.meta.title || "email").replace(/[^a-z0-9-_]+/gi, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Toolbar */}
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <h1 className="mr-2 text-sm font-semibold">
          Editor composável{" "}
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">beta</span>
        </h1>
        <span className="mx-1 h-6 w-px bg-border" />
        <button
          type="button"
          onClick={() => dispatch({ type: "ADD_SECTION", colCount: 1 })}
          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
        >
          <Plus className="h-3.5 w-3.5" /> Bloco 1 col
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "ADD_SECTION", colCount: 2 })}
          className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
        >
          + 2 col
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "ADD_SECTION", colCount: 3 })}
          className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
        >
          + 3 col
        </button>
        <span className="mx-1 h-6 w-px bg-border" />
        <button
          type="button"
          onClick={() => dispatch({ type: "UNDO" })}
          disabled={!state.past.length}
          title="Desfazer"
          className="rounded-md border border-input bg-background p-1.5 hover:bg-accent disabled:opacity-40"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "REDO" })}
          disabled={!state.future.length}
          title="Refazer"
          className="rounded-md border border-input bg-background p-1.5 hover:bg-accent disabled:opacity-40"
        >
          <Redo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm("Limpar tudo e começar em branco?")) dispatch({ type: "RESET_BLANK" });
          }}
          title="Começar em branco"
          className="rounded-md border border-input bg-background p-1.5 hover:bg-accent"
        >
          <Eraser className="h-4 w-4" />
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowExport(true)}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-3.5 w-3.5" /> Exportar HTML
          </button>
          <Link
            to="/"
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            Editor clássico
          </Link>
        </div>
      </header>

      {/* 3 colunas */}
      <div className="grid flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_320px_minmax(0,1fr)]">
        <section className="min-w-0 overflow-auto rounded-lg border border-border bg-card p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Estrutura (clique para editar)
          </h2>
          <EditorCanvas doc={doc} selectedId={selectedId} dispatch={dispatch} />
        </section>

        <section className="min-w-0 overflow-auto rounded-lg border border-border bg-card p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Propriedades
          </h2>
          <EditorInspector doc={doc} selectedId={selectedId} dispatch={dispatch} />
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Preview
            </h2>
            <span className="text-[10px] text-muted-foreground">
              {report.sizeKB} KB ·{" "}
              {report.bytesAbove127 === 0 ? "MC-safe ✓" : `${report.bytesAbove127} chars>127`}
            </span>
          </div>
          <Preview html={html} />
        </section>
      </div>

      {showExport && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/60 p-6"
          onClick={() => setShowExport(false)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-4xl flex-col rounded-lg bg-background p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">HTML exportado (MC-safe)</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {report.sizeKB} KB · tags {report.balanced ? "ok" : "DESBALANCEADAS"} ·{" "}
                  {report.bytesAbove127 === 0 ? "0 chars>127" : `${report.bytesAbove127} chars>127`}
                  {report.pendingLinks.length
                    ? ` · links pendentes: ${report.pendingLinks.join(", ")}`
                    : ""}
                </span>
                <button
                  type="button"
                  onClick={copyHtml}
                  className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </button>
                <button
                  type="button"
                  onClick={downloadHtml}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Download className="h-3.5 w-3.5" /> Baixar
                </button>
                <button
                  type="button"
                  onClick={() => setShowExport(false)}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  Fechar
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={html}
              className="flex-1 resize-none rounded-md border border-border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed"
            />
          </div>
        </div>
      )}
    </div>
  );
}
