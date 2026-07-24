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

```ts
// AUTO-GERADO por lovable/bundle.mjs — NAO EDITE A MAO. Este arquivo e a fonte de verdade MC-safe.
export type FieldType = 'text' | 'textarea' | 'richhtml' | 'color' | 'image' | 'link' | 'number' | 'select';
export interface Field { key: string; label: string; type: FieldType; default?: string; help?: string }
export interface Slot { key: string; recommended: string }
export interface BlockMeta { label: string; category: string; slots?: Slot[]; fields: Field[] }
export interface BlockInstance { type: string; values: Record<string, string> }
export interface Preset { name?: string; global: Record<string, string>; blocks: BlockInstance[] }

export const HEAD = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="pt-BR">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
<title>{{email_title}}</title>

<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<style>
  table,td,div,p,a,h1,h2,h3,span{font-family:Arial,Helvetica,sans-serif !important;}
</style>
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
    .stack-mb{padding-bottom:26px !important;}
    .pad-x{padding-left:22px !important;padding-right:22px !important;}
    .pad-l0{padding-left:0 !important;}
    .img-full img{width:100% !important;height:auto !important;max-width:100% !important;}
    .h1{font-size:29px !important;line-height:35px !important;}
    .h2{font-size:23px !important;line-height:29px !important;}
    .h3{font-size:21px !important;line-height:28px !important;}
    .cta a{width:auto !important;max-width:88% !important;font-size:13px !important;}
    .stat-txt{padding:28px 24px 22px 24px !important;}
    .stat-img img{width:100% !important;height:auto !important;border-radius:0 0 16px 16px !important;}
    .radius-m img{border-radius:14px !important;}
    .nobr br{display:none !important;}
  }
</style>
</head>

<body id="body" style="margin:0;padding:0;background-color:{{body_bg}};">

<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;font-family:Arial,sans-serif;color:{{body_bg}};">
  {{{preheader}}}
  &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:{{body_bg}};">
<tr>
<td align="center" style="padding:0;">

  <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#FFFFFF;">
`;

export const FOOT = `  </table>

</td>
</tr>
</table>

</body>
</html>
`;

