# SHRESTA-WEB-FE AI Mind Map

```text
SHRESTA-WEB-FE
├── App Router
│   ├── / -> Storefront home, force-dynamic SSR
│   │   ├── fetchStorefrontHome -> GET /api/v1/storefront/home
│   │   ├── ResponsiveMedia -> variants, srcset, LQIP, eager hero media, lazy shelf media
│   │   └── Rule: all logo, navigation, hero, collection, product, trust, material, and newsletter content comes from BE
│   ├── /products -> Reference-style backend-driven listing with price chips, filters, grid/list toggle, sort, product cards
│   ├── /products/[slug] -> Backend-driven PDP with media, quantity, certification, trust strip, specs, related products
│   ├── /categories -> Category hub using backend featured collections and category families
│   ├── /categories/[slug] -> Backend-driven category/collection listing accepting public plural slugs and category family keys
│   ├── /collections -> Backend featured collection card grid matching old reference route shape
│   ├── /collections/[slug] -> Backend-driven collection listing
│   ├── /stores -> Backend-driven reference-style locator from GET /api/v1/storefront/stores
│   ├── /support and /support/[topic] -> Customer support routes linked from footer/live chat
│   ├── /privacy, /terms, /cookies, /newsletter -> Footer/newsletter routes to avoid linked 404s
│   ├── app/not-found -> Shared SHRESTA page-not-available UX for missing FE routes
│   ├── app/error -> Shared production page-could-not-load UX for unexpected render failures
│   ├── /cart -> Public browser-cart page resolving product IDs/quantities against backend storefront products; Proceed To Checkout requires login and creates backend draft orderId
│   ├── /login -> Customer login gate; exploration remains public
│   ├── /checkout -> Public checkout journey; final confirm requires active 15-minute draftOrderId, login, and real SHRESTA-BE order placement
│   ├── /orders -> Order history, CSR
│   ├── /orders/[id] -> Order tracking, CSR
│   ├── /account -> Profile center with customer ID, mapped identity status, and placed order summaries
│   ├── /admin -> API-backed asset/category operations overview, catalog data coverage, asset hygiene, review snapshot
│   ├── /admin/assets -> Server-rendered asset management dashboard
│   ├── /admin/categories -> Server-rendered category configuration dashboard
│   ├── /admin/merchandising -> Compatibility redirect to /admin/assets
│   ├── /admin/review -> Change-request reviewer queue
│   └── /api/health -> Web health route
├── Shared UI
│   ├── Styling Pipeline -> Tailwind CSS v4, @tailwindcss/postcss, postcss.config.mjs, SHRESTA @theme tokens in globals.css
│   ├── next.config.mjs -> route security headers plus localhost/127.0.0.1 dev-origin support for hydration and HMR
│   ├── Button and IconButton
│   ├── Input, Select, Checkbox, Toggle, Slider
│   ├── Sheet, Dialog, Popover, Tabs
│   ├── Badge, Skeleton, Toast
│   ├── Product image primitives
│   ├── BackendApiUnavailable -> shared customer/admin service-unavailable state for SHRESTA-BE network failure and backend API 404 with customer-safe copy
│   ├── PageNotAvailable -> shared missing FE route state
│   ├── ResponsiveMedia -> AVIF/WebP/fallback picture rendering
│   └── Loading, empty, error, offline states
├── Lib
│   ├── currency.ts -> formatPaise, paise type guard
│   ├── cloudinary.ts -> buildCloudinaryUrl from public_id
│   ├── api-client.ts -> requestApi, ApiResponseEnvelope, ShrestaApiError, ShrestaApiUnavailableError, trace ID preserving errors
│   ├── api-page-fallback.ts -> nullWhenShrestaApiUnavailable for SSR page loaders
│   ├── query-keys.ts -> stable TanStack Query keys
│   ├── env.ts -> environment validation
│   ├── telemetry.ts -> web vitals and behavior events
│   └── type-guards.ts -> unknown input narrowing
├── Auth Feature
│   ├── OTP request form
│   ├── OTP verify form
│   ├── Session refresh integration
│   └── Rules: no localStorage token persistence
├── Location Feature
│   ├── Address form
│   ├── Coverage checker
│   ├── Location banner
│   └── Workflow: save address -> backend returns zone/warehouse/ETA
├── Catalog Feature
│   ├── category-config.ts -> fetchCategoryFamilies, CategoryFamily, CategoryFilter
│   ├── API dependency: GET /api/v1/categories
│   ├── Category shelves
│   ├── ProductCard -> backend short/long customer-facing descriptions plus SKU, price, badges, media
│   ├── PriceDisplay
│   ├── CloudinaryImage
│   ├── PDP media gallery
│   ├── Attribute sections from category config
│   ├── SEO metadata generation
│   └── Rule: category UI contracts come from backend configuration, not hard-coded launch families
├── Storefront Feature
│   ├── storefront-home.ts -> StorefrontHome, MediaAsset, ProductCard, fetchStorefrontHome
│   ├── storefront-page-data.ts -> fetchStorefrontPageData, slug/category/collection/product resolvers
│   │   ├── slug aliases: silk-sarees -> silk_saree, sarees -> saree
│   │   ├── productsForCollection -> family filters plus generic backend productBadgeFilters for any collection
│   │   └── unavailable handling -> null only for SHRESTA-BE network failure or backend API 404
│   ├── storefront-stores.ts -> fetchStorefrontStores, StoreLocation contract
│   ├── store-selection.ts -> search focus selection for backend store records
│   ├── storefront-leaflet-map.tsx -> client-only Leaflet/OpenStreetMap map from backend lat/lng, with Leaflet imported inside the client effect
│   ├── storefront-home-experience.tsx -> reference-style wine/gold customer shell from backend data
│   ├── storefront-browse-experience.tsx -> reference-style listing, PDP, collections, stores, and utility routes
│   ├── product-image-badge.tsx -> icon-only media badge overlays; hover labels stay inside the image box and wrap within bounded pills
│   ├── API dependency: GET /api/v1/storefront/home
│   ├── API dependency: GET /api/v1/storefront/stores
│   ├── Home page sections: announcement, header, mega menu, hero carousel, trust, featured collections, bestsellers, why SHRESTA, material stories, newsletter, footer, mobile nav, mobile search dialog, live chat entry
│   ├── Browse page sections: old-reference title band, price quick filters, desktop sidebar, mobile filter drawer, grid/list toggle, sort, active filter chips, 8-products-per-page functional pagination
│   ├── Responsive rule: top-to-bottom review/identify/fix/rereview across mobile, tablet, laptop, desktop, and wide monitor viewports for every affected screen
│   ├── PDP sections: breadcrumb, media panel, wishlist/share overlay, discount badges, quantity stepper, certification panel, trust strip, backend short/long descriptions, specifications, related products
│   ├── Store locator sections: backend search filters, selectable list, Leaflet India map, selected-store zoom, store fulfillment details
│   ├── Media contract: assetKey, version, deliveryMode, dimensions, LQIP, variants
│   ├── Copy rule: visible customer text uses SHRESTA/customer wording and avoids backend, API, DB, KV, S3, CDN, metadata, contract, snapshots, or events
│   └── Rule: no storefront dataset, category asset, store, or product-like merchandising data is hard-coded in FE
├── Search Feature
│   ├── SearchBox
│   ├── Autocomplete
│   ├── FilterPanel
│   ├── SortControl
│   ├── SearchResultsGrid
│   └── Rules: facets are key:value strings from backend config
├── Cart Feature
│   ├── browser-cart.ts -> Phase 1 browser persistence with productId + quantity only
│   ├── StorefrontCartExperience -> cart rows, quantity stepper, summary, free-delivery progress, proceed-to-checkout login gate
│   ├── Proceed flow -> useCustomerSession -> createCustomerOrderDraft -> store draft metadata -> route to /checkout?orderId=...
│   ├── Add/update/remove/clear browser cart actions
│   ├── Draft hygiene -> cart edits clear local checkout draft and draft idempotency state
│   └── Rule: product details resolve from backend storefront products; browser totals are display estimates only
├── Checkout Feature
│   ├── StorefrontCheckoutExperience -> public checkout journey from browser cart + backend product data
│   ├── Checkout stepper: details -> delivery -> payment -> review -> processing -> success/error
│   ├── Draft order ID -> read local 15-minute checkout draft metadata; final confirm requires unexpired cart-matched draftOrderId
│   ├── Checkout summary from backend product records plus display-only delivery estimate
│   ├── Quick-commerce delivery options: scheduled 2-4 hr, priority 60-90 min, rapid 30-60 min
│   ├── Detail input validation: field-level regex errors after blur plus final submit gate
│   ├── Login-required Place Order dialog only at final review
│   ├── Uses useCustomerSession -> /api/customer-profile -> SHRESTA-BE session validation
│   ├── Uses createCustomerOrderDraft -> /api/customer-orders/draft -> SHRESTA-BE POST /api/v1/customer/orders/draft
│   ├── Uses placeCustomerOrder -> /api/customer-orders -> SHRESTA-BE POST /api/v1/customer/orders with draftOrderId
│   └── Rule: login is required at proceed-to-checkout draft creation and final confirm-and-pay/order placement; no trusted total computed in browser
├── Customer Auth Feature
│   ├── /login -> CustomerLoginExperience
│   ├── /account -> CustomerAccountExperience
│   ├── Header account icon -> manual login/profile entry
│   ├── /api/customer-login -> SHRESTA-BE login proxy + HTTP-only shresta_customer_session cookie
│   ├── /api/customer-profile -> SHRESTA-BE profile proxy using the HTTP-only cookie
│   ├── /api/customer-logout -> SHRESTA-BE logout proxy + cookie clear
│   ├── Account order panel -> GET /api/customer-orders summaries by authenticated customerId
│   └── Rule: React never owns or stores customer session tokens
├── Customer Chat Feature
│   ├── CustomerChatWidget -> icon-only floating SHRESTA Assistant
│   ├── Closed state: hover/focus reveals "Chat with us"
│   ├── Open state: assistant panel, persisted conversation id, quick actions, composer
│   ├── /api/customer-chat -> POST /api/v1/customer/chat/messages
│   └── Rule: anonymous exploration help is allowed; private order help redirects to login/account
├── Order Feature
│   ├── customer-orders.ts -> createCustomerOrderDraft, placeCustomerOrder, fetchCustomerOrders, CustomerOrderDraftResponse, CustomerOrderResponse, CustomerOrderSummary
│   ├── /api/customer-orders/draft -> same-origin POST proxy using HTTP-only shresta_customer_session cookie
│   ├── /api/customer-orders -> same-origin GET/POST proxy using HTTP-only shresta_customer_session cookie
│   ├── /api/customer-orders/[orderNumber] -> same-origin status proxy
│   ├── Checkout success state -> backend order number, statuses, and status events
│   ├── Future OrderHistory, OrderDetail, OrderTimeline routes
│   └── Rule: display frozen backend draft/order item snapshots and backend totals; final order placement must include draftOrderId
├── Delivery Feature
│   ├── DeliveryTracker
│   ├── EtaBadge
│   ├── RiderCard
│   ├── DeliveryOtpDisplay
│   └── Phase 2: SSE/WebSocket live GPS
├── Recommendation Feature
│   ├── Home rails
│   ├── PDP similar products
│   ├── Cart completion suggestions
│   └── Rule: inventory-filtered primary recommendations
├── Wishlist Feature
│   ├── browser-wishlist.ts -> Phase 1 browser persistence with product IDs only
│   ├── StorefrontWishlistExperience -> saved product grid from backend product data
│   ├── Add saved product to cart
│   └── Rule: wishlist viewing remains public and product truth remains backend-owned
├── Admin Feature
│   ├── admin-api.ts -> server-only bridge to SHRESTA-BE admin APIs
│   ├── actions.ts -> Server Actions with Idempotency-Key forwarding and revalidation
│   ├── admin-enums.ts -> shared enum/tag normalization; asset tags max 40 characters, 16 values, uppercase token format
│   ├── AdminApiUnavailable -> shared admin service-unavailable panel inside admin layout
│   ├── /admin/assets
│   │   ├── Existing asset search/filter/pagination
│   │   ├── Filters: category family, category product type/subcategory, SKU, status
│   │   ├── Operational stats: total, ready, archived, variant counts for visible result set
│   │   ├── Multi-file upload with category/subcategory/product SKU/alt/tags/SEO details
│   │   ├── Existing image replacement via multipart file upload, stable asset key, backend-regenerated S3/CDN variants
│   │   ├── Catalog details edit and archive/delete review-request flows
│   │   ├── SKU/category/subcategory/tag dropdowns from backend-owned options
│   │   ├── Tag inputs enforce the backend media_assets.tags 40-character/16-tag uppercase token contract
│   │   ├── Bulk category/subcategory assignment review request
│   │   └── Variant preview, backend S3/CDN URLs, and optimization statistics
│   ├── /admin/categories
│   │   ├── Existing family, subcategory, attribute, filter, tax, styling configuration
│   │   ├── Collapsible family/detail/config sections with per-family counts for readability
│   │   ├── Create/update/archive/delete request flows for every exposed DB-owned category configuration surface
│   │   └── Advanced details/rules JSON inputs for backend-owned flexible fields
│   ├── /admin/review
│   │   ├── ACL: CHANGE_REVIEWER
│   │   ├── Shows pending CREATE/UPDATE/ARCHIVE/DELETE requests
│   │   └── Approve/reject actions carry Idempotency-Key
│   ├── Security: SHRESTA_ADMIN_API_KEY remains server-only
│   ├── ACL roles: SUPER_ADMIN, CHANGE_SUBMITTER, CHANGE_REVIEWER, CHANGE_MANAGER
│   └── Future consoles: orders, inventory, logistics, payments, finance, customer support, audit log
└── Platform
    ├── TanStack Query -> server state
    ├── Zustand -> UI-only state
    ├── React Hook Form + Zod -> forms
    ├── Vitest + RTL -> unit/component tests
    ├── Playwright -> E2E
    ├── Lighthouse CI -> performance budgets
    ├── CI: GitHub Actions + Node 22 + npm ci + lint/typecheck/test/build + high audit gate
    ├── Dev runbook: README -> .env.local + npm ci + npm run dev + optional -p 3001
    ├── Prod runbook: README -> npm run build -> npm run start + required NEXT_PUBLIC_* vars
    └── Backend link: NEXT_PUBLIC_API_BASE_URL -> SHRESTA-BE http://localhost:8080 or deployed backend
```
