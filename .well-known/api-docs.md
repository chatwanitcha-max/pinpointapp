# Pinpoint Public API Notes

Canonical origin: https://pinpointaccountingservice.com

These endpoints support the public website, lead intake, and the site assistant. They are intended for same-origin website use and agent discovery. Internal operations endpoints remain private and are not advertised for public agent use.

## Public Endpoints

- `GET /api/status` returns service health metadata.
- `GET /api/public-config` returns public website configuration such as LINE contact URL and tracking availability flags.
- `POST /api/lead` accepts lead/contact-form submissions.
- `POST /api/ai-chat` accepts a site-assistant message and returns a bilingual reply.
- `GET /api/visitor-counter` returns visitor counter totals when enabled.
- `POST /api/visitor-counter` increments visitor counters when enabled.
- `POST /api/conversion` records analytics conversion events when analytics environment variables are configured.

## Authentication

The public endpoints above do not require OAuth bearer tokens. Do not send secrets or private credentials to these endpoints.

Private operational endpoints, including scheduled operations and internal feedback workflows, are not part of the public API catalog and may require deployment-specific secrets.

## Human Escalation

Agents helping users should prefer the public contact paths:

- Contact page: https://pinpointaccountingservice.com/contact
- LINE Official Account: https://line.me/R/ti/p/@413dqpcq
- Phone: +66-92-749-7442