export const BLOCKS: Record<string, string> = {
  "cta": `    <!-- BLOCK:cta -->
    <tr>
      <td align="center" height="53" bgcolor="{{cta_bg}}" background="{{cta_split_img}}" class="cta"
          style="height:53px;padding:0;background-color:{{cta_bg}};background-image:url('{{cta_split_img}}');background-repeat:no-repeat;background-position:top center;background-size:100% 100%;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{cta_link}}" style="height:53px;v-text-anchor:middle;width:360px;" arcsize="50%" stroke="f" fillcolor="{{cta_btn_bg}}">
          <w:anchorlock/>
          <center style="color:{{cta_btn_color}};font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">{{cta_text}}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-- -->
        <a href="{{cta_link}}" style="display:inline-block;width:290px;background-color:{{cta_btn_bg}};color:{{cta_btn_color}};font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:15px;line-height:19px;font-weight:700;letter-spacing:0.3px;text-align:center;padding:17px 35px;border-radius:27px;">{{cta_text}}</a>
        <!--<![endif]-->
      </td>
    </tr>
`,
  "heading": `    <!-- BLOCK:heading -->
    <tr>
      <td align="center" class="pad-x" style="padding:{{heading_pad}};">
        <h2 class="h3" style="margin:0;font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:{{heading_size}}px;line-height:{{heading_lh}}px;font-weight:700;color:{{heading_color}};text-align:center;">
          {{{heading_text}}}
        </h2>
      </td>
    </tr>
`,
  "hero": `    <!-- BLOCK:hero -->
    <tr>
      <td align="center" bgcolor="{{hero_bg}}" background="{{hero_bg_img}}"
          style="background-color:{{hero_bg}};background-image:url('{{hero_bg_img}}');background-repeat:no-repeat;background-position:top center;background-size:cover;padding:62px 24px 18px 24px;">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" data-type="slot" data-key="slot_logo" style="padding:0 0 38px 0;">
              <img src="{{logo_src}}" width="{{logo_w}}" alt="{{logo_alt}}" style="width:{{logo_w}}px;max-width:{{logo_w}}px;height:auto;display:block;margin:0 auto;" />
            </td>
          </tr>
        </table>

        <h1 class="h1" style="margin:0 0 12px 0;font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:33px;line-height:38px;font-weight:700;color:{{hero_h1_color}};text-align:center;letter-spacing:-0.3px;">
          {{{hero_h1}}}
        </h1>

        <p style="margin:0 0 12px 0;font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:16px;line-height:22px;font-weight:400;color:{{hero_sub_color}};text-align:center;">
          {{{hero_sub}}}
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
          <tr>
            <td align="center" height="28" style="height:28px;line-height:28px;font-family:Arial,Helvetica,sans-serif;font-size:30px;color:{{hero_arrow_color}};mso-line-height-rule:exactly;">&#8595;</td>
          </tr>
        </table>
      </td>
    </tr>
`,
  "list-check": `    <!-- BLOCK:list-check -->
    <tr>
      <td class="pad-x" align="center" style="padding:44px 48px 0 48px;font-size:0;">

        <!--[if mso]><table role="presentation" width="504" cellpadding="0" cellspacing="0" border="0"><tr><td width="234" valign="top"><![endif]-->
        <div class="stack stack-mb" style="display:inline-block;width:100%;max-width:234px;vertical-align:top;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td class="img-full radius-m" data-type="slot" data-key="slot_img_palco" align="center" style="padding:0;">
                <img src="{{palco_src}}" width="234" alt="{{palco_alt}}" style="width:234px;max-width:234px;height:auto;display:block;border-radius:12px;" />
              </td>
            </tr>
          </table>
        </div>
        <!--[if mso]></td><td width="20">&nbsp;</td><td width="250" valign="top"><![endif]-->

        <div class="stack" style="display:inline-block;width:100%;max-width:250px;vertical-align:top;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td class="pad-l0" style="padding:6px 0 0 20px;">
                <h2 class="h2" style="margin:0 0 20px 0;font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:24px;line-height:30px;font-weight:700;color:{{lc_heading_color}};letter-spacing:-0.2px;">
                  {{{lc_heading}}}
                </h2>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="30" valign="top" style="padding:0 0 16px 0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                        <td width="19" height="19" align="center" valign="middle" bgcolor="{{lc_icon_bg}}" style="width:19px;height:19px;background-color:{{lc_icon_bg}};border-radius:10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:19px;font-weight:bold;color:#FFFFFF;mso-line-height-rule:exactly;">&#10005;</td>
                      </tr></table>
                    </td>
                    <td valign="top" style="padding:0 0 16px 0;font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:15px;line-height:21px;color:#000000;">{{bullet_1}}</td>
                  </tr>
                  <tr>
                    <td width="30" valign="top" style="padding:0 0 16px 0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                        <td width="19" height="19" align="center" valign="middle" bgcolor="{{lc_icon_bg}}" style="width:19px;height:19px;background-color:{{lc_icon_bg}};border-radius:10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:19px;font-weight:bold;color:#FFFFFF;mso-line-height-rule:exactly;">&#10005;</td>
                      </tr></table>
                    </td>
                    <td valign="top" style="padding:0 0 16px 0;font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:15px;line-height:21px;color:#000000;">{{bullet_2}}</td>
                  </tr>
                  <tr>
                    <td width="30" valign="top" style="padding:0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                        <td width="19" height="19" align="center" valign="middle" bgcolor="{{lc_icon_bg}}" style="width:19px;height:19px;background-color:{{lc_icon_bg}};border-radius:10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:19px;font-weight:bold;color:#FFFFFF;mso-line-height-rule:exactly;">&#10005;</td>
                      </tr></table>
                    </td>
                    <td valign="top" style="padding:0;font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:15px;line-height:21px;color:#000000;">{{bullet_3}}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
`,
  "payment": `    <!-- BLOCK:payment -->
    <tr>
      <td align="center" class="pad-x" style="padding:0 48px 25px 48px;">
        <h2 class="h3" style="margin:0;font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:22px;line-height:29px;font-weight:700;color:{{pay_heading_color}};text-align:center;">
          {{pay_heading}}
        </h2>
      </td>
    </tr>

    <tr>
      <td class="pad-x" align="center" style="padding:0 48px 49px 48px;font-size:0;">

        <!--[if mso]><table role="presentation" width="504" cellpadding="0" cellspacing="0" border="0"><tr><td width="242" valign="top"><![endif]-->
        <div class="stack stack-mb" style="display:inline-block;width:100%;max-width:242px;vertical-align:top;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{{pay_card_bg}}" style="background-color:{{pay_card_bg}};border-radius:12px;">
            <tr>
              <td align="center" style="padding:28px 16px 30px 16px;">
                <p style="margin:0 0 6px 0;font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:17px;line-height:23px;font-weight:700;color:{{pay_title_color}};">{{pay_left_title}}</p>
                <p style="margin:0 0 20px 0;font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:12px;line-height:17px;color:#000000;">{{pay_left_desc}}</p>
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{pay_left_link}}" style="height:36px;v-text-anchor:middle;width:183px;" arcsize="50%" stroke="f" fillcolor="{{pay_left_btn_bg}}">
                  <w:anchorlock/><center style="color:{{pay_left_btn_color}};font-family:Arial,sans-serif;font-size:12px;font-weight:bold;">{{pay_left_btn}}</center>
                </v:roundrect>
                <![endif]-->
                <!--[if !mso]><!-- -->
                <a href="{{pay_left_link}}" style="display:inline-block;width:183px;background-color:{{pay_left_btn_bg}};color:{{pay_left_btn_color}};font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.3px;text-align:center;padding:10px 0;border-radius:18px;">{{pay_left_btn}}</a>
                <!--<![endif]-->
              </td>
            </tr>
          </table>
        </div>
        <!--[if mso]></td><td width="20">&nbsp;</td><td width="242" valign="top"><![endif]-->

        <div class="stack" style="display:inline-block;width:100%;max-width:242px;vertical-align:top;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{{pay_card_bg}}" style="background-color:{{pay_card_bg}};border-radius:12px;">
            <tr>
              <td align="center" style="padding:28px 16px 30px 16px;">
                <p style="margin:0 0 6px 0;font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:17px;line-height:23px;font-weight:700;color:{{pay_title_color}};">{{pay_right_title}}</p>
                <p style="margin:0 0 20px 0;font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:12px;line-height:17px;color:#000000;">{{pay_right_desc}}</p>
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{pay_right_link}}" style="height:36px;v-text-anchor:middle;width:183px;" arcsize="50%" stroke="f" fillcolor="{{pay_right_btn_bg}}">
                  <w:anchorlock/><center style="color:{{pay_right_btn_color}};font-family:Arial,sans-serif;font-size:12px;font-weight:bold;">{{pay_right_btn}}</center>
                </v:roundrect>
                <![endif]-->
                <!--[if !mso]><!-- -->
                <a href="{{pay_right_link}}" style="display:inline-block;width:183px;background-color:{{pay_right_btn_bg}};color:{{pay_right_btn_color}};font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.3px;text-align:center;padding:10px 0;border-radius:18px;">{{pay_right_btn}}</a>
                <!--<![endif]-->
              </td>
            </tr>
          </table>
        </div>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
`,
  "pillars": `    <!-- BLOCK:pillars -->
    <tr>
      <td class="pad-x" align="center" style="padding:0 48px 22px 48px;font-size:0;">

        <!--[if mso]><table role="presentation" width="504" cellpadding="0" cellspacing="0" border="0"><tr><td width="168" valign="top"><![endif]-->
        <div class="stack stack-mb" style="display:inline-block;width:100%;max-width:168px;vertical-align:top;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" data-type="slot" data-key="slot_icone_1" style="padding:0 0 16px 0;">
                <img src="{{icone_1_src}}" width="74" alt="{{pilar_1_title}}" style="width:74px;height:74px;display:block;margin:0 auto;border-radius:37px;" />
              </td>
            </tr>
            <tr><td align="center" style="font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:14px;line-height:18px;font-weight:700;color:#000000;padding:0 0 8px 0;">{{pilar_1_title}}</td></tr>
            <tr><td align="center" style="font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:11px;line-height:15px;color:#000000;padding:0 6px;">{{pilar_1_desc}}</td></tr>
          </table>
        </div>
        <!--[if mso]></td><td width="168" valign="top"><![endif]-->

        <div class="stack stack-mb" style="display:inline-block;width:100%;max-width:168px;vertical-align:top;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" data-type="slot" data-key="slot_icone_2" style="padding:0 0 16px 0;">
                <img src="{{icone_2_src}}" width="74" alt="{{pilar_2_title}}" style="width:74px;height:74px;display:block;margin:0 auto;border-radius:37px;" />
              </td>
            </tr>
            <tr><td align="center" style="font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:14px;line-height:18px;font-weight:700;color:#000000;padding:0 0 8px 0;">{{pilar_2_title}}</td></tr>
            <tr><td align="center" style="font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:11px;line-height:15px;color:#000000;padding:0 6px;">{{pilar_2_desc}}</td></tr>
          </table>
        </div>
        <!--[if mso]></td><td width="168" valign="top"><![endif]-->

        <div class="stack" style="display:inline-block;width:100%;max-width:168px;vertical-align:top;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" data-type="slot" data-key="slot_icone_3" style="padding:0 0 16px 0;">
                <img src="{{icone_3_src}}" width="74" alt="{{pilar_3_title}}" style="width:74px;height:74px;display:block;margin:0 auto;border-radius:37px;" />
              </td>
            </tr>
            <tr><td align="center" style="font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:14px;line-height:18px;font-weight:700;color:#000000;padding:0 0 8px 0;">{{pilar_3_title}}</td></tr>
            <tr><td align="center" style="font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:11px;line-height:15px;color:#000000;padding:0 6px;">{{pilar_3_desc}}</td></tr>
          </table>
        </div>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
`,
  "signature": `    <!-- BLOCK:signature -->
    <tr>
      <td align="center" class="pad-x" style="padding:62px 48px 56px 48px;">
        <p style="margin:0 0 4px 0;font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:15px;line-height:21px;color:#000000;">{{sig_greeting}}</p>
        <p style="margin:0 0 10px 0;font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:15px;line-height:21px;font-weight:700;color:#000000;">{{sig_name}}</p>
        <p style="margin:0;font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;font-style:italic;color:#000000;">{{sig_phrase}}</p>
      </td>
    </tr>
`,
  "social-proof": `    <!-- BLOCK:social-proof -->
    <tr>
      <td class="pad-x" style="padding:0 48px 38px 48px;">
        <table role="presentation" width="504" cellpadding="0" cellspacing="0" border="0" bgcolor="{{sp_card_bg}}" style="width:100%;max-width:504px;background-color:{{sp_card_bg}};border-radius:16px;">
          <tr>
            <td align="center" style="padding:0;font-size:0;line-height:0;">

              <!--[if mso]><table role="presentation" width="504" cellpadding="0" cellspacing="0" border="0"><tr><td width="252" valign="top"><![endif]-->
              <div class="stack" style="display:inline-block;width:100%;max-width:252px;vertical-align:top;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td class="stat-txt" height="168" valign="middle" style="height:168px;padding:0 12px 0 31px;">
                      <p style="margin:0 0 6px 0;font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:29px;line-height:34px;font-weight:700;color:{{sp_number_color}};">{{sp_number}}</p>
                      <p class="nobr" style="margin:0;font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:16px;line-height:22px;color:#FFFFFF;">{{{sp_text}}}</p>
                    </td>
                  </tr>
                </table>
              </div>
              <!--[if mso]></td><td width="252" valign="top"><![endif]-->

              <div class="stack" style="display:inline-block;width:100%;max-width:252px;vertical-align:top;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td class="stat-img" data-type="slot" data-key="slot_img_publico" align="center" valign="top" style="padding:0;font-size:0;line-height:0;">
                      <img src="{{publico_src}}" width="252" height="168" alt="{{publico_alt}}" style="width:252px;max-width:252px;height:168px;display:block;border-radius:0 16px 16px 0;" />
                    </td>
                  </tr>
                </table>
              </div>
              <!--[if mso]></td></tr></table><![endif]-->
            </td>
          </tr>
        </table>
      </td>
    </tr>
`,
  "whatsapp": `    <!-- BLOCK:whatsapp -->
    <tr>
      <td bgcolor="{{wa_bar_bg}}" height="64" class="pad-x" style="background-color:{{wa_bar_bg}};height:64px;padding:14px 48px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
          <tr>
            <td width="46" valign="middle" data-type="slot" data-key="slot_icone_zap" align="center" style="padding:0 14px 0 0;">
              <img src="{{zap_src}}" width="32" alt="WhatsApp" style="width:32px;height:32px;display:block;" />
            </td>
            <td valign="middle" style="font-family:'Poppins',Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#3C3C3C;">
              {{wa_before}} <a href="{{wa_link}}" style="color:#000000;text-decoration:underline;">{{wa_link_text}}</a>{{wa_after}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
`,
};

