-- Core extensions
create extension if not exists pgcrypto;

-- Generic updated_at trigger helper
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Access scopes for temporary access codes
create type public.access_scope as enum ('main', 'admin');

-- Site-wide settings (singleton-style key/value)
create table public.app_settings (
  key text primary key,
  value_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Temporary generated access codes
create table public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  scope public.access_scope not null default 'main',
  expires_at timestamptz not null,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_access_codes_scope_expires_at
  on public.access_codes (scope, expires_at)
  where revoked = false;

-- Link pattern definitions editable by admin
create table public.asset_link_patterns (
  id uuid primary key default gen_random_uuid(),
  region text not null,
  event_type text not null,
  label text not null,
  pattern text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_asset_link_patterns_region_event
  on public.asset_link_patterns (region, event_type, sort_order);

-- SG template words that can be managed from admin
create table public.sg_template_words (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  template_word text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_type, template_word)
);

-- RLS: deny by default for direct client access
alter table public.app_settings enable row level security;
alter table public.access_codes enable row level security;
alter table public.asset_link_patterns enable row level security;
alter table public.sg_template_words enable row level security;

-- Keep timestamps fresh
create trigger trg_app_settings_updated_at
before update on public.app_settings
for each row execute function public.update_updated_at_column();

create trigger trg_access_codes_updated_at
before update on public.access_codes
for each row execute function public.update_updated_at_column();

create trigger trg_asset_link_patterns_updated_at
before update on public.asset_link_patterns
for each row execute function public.update_updated_at_column();

create trigger trg_sg_template_words_updated_at
before update on public.sg_template_words
for each row execute function public.update_updated_at_column();

-- Default access settings with requested base passwords
insert into public.app_settings (key, value_json)
values
  ('main_access', jsonb_build_object('password', 'lofat')),
  ('admin_access', jsonb_build_object('password', 'lofaf'))
on conflict (key) do update
set value_json = excluded.value_json,
    updated_at = now();

-- Seed SG patterns
insert into public.asset_link_patterns (region, event_type, label, pattern, sort_order)
values
  ('SG', 'TW', 'Tab', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/(Template)_TW(Number)_(Word)_Tab_SG_en.jpg', 10),
  ('SG', 'TW', 'LobbyBG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/(Template)_TW(Number)_(Word)_LobbyBG_SG_en.jpg', 20),
  ('SG', 'TW', 'Title', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/(Template)_TW(Number)_(Word)_Title_SG_en.png', 30),
  ('SG', 'TW', 'WheelBG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/(Template)_TW(Number)_(Word)_WheelBG_SG_en.png', 40),

  ('SG', 'FW', 'Tab', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/(Template)_FW(Number)_(Word)_Tab_SG_en.jpg', 50),
  ('SG', 'FW', 'LobbyBG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/(Template)_FW(Number)_(Word)_LobbyBG_SG_en.jpg', 60),
  ('SG', 'FW', 'BG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/(Template)_FW(Number)_(Word)_BG_SG_en.jpg', 70),
  ('SG', 'FW', 'Title', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/(Template)_FW(Number)_(Word)_Title_SG_en.png', 80),

  ('SG', 'DW', 'Tab', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/(Template)_DW(Number)_(Word)_Tab_SG_en.jpg', 90),
  ('SG', 'DW', 'LobbyBG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/(Template)_DW(Number)_(Word)_LobbyBG_SG_en.jpg', 100),
  ('SG', 'DW', 'Title', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/(Template)_DW(Number)_(Word)_Title_SG_en.png', 110),
  ('SG', 'DW', 'DoubleWheelBG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/(Template)_DW(Number)_(Word)_DoubleWheelBG_SG_en.png', 120),

  ('SG', 'O', 'Tab', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/(Template)_O(Number)_(Word)_Tab_SG_en.jpg', 130),
  ('SG', 'O', 'Poster', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/(Template)_O(Number)_(Word)_Poster_SG_en.png', 140),
  ('SG', 'O', 'BG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/(Template)_FW(Number)_(Word)_BG_SG_en.jpg', 150),
  ('SG', 'O', 'LobbyBG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/(Template)_FW(Number)_(Word)_LobbyBG_SG_en.jpg', 160),

  ('SG', 'MS', 'MSTab', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/(Template)_MS(Number)_(Word)_Tab_SG_en.jpg', 170),
  ('SG', 'MS', 'MocoTab', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/(Template)_Moco(Number)_(Word)_Tab_SG_en.jpg', 180),

  ('SG', 'STORE', 'Banner256', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/(Word)-256x107_en.png', 190),
  ('SG', 'STORE', 'Banner256IND', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/(Word)-256x107IND_en.png', 200),
  ('SG', 'STORE', 'Square252', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/252x256_(Word)_(Template)_en.jpg', 210),
  ('SG', 'STORE', 'Wide1500', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/1500x750_(Word)_(Template)_en.jpg', 220),

  -- NA patterns
  ('NA', 'TW', 'Tab', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/TW(Number)_(Word)_OKE48_Tab_NA_en.jpg', 230),
  ('NA', 'TW', 'LobbyBG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/TW(Number)_(Word)_OKE48_LobbyBG_NA_en.jpg', 240),
  ('NA', 'TW', 'Title', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/TW(Number)_(Word)_OKE48_Title_NA_en.png', 250),
  ('NA', 'TW', 'WheelBG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/TW(Number)_(Word)_OKE48_WheelBG_NA_en.png', 260),

  ('NA', 'FW', 'Tab', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/FW(Number)_(Word)_OKE48_Tab_NA_en.jpg', 270),
  ('NA', 'FW', 'LobbyBG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/FW(Number)_(Word)_OKE48_LobbyBG_NA_en.jpg', 280),
  ('NA', 'FW', 'BG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/FW(Number)_(Word)_OKE48_BG_NA_en.jpg', 290),
  ('NA', 'FW', 'Title', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/FW(Number)_(Word)_OKE48_Title_NA_en.png', 300),

  ('NA', 'DW', 'Tab', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/DW(Number)_(Word)_OKE48_Tab_NA_en.jpg', 310),
  ('NA', 'DW', 'LobbyBG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/DW(Number)_(Word)_OKE48_LobbyBG_NA_en.jpg', 320),
  ('NA', 'DW', 'Title', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/DW(Number)_(Word)_OKE48_Title_NA_en.png', 330),
  ('NA', 'DW', 'DoubleWheelBG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/DW(Number)_(Word)_OKE48_DoubleWheelBG_NA_en.png', 340),

  ('NA', 'O', 'Tab', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/O(Number)_(Word)_OKE48_Tab_NA_en.jpg', 350),
  ('NA', 'O', 'BG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/O(Number)_(Word)_OKE48_BG_NA_en.jpg', 360),
  ('NA', 'O', 'LobbyBG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/O(Number)_(Word)_OKE48_LobbyBG_NA_en.jpg', 370),
  ('NA', 'O', 'Poster', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/O(Number)_(Word)_OKE48_Poster_NA_en.png', 380),

  ('NA', 'MS', 'MocoTab', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/Moco(Number)_(Word)_OKE48_Tab_NA_en.jpg', 390),
  ('NA', 'MS', 'MSTab', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/MS(Number)_(Word)_OKE48_Tab_NA_en.jpg', 400),

  ('NA', 'STORE', 'Square252', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/252x256_(Word)_OKE48_NA_en.jpg', 410),
  ('NA', 'STORE', 'Wide1500', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/1500x750_(Word)_OKE48_NA_en.jpg', 420),

  -- EU patterns
  ('EU', 'TW', 'Tab', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/TW(Number)_(Word)_OKE48_Tab_EU_en.jpg', 430),
  ('EU', 'TW', 'LobbyBG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/TW(Number)_(Word)_OKE48_LobbyBG_EU_en.jpg', 440),
  ('EU', 'TW', 'Title', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/TW(Number)_(Word)_OKE48_Title_EU_en.png', 450),
  ('EU', 'TW', 'WheelBG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/TW(Number)_(Word)_OKE48_WheelBG_EU_en.png', 460),

  ('EU', 'FW', 'Tab', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/FW(Number)_(Word)_OKE48_Tab_EU_en.jpg', 470),
  ('EU', 'FW', 'LobbyBG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/FW(Number)_(Word)_OKE48_LobbyBG_EU_en.jpg', 480),
  ('EU', 'FW', 'BG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/FW(Number)_(Word)_OKE48_BG_EU_en.jpg', 490),
  ('EU', 'FW', 'Title', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/FW(Number)_(Word)_OKE48_Title_EU_en.png', 500),

  ('EU', 'DW', 'Tab', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/DW(Number)_(Word)_OKE48_Tab_EU_en.jpg', 510),
  ('EU', 'DW', 'LobbyBG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/DW(Number)_(Word)_OKE48_LobbyBG_EU_en.jpg', 520),
  ('EU', 'DW', 'Title', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/DW(Number)_(Word)_OKE48_Title_EU_en.png', 530),
  ('EU', 'DW', 'DoubleWheelBG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/DW(Number)_(Word)_OKE48_DoubleWheelBG_EU_en.png', 540),

  ('EU', 'O', 'Tab', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/O(Number)_(Word)_OKE48_Tab_EU_en.jpg', 550),
  ('EU', 'O', 'BG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/O(Number)_(Word)_OKE48_BG_EU_en.jpg', 560),
  ('EU', 'O', 'LobbyBG', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/O(Number)_(Word)_OKE48_LobbyBG_EU_en.jpg', 570),
  ('EU', 'O', 'Poster', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/O(Number)_(Word)_OKE48_Poster_EU_en.png', 580),

  ('EU', 'MS', 'MocoTab', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/Moco(Number)_(Word)_OKE48_Tab_EU_en.jpg', 590),
  ('EU', 'MS', 'MSTab', 'https://dl.dir.freefiremobile.com/common/Local/IND/config/MS(Number)_(Word)_OKE48_Tab_EU_en.jpg', 600)
on conflict do nothing;

-- Seed starter SG template words
insert into public.sg_template_words (event_type, template_word)
values
  ('TW', 'Lucky'),
  ('FW', 'Fade'),
  ('DW', 'Double'),
  ('O', 'Royale'),
  ('MS', 'Moco')
on conflict do nothing;