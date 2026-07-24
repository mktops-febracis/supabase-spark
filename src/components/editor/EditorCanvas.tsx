// Canvas de edição: renderiza a árvore (seções -> colunas -> widgets) como blocos
// selecionáveis, com controles (mover, duplicar, remover, adicionar widget).
// É uma representação APROXIMADA para editar — a fidelidade real fica no Preview (iframe).
import { useState } from "react";
import type { Dispatch } from "react";
import { Copy, Trash2, ChevronUp, ChevronDown, Plus, Columns2 } from "lucide-react";
import type { Column, EmailDoc, Section, Widget, WidgetType } from "@/lib/doc-model";
import type { EditorAction } from "./useEditorStore";

const WIDGET_LABELS: Record<WidgetType, string> = {
  heading: "Título",
  text: "Texto",
  button: "Botão",
  image: "Imagem",
  "list-check": "Lista com check",
  divider: "Divisória",
  spacer: "Espaço",
  html: "HTML livre",
};

const ADDABLE: WidgetType[] = [
  "heading",
  "text",
  "button",
  "image",
  "list-check",
  "divider",
  "spacer",
  "html",
];

function widgetSummary(w: Widget): string {
  switch (w.type) {
    case "heading":
      return w.text.replace(/<[^>]+>/g, "") || "(título vazio)";
    case "text":
      return w.html.replace(/<[^>]+>/g, "").slice(0, 80) || "(texto vazio)";
    case "button":
      return `${w.text} → ${w.href}`;
    case "image":
      return w.src ? w.alt || w.src : `${w.alt || "imagem"} — sem URL`;
    case "list-check":
      return `${w.items.length} itens`;
    case "divider":
      return `linha ${w.thickness}px`;
    case "spacer":
      return `${w.height}px`;
    case "html":
      return "HTML livre";
  }
}

function AddWidgetMenu({
  columnId,
  dispatch,
}: {
  columnId: string;
  dispatch: Dispatch<EditorAction>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
      >
        <Plus className="h-3.5 w-3.5" /> widget
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-20 mt-1 grid grid-cols-2 gap-1 rounded-md border border-border bg-popover p-2 shadow-lg">
          {ADDABLE.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                dispatch({ type: "ADD_WIDGET", columnId, widgetType: t });
                setOpen(false);
              }}
              className="rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
            >
              {WIDGET_LABELS[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WidgetCard({
  w,
  selected,
  dispatch,
  onSelect,
}: {
  w: Widget;
  selected: boolean;
  dispatch: Dispatch<EditorAction>;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={
        "group cursor-pointer rounded-md border bg-card p-2 text-xs " +
        (selected ? "border-primary ring-1 ring-primary" : "border-border hover:bg-accent/40")
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{WIDGET_LABELS[w.type]}</span>
        <span className="flex shrink-0 gap-0.5 opacity-50 group-hover:opacity-100">
          <button
            type="button"
            title="Subir"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "MOVE_WIDGET", id: w.id, dir: -1 });
            }}
            className="rounded p-1 hover:bg-accent"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Descer"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "MOVE_WIDGET", id: w.id, dir: 1 });
            }}
            className="rounded p-1 hover:bg-accent"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Duplicar"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "DUPLICATE_WIDGET", id: w.id });
            }}
            className="rounded p-1 hover:bg-accent"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Remover"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "REMOVE_WIDGET", id: w.id });
            }}
            className="rounded p-1 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      <div className="mt-0.5 truncate text-muted-foreground">{widgetSummary(w)}</div>
    </div>
  );
}

function ColumnView({
  col,
  selectedId,
  dispatch,
}: {
  col: Column;
  selectedId: string | null;
  dispatch: Dispatch<EditorAction>;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-md border border-dashed border-border/70 p-2">
      {col.widgets.length === 0 && (
        <p className="py-2 text-center text-[11px] text-muted-foreground">coluna vazia</p>
      )}
      {col.widgets.map((w) => (
        <WidgetCard
          key={w.id}
          w={w}
          selected={selectedId === w.id}
          dispatch={dispatch}
          onSelect={() => dispatch({ type: "SELECT", id: w.id })}
        />
      ))}
      <AddWidgetMenu columnId={col.id} dispatch={dispatch} />
    </div>
  );
}

function SectionView({
  sec,
  n,
  selectedId,
  dispatch,
}: {
  sec: Section;
  n: number;
  selectedId: string | null;
  dispatch: Dispatch<EditorAction>;
}) {
  const selected = selectedId === sec.id;
  return (
    <div
      onClick={() => dispatch({ type: "SELECT", id: sec.id })}
      className={
        "rounded-lg border p-2 " +
        (selected ? "border-primary ring-1 ring-primary" : "border-border")
      }
      style={{ backgroundColor: sec.bg }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/70">
          Bloco {String(n).padStart(2, "0")}
        </span>
        <span className="flex gap-0.5">
          {([1, 2, 3] as const).map((c) => (
            <button
              key={c}
              type="button"
              title={`${c} coluna(s)`}
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: "SET_COLUMNS", sectionId: sec.id, colCount: c });
              }}
              className={
                "flex h-6 w-6 items-center justify-center rounded text-[10px] " +
                (sec.columns.length === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-black/10 hover:bg-black/20")
              }
            >
              {c === 1 ? "1" : c === 2 ? <Columns2 className="h-3 w-3" /> : "3"}
            </button>
          ))}
          <span className="mx-1 w-px bg-black/15" />
          <button
            type="button"
            title="Subir bloco"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "MOVE_SECTION", id: sec.id, dir: -1 });
            }}
            className="rounded p-1 hover:bg-black/10"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Descer bloco"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "MOVE_SECTION", id: sec.id, dir: 1 });
            }}
            className="rounded p-1 hover:bg-black/10"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Remover bloco"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "REMOVE_SECTION", id: sec.id });
            }}
            className="rounded p-1 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      <div className="flex gap-2">
        {sec.columns.map((col) => (
          <ColumnView key={col.id} col={col} selectedId={selectedId} dispatch={dispatch} />
        ))}
      </div>
    </div>
  );
}

export function EditorCanvas({
  doc,
  selectedId,
  dispatch,
}: {
  doc: EmailDoc;
  selectedId: string | null;
  dispatch: Dispatch<EditorAction>;
}) {
  return (
    <div className="flex flex-col gap-3" onClick={() => dispatch({ type: "SELECT", id: null })}>
      {doc.sections.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          E-mail vazio. Use <span className="font-medium">"+ Bloco"</span> na barra de cima para
          começar.
        </p>
      )}
      {doc.sections.map((sec, i) => (
        <SectionView key={sec.id} sec={sec} n={i + 1} selectedId={selectedId} dispatch={dispatch} />
      ))}
    </div>
  );
}
