# ADR 0006: Backend-Driven Storefront and Admin Dashboard

## Status

Accepted.

## Context

The SHRESTA web frontend must not own category, asset, or product-like datasets. Storefront content, image metadata, category configuration, and asset records are durable backend data so the customer experience can update through APIs without frontend redeploys.

The admin dashboard also needs to mutate backend state safely. Backend admin APIs require server-only credentials and idempotency headers.

## Decision

Render the home page from `GET /api/v1/storefront/home` through `src/features/storefront/storefront-home.ts` and `src/components/storefront/storefront-home-experience.tsx`. The customer shell follows the old SHRESTA reference wine/gold interface while keeping all data-bearing storefront surfaces backend-owned. Use `ResponsiveMedia` for backend-provided versioned variant URLs, dimensions, LQIP placeholders, and prefetch hints.

Implement `/admin`, `/admin/assets`, `/admin/categories`, and `/admin/review` as server-rendered admin pages using server actions. Keep `SHRESTA_ADMIN_API_KEY` server-side inside `src/features/admin/admin-api.ts`. Require every mutating form to submit an `idempotencyKey` that is forwarded to SHRESTA-BE. Keep frontend-only layout/copy controls out of the primary admin dashboard. A future product catalog admin must be a backend catalog/PIM surface, while the current dashboard manages category taxonomy and asset metadata including category, subcategory, SKU, tags, alt text, SEO fields, generated image variants, and existing image replacement through backend S3/CDN media contracts.

## Consequences

- Frontend-owned sample datasets are not allowed for storefront/category/asset surfaces.
- Admin writes are replay-safe at the backend idempotency layer.
- High-quality images are rendered from backend S3/CDN-compatible versioned URLs while the frontend stays lightweight.
- Future product, inventory, and order admin surfaces should follow the same server-only bridge and idempotent mutation pattern without turning frontend presentation copy into admin-owned data.
