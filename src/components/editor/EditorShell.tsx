// Shell do editor composável — layout estilo Elementor:
// [toolbar] / [painel esquerdo: Elementos | Editar] + [canvas WYSIWYG central] + modais preview/export.
import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  Plus,
  Undo2,
  Redo2,
  Download,
  Copy,
  Eraser,
  Eye,
  Blocks,
  SlidersHorizontal,
  Columns2,
  Columns3,
  Square,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { type EmailDoc, emptyDoc, makeWidget } from "@/lib/doc-model";
import { renderDoc, validate } from "@/lib/render";
import { useEditorStore } from "./useEditorStore";
import { EditorCanvas } from "./EditorCanvas";
import { EditorInspector } from "./EditorInspector";
import { Palette } from "./Palette";

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

function widgetIndex(doc: EmailDoc, colId: string, widgetId: string): number {
  for (const s of doc.sections)
    for (const c of s.columns)
      if (c.id === colId) return c.widgets.findIndex((w) => w.id === widgetId);
  return -1;
}

export function EditorShell() {
  const [state, dispatch] = useEditorStore(loadInitial());
  const { doc, selectedId } = state;
  const [tab, setTab] = useState<"widgets" | "edit">("widgets");
  const [modal, setModal] = useState<null | "preview" | "export">(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ao selecionar um elemento, mostra a aba de edição
  useEffect(() => {
    if (selectedId) setTab("edit");
  }, [selectedId]);

  useEffect(() => {
    try {
      localStorage.setItem(DOC_KEY, JSON.stringify(doc));
    } catch {
      /* quota */
    }
  }, [doc]);

  const html = useMemo(() => renderDoc(doc, "content_builder"), [doc]);
  const report = useMemo(() => validate(html), [html]);

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const a = active.data.current as
      | { kind?: string; widgetType?: string; colId?: string }
      | undefined;
    const o = over.data.current as { kind?: string; colId?: string } | undefined;
    if (!a) return;

    if (a.kind === "palette" && a.widgetType) {
      let colId: string | undefined;
      let index: number | undefined;
      if (o?.kind === "column") colId = o.colId;
      else if (o?.kind === "widget") {
        colId = o.colId;
        index = widgetIndex(doc, o.colId!, String(over.id));
      }
      if (colId)
        dispatch({
          type: "ADD_WIDGET",
          columnId: colId,
          widget: makeWidget(a.widgetType as never),
          index,
          select: true,
        });
      return;
    }

    if (a.kind === "widget") {
      const fromCol = a.colId!;
      if (o?.kind === "widget") {
        const toCol = o.colId!;
        if (toCol === fromCol)
          dispatch({
            type: "REORDER_IN_COLUMN",
            columnId: toCol,
            activeId: String(active.id),
            overId: String(over.id),
          });
        else
          dispatch({
            type: "MOVE_WIDGET_TO_COLUMN",
            widgetId: String(active.id),
            toColumnId: toCol,
            index: widgetIndex(doc, toCol, String(over.id)),
          });
      } else if (o?.kind === "column" && o.colId !== fromCol) {
        dispatch({
          type: "MOVE_WIDGET_TO_COLUMN",
          widgetId: String(active.id),
          toColumnId: o.colId!,
        });
      }
    }
  }

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

  const tabBtn = (id: "widgets" | "edit", Icon: typeof Blocks, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={
        "flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2 text-xs font-medium " +
        (tab === id
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground")
      }
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="flex h-screen flex-col bg-background text-foreground">
        {/* Toolbar */}
        <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          <h1 className="mr-1 text-sm font-semibold">
            Editor{" "}
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
              beta
            </span>
          </h1>
          <span className="mx-1 h-6 w-px bg-border" />
          <span className="text-[11px] text-muted-foreground">+ Bloco:</span>
          <button
            type="button"
            title="1 coluna"
            onClick={() => dispatch({ type: "ADD_SECTION", colCount: 1 })}
            className="rounded-md border border-input bg-background p-1.5 hover:bg-accent"
          >
            <Square className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="2 colunas"
            onClick={() => dispatch({ type: "ADD_SECTION", colCount: 2 })}
            className="rounded-md border border-input bg-background p-1.5 hover:bg-accent"
          >
            <Columns2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="3 colunas"
            onClick={() => dispatch({ type: "ADD_SECTION", colCount: 3 })}
            className="rounded-md border border-input bg-background p-1.5 hover:bg-accent"
          >
            <Columns3 className="h-4 w-4" />
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
            <span className="text-[10px] text-muted-foreground">
              {report.sizeKB} KB ·{" "}
              {report.bytesAbove127 === 0 ? "MC-safe ✓" : `${report.bytesAbove127}!`}
            </span>
            <button
              type="button"
              onClick={() => setModal("preview")}
              className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <Eye className="h-3.5 w-3.5" /> Preview real
            </button>
            <button
              type="button"
              onClick={() => setModal("export")}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" /> Exportar
            </button>
            <Link
              to="/"
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Clássico
            </Link>
          </div>
        </header>

        {/* corpo: painel esquerdo + canvas */}
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-[300px] shrink-0 flex-col border-r border-border bg-card">
            <div className="flex border-b border-border">
              {tabBtn("widgets", Blocks, "Elementos")}
              {tabBtn("edit", SlidersHorizontal, "Editar")}
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              {tab === "widgets" ? (
                <Palette />
              ) : (
                <EditorInspector doc={doc} selectedId={selectedId} dispatch={dispatch} />
              )}
            </div>
          </aside>

          <main className="min-w-0 flex-1 overflow-auto bg-muted/40 p-6">
            <EditorCanvas doc={doc} selectedId={selectedId} dispatch={dispatch} />
          </main>
        </div>

        {/* Modais */}
        {modal === "preview" && (
          <Modal title="Preview real (resultado no e-mail)" onClose={() => setModal(null)}>
            <div className="flex-1 overflow-auto bg-[#e5e7eb] p-4">
              <div
                className="mx-auto bg-white shadow"
                style={{ width: doc.meta.contentWidth, maxWidth: "100%" }}
              >
                <iframe
                  title="preview"
                  srcDoc={html}
                  sandbox="allow-same-origin"
                  className="block h-[75vh] w-full border-0"
                />
              </div>
            </div>
          </Modal>
        )}
        {modal === "export" && (
          <Modal
            title="HTML exportado (MC-safe)"
            onClose={() => setModal(null)}
            actions={
              <>
                <span className="mr-2 text-xs text-muted-foreground">
                  {report.sizeKB} KB · tags {report.balanced ? "ok" : "DESBALANCEADAS"} ·{" "}
                  {report.bytesAbove127 === 0 ? "0 chars>127" : `${report.bytesAbove127} chars>127`}
                  {report.pendingLinks.length
                    ? ` · pendentes: ${report.pendingLinks.join(", ")}`
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
              </>
            }
          >
            <textarea
              readOnly
              value={html}
              className="m-4 flex-1 resize-none rounded-md border border-border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed"
            />
          </Modal>
        )}
      </div>
    </DndContext>
  );
}

function Modal({
  title,
  onClose,
  actions,
  children,
}: {
  title: string;
  onClose: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 p-6" onClick={onClose}>
      <div
        className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          <div className="flex items-center gap-2">
            {actions}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Fechar
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
