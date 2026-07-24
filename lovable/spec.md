# Prompt para a Lovable — Febracis Email Builder

Construa um app web interno (React + Vite + TypeScript + Tailwind + shadcn/ui) para a equipe de
marketing da Febracis **montar e-mails HTML prontos para o Salesforce Marketing Cloud (Content
Builder)** a partir de uma biblioteca de blocos, editando só **texto / imagem / link**, com
preview ao vivo e export da HTML final. Sem backend nesta primeira versão (estado em memória +
localStorage).

## PASSO 1 — Crie o arquivo `src/lib/engine.ts` com EXATAMENTE o conteúdo do bloco de código no
final deste prompt. **Não altere nada** dentro dele: é o motor MC-safe (HTML de e-mail testado,
com tabelas, VML para Outlook, slots e conversão de acentos). Não "modernize", não troque tabela
por div, não mexa nas strings de HTML. Trate como imutável.

## REGRA DE OURO
A HTML de e-mail exportada vem **exclusivamente** da função `serialize()` de `engine.ts`. **Nunca**
gere a HTML do e-mail renderizando componentes React/Tailwind — isso não é email-safe e quebra no
Outlook/Marketing Cloud. O React é só o editor e o preview.

## PASSO 2 — Construa a UI em torno do engine
Layout de 3 colunas (responsivo):

- **Coluna esquerda — Estrutura do e-mail**: lista dos blocos atuais (na ordem), com arrastar
  para reordenar (use `@dnd-kit`). Cada item mostra o `REGISTRY.blocks[type].label`. Ações:
  selecionar, remover, duplicar. Botão "Adicionar bloco" abre um menu com todos os tipos de
  `REGISTRY.blocks` (agrupados por `category`). O estado é um `Preset` (veja o tipo em engine.ts):
  `{ global, blocks: BlockInstance[] }`.

- **Coluna central — Editar bloco**: formulário **auto-gerado** a partir de
  `REGISTRY.blocks[type].fields`. Renderize cada campo conforme `field.type`:
  - `text` → input; `textarea` → textarea; `number` → input numérico; `link` → input (url);
  - `color` → color picker + swatches com os valores de `REGISTRY.palette`;
  - `image` → input de URL (na Fase 2 vira upload); mostre a dica de dimensão do slot se houver;
  - `richhtml` → editor simples que permite **negrito**, **cor** e quebra de linha, guardando o
    valor como HTML seguro (ex.: `<span style="color:#FF0000;">...</span>`, `<br />`). É inserido
    cru (token `{{{...}}}`).
  - `select` → select.
  Também edite os campos globais (`REGISTRY.global`): título, cor de fundo, preheader.

- **Coluna direita — Preview**: `<iframe>` com `srcDoc={serialize(preset, mode, cdnBase)}`.
  Toggles: **Desktop 600px / Mobile 375px** e um botão de **fundo escuro** (pra checar contraste).
  Atualiza ao vivo a cada edição.

## Export
Painel com:
- Seletor de modo: **Content Builder** (`serialize(preset,'content_builder')` — mantém os slots
  `data-key` e os tokens `__CDN__`, para editar por arrasto no MC) e **Standalone**
  (`serialize(preset,'standalone', cdnBase)` — troca `__CDN__` pela URL base informada num input).
- Botões **Baixar .html** e **Copiar HTML**.
- **Relatório de validação** chamando `validate(html)`: liste `unresolvedTokens` (tokens `{{...}}`
  não preenchidos), `pendingLinks` (`#URL_...` a trocar), `cdnTokens`, `bytesAbove127` (deve ser
  **0**), `sizeKB` (alerta se `tooBig`).

## Presets
- Botão "Começar do preset CIS Online" carrega `CIS_PRESET` (já importado de engine.ts).
- "Salvar preset" e "Carregar preset": exporta/importa o `Preset` como JSON (localStorage +
  download/upload de arquivo). Assim a equipe reabre campanhas.

## Identidade / UX
- App em português. Paleta de marca disponível nos color pickers (de `REGISTRY.palette`):
  azul `#0006B3`, dourado `#FFC400`, vermelho `#FF0000`, boleto `#2440FF`, etc.
- Interface limpa, foco em produtividade (é ferramenta interna).

## Critério de aceite
Carregar o preset CIS Online e exportar em Content Builder deve produzir a mesma estrutura do
`serialize(CIS_PRESET)` (≈23 tables, 40 trs, 51 tds, 10 divs; `bytesAbove127 === 0`; slots e
tokens `__CDN__`/`#URL_` preservados).

## Fase 2 (só depois, quando eu pedir)
Conectar Supabase (projeto próprio `fqmanbckwgfyfmieqrrj`): tabela `campaigns`
(id, nome, preset_json jsonb, updated_at) com CRUD; e **upload de imagem → Supabase Storage**
(bucket público) devolvendo URL pública usada direto nos campos `image` (resolve também o CDN
da Febracis). Trocar o localStorage por Supabase, mantendo `engine.ts` intacto.

---

## PASSO 1 — conteúdo de `src/lib/engine.ts` (cole exatamente, não altere):
