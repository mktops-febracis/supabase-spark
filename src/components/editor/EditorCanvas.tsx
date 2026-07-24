// Canvas WYSIWYG (estilo Elementor): mostra o e-mail renderizado de verdade, com
// seleção, controles no hover e reordenação por arraste (dnd-kit). A fidelidade final
// (Outlook) continua no Preview em iframe.
import type { CSSProperties, Dispatch } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, Trash2, ChevronUp, ChevronDown, GripVertical, ImagePlus } from "lucide-react";
import type { BoxSpacing, Column, EmailDoc, Section, Widget } from "@/lib/doc-model";
import type { EditorAction } from "./useEditorStore";

const FONT = "'Poppins',Arial,Helvetica,sans-serif";
const padStyle = (p: BoxSpacing): CSSProperties => ({
  paddingTop: p.t,
  paddingRight: p.r,
  paddingBottom: p.b,
  paddingLeft: p.l,
});

// ————— aparência aproximada de cada widget —————
function WidgetView({ w }: { w: Widget }) {
  const st = w.style;
  const base: CSSProperties = { ...padStyle(st.padding), textAlign: st.align, fontFamily: FONT };
  switch (w.type) {
    case "heading":
      return (
        <div style={{ ...base }}>
          <div
            style={{
              fontSize: w.size,
              lineHeight: `${w.lineHeight}px`,
              fontWeight: w.weight,
              color: st.color || "#1F1F1F",
            }}
            dangerouslySetInnerHTML={{
              __html: w.text || "<span style='opacity:.4'>(título)</span>",
            }}
          />
        </div>
      );
    case "text":
      return (
        <div style={{ ...base }}>
          <div
            style={{
              fontSize: w.size,
              lineHeight: `${w.lineHeight}px`,
              color: st.color || "#1F1F1F",
            }}
            dangerouslySetInnerHTML={{
              __html: w.html || "<span style='opacity:.4'>(texto)</span>",
            }}
          />
        </div>
      );
    case "button":
      return (
        <div style={{ ...base }}>
          <span
            style={{
              display: "inline-block",
              background: w.btnBg,
              color: w.btnColor,
              padding: "14px 28px",
              borderRadius: w.radius,
              fontSize: w.fontSize,
              fontWeight: 700,
              minWidth: w.width ? Math.min(w.width, 320) : undefined,
              textAlign: "center",
            }}
          >
            {w.text || "Botão"}
          </span>
        </div>
      );
    case "image":
      return (
        <div style={{ ...base }}>
          {w.src ? (
            <img
              src={w.src}
              alt={w.alt}
              style={{ width: Math.min(w.width, 520), maxWidth: "100%", display: "inline-block" }}
            />
          ) : (
            <span
              style={{ width: Math.min(w.width, 520), maxWidth: "100%" }}
              className="mx-auto flex aspect-[3/2] items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 bg-muted/40 text-muted-foreground"
            >
              <ImagePlus className="mr-2 h-5 w-5" />{" "}
              <span className="text-xs">{w.alt || "imagem"} — colar URL</span>
            </span>
          )}
        </div>
      );
    case "list-check":
      return (
        <div style={{ ...base }}>
          <div className="flex flex-col gap-2">
            {w.items.map((it, i) => (
              <div
                key={i}
                className="flex items-start gap-2"
                style={{
                  fontSize: w.size,
                  lineHeight: `${w.lineHeight}px`,
                  color: st.color || "#1F1F1F",
                }}
              >
                <span
                  className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                  style={{ background: w.iconBg, color: w.iconColor }}
                >
                  ✓
                </span>
                <span dangerouslySetInnerHTML={{ __html: it }} />
              </div>
            ))}
          </div>
        </div>
      );
    case "divider":
      return (
        <div style={{ ...base }}>
          <div style={{ borderTop: `${w.thickness}px solid ${w.color}` }} />
        </div>
      );
    case "spacer":
      return (
        <div style={{ height: w.height }} className="flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground/50">espaço {w.height}px</span>
        </div>
      );
    case "html":
      return <div style={{ ...base }} dangerouslySetInnerHTML={{ __html: w.raw }} />;
  }
}

