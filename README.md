# Febracis Email Builder

Ferramenta para a equipe de marketing da Febracis montar e-mails HTML **prontos para o
Salesforce Marketing Cloud (Content Builder)** a partir de blocos reutilizáveis, editando só
texto/imagem/link. Base = template MC-safe da Fernanda ("O padrão invisível que segura a sua
vida"). O app final é construído na **Lovable**; este repo guarda o **engine** (fonte de
verdade dos blocos) e o PRD/seed.

## Estrutura
```
engine/
  head.html            <head> fixo (doctype XHTML, VML, <style> + media queries) + wrapper 600px
  foot.html            fechamento do wrapper
  blocks/*.html        blocos MC-safe com tokens {{campo}} / {{{html}}} (IMUTÁVEIS)
  registry.json        metadados dos campos (a UI auto-gera formulários a partir daqui)
  serialize.mjs        serializador de referência (Node) — porte 1:1 para TS na Lovable
presets/
  cis-online.json      preset que reproduz o e-mail da Fernanda
lovable/
  seed-prompt.md       prompt-semente para construir o app na Lovable
out/                   HTML gerada (não versionar em produção)
```

## Gerar a HTML localmente
```
node engine/serialize.mjs presets/cis-online.json --mode content_builder --out out/cis-online.html
# standalone (troca __CDN__ pela URL real):
node engine/serialize.mjs presets/cis-online.json --mode standalone --cdn https://.../ --out out/cis-standalone.html
```

## Regras do engine (não quebrar)
- Blocos são strings de HTML cru; **nunca** gerar a HTML de e-mail via render React/Tailwind.
- `{{campo}}` = texto escapado; `{{{campo}}}` = HTML cru (negrito, cor, `<br />`).
- No export, **todo char > 127 vira entidade `&#N;`** (anti-mojibake do Marketing Cloud).
- Dois modos: *Content Builder* (mantém `data-key` + `__CDN__`) e *Standalone*.

## Assets a subir no Content Builder
`cis-hero-bg.png` (textura do topo) e `cis-btn-split.png` (faixa do botão). Trocar `__CDN__`
pela URL da pasta. Preencher links `#URL_CHECKOUT`, `#URL_CHECKOUT_CARTAO`,
`#URL_CHECKOUT_BOLETO`, `#URL_WHATSAPP`.

## Construir na Lovable (inserção direta, sem MCP)
O engine inteiro é empacotado num único `engine.ts` embutido no prompt final:
```
node lovable/bundle.mjs   # gera lovable/engine.ts + lovable/PASTE-INTO-LOVABLE.md
```
Cole o conteúdo de **`lovable/PASTE-INTO-LOVABLE.md`** como primeiro prompt no projeto Lovable.
Ele já contém a spec da UI + o `engine.ts` (imutável). Alternativa: subir este repo no GitHub e
importar na Lovable.

## Status
- [x] Engine + biblioteca de blocos + preset CIS Online (validado: reproduz a v3)
- [x] Assets fixos gerados (`assets/cis-hero-bg.png`, `assets/cis-btn-split.png`)
- [x] Bundle para Lovable (`lovable/engine.ts` + `PASTE-INTO-LOVABLE.md`, prova de fidelidade ok)
- [ ] App na Lovable (Fase 1: editor + preview + export) — colar o prompt e iterar
- [ ] Fase 2: Supabase (`fqmanbckwgfyfmieqrrj`) — campanhas + Storage/CDN de imagem
- [ ] Fase 3: ponte Figma (atribuir PNGs aos slots)

Ver PRD completo em `~/.claude/plans/entenda-o-contexto-de-expressive-pudding.md`.
