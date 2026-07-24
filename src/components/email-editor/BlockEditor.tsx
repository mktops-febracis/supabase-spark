import { FieldInput } from "./FieldInput";
import { registry, type BlockWithId } from "./types";

interface Props {
  block: BlockWithId | null;
  onChange: (values: Record<string, string>) => void;
  globalValues: Record<string, string>;
  onGlobalChange: (values: Record<string, string>) => void;
}

export function BlockEditor({ block, onChange, globalValues, onGlobalChange }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="mb-3">
          <h3 className="text-sm font-semibold">Configurações globais</h3>
          <p className="text-xs text-muted-foreground">Aplicam-se a todo o e-mail.</p>
        </div>
        <div className="flex flex-col gap-3">
          {registry.global.map((f) => (
            <FieldInput
              key={f.key}
              field={f}
              value={globalValues[f.key] ?? f.default ?? ""}
              onChange={(v) => onGlobalChange({ ...globalValues, [f.key]: v })}
            />
          ))}
        </div>
      </section>

      <div className="h-px bg-border" />

      <section>
        {!block ? (
          <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Selecione um bloco à esquerda para editar seus campos.
          </p>
        ) : (
          <BlockFields block={block} onChange={onChange} />
        )}
      </section>
    </div>
  );
}

function BlockFields({
  block,
  onChange,
}: {
  block: BlockWithId;
  onChange: (values: Record<string, string>) => void;
}) {
  const meta = registry.blocks[block.type];
  if (!meta) {
    return (
      <p className="text-xs text-destructive">Bloco "{block.type}" não encontrado no REGISTRY.</p>
    );
  }
  const slots = meta.slots ?? [];

  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-semibold">{meta.label}</h3>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {meta.category} · {block.type}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {meta.fields.map((f, i) => {
          // Heuristic: attach the i-th slot hint to the i-th image field.
          let slot;
          if (f.type === "image") {
            const imageFields = meta.fields.filter((x) => x.type === "image");
            const imgIdx = imageFields.indexOf(f);
            slot = slots[imgIdx] ?? slots[0];
          }
          return (
            <FieldInput
              key={f.key + i}
              field={f}
              slot={slot}
              value={block.values[f.key] ?? f.default ?? ""}
              onChange={(v) => onChange({ ...block.values, [f.key]: v })}
            />
          );
        })}
      </div>
    </div>
  );
}
