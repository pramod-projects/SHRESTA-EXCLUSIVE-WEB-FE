# SHRESTA Web Frontend Engineering Execution Plan

This plan expands the source architecture into frontend execution phases. Every phase ends deployable and keeps `.ai/` synchronized with source code.

## North Star

SHRESTA-WEB-FE is the premium quick-commerce web surface for SHRESTA EXCLUSIVE. It must make silk sarees, and future categories feel fast, visual, trustworthy, and deliverable in 10-30 minutes. Every frontend decision serves speed, conversion, premium visualization, and safe checkout.

## Global Frontend Rules

- TypeScript strict mode is mandatory.
- Components never trust client-computed totals.
- Use `formatPaise` for all money display.
- Use `buildCloudinaryUrl` for all Cloudinary media.
- TanStack Query owns server state; Zustand owns UI-only state.
- React Hook Form and Zod own forms and validation.
- Use feature-first modules with shared UI and generated API types.
- Avoid hidden state duplication between backend truth and frontend stores.
- Mobile-first layouts are the baseline; desktop is an enhancement.
- Update `.ai/` with every source, design, dependency, API, route, or performance change.

## Phase 0: AI Foundation and Deployable Shell

Objectives:

- Establish the frontend AI Bank before feature code.
- Create the minimal Next.js App Router foundation.
- Implement shared currency/media utilities and health route.

Scope:

- `.ai/source-register.md`, `.ai/business-rules.json`, `.ai/architecture-map.json`, `.ai/knowledge-base.md`, `.ai/mind-map.md`, `.ai/sync-policy.md`.
- ADRs for Next.js/TypeScript, state ownership, and money/media boundaries.
- Next.js app shell, health API, global styles, TypeScript config, tests for utilities.

Acceptance Criteria:

- `npm run typecheck`, `npm run lint`, and `npm test` pass once dependencies are installed.
- Home route renders without client-only data assumptions.
- `/api/health` returns a stable health response.
- Currency utility formats paise only.
- Cloudinary utility requires public_id and cloud name.
- AI context files exist for significant created utilities and routes.

Testing Strategy:

- Vitest unit tests for currency and media utilities.
- TypeScript strict build.
- Future Playwright smoke test for homepage and health route.

Production Readiness Checklist:

- No secrets committed.
- Environment variables documented.
- Performance budgets documented.
- Route rendering strategy documented.

## Phase 1: Design System, API Client, and App Infrastructure

Objectives:

- Build the reusable frontend foundation for all commerce flows.

Scope:

- Design tokens for SHRESTA navy, gold, cream, success, warning, and error.
- Shared UI primitives: Button, IconButton, Input, Sheet, Dialog, Tabs, Badge, Skeleton, Toast.
- Query client, API client, auth-aware fetch/axios layer, error normalization.
- Generated OpenAPI type integration once backend OpenAPI is available.
- Zustand UI store only.
- Layout shell with location banner, bottom mobile nav, cart drawer host, and global providers.
- Observability hooks for frontend events and errors.

Acceptance Criteria:

- UI primitives are accessible, responsive, and tested.
- API client handles trace IDs and typed errors.
- No server state is stored in Zustand.
- App shell works on mobile and desktop viewports.
- Component AI context files describe props, ownership, and business rules.

Testing Strategy:

- Component tests for primitives.
- Accessibility checks for controls.
- Type tests for API client.
- Playwright mobile/desktop smoke checks.

Documentation Requirements:

- Update component map, UX patterns, API dependency map, and mind map.

Production Readiness Checklist:

- Bundle budget configured.
- Error boundary and not-found states implemented.
- Sentry or equivalent integration plan documented.

## Phase 2: Auth, Location, Category, Catalog, and Search

Objectives:

- Make product discovery fast, visual, zone-aware, and category-config driven.

Scope:

- OTP login UI with rate-limit-aware messaging.
- Address save flow that shows zone coverage and ETA.
- Category navigation and filter UI generated from category config.
- Product listing shelves: trending, new arrivals, under price, curated category.
- Product card with stock urgency, ETA, price, Cloudinary optimized image, and add-to-cart affordance.
- PDP with media gallery, zoom, attribute sections, stock, tax notes, ETA, recommendations, SEO metadata.
- Search page with query, autocomplete, filters, sorting, empty states, and inventory-aware results.

Acceptance Criteria:

- User can authenticate, save address, browse categories, search, and open PDP.
- Filters are not hard-coded to saree; they render from config.
- Product cards never compute trusted totals.
- Image sizes use stable dimensions and responsive constraints.
- SEO metadata includes category attributes and canonical paths.

Testing Strategy:

- MSW integration tests for auth, address, catalog, and search flows.
- Unit tests for route helpers and facet parsing.
- Playwright smoke tests for discovery and PDP.
- Lighthouse checks for listing and PDP.

Documentation Requirements:

