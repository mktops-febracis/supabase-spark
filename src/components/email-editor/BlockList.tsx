import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { registry, type BlockWithId } from "./types";

interface Props {
  blocks: BlockWithId[];
  selectedUid: string | null;
  onSelect: (uid: string) => void;
  onReorder: (blocks: BlockWithId[]) => void;
  onRemove: (uid: string) => void;
  onDuplicate: (uid: string) => void;
  onAdd: (type: string) => void;
}

function SortableItem({
  block,
  selected,
  onSelect,
  onRemove,
  onDuplicate,
}: {
  block: BlockWithId;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block._uid,
  });
  const meta = registry.blocks[block.type];

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={
        "group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border bg-card p-2 text-sm " +
        (selected ? "border-primary ring-1 ring-primary" : "border-border hover:bg-accent/50")
      }
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none px-1 text-muted-foreground hover:text-foreground"
        title="Arrastar"
      >
        ⋮⋮
      </button>
      <button type="button" onClick={onSelect} className="min-w-0 text-left">
        <div className="truncate font-medium">{meta?.label ?? block.type}</div>
        <div className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
          {meta?.category ?? "—"}
        </div>
      </button>
      <div className="flex shrink-0 gap-1 opacity-60 group-hover:opacity-100">
        <button
          type="button"
          onClick={onDuplicate}
          title="Duplicar"
          className="rounded px-2 py-1 text-xs hover:bg-accent"
        >
          ⧉
        </button>
        <button
          type="button"
          onClick={onRemove}
          title="Remover"
          className="rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function BlockList({
  blocks,
  selectedUid,
  onSelect,
  onReorder,
  onRemove,
  onDuplicate,
  onAdd,
}: Props) {
  const [adding, setAdding] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = blocks.findIndex((b) => b._uid === active.id);
    const newIdx = blocks.findIndex((b) => b._uid === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onReorder(arrayMove(blocks, oldIdx, newIdx));
  }

  const byCategory: Record<string, string[]> = {};
  for (const [type, meta] of Object.entries(registry.blocks)) {
    const cat = meta.category || "outros";
    (byCategory[cat] ||= []).push(type);
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b._uid)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {blocks.length === 0 && (
              <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                Nenhum bloco. Adicione um abaixo.
              </p>
            )}
            {blocks.map((b) => (
              <SortableItem
                key={b._uid}
                block={b}
                selected={selectedUid === b._uid}
                onSelect={() => onSelect(b._uid)}
                onRemove={() => onRemove(b._uid)}
                onDuplicate={() => onDuplicate(b._uid)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="relative">
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="w-full rounded-md border border-dashed border-border py-2 text-sm font-medium hover:bg-accent"
        >
          + Adicionar bloco
        </button>
        {adding && (
          <div className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-80 overflow-auto rounded-md border border-border bg-popover p-2 shadow-lg">
            {Object.entries(byCategory).map(([cat, types]) => (
              <div key={cat} className="mb-2 last:mb-0">
                <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {cat}
                </div>
                {types.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      onAdd(t);
                      setAdding(false);
                    }}
                    className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    {registry.blocks[t].label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
