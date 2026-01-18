-- Tennis Evaluations (MVP) - Supabase SQL Setup
-- Copy/paste this whole file into Supabase -> SQL Editor -> New query -> RUN

-- 0) Extensions
create extension if not exists pgcrypto;

-- 1) Tables
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  venmo_handle text,
  created_at timestamptz not null default now()
);

create table if not exists public.users_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  role text not null check (role in ('coach','player')),
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  level text,
  dominant_hand text not null check (dominant_hand in ('right','left')),
  notes text,
  player_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  coach_user_id uuid not null references auth.users(id) on delete restrict,
  coach_mode text not null check (coach_mode in ('on_court','off_court')),
  play_format text not null check (play_format in ('practice','singles','doubles')),
  date date not null,
  location_name text,
  opponent_name text,
  status text not null default 'draft' check (status in ('draft','sent')),
  share_team_with_players boolean not null default true,
  created_at timestamptz not null default now(),
  constraint off_court_no_practice check (not (coach_mode='off_court' and play_format='practice'))
);

create table if not exists public.session_participants (
  session_id uuid not null references public.sessions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  participant_role text not null check (participant_role in ('single','doubles_a','doubles_b','practice_participant')),
  primary key (session_id, player_id)
);

create table if not exists public.evaluation_items (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  category text not null check (category in ('stroke','concept','positioning','intensity')),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.session_focus_items (
  session_id uuid not null references public.sessions(id) on delete cascade,
  evaluation_item_id uuid not null references public.evaluation_items(id) on delete cascade,
  primary key (session_id, evaluation_item_id)
);

create table if not exists public.feedback_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  scope text not null check (scope in ('team','individual')),
  player_id uuid references public.players(id) on delete cascade,
  evaluation_item_id uuid not null references public.evaluation_items(id) on delete restrict,
  rating int,
  comment text,
  created_at timestamptz not null default now(),
  constraint feedback_scope_player check (
    (scope='team' and player_id is null) or (scope='individual' and player_id is not null)
  )
);

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  scope text not null check (scope in ('team','individual')),
  player_id uuid references public.players(id) on delete cascade,
  strength_text text,
  priority_text text,
  drill_text text,
  created_at timestamptz not null default now(),
  constraint suggestions_scope_player check (
    (scope='team' and player_id is null) or (scope='individual' and player_id is not null)
  )
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  type text not null check (type in ('photo','video','link')),
  url text not null,
  caption text,
  created_at timestamptz not null default now()
);

create table if not exists public.billing (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  price numeric,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','requested','paid','comped')),
  payment_method_note text,
  created_at timestamptz not null default now()
);

-- 2) Helper views (optional but useful)
create or replace view public.player_sessions as
select s.*
from public.sessions s;

-- 3) Enable Row Level Security (RLS)
alter table public.clubs enable row level security;
alter table public.users_profile enable row level security;
alter table public.players enable row level security;
alter table public.sessions enable row level security;
alter table public.session_participants enable row level security;
alter table public.evaluation_items enable row level security;
alter table public.session_focus_items enable row level security;
alter table public.feedback_entries enable row level security;
alter table public.suggestions enable row level security;
alter table public.attachments enable row level security;
alter table public.billing enable row level security;

-- 4) Policies
-- users_profile: user can read their own profile
create policy if not exists "users_profile_select_own"
on public.users_profile for select
to authenticated
using (user_id = auth.uid());

-- clubs: user can read their own club (via users_profile)
create policy if not exists "clubs_select_own"
on public.clubs for select
to authenticated
using (id in (select club_id from public.users_profile where user_id = auth.uid()));

-- clubs: coaches can update their club (logo/venmo) in MVP
create policy if not exists "clubs_update_coach"
on public.clubs for update
to authenticated
using (
  id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
);

-- players: coach can CRUD players in their club
create policy if not exists "players_select_coach"
on public.players for select
to authenticated
using (
  club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
);

create policy if not exists "players_insert_coach"
on public.players for insert
to authenticated
with check (
  club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
);

create policy if not exists "players_update_coach"
on public.players for update
to authenticated
using (
  club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
)
with check (
  club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
);

create policy if not exists "players_delete_coach"
on public.players for delete
to authenticated
using (
  club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
);

-- players: player can read their own player profile row
create policy if not exists "players_select_player_self"
on public.players for select
to authenticated
using (player_user_id = auth.uid());

-- sessions: coach can CRUD sessions in their club
create policy if not exists "sessions_select_coach"
on public.sessions for select
to authenticated
using (
  club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
);

create policy if not exists "sessions_insert_coach"
on public.sessions for insert
to authenticated
with check (
  club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  and coach_user_id = auth.uid()
);

create policy if not exists "sessions_update_coach"
on public.sessions for update
to authenticated
using (
  club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
)
with check (
  club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
);

create policy if not exists "sessions_delete_coach"
on public.sessions for delete
to authenticated
using (
  club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
);

-- sessions: player can read sessions they participate in
create policy if not exists "sessions_select_player_participant"
on public.sessions for select
to authenticated
using (
  exists (
    select 1
    from public.session_participants sp
    join public.players p on p.id = sp.player_id
    where sp.session_id = sessions.id
      and p.player_user_id = auth.uid()
  )
);

