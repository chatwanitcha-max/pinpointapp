# Blutenstein Premium Growth OS Blueprint

Version: 2026-05-17
Owner: Blutenstein umbrella
Current business units: Pinpoint, SuccessCasting

## Mission

Blutenstein exists to help trusted SMEs and owned websites grow into richer, higher-quality customers through premium automation, verified trust, buyer-intent intelligence, competitor benchmarking, AI-search visibility, and sales follow-up systems.

This is not a raw-lead spam service. The durable positioning is:

> Premium trusted growth automation for SMEs that need better customers, stronger credibility, and measurable sales execution.

## Non-negotiable principles

1. Evidence before outreach: every opportunity must have a source URL, quote, map signal, public contact, or explicit business signal.
2. Trust before volume: fewer high-quality leads beat noisy lists.
3. Leader benchmark every market: identify top 3 leaders/growing competitors and make the client at least not below their visible level.
4. LINE OA is alerting, not the whole product: the premium value is the closed-loop Growth OS.
5. Outcome feedback is mandatory: without won/lost/contacted feedback, the system cannot become a true growth brain.
6. Public pages stay premium/simple; backstage mechanics stay in dashboards, docs, reports, and operations.

## Product pillars

### 1. Buyer Intent Radar

Daily public-intent scanning for:
- People actively asking for services.
- Businesses showing pain or growth triggers.
- Weak digital/trust signals that suggest a soft opportunity.

Sources:
- Public web search.
- Public job/project boards.
- Public social/search snippets.
- Public map/POI records.
- Public websites and service pages.

Output:
- Lead name/business.
- Contact if public.
- Source URL.
- Evidence excerpt.
- Score and intent type.
- Recommended action.
- LINE OA alert.

### 2. Competitor / Top-3 Leader Intelligence

For every business unit and client vertical, the system should identify leaders by:
- Search visibility.
- Offer clarity.
- Trust proof.
- Reviews/reputation.
- Content depth.
- Conversion path.
- Automation maturity.

Daily output can be lightweight. Weekly output should be strategic:
- Top 3 visible leaders.
- What they do better.
- What the client lacks.
- What must be shipped to match/beat them.

### 3. Trusted SME Profile + Trust Badge

Every premium client should get a verified profile:
- Who they are.
- What they can deliver.
- Evidence/proof.
- Coverage area.
- Contact/RFQ route.
- Anti-scam limits.
- JSON-LD schema.
- AI-readable summary.
- Blutenstein verified badge.

Public copy should be simple:

> Trusted SME verified — by Blutenstein

Do not expose scoring internals publicly.

### 4. LINE OA Sales Copilot

Every lead alert should have recommended follow-up:
- Opening message.
- Qualification questions.
- Objection handling.
- Proposal outline.
- Follow-up schedule.
- Next best offer.

Future implementation: the LINE OA alert should include quick-action links/buttons to mark status and request a reply draft.

### 5. AI Search + SEO Visibility

For each business unit/client:
- Create crawlable service pages.
- Add JSON-LD schema.
- Add llms.txt / ai.txt guidance.
- Publish use-case pages and evidence pages.
- Monitor search/AI answer visibility.
- Create pages for the exact buyer-intent phrases that generate qualified leads.

### 6. CRM + Outcome Feedback Loop

Minimum status fields:
- new
- verified
- contacted
- interested
- proposal_sent
- won
- lost
- not_fit
- duplicate

Minimum outcome fields:
- reason_lost
- competitor_mentioned
- price_sensitivity
- timing
- trust_gap
- next_follow_up_at
- estimated_value
- actual_value

## Productized packages

### Package A — Lead Radar

For clients who need first proof that Blutenstein can find demand.

Includes:
- Daily buyer-intent scan.
- LINE OA alerts.
- Evidence/source URL.
- Contact path when public.
- Weekly quality review.

### Package B — Growth Intelligence

For clients who need a better market position.

Includes Package A plus:
- Top-3 competitor benchmark.
- Offer gap report.
- SEO/AI-search opportunity list.
- Weekly action plan.

### Package C — Trusted SME Growth OS

For clients ready to look premium and receive RFQs.

Includes Package B plus:
- Verified SME profile.
- Trust badge.
- RFQ intake.
- AI-readable pages.
- LINE OA sales copilot.
- CRM feedback loop.

### Package D — Done-for-you Premium Growth

For clients who want Blutenstein to operate the growth engine.

Includes Package C plus:
- Landing pages.
- Content plan.
- CRM setup.
- Follow-up automation.
- Monthly strategy review.
- Sales scripts and proposal templates.

## Current business-unit mapping

### Pinpoint

Primary offers:
- Monthly accounting.
- Tax compliance.
- Annual closing.
- DBD changes.
- Company registration/dissolution.
- Payroll/social security.
- Visa/work permit.
- Business licenses.
- Foreign business support.

Best lead signals:
- “หาคนทำบัญชี”
- “หาคนปิดงบ”
- “FlowAccount”
- “ยื่น DBD”
- “ภงด 50 51”
- “เปลี่ยนกรรมการ”
- “จดทะเบียนบริษัท”
- Multi-branch cafe/restaurant.
- SME with VAT/payroll signals.

### SuccessCasting / Blutenstein Trusted SME Network

Primary offers:
- Trusted SME verification.
- Supplier/buyer matching.
- Trust badge.
- Anti-scam proof layer.
- AI-search/SEO acquisition.
- Premium lead-generation system.

Best lead signals:
- “หา supplier ที่เชื่อถือได้”
- “หาโรงงานรับผลิต”
- “โดนโกง supplier”
- “หา partner ธุรกิจ”
- “อยากเพิ่มลูกค้า SME”
- Weak-trust SMEs with good offline capability but poor online proof.

## Daily 07:30 automation contract

The cron job must:
1. Scan public sources only.
2. Score opportunities.
3. Send up to 8 strong opportunities to LINE OA.
4. Include evidence, source, business_unit, reason, and recommended action.
5. Report top-3 leader insights.
6. Propose 1-3 premium automation ideas.
7. State rejected items and why.

## Missing pieces to build next

1. Growth OS dashboard.
2. Lead outcome feedback endpoint/form.
3. Competitor benchmark database.
4. Verified SME profile generator.
5. LINE OA quick-action status buttons.
6. Weekly executive report.
7. AI-search visibility tracker.
8. Sales copilot prompt library.

## Immediate implementation priority

1. Keep daily scan running.
2. Add public premium Growth OS page.
3. Add service catalog JSON for automation and future websites.
4. Add internal dashboard blueprint.
5. Build feedback loop next, because it is the difference between “scanner” and “growth brain”.


## Growth feedback API

Endpoint added: `/api/growth-feedback`

Purpose: capture sales/team outcome feedback so Blutenstein becomes a learning growth system rather than a one-way scanner.

Method: POST JSON

Required fields:
- `leadId`
- `status`: `new`, `verified`, `contacted`, `interested`, `proposal_sent`, `won`, `lost`, `not_fit`, `duplicate`

Optional fields:
- `businessUnit`
- `outcome`
- `estimatedValue`
- `actualValue`
- `competitorMentioned`
- `reasonLost`
- `trustGap`
- `nextFollowUpAt`
- `operator`
- `notes`
- `pageUrl`

Security: if `GROWTH_FEEDBACK_TOKEN` is configured in production, the request must provide the same value via `x-growth-feedback-token` header or `token` body field. Do not expose this token publicly.

Channel behavior: feedback is posted to `LINE_OA_WEBHOOK_URL` and optionally LINE push if LINE push env exists.
