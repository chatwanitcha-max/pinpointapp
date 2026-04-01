# Pinpoint Agency OS

Pinpoint Agency OS is the practical multi-agent operating layer for this business.

It does not assume that one AI should do everything. Instead, it splits the work into clear roles:
- growth strategist
- lead intake
- sales follow-up
- client success
- compliance reviewer
- release operator

The goal is simple:
- attract better leads
- respond faster
- keep the website current
- reduce admin friction
- keep risky decisions under human control

## Operating Mission

This project runs with an autonomy-first mission:
- Codex should act as the primary operator for website, automation, SEO, lead routing, reporting, and system improvement.
- Codex should default to doing the work directly instead of asking the user to repeat approvals or micro-steps.
- Codex should only pause for user action when blocked by:
  - third-party login sessions
  - external payment or billing confirmation
  - credentials that do not exist yet
  - irreversible decisions with material business risk
- When blocked, Codex should reduce the request to the smallest possible next click or credential, then continue immediately after.
- The target system is an AI-assisted accounting business that feels proactive, well-maintained, and capable of running with minimal employee effort while keeping regulated judgment under human control.

In practice, this means:
- if Codex can inspect, fix, verify, deploy, or improve something safely, Codex should just do it
- if a third-party dashboard still needs a human click, Codex should explain only that exact click and resume immediately after
- if memory, content, FAQ, or automation can be strengthened in the background, Codex should keep improving it without waiting for repeated permission

## What now exists in this repo

- Skill: `skills/pinpoint-agency-os`
- Business config: `operations/agent-os.config.json`
- Campaign queue: `operations/campaign-queue.json`
- Follow-up playbook: `operations/follow-up-playbook.json`
- Lead inbox sample: `operations/lead-inbox.sample.json`
- Daily brief generator: `node skills/pinpoint-agency-os/scripts/generate-daily-brief.mjs`
- Readiness checker: `node skills/pinpoint-agency-os/scripts/check-readiness.mjs`
- Follow-up queue generator: `node skills/pinpoint-agency-os/scripts/generate-followup-queue.mjs`
- Daily runner: `node scripts/run-daily-agency-os.mjs`

## Recommended daily operator loop

1. Check what is live:
   - `node scripts/check-integrations.mjs`
   - `node skills/pinpoint-agency-os/scripts/check-readiness.mjs`
2. Generate the daily brief:
   - `node skills/pinpoint-agency-os/scripts/generate-daily-brief.mjs`
   - `node skills/pinpoint-agency-os/scripts/generate-followup-queue.mjs`
   - or just run `node scripts/run-daily-agency-os.mjs`
3. Execute one task in each lane:
   - one growth task
   - one sales task
   - one client success task
   - one compliance check
4. Deploy web-facing updates only after verification.

## Production automation

- `vercel.json` now schedules `/api/daily-ops` once per day
- The daily endpoint builds an ops report from the business config and queue
- When credentials are present it can send the report to:
  - email
  - LINE push
  - CRM webhook
  - OpenClaw webhook

## What must still be supplied by the business

- real channel credentials
- CRM destination
- email sending setup
- LINE OA credentials
- human approval policy for fees and filings

## Non-negotiable guardrails

- AI can assist, not replace regulated judgment.
- No autonomous tax, legal, permit, or filing commitments.
- No fake claims, fake urgency, or fake metrics.
- Thai copy must sound like a real service business, not a tech demo.
