// Inspetor: edita as propriedades do nó selecionado (e-mail / seção / widget).
import type { Dispatch } from "react";
import type { Align, BoxSpacing, EmailDoc, Section, Widget, WidgetStyle } from "@/lib/doc-model";
import type { EditorAction } from "./useEditorStore";

// ————— campos reutilizáveis —————
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
const inputCls =
  "w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring";

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Row label={label}>
      <input
        className={inputCls}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Row>
  );
}
function AreaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <Row label={label}>
      <textarea
        className={inputCls}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Row>
  );
}
function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Row label={label}>
      <input
        type="number"
        className={inputCls}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </Row>
  );
}
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Row label={label}>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 rounded border border-input"
        />
        <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
      </span>
    </Row>
  );
}
function AlignField({ value, onChange }: { value: Align; onChange: (v: Align) => void }) {
  return (
    <Row label="Alinhamento">
      <span className="inline-flex overflow-hidden rounded-md border border-input">
        {(["left", "center", "right"] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onChange(a)}
            className={
              "px-3 py-1 text-xs " +
              (value === a ? "bg-primary text-primary-foreground" : "hover:bg-accent")
            }
          >
            {a === "left" ? "◧" : a === "center" ? "▣" : "◨"}
          </button>
        ))}
      </span>
    </Row>
  );
}
function PaddingField({ pad, onChange }: { pad: BoxSpacing; onChange: (p: BoxSpacing) => void }) {
  const one = (k: keyof BoxSpacing) => (
    <input
      type="number"
      title={k}
      value={pad[k]}
      onChange={(e) => onChange({ ...pad, [k]: Number(e.target.value) || 0 })}
      className={inputCls}
    />
  );
  return (
    <Row label="Espaçamento interno (cima/dir/baixo/esq)">
      <span className="grid grid-cols-4 gap-1">
        {one("t")}
        {one("r")}
        {one("b")}
        {one("l")}
      </span>
    </Row>
  );
}

// ————— inspetores por tipo —————
function MetaInspector({ doc, dispatch }: { doc: EmailDoc; dispatch: Dispatch<EditorAction> }) {
  const set = (patch: Partial<EmailDoc["meta"]>) => dispatch({ type: "UPDATE_META", patch });
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        E-mail
      </h3>
      <TextField
        label="Título (aba do navegador)"
        value={doc.meta.title}
        onChange={(v) => set({ title: v })}
      />
      <AreaField
        label="Preheader (prévia na caixa de entrada)"
        value={doc.meta.preheader}
        onChange={(v) => set({ preheader: v })}
        rows={2}
      />
      <ColorField
        label="Cor de fundo do e-mail"
        value={doc.meta.bg}
        onChange={(v) => set({ bg: v })}
      />
      <NumField
        label="Largura do conteúdo (px)"
        value={doc.meta.contentWidth}
        onChange={(v) => set({ contentWidth: v })}
      />
    </div>
  );
}

function SectionInspector({ sec, dispatch }: { sec: Section; dispatch: Dispatch<EditorAction> }) {
  const set = (patch: Partial<Section>) => dispatch({ type: "UPDATE_SECTION", id: sec.id, patch });
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Bloco (seção)
      </h3>
      <ColorField label="Cor de fundo" value={sec.bg} onChange={(v) => set({ bg: v })} />
      <TextField
        label="Imagem de fundo (URL / __CDN__)"
        value={sec.bgImage ?? ""}
        onChange={(v) => set({ bgImage: v || undefined })}
      />
      <PaddingField pad={sec.padding} onChange={(p) => set({ padding: p })} />
      <NumField
        label="Espaço entre colunas (px)"
        value={sec.gap}
        onChange={(v) => set({ gap: v })}
      />
    </div>
  );
}

