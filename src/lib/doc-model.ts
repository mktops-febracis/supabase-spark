// Modelo de documento do editor composável (árvore) — tipos puros, sem React.
// Documento -> Seções (linhas/faixas) -> Colunas -> Widgets (empilhados).
// O HTML MC-safe é gerado por src/lib/render.ts (a "regra de ouro" continua: o
// HTML de e-mail NUNCA vem de render React, e sim do renderizador string dedicado).

export interface BoxSpacing {
  t: number;
  r: number;
  b: number;
  l: number;
}

export type Align = "left" | "center" | "right";
export type VAlign = "top" | "middle" | "bottom";

export interface WidgetStyle {
  align: Align;
  padding: BoxSpacing;
  color?: string;
  bg?: string;
}

interface WidgetBase {
  id: string; // id de UI (seleção/dnd) — NÃO vai para o HTML
  style: WidgetStyle;
}

export interface HeadingWidget extends WidgetBase {
  type: "heading";
  level: "h1" | "h2" | "h3";
  text: string; // richtext MC-safe (cru: aceita <b>/<span cor>/<br>)
  size: number;
  lineHeight: number;
  weight: 400 | 700;
}

export interface TextWidget extends WidgetBase {
  type: "text";
  html: string; // richtext limitado (<b>/<span cor>/<br>)
  size: number;
  lineHeight: number;
}

export interface ButtonWidget extends WidgetBase {
  type: "button";
  text: string;
  href: string; // "#URL_..." ou URL absoluta
  btnBg: string;
  btnColor: string;
  radius: number;
  width: number; // largura fixa (px)
  fontSize: number;
}

export interface ImageWidget extends WidgetBase {
  type: "image";
  src: string; // "" => emite src="" + comentário "COLE A URL"
  alt: string;
  width: number;
  href?: string; // imagem clicável (opcional)
  slotKey?: string; // data-key para virar slot arrastável no Content Builder
  fullWidthMobile: boolean;
}

export interface ListCheckWidget extends WidgetBase {
  type: "list-check";
  iconBg: string;
  iconColor: string;
  items: string[]; // N itens (não fixo em 3)
  size: number;
  lineHeight: number;
}

export interface DividerWidget extends WidgetBase {
  type: "divider";
  color: string;
  thickness: number;
}

export interface SpacerWidget extends WidgetBase {
  type: "spacer";
  height: number;
}

export interface HtmlWidget extends WidgetBase {
  type: "html";
  raw: string; // escape hatch — passa por toEntities, mas não é escapado
}

export type Widget =
  | HeadingWidget
  | TextWidget
  | ButtonWidget
  | ImageWidget
  | ListCheckWidget
  | DividerWidget
  | SpacerWidget
  | HtmlWidget;

export type WidgetType = Widget["type"];

export interface Column {
  id: string;
  span: 1 | 2 | 3; // proporção; a soma dos spans na seção é o "grid" da linha
  vAlign: VAlign;
  widgets: Widget[];
}

export interface Section {
  id: string;
  bg: string; // cor de fundo da faixa
  bgImage?: string; // background-image (opcional)
  fullWidth: boolean; // faixa de cor sangra 100% (informativo; o wrap é 600)
  padding: BoxSpacing; // padding do <td> da seção
  gap: number; // espaçamento entre colunas (px)
  columns: Column[]; // 1..3
}

export interface EmailDoc {
  version: 2;
  meta: {
    title: string;
    preheader: string;
    bg: string; // cor de fundo do corpo
    contentWidth: number; // largura do container (default 600)
  };
  sections: Section[];
}

// ————————————————————————————————————————————————————————————————
// Helpers de criação (ids curtos, só para UI — igual ao uid() atual).
// ————————————————————————————————————————————————————————————————

export function uid(): string {
  // sem Math.random em libs compartilhadas do harness; aqui é runtime do browser,
  // então é seguro. Mantém o mesmo padrão de email-editor/types.ts.
  return Math.random().toString(36).slice(2, 10);
}

export const PAD0: BoxSpacing = { t: 0, r: 0, b: 0, l: 0 };

export function defaultStyle(over: Partial<WidgetStyle> = {}): WidgetStyle {
  return { align: "left", padding: { t: 0, r: 0, b: 0, l: 0 }, ...over };
}

export function makeWidget(type: WidgetType): Widget {
  const id = uid();
  switch (type) {
    case "heading":
      return {
        id,
        type,
        style: defaultStyle({ align: "center", color: "#1F1F1F" }),
        level: "h2",
        text: "Novo título",
        size: 24,
        lineHeight: 30,
        weight: 700,
      };
    case "text":
      return {
        id,
        type,
        style: defaultStyle({ color: "#1F1F1F" }),
        html: "Escreva seu texto aqui.",
        size: 15,
        lineHeight: 23,
      };
    case "button":
      return {
        id,
        type,
        style: defaultStyle({ align: "center" }),
        text: "CLIQUE AQUI",
        href: "#URL_CHECKOUT",
        btnBg: "#FFC400",
        btnColor: "#000000",
        radius: 27,
        width: 280,
        fontSize: 14,
      };
    case "image":
      return {
        id,
        type,
        style: defaultStyle({ align: "center" }),
        src: "",
        alt: "",
        width: 240,
        fullWidthMobile: true,
      };
    case "list-check":
      return {
        id,
        type,
        style: defaultStyle({ color: "#1F1F1F" }),
        iconBg: "#179CFF",
        iconColor: "#FFFFFF",
        items: ["Primeiro item", "Segundo item", "Terceiro item"],
        size: 15,
        lineHeight: 21,
      };
    case "divider":
      return {
        id,
        type,
        style: defaultStyle({ padding: { t: 10, r: 0, b: 10, l: 0 } }),
        color: "#E0E0E0",
        thickness: 1,
      };
    case "spacer":
      return { id, type, style: defaultStyle(), height: 24 };
    case "html":
      return { id, type, style: defaultStyle(), raw: "<!-- HTML livre -->" };
  }
}

export function makeColumn(span: 1 | 2 | 3 = 1): Column {
  return { id: uid(), span, vAlign: "top", widgets: [] };
}

export function makeSection(colCount: 1 | 2 | 3 = 1): Section {
  const columns: Column[] = [];
  for (let i = 0; i < colCount; i++) columns.push(makeColumn(1));
  return {
    id: uid(),
    bg: "#FFFFFF",
    fullWidth: false,
    padding: { t: 40, r: 48, b: 40, l: 48 },
    gap: 20,
    columns,
  };
}

export function emptyDoc(): EmailDoc {
  return {
    version: 2,
    meta: { title: "Novo e-mail", preheader: "", bg: "#F8F8F8", contentWidth: 600 },
    sections: [],
  };
}
