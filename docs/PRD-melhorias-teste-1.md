# PRD — Melhorias do Febracis Email Builder (Devolutiva do 1º teste)

## Contexto

A ferramenta (Febracis Email Builder) foi publicada em https://html-builder-febracis.lovable.app
e passou pelo **primeiro teste com um funcionário do marketing da Febracis**. A devolutiva veio por
áudio + tópicos. **Pontos positivos** confirmados: pegar a HTML final foi fácil, preencher os links
das imagens nos campos foi fácil, e o envio para o Salesforce Marketing Cloud (MC) funcionou.

Este PRD organiza os **problemas relatados** + **1 melhoria nova pedida pelo cliente** (modo black
da interface) em requisitos acionáveis para implementação.

- **Repositório:** `mktops-febracis/supabase-spark` (público; acesso de leitura/PR confirmado).
- **App:** Lovable + TanStack Start + React 19 + Tailwind v4 + shadcn/ui.
- **REGRA DE OURO (não pode ser violada):** a HTML de e-mail exportada **nunca** é gerada por
  render React/Tailwind. Os blocos vivem como strings de HTML cru MC-safe em `engine/blocks/*.html`,
  espelhadas em `src/lib/engine.ts` pelo script `node lovable/bundle.mjs`. Qualquer mudança em bloco
  passa por `engine/blocks/*.html` + `engine/registry.json` → rodar `bundle.mjs` → conferir que
  `src/lib/engine.ts` ficou idêntico ao bundle.

## Objetivos

1. Deixar claro/possível **trabalhar com layouts novos** (não ficar preso ao CIS Online).
2. Corrigir o **preview "desktop" que aparece como tablet/mobile**.
3. Corrigir o **espaçamento do botão do topo** (bloco CTA).
4. Adicionar a **"versão black" (tema escuro) da interface** da ferramenta, com botão de alternância.

### Não-objetivos
- Importação automática de Figma → HTML (inviável dentro da regra de ouro; ver MOD 1 Fase C).
- Alterar o comportamento de export/serialização MC-safe (o dark mode e o preview **não** podem
  afetar a HTML exportada).

---

## MOD 1 — Trabalhar com layouts novos  ·  **Prioridade Alta**

**Relato:** *"Não consegui carregar um novo layout... criei o layout no Figma... minha dúvida é: ele
só vai conseguir alterar esse [CIS Online] ou a gente vai conseguir alterar qualquer outro?"*

**Diagnóstico (código):** hoje o usuário **já consegue** montar um layout do zero — adicionar,
remover, reordenar e duplicar os 9 blocos (`BlockList.tsx` → "+ Adicionar bloco"), e salvar como
preset novo em arquivo (`EmailEditor.tsx`) ou na nuvem (`CloudPresets.tsx`). O preset salvo é o
**layout completo** (blocos + valores), não só valores. **O problema real é de descoberta/UX** (não
está óbvio que dá pra criar do zero) e, secundariamente, a ausência de blocos que não existem no
conjunto atual. Modelo: `Preset { name?, global, blocks: BlockInstance[] }` / `BlockInstance { type, values }`.

**Proposta — estratégia faseada:**

- **Fase A — Descoberta/UX (fazer primeiro; barato, alto valor, zero risco ao engine):**
  - Botão **"Começar em branco"** no header (ao lado de "Começar do preset CIS Online"): zera os
    blocos e parte de um e-mail vazio com os defaults globais do registry.
  - **Tela/dialog inicial de partida:** "Começar em branco" · "Começar do CIS Online" · "Meus
    e-mails na nuvem". Presets de partida podem virar arquivos em `presets/*.json`.
  - **Galeria de blocos com miniatura/descrição** (melhorar o menu "+ Adicionar bloco") para deixar
    claro o que cada bloco faz.
  - Microcopy explicando que dá pra montar/editar qualquer layout combinando blocos.
  - Arquivos: `src/components/email-editor/EmailEditor.tsx`, `BlockList.tsx`, novo `StartDialog.tsx`,
    opcional novos `presets/*.json`. **Não toca no engine.**

- **Fase C — Blocos novos a partir do Figma (processo de dev, quando o design foge dos blocos atuais):**
  Um desenvolvedor recria o design como `engine/blocks/<novo>.html` (tabela MC-safe com tokens
  `{{...}}`), adiciona metadados em `engine/registry.json`, roda `node lovable/bundle.mjs` e valida.
  A UI ganha o bloco novo **automaticamente** (é registry-driven). Documentar o passo a passo.