function WidgetInspector({ w, dispatch }: { w: Widget; dispatch: Dispatch<EditorAction> }) {
  const patch = (p: Partial<Widget>) => dispatch({ type: "UPDATE_WIDGET", id: w.id, patch: p });
  const setStyle = (s: Partial<WidgetStyle>) =>
    patch({ style: { ...w.style, ...s } } as Partial<Widget>);
  const common = (
    <>
      <AlignField value={w.style.align} onChange={(a) => setStyle({ align: a })} />
      <PaddingField pad={w.style.padding} onChange={(p) => setStyle({ padding: p })} />
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Widget · {w.type}
      </h3>

      {w.type === "heading" && (
        <>
          <AreaField
            label="Texto (aceita <b>, <span style=color>, <br>)"
            value={w.text}
            onChange={(v) => patch({ text: v })}
          />
          <Row label="Nível">
            <select
              className={inputCls}
              value={w.level}
              onChange={(e) => patch({ level: e.target.value as "h1" | "h2" | "h3" })}
            >
              <option value="h1">H1</option>
              <option value="h2">H2</option>
              <option value="h3">H3</option>
            </select>
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <NumField label="Tamanho" value={w.size} onChange={(v) => patch({ size: v })} />
            <NumField
              label="Altura linha"
              value={w.lineHeight}
              onChange={(v) => patch({ lineHeight: v })}
            />
          </div>
          <ColorField
            label="Cor"
            value={w.style.color ?? "#1F1F1F"}
            onChange={(v) => setStyle({ color: v })}
          />
        </>
      )}

      {w.type === "text" && (
        <>
          <AreaField
            label="Texto (aceita <b>, <span style=color>, <br>)"
            value={w.html}
            onChange={(v) => patch({ html: v })}
            rows={4}
          />
          <div className="grid grid-cols-2 gap-2">
            <NumField label="Tamanho" value={w.size} onChange={(v) => patch({ size: v })} />
            <NumField
              label="Altura linha"
              value={w.lineHeight}
              onChange={(v) => patch({ lineHeight: v })}
            />
          </div>
          <ColorField
            label="Cor"
            value={w.style.color ?? "#1F1F1F"}
            onChange={(v) => setStyle({ color: v })}
          />
        </>
      )}

      {w.type === "button" && (
        <>
          <TextField label="Texto do botão" value={w.text} onChange={(v) => patch({ text: v })} />
          <TextField
            label="Link (#URL_... ou URL)"
            value={w.href}
            onChange={(v) => patch({ href: v })}
          />
          <div className="grid grid-cols-2 gap-2">
            <ColorField
              label="Cor do botão"
              value={w.btnBg}
              onChange={(v) => patch({ btnBg: v })}
            />
            <ColorField
              label="Cor do texto"
              value={w.btnColor}
              onChange={(v) => patch({ btnColor: v })}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <NumField label="Largura" value={w.width} onChange={(v) => patch({ width: v })} />
            <NumField label="Raio" value={w.radius} onChange={(v) => patch({ radius: v })} />
            <NumField label="Fonte" value={w.fontSize} onChange={(v) => patch({ fontSize: v })} />
          </div>
        </>
      )}

      {w.type === "image" && (
        <>
          <TextField
            label="URL da imagem (vazio = slot)"
            value={w.src}
            onChange={(v) => patch({ src: v })}
            placeholder="deixe vazio p/ colar no MC"
          />
          <TextField
            label="Texto alternativo (alt)"
            value={w.alt}
            onChange={(v) => patch({ alt: v })}
          />
          <div className="grid grid-cols-2 gap-2">
            <NumField label="Largura (px)" value={w.width} onChange={(v) => patch({ width: v })} />
            <TextField
              label="Link (opcional)"
              value={w.href ?? ""}
              onChange={(v) => patch({ href: v || undefined })}
            />
          </div>
          <TextField
            label="Chave do slot (data-key, opcional)"
            value={w.slotKey ?? ""}
            onChange={(v) => patch({ slotKey: v || undefined })}
          />
        </>
      )}

      {w.type === "list-check" && (
        <>
          <AreaField
            label="Itens (um por linha)"
            value={w.items.join("\n")}
            onChange={(v) => patch({ items: v.split("\n").filter((x) => x.trim() !== "") })}
            rows={4}
          />
          <div className="grid grid-cols-2 gap-2">
            <ColorField
              label="Cor do ícone"
              value={w.iconBg}
              onChange={(v) => patch({ iconBg: v })}
            />
            <ColorField
              label="Cor do check"
              value={w.iconColor}
              onChange={(v) => patch({ iconColor: v })}
            />
          </div>
          <ColorField
            label="Cor do texto"
            value={w.style.color ?? "#1F1F1F"}
            onChange={(v) => setStyle({ color: v })}
          />
        </>
      )}

      {w.type === "divider" && (
        <>
          <ColorField label="Cor" value={w.color} onChange={(v) => patch({ color: v })} />
          <NumField
            label="Espessura (px)"
            value={w.thickness}
            onChange={(v) => patch({ thickness: v })}
          />
        </>
      )}

      {w.type === "spacer" && (
        <NumField label="Altura (px)" value={w.height} onChange={(v) => patch({ height: v })} />
      )}

      {w.type === "html" && (
        <AreaField label="HTML livre" value={w.raw} onChange={(v) => patch({ raw: v })} rows={5} />
      )}

      <div className="mt-1 border-t border-border pt-3">{common}</div>
    </div>
  );
}

export function EditorInspector({
  doc,
  selectedId,
  dispatch,
}: {
  doc: EmailDoc;
  selectedId: string | null;
  dispatch: Dispatch<EditorAction>;
}) {
  if (selectedId) {
    for (const sec of doc.sections) {
      if (sec.id === selectedId) return <SectionInspector sec={sec} dispatch={dispatch} />;
      for (const col of sec.columns)
        for (const w of col.widgets)
          if (w.id === selectedId) return <WidgetInspector w={w} dispatch={dispatch} />;
    }
  }
  return <MetaInspector doc={doc} dispatch={dispatch} />;
}
