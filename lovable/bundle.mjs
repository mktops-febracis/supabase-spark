#!/usr/bin/env node
// Gera lovable/engine.ts (para colar na Lovable) + lovable/engine.gen.mjs (espelho JS p/ prova local)
// a partir dos arquivos-fonte do engine. Sem transcrição manual = sem erro.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BLOCKS_DIR = join(ROOT, 'engine', 'blocks');

// escapa para caber dentro de um template literal `...`
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const head = readFileSync(join(ROOT, 'engine', 'head.html'), 'utf8');
const foot = readFileSync(join(ROOT, 'engine', 'foot.html'), 'utf8');
const registry = readFileSync(join(ROOT, 'engine', 'registry.json'), 'utf8');
const preset = readFileSync(join(ROOT, 'presets', 'cis-online.json'), 'utf8');

// ordem estável dos blocos
const blockFiles = readdirSync(BLOCKS_DIR).filter((f) => f.endsWith('.html')).sort();
let blocksLiteral = 'export const BLOCKS: Record<string, string> = {\n';
let blocksLiteralJs = 'const BLOCKS = {\n';
for (const f of blockFiles) {
  const id = f.replace(/\.html$/, '');
  const body = readFileSync(join(BLOCKS_DIR, f), 'utf8');
  blocksLiteral += `  ${JSON.stringify(id)}: \`${esc(body)}\`,\n`;
  blocksLiteralJs += `  ${JSON.stringify(id)}: \`${esc(body)}\`,\n`;
}
blocksLiteral += '};\n';
blocksLiteralJs += '};\n';

// ---- funções (JS puro; backslashes preservados via String.raw) ----
const JS_FNS = String.raw`
function escapeText(v) {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fill(tpl, values) {
  let out = tpl.replace(/\{\{\{(\w+)\}\}\}/g, (m, k) => (k in values ? String(values[k]) : m));
  out = out.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in values ? escapeText(values[k]) : m));
  return out;
}
function toEntities(str) {
  let out = '';
  for (const ch of str) { const cp = ch.codePointAt(0); out += cp > 127 ? ('&#' + cp + ';') : ch; }
  return out;
}
export function serialize(preset, mode = 'content_builder', cdnBase = '') {
  const g = preset.global || {};
  let html = fill(HEAD, g);
  for (const b of preset.blocks) {
    const tpl = BLOCKS[b.type];
    if (!tpl) continue;
    html += fill(tpl, { ...g, ...(b.values || {}) });
  }
  html += FOOT;
  if (mode === 'standalone') html = html.replace(/__CDN__/g, cdnBase);
  html = toEntities(html);
  return html;
}
export function validate(html) {
  const unresolved = [...new Set([...html.matchAll(/\{\{\{?\w+\}?\}\}/g)].map((m) => m[0]))];
  const links = [...new Set([...html.matchAll(/#URL_[A-Z_]+/g)].map((m) => m[0]))];
  const cdn = (html.match(/__CDN__/g) || []).length;
  let high = 0; for (const ch of html) if (ch.codePointAt(0) > 127) high++;
  const kb = +(new TextEncoder().encode(html).length / 1024).toFixed(1);
  return { unresolvedTokens: unresolved, pendingLinks: links, cdnTokens: cdn, bytesAbove127: high, sizeKB: kb, tooBig: kb > 102 };
}
`;

