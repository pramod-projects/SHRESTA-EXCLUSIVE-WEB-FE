# ADR 0004: Temporary Next Nested PostCSS Audit Exception

## Status

Accepted, temporary

## Context

After upgrading the frontend foundation to Next.js 16.2.10, React 19, ESLint 9, Vitest 4, and PostCSS 8.5.10, `npm audit --audit-level=moderate` still reports a moderate advisory for `postcss <8.5.10` nested under `next`. The npm suggested forced fix would install `next@9.3.3`, which would remove App Router support and violate the SHRESTA frontend architecture.

## Decision

Do not run `npm audit fix --force` for this advisory. Keep Next on the secure current App Router line and track the nested PostCSS advisory until an upstream Next release resolves it without downgrading the framework.

## Mitigation

- The application does not accept or stringify untrusted user CSS.
- Root PostCSS is pinned to a non-vulnerable line.
- `npm audit --audit-level=moderate` remains part of validation and this ADR must be revisited on every dependency upgrade.
- When Next releases a version that removes the nested vulnerable PostCSS, upgrade immediately and close this ADR.

## Review Trigger

Review this ADR when any of these happen:

- A newer Next release is available.
- The advisory severity increases.
- SHRESTA introduces user-controlled CSS, theming, page builder, CMS HTML/CSS injection, or rich content rendering.
