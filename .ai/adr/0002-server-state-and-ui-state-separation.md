# ADR 0002: Separate Server State From UI State

## Status

Accepted

## Decision

TanStack Query owns all server-originated data: catalog, inventory, cart responses, checkout sessions, orders, delivery tracking, recommendations, and customer profile. Zustand owns only local UI state such as cart drawer open state, modal state, selected tab, and ephemeral visual preferences.

## Consequences

- Optimistic cart updates remain rollback-safe.
- Server truth is consistently invalidated/refetched.
- UI stores cannot accidentally become stale copies of checkout, inventory, or order truth.
