// Renderizador: árvore (EmailDoc) -> HTML de e-mail MC-safe (Salesforce Marketing Cloud).
// REGRA DE OURO: o HTML NUNCA vem de render React/Tailwind — vem daqui, como string.
// Reaproveita o pipeline do motor: escape de texto, entidades (>127 -> &#N;), VML de botão,
// ghost-tables de coluna e slots data-key. Saída no padrão "comentado por bloco".
import type { BoxSpacing, Column, EmailDoc, Section, Widget } from "./doc-model";

export type RenderMode = "content_builder" | "standalone";

// ————— helpers de string (portados de engine.ts) —————
function escapeText(v: string): string {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function toEntities(str: string): string {
  let out = "";
  for (const ch of str) {
    const cp = ch.codePointAt(0) as number;
    out += cp > 127 ? "&#" + cp + ";" : ch;
  }
  return out;
}
const esc = escapeText; // campos simples (alt, texto de botão)
const raw = (v: string) => String(v ?? ""); // richtext cru (validado na UI)
const padCss = (p: BoxSpacing) => `${p.t}px ${p.r}px ${p.b}px ${p.l}px`;
const FONT = "'Poppins',Arial,Helvetica,sans-serif";

// ————— validação (portada de engine.ts) —————
export function validate(html: string) {
  const unresolved = [...new Set([...html.matchAll(/\{\{\{?\w+\}?\}\}/g)].map((m) => m[0]))];
  const links = [...new Set([...html.matchAll(/#URL_[A-Z_]+/g)].map((m) => m[0]))];
  const cdn = (html.match(/__CDN__/g) || []).length;
  let high = 0;
  for (const ch of html) if ((ch.codePointAt(0) as number) > 127) high++;
  const kb = +(new TextEncoder().encode(html).length / 1024).toFixed(1);
  const opens = (html.match(/<(table|tr|td)\b/g) || []).length;
  const closes = (html.match(/<\/(table|tr|td)>/g) || []).length;
  return {
    unresolvedTokens: unresolved,
    pendingLinks: links,
    cdnTokens: cdn,
    bytesAbove127: high,
    sizeKB: kb,
    tooBig: kb > 102,
    tableTags: `${opens} abrem / ${closes} fecham`,
    balanced: opens === closes,
  };
}

// ————— HEAD / FOOT —————
function buildHead(doc: EmailDoc): string {
  const W = doc.meta.contentWidth || 600;
  const title = toEntities(escapeText(doc.meta.title || ""));
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="pt-BR">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
<title>${title}</title>
${editHelpComment(doc)}
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<style>table,td,div,p,a,h1,h2,h3,span{font-family:Arial,Helvetica,sans-serif !important;}</style>
<![endif]-->

<style type="text/css">
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
  html,body{margin:0 !important;padding:0 !important;height:100% !important;width:100% !important;}
  *{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse !important;}
  img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none;display:block;}
  a{text-decoration:none;}
  .ExternalClass{width:100%;}
  .ExternalClass,.ExternalClass p,.ExternalClass span,.ExternalClass font,.ExternalClass td,.ExternalClass div{line-height:100%;}
  u + #body a{color:inherit;text-decoration:none;font-size:inherit;font-family:inherit;font-weight:inherit;line-height:inherit;}
  #MessageViewBody a{color:inherit;text-decoration:none;font-size:inherit;font-family:inherit;font-weight:inherit;line-height:inherit;}

  @media only screen and (max-width:620px){
    .wrap{width:100% !important;max-width:100% !important;}
    .stack{display:block !important;width:100% !important;max-width:100% !important;}
    .stack-mb{padding-bottom:22px !important;}
    .pad-x{padding-left:24px !important;padding-right:24px !important;}
    .img-full img{width:100% !important;height:auto !important;max-width:100% !important;}
    .h1{font-size:30px !important;line-height:36px !important;}
    .h2{font-size:22px !important;line-height:28px !important;}
    .h3{font-size:20px !important;line-height:26px !important;}
    .btn-m a{width:auto !important;max-width:88% !important;}
  }
</style>
</head>

<body id="body" style="margin:0;padding:0;background-color:${doc.meta.bg};">

<!-- PREHEADER -->
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;font-family:${FONT};color:${doc.meta.bg};">
  ${raw(doc.meta.preheader)}
  &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${doc.meta.bg};">
<tr>
<td align="center" style="padding:0;">

  <table role="presentation" class="wrap" width="${W}" cellpadding="0" cellspacing="0" border="0" style="width:${W}px;max-width:${W}px;background-color:${doc.meta.bg};">
`;
}

const FOOT = `  </table>

</td>
</tr>
</table>

</body>
</html>
`;

// Cabeçalho de instruções (como no HTML-modelo), gerado a partir do doc.
function editHelpComment(doc: EmailDoc): string {
  const lines: string[] = [];
  lines.push("");
  lines.push("=========================================================================");
  lines.push(" COMO EDITAR ESTE E-MAIL");
  lines.push("=========================================================================");
  lines.push(" 1) POR BLOCO — cada bloco esta entre  <!-- INICIO BLOCO 0X -->  e");
  lines.push("    <!-- FIM BLOCO 0X -->. Edite apenas o trecho do bloco desejado.");
  lines.push("");
  lines.push(' 2) IMAGENS — procure por  src=""  (vazio). Logo acima ha um comentario');
  lines.push("    dizendo qual imagem e. Cole a URL DENTRO das aspas.");
  const imgs: string[] = [];
  doc.sections.forEach((s, si) => {
    s.columns.forEach((c) =>
      c.widgets.forEach((w) => {
        if (w.type === "image")
          imgs.push(`      BLOCO 0${si + 1}  ${w.alt || "imagem"} (exibe ${w.width}px)`);
      }),
    );
  });
  if (imgs.length) {
    lines.push("    Imagens neste e-mail:");
    lines.push(...imgs);
  }
  lines.push("");
  lines.push(' 3) LINKS — procure por  href="#URL_  e troque pelo link real.');
  lines.push("");
  lines.push(" ACENTOS: todos em entidade HTML -> arquivo ASCII, imune a mojibake.");
  lines.push(` GRID: container ${doc.meta.contentWidth || 600}.`);
  lines.push("=========================================================================");
  return "\n<!--" + lines.join("\n") + "\n-->";
}

// ————— widgets —————
function renderWidget(w: Widget): string {
  const st = w.style;
  const pad = padCss(st.padding);
  const align = st.align;
  const cell = (inner: string, extraTd = "") =>
    `            <tr><td align="${align}" style="padding:${pad};${st.bg ? `background-color:${st.bg};` : ""}"${extraTd}>\n${inner}\n            </td></tr>\n`;

  switch (w.type) {
    case "heading": {
      const cls = w.level === "h1" ? "h1" : w.level === "h2" ? "h2" : "h3";
      return cell(
        `              <${w.level} class="${cls}" style="margin:0;font-family:${FONT};font-size:${w.size}px;line-height:${w.lineHeight}px;font-weight:${w.weight};color:${st.color || "#1F1F1F"};text-align:${align};">${raw(w.text)}</${w.level}>`,
      );
    }
    case "text":
      return cell(
        `              <p style="margin:0;font-family:${FONT};font-size:${w.size}px;line-height:${w.lineHeight}px;color:${st.color || "#1F1F1F"};text-align:${align};">${raw(w.html)}</p>`,
      );
    case "button": {
      const py = 16;
      const px = 30;
      const h = 52;
      return cell(
        `              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${w.href}" style="height:${h}px;v-text-anchor:middle;width:${w.width}px;" arcsize="50%" stroke="f" fillcolor="${w.btnBg}">
                <w:anchorlock/><center style="color:${w.btnColor};font-family:Arial,sans-serif;font-size:${w.fontSize}px;font-weight:bold;">${esc(w.text)}</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${w.href}" style="display:inline-block;width:${w.width}px;background-color:${w.btnBg};color:${w.btnColor};font-family:${FONT};font-size:${w.fontSize}px;line-height:${w.fontSize + 4}px;font-weight:700;letter-spacing:0.3px;text-align:center;padding:${py}px ${px}px;border-radius:${w.radius}px;">${esc(w.text)}</a>
              <!--<![endif]-->`,
        ' class="btn-m"',
      );
    }
    case "image": {
      const dataKey = w.slotKey ? ` data-type="slot" data-key="${w.slotKey}"` : "";
      const cls = w.fullWidthMobile ? ' class="img-full"' : "";
      const marginAuto = align === "center" ? "margin:0 auto;" : "";
      const placeholder =
        w.src === ""
          ? "\n              <!-- COLE A URL DA IMAGEM AQUI (entre as aspas do src) -->"
          : "";
      const imgTag = `<img src="${w.src}" width="${w.width}" alt="${esc(w.alt)}" style="width:${w.width}px;max-width:${w.width}px;height:auto;display:block;${marginAuto}" />`;
      const inner = w.href
        ? `              <a href="${w.href}" target="_blank">${imgTag}</a>`
        : `              ${imgTag}`;
      return `            <tr><td align="${align}"${dataKey}${cls} style="padding:${pad};font-size:0;">${placeholder}\n${inner}\n            </td></tr>\n`;
    }
    case "list-check": {
      const rows = w.items
        .map((it, i) => {
          const last = i === w.items.length - 1;
          const pb = last ? "0" : "16px";
          return `                <tr>
                  <td width="30" valign="top" style="padding:0 0 ${pb} 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td width="22" height="22" align="center" valign="middle" bgcolor="${w.iconBg}" style="width:22px;height:22px;background-color:${w.iconBg};border-radius:11px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:22px;font-weight:bold;color:${w.iconColor};mso-line-height-rule:exactly;">&#10003;</td>
                    </tr></table>
                  </td>
                  <td valign="middle" style="padding:0 0 ${pb} 0;font-family:${FONT};font-size:${w.size}px;line-height:${w.lineHeight}px;color:${st.color || "#1F1F1F"};">${raw(it)}</td>
                </tr>`;
        })
        .join("\n");
      return cell(
        `              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n${rows}\n              </table>`,
      );
    }
    case "divider":
      return cell(
        `              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:${w.thickness}px solid ${w.color};font-size:0;line-height:0;">&nbsp;</td></tr></table>`,
      );
    case "spacer":
      return `            <tr><td height="${w.height}" style="height:${w.height}px;line-height:${w.height}px;font-size:0;">&nbsp;</td></tr>\n`;
    case "html":
      return `            <tr><td style="padding:${pad};">${raw(w.raw)}</td></tr>\n`;
  }
}

function renderColumnInner(col: Column): string {
  const widgets = col.widgets.map(renderWidget).join("");
  return `          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n${widgets}          </table>\n`;
}

function colWidths(cols: Column[], contentW: number, gap: number): number[] {
  const units = cols.reduce((s, c) => s + c.span, 0) || 1;
  const gaps = gap * (cols.length - 1);
  const usable = contentW - gaps;
  return cols.map((c) => Math.floor((usable * c.span) / units));
}

function renderColumns(sec: Section, contentW: number): string {
  const cols = sec.columns;
  if (cols.length <= 1) {
    const col = cols[0];
    return col ? renderColumnInner(col) : "";
  }
  // 2+ colunas: ghost-table MSO + divs inline-block (padrão payment/pillars)
  const widths = colWidths(cols, contentW, sec.gap);
  let out = "";
  cols.forEach((col, i) => {
    const last = i === cols.length - 1;
    const w = widths[i];
    if (i === 0) {
      out += `        <!--[if mso]><table role="presentation" width="${contentW}" cellpadding="0" cellspacing="0" border="0"><tr><td width="${w}" valign="${col.vAlign}"><![endif]-->\n`;
    } else {
      out += `        <!--[if mso]></td><td width="${sec.gap}">&nbsp;</td><td width="${w}" valign="${col.vAlign}"><![endif]-->\n`;
    }
    const stackCls = last ? "stack" : "stack stack-mb";
    out += `        <div class="${stackCls}" style="display:inline-block;width:100%;max-width:${w}px;vertical-align:${col.vAlign};">\n`;
    out += renderColumnInner(col);
    out += `        </div>\n`;
    if (last) out += `        <!--[if mso]></td></tr></table><![endif]-->\n`;
  });
  return out;
}

function renderSection(sec: Section, n: number, contentWidth: number): string {
  const num = String(n).padStart(2, "0");
  const contentW = contentWidth - sec.padding.l - sec.padding.r;
  const multi = sec.columns.length > 1;
  const bgAttr = `bgcolor="${sec.bg}"`;
  const bgImg = sec.bgImage ? ` background="${sec.bgImage}"` : "";
  const bgImgCss = sec.bgImage
    ? `background-image:url('${sec.bgImage}');background-repeat:no-repeat;background-position:top center;background-size:cover;`
    : "";
  const fontSize0 = multi ? "font-size:0;" : "";
  return (
    `    <!-- ================= INICIO BLOCO ${num} ================= -->\n` +
    `    <tr>\n` +
    `      <td class="pad-x" align="center" ${bgAttr}${bgImg} style="padding:${padCss(sec.padding)};background-color:${sec.bg};${bgImgCss}${fontSize0}">\n` +
    renderColumns(sec, contentW) +
    `      </td>\n` +
    `    </tr>\n` +
    `    <!-- ================= FIM BLOCO ${num} ================= -->\n\n`
  );
}

export function renderDoc(
  doc: EmailDoc,
  mode: RenderMode = "content_builder",
  cdnBase = "",
): string {
  let html = buildHead(doc);
  doc.sections.forEach((sec, i) => {
    html += renderSection(sec, i + 1, doc.meta.contentWidth || 600);
  });
  html += FOOT;
  if (mode === "standalone") html = html.replace(/__CDN__/g, cdnBase);
  html = toEntities(html);
  return html;
}
