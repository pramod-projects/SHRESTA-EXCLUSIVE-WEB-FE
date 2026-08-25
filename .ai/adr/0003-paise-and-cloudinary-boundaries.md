# ADR 0003: Paise and Canonical R2 Media Boundaries

## Status

Accepted

## Decision

The frontend treats paise and canonical R2 media metadata as explicit domain boundaries. Components call `formatPaise` for money and render the backend-provided Cloudflare custom-domain URL with `next/image`. Admin uploads request authorization through same-origin metadata routes, then PUT exactly one canonical file directly to R2.

## Consequences

- Currency behavior is consistent across product cards, PDP, cart, checkout, and orders.
- Display sizing is handled by `next/image` and optional delivery-time Cloudflare transformation without creating stored variants.
- Future AI agents have obvious guardrails for money and media handling.
