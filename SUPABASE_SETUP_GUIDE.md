# Supabase Setup Guide

Use Supabase as the primary lead database for the Pinpoint web app.

## Official links

- Dashboard: https://supabase.com/dashboard/projects
- Table setup: https://supabase.com/docs/guides/database/tables
- API keys: https://supabase.com/docs/guides/api/api-keys

## What you need from Supabase

Paste these into `D:\PINPOINT\WEBAPP\.env.local.txt`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_TABLE_NAME=leads`
- `SUPABASE_SCHEMA=public`

## Fast setup

1. Create or open your Supabase project.
2. Open `SQL Editor`.
3. Run the SQL from:
   `D:\PINPOINT\WEBAPP\operations\supabase-leads-schema.sql`
4. Go to `Project Settings -> API`.
5. Copy:
   - Project URL -> `SUPABASE_URL`
   - service_role secret key -> `SUPABASE_SERVICE_ROLE_KEY`
6. Save the values into:
   `D:\PINPOINT\WEBAPP\.env.local.txt`

## Important

- Use the `service_role` key only on the server.
- Do not put the `service_role` key into frontend code.
- The app writes to `public.leads`.

## Table created by the SQL

The table stores:

- lead identity
- contact details
- requested service
- routing priority
- notes
- tracking metadata
- raw payload

## After you paste the values

Tell Codex:

`supabase-filled`

Then Codex will:

1. verify the env file
2. update Vercel env if needed
3. test lead routing into Supabase
4. deploy and verify the live app
