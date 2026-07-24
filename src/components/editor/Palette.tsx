// Paleta de widgets (estilo Elementor): itens arrastáveis para o canvas.
import { useDraggable } from "@dnd-kit/core";
import {
  Heading,
  Type,
  MousePointerClick,
  Image as ImageIcon,
  ListChecks,
  Minus,
  MoveVertical,
  Code,
} from "lucide-react";
import type { WidgetType } from "@/lib/doc-model";

const ITEMS: { type: WidgetType; label: string; Icon: typeof Type }[] = [
  { type: "heading", label: "Título", Icon: Heading },
  { type: "text", label: "Texto", Icon: Type },
  { type: "button", label: "Botão", Icon: MousePointerClick },
  { type: "image", label: "Imagem", Icon: ImageIcon },
  { type: "list-check", label: "Lista check", Icon: ListChecks },
  { type: "divider", label: "Divisória", Icon: Minus },
  { type: "spacer", label: "Espaço", Icon: MoveVertical },
  { type: "html", label: "HTML", Icon: Code },
];

function PaletteItem({
  type,
  label,
  Icon,
}: {
  type: WidgetType;
  label: string;
  Icon: typeof Type;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `new:${type}`,
    data: { kind: "palette", widgetType: type },
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      className={
        "flex cursor-grab flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center transition hover:border-primary/50 hover:bg-accent " +
        (isDragging ? "opacity-40" : "")
      }
    >
      <Icon className="h-5 w-5 text-muted-foreground" />
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}

export function Palette() {
  return (
    <div>
      <p className="mb-2 text-[11px] text-muted-foreground">
        Arraste um elemento para dentro do e-mail — ou solte numa coluna.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {ITEMS.map((it) => (
          <PaletteItem key={it.type} {...it} />
        ))}
      </div>
    </div>
  );
}
