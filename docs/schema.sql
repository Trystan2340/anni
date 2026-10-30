-- =============================================================================
-- CHRISTMAS QUEST — schéma PostgreSQL / Supabase (cible production)
-- Ce fichier n'est pas exécuté par le prototype : il décrit la couche
-- autoritaire qui remplacera `src/data/server.ts` derrière le même contrat
-- (`src/data/api/contract.ts`).
--
-- Principes :
--  1. Toute lecture est filtrée côté serveur selon l'appelant ET l'heure serveur.
--  2. Aucun statut de réservation de SA PROPRE liste n'est envoyé avant le 25/12 11 h.
--  3. Unicité d'une réservation active par cadeau : index partiel, pas de verrou applicatif.
--  4. L'identité de l'appelant vient de auth.uid(), jamais d'un user_id du navigateur.
--  5. Le rôle « admin » de l'application ne contourne jamais la règle de surprise.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- énumérations
create type member_id as enum ('Maman', 'Papa', 'Juju', 'Chacha', 'Trystan');
create type app_role  as enum ('player', 'admin');
create type key_id    as enum ('rose', 'bleue', 'doree', 'violette');
create type game_id   as enum ('maman-match3', 'papa-tron', 'juju-blocks', 'chacha-runner');

-- ---------------------------------------------------------------- réglages
create table game_settings (
  id boolean primary key default true check (id),
  -- 2026-12-25 11:00 Europe/Paris == 10:00 UTC (CET, heure d'hiver)
  reveal_at timestamptz not null default '2026-12-25T10:00:00Z',
  reservation_expiry_hours integer null,          -- NULL = expiration désactivée (défaut)
  updated_at timestamptz not null default now()
);
insert into game_settings (id) values (true) on conflict do nothing;

-- ---------------------------------------------------------------- profils
create table profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  member member_id not null unique,
  email text not null unique,
  role app_role not null default 'player',
  mascot_id member_id not null,
  house_id text,                                   -- NULL pour Trystan
  key_id key_id,                                   -- NULL pour Trystan
  game_id game_id,                                 -- NULL pour Trystan
  invitation_code text not null unique,
  email_verified boolean not null default false,
  created_at timestamptz not null default now(),
  constraint player_has_house check (
    (role = 'player' and house_id is not null and key_id is not null and game_id is not null)
    or (role = 'admin' and house_id is null and key_id is null and game_id is null)
  ),
  constraint mascot_matches_member check (mascot_id = member)
);

-- Une invitation ne peut servir qu'une fois : le code est consommé à l'inscription.
create table invitations (
  code text primary key,
  member member_id not null,
  email text not null,
  consumed_by uuid references auth.users (id),
  consumed_at timestamptz
);

-- Catalogue de design (facultatif : le code reste la source de vérité des mascottes)
create table mascots (
  id member_id primary key,
  display_name text not null,
  design_version integer not null default 1,
  palette jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- progression
create table player_progress (
  user_id uuid primary key references profiles (user_id) on delete cascade,
  chest_opened boolean not null default false,
  updated_at timestamptz not null default now()
);

create table player_keys (
  user_id uuid not null references profiles (user_id) on delete cascade,
  key_id key_id not null,
  acquired_at timestamptz,
  deposited_at timestamptz,
  primary key (user_id, key_id),
  -- une clé déposée est forcément acquise
  constraint deposited_requires_acquired check (deposited_at is null or acquired_at is not null)
);

-- journal d'attribution : garantit l'unicité d'une clé par maison et par joueur
create table key_awards (
  id bigserial primary key,
  user_id uuid not null references profiles (user_id) on delete cascade,
  game_id game_id not null,
  awarded_at timestamptz not null default now(),
  unique (user_id, game_id)
);

-- ---------------------------------------------------------------- listes
create table wishlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references profiles (user_id) on delete cascade,
  title text not null,
  position integer not null,          -- ordre stable : Trystan 1, Maman 2, Papa 3, Juju 4, Chacha 5
  created_at timestamptz not null default now(),
  unique (position)
);

create table gifts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (user_id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 160),
  description text not null default '',
  image_path text,                    -- chemin dans un bucket privé, jamais une URL publique devinable
  priority smallint not null default 2 check (priority between 1 and 3),
  price_hint text,
  shop_url text check (shop_url is null or shop_url ~* '^https://'),
  deleted_at timestamptz,             -- suppression logique : la ligne reste pour l'historique
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gifts_owner_idx on gifts (owner_id) where deleted_at is null;

-- ---------------------------------------------------------------- réservations
create table reservations (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null references gifts (id) on delete restrict,
  reserved_by uuid not null references profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  active boolean generated always as (cancelled_at is null) stored
);

-- Cœur de la garantie « deux clics simultanés » : un seul enregistrement actif par cadeau.
create unique index reservations_one_active_per_gift
  on reservations (gift_id) where cancelled_at is null;
