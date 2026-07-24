-- Febracis Email Builder — papéis de acesso e aprovação de cadastro
-- Papéis: superadmin (gerencia usuários), member (usa o editor), pending (aguardando validação).
-- Novo cadastro entra como 'pending' e vê a tela de "aguarde validação"; os 3 e-mails da
-- allowlist entram já como 'superadmin'. Idempotente.

-- ============================================================================
-- 1) Tabela profiles (espelha auth.users) + papel inicial por e-mail
-- ============================================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  role       text not null default 'pending' check (role in ('superadmin', 'member', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Allowlist de superadmins (por e-mail). E-mail não é segredo; senha nunca fica aqui.
create or replace function public.initial_role_for(p_email text)
returns text language sql immutable as $$
  select case
    when lower(p_email) in (
      'dayvisonconceicao@febracis.com.br',
      'raphaelalmeida@febracis.com.br',
      'felipemelare@febracis.com.br'
    ) then 'superadmin'
    else 'pending'
  end;
$$;

-- ============================================================================
-- 2) Trigger: ao criar usuário em auth.users, cria o profile com o papel inicial
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, public.initial_role_for(new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists touch_profiles on public.profiles;
create trigger touch_profiles
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Backfill de usuários já existentes sem profile
insert into public.profiles (id, email, role)
select u.id, u.email, public.initial_role_for(u.email)
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Garante o papel dos 3 superadmins mesmo se já existiam como pending/member
update public.profiles
set role = 'superadmin'
where lower(email) in (
  'dayvisonconceicao@febracis.com.br',
  'raphaelalmeida@febracis.com.br',
  'felipemelare@febracis.com.br'
) and role <> 'superadmin';

-- ============================================================================
-- 3) Helpers de papel — security definer p/ ler profiles sem recursão de RLS
-- ============================================================================
create or replace function public.my_role()
returns text language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() = 'superadmin', false);
$$;

create or replace function public.is_active_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() in ('superadmin', 'member'), false);
$$;

-- ============================================================================
-- 4) RLS de profiles: cada um lê o próprio; superadmin lê todos e altera papéis
-- ============================================================================
alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_superadmin());
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- ============================================================================
-- 5) Restringe os dados a MEMBROS ATIVOS (member/superadmin). Pending não acessa.
--    Substitui as policies antigas ('to authenticated using(true)').
-- ============================================================================
drop policy if exists presets_select_auth on public.email_presets;
drop policy if exists presets_insert_auth on public.email_presets;
drop policy if exists presets_update_auth on public.email_presets;
drop policy if exists presets_delete_auth on public.email_presets;
drop policy if exists presets_all_member on public.email_presets;
create policy presets_all_member on public.email_presets
  for all to authenticated
  using (public.is_active_member())
  with check (public.is_active_member());

drop policy if exists exports_select_auth on public.email_exports;
drop policy if exists exports_insert_auth on public.email_exports;
drop policy if exists exports_delete_auth on public.email_exports;
drop policy if exists exports_all_member on public.email_exports;
create policy exports_all_member on public.email_exports
  for all to authenticated
  using (public.is_active_member())
  with check (public.is_active_member());

-- Storage: leitura pública continua; escrita/gestão só membro ativo
drop policy if exists email_assets_auth_insert on storage.objects;
drop policy if exists email_assets_auth_update on storage.objects;
drop policy if exists email_assets_auth_delete on storage.objects;
drop policy if exists email_assets_member_insert on storage.objects;
drop policy if exists email_assets_member_update on storage.objects;
drop policy if exists email_assets_member_delete on storage.objects;
create policy email_assets_member_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'email-assets' and public.is_active_member());
create policy email_assets_member_update on storage.objects
  for update to authenticated
  using (bucket_id = 'email-assets' and public.is_active_member());
create policy email_assets_member_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'email-assets' and public.is_active_member());
