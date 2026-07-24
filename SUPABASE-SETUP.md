# Setup do armazenamento (Supabase `njyvkjxbqlqcsxuaqqju`)

O app salva **presets (e-mails)**, **HTML exportada** e **imagens (Storage)** no Supabase, com
**login por senha** restrito a **`@febracis.com.br`**. Para funcionar, faça 3 passos:

## 1. Variáveis de ambiente
Copie `.env.example` para `.env` e preencha a chave anon (Supabase → Settings → API →
Project API keys → `anon`/`publishable`):

```
VITE_SUPABASE_URL=https://njyvkjxbqlqcsxuaqqju.supabase.co
VITE_SUPABASE_ANON_KEY=<sua-chave-anon>
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

## Como usar
- **Entrar/Cadastrar**: só e-mails `@febracis.com.br`.
- **Salvar na nuvem / Abrir da nuvem**: presets compartilhados pela equipe.
- **Enviar imagem** (campo de imagem): sobe pro bucket e preenche a URL pública.
- **Salvar exportação na nuvem**: guarda a HTML final MC-safe com o modo usado.
