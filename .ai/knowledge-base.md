# SHRESTA-WEB-FE AI Knowledge Base

## System Role

SHRESTA-WEB-FE is the web commerce and admin experience for SHRESTA EXCLUSIVE. It focuses on fast premium product discovery, backend-driven storefront data, category-config driven browsing, Redis-backed cart UX, safe checkout, order tracking, and admin asset/category operations.

## Architecture

The frontend uses Next.js App Router and TypeScript strict mode. Rendering is chosen per route:

- SSR for homepage, category listings, and search results where freshness and SEO matter.
- ISR for product detail pages with short revalidation and future on-demand revalidation.
- Server-rendered admin pages backed by server actions for asset/category operations because secrets must stay server-side.
- RSC by default for static shells and shared layout where possible.

The visual system uses Tailwind CSS v4 through `@tailwindcss/postcss` and `postcss.config.mjs`. `next.config.mjs` applies route security headers and allows `127.0.0.1` as a development origin so local QA works on both `http://localhost:3000` and `http://127.0.0.1:3000` without blocking client hydration or HMR. `src/app/globals.css` defines SHRESTA wine/gold theme tokens with Tailwind `@theme` variables so reference-style classes and arbitrary SHRESTA CSS variables compile into the browser bundle. The storefront and admin pages depend on this tooling; removing the PostCSS adapter causes layouts to degrade into plain document flow.

## Folder Hierarchy

- `src/app`: routes, layouts, route handlers, metadata.
- `src/components/ui`: reusable design primitives.
- `src/features/auth`: OTP login, session state integration.
- `src/features/location`: address and delivery zone UX.
- `src/features/catalog`: category configuration contract, listing, PDP, media gallery.
- `src/features/storefront`: backend-owned home page contract and media metadata.
- `src/features/admin`: server-side admin API bridge for assets and categories.
- `src/features/search`: query input, autocomplete, filters, results.
- `src/features/cart`: cart drawer/page and optimistic mutations.
- `src/features/checkout`: checkout form, pricing display, payment initiation.
- `src/features/order`: order confirmation, history, tracking.
- `src/features/delivery`: ETA, rider tracking, OTP display.
- `src/features/recommendations`: home/PDP/cart/order recommendation strips.
- `src/lib`: API client, currency, Cloudinary, query keys, telemetry, type guards.
- `src/styles`: global styles and tokens.

## Component Relationships

Route components compose feature modules. Feature modules compose shared UI primitives. Shared UI primitives must not import feature modules. Data-fetching hooks live inside features or `src/lib/api` and use TanStack Query.

Important components planned:

- `AppShell`
- `LocationBanner`
- `BottomNavigation`
- `ResponsiveMedia`
- `ProductCard`
- `PriceDisplay`
- `CloudinaryImage`
- `CategoryFilterPanel`
- `SearchBox`
- `CartDrawer`
- `CartItemRow`
- `CheckoutSummary`
- `PaymentButton`
- `OrderTimeline`
- `DeliveryTracker`
- `RecommendationRail`
- `AdminMetricTile`
- `AdminAuditTimeline`

## State Model

Server state:

- Catalog, search results, product detail, availability, cart, checkout session, payment status, order status, profile, addresses, recommendations.
- Owned by TanStack Query.

UI-only state:

- Drawer open/closed, modal visibility, selected tab, temporary panel expansion, local visual preferences.
- Owned by Zustand.

Form state:

- React Hook Form and Zod.

## API Dependencies

The frontend depends on backend APIs under `/api/v1`:

- Auth: OTP request/verify, refresh, logout.
- Location: coverage, address save, ETA.
- Catalog: product listing/detail, implemented category config contract through `fetchCategoryFamilies`.
- Storefront: implemented home contract through `fetchStorefrontHome` and store locator contract through `fetchStorefrontStores`.
- Search: query, autocomplete, filters.
- Cart: cart read/mutate.
- Checkout: initiate, coupon validation.
- Payment: payment intent and status.
- Orders: customer order placement and status through the same-origin `/api/customer-orders` proxy, plus future history/tracking.
- Delivery: live tracking and OTP-related display data.
- Admin: implemented asset, category, ACL, and review queue operations through server actions and the server-only admin API bridge.

