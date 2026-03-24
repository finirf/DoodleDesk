# DoodleDesk

DoodleDesk is a React + Vite app for organizing notes, checklists, decorations, and collaborative desks backed by Supabase.

## Quick start

1. Install dependencies:
	- `npm install`
2. Run the app:
	- `npm run dev`
3. Build production bundle:
	- `npm run build`
4. Lint:
	- `npm run lint`

## Project structure

- `src/features/auth`: auth UI and session logic.
- `src/features/desk`: desk domain UI, hooks, constants, and utilities.
- `src/features/*/index.js`: feature-level public exports.
- `src/App.jsx`: top-level orchestration of auth + desk feature flows.
- `src/supabase.js`: shared Supabase client setup.
- `supabase/functions`: Edge Functions (`delete-account`, `friend-request-email`).

## Documentation map

- `BACKEND_SQL_README.md`: single source of truth for backend SQL migrations.
- `SUPABASE_UPDATES_2026_03_22.sql`: point-in-time SQL revision snapshot.
- `new changes.md`: running changelog for completed roadmap items.
- `docs/PROJECT_ORGANIZATION.md`: maintainability conventions and `src/App.jsx` decomposition plan.

## Backend setup

Use `BACKEND_SQL_README.md` as the canonical migration document and run sections in order.

## Current maintainability focus

The app is feature-organized already, but `src/App.jsx` is currently very large and should be split incrementally.

Recommended extraction order:

1. Undo/redo and history sync logic.
2. Realtime subscription and refresh orchestration.
3. Drag/resize/rotate interaction logic.
4. Profile/friends/activity data-loading actions.

Each extraction should move behavior into focused hooks under `src/features/desk` while keeping UI components mostly presentational.
