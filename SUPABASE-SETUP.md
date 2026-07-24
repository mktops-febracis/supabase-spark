# Setup do armazenamento (Supabase `njyvkjxbqlqcsxuaqqju`)

O app salva **presets (e-mails)**, **HTML exportada** e **imagens (Storage)** no Supabase, com
**login por senha** restrito a **`@febracis.com.br`**. Para funcionar, faça 3 passos:

## 1. Variáveis de ambiente

Copie `.env.example` para `.env` e preencha a chave anon (Supabase → Settings → API →
Project API keys → `anon`/`publishable`):

```
VITE_SUPABASE_URL=https://njyvkjxbqlqcsxuaqqju.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qeXZranhicWxxY3N4dWFxcWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MTA5MzQsImV4cCI6MjEwMDQ4NjkzNH0.oKVP6fg8TrospHoHrbvjqZq5F793m4ujOl_NAkVBtq4
```

Na **Lovable**, defina as mesmas duas variáveis em Settings → Environment. Sem elas, o app
mostra "Supabase não configurado".

## 2. Banco: tabelas, RLS, bucket e trigger de e-mail

Rode a migração `supabase/migrations/0001_init.sql` no **SQL Editor** do projeto (ou via CLI /
MCP autenticado). Ela cria:

- tabelas `email_presets` e `email_exports` (RLS: só usuários autenticados leem/escrevem);
- bucket **`email-assets`** (leitura pública → serve de CDN; escrita só autenticada);
- **trigger em `auth.users`** que bloqueia cadastro de e-mail que não termine em
  `@febracis.com.br` (barreira real no banco, além da validação no front).

## 3. Auth (Supabase → Authentication)

- **Email** provider habilitado.
- Se quiser acesso imediato sem confirmar e-mail: Authentication → Providers → Email →
  desative "Confirm email". Caso contrário, cada novo usuário confirma pelo link recebido.
- (Opcional) Authentication → URL Configuration: ajuste o Site URL para o domínio da Lovable.

## 4. Papéis de acesso e aprovação (migração 0002 + Edge Function)

Papéis: **superadmin** (gerencia usuários), **member** (usa o editor), **pending**
(recém-cadastrado, sem acesso). Novo cadastro entra como `pending` e vê a página
"aguarde validação da equipe de Marketing Operations". Só superadmin aprova/cria/exclui.

1. **Rode a migração** `supabase/migrations/0002_roles.sql` (SQL Editor ou MCP). Ela cria
   `profiles`, o trigger de papel inicial (allowlist dos 3 superadmins → superadmin, senão
   pending), os helpers de RLS e restringe presets/exports/storage a membros ativos.
2. **Deploy da Edge Function** `admin-users` (cria/exclui usuários com service_role):
   - via MCP: `deploy_edge_function`; ou
   - via Supabase CLI: `supabase functions deploy admin-users`; ou
   - pelo dashboard (Edge Functions → New function → cole `supabase/functions/admin-users/index.ts`).
     O `SUPABASE_SERVICE_ROLE_KEY` já é injetado no runtime da função — não precisa configurar.
3. **Bootstrap dos 3 superadmins** (allowlist já garante o papel):
   - Recomendado: desative "Confirm email" e peça para os 3 se **cadastrarem** no app com a
     senha deles — o trigger já os marca como `superadmin`; ou
   - crie-os no dashboard (Authentication → Add user, auto-confirm) / via MCP admin API.

Superadmins: `dayvisonconceicao@`, `raphaelalmeida@`, `felipemelare@` `febracis.com.br`
(defina a senha na criação — senhas nunca ficam no repositório).

## Como usar

- **Entrar/Cadastrar**: só e-mails `@febracis.com.br`. Novo cadastro fica `pending` até aprovação.
- **Usuários** (só superadmin, no header): aprovar pendentes, criar/excluir, promover/rebaixar.
- **Salvar na nuvem / Abrir da nuvem**: presets compartilhados pela equipe (membros ativos).
- **Enviar imagem** (campo de imagem): sobe pro bucket e preenche a URL pública.
- **Salvar exportação na nuvem**: guarda a HTML final MC-safe com o modo usado.