export const REGISTRY = {
  "_comment": "Metadados dos blocos para a UI auto-gerar formulários. type: text|textarea|richhtml|color|image|link|number|select. 'richhtml' = token {{{...}}} (aceita <b>/<span cor>/<br>). image => slot arrastável no Content Builder.",
  "palette": {
    "azul": "#0006B3",
    "azul_card": "#000FAE",
    "dourado": "#FFC400",
    "titulo": "#2D2D2D",
    "vermelho": "#FF0000",
    "boleto": "#2440FF",
    "titulo_card_pgto": "#0F0094",
    "card_pgto": "#EFEFEF",
    "circulo_icone": "#D9D9D9"
  },
  "global": [
    { "key": "email_title", "label": "Título (aba do navegador)", "type": "text" },
    { "key": "body_bg", "label": "Cor de fundo do e-mail", "type": "color", "default": "#FFFFFF" },
    { "key": "preheader", "label": "Preheader (prévia na caixa de entrada)", "type": "textarea" }
  ],
  "blocks": {
    "hero": {
      "label": "Hero (topo azul)", "category": "topo",
      "slots": [{ "key": "slot_logo", "recommended": "480x140 (2x)" }],
      "fields": [
        { "key": "hero_bg", "label": "Cor de fundo", "type": "color", "default": "#0006B3" },
        { "key": "hero_bg_img", "label": "Textura de fundo (CDN)", "type": "text", "default": "__CDN__cis-hero-bg.png" },
        { "key": "logo_src", "label": "Logo", "type": "image" },
        { "key": "logo_w", "label": "Largura do logo (px)", "type": "number", "default": "232" },
        { "key": "logo_alt", "label": "Texto alternativo do logo", "type": "text" },
        { "key": "hero_h1", "label": "Título principal", "type": "richhtml" },
        { "key": "hero_h1_color", "label": "Cor do título", "type": "color", "default": "#FFFFFF" },
        { "key": "hero_sub", "label": "Subtítulo", "type": "richhtml" },
        { "key": "hero_sub_color", "label": "Cor do subtítulo", "type": "color", "default": "#DFE0F5" },
        { "key": "hero_arrow_color", "label": "Cor da seta", "type": "color", "default": "#FFFFFF" }
      ]
    },
    "cta": {
      "label": "Botão principal (CTA)", "category": "conversao",
      "fields": [
        { "key": "cta_text", "label": "Texto do botão", "type": "text" },
        { "key": "cta_link", "label": "Link", "type": "link" },
        { "key": "cta_bg", "label": "Cor da faixa", "type": "color", "default": "#0006B3" },
        { "key": "cta_split_img", "label": "Faixa divisória (CDN)", "type": "text", "default": "__CDN__cis-btn-split.png" },
        { "key": "cta_btn_bg", "label": "Cor do botão", "type": "color", "default": "#FFC400" },
        { "key": "cta_btn_color", "label": "Cor do texto", "type": "color", "default": "#000000" }
      ]
    },
    "list-check": {
      "label": "Lista com imagem lateral", "category": "conteudo",
      "slots": [{ "key": "slot_img_palco", "recommended": "468x514 (2x)" }],
      "fields": [
        { "key": "palco_src", "label": "Imagem", "type": "image" },
        { "key": "palco_alt", "label": "Texto alternativo da imagem", "type": "text" },
        { "key": "lc_heading", "label": "Título", "type": "richhtml" },
        { "key": "lc_heading_color", "label": "Cor do título", "type": "color", "default": "#2D2D2D" },
        { "key": "lc_icon_bg", "label": "Cor do ícone", "type": "color", "default": "#FF0000" },
        { "key": "bullet_1", "label": "Item 1", "type": "text" },
        { "key": "bullet_2", "label": "Item 2", "type": "text" },
        { "key": "bullet_3", "label": "Item 3", "type": "text" }
      ]
    },
    "heading": {
      "label": "Título centralizado", "category": "conteudo",
      "fields": [
        { "key": "heading_text", "label": "Texto", "type": "richhtml" },
        { "key": "heading_color", "label": "Cor", "type": "color", "default": "#2D2D2D" },
        { "key": "heading_size", "label": "Tamanho (px)", "type": "number", "default": "23" },
        { "key": "heading_lh", "label": "Altura de linha (px)", "type": "number", "default": "30" },
        { "key": "heading_pad", "label": "Espaçamento (CSS padding)", "type": "text", "default": "36px 48px 40px 48px" }
      ]
    },
    "pillars": {
      "label": "3 pilares (ícones)", "category": "conteudo",
      "slots": [
        { "key": "slot_icone_1", "recommended": "148x148 (círculo embutido)" },
        { "key": "slot_icone_2", "recommended": "148x148 (círculo embutido)" },
        { "key": "slot_icone_3", "recommended": "148x148 (círculo embutido)" }
      ],
      "fields": [
        { "key": "icone_1_src", "label": "Ícone 1", "type": "image" },
        { "key": "pilar_1_title", "label": "Título 1", "type": "text" },
        { "key": "pilar_1_desc", "label": "Descrição 1", "type": "textarea" },
        { "key": "icone_2_src", "label": "Ícone 2", "type": "image" },
        { "key": "pilar_2_title", "label": "Título 2", "type": "text" },
        { "key": "pilar_2_desc", "label": "Descrição 2", "type": "textarea" },
        { "key": "icone_3_src", "label": "Ícone 3", "type": "image" },
        { "key": "pilar_3_title", "label": "Título 3", "type": "text" },
        { "key": "pilar_3_desc", "label": "Descrição 3", "type": "textarea" }
      ]
    },
    "social-proof": {
      "label": "Prova social (card azul)", "category": "prova",
      "slots": [{ "key": "slot_img_publico", "recommended": "504x336 (3:2)" }],
      "fields": [
        { "key": "sp_number", "label": "Número em destaque", "type": "text" },
        { "key": "sp_number_color", "label": "Cor do número", "type": "color", "default": "#FFC400" },
        { "key": "sp_text", "label": "Texto", "type": "richhtml" },
        { "key": "sp_card_bg", "label": "Cor do card", "type": "color", "default": "#000FAE" },
        { "key": "publico_src", "label": "Imagem", "type": "image" },
        { "key": "publico_alt", "label": "Texto alternativo da imagem", "type": "text" }
      ]
    },
    "payment": {
      "label": "Escolha de pagamento (2 cards)", "category": "conversao",
      "fields": [
        { "key": "pay_heading", "label": "Título da seção", "type": "text" },
        { "key": "pay_heading_color", "label": "Cor do título", "type": "color", "default": "#2D2D2D" },
        { "key": "pay_card_bg", "label": "Cor dos cards", "type": "color", "default": "#EFEFEF" },
        { "key": "pay_title_color", "label": "Cor dos títulos dos cards", "type": "color", "default": "#0F0094" },
        { "key": "pay_left_title", "label": "Card esquerdo: título", "type": "text" },
        { "key": "pay_left_desc", "label": "Card esquerdo: descrição", "type": "text" },
        { "key": "pay_left_btn", "label": "Card esquerdo: texto do botão", "type": "text" },
        { "key": "pay_left_link", "label": "Card esquerdo: link", "type": "link" },
        { "key": "pay_left_btn_bg", "label": "Card esquerdo: cor do botão", "type": "color", "default": "#FFC400" },
        { "key": "pay_left_btn_color", "label": "Card esquerdo: cor do texto", "type": "color", "default": "#000000" },
        { "key": "pay_right_title", "label": "Card direito: título", "type": "text" },
        { "key": "pay_right_desc", "label": "Card direito: descrição", "type": "text" },
        { "key": "pay_right_btn", "label": "Card direito: texto do botão", "type": "text" },
        { "key": "pay_right_link", "label": "Card direito: link", "type": "link" },
        { "key": "pay_right_btn_bg", "label": "Card direito: cor do botão", "type": "color", "default": "#2440FF" },
        { "key": "pay_right_btn_color", "label": "Card direito: cor do texto", "type": "color", "default": "#FFFFFF" }
      ]
    },
    "whatsapp": {
      "label": "Faixa WhatsApp", "category": "rodape",
      "slots": [{ "key": "slot_icone_zap", "recommended": "64x64" }],
      "fields": [
        { "key": "wa_before", "label": "Texto antes do link", "type": "text" },
        { "key": "wa_link_text", "label": "Texto do link", "type": "text" },
        { "key": "wa_link", "label": "Link do WhatsApp", "type": "link" },
        { "key": "wa_after", "label": "Texto depois do link", "type": "text", "default": "." },
        { "key": "wa_bar_bg", "label": "Cor da faixa", "type": "color", "default": "#F1F1F1" },
        { "key": "zap_src", "label": "Ícone", "type": "image" }
      ]
    },
    "signature": {
      "label": "Assinatura", "category": "rodape",
      "fields": [
        { "key": "sig_greeting", "label": "Saudação", "type": "text" },
        { "key": "sig_name", "label": "Nome", "type": "text" },
        { "key": "sig_phrase", "label": "Frase de fecho", "type": "text" }
      ]
    }
  }
} as unknown as { palette: Record<string,string>; global: Field[]; blocks: Record<string, BlockMeta> };

