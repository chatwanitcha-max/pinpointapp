# Credential Setup Guide

Use this file together with `D:\PINPOINT\WEBAPP\.env.local.txt`.

Do not send passwords in chat. Log in to each official service yourself, get the key or token, and paste it into the matching env field.

## Already prepared locally

- `LINE_OA_WEBHOOK_URL=https://pinpointaccountingservice.com/api/line-webhook`
- `OPENCLAW_WEBHOOK_TOKEN` generated
- `CRON_SECRET` generated
- `SUPABASE_TABLE_NAME=leads`
- `SUPABASE_SCHEMA=public`

## 1. Resend

Links:
- https://resend.com/api-keys
- https://resend.com/docs/dashboard/api-keys/introduction

Fill:
- `RESEND_API_KEY`
- `LEAD_FROM_EMAIL`
- `LEAD_TO_EMAIL`

Notes:
- `LEAD_FROM_EMAIL` must use a verified sending domain in Resend.
- `LEAD_TO_EMAIL` is the inbox that should receive leads.

## 2. LINE OA

Links:
- https://developers.line.biz/console/
- https://developers.line.biz/en/docs/messaging-api/getting-started/

Fill:
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `LINE_TARGET_ID`
- `LINE_AUTO_REPLY_TEXT`

Notes:
- In LINE Developers, set the webhook URL to:
  `https://pinpointaccountingservice.com/api/line-webhook`

## 3. CRM

Choose one route.

### Option A: Generic CRM webhook

Fill:
- `CRM_WEBHOOK_URL`
- `CRM_WEBHOOK_TOKEN`

### Option B: Supabase

Links:
- https://supabase.com/dashboard/projects
- https://supabase.com/docs/guides/database/tables
- https://supabase.com/docs/guides/api/api-keys

Fill:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_TABLE_NAME`
- `SUPABASE_SCHEMA`

Notes:
- Run the SQL in `D:\PINPOINT\WEBAPP\operations\supabase-leads-schema.sql`
- `SUPABASE_TABLE_NAME` is already set to `leads`
- `SUPABASE_SCHEMA` is already set to `public`
- Use the `service_role` key only on the server, never in the browser

## 4. OpenClaw

Fill:
- `OPENCLAW_WEBHOOK_URL`
- `OPENCLAW_WEBHOOK_TOKEN`

Notes:
- `OPENCLAW_WEBHOOK_TOKEN` is already generated locally.
- `OPENCLAW_WEBHOOK_URL` is the public endpoint where OpenClaw should receive lead jobs.
- If OpenClaw will not receive LINE directly yet, leave `OPENCLAW_ENABLE_LINE=false`.

## 5. GA4

Links:
- https://analytics.google.com/analytics/web/
- https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events
- https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/properties.dataStreams.measurementProtocolSecrets

Fill:
- `GA4_MEASUREMENT_ID`
- `GA4_API_SECRET`
- `GOOGLE_ADS_ID`
- `GOOGLE_ADS_LEAD_LABEL`

Notes:
- `GA4_MEASUREMENT_ID` looks like `G-XXXXXXXXXX`.
- `GOOGLE_ADS_ID` looks like `AW-XXXXXXXXX`.
- `GOOGLE_ADS_LEAD_LABEL` is the lead conversion label from Google Ads.

## 6. Meta Pixel

Links:
- https://business.facebook.com/events_manager2/
- https://www.facebook.com/business/help/AboutConversionsAPI
- https://www.facebook.com/help/messenger-app/952192354843755/

Fill:
- `META_PIXEL_ID`
- `META_ACCESS_TOKEN`

Notes:
- These are used for Meta Pixel and Conversions API tracking.

## What to do after pasting the values

1. Save `D:\PINPOINT\WEBAPP\.env.local.txt`
2. Tell Codex: `credentials-filled`
3. Codex will:
- verify the env file
- push the values into Vercel where needed
- test email, lead routing, LINE, CRM, and analytics wiring

