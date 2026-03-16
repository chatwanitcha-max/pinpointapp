# Anthropic Plugin Study For Pinpoint

Study date: 2026-03-16
Source repo: `Geowahaha/Anthopic-knowledge-work-plugins`
Local copy: `references/Anthopic-knowledge-work-plugins`

## What this repo is really teaching

The strongest idea in this repository is not "use more AI."

It is:

1. break work into clear business roles
2. give each role repeatable workflows
3. define inputs, process, output, and quality checks
4. let the system work without connectors first
5. improve it later with CRM, email, analytics, or data tools

This is a very good fit for Pinpoint because the business already has repeatable workflows:

- website lead intake
- consultation follow-up
- accounting onboarding
- DBD and licensing document collection
- visa and work permit case handling
- recurring monthly client communication
- FAQ / blog / SEO publishing

## Most relevant patterns from the repo

### 1. Skills are role-based, not tool-based

The repo groups work by function:

- sales
- marketing
- customer-support
- finance
- operations

That matters for Pinpoint because your AI stack should follow business teams, not random APIs.

For Pinpoint, the right grouping is:

1. Growth and SEO
2. Lead qualification and sales follow-up
3. Client onboarding and document checklist management
4. Monthly accounting operations
5. DBD / visa / permit case coordination
6. Client support and status updates

### 2. Every skill has a strict workflow

The best files in the repo always define:

- when to trigger
- what information is needed
- how to work step by step
- what the output format should be
- what follow-up questions or next steps come next

This is exactly how Pinpoint should structure AI work.

Good examples studied:

- `marketing/skills/seo-audit/SKILL.md`
- `sales/skills/draft-outreach/SKILL.md`
- `sales/skills/call-prep/SKILL.md`
- `customer-support/skills/ticket-triage/SKILL.md`
- `customer-support/skills/draft-response/SKILL.md`
- `operations/skills/process-optimization/SKILL.md`
- `finance/skills/audit-support/SKILL.md`

### 3. Standalone first, connectors second

A strong pattern across the repo:

- it still works with web research or manual input
- it gets better when CRM, email, or analytics are connected

That is the right rollout for Pinpoint too.

Do not wait until the whole stack is perfect.

Instead:

1. make the workflow usable now with form input
2. connect LINE OA
3. connect CRM
4. connect analytics
5. connect OpenClaw

### 4. Output must be structured and reusable

The repo consistently produces outputs like:

- summary
- severity / priority
- recommendation
- next step
- draft response
- action plan

Pinpoint should do the same. Every AI workflow should produce a reusable business artifact.

Examples:

- lead intake summary
- service recommendation
- missing documents checklist
- consultation follow-up draft
- client update message
- monthly risk summary
- SEO action list

### 5. Brand voice is a system, not a writing style

The `partner-built/brand-voice` plugin is very important for Pinpoint.

It shows that AI quality improves when the business defines:

- who we are
- who we are not
- tone rules
- terminology rules
- what claims we will and will not make

Pinpoint needs this badly because your website, blog, LINE replies, and consultation responses should all sound consistent:

- professional
- calm
- premium
- trustworthy
- direct
- not spammy
- not overclaiming legal or tax outcomes

### 6. Support workflows should triage before replying

The `ticket-triage` and `draft-response` skills are highly relevant.

For Pinpoint, many incoming messages are not just "questions."
They are one of these:

- new lead
- urgent tax/accounting issue
- document status follow-up
- invoice/payment question
- visa/work permit status question
- DBD amendment question
- general FAQ

The system should classify first, then reply.

That will make LINE OA and email much more useful.

## What Pinpoint should copy from this repo

### A. For the business

Build AI around repeatable workflows:

1. Lead qualification
2. Call preparation
3. Outreach drafting
4. Client intake
5. Client response drafting
6. Process optimization
7. Audit-ready documentation support

### B. For the website

Turn the website into a structured conversion system:

1. every service page should map to 2-3 related blog articles
2. every blog article should map back to a service page and CTA
3. every FAQ should reduce objections and direct to next action
4. every lead form should produce structured routing data
5. every page should reinforce the same premium trust language

### C. For OpenClaw

Use OpenClaw as workflow orchestration, not just chat.

Recommended Pinpoint OpenClaw workflows:

1. `qualify-lead`
- input: website form or LINE message
- output: score, urgency, service bucket, follow-up recommendation

2. `call-prep`
- input: contact, company, service interest
- output: briefing, questions, talking points, risk notes

3. `draft-response`
- input: client message
- output: Thai and English customer-ready response

4. `document-checklist`
- input: service type
- output: required docs, missing docs, next action

5. `seo-audit`
- input: site page or topic
- output: keyword gaps, metadata fixes, content ideas

6. `case-status-update`
- input: case stage
- output: polite customer update message + internal note

## Best implementation path for Pinpoint

### Phase 1: Growth engine

Goal: get more qualified leads

Build:

1. SEO topic clusters by service
2. lead qualification workflow
3. outreach drafts for hot leads
4. consultation prep briefs

### Phase 2: Client onboarding engine

Goal: reduce manual back-and-forth

Build:

1. service-specific document checklists
2. intake summary generation
3. missing-document follow-up messages
4. bilingual onboarding packs

### Phase 3: Client operations engine

Goal: improve service consistency

Build:

1. recurring client status updates
2. issue triage for LINE OA / email
3. audit and compliance workpaper support
4. internal runbooks for monthly work

## Immediate recommendations for this repo

### 1. Create a Pinpoint brand voice spec

Before scaling AI replies, define:

- positioning
- premium tone
- forbidden claims
- Thai / English terminology
- service naming consistency

### 2. Create a lead qualification taxonomy

Each lead should be tagged with:

- service type
- urgency
- language
- business stage
- deal value potential
- missing information

### 3. Create response templates by situation

At minimum:

- new lead reply
- consultation booking reply
- missing document reply
- work-in-progress update
- delay explanation
- request for clarification

### 4. Create service runbooks

Each service should have:

- what it covers
- what it does not cover
- required documents
- typical blockers
- follow-up cadence
- escalation rule

### 5. Build article clusters, not isolated blog posts

Recommended cluster groups:

- accounting and monthly tax compliance
- company registration and DBD changes
- visa and work permit
- business licenses
- company dissolution
- foreign-owned business setup in Thailand

## What not to copy blindly

Do not copy the repo as-is.

Some plugins assume:

- large SaaS teams
- CRM-heavy outbound sales
- mature internal systems
- many connected enterprise tools

Pinpoint should stay simpler:

- LINE-first
- website-first
- bilingual
- service-trust focused
- SMB and foreign-founder friendly

## Final conclusion

This repo confirms that the right next step for Pinpoint is not "more pages only."

The right next step is to build a business operating system around a few high-value AI workflows:

1. attract qualified leads
2. classify them correctly
3. respond professionally
4. onboard them faster
5. keep service delivery consistent

If implemented well, this can make Pinpoint feel much bigger, more responsive, and more premium than a typical accounting firm of the same size.