Generated OpenAPI types become the source of TypeScript API contracts after backend contracts exist.

## Business Rules

- Show paise through `formatPaise`.
- Never derive trusted order totals in the browser.
- Never persist or treat full Cloudinary URLs as domain truth.
- Filter UI is generated from category config.
- Category configuration is fetched through `GET /api/v1/categories` using the shared API client.
- Storefront, category, asset, and product-like merchandising data must come from backend APIs, never frontend constants.
- Backend API connection failures and backend API 404 responses render a shared API-not-reachable state for customer/admin pages instead of exposing a framework error overlay.
- Frontend routes that do not exist render the shared SHRESTA page-not-available route, while unexpected production render failures render the shared page-could-not-load boundary.
- Non-product presentation assets and UI copy/config may live in the frontend when needed to preserve the old SHRESTA reference UI exactly.
- Customer-facing UI copy must stay implementation-free: do not expose terms such as backend, API, DB, KV, S3, CDN, metadata, contract, snapshots, or events on storefront, store, cart, checkout, login, utility, or unavailable pages.
- Product counts, SKU values, prices, category membership, product images, asset metadata, and category configuration must be rendered exactly from backend responses.
- Featured collections may use backend `productBadgeFilters`; every collection and category route must resolve those filters with the same normalized badge-token logic rather than slug-specific exceptions.
- Admin write server actions must forward `Idempotency-Key` to SHRESTA-BE and keep `SHRESTA_ADMIN_API_KEY` server-only.
- Admin SKU choices must come from backend product records, not inferred asset metadata.
- Admin tag and badge controls normalize enum-like values to uppercase strings containing only `A-Z`, `0-9`, `_`, or `-`; customer surfaces may render those values as human-readable labels.
- Admin create/update/archive/delete actions submit governed change requests before reviewer approval; normal admin pages must not directly remove records.
- Admin ACL uses four coarse roles only: `SUPER_ADMIN`, `CHANGE_SUBMITTER`, `CHANGE_REVIEWER`, and `CHANGE_MANAGER`.
- Cart mutations may be optimistic but must rollback on API failure.
- Cart viewing, wishlist viewing, and checkout review are public. Customer login is required when clicking Proceed To Checkout to create a backend 15-minute checkout order ID, and again at final confirm-and-pay/order placement if the session is no longer valid.
- Proceed To Checkout must call `/api/customer-orders/draft` for logged-in customers, store only draft metadata locally, and navigate to checkout only after SHRESTA-BE returns the orderId.
- If cart contents change after a checkout order ID is created, the frontend clears local draft metadata and SHRESTA-BE invalidates old ACTIVE drafts on the next proceed-to-checkout request.
- Phase 1 browser cart/wishlist state may persist only product IDs and quantities; product names, prices, SKU, categories, badges, and images must resolve from backend storefront product data before rendering.
- Checkout requires a selected saved address with resolved zone/warehouse.
- Product and recommendation surfaces must respect inventory and deliverability.

## Authentication and Security

Use httpOnly refresh cookies and short-lived access tokens coordinated with the backend. Avoid localStorage token persistence. Sensitive pages are CSR and protected by auth-aware API calls. Public pages must still avoid leaking private data through caches.

## Performance

Budget:

- LCP less than 2.5 seconds.
- CLS less than 0.1.
- TTI less than 3.5 seconds on 4G target devices.
- Add-to-cart perceived feedback under 100 ms.

Strategies:

