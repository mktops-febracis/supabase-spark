# CLAUDE.md — Febracis Email Builder

Ferramenta para a equipe de marketing da Febracis montar e-mails HTML **MC-safe (Salesforce
Marketing Cloud / Content Builder)** a partir de blocos reutilizáveis, editando só
texto/imagem/link. Base = template da Fernanda. App final construído na **Lovable**; este repo
guarda o **engine** (fonte de verdade dos blocos) + PRD/seed.

## Regra de ouro
A HTML de e-mail exportada **NUNCA** é gerada por render React/Tailwind. Os blocos em
`engine/blocks/*.html` são **strings de HTML cru MC-safe imutáveis** (tabelas, VML `[if mso]`,
ghost-tables, slots `data-key`); o `engine/serialize.mjs` injeta os tokens `{{campo}}` (texto) /
`{{{campo}}}` (HTML) e, no export, **converte todo char > 127 em entidade `&#N;`** (anti-mojibake).

## Comandos
```
node engine/serialize.mjs presets/cis-online.json --mode content_builder --out out/cis-online.html
node engine/serialize.mjs presets/cis-online.json --mode standalone --cdn <url> --out out/x.html
```

## Estado
Fase 0 concluída (engine + blocos + preset CIS validado). Caminho de build escolhido =
**inserção direta na Lovable** (o MCP não autenticou). Bundle pronto: `node lovable/bundle.mjs`
gera `lovable/engine.ts` (imutável) + `lovable/PASTE-INTO-LOVABLE.md` (spec + engine.ts = 1
copiar-colar). Fase 2 usa Supabase `fqmanbckwgfyfmieqrrj`. PRD:
`~/.claude/plans/entenda-o-contexto-de-expressive-pudding.md`.

## Memória secundária (Obsidian)
Nota espelho: `/home/claude/vault-vps/Projetos/febracis-email-builder.md`. Atualize-a a cada
mudança relevante (decisões, IDs, status). Relacionados: [[dashboard-febracis]],
[[gestor-de-trafego]]. Sem segredos reais no vault — só referência ao `.env`.
