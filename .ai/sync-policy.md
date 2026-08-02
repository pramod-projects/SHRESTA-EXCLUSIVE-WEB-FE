# AI Synchronization Policy

No frontend change is complete unless its AI documentation is updated in the same change.

## Required Updates

Update `.ai/knowledge-base.md` when a change affects architecture, routes, feature responsibility, API dependencies, rendering strategy, design tokens, performance, security, or deployment.

Update `.ai/mind-map.md` when a route, component, hook, store, service, utility, API call, workflow, dependency, or important function is added, renamed, moved, or removed.

Update `.ai/business-rules.json` when UX, currency, cart, checkout, image, category, performance, or state-management rules change.

Update `.ai/architecture-map.json` when route rendering, feature ownership, module boundaries, or state ownership changes.

Create or update an ADR in `.ai/adr/` when a durable frontend decision is introduced.

Add or update sibling `.ai-context.json` files for significant components, hooks, stores, and utilities.

## Completion Checklist

- TypeScript passes with strict mode.
- Tests pass for changed utilities/components.
- Lighthouse budget impact is understood for user-facing route changes.
- API contract changes are reflected in generated types and docs.
- Mind map and knowledge base are updated.
- Accessibility and responsive viewport behavior are verified top-to-bottom for all affected screens across mobile, tablet, laptop, desktop, and wide monitor sizes.
