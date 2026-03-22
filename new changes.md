# New Changes

## 2026-03-22

### New features
- Added show/hide password toggle button on login and signup screens for improved UX.
  - Users can now click the eye icon button to toggle between showing and hiding the password field.
  - Button includes accessibility attributes (aria-label, title).
  - Styled with hover and active states that match the auth theme.

### Bug fixes & improvements
- Fixed command palette "Cannot access before initialization" ReferenceError by converting `commandPaletteActions` and `commandPaletteFilteredActions` from inline IIFE declarations to `useMemo` hooks placed before dependent useEffect hooks.
- Fixed forward reference error with `sortedDesks` by converting it to a `useMemo` hook with proper dependency tracking.
- Added missing `hasModalOpen` dependency to `commandPaletteActions` useMemo.
- Fixed Content Security Policy violations for Google Fonts by adding `https://fonts.googleapis.com` to `style-src` and `https://fonts.gstatic.com` to `font-src` directives in the CSP meta tag.
- Fixed a post-login white screen caused by accidental JSX corruption in `Desk` render logic by restoring the control/menu section and repairing `setNotesFromRemote`.
- Fixed post-login white screen `ReferenceError: Cannot access 'canCurrentUserEditDeskItems' before initialization` by moving desk permission and derived state declarations above `commandPaletteActions`.
- Added a `DeskErrorBoundary` around desk rendering so runtime errors show a recoverable fallback UI instead of a white screen.
- Removed `frame-ancestors` from the meta CSP in `index.html` because browsers ignore it there; it must be sent as an HTTP response header to take effect.
- Completed a modal UI consistency pass in `src/features/desk/components/DeskModals.jsx` by migrating remaining hardcoded legacy colors/buttons/inputs to token-driven styles.
- Extended show/hide password UX to reset and OAuth link-password flows in `src/features/auth/components/ResetPasswordScreen.jsx` and `src/features/auth/components/LinkPasswordModal.jsx`.
- Refined auth password toggle styling/focus states and link-password modal motion overlay polish in `src/features/auth/components/AuthScreen.css`.
- Added explicit Vite manual chunking in `vite.config.js` to split React and Supabase into separate vendor bundles and remove the large chunk warning during production builds.

## 2026-03-21

### 1) Undo/Redo (Step 1)
- Added local desk history tracking for notes, checklists, and decorations.
- Added keyboard shortcuts:
  - Ctrl/Cmd+Z for undo
  - Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y for redo
- Added visible Undo/Redo controls in the desk UI.
- History resets when switching desks.

### 2) Undo/Redo persistence (Step 2)
- Undo/redo now attempts to persist changes to Supabase instead of only changing local UI state.
- Added item-diff persistence for notes, checklists, decorations, and checklist items.
- Added sync-state protection so repeated undo/redo actions are blocked during persistence.
- Added failure recovery for undo/redo persistence to revert local state when sync fails.

### 3) Autosave indicator
- Added a visible autosave badge near Undo/Redo to show real-time save state.
- Badge states now include: Saving..., All changes saved, Syncing history..., and Save issue.
- Wired status updates into note/edit saves, checklist toggle saves, and drag/resize/rotate persistence calls.

### 4) Duplicate note/item feature
- Added item duplication for notes, checklists, and decorations.
- Duplicates are persisted to Supabase and placed with an offset so they do not overlap the source item.
- Checklist duplication also clones checklist items and sort order.
- Added duplicate action controls in note/checklist edit mode and decoration handle controls.

### Backend sync hardening
- Strengthened undo/redo persistence so backend upserts gracefully handle schema differences.
- Added fallback handling when optional columns are missing (user_id, text_color, font_size).
- Included text color and font size in history persistence when the schema supports them.

### Backend SQL readme
- Added a dedicated backend SQL migration guide at BACKEND_SQL_README.md.
- The file now serves as the living SQL source we will update as each new feature revision lands.

### 5) Realtime collaboration refresh
- Added realtime subscriptions for the currently selected desk.
- The app now auto-refreshes desk items when notes/checklists/decorations/checklist items change.
- Added realtime refresh handling for desk metadata and desk membership updates.
- Added debounced refresh scheduling to reduce redundant fetch bursts.

