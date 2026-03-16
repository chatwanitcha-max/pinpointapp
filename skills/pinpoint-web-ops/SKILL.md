---
name: pinpoint-web-ops
description: Maintain and grow the Pinpoint Accounting website. Use when updating bilingual Thai/English website copy, service pages, blog SEO, canonical metadata, sitemap, robots.txt, llms.txt, and when deploying or verifying pinpointaccountingservice.com on Vercel.
metadata: {"openclaw":{"homepage":"https://pinpointaccountingservice.com","os":["win32","linux"],"requires":{"bins":["node","rg"]}}}
---

# Pinpoint Web Ops

This skill is for the Pinpoint Accounting website in the current repo.

Brand and content rules:
- Preserve the original Pinpoint logo image exactly. Do not redesign it.
- Keep the look premium, clean, gold-accented, and businesslike.
- Thai is the primary language. English must remain available.
- Do not remove existing core services without user approval.
- Do not change phone, LINE, address, or company identity unless explicitly requested.

Current production domain:
- `https://pinpointaccountingservice.com`

Core workflow:
1. Inspect current state with `rg` before edits.
2. When touching SEO, update all affected items together:
   - canonical
   - hreflang
   - `og:url`
   - structured data URLs
   - sitemap entries
   - `robots.txt`
   - `llms.txt`
3. Keep service coverage aligned with the business:
   - monthly accounting and tax
   - DBD registration and amendments
   - visa and work permit
   - business licenses
   - company dissolution
4. Before deploy, verify no stale production references remain:
   - search for `pinpoint-ten.vercel.app`
   - search for outdated phone/address text if those fields were edited
5. Deploy only after syntax and link checks pass.
6. Verify live responses after deploy.

Preferred helpers in `{baseDir}/scripts`:
- `node {baseDir}/scripts/verify-live.mjs`
- `node {baseDir}/scripts/deploy-prod.mjs`

Deploy notes:
- `deploy-prod.mjs` looks for `2ndVERCELTOKEN` first, then `VERCEL_TOKEN`, in `.env.local` or `.env.local.txt`.
- It deploys production with Vercel and then verifies the live domain URLs.

Verification standard:
- Home returns `200`
- Blog returns `200`
- `robots.txt` returns `200`
- `llms.txt` returns `200`
- No required page should still reference `pinpoint-ten.vercel.app`

When writing copy:
- Lead with outcomes and trust.
- Write for conversion, not portfolio vanity.
- Prefer clear business language over vague marketing.
- On blog pages, keep content factual and practical.
