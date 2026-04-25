# ADR-005: Meta Ads Integration — Token Strategy and Scope

**Status:** Active
**Version:** 1.0
**Date:** 2026-04-25

## Context

Gohits needs to publish ad creatives directly to the Facebook Ads Manager from the "Ligar no Play" modal. This requires authenticating against the Facebook Marketing API (Graph API v21.0).

Facebook offers multiple token types:
- **User Access Token**: Generated via Graph API Explorer, short-lived (~1h) or long-lived (~60 days after exchange). Easy to obtain, expires.
- **System User Token**: Does not expire. Requires a Meta Business Manager Admin to configure a System User and assign it to the ad account. More complex to set up.

## Decision

For MVP: use a **long-lived User Access Token** stored in `META_ACCESS_TOKEN` env var.

- Obtain via Graph API Explorer → exchange for long-lived token (~60 days) via `/oauth/access_token?grant_type=fb_exchange_token`
- Required permissions: `ads_management`, `pages_read_engagement`
- Initial scope: **Gocase only** (`act_GOCASE_AD_ACCOUNT_ID`)
- Credentials stored in env vars (not in brand config registry — separate concern)

## Roadmap

When a Meta Business Manager Admin is available, migrate to **System User Token**:
1. Create a System User in Meta Business Suite
2. Assign it to the Gocase ad account with Advertiser role
3. Generate token (does not expire, no manual refresh needed)
4. Replace `META_ACCESS_TOKEN` in env/secrets

## Rationale

- User token is sufficient for MVP and internal tooling with low ad volume
- System User token setup requires BM Admin access not available at time of writing
- Env vars (not brand registry) because Meta credentials are account-level, not brand-level

## Consequences

- `META_ACCESS_TOKEN` will need manual refresh every ~60 days until migrated to System User
- Token expiry will cause silent 500 errors on publish — operators must monitor and refresh
- Adding other brands (Apice, Rituaria) to Meta Ads will require additional env vars per account

## History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-25 | Initial decision — User Access Token for MVP, Gocase scope only |
