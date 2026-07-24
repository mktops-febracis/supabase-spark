# Prompt-semente para a Lovable — Febracis Email Builder

> Cole isto como primeiro prompt do projeto na Lovable (ou é o que o agente via MCP envia em
> `create_project`). Depois disso, evoluir por mensagens em **plan mode**, fase por fase.

## O que construir
Um app web interno para a equipe de marketing da Febracis **montar e-mails HTML prontos para o
Salesforce Marketing Cloud (Content Builder)** a partir de uma biblioteca de blocos, editando
só **texto / imagem / link**, com preview ao vivo e export da HTML final.

## Stack
React + Vite + TypeScript + Tailwind + shadcn/ui. Sem backend na Fase 1 (estado em memória +
localStorage). Fase 2 usa Supabase (projeto próprio `fqmanbckwgfyfmieqrrj`).

## REGRA DE OURO (não negociável)
A HTML de e-mail exportada **NÃO** pode ser gerada por render de React/Tailwind — isso não é
email-safe e quebra no Outlook/Marketing Cloud. Em vez disso:

1. Os **blocos são strings de HTML cru MC-safe** (tabelas aninhadas, VML `[if mso]`, ghost-tables,
   slots `data-key`). Eles são **imutáveis** — só recebem valores nos tokens. **Não reescreva,
   não "modernize", não troque tabela por div, não remova os comentários `[if mso]`.** Use
   exatamente os arquivos de `engine/blocks/*.html` deste repositório como fonte de verdade.
2. Um **serializador** (porte 1:1 de `engine/serialize.mjs` para TS) monta:
   `head.html` + blocos na ordem escolhida + `foot.html`, injeta os valores e, no final,
   **converte todo caractere de código > 127 em entidade numérica `&#N;`** (isto resolve o
   mojibake do Marketing Cloud — é obrigatório).
3. Tokens: `{{campo}}` = texto (escapar `& < > "`); `{{{campo}}}` = HTML cru (permite
   `<b>`, `<span style="color">`, `<br />`).

## Camadas
- **Engine** (`src/engine/`): copiar `head.html`, `foot.html`, `blocks/*.html`, `registry.json`
  como assets/strings; implementar `serialize(preset, mode)` idêntico ao `.mjs`.
- **UI** (`src/`): 
  - Coluna esquerda: lista de blocos do e-mail (arrastar para reordenar — dnd-kit), botão
    "adicionar bloco" (a partir do `registry.json`), remover/duplicar.
  - Centro: formulário do bloco selecionado, **auto-gerado a partir de `registry.json`**
    (cada campo vira input conforme `type`: text, textarea, richhtml=editor simples com
    negrito/cor, color=color picker com presets da `palette`, image=URL + upload na Fase 2,
    link, number, select).
  - Direita: **preview** num `<iframe srcDoc={serialize(...)}>`, com toggle Desktop 600px /
    Mobile 375px e um toggle de dark-preview.
- **Export**: painel com 2 modos — *Content Builder* (mantém `data-type/data-key` e `__CDN__`)
  e *Standalone* (troca `__CDN__` pela URL base informada). Botões "Baixar .html" e "Copiar".
  Mostrar o **relatório de validação** do serializador (tokens pendentes `{{...}}`, links
  `#URL_...` a preencher, contagem `__CDN__`, `bytes>127` que deve ser 0, peso KB com alerta
  >102 KB, balanceamento de tags).
- **Presets**: carregar `presets/cis-online.json` como ponto de partida ("Novo do preset CIS
  Online"). Salvar/carregar presets como JSON (Fase 1: localStorage/arquivo).

## Paleta da marca (presets de cor)
azul `#0006B3` · azul card `#000FAE` · dourado `#FFC400` · título `#2D2D2D` · vermelho
`#FF0000` · boleto `#2440FF` · título card pgto `#0F0094` · card pgto `#EFEFEF` · círculo
ícone `#D9D9D9`.

## Fase 2 (depois de validada a Fase 1)
Conectar Supabase (`fqmanbckwgfyfmieqrrj`): tabela `campaigns` (id, nome, preset_json,
updated_at), CRUD de campanhas, e **upload de imagem → Supabase Storage (bucket público)**
devolvendo URL pública usada direto nos campos `image` (resolve também o CDN da Febracis).

## Critério de aceite
Carregar o preset CIS Online e exportar em modo Content Builder deve produzir uma HTML
equivalente à de `out/cis-online.html` deste repo (mesma estrutura: ~23 tables, 40 trs, 51 tds,
10 divs; 0 bytes>127; slots e tokens preservados).