- **Fase B — Colar HTML MC-safe pronto como bloco custom (opcional; só se houver demanda; maior risco):**
  Exige estender o contrato do engine (`BlockInstance` com `html` inline + `serialize()` usando
  `b.html ?? BLOCKS[b.type]`) e um **validador MC-safe obrigatório** (whitelist de tags, sem
  `<script>`, etc.) antes de aceitar. Atrás de uma flag "avançado". É a parte mais cara/arriscada
  frente à regra de ouro — **fora do escopo inicial**, listada aqui como caminho futuro.

**Esforço:** Fase A = M · Fase C = processo (por design novo) · Fase B = G (futuro).
**Critérios de aceite (Fase A):** "Começar em branco" zera e permite montar do zero; dá pra salvar
em arquivo/nuvem e reabrir; fica evidente na UI que qualquer layout é editável.

---

## MOD 2 — Preview "desktop" aparece como tablet/mobile  ·  **Prioridade Alta**

**Relato:** *"O preview desktop está mostrando a visualização de tablet; no Marketing Cloud ficou ok
para desktop, mas na ferramenta mostra de outra forma."*

**Diagnóstico (código):** `Preview.tsx` renderiza o e-mail num iframe (`srcDoc`) dentro de um
`<div style={{ width, maxWidth: "100%" }}>` com `width=600` no modo desktop. Como o painel de preview
(coluna direita do grid em `EmailEditor.tsx`) é mais estreito que 600px (~370–420px em telas `lg`), o
`maxWidth:100%` encolhe o wrapper e o iframe renderiza ~370px. Isso fica **abaixo do breakpoint
`@media (max-width:620px)`** do próprio e-mail → dispara o layout mobile. Ou seja, "Desktop 600" nunca
tem 600px reais de viewport.

**Proposta:** dar ao iframe **largura fixa real de 600px** (para a media query enxergar desktop) e
aplicar **`transform: scale(fator)`** proporcional para caber no painel (`transform-origin: top left`,
com a altura do wrapper ajustada). Fator = `min(1, larguraDisponível / 600)` medido no client
(`ResizeObserver`/`useLayoutEffect`, com guard de SSR). Complemento de alto valor: botão **"Tela
cheia"** que mostra o e-mail a 600px reais (referência final de conferência). Manter o toggle
Desktop/Mobile; opcionalmente exibir o % de zoom no desktop.

- Arquivos: `src/components/email-editor/Preview.tsx` (só ele). **Não toca no engine.**
- **Esforço:** P/M.
- **Critérios de aceite:** no modo "Desktop 600", o preview mostra o layout de 600px (colunas lado a
  lado onde houver `.stack`), não o empilhado; redimensionar a janela ajusta o zoom sem quebrar;
  "Mobile 375" continua mostrando o layout empilhado; "Tela cheia" mostra 600px reais.

---

## MOD 3 — Espaçamento do botão do topo (bloco CTA)  ·  **Prioridade Média**

**Relato:** *"Espaçamento do botão do topo está errado nesse layout."*

**Diagnóstico (código):** no layout CIS Online, o "botão do topo" é o bloco **`cta`** (logo após o
`hero`). Em `engine/blocks/cta.html`:
- `td` do botão: `height:53px; padding:0` (o respiro acima vem só do `padding-bottom:18px` do hero).
- Caminho Outlook (VML `<v:roundrect>`): `width:360px`, sem `mso-padding-alt` → respiro vertical
  frágil no Outlook.
- Caminho moderno (`<a>`): `width:290px; padding:17px 35px` → **assimetria de largura** (360 vs 290)
  e largura fixa que pode comprimir/quebrar texto longo.

**Proposta (MC-safe):**
- Adicionar **respiro no `td`** (padding vertical/horizontal) em vez de depender só do hero.
- **Eliminar a assimetria** 360/290: preferir botão de largura automática — `<a>` **sem `width` fixo**
  com `padding:17px 44px` (cresce com o texto e combina com a media query `.cta a{width:auto}` que já
  existe no head), pareando o VML do Outlook na mesma largura visual.
- Valores finais **validados em teste real** (Outlook via VML + Gmail/Apple Mail).
- Após editar `engine/blocks/cta.html`: **rodar `node lovable/bundle.mjs`** e conferir
  `src/lib/engine.ts` idêntico ao bundle.
- Arquivos: `engine/blocks/cta.html`, `src/lib/engine.ts` (regenerado), opcional `engine/head.html`.
- **Esforço:** P.
- **Critérios de aceite:** botão com respiro simétrico acima/abaixo e laterais; sem quebrar no
  Outlook nem nos clientes modernos; `bytesAbove127 = 0` e tags balanceadas no `validate()`.

---

## MOD 4 — "Versão black": tema escuro da INTERFACE + botão de alternância  ·  **Prioridade Média**

