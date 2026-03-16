# OpenClaw Setup For Pinpoint

This project now includes:

- a live Pinpoint skill in `skills/pinpoint-web-ops`
- a bootstrap script to sync that skill into the real OpenClaw workspace
- webhook-ready lead routing for website leads, CRM, Airtable, LINE OA, and OpenClaw

## 1. Current local status

OpenClaw is onboarded locally with:

- config file: `C:\Users\Admin\.openclaw\openclaw.json`
- workspace: `C:\Users\Admin\.openclaw\workspace`
- gateway port: `18789`

## 2. Sync the Pinpoint skill into OpenClaw

Run:

```powershell
node tools/openclaw/bootstrap-pinpoint.mjs
```

What it does:

- copies `skills/pinpoint-web-ops` into `~/.openclaw/workspace/skills/pinpoint-web-ops`
- keeps the OpenClaw workspace pointed at `~/.openclaw/workspace`
- trusts the `line` plugin
- leaves LINE disabled until real credentials are filled in

After filling env values, apply them into OpenClaw with:

```powershell
node tools/openclaw/configure-pinpoint.mjs
```

This script:

- reads `.env.local.txt` or `.env.local`
- writes `channels.line` credentials into the OpenClaw config when present
- keeps LINE disabled unless `OPENCLAW_ENABLE_LINE=true`
- preserves the Pinpoint workspace and plugin allow list

## 3. Environment variables to prepare

Copy `.env.example` into `.env.local` or `.env.local.txt` and fill the keys you actually use.

To check readiness quickly:

```powershell
node scripts/check-integrations.mjs
```

Recommended minimum for lead flow:

- `RESEND_API_KEY`
- `LEAD_FROM_EMAIL`
- `LEAD_TO_EMAIL`
- `CRM_WEBHOOK_URL`
- `OPENCLAW_WEBHOOK_URL`

For LINE OA:

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `LINE_TARGET_ID`
- `LINE_AUTO_REPLY_TEXT`

For Airtable CRM:

- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_TABLE_NAME`

## 4. Endpoints now available

Website lead form:

- `POST /api/lead`

What it now does:

- validates the lead
- scores the lead
- tags language / urgency / priority
- sends email
- sends LINE notification
- forwards to CRM webhook
- forwards to Airtable if configured
- forwards to OpenClaw webhook if configured
- sends GA4 + Meta conversion events

LINE OA inbound webhook:

- `POST /api/line-webhook`

What it now does:

- validates LINE signature if `LINE_CHANNEL_SECRET` is present
- normalizes inbound LINE events
- creates a CRM/OpenClaw intake payload
- forwards into CRM/Airtable/OpenClaw
- optionally auto-replies through LINE Messaging API

## 5. LINE OA settings

In LINE Developers:

- Webhook URL:

```text
https://pinpointaccountingservice.com/api/line-webhook
```

- Enable webhook: `ON`

If you want OpenClaw itself to be the LINE responder later, keep this current Vercel webhook as the intake layer first, then route the payload onward to OpenClaw using `OPENCLAW_WEBHOOK_URL`.

## 6. CRM options supported now

### Option A: Generic CRM webhook

Use `CRM_WEBHOOK_URL` for:

- Make
- Zapier
- n8n
- HubSpot custom webhook
- Google Sheets Apps Script webhook

### Option B: Airtable direct

Set:

- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_TABLE_NAME`

The API will create a lead record directly.

## 7. Recommended OpenClaw routing

Use `OPENCLAW_WEBHOOK_URL` for a Pinpoint intake route that receives:

- source
- lead or LINE event data
- language
- urgency
- lead score
- priority
- client metadata

Suggested handling inside OpenClaw:

1. `hot` -> notify human immediately
2. `warm` -> ask follow-up questions / request documents
3. `cold` -> send educational follow-up and queue nurture

## 8. Blog and SEO assets

The blog generator writes:

- `/blog`
- `/blog/<slug>`
- `/sitemap.xml`

Next SEO iteration should keep improving:

- `feed.xml`
- article schema depth
- FAQ schema
- internal links between services and blog articles

## 9. Safe rollout order

1. fill env vars
2. test `/api/lead`
3. test `/api/line-webhook`
4. connect CRM webhook
5. connect OpenClaw webhook
6. enable LINE flow in production