// ————— widget selecionável + arrastável + controles —————
function SortableWidget({
  w,
  colId,
  selected,
  dispatch,
}: {
  w: Widget;
  colId: string;
  selected: boolean;
  dispatch: Dispatch<EditorAction>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: w.id,
    data: { kind: "widget", colId },
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const act = (a: EditorAction) => (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(a);
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        dispatch({ type: "SELECT", id: w.id });
      }}
      className={
        "group/w relative cursor-pointer rounded-sm outline-offset-1 " +
        (selected
          ? "outline outline-2 outline-primary"
          : "hover:outline hover:outline-1 hover:outline-primary/50")
      }
    >
      {/* barra de controles no hover/seleção */}
      <div
        className={
          "absolute -top-3 right-1 z-10 flex items-center gap-0.5 rounded-md border border-border bg-background px-0.5 py-0.5 shadow-sm " +
          (selected ? "flex" : "hidden group-hover/w:flex")
        }
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          title="Arrastar"
          className="cursor-grab rounded p-0.5 text-muted-foreground hover:bg-accent"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Subir"
          onClick={act({ type: "MOVE_WIDGET", id: w.id, dir: -1 })}
          className="rounded p-0.5 hover:bg-accent"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Descer"
          onClick={act({ type: "MOVE_WIDGET", id: w.id, dir: 1 })}
          className="rounded p-0.5 hover:bg-accent"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Duplicar"
          onClick={act({ type: "DUPLICATE_WIDGET", id: w.id })}
          className="rounded p-0.5 hover:bg-accent"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Remover"
          onClick={act({ type: "REMOVE_WIDGET", id: w.id })}
          className="rounded p-0.5 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <WidgetView w={w} />
    </div>
  );
}

function ColumnDrop({
  col,
  selectedId,
  dispatch,
  flexBasis,
}: {
  col: Column;
  selectedId: string | null;
  dispatch: Dispatch<EditorAction>;
  flexBasis: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col:${col.id}`,
    data: { kind: "column", colId: col.id },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ flexBasis, verticalAlign: col.vAlign }}
      className={
        "min-w-0 flex-1 rounded-sm " +
        (isOver ? "bg-primary/5 outline-dashed outline-1 outline-primary/40" : "")
      }
    >
      <SortableContext items={col.widgets.map((w) => w.id)} strategy={verticalListSortingStrategy}>
        {col.widgets.length === 0 ? (
          <div className="flex min-h-[56px] items-center justify-center rounded-md border border-dashed border-muted-foreground/30 text-[11px] text-muted-foreground">
            solte um elemento aqui
          </div>
        ) : (
          col.widgets.map((w) => (
            <SortableWidget
              key={w.id}
              w={w}
              colId={col.id}
              selected={selectedId === w.id}
              dispatch={dispatch}
            />
          ))
        )}
      </SortableContext>
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
  const units = sec.columns.reduce((s, c) => s + c.span, 0) || 1;
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        dispatch({ type: "SELECT", id: sec.id });
      }}
      className={
        "group/s relative " +
        (selected
          ? "outline outline-2 outline-primary"
          : "hover:outline hover:outline-1 hover:outline-primary/40")
      }
      style={{ background: sec.bg, ...padStyle(sec.padding) }}
    >
      {/* etiqueta do bloco */}
      <div
        className={
          "absolute left-0 top-0 z-10 rounded-br bg-primary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-foreground " +
          (selected ? "block" : "hidden group-hover/s:block")
        }
      >
        Bloco {String(n).padStart(2, "0")}
      </div>
      <div className="flex" style={{ gap: sec.gap }}>
        {sec.columns.map((col) => (
          <ColumnDrop
            key={col.id}
            col={col}
            selectedId={selectedId}
            dispatch={dispatch}
            flexBasis={`${(col.span / units) * 100}%`}
          />
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
    <div
      className="mx-auto bg-white shadow-sm"
      style={{ width: doc.meta.contentWidth, maxWidth: "100%" }}
      onClick={() => dispatch({ type: "SELECT", id: null })}
    >
      {doc.sections.length === 0 ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
          <p className="font-medium">E-mail em branco</p>
          <p className="text-xs">
            Arraste um elemento da esquerda para cá, ou use “+ Bloco” na barra de cima.
          </p>
        </div>
      ) : (
        doc.sections.map((sec, i) => (
          <SectionView
            key={sec.id}
            sec={sec}
            n={i + 1}
            selectedId={selectedId}
            dispatch={dispatch}
          />
        ))
      )}
    </div>
  );
}
