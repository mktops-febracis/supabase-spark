-- Febracis Email Builder — storage no Supabase + auth restrito a @febracis.com.br
-- Aplique no projeto njyvkjxbqlqcsxuaqqju (SQL Editor do Supabase ou via MCP).
-- Idempotente: pode rodar mais de uma vez.

-- ============================================================================
-- 1) Só permitir cadastro de e-mails @febracis.com.br (barreira real no banco)
-- ============================================================================
create or replace function public.enforce_febracis_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or lower(new.email) not like '%@febracis.com.br' then
    raise exception 'Apenas e-mails @febracis.com.br podem ser cadastrados.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_febracis_email on auth.users;
create trigger enforce_febracis_email
  before insert on auth.users
  for each row execute function public.enforce_febracis_email();

-- ============================================================================
-- 2) Tabelas
-- ============================================================================
create table if not exists public.email_presets (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  preset     jsonb not null,
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_exports (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  mode       text not null,
  html       text not null,
  preset_id  uuid references public.email_presets(id) on delete set null,
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- updated_at automático nos presets
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_email_presets on public.email_presets;
create trigger touch_email_presets
  before update on public.email_presets
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- 3) RLS — só usuários autenticados (que, por definição, são @febracis.com.br).
--    Presets e exports são compartilhados pela equipe (todo logado lê/edita).
-- ============================================================================
alter table public.email_presets enable row level security;
alter table public.email_exports enable row level security;

drop policy if exists presets_select_auth on public.email_presets;
drop policy if exists presets_insert_auth on public.email_presets;
drop policy if exists presets_update_auth on public.email_presets;
drop policy if exists presets_delete_auth on public.email_presets;
create policy presets_select_auth on public.email_presets
  for select to authenticated using (true);
create policy presets_insert_auth on public.email_presets
  for insert to authenticated with check (auth.uid() = owner);
create policy presets_update_auth on public.email_presets
  for update to authenticated using (true) with check (true);
create policy presets_delete_auth on public.email_presets
  for delete to authenticated using (true);

drop policy if exists exports_select_auth on public.email_exports;
drop policy if exists exports_insert_auth on public.email_exports;
drop policy if exists exports_delete_auth on public.email_exports;
create policy exports_select_auth on public.email_exports
  for select to authenticated using (true);
create policy exports_insert_auth on public.email_exports
  for insert to authenticated with check (auth.uid() = owner);
create policy exports_delete_auth on public.email_exports
  for delete to authenticated using (true);

-- ============================================================================
-- 4) Storage — bucket de imagens. Leitura pública (as URLs vão nos e-mails,
--    servindo de CDN no Content Builder); escrita/gestão só autenticado.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('email-assets', 'email-assets', true)
on conflict (id) do update set public = true;

drop policy if exists email_assets_public_read on storage.objects;
drop policy if exists email_assets_auth_insert on storage.objects;
drop policy if exists email_assets_auth_update on storage.objects;
drop policy if exists email_assets_auth_delete on storage.objects;
create policy email_assets_public_read on storage.objects
  for select using (bucket_id = 'email-assets');
create policy email_assets_auth_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'email-assets');
create policy email_assets_auth_update on storage.objects
  for update to authenticated using (bucket_id = 'email-assets');
create policy email_assets_auth_delete on storage.objects
  for delete to authenticated using (bucket_id = 'email-assets');