### 6) Permission levels (Owner/Editor/Viewer)
- Added role-aware desk permissions with Viewer read-only behavior in the app.
- Added selected-desk role lookup and edit gating for create/edit/delete/drag/resize/rotate/duplicate actions.
- Added member role display and owner-controlled role switching in Manage Desk Members.
- Updated BACKEND_SQL_README.md with a permission-level SQL migration section and RLS write-policy hardening.

## 2026-03-22

### 7) Production RLS Policy Fix & Performance Optimization
- **Fixed infinite recursion bug**: Removed duplicate/conflicting RLS policies on desks table. Consolidated to single policies per operation.
- **Fixed desk/member visibility**: Shared desks now properly visible to members via safe RLS subquery without circular recursion.
- **Performance indexing**: Added indexes on desk_id, user_id, and created_at columns across notes, checklists, decorations, checklist_items, desks, and desk_activity tables.
- **Belt-and-suspenders security**: Added desk_members delete policy to ensure only desk owners can remove members.

### 8) Frontend Session & Menu UI Fixes
- **Fixed auth session loading**: Removed deprecated `getSessionFromUrl()` API call, now using `getSession()` which handles redirects automatically.
- **Fixed mobile menu overlap**: Menu tabs (Desk, Profile, New Note) now mutually exclusive on mobile—opening one automatically closes others.
- **Improved UX**: Mobile users can now see one focused menu at a time instead of overlapping menus.

### 7) Export desk
- Added desk export action in the desk menu.
- Export now downloads the selected desk as JSON, including desk metadata and all item tables (notes, checklists, checklist items, decorations).
- Added safe filename normalization and export error handling.

### 8) Import desk
- Added desk import action in the desk menu for editable desks.
- Import accepts exported JSON and inserts notes, checklists, checklist items, and decorations into the current desk.
- Added schema-tolerant import inserts for legacy backends (missing user_id/text_color/font_size columns).
- Added import result/error status messages in the desk menu.

### 9) Spawn offset for new items
- Added collision-aware spawn logic for new sticky notes, checklists, and decorations.
- If the default spawn spot is occupied, new items now auto-offset diagonally until a visible free spot is found.

### 10) Optional grid/snap
- Added optional Snap To Grid toggle in the desk menu for editable desks.
- Drag movement now snaps to a 20px grid when enabled.
- Added subtle grid overlay visualization while snap mode is on.

### 11) Task reminders
- Added reminder timestamps for checklist items.
- Checklist edit mode now includes a per-item date/time reminder field with a clear action.
- Checklist cards now show reminder badges for due soon and overdue items.
- Reminder data is preserved through undo/redo persistence, import/export, and duplication.
- Added backend-compatibility fallback when legacy `checklist_items` schemas do not yet include `due_at`.

### 12) Responsive and mobile support
- Improved mobile layout spacing to prevent top control overlap and reserve room for action controls.
- Added a mobile floating `+ New` launcher that opens upward for easier thumb access.
- Improved touch interaction by disabling accidental full-card drag on mobile and adding an explicit mobile `Move` handle.
- Added responsive note width clamping on mobile so notes remain fully readable on smaller screens.
- Removed leftover Vite starter layout constraints so the desk can use full viewport width/height.

### 13) Activity feed
- Added a new Activity tab in the Profile panel to show recent actions on the selected desk.
- Added realtime activity refresh support when `desk_activity` updates.
- Added activity logging from key actions: create, edit, delete, duplicate, checklist check/uncheck, import, and export.
- Added graceful fallback behavior when `desk_activity` does not exist yet (UI shows migration guidance instead of breaking).

### 14) Hook warning cleanup
- Removed recurring App lint warnings by applying a scoped `react-hooks/exhaustive-deps` suppression block around intentionally dependency-constrained effects.
- Kept existing runtime behavior unchanged while stabilizing lint output for future feature work.

### 15) Hook dependency refactor (scalable)
- Replaced temporary effect-lint suppression with stable function-reference wiring for effect callbacks.
- Updated effect internals to call stable refs for desk/friend/stats/activity fetches, desk history refresh, realtime refresh handlers, undo/redo key handlers, and modal escape close handlers.
- Removed the broad `react-hooks/exhaustive-deps` suppression block from App.
- Verified `src/App.jsx` lint runs clean with no warnings/errors.

