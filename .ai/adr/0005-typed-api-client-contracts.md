# ADR 0005: Typed API Client Contracts

## Status

Accepted.

## Context

SHRESTA-WEB-FE depends on SHRESTA-BE APIs that use a standard `ApiResponse` envelope with `success`, `data`, `error`, `traceId`, and `timestamp`. The frontend needs a stable, typed fetch layer before catalog, auth, cart, checkout, and admin flows are implemented.

Category configuration is the first cross-repository API contract and is consumed through `GET /api/v1/categories`.

## Decision

Introduce `src/lib/api-client.ts` as the frontend API boundary. It unwraps successful backend envelopes, preserves backend trace IDs on failures, normalizes errors through `ShrestaApiError`, and uses `NEXT_PUBLIC_API_BASE_URL` for the browser-exposed backend origin.

Introduce `src/features/catalog/category-config.ts` as the typed category configuration contract for `GET /api/v1/categories`.

## Consequences

- Feature modules consume backend data through a shared API boundary instead of ad hoc fetch calls.
- API errors preserve backend trace IDs for support and observability.
- Category filter UI can be generated from a typed contract without hard-coded saree assumptions.
- Future OpenAPI-generated types should replace or back these handwritten contracts once backend contract generation is wired.