- Stable image dimensions.
- Backend/CDN-provided responsive image variants, WebP/AVIF source sets when available, LQIP backgrounds, lazy loading, LCP eager loading, prefetch for likely next media, and versioned/cache-busted media URLs supplied by SHRESTA-BE.
- Skeletons over spinners.
- Prefetch next likely category/PDP data.
- Keep checkout bundle small and load Razorpay only when required.

## Testing

- Vitest for utilities, hooks, and components.
- React Testing Library for component behavior.
- MSW for API integration tests.
- Playwright for checkout, discovery, auth, and order tracking.
- Lighthouse CI for performance budgets.

## Dependency Notes

- The web foundation uses the secure Next.js 16 line while preserving the source architecture requirement of Next.js App Router 14+.
- Next.js, React, `eslint-config-next`, ESLint, Vitest, Vite, and PostCSS are kept on mutually compatible versions so `npm audit` does not require forced breaking upgrades immediately after initialization.
- Tailwind CSS v4 requires `@tailwindcss/postcss` plus `postcss.config.mjs`; both are production dependencies for compiling SHRESTA storefront/admin utility classes.
- The store locator uses `leaflet` with a client-only dynamic map component so backend store coordinates render on an interactive India map without breaking SSR.
- Current audit status has one documented temporary exception: Next 16.2.10 contains a nested PostCSS advisory that npm only proposes to fix by downgrading to Next 9. See `.ai/adr/0004-temporary-next-postcss-audit-exception.md`.
- Dependency changes must be reflected in `package-lock.json` and this knowledge base when they affect tooling, runtime behavior, build output, or developer workflow.

## Implemented API Client and Category Contract

`src/lib/api-client.ts` is the shared backend API boundary. It unwraps SHRESTA `ApiResponse` envelopes, preserves backend `traceId`, and throws `ShrestaApiError` with status, code, message, and trace ID when ordinary API requests fail. Network-level fetch failures and backend API route 404 responses are classified as `ShrestaApiUnavailableError` so page loaders can render a single customer-safe service-unavailable state instead of the Next.js runtime overlay.

`src/features/catalog/category-config.ts` defines the frontend contract for `GET /api/v1/categories`, including category families, product types, attributes, filters, GST basis-point taxes, and styling rules. Filter backend mappings are typed as `attribute_facets.{attribute_key}` so filter UI can be generated from backend configuration.

`src/features/storefront/storefront-home.ts` defines the frontend contract for `GET /api/v1/storefront/home`. The home page and customer browse surfaces render SHRESTA brand/navigation/hero/trust/collections/bestsellers/material/newsletter/product-like merchandising data from the backend response and use `ResponsiveMedia` for variant-aware images. `ProductCard.description` and `ProductCard.longDescription` are backend-owned customer-facing copy and are used by PDPs.

`src/features/storefront/storefront-page-data.ts` is the customer page data aggregator. It fetches backend-owned home and category configuration data together, maps URL slugs to category family keys, resolves public plural aliases such as `silk-sarees` and `sarees`, resolves featured collections, filters product-like merchandising records by family/query, applies generic backend `productBadgeFilters` for any collection, and selects related products for PDP surfaces. It returns `null` only when SHRESTA-BE is unreachable or a backend API endpoint returns 404, allowing storefront routes to show the shared API-not-reachable state. It must not introduce FE-owned product, category, collection, or store datasets.

`src/features/storefront/store-selection.ts` contains pure store locator selection helpers. It selects the only matching backend store when text search narrows results to one store and clears selections hidden by active filters.

`src/components/storefront/storefront-home-experience.tsx` is the customer storefront shell. It adapts the old SHRESTA reference wine/gold UI into the current backend-driven architecture: announcement bar, sticky header, mobile menu, desktop mega menu, full-bleed hero carousel, trust bar, category cards, product grid, why-SHRESTA section, material showcase, newsletter, footer, mobile bottom navigation, mobile search dialog, and live-chat entry. The small-screen bottom-nav Search control opens a visible in-page search dialog first and only navigates to `/products` after a submitted query or selected quick link. It uses the reference lucide icon language and framer-motion hover/carousel behavior. It receives backend catalog data and local UI state; it must not introduce frontend-owned product, asset, or category datasets.

