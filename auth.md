# Pinpoint Agent Authentication

Canonical origin: https://pinpointaccountingservice.com

Pinpoint Accounting & Service does not currently offer self-service OAuth, OpenID Connect, or agent registration for public API access.

## Public Agent Access

Agents may read public website content according to:

- https://pinpointaccountingservice.com/robots.txt
- https://pinpointaccountingservice.com/agents.txt
- https://pinpointaccountingservice.com/llms.txt
- https://pinpointaccountingservice.com/ai.txt

Agents may help users contact Pinpoint through public channels:

- Contact page: https://pinpointaccountingservice.com/contact
- LINE Official Account: https://line.me/R/ti/p/@413dqpcq
- Phone: +66-92-749-7442

## API Access

Public API discovery is available at:

- https://pinpointaccountingservice.com/.well-known/api-catalog
- https://pinpointaccountingservice.com/.well-known/openapi.json
- https://pinpointaccountingservice.com/.well-known/oauth-protected-resource

The advertised public endpoints do not require bearer tokens. Private operational endpoints are not available for public agent registration.

## Future OAuth/OIDC Support

When Pinpoint adds a real OAuth or OIDC authorization server, this file should be updated together with:

- `/.well-known/oauth-authorization-server`
- `/.well-known/openid-configuration`, if OpenID Connect is supported
- `/.well-known/oauth-protected-resource`