create index reservations_by_idx on reservations (reserved_by) where cancelled_at is null;

create table reservation_events (
  id bigserial primary key,
  gift_id uuid not null,
  actor_id uuid,
  event_type text not null check (event_type in ('created', 'cancelled', 'blocked-duplicate', 'admin-correction')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- helpers
create or replace function is_revealed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- l'heure de référence est TOUJOURS celle du serveur
  select now() >= (select reveal_at from game_settings where id)
$$;

create or replace function current_profile()
returns profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from profiles where user_id = auth.uid()
$$;

create or replace function can_access_lists(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles p
    where p.user_id = p_user
      and (
        p.role = 'admin'
        or exists (select 1 from player_progress pp where pp.user_id = p.user_id and pp.chest_opened)
      )
  )
$$;

-- ---------------------------------------------------------------- RLS
alter table profiles          enable row level security;
alter table player_progress   enable row level security;
alter table player_keys       enable row level security;
alter table key_awards        enable row level security;
alter table wishlists         enable row level security;
alter table gifts             enable row level security;
alter table reservations      enable row level security;
alter table reservation_events enable row level security;
alter table game_settings     enable row level security;

-- Profils : chacun voit son profil ; tout membre dont le coffre est ouvert (ou admin)
-- voit les profils des cinq membres (nécessaire pour afficher les cartes de listes).
create policy profiles_self on profiles
  for select using (user_id = auth.uid() or can_access_lists(auth.uid()));

create policy profiles_update_self on profiles
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid() and role = (select role from profiles where user_id = auth.uid()));

-- Progression : lecture de la sienne ; l'admin peut tout lire, jamais écrire sans RPC.
create policy progress_self on player_progress
  for select using (user_id = auth.uid() or current_profile().role = 'admin');

create policy keys_self on player_keys
  for select using (user_id = auth.uid() or current_profile().role = 'admin');

-- Listes et cadeaux : visibles seulement si les listes sont ouvertes pour l'appelant.
create policy wishlists_read on wishlists
  for select using (can_access_lists(auth.uid()));

create policy gifts_read on gifts
  for select using (can_access_lists(auth.uid()) and deleted_at is null);

-- Écriture des cadeaux : uniquement le propriétaire, uniquement sa liste.
create policy gifts_write on gifts
  for insert with check (owner_id = auth.uid());
create policy gifts_update on gifts
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy gifts_delete on gifts
  for delete using (false);            -- suppression logique uniquement, jamais de DELETE

-- Réservations : AUCUNE lecture directe par le propriétaire du cadeau.
-- La lecture passe exclusivement par la fonction list_gifts() ci-dessous.
create policy reservations_read_by_reserver on reservations
  for select using (reserved_by = auth.uid());

create policy events_admin_only on reservation_events
  for select using (current_profile().role = 'admin');

-- ---------------------------------------------------------------- RPC : listes
-- Renvoie les cadeaux d'une liste avec un JSON DONT LA FORME DÉPEND DE L'APPELANT
-- et de l'heure serveur. Le propriétaire avant révélation ne reçoit AUCUNE clé
-- « reservation » : impossible de la divulguer par erreur côté client.
create or replace function list_gifts(p_owner uuid)
returns table (
  gift_id uuid,
  title text,
  description text,
  image_path text,
  priority smallint,
  price_hint text,
  shop_url text,
  updated_at timestamptz,
  reservation jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_caller profiles := current_profile();
  v_is_owner boolean := (p_owner = v_caller.user_id);
  v_revealed boolean := is_revealed();
begin
  if v_caller.user_id is null or not can_access_lists(v_caller.user_id) then
    raise exception 'LISTES_NON_DEBLOQUEES' using errcode = 'P0001';
  end if;

  return query
  select
    g.id,
    g.title,
    g.description,
    g.image_path,
    g.priority,
    g.price_hint,
    g.shop_url,
    g.updated_at,
    case
      -- propriétaire avant Noël : aucun champ de réservation, même vide
      when v_is_owner and not v_revealed then null::jsonb
      else (
        select jsonb_build_object(
          'reservationId', r.id,
          'reservedByMember', p.member,
          'reservedById', r.reserved_by,
          'createdAt', r.created_at,
          'mine', r.reserved_by = v_caller.user_id
        )
        from reservations r
        join profiles p on p.user_id = r.reserved_by
        where r.gift_id = g.id and r.cancelled_at is null
      )
    end as reservation
  from gifts g
  where g.owner_id = p_owner and g.deleted_at is null
  order by g.priority desc, g.created_at asc;
end $$;

-- ---------------------------------------------------------------- RPC : réservation
create or replace function reserve_gift(p_gift uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller profiles := current_profile();
  v_owner uuid;
  v_reservation uuid;
begin
  if v_caller.user_id is null or not can_access_lists(v_caller.user_id) then
    raise exception 'NON_AUTORISE' using errcode = '42501';
  end if;

  select owner_id into v_owner from gifts where id = p_gift and deleted_at is null;
  if v_owner is null then
    raise exception 'CADEAU_INTROUVABLE' using errcode = 'P0002';
  end if;
  if v_owner = v_caller.user_id then
    raise exception 'PROPRE_LISTE' using errcode = 'P0001';
  end if;

  begin
    insert into reservations (gift_id, reserved_by) values (p_gift, v_caller.user_id)
    returning id into v_reservation;
  exception when unique_violation then
    insert into reservation_events (gift_id, actor_id, event_type)
      values (p_gift, v_caller.user_id, 'blocked-duplicate');
    raise exception 'DEJA_RESERVE' using errcode = 'P0001';
  end;

  insert into reservation_events (gift_id, actor_id, event_type)
    values (p_gift, v_caller.user_id, 'created');

  return jsonb_build_object('reservationId', v_reservation);
end $$;

create or replace function cancel_reservation(p_gift uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller profiles := current_profile();
  v_rows integer;
begin
  update reservations
     set cancelled_at = now()
   where gift_id = p_gift
     and cancelled_at is null
     and reserved_by = v_caller.user_id;   -- jamais la réservation d'un autre

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'AUCUNE_RESERVATION_A_ANNULER' using errcode = 'P0001';
  end if;

  insert into reservation_events (gift_id, actor_id, event_type)
    values (p_gift, v_caller.user_id, 'cancelled');

  return jsonb_build_object('cancelled', true);
end $$;

-- ---------------------------------------------------------------- RPC : progression
create or replace function award_key(p_game game_id)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller profiles := current_profile();
  v_key key_id;
  v_new boolean := false;
begin
  if v_caller.game_id is distinct from p_game or v_caller.key_id is null then
    raise exception 'MINI_JEU_NON_ASSOCIE' using errcode = '42501';
  end if;

  v_key := v_caller.key_id;

  insert into key_awards (user_id, game_id) values (v_caller.user_id, p_game)
  on conflict (user_id, game_id) do nothing;
  get diagnostics v_new = row_count;

  insert into player_keys (user_id, key_id, acquired_at)
    values (v_caller.user_id, v_key, now())
  on conflict (user_id, key_id) do update
    set acquired_at = coalesce(player_keys.acquired_at, now());

  return jsonb_build_object('newKey', v_new > 0, 'keyId', v_key);
end $$;

create or replace function deposit_key(p_key key_id)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller profiles := current_profile();
  v_deposited integer;
  v_opened boolean;
begin
  update player_keys
     set deposited_at = coalesce(deposited_at, now())
   where user_id = v_caller.user_id
     and key_id = p_key
     and acquired_at is not null;

  if not found then
    raise exception 'CLE_NON_GAGNEE' using errcode = 'P0001';
  end if;

  select count(*) into v_deposited
    from player_keys where user_id = v_caller.user_id and deposited_at is not null;

  v_opened := v_deposited >= 4;

  insert into player_progress (user_id, chest_opened)
    values (v_caller.user_id, v_opened)
  on conflict (user_id) do update set chest_opened = player_progress.chest_opened or v_opened;

  return jsonb_build_object(
    'deposited', v_deposited,
    'total', 4,
    'chestOpened', v_opened
  );
end $$;

-- Correction administrative : ne crée AUCUNE victoire de mini-jeu (pas de key_awards).
create or replace function admin_set_key(p_user uuid, p_key key_id, p_acquired boolean, p_deposited boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select role from profiles where user_id = auth.uid()) <> 'admin' then
    raise exception 'ADMIN_REQUIS' using errcode = '42501';
  end if;

  insert into player_keys (user_id, key_id, acquired_at, deposited_at)
    values (p_user, p_key, case when p_acquired then now() end,
            case when p_acquired and p_deposited then now() end)
  on conflict (user_id, key_id) do update
    set acquired_at = case when p_acquired then coalesce(player_keys.acquired_at, now()) end,
        deposited_at = case when p_acquired and p_deposited
                            then coalesce(player_keys.deposited_at, now()) end;

  insert into reservation_events (gift_id, actor_id, event_type, payload)
    values (gen_random_uuid(), auth.uid(), 'admin-correction',
            jsonb_build_object('user', p_user, 'key', p_key, 'acquired', p_acquired, 'deposited', p_deposited));
end $$;

-- ---------------------------------------------------------------- temps réel
-- Les abonnements diffusent uniquement les changements de cadeaux (titre, description…).
-- La colonne `reservation` n'est JAMAIS publiée : le client la demande à list_gifts()
-- à chaque ouverture / reprise, ce qui garantit la re-vérification de l'heure serveur.
alter publication supabase_realtime add table gifts;
-- (ne pas publier `reservations` : aucune fuite possible vers le propriétaire)
