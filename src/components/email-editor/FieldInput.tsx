import type { Field, Slot } from "@/lib/engine";
import { registry } from "./types";
import { RichHtmlInput } from "./RichHtmlInput";

interface Props {
  field: Field;
  value: string;
  onChange: (v: string) => void;
  slot?: Slot;
}

export function FieldInput({ field, value, onChange, slot }: Props) {
  const inputBase =
    "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  const label = (
    <label className="mb-1 block text-xs font-medium text-foreground">
      {field.label}
      {field.help && <span className="ml-1 text-muted-foreground">— {field.help}</span>}
    </label>
  );

  switch (field.type) {
    case "textarea":
      return (
        <div>
          {label}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className={inputBase + " resize-y"}
          />
        </div>
      );
    case "richhtml":
      return (
        <div>
          {label}
          <RichHtmlInput value={value} onChange={onChange} />
        </div>
      );
    case "number":
      return (
        <div>
          {label}
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputBase}
          />
        </div>
      );
    case "link":
      return (
        <div>
          {label}
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#URL_..."
            className={inputBase + " font-mono text-xs"}
          />
        </div>
      );
    case "color":
      return (
        <div>
          {label}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value || "#000000"}
              onChange={(e) => onChange(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-input bg-background"
            />
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={inputBase + " font-mono text-xs"}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(registry.palette).map(([name, hex]) => (
              <button
                key={name}
                type="button"
                onClick={() => onChange(hex)}
                title={`${name} · ${hex}`}
                className={
                  "h-6 w-6 rounded-full border transition " +
                  (value.toLowerCase() === hex.toLowerCase()
                    ? "border-foreground ring-2 ring-ring"
                    : "border-border")
                }
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      );
    case "image":
      return (
        <div>
          {label}
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://... ou __CDN__arquivo.png"
            className={inputBase + " font-mono text-xs"}
          />
          {slot && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Dimensão recomendada: {slot.recommended}
            </p>
          )}
          {value && (
            <div className="mt-2 overflow-hidden rounded border border-border bg-muted/30 p-2">
              <img
                src={value}
                alt=""
                className="max-h-24 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}
        </div>
      );
    case "text":
    default:
      return (
        <div>
          {label}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputBase}
          />
        </div>
      );
  }
}