export const CIS_PRESET: Preset = {
  "name": "CIS Online - O padrão invisível",
  "global": {
    "email_title": "O padrão invisível que segura a sua vida",
    "body_bg": "#FFFFFF",
    "preheader": "Existe um padrão invisível se repetindo na sua vida. 3 dias ao vivo com Paulo Vieira para romper com ele."
  },
  "blocks": [
    {
      "type": "hero",
      "values": {
        "hero_bg": "#0006B3",
        "hero_bg_img": "__CDN__cis-hero-bg.png",
        "logo_src": "https://image.email360.febracis.com.br/lib/fe3a15717564047b751178/m/1/9ac79cff-d31a-4c40-aadb-4bf4f557b56b.png",
        "logo_w": "232",
        "logo_alt": "Método CIS Online",
        "hero_h1_color": "#FFFFFF",
        "hero_h1": "O padrão invisível que<br />segura a sua vida",
        "hero_sub_color": "#DFE0F5",
        "hero_sub": "Rompa o padrão. Viva o <span style=\"color:#FFD900;font-weight:700;\">CIS Online</span>, ao<br />vivo com Paulo Vieira.",
        "hero_arrow_color": "#FFFFFF"
      }
    },
    {
      "type": "cta",
      "values": {
        "cta_bg": "#0006B3",
        "cta_split_img": "__CDN__cis-btn-split.png",
        "cta_link": "#URL_CHECKOUT",
        "cta_btn_bg": "#FFC400",
        "cta_btn_color": "#000000",
        "cta_text": "QUERO VIVER O CIS ONLINE"
      }
    },
    {
      "type": "list-check",
      "values": {
        "palco_src": "https://placehold.co/468x514/DDDDDD/888888?text=FOTO+PALCO",
        "palco_alt": "Paulo Vieira no palco do CIS Online",
        "lc_heading_color": "#2D2D2D",
        "lc_heading": "Por que a mesma cena <span style=\"color:#FF0000;\">se repete?</span>",
        "lc_icon_bg": "#FF0000",
        "bullet_1": "Decisões que não te levam pra frente.",
        "bullet_2": "Relações que voltam ao mesmo conflito.",
        "bullet_3": "Resultados que não se sustentam."
      }
    },
    {
      "type": "heading",
      "values": {
        "heading_pad": "36px 48px 40px 48px",
        "heading_size": "23",
        "heading_lh": "30",
        "heading_color": "#2D2D2D",
        "heading_text": "A raiz tem solução."
      }
    },
    {
      "type": "pillars",
      "values": {
        "icone_1_src": "https://placehold.co/148x148/D9D9D9/0006B3?text=1",
        "pilar_1_title": "3 dias ao vivo",
        "pilar_1_desc": "Imersão prática com o Paulo Vieira, direto na sua rotina.",
        "icone_2_src": "https://placehold.co/148x148/D9D9D9/0006B3?text=2",
        "pilar_2_title": "Plataforma exclusiva",
        "pilar_2_desc": "Conteúdo digital pra rever e aplicar sempre.",
        "icone_3_src": "https://placehold.co/148x148/D9D9D9/0006B3?text=3",
        "pilar_3_title": "Análise de perfil",
        "pilar_3_desc": "Clareza sobre os padrões que te limitam."
      }
    },
    {
      "type": "social-proof",
      "values": {
        "sp_card_bg": "#000FAE",
        "sp_number": "+1,8 milhão",
        "sp_number_color": "#FFC400",
        "sp_text": "de pessoas em mais de<br />100 países já romperam<br />esse padrão.",
        "publico_src": "https://placehold.co/504x336/CCCCCC/777777?text=FOTO+PUBLICO",
        "publico_alt": "Participantes do CIS Online"
      }
    },
    {
      "type": "payment",
      "values": {
        "pay_heading_color": "#2D2D2D",
        "pay_heading": "Escolha como garantir sua vaga",
        "pay_card_bg": "#EFEFEF",
        "pay_title_color": "#0F0094",
        "pay_left_title": "Cartão de crédito",
        "pay_left_desc": "Pagamento seguro e rápido.",
        "pay_left_btn": "PAGAR NO CARTÃO",
        "pay_left_link": "#URL_CHECKOUT_CARTAO",
        "pay_left_btn_bg": "#FFC400",
        "pay_left_btn_color": "#000000",
        "pay_right_title": "Boleto bancário",
        "pay_right_desc": "Mais flexibilidade pra você.",
        "pay_right_btn": "PAGAR NO BOLETO",
        "pay_right_link": "#URL_CHECKOUT_BOLETO",
        "pay_right_btn_bg": "#2440FF",
        "pay_right_btn_color": "#FFFFFF"
      }
    },
    {
      "type": "whatsapp",
      "values": {
        "wa_bar_bg": "#F1F1F1",
        "zap_src": "https://placehold.co/64x64/F1F1F1/3C3C3C?text=W",
        "wa_before": "Prefere tirar dúvidas antes?",
        "wa_link": "#URL_WHATSAPP",
        "wa_link_text": "Fale com um especialista no WhatsApp",
        "wa_after": "."
      }
    },
    {
      "type": "signature",
      "values": {
        "sig_greeting": "Um abraço,",
        "sig_name": "Paulo Vieira",
        "sig_phrase": "A mudança começa quando a desculpa termina."
      }
    }
  ]
};


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
```