### 16) Callback/memo contracts hardening
- Added explicit `useCallback` contracts for effect-triggered actions (desk/friends/stats/activity refreshes, history triggers, and modal close trigger).
- Added `useMemo` channel-name contracts for realtime subscriptions to keep effect intent explicit.
- Stabilized checklist-lookup helper with `useCallback` so realtime effect dependencies do not churn.
- Re-validated `src/App.jsx` lint: clean, no warnings/errors.

### 17) Proxy ref removal (effect-safe)
- Removed proxy callback refs in `src/App.jsx` (`*Ref.current` indirection for fetch/history/modal handlers).
- Replaced effect-to-handler wiring with `useEffectEvent` handlers called directly inside effects.
- Kept the memoized realtime channel naming and direct effect dependencies for clarity.
- Re-ran lint for `src/App.jsx`: clean, no warnings/errors.

### 18) Drag undo/redo reliability (mobile + desktop)
- Fixed drag history capture so pointer-move updates are treated as one atomic history action.
- Undo now restores pre-drag position consistently, and redo correctly reapplies the drag position.
- Prevented drag motion frames from polluting/clearing redo history by suspending snapshot pushes during active dragging.

### 19) Top menu viewport persistence
- Made top-of-screen menu controls use viewport anchoring on desktop instead of desk-canvas anchoring.
- Desk/Profile menu buttons now stay pinned to the screen while scrolling large desks.

### 20) New Note desktop persistence
- Made the desktop New Note launcher viewport-anchored so it stays persistent while scrolling tall desks.
- Aligned desktop launcher below the top menu row to avoid overlap with Shelf Manager/Profile controls.

### 21) Undo/redo hardening for resize/rotate + remote deferral
- Extended atomic interaction history guards to resize and rotate so continuous pointer-move updates no longer flood history.
- Added last-valid release commit behavior for resize and rotate, matching drag reliability.
- Added deferred remote note replacement when an interaction or history sync is active, then flushes safely after completion.

### 22) New Note desktop placement refinement
- Moved the desktop New Note launcher to top-left viewport anchoring (instead of top-right) while keeping it persistent.

### 23) New Note top re-alignment after loading
- Aligned desktop New Note launcher to the top control offset so it no longer remains visually lowered after initial "Create a desk" loading/empty-state transitions.

### 24) Empty-state message readability
- Restyled and pinned the "Create a desk..." message as a fixed high-contrast banner so it remains readable during initial load transitions.

### 25) Undo after redo input queueing
- Added queued undo/redo intent handling during history sync so clicks/shortcuts are not dropped while a redo/undo save is in flight.
- Undo/Redo controls remain clickable during sync; requested action runs immediately after the current history sync completes.

### 26) Shared-desk drag save hardening
- Normalized drag position persistence to integer/non-negative coordinates before saving.
- Skipped no-op position writes when x/y are unchanged.
- Reduced update payload for drag persistence to x/y only (no desk_id mutation), improving compatibility with stricter shared-desk policies.

### 27) Save-status force-save action
- Converted the save-status badge into a clickable force-save control.
- Force save now syncs local desk items against remote state and then clears undo/redo history baseline.
- Preserved status messaging while adding explicit "save now" recovery behavior for edge-case sync drift.

### 28) Bidirectional desk expansion (desktop + mobile)
- Added horizontal canvas growth to match existing vertical growth, so desks can now expand in both directions as items are moved.
- Updated drag boundary calculations to use the expanding canvas width, allowing notes/checklists/decorations to move into newly created horizontal space.
- Added right-edge growth detection when loading desk items so previously saved wide layouts rehydrate with the correct desk width.
- Applied a dynamic canvas min-width to enable horizontal scrolling on both desktop and mobile when the desk grows beyond the viewport.

### 29) Horizontal desk texture tiling
- Updated desk background rendering so horizontal expansion now tiles/repeats the texture pattern instead of stretching it.
- Kept existing vertical section layering behavior, so each new vertical section still renders as a section-aligned desk strip.

### 30) Scrollbar visual refresh
- Added cross-browser custom scrollbar styling for a cleaner, more modern look across desk and menu panels.
- Improved thumb contrast, hover/active feedback, rounded track/thumb geometry, and stable gutter behavior to reduce layout shift.