`src/components/storefront/storefront-browse-experience.tsx` implements the reference-aligned customer page family beyond home: `/products`, `/categories`, `/categories/[slug]`, `/collections`, `/collections/[slug]`, `/products/[slug]`, `/stores`, and utility customer pages. Product listing pages follow the old reference structure with a title band, horizontal price chips, reference-style collapsible filter sidebar, grid/list toggle, sort selector, active filter chips, compact cards, and functional pagination. Customer catalog listing routes show exactly 8 products per page after the backend-provided product set is filtered and sorted; the active page is reflected in the `page` query parameter, and filter/sort changes return the customer to page 1. The filter UI keeps the old SHRESTA interaction pattern: desktop uses a left sticky sidebar, while phone/tablet widths show a compact Filters button that opens a right-side drawer instead of rendering the full sidebar expanded inline. The filter panel includes the icon header, active chips, collapsible sections, selected-count badges, gold checkbox rows, category navigation, full-width manual min/max price inputs, formatted manual range preview, and clear-all behavior. The horizontal price chips remain quick presets; sidebar price controls must not duplicate those preset buckets. On phone widths, price chips become compact one-line pills in a two-column grid so every preset is visible without clipping or page overflow; wider widths may use an internal rail if needed. Customer-facing filter price labels use the `₹` symbol. Manual price fields render empty by default with no visible placeholder text; `Min price` and `Max price` labels provide the input meaning. Filter options/counts are generated from backend product/category responses only. PDPs follow the old reference structure with breadcrumb, large media panel, wishlist/share overlay actions, discount badges, quantity stepper, add-to-cart, certification panel, trust strip, backend-provided short/long descriptions, specifications, and related products. Customer-facing pages must not leak internal architecture wording such as backend, API, DB, KV, S3, CDN, metadata, contract, snapshots, or events; listing headings, store map helper text, recommendations, and utility/legal pages use SHRESTA/customer wording. Collections use backend featured collection cards. Stores use `GET /api/v1/storefront/stores` for store records, city/state filters, service modes, contact details, selectable list cards, a client-only Leaflet/OpenStreetMap India coverage map, search-to-store zoom behavior, visit-benefit cards, and appointment CTA.

Responsive quality is mandatory for every current and future frontend screen. UI changes must be checked top-to-bottom across mobile, tablet, laptop, desktop, and wide monitor viewports, including opened filters/menus, admin tables, forms, sticky navigation, chat, cart/checkout, and long content states. The required workflow is review, identify issues, fix, code review, and re-review until page-level overflow, clipping, unreadable controls, and broken interaction states are resolved.

`src/components/storefront/storefront-leaflet-map.tsx` is the client-only Leaflet adapter for the store locator. It imports Leaflet inside the client effect so SSR stays safe without stranding the map behind a `next/dynamic` client-rendering bailout. It renders SHRESTA-styled markers from backend latitude/longitude, escapes backend text before creating Leaflet popups, fits all visible stores when no store is selected, and flies to zoom level 14 when a store is selected from search, list, or marker click.

