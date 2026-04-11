-- Visitor counter tables for pinpointaccountingservice.com
-- Run in Supabase SQL Editor (same project used by leads table).

create table if not exists public.visitor_stats (
  scope text primary key,
  total_views bigint not null default 0,
  unique_visitors bigint not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.visitor_sessions (
  scope text not null,
  visitor_id text not null,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  primary key (scope, visitor_id)
);

create index if not exists visitor_sessions_scope_idx
  on public.visitor_sessions (scope);
