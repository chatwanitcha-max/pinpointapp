create extension if not exists pgcrypto;

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  segment text,
  city text,
  website text,
  contact_phone text,
  contact_email text,
  contact_line text,
  contact_url text,
  source_url text,
  source_type text default 'public_website',
  fit_reason text,
  notes text,
  status text default 'new',
  public_contact boolean default true,
  created_at timestamptz default now()
);

create index if not exists prospects_company_name_idx on public.prospects (company_name);
create index if not exists prospects_status_idx on public.prospects (status);
create index if not exists prospects_created_at_idx on public.prospects (created_at desc);

alter table public.prospects enable row level security;
