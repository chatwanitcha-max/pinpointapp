# Pinpoint x Blutenstein Umbrella Integration

Customer website:
- Customer: Pinpoint Accounting & Service, Ltd.
- Repo requested by owner: https://github.com/chatwanitcha-max/pinpointapp.git
- Local deploy snapshot inspected: /mnt/d/Pinpoint/_deploy_snapshot
- Local env source inspected without exposing secrets: /mnt/d/Pinpoint/.env.local.txt

## Current structure checked

Static website + Vercel serverless API:
- Frontend pages: index.html plus service/location/blog static routes.
- Core browser logic: app.js, tracking.js, styles.css.
- Lead intake endpoint: api/lead.js.
- LINE webhook/auto-reply endpoint: api/line-webhook.js.
- Website AI assistant endpoint: api/ai-chat.js.
- Intelligence modules: api/_lib/line-intelligence.js, neural-brain.js, knowledge-base.js, lead-routing.js, handoff-rules.js, human-escalation.js.
- Outbound channels: api/_lib/outbound.js, lead-routing.js.

## Blutenstein umbrella capabilities now active in this customer app

1. Lead scan / scoring
   - buildRouting() scores lead quality, language, urgency, service bucket, priority, SLA, primary/secondary agent, human approval requirement, and next action.

2. Full lead distribution
   - Website form posts to /api/lead.
   - /api/lead sends structured payloads to:
     - LINE webhook
     - LINE push to LINE_TARGET_ID / LINE_TARGET_IDS
     - CRM webhook
     - Supabase
     - Airtable
     - OpenClaw / AI ops webhook
     - Resend internal lead email
     - Optional customer acknowledgement email
     - GA4 and Meta conversion events

3. Advanced AI assistance
   - Website AI chat uses conversation memory, case playbooks, context slots, knowledge base search, answer audit, handoff rules, and optional OpenClaw/OpenAI/Kimi reply assist.
   - น้องพิณ is positioned as a sales-capable advisor: answer first, qualify the case, then always provide practical next steps with LINE OA, phone, lead form, relevant service page, and document/intake checklist guidance.
   - LINE OA endpoint supports auto-reply/handoff modes and human escalation alerts.

4. LINE OA full detail handoff improvement
   - /api/lead now sends LINE webhook payload with lead, routing, operations, clientMeta, and text summary instead of only { type, lead }.
   - LINE push text still sends the concise human-readable full lead summary. It now supports multiple operator targets via `LINE_TARGET_IDS` while preserving `LINE_TARGET_ID` for the primary owner.
   - /api/ai-chat now pushes an immediate LINE notification when a website chat visitor provides phone, LINE ID, or email. The alert includes Lead ID, name, phone, LINE ID, service need, customer message, page URL, latest AI reply, and team CTA details. Human escalation remains a separate alert path for urgent/high-risk conversations. It sends to `LINE_OA_WEBHOOK_URL` and also uses LINE Push when `LINE_TARGET_ID` or `LINE_TARGET_IDS` is configured.
   - `/api/line-webhook` supports temporary `LINE_TARGET_DISCOVERY_ENABLED=true`. After a real signed LINE event arrives, Vercel logs contain `LINE_TARGET_DISCOVERY` with the exact `userId`, `groupId`, or `roomId`; copy the desired value into `LINE_TARGET_ID` or `LINE_TARGET_IDS`, redeploy, then disable discovery.

5. High-quality Blutenstein lead scan
   - Daily local cron script `/root/.hermes/scripts/blutenstein_pinpoint_daily_lead_scan.py` now prefers real search APIs before zero-key fallback: `SERPAPI_API_KEY` / `SERP_API_KEY`, `BRAVE_SEARCH_API_KEY`, `TAVILY_API_KEY`, or `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_ID`.
   - Script loads optional secrets from `/root/.hermes/blutenstein_lead_scan.env` first and `/mnt/d/Pinpoint/.env.local.txt` second without printing values.
   - Delivered notes include provider, score, query, source title, excerpt, recommended action, and public-source compliance. If no trustworthy candidate is found, it sends a scan-status lead instead of inventing data.

