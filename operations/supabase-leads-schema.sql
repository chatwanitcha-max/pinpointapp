create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  lead_id text unique not null,
  full_name text,
  phone text,
  email text,
  business text,
  service text,
  revenue text,
  preferred_contact text,
  language text,
  urgency text,
  priority text,
  lead_score integer default 0,
  source text,
  notes text,
  page_url text,
  received_at timestamptz default now(),
  routing jsonb default '{}'::jsonb,
  client_meta jsonb default '{}'::jsonb,
  line_event jsonb,
  raw_payload jsonb default '{}'::jsonb
);

create index if not exists leads_received_at_idx on public.leads (received_at desc);
create index if not exists leads_priority_idx on public.leads (priority);
create index if not exists leads_source_idx on public.leads (source);

alter table public.leads enable row level security;
