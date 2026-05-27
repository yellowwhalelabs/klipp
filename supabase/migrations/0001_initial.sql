-- ============================================================
-- KLIPP — Initial schema migration
-- ============================================================

-- Users — links Privy/embedded wallet address to profile
create table public.profiles (
  id              uuid primary key default gen_random_uuid(),
  wallet_address  text unique not null,
  auth_method     text,                          -- 'email' | 'google' | 'apple' | 'passkey'
  auth_identifier text,                          -- email address or social handle
  display_name    text,
  bio             text,
  avatar_url      text,
  privy_user_id   text unique,                   -- Privy canonical user ID
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_profiles_wallet    on public.profiles(wallet_address);
create index idx_profiles_privy_uid on public.profiles(privy_user_id);

-- KLIPP Cards (Layer 1) — mirror of on-chain soulbound NFT state
create table public.klipp_cards (
  id               bigserial primary key,
  owner_address    text not null,
  token_id         bigint,
  chain_id         int not null,
  contract_address text not null,
  metadata_uri     text,
  tx_hash          text,
  created_at       timestamptz default now(),
  unique (chain_id, contract_address, owner_address)
);

create index idx_cards_owner on public.klipp_cards(owner_address);

-- Pro card claims (Layer 2)
create table public.pro_claims (
  id              bigserial primary key,
  card_id         bigint references public.klipp_cards on delete cascade,
  claim_type      text not null,                  -- 'employment' | 'education' | 'certification'
  claim_data      jsonb not null,
  issuer_address  text not null,
  issuer_signature text not null,
  on_chain_index  int,
  verified_at     timestamptz default now()
);

create index idx_pro_claims_card on public.pro_claims(card_id);

-- Equity cards (Layer 3) — cap table snapshot
create table public.equity_grants (
  id                      bigserial primary key,
  on_chain_grant_id       bigint unique,
  company_name            text not null,
  holder_address          text not null,
  equity_token_address    text not null,
  cap_table_address       text not null,
  chain_id                int not null,
  total_allocation        numeric(78,0) not null,
  vesting_start           timestamptz not null,
  vesting_cliff_seconds   bigint not null,
  vesting_duration_seconds bigint not null,
  active                  boolean default true,
  created_at              timestamptz default now()
);

create index idx_equity_holder on public.equity_grants(holder_address);

-- Card shares (tap-to-share QR)
create table public.card_shares (
  id              bigserial primary key,
  card_id         bigint references public.klipp_cards on delete cascade,
  shared_with_address text,
  shared_at       timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles      enable row level security;
alter table public.klipp_cards   enable row level security;
alter table public.pro_claims    enable row level security;
alter table public.equity_grants enable row level security;
alter table public.card_shares   enable row level security;

-- Public read — all cards are visible (social network effect)
create policy "Public read profiles"      on public.profiles      for select using (true);
create policy "Public read cards"         on public.klipp_cards   for select using (true);
create policy "Public read claims"        on public.pro_claims    for select using (true);
create policy "Public read equity"        on public.equity_grants for select using (true);
create policy "Public read shares"        on public.card_shares   for select using (true);

-- Service role handles all writes (edge functions use service_role key)
-- No direct client writes — all mutations go through Edge Functions that verify Privy JWT

-- ============================================================
-- Storage bucket
-- ============================================================

insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', true)
on conflict do nothing;

create policy "Public read card images"
  on storage.objects for select
  using (bucket_id = 'card-images');

create policy "Authenticated upload card images"
  on storage.objects for insert
  with check (bucket_id = 'card-images');
