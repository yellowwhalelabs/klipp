-- funded_wallets: one row per embedded wallet the invisible faucet has topped
-- up (see apps/web/app/api/fund-wallet/route.ts). The PRIMARY KEY on `address`
-- enforces one-funding-per-address: a repeat insert raises unique_violation
-- (SQLSTATE 23505), which the route treats as an idempotent "already funded".
create table if not exists public.funded_wallets (
  address   text        primary key,            -- lowercased 0x address
  funded_at timestamptz not null default now()
);

-- The faucet route talks to this table with the service-role key (bypasses RLS).
-- Enable RLS with NO policies so it is never readable/writable via the anon key.
alter table public.funded_wallets enable row level security;