`src/features/cart/browser-cart.ts` and `src/features/wishlist/browser-wishlist.ts` provide Phase 1 browser continuity for cart and wishlist. They intentionally persist only product identifiers and quantities. `src/components/storefront/storefront-cart-experience.tsx` renders cart, wishlist, and checkout pages by resolving those identifiers against backend storefront products from `GET /api/v1/storefront/home`. The cart page uses reference-inspired item rows, quantity steppers, order summary, and free-delivery progress. Its Proceed To Checkout button checks `/api/customer-profile`; signed-out customers see the login-required dialog, while signed-in customers call `createCustomerOrderDraft` through `/api/customer-orders/draft`. That draft call returns a backend `orderId`, customer-readable draft number, server cart signature, expiry, totals, and item snapshots for a 15-minute checkout window; the browser stores only draft metadata and routes to `/checkout?orderId=...`. Cart edits clear local draft metadata, and SHRESTA-BE invalidates changed-cart ACTIVE drafts on the next proceed attempt. The wishlist page uses a saved-product grid with add-to-cart actions. The checkout page remains publicly viewable through details, delivery, payment, and review steps, but final placement requires a locally valid, unexpired, cart-matched draft. Checkout delivery options must read like quick commerce, using minutes/hours/same-day slots rather than multi-day shipping promises. Detail inputs use inline regex validation after blur and the segmented India +91 phone control. At final confirm-and-pay it requires a valid backend customer session, calls `placeCustomerOrder`, forwards `draftOrderId` and an idempotency key to `/api/customer-orders`, shows the persisted backend order number/status events on success, and clears browser cart state only after SHRESTA-BE confirms the order. Visible cart and checkout status text uses customer-safe SHRESTA language instead of implementation details.

`src/features/auth/customer-session.ts` and `src/features/auth/use-customer-session.ts` define the customer login/profile client contract. Login input shape is validated in the browser, but session truth is backend-owned: `/api/customer-login` proxies to SHRESTA-BE, stores the opaque backend session token in an HTTP-only `shresta_customer_session` cookie, and returns only safe profile summary data to React. `/api/customer-profile` reads the HTTP-only cookie and asks `GET /api/v1/customer/profile` for the active profile. `/api/customer-logout` revokes the backend session and clears the cookie. No customer session token is stored in localStorage.

`src/features/orders/customer-orders.ts` and the route handlers under `src/app/api/customer-orders` define the customer checkout draft, order placement, and profile order-history boundary. The browser sends product IDs and quantities to `/api/customer-orders/draft`; the proxy reads the HTTP-only customer session cookie, requires `Idempotency-Key`, and forwards draft creation to `POST /api/v1/customer/orders/draft`. The browser then sends `draftOrderId`, product IDs, quantities, contact data, delivery mode, payment method, and shipping address to `/api/customer-orders`; that proxy forwards placement to `POST /api/v1/customer/orders`. Profile order history uses `GET /api/v1/customer/orders`, and order status reads use `GET /api/v1/customer/orders/{orderNumber}` through the same cookie-backed proxy. The frontend must treat returned draft/order totals, summaries, item snapshots, and status events as backend truth.

`src/components/storefront/customer-login-experience.tsx` is the customer login surface. It is reachable manually from `/login` and from the desktop account icon/profile route. In local/dev/UAT it can show the seeded `testuser@gmail.com` + `123456` helper when `NODE_ENV !== "production"` or `NEXT_PUBLIC_SHRESTA_ALLOW_UAT_LOGIN=true`; production builds show normal OTP copy. `src/components/storefront/customer-account-experience.tsx` is the profile page at `/account`: signed-out customers see a manual Login to account CTA, signed-in customers see verified profile details from SHRESTA-BE, customer ID, mapped identity status, placed order history, Sign out, and Switch account actions.

`src/components/storefront/customer-chat-widget.tsx` is the SHRESTA Assistant entry. The closed state follows the old SHRESTA reference live-chat pill: compact icon at rest, unread ping, and hover/focus reveal of "Chat with us". Clicking opens an old-reference-style 380x520 wine/gold support panel with SHRESTA Support header, online status, message bubbles, quick action pills, message composer, and operating-hours note. Messages are sent to `/api/customer-chat`, which proxies to `POST /api/v1/customer/chat/messages`; SHRESTA-BE persists chat sessions/messages and returns assistant replies. The widget supports anonymous exploration help and directs private order support back to login/account flows.