-- session_participants: coach can CRUD within their club
create policy if not exists "session_participants_select_coach"
on public.session_participants for select
to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = session_participants.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  )
);

create policy if not exists "session_participants_insert_coach"
on public.session_participants for insert
to authenticated
with check (
  exists (
    select 1 from public.sessions s
    where s.id = session_participants.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  )
);

create policy if not exists "session_participants_update_coach"
on public.session_participants for update
to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = session_participants.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  )
)
with check (
  exists (
    select 1 from public.sessions s
    where s.id = session_participants.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  )
);

create policy if not exists "session_participants_delete_coach"
on public.session_participants for delete
to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = session_participants.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  )
);

-- evaluation_items: coach can CRUD in their club; players can read (to display labels)
create policy if not exists "evaluation_items_select_club"
on public.evaluation_items for select
to authenticated
using (
  club_id in (select club_id from public.users_profile where user_id = auth.uid())
);

create policy if not exists "evaluation_items_insert_coach"
on public.evaluation_items for insert
to authenticated
with check (
  club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
);

create policy if not exists "evaluation_items_update_coach"
on public.evaluation_items for update
to authenticated
using (
  club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
)
with check (
  club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
);

create policy if not exists "evaluation_items_delete_coach"
on public.evaluation_items for delete
to authenticated
using (
  club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
);

-- session_focus_items: coach can CRUD for their club sessions; players can read for their sessions
create policy if not exists "session_focus_items_select_club"
on public.session_focus_items for select
to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = session_focus_items.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid())
  )
);

create policy if not exists "session_focus_items_insert_coach"
on public.session_focus_items for insert
to authenticated
with check (
  exists (
    select 1 from public.sessions s
    where s.id = session_focus_items.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  )
);

create policy if not exists "session_focus_items_delete_coach"
on public.session_focus_items for delete
to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = session_focus_items.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  )
);

-- feedback_entries: coach full access in club
create policy if not exists "feedback_select_coach"
on public.feedback_entries for select
to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = feedback_entries.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  )
);

create policy if not exists "feedback_insert_coach"
on public.feedback_entries for insert
to authenticated
with check (
  exists (
    select 1 from public.sessions s
    where s.id = feedback_entries.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  )
);

create policy if not exists "feedback_update_coach"
on public.feedback_entries for update
to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = feedback_entries.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  )
)
with check (
  exists (
    select 1 from public.sessions s
    where s.id = feedback_entries.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  )
);

create policy if not exists "feedback_delete_coach"
on public.feedback_entries for delete
to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = feedback_entries.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  )
);

-- feedback_entries: player read access (team shared + their own individual)
create policy if not exists "feedback_select_player"
on public.feedback_entries for select
to authenticated
using (
  exists (
    select 1
    from public.session_participants sp
    join public.players p on p.id = sp.player_id
    join public.sessions s on s.id = sp.session_id
    where sp.session_id = feedback_entries.session_id
      and p.player_user_id = auth.uid()
      and (
        (feedback_entries.scope = 'team' and s.share_team_with_players = true)
        or
        (feedback_entries.scope = 'individual' and feedback_entries.player_id = p.id)
      )
  )
);

-- suggestions: coach full access
create policy if not exists "suggestions_select_coach"
on public.suggestions for select
to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = suggestions.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  )
);

create policy if not exists "suggestions_write_coach"
on public.suggestions for all
to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = suggestions.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  )
)
with check (
  exists (
    select 1 from public.sessions s
    where s.id = suggestions.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  )
);

-- suggestions: player read access (team shared + their own individual)
create policy if not exists "suggestions_select_player"
on public.suggestions for select
to authenticated
using (
  exists (
    select 1
    from public.session_participants sp
    join public.players p on p.id = sp.player_id
    join public.sessions s on s.id = sp.session_id
    where sp.session_id = suggestions.session_id
      and p.player_user_id = auth.uid()
      and (
        (suggestions.scope = 'team' and s.share_team_with_players = true)
        or
        (suggestions.scope = 'individual' and suggestions.player_id = p.id)
      )
  )
);

-- attachments: coach full access
create policy if not exists "attachments_select_coach"
on public.attachments for select
to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = attachments.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  )
);

create policy if not exists "attachments_write_coach"
on public.attachments for all
to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = attachments.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  )
)
with check (
  exists (
    select 1 from public.sessions s
    where s.id = attachments.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  )
);

-- attachments: player read access (team/shared = player_id null, or their own individual)
create policy if not exists "attachments_select_player"
on public.attachments for select
to authenticated
using (
  exists (
    select 1
    from public.session_participants sp
    join public.players p on p.id = sp.player_id
    join public.sessions s on s.id = sp.session_id
    where sp.session_id = attachments.session_id
      and p.player_user_id = auth.uid()
      and (
        (attachments.player_id is null and s.share_team_with_players = true)
        or
        (attachments.player_id = p.id)
      )
  )
);

-- billing: coach only
create policy if not exists "billing_coach_all"
on public.billing for all
to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = billing.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  )
)
with check (
  exists (
    select 1 from public.sessions s
    where s.id = billing.session_id
      and s.club_id in (select club_id from public.users_profile where user_id = auth.uid() and role='coach')
  )
);

-- Done.
