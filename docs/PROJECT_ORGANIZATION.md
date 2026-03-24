# Project Organization Guide

This document describes how DoodleDesk is organized today and how to keep it maintainable as features continue to grow.

## Current architecture

- `src/features/auth`: authentication state, screens, and auth-specific helpers.
- `src/features/desk`: desk domain concerns (UI primitives, modals, constants, hooks, data helpers, and utilities).
- `src/App.jsx`: app orchestration and cross-feature wiring.
- `src/supabase.js`: shared Supabase client.
- `supabase/functions`: edge functions for backend workflows.

## Core documentation ownership

- `README.md`: onboarding and architecture map only.
- `BACKEND_SQL_README.md`: canonical SQL migrations and backend policy updates.
- `new changes.md`: running changelog for roadmap deliveries.

## Modularity conventions

1. Keep feature boundaries strict.
- New desk behavior should live under `src/features/desk`.
- New auth behavior should live under `src/features/auth`.

2. Prefer extracting behavior to hooks.
- Place side-effect-heavy logic in dedicated hooks.
- Keep components as presentational as practical.

3. Keep utility functions pure.
- Put data normalization, formatting, and item math in `utils` files.
- Favor stateless helper functions to simplify testing.

4. Use feature index files as public APIs.
- Re-export only stable feature interfaces from `src/features/*/index.js`.
- Avoid deep imports from unrelated modules.

## App.jsx decomposition plan

`src/App.jsx` is currently the largest maintenance hotspot.

Recommended extraction order:

1. Desk history and undo/redo orchestration. (completed)
2. Realtime subscriptions and refresh scheduling. (completed)
3. Drag/resize/rotate interaction state handling. (completed)
4. Activity feed labeling/fetch/log flow. (completed)
5. Profile/friends data loading and mutations. (completed)
6. Command palette action construction and keyboard handling. (completed)
7. Desk settings/member/import-export actions. (completed)
8. Account deletion and friend action handlers. (completed)
9. Remaining desk CRUD/editing and persistence routines. (completed)

Current next steps:

1. Continue reducing `src/App.jsx` by extracting large JSX render blocks into presentational components.
2. Keep a stable validation cadence (`npm run dev`, `npm run lint`, `npm run build`) after each modularity phase.
3. Retire stale phase comments once the related extraction is complete.

For each extraction:

- Move logic to a dedicated hook under `src/features/desk/hooks`.
- Keep hook interfaces explicit (inputs/outputs documented at top of file).
- Replace inline blocks in `App.jsx` with hook calls.
- Validate behavior with lint and focused smoke tests.

## Cleanup policy

- Remove unused assets and stale starter files once unreferenced.
- Keep SQL blocks out of `README.md` to avoid duplicate migration sources.
- Update `new changes.md` for each completed change set.

## Definition of done for maintainability changes

A refactor is complete when:

- No behavior regression in desk interactions.
- `npm run lint` passes.
- `README.md` and `new changes.md` reflect the change.
- Relevant backend changes (if any) are documented in `BACKEND_SQL_README.md`.