- Update route map, component map, API contract references, category UX rules, and mind map.

Production Readiness Checklist:

- LCP under 2.5s on target route budgets.
- Skeletons used instead of blocking spinners.
- Search and filter errors degrade gracefully.

## Phase 3: Cart, Checkout, Payment, and Orders

Objectives:

- Build the conversion-critical flow with server truth, optimistic UX, and payment safety.

Scope:

- Cart drawer/page using TanStack Query with optimistic updates and rollback.
- Checkout page with saved address, server-priced totals, coupon validation, and payment initiation.
- Razorpay checkout integration loaded only when needed.
- Payment pending/success/failure states based on backend truth.
- Order confirmation, live order status, order history, and order detail.
- Client-side idempotency key handling for checkout submit.

Acceptance Criteria:

- Add-to-cart feels under 100 ms while remaining rollback-safe.
- Checkout displays only server totals and server tax/fee breakdowns.
- Payment failure keeps user on checkout with recoverable state.
- Order confirmation is shown only after backend order state confirms.
- Order item display uses frozen snapshot fields from order API.

Testing Strategy:

- Cart optimistic update tests.
- Payment state-machine UI tests.
- MSW tests for checkout and webhook-delayed order confirmation.
- Playwright full checkout happy path with mocked Razorpay.

Documentation Requirements:

- Update checkout flow, payment UX flow, cart rules, API dependency map, and mind map.

Production Readiness Checklist:

- Payment script lazy-loaded.
- Double-click checkout prevention.
- Error messages never expose stack traces/provider internals.
- No checkout route caching.

## Phase 4: Delivery Tracking, Notifications, Recommendations, and Account

Objectives:

- Complete the post-purchase and retention experience.

Scope:

- Live delivery tracking with status timeline, ETA, rider info, and OTP display rules.
- Notification preference center.
- Recommendation strips for home, PDP, cart, and order success.
- Wishlist and reorder flows.
- Reviews and ratings after delivery.
- Account profile, address management, and order invoices.

Acceptance Criteria:

- Delivery screen handles polling/SSE future upgrade without UI rewrite.
- Recommendations never show out-of-stock or non-deliverable primary items.
- Wishlist and reorder use server APIs and reflect inventory truth.
- Notification preferences are respected.

Testing Strategy:

- Status timeline tests.
- Recommendation fallback tests.
- Account/address integration tests.
- Playwright order tracking smoke test.

Documentation Requirements:

- Update workflow map, recommendation surfaces, notification flows, and mind map.

Production Readiness Checklist:

- Tracking handles stale rider GPS gracefully.
- ETA breach messaging is clear and does not overpromise.
- Review prompts are delayed until eligible.

## Phase 5: Admin Web Surface and Operations UX

Objectives:

- Build an operations-grade admin interface without marketing-style UI.

Scope:

- Admin auth guard and RBAC-aware navigation.
- Dense dashboards for orders, inventory, catalog, logistics, payments, customers, reports, and campaigns.
- Real-time operational alerts and SLA color coding.
- Store-scoped operations for inventory adjustments, order transitions, rider assignment, and notification campaigns.
- Audit log views.

Acceptance Criteria:

- Admin UI is compact, scannable, and role-aware.
- Dangerous actions require confirmation and show audit metadata.
- Real-time metrics are visible without page refresh.
- Admin actions use typed API clients and handle conflict states.

Testing Strategy:

- Role/permission UI tests.
- MSW integration tests for admin workflows.
- Playwright smoke tests for critical operations.

Documentation Requirements:

- Update admin UX map, role map, API dependencies, and mind map.

Production Readiness Checklist:

- No admin route is statically cached.
- Audit data is visible for every mutation.
- Store scope is displayed and enforced in UI.

## Phase 6: Performance, Accessibility, Security, and Scale

Objectives:

- Harden the frontend to production quick-commerce quality.

Scope:

- Lighthouse CI budgets.
- Bundle analysis and dependency governance.
- Web vitals collection.
- Security headers and CSP coordination with backend.
- Accessibility pass for keyboard, screen reader, contrast, focus, and motion.
- Edge/cache strategy for SSR/ISR pages.
- Phase 2 Typesense UX enhancements and real-time inventory update path.

Acceptance Criteria:

- LCP, CLS, and TTI budgets pass for key routes.
- No text overflow on supported mobile/desktop viewports.
- Critical interactions are keyboard accessible.
- Error boundary and offline/degraded states are polished.
- Performance regression gates are in CI.

Testing Strategy:

- Lighthouse CI.
- Playwright visual and mobile viewport checks.
- Accessibility automated checks.
- Bundle budget checks.

Documentation Requirements:

- Update performance budget, dependency map, route cache rules, and mind map.

Production Readiness Checklist:

- Web vitals sent to monitoring.
- CSP tested.
- All critical pages have empty/error/loading states.