`src/components/storefront/storefront-home-experience.tsx` owns the shared customer footer. The footer keeps the reference wine surface and uses a visible white divider between the upper footer content and the bottom copyright/policy strip.

`src/components/storefront/product-image-badge.tsx` renders product image badges as compact icon-only overlays with custom hover/focus labels. Product badge values remain backend-owned enum data from storefront product responses; the frontend only maps known enum-like values to lucide icons for presentation and does not use native browser `title` tooltips that can overlap the image. Hover labels must always stay inside the product image box, open inward from the top-left badge row, and wrap within bounded two-line pills rather than escaping under or outside the media frame.

`src/components/storefront/responsive-media.tsx` renders backend-provided media through `<picture>` with AVIF, WebP, and fallback source sets. It preserves dimensions, uses LQIP as the image background, marks hero images eager/high priority, lazy-loads non-critical media, can emit a prefetch link for likely next views, retries the backend original asset URL when a chosen variant fails, and silently falls back to a branded SHRESTA surface if customer-facing images still fail. Explicit broken-image errors are only shown in admin asset management.

`src/features/admin/admin-api.ts` is a server-side admin bridge. `/admin` is an API-backed catalog operations overview for asset/category health, catalog data coverage, and pending reviews; it is not a frontend presentation/copy editor. `/admin/assets` fetches existing backend catalog assets and supports search/filter by category family, category product type/subcategory, SKU, and status; operational stats; upload; existing image replacement; metadata review requests; bulk category/subcategory assignment review requests; archive/delete review requests; variant preview; broken-image warnings; and optimization stats. Brand/system chrome such as the SHRESTA logo is excluded by the backend asset API and is not editable in the dashboard. Asset metadata forms include categoryFamilyKey, categoryProductTypeKey, productSku, tags, alt text, SEO fields, backend S3/CDN URLs, LQIP, and generated variants. SKU controls are populated from backend product records; category/subcategory controls come from backend category configuration; tag controls are searchable multi-select dropdowns normalized by `src/lib/admin-enums.ts`. Admin asset tags must match the backend `media_assets.tags` contract: uppercase token values only, 40 characters per tag, and 16 tags per asset. Top-level admin copy uses operations words such as details, fields, facet mapping, governed updates, and service unavailable while preserving required payload field names under the hood. `/admin/categories` fetches existing category configuration and submits create/update/archive/delete review requests for families, subcategories, attributes, filters, tax rules, and styling rules. `/admin/review` lists pending change requests and provides reviewer approve/reject actions. Admin page loaders wrap SHRESTA-BE fetches with `nullWhenShrestaApiUnavailable` and show `AdminApiUnavailable` for backend-down or backend API 404 cases. All admin forms include hidden idempotency keys consumed by `src/app/admin/actions.ts`.

Admin pages are server-rendered and use server actions so `SHRESTA_ADMIN_API_KEY` is never exposed to the browser. Mutating actions revalidate the impacted admin routes after successful backend writes.

## Deployment

Phase 1 targets Vercel or equivalent Next.js hosting with environment variables and preview deployments. Phase 2 adds CloudFront/edge integration as backend infrastructure moves to AWS.

The frontend README is intentionally limited to repository-specific operational notes: dependencies, local environment setup, development and production commands, verification gates, and troubleshooting. Product features, architecture decisions, and roadmap notes belong in `.ai/` documents.

## CI

GitHub Actions workflow `.github/workflows/ci.yml` runs Node.js 22, `npm ci`, lint, Next type generation plus TypeScript, Vitest, production build, and high-severity npm audit gating.

## Developer Run Modes

- Development mode: create `.env.local`, run `npm ci`, then `npm run dev`; use `npm run dev -- -p 3001` when port `3000` is occupied.
- Production local mode: run `npm run build`, then `npm run start`; use `npm run start -- -p 3001` for an alternate port.
- Backend-connected mode: start SHRESTA-BE on `http://localhost:8080` and set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`.
- Verification gate: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