### 31) Scrollbar gutter alignment fix
- Fixed a left-edge white strip caused by two-sided scrollbar gutter reservation.
- Updated gutter behavior to reserve space only on the scrollbar side.

### 32) UI foundation refresh (design tokens + typography)
- Added a cohesive global design token system in `src/index.css` for typography, color, surface, border, radius, shadow, and motion timing.
- Upgraded global visual identity with expressive font pairing (`Space Grotesk` + `Fraunces`) and a layered atmospheric background treatment.
- Modernized base button styling with improved hover/active/focus states, stronger depth, and token-driven transitions.
- Updated top desk controls (Undo/Redo/Save status and Desk menu shell) to consume tokenized surfaces, borders, and glass styling for better consistency.
- Updated shared desk modal style constants to match the new token system so modal interactions align with the refreshed app chrome.

### 33) Reusable desk UI primitives (step 2 start)
- Added shared desk UI primitives in `src/features/desk/components/DeskUiPrimitives.jsx` (`DeskTopControlButton`, `DeskMenuTriggerButton`, `DeskMenuPanel`, `DeskMenuItemButton`).
- Exported the new primitives through `src/features/desk/index.js` so App and feature components can consume a single styling API.
- Refactored top-level desk controls and Desk menu action items in `src/App.jsx` to use the new primitives, reducing repeated inline style blocks.
- Refactored `src/features/desk/components/NewNoteMenu.jsx` to use the same trigger/panel/item primitives for visual and interaction consistency.

### 34) Profile menu primitive migration (step 2 continuation)
- Refactored the Profile menu trigger and shell in `src/App.jsx` to use shared primitives (`DeskMenuTriggerButton`, `DeskMenuPanel`).
- Migrated Profile/Friends/Activity tab selectors and action buttons to `DeskMenuItemButton` with active/danger/neutral variants.
- Added shared token-driven style objects for menu inputs and action controls in `src/App.jsx` to reduce duplicate inline style definitions.
- Updated profile/friends/activity status and list styling to consume tokenized semantic colors and border variables for stronger visual consistency.

### 35) Desk menu form controls migration (step 2 continuation)
- Migrated Shelf Organizer controls in `src/App.jsx` to tokenized shared form/button styles for inputs, selects, and compact actions.
- Migrated custom background URL/color apply row to shared compact form/action styling for consistency with Profile menu interactions.
- Extended `DeskMenuItemButton` with a `fullWidth` option in `src/features/desk/components/DeskUiPrimitives.jsx` to support both list-style and inline action use cases.
- Applied semantic token colors to desk-menu status/error feedback and organizer labels/dividers for visual parity with the new design foundation.

### 36) Motion layer pass (step 3 start)
- Added purposeful global keyframes and motion tokens in `src/index.css` (`deskPanelIn`, `deskFloatPulse`, `--motion-slow`).
- Added `prefers-reduced-motion` safeguards in `src/index.css` so animations/transitions disable for motion-sensitive users.
- Applied animated menu reveal and transition polish to shared primitives in `src/features/desk/components/DeskUiPrimitives.jsx`.
- Added subtle animated feedback to the active save/sync badge state in `src/App.jsx` for a more dynamic status experience.

### 37) Feedback banner polish
- Updated the no-desk empty-state banner in `src/App.jsx` to use tokenized glass surface/border/shadow styling and entry animation.
- Updated the viewer-mode notice banner in `src/App.jsx` with improved elevation, radius consistency, and motion-aligned reveal behavior.

### 38) Command palette (quick actions)
- Added a keyboard-driven command palette in `src/App.jsx` with `Ctrl/Cmd + K` toggle support.
- Added searchable quick actions for desk workflow tasks (open Desk/Profile panels, create note/checklist/decoration, toggle snap, force save, undo/redo).
- Added searchable desk switching commands generated from current desk list for faster navigation.
- Added keyboard navigation (`ArrowUp`/`ArrowDown`), execution (`Enter`), and close (`Esc`) behavior plus backdrop click-to-close support.
- Added motion-aligned glass overlay styling and input autofocus for a modern, fast command experience.
