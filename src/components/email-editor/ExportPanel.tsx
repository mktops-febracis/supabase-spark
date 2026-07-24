import { useMemo, useState } from "react";
import { serialize, validate, type Preset } from "@/lib/engine";
import type { ExportMode } from "./types";
import { CDN_KEY } from "./types";

interface Props {
  preset: Preset;
  cdnBase: string;
  onCdnChange: (v: string) => void;
}

export function ExportPanel({ preset, cdnBase, onCdnChange }: Props) {
  const [mode, setMode] = useState<ExportMode>("content_builder");
  const [copied, setCopied] = useState(false);

  const html = useMemo(
    () => serialize(preset, mode, cdnBase),
    [preset, mode, cdnBase],
  );
  const report = useMemo(() => validate(html), [html]);

  function download() {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const name = (preset.name || "email").replace(/[^a-z0-9-_]+/gi, "_");
    a.download = `${name}-${mode}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">Exportar HTML</h3>

      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium">Modo</label>
          <div className="inline-flex overflow-hidden rounded-md border border-border">
            <button
              type="button"
              onClick={() => setMode("content_builder")}
              className={
                "px-3 py-1.5 text-xs " +
                (mode === "content_builder"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent")
              }
            >
              Content Builder
            </button>
            <button
              type="button"
              onClick={() => setMode("standalone")}
              className={
                "px-3 py-1.5 text-xs " +
                (mode === "standalone"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent")
              }
            >
              Standalone
            </button>
          </div>
        </div>

        {mode === "standalone" && (
          <div>
            <label className="mb-1 block text-xs font-medium">URL base do CDN</label>
            <input
              type="url"
              value={cdnBase}
              onChange={(e) => {
                onCdnChange(e.target.value);
                try {
                  localStorage.setItem(CDN_KEY, e.target.value);
                } catch {
                  /* ignore */
                }
              }}
              placeholder="https://cdn.exemplo.com/emails/"
              className="block w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Substitui os tokens <code>__CDN__</code> na HTML final.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={download}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Baixar .html
          </button>
          <button
            type="button"
            onClick={copy}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            {copied ? "Copiado!" : "Copiar HTML"}
          </button>
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-3">
          <div className="mb-2 text-xs font-semibold">Validação</div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <li className="flex justify-between">
              <span className="text-muted-foreground">Tamanho</span>
              <span className={report.tooBig ? "text-destructive" : ""}>
                {report.sizeKB} KB{report.tooBig ? " ⚠︎" : ""}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Bytes &gt;127</span>
              <span className={report.bytesAbove127 > 0 ? "text-destructive" : ""}>
                {report.bytesAbove127}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Tokens __CDN__</span>
              <span>{report.cdnTokens}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Tokens pendentes</span>
              <span className={report.unresolvedTokens.length > 0 ? "text-destructive" : ""}>
                {report.unresolvedTokens.length}
              </span>
            </li>
          </ul>
          {report.unresolvedTokens.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Não resolvidos
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {report.unresolvedTokens.map((t) => (
                  <code key={t} className="rounded bg-destructive/10 px-1 py-0.5 text-[10px] text-destructive">
                    {t}
                  </code>
                ))}
              </div>
            </div>
          )}
          {report.pendingLinks.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Links pendentes
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {report.pendingLinks.map((t) => (
                  <code key={t} className="rounded bg-amber-500/10 px-1 py-0.5 text-[10px] text-amber-700 dark:text-amber-400">
                    {t}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
