# ADR 0003: Paise and Cloudinary Boundaries

## Status

Accepted

## Decision

The frontend treats paise and Cloudinary public IDs as explicit domain boundaries. Components call `formatPaise` for display and `buildCloudinaryUrl` for media. Components must not divide paise or assemble image URLs inline.

## Consequences

- Currency behavior is consistent across product cards, PDP, cart, checkout, and orders.
- Image transformations are centralized and can be optimized without sweeping component changes.
- Future AI agents have obvious guardrails for money and media handling.
