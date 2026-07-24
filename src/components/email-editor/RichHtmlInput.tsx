import { useRef } from "react";
import { registry } from "./types";

interface Props {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}

export function RichHtmlInput({ value, onChange, rows = 4 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(before: string, after: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const sel = value.slice(start, end);
    const next = value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    });
  }

  function insertAtCursor(text: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="rounded-md border border-input bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b border-input p-1">
        <button
          type="button"
          onClick={() => wrapSelection("<b>", "</b>")}
          className="rounded px-2 py-1 text-xs font-bold hover:bg-accent"
          title="Negrito"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => insertAtCursor("<br />")}
          className="rounded px-2 py-1 text-xs hover:bg-accent"
          title="Quebra de linha"
        >
          ↵ br
        </button>
        <div className="mx-1 h-4 w-px bg-border" />
        <span className="text-xs text-muted-foreground">Cor:</span>
        {Object.entries(registry.palette).map(([name, hex]) => (
          <button
            key={name}
            type="button"
            title={`${name} · ${hex}`}
            onClick={() => wrapSelection(`<span style="color:${hex}">`, "</span>")}
            className="h-5 w-5 rounded-full border border-border"
            style={{ backgroundColor: hex }}
          />
        ))}
        <label className="ml-1 flex items-center gap-1 text-xs text-muted-foreground">
          <input
            type="color"
            className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
            onChange={(e) => wrapSelection(`<span style="color:${e.target.value}">`, "</span>")}
          />
        </label>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="block w-full resize-y bg-transparent p-2 font-mono text-xs outline-none"
        spellCheck={false}
      />
      <div className="border-t border-input px-2 py-1 text-[10px] text-muted-foreground">
        HTML permitido: &lt;b&gt;, &lt;span style="color:#..."&gt;, &lt;br /&gt;
      </div>
    </div>
  );
}
