import { useLayoutEffect, useRef, useState } from "react";

interface Props {
  html: string;
}

const DEVICE_WIDTH = { desktop: 600, mobile: 375 } as const;
type Device = keyof typeof DEVICE_WIDTH;

/** Iframe que renderiza o e-mail numa largura REAL fixa e mede a altura do conteúdo. */
function EmailFrame({
  html,
  width,
  onHeight,
}: {
  html: string;
  width: number;
  onHeight?: (h: number) => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);

  function measure() {
    const doc = ref.current?.contentDocument;
    if (!doc) return;
    const h = Math.max(doc.documentElement?.scrollHeight ?? 0, doc.body?.scrollHeight ?? 0);
    if (h > 0) onHeight?.(h);
  }

  return (
    <iframe
      ref={ref}
      title="preview"
      srcDoc={html}
      sandbox="allow-same-origin"
      onLoad={measure}
      style={{ width, height: "100%", border: 0, display: "block" }}
    />
  );
}

export function Preview({ html }: Props) {
  const [device, setDevice] = useState<Device>("desktop");
  const [darkBg, setDarkBg] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const width = DEVICE_WIDTH[device];

  // Largura disponível no painel (medida no client) para calcular a escala.
  const measureRef = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(width);
  const [contentH, setContentH] = useState(900);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    setAvail(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setAvail(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = Math.min(1, avail / width);
  const zoomPct = Math.round(scale * 100);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-md border border-border">
          <button
            type="button"
            onClick={() => setDevice("desktop")}
            className={
              "px-3 py-1.5 text-xs " +
              (device === "desktop" ? "bg-primary text-primary-foreground" : "hover:bg-accent")
            }
          >
            Desktop 600
          </button>
          <button
            type="button"
            onClick={() => setDevice("mobile")}
            className={
              "px-3 py-1.5 text-xs " +
              (device === "mobile" ? "bg-primary text-primary-foreground" : "hover:bg-accent")
            }
          >
            Mobile 375
          </button>
        </div>
        {scale < 1 && (
          <span
            className="text-[11px] text-muted-foreground"
            title={`Zoom visual — o e-mail é renderizado em ${width}px reais`}
          >
            {zoomPct}%
          </span>
        )}
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
        >
          Tela cheia
        </button>
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={darkBg} onChange={(e) => setDarkBg(e.target.checked)} />
          Fundo do preview
        </label>
      </div>

      <div
        className="flex-1 overflow-auto rounded-lg border border-border p-4 transition-colors"
        style={{ backgroundColor: darkBg ? "#1a1a1a" : "#e5e7eb" }}
      >
        {/* Medidor: ocupa a largura de conteúdo disponível do painel. */}
        <div ref={measureRef}>
          {/* Caixa que reserva o espaço já escalado, para centralizar sem cortar. */}
          <div className="mx-auto" style={{ width: width * scale, height: contentH * scale }}>
            <div
              className="bg-white shadow-md"
              style={{
                width,
                height: contentH,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <EmailFrame html={html} width={width} onHeight={setContentH} />
            </div>
          </div>
        </div>
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/70">
          <div className="flex items-center justify-between gap-2 bg-background px-4 py-2">
            <span className="text-sm font-medium">Preview — {width}px reais</span>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Fechar
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4" style={{ backgroundColor: "#e5e7eb" }}>
            <div className="mx-auto bg-white shadow-md" style={{ width, maxWidth: "100%" }}>
              <iframe
                title="preview-fullscreen"
                srcDoc={html}
                sandbox="allow-same-origin"
                className="block h-[85vh] w-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
