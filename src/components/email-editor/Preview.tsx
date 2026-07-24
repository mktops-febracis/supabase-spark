import { useState } from "react";

interface Props {
  html: string;
}

export function Preview({ html }: Props) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [dark, setDark] = useState(false);

  const width = device === "desktop" ? 600 : 375;

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
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
          Fundo escuro
        </label>
      </div>

      <div
        className="flex-1 overflow-auto rounded-lg border border-border p-4 transition-colors"
        style={{ backgroundColor: dark ? "#1a1a1a" : "#e5e7eb" }}
      >
        <div className="mx-auto bg-white shadow-md" style={{ width, maxWidth: "100%" }}>
          <iframe
            title="preview"
            srcDoc={html}
            sandbox="allow-same-origin"
            className="block h-[80vh] w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