## Performance hardening completed

Root cause found:
- Form submission waited on many external services sequentially/without timeouts: email, customer email, LINE webhook, LINE push, CRM, Supabase, Airtable, OpenClaw, GA4, and Meta.
- Browser startup also initialized AI chat and visitor counter immediately, plus duplicate mobile scroll visibility listeners.
- Static pages loaded all images eagerly and app/tracking scripts without defer attributes.

Changes made:
- api/lead.js: all outbound channels now run in parallel with bounded timeouts. Slow external channels no longer hang the whole lead response indefinitely.
- api/_lib/outbound.js and api/_lib/lead-routing.js: outbound fetches now use AbortController timeouts; LINE push supports fan-out to multiple owner/operator targets.
- api/line-webhook.js: OpenClaw smart reply, CRM, Supabase, Airtable, OpenClaw webhook, and LINE reply are bounded so slow integrations cannot stall LINE webhook responses.
- api/lead.js: LINE webhook gets complete Blutenstein-style operational details.
- app.js: AI chat and visitor counter initialize during browser idle time, not on the critical initial render path.
- app.js: removed duplicate mobile topbar auto-hide listener from init path.
- *.html: added defer to /tracking.js and /app.js on static pages.
- *.html: added decoding="async" to images and loading="lazy" to non-logo images.

## Environment keys present in local env file (values intentionally hidden)

GitHub/Vercel:
- Github_KEY, Github_CLI, Github_http
- VERCEL_TOKEN, 2ndVERCELTOKEN

Lead/LINE/CRM/AI:
- RESEND_API_KEY, LEAD_FROM_EMAIL, LEAD_TO_EMAIL
- LINE_OA_WEBHOOK_URL, LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET, LINE_CHANNEL_ID, LINE_TARGET_ID, LINE_TARGET_IDS, LINE_TARGET_DISCOVERY_ENABLED, LINE_AUTO_REPLY_TEXT, LINE_REPLY_MODE
- CRM_WEBHOOK_URL, CRM_WEBHOOK_TOKEN
- OPENCLAW_WEBHOOK_URL, OPENCLAW_WEBHOOK_TOKEN, OPENCLAW_ENABLE_LINE, OPENCLAW_LINE_ALLOW_FROM, OPENCLAW_LINE_DM_POLICY, OPENCLAW_LINE_GROUP_POLICY, OPENCLAW_LINE_TEXT_CHUNK_LIMIT

Data/analytics:
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_TABLE_NAME, SUPABASE_SCHEMA, SUPABASE_DATABASE_URL
- AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME
- GA4_MEASUREMENT_ID, GA4_API_SECRET, GOOGLE_ADS_ID, GOOGLE_ADS_LEAD_LABEL, META_PIXEL_ID, META_ACCESS_TOKEN
- CRON_SECRET, RESEARCH_DIGEST_DAYS, RESEARCH_DIGEST_LIMIT

## Deployment note

The GitHub clone attempt from https://github.com/chatwanitcha-max/pinpointapp.git was blocked by authentication in this CLI session, so the implemented changes are in the local deploy snapshot path above. Push/deploy should use the credentials from /mnt/d/Pinpoint/.env.local.txt or an authenticated GitHub/Vercel session, without printing token values.


## Premium Growth OS upgrade

Blutenstein now treats Pinpoint and SuccessCasting as part of a single premium growth umbrella. The operating model includes buyer-intent scanning, top-3 competitor/leader benchmarking, premium automation ideas, trusted SME profiles, LINE OA sales-copilot workflow, AI-search/SEO readiness, and CRM outcome feedback. Customer websites should not expose unfinished Growth OS detail pages or navigation labels. They should show only subtle footer/badge-style trust markers such as “Trusted SME verified — by Blutenstein”, linking to the separate Blutenstein website for full explanation.

## Sitewide trust-marker pass

All public Pinpoint HTML pages with a footer now include the same subtle footer trust marker linking to `https://blutenstein.com/`. The internal `/growth-os-dashboard/` redirect remains noindex/nofollow and points to Blutenstein instead of exposing unfinished Growth OS mechanics on the customer site.