const TS_FNS = String.raw`
function escapeText(v: string): string {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fill(tpl: string, values: Record<string, string>): string {
  let out = tpl.replace(/\{\{\{(\w+)\}\}\}/g, (m, k) => (k in values ? String(values[k]) : m));
  out = out.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in values ? escapeText(values[k]) : m));
  return out;
}
function toEntities(str: string): string {
  let out = '';
  for (const ch of str) { const cp = ch.codePointAt(0) as number; out += cp > 127 ? ('&#' + cp + ';') : ch; }
  return out;
}
export function serialize(preset: Preset, mode: 'content_builder' | 'standalone' = 'content_builder', cdnBase = ''): string {
  const g = preset.global || {};
  let html = fill(HEAD, g);
  for (const b of preset.blocks) {
    const tpl = BLOCKS[b.type];
    if (!tpl) continue;
    html += fill(tpl, { ...g, ...(b.values || {}) });
  }
  html += FOOT;
  if (mode === 'standalone') html = html.replace(/__CDN__/g, cdnBase);
  html = toEntities(html);
  return html;
}
export function validate(html: string) {
  const unresolved = [...new Set([...html.matchAll(/\{\{\{?\w+\}?\}\}/g)].map((m) => m[0]))];
  const links = [...new Set([...html.matchAll(/#URL_[A-Z_]+/g)].map((m) => m[0]))];
  const cdn = (html.match(/__CDN__/g) || []).length;
  let high = 0; for (const ch of html) if ((ch.codePointAt(0) as number) > 127) high++;
  const kb = +(new TextEncoder().encode(html).length / 1024).toFixed(1);
  return { unresolvedTokens: unresolved, pendingLinks: links, cdnTokens: cdn, bytesAbove127: high, sizeKB: kb, tooBig: kb > 102 };
}
`;

const TS_TYPES = `// AUTO-GERADO por lovable/bundle.mjs — NAO EDITE A MAO. Este arquivo e a fonte de verdade MC-safe.
export type FieldType = 'text' | 'textarea' | 'richhtml' | 'color' | 'image' | 'link' | 'number' | 'select';
export interface Field { key: string; label: string; type: FieldType; default?: string; help?: string }
export interface Slot { key: string; recommended: string }
export interface BlockMeta { label: string; category: string; slots?: Slot[]; fields: Field[] }
export interface BlockInstance { type: string; values: Record<string, string> }
export interface Preset { name?: string; global: Record<string, string>; blocks: BlockInstance[] }
`;

// ---- engine.ts (para a Lovable) ----
let ts = TS_TYPES + '\n';
ts += `export const HEAD = \`${esc(head)}\`;\n\n`;
ts += `export const FOOT = \`${esc(foot)}\`;\n\n`;
ts += blocksLiteral + '\n';
ts += `export const REGISTRY = ${registry.trim()} as unknown as { palette: Record<string,string>; global: Field[]; blocks: Record<string, BlockMeta> };\n\n`;
ts += `export const CIS_PRESET: Preset = ${preset.trim()};\n\n`;
ts += TS_FNS;
writeFileSync(join(__dirname, 'engine.ts'), ts, 'utf8');

// ---- engine.gen.mjs (espelho runnable p/ prova) ----
let js = `import { writeFileSync } from 'node:fs';\n`;
js += `const HEAD = \`${esc(head)}\`;\n`;
js += `const FOOT = \`${esc(foot)}\`;\n`;
js += blocksLiteralJs;
js += `const REGISTRY = ${registry.trim()};\n`;
js += `const CIS_PRESET = ${preset.trim()};\n`;
js += JS_FNS;
js += `\nconst out = serialize(CIS_PRESET, 'content_builder');\nwriteFileSync(new URL('../out/cis-bundle-check.html', import.meta.url), out);\nconsole.log(JSON.stringify(validate(out)));\n`;
writeFileSync(join(__dirname, 'engine.gen.mjs'), js, 'utf8');

// ---- PASTE-INTO-LOVABLE.md (spec + engine.ts embutido = 1 copiar-colar) ----
try {
  const spec = readFileSync(join(__dirname, 'spec.md'), 'utf8');
  const paste = spec.trimEnd() + '\n\n```ts\n' + ts.trimEnd() + '\n```\n';
  writeFileSync(join(__dirname, 'PASTE-INTO-LOVABLE.md'), paste, 'utf8');
  console.log('Gerado: lovable/PASTE-INTO-LOVABLE.md (' + (Buffer.byteLength(paste, 'utf8') / 1024).toFixed(1) + ' KB)');
} catch (e) {
  console.log('AVISO: spec.md não encontrado — PASTE-INTO-LOVABLE.md não gerado.');
}

console.log('Gerados: lovable/engine.ts e lovable/engine.gen.mjs');
console.log('Blocos embutidos:', blockFiles.map((f) => f.replace('.html', '')).join(', '));