**Pedido do cliente:** uma **variante preta (dark mode) da própria ferramenta**, com um **botão** para
ativar. (É o tema da interface — **não** tem relação com o botão dentro do e-mail.)

**Diagnóstico (código):** a base de dark **já existe**: `.dark` completo em `src/styles.css` (variáveis
oklch) e `@custom-variant dark` declarado. Falta apenas o **toggle** + aplicar a classe `dark` no
`<html>` + persistir. **Isolamento confirmado:** o preview é um iframe com `srcDoc` (HTML próprio do
engine); o `.dark` do app **não vaza** para o iframe nem para a HTML exportada. (O toggle "Fundo
escuro" que já existe no `Preview.tsx` é só o fundo do palco do preview — independente; vale renomear
para "Fundo do preview" para evitar confusão.)

**Proposta:**
- Botão sol/lua (`lucide-react`) no header do `EmailEditor.tsx` que faz
  `document.documentElement.classList.toggle("dark")` e persiste em `localStorage`
  (`febracis-email-builder:theme`).
- **Anti-flash (FOUC):** script inline mínimo no `RootShell` (`src/routes/__root.tsx`) que aplica a
  classe antes da pintura, lendo o localStorage. (Sem lib externa; não precisa de `next-themes`.)
- As telas usam tokens semânticos shadcn (`bg-card`, `text-muted-foreground`, etc.), então herdam o
  dark automaticamente — revisar apenas eventuais cores hardcoded ilegíveis.
- Arquivos: `src/components/email-editor/EmailEditor.tsx`, `src/routes/__root.tsx` (anti-flash),
  opcional novo `src/lib/theme.ts`. **Não toca no engine.**
- **Esforço:** P.
- **Critérios de aceite:** o botão alterna a interface para escuro e persiste ao recarregar (sem
  flash); **a HTML exportada e o preview do e-mail permanecem idênticos** com dark on/off; o toggle
  "Fundo do preview" continua funcionando de forma independente.

---

## Ordem sugerida de entrega

1. **MOD 2** (preview) e **MOD 3** (CTA) — correções pequenas e de alto impacto na percepção.
2. **MOD 4** (dark mode) — pequeno, base já existe, pedido explícito do cliente.
3. **MOD 1 Fase A** (descoberta de layouts) — médio; resolve o maior ponto da devolutiva sem risco
   ao engine.
4. **MOD 1 Fase C** documentada; **Fase B** só se surgir demanda real.

## Estratégia de entrega no código

Sugestão padrão: **uma branch + Pull Request** em `mktops-febracis/supabase-spark` para revisão
(um PR por modificação, ou um PR agrupando MOD 2/3/4 que são pequenas). Atenção ao `AGENTS.md`: **não**
reescrever histórico (nada de force-push/rebase/squash em commits já publicados) e manter a branch
funcional, pois commits sincronizam de volta com a Lovable. *(A definir com o Dayvison: PR para
revisão vs. commit direto na `main` — a decisão não bloqueia o conteúdo deste PRD.)*

Após aprovação deste PRD, ele pode ser salvo também dentro do repo (ex.: `docs/PRD-melhorias-teste-1.md`)
para ficar versionado junto do código.

## Verificação (end-to-end)

- **MOD 3:** editar `cta.html` → `node lovable/bundle.mjs` → `node lovable/engine.gen.mjs` (checar
  `bytesAbove127:0`, tags balanceadas) → conferir `src/lib/engine.ts` idêntico → testar visual no app
  e envio real para Outlook + Gmail/Apple Mail.
- **MOD 2:** app rodando com painel estreito; "Desktop 600" deve mostrar layout de 600px (não
  empilhado); redimensionar ajusta o zoom; "Tela cheia" = 600px reais; "Mobile 375" = empilhado.
- **MOD 4:** clicar no toggle → `<html class="dark">`, cores mudam, persiste ao recarregar sem flash;
  **comparar a string de export com dark on/off (deve ser idêntica)**; "Fundo do preview" independente.
- **MOD 1 (Fase A):** "Começar em branco" zera; montar 3 blocos, reordenar, editar, salvar em
  arquivo/nuvem e reabrir; serialize gera HTML válido do zero.

## Riscos

- **Regra de ouro:** MOD 3 e MOD 1/Fase B mexem no engine → sempre rodar `bundle.mjs` e validar
  paridade `engine.ts` × bundle. MOD 2 e MOD 4 **não** tocam o engine (risco baixo).
- **SSR/hidratação (TanStack Start):** medir largura (MOD 2) e ler tema (MOD 4) só no client, com
  guard, para evitar mismatch/flash.
- **Fase B (colar HTML):** maior risco de conteúdo não-MC-safe → exige validador rígido; por isso
  fica fora do escopo inicial.
