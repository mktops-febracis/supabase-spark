#!/usr/bin/env node
// Febracis Email Builder — serializador de referência (engine MC-safe)
// Uso: node serialize.mjs <preset.json> [--mode content_builder|standalone] [--cdn <baseUrl>] [--out <arquivo>]
//
// Camada de engine: monta a HTML de email a partir de head + blocos + foot,
// injeta os valores do preset nos tokens {{...}} (texto escapado) e {{{...}}} (HTML cru),
// e no final converte TODO char > 127 em entidade numérica (à prova de mojibake no Marketing Cloud).
// Esta lógica deve ser portada 1:1 para o app Lovable (TypeScript).

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOCKS_DIR = join(__dirname, 'blocks');

// ---- args ----
const args = process.argv.slice(2);
const presetPath = args[0];
const mode = (args.includes('--mode') ? args[args.indexOf('--mode') + 1] : 'content_builder');
const cdnBase = (args.includes('--cdn') ? args[args.indexOf('--cdn') + 1] : '');
const outPath = (args.includes('--out') ? args[args.indexOf('--out') + 1] : join(__dirname, '..', 'out', 'email.html'));

if (!presetPath) {
  console.error('Uso: node serialize.mjs <preset.json> [--mode content_builder|standalone] [--cdn <url>] [--out <arquivo>]');
  process.exit(1);
}

// ---- helpers ----
function escapeText(v) {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Substitui {{{key}}} (cru) e depois {{key}} (texto escapado). Tokens não resolvidos ficam intactos.
function fill(tpl, values) {
  let out = tpl.replace(/\{\{\{(\w+)\}\}\}/g, (m, k) => (k in values ? String(values[k]) : m));
  out = out.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in values ? escapeText(values[k]) : m));
  return out;
}

// Converte todo caractere > 127 em entidade numérica &#N; (universal, à prova de charset).
function toEntities(str) {
  let out = '';
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    out += cp > 127 ? `&#${cp};` : ch;
  }
  return out;
}

// ---- build ----
const preset = JSON.parse(readFileSync(presetPath, 'utf8'));
const head = readFileSync(join(__dirname, 'head.html'), 'utf8');
const foot = readFileSync(join(__dirname, 'foot.html'), 'utf8');
const global = preset.global || {};

let html = fill(head, global);

for (const block of preset.blocks) {
  const file = join(BLOCKS_DIR, `${block.type}.html`);
  let tpl;
  try {
    tpl = readFileSync(file, 'utf8');
  } catch {
    console.error(`AVISO: bloco desconhecido "${block.type}" (arquivo ${block.type}.html não existe) — pulado.`);
    continue;
  }
  html += fill(tpl, { ...global, ...(block.values || {}) });
}

html += foot;

// ---- modo de export ----
if (mode === 'standalone') {
  html = html.replace(/__CDN__/g, cdnBase);
}

// ---- passe de entidades (mojibake-safe) ----
html = toEntities(html);

// ---- validação ----
const report = { warnings: [], info: {} };

const unresolved = [...html.matchAll(/\{\{\{?\w+\}?\}\}/g)].map((m) => m[0]);
if (unresolved.length) report.warnings.push(`Tokens não resolvidos: ${[...new Set(unresolved)].join(', ')}`);

const urlTokens = [...new Set([...html.matchAll(/#URL_[A-Z_]+/g)].map((m) => m[0]))];
if (urlTokens.length) report.info.linksPendentes = urlTokens;

const cdnLeft = (html.match(/__CDN__/g) || []).length;
if (cdnLeft) report.info.cdnTokens = cdnLeft;

// bytes > 127 (deve ser 0)
let highBytes = 0;
for (const ch of html) if (ch.codePointAt(0) > 127) highBytes++;
report.info.bytesAcima127 = highBytes;
if (highBytes > 0) report.warnings.push(`ATENÇÃO: ${highBytes} caracteres > 127 no output (risco de mojibake).`);

// peso
const bytes = Buffer.byteLength(html, 'utf8');
report.info.pesoKB = +(bytes / 1024).toFixed(1);
if (bytes > 102 * 1024) report.warnings.push(`Peso ${report.info.pesoKB} KB > 102 KB (corte do Gmail).`);

// balanceamento simples de tags
for (const tag of ['table', 'tr', 'td', 'div']) {
  const open = (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
  const close = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
  report.info[`${tag}`] = `${open} abre / ${close} fecha`;
  if (open !== close) report.warnings.push(`Tags <${tag}> desbalanceadas: ${open} vs ${close}.`);
}

// ---- output ----
writeFileSync(outPath, html, 'utf8');
console.log(`OK -> ${outPath}  (${report.info.pesoKB} KB, modo ${mode})`);
console.log(JSON.stringify(report, null, 2));
