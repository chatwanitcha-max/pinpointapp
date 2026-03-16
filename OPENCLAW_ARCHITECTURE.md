# OpenClaw Architecture For Pinpoint

## Objective

Use OpenClaw as a controlled automation layer for:
- website growth
- inbound lead qualification
- customer follow-up
- client onboarding reminders
- content and SEO operations

Do not allow it to make binding tax, legal, pricing, or filing decisions without human approval.

## System Layout

### 1. Growth Layer

Inputs:
- website lead form
- LINE OA
- phone callback requests
- blog CTA clicks

Automation:
- classify lead by service type
- detect urgency
- detect Thai or English preference
- route to the right next step

Outputs:
- CRM row or ticket
- email summary
- LINE follow-up
- internal task for human review

### 2. Client Care Layer

Inputs:
- approved client record
- service type
- missing document list
- key deadlines

Automation:
- send onboarding checklist
- send reminder schedule
- answer basic FAQ
- request missing documents
- provide status updates

Outputs:
- cleaner onboarding
- fewer missed documents
- faster response times

### 3. Website Ops Layer

Inputs:
- service updates
- new offers
- SEO content plan
- policy or contact changes

Automation:
- update bilingual web copy
- create or improve blog posts
- refresh FAQ and resource links
- maintain canonical, sitemap, robots, and llms files
- prepare deployment

Outputs:
- better conversion pages
- better search readiness
- consistent production deploy workflow

### 4. Human Approval Layer

Always require human approval for:
- quotes and pricing changes
- case-specific tax or legal advice
- DBD, visa, permit, or dissolution filings
- payment collection
- final production release if the change is high risk

## Recommended Components

### OpenClaw core
- installed locally
- runs the Pinpoint website skill

### Channels
- LINE plugin for inbound customer chat
- website lead form webhook
- Gmail or business email for summaries

### Data stores
- simple start: Google Sheets or Airtable
- later: CRM such as HubSpot

### Deployment
- Vercel production deploy
- `pinpointaccountingservice.com` as the canonical domain

## Suggested Agent Roles

### Lead Triage Agent
- receives new lead
- asks qualifying questions
- tags the case
- schedules follow-up

### Client Success Agent
- sends checklists
- tracks missing documents
- reminds clients about deadlines

### Content Agent
- drafts service copy
- drafts Thai and English blog content
- keeps search metadata aligned

### Release Agent
- checks production references
- deploys
- verifies live URLs

## Rollout Plan

### Phase 1
- website skill
- deploy verification
- SEO maintenance

### Phase 2
- lead webhook to CRM
- email summary automation
- LINE routing

### Phase 3
- onboarding reminder flows
- client-status messaging
- blog publishing pipeline

## Guardrails

- Keep source-of-truth contact details in one place.
- Never redesign the official logo.
- Keep Thai default and English available.
- Log every deploy and outbound client action.
- Require a human for final advice and final filing.
