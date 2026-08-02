# ADR 0001: Next.js and TypeScript AI-Native Frontend

## Status

Accepted

## Decision

SHRESTA-WEB-FE uses TypeScript strict mode and Next.js App Router. Route rendering is chosen per commerce need: SSR for fresh listing/search, ISR for product detail pages, CSR for user-specific cart, checkout, orders, and profile surfaces.

## Consequences

- Product and category pages remain SEO-friendly.
- Cart and checkout avoid unsafe caching.
- The codebase remains understandable to AI agents through strict types, feature modules, and `.ai/` context.
- Mobile app code sharing remains viable because frontend domain types and hooks use TypeScript.
