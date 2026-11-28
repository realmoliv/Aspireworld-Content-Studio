# Aspire World Content Studio — P0 Typing Latency Performance Report

**Branch:** `fix/typing-latency` (branched from `main` at `fbe1091`)  
**Scope:** Typing latency diagnosis, measurement, and fix only (no P1–P3 changes, no schema changes or migrations).

---

## 1. Measurement Method & Environment Safety

- **Harness:** [tests/perf/typing-latency-harness.mjs](file:///c:/Users/kumar/OneDrive/Desktop/AW-update/Aspire%20World%20Content%20Studio/tests/perf/typing-latency-harness.mjs)
- **Isolation:** Vite dev server runs with an empty temporary `envDir` pointing exclusively to an in-memory mock Supabase HTTP server on `127.0.0.1` (`45 ms` simulated write/read round-trip latency, `15` seeded items, `12` seeded leads). `.env` is never read; zero requests leave `127.0.0.1`.
- **Browser & Metrics Collection:** Headless Chromium (`1440×900`) driven over Chrome DevTools Protocol (`Input.dispatchKeyEvent` per character):
  - **Keystroke-to-Frame Latency (`mean` / `p95 ms`):** `performance.now()` from dispatching a character keystroke until the next `requestAnimationFrame` commits.
  - **React Commit & Component Re-render Counts:** Measured via injected `window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot`, walking committed React Fibers (`actualDuration > 0` or updated flags) for `ContentStudioApp`, `AppLayout`, `CalendarView`, `DetailDrawer`, `LeadsView`, and `ReferenceView`.
  - **Network Request Count:** Exact HTTP requests recorded by the local mock Supabase server (`writeRequestsDuringTyping`, `readRequestsDuringTyping`, and post-750ms debounce totals).
  - **Text Integrity (`valueEndsWithExpected`):** Checks whether the input DOM value after typing retains every typed character cleanly without drops or corruption.
- **BLOCKED Items (Live Environment):**
  - **Live hosted Supabase network / Realtime WebSocket profiling:** `BLOCKED` — production DB / remote execution is strictly prohibited by task rules, and `main` has no active `supabase.channel(...)` Realtime subscriptions.
  - **React DevTools GUI Profiler flamegraph export:** `BLOCKED` — headless CLI automation captures exact React Fiber `onCommitFiberRoot` counts programmatically instead of interactive browser extension UI.

---

## 2. Root Cause Evidence (`main` / `fbe1091`)

1. **Infinite Background Refetch & State Clobber Loop (`src/hooks/useContentStudio.ts`):**
   - `fetchTeamMembers()` (`useContentStudio.ts:155-190`) calls `setTeamMembers(combined)` producing a new array reference each run.
   - `fetchLeads` (`useContentStudio.ts:296-351`) declares `[teamMembers]` in its `useCallback` dependency array.
   - Initial `useEffect(() => { loadAll(); }, [fetchItems, fetchLeads, fetchTeamMembers])` (`useContentStudio.ts:354-368`) fires `fetchTeamMembers()` + `fetchItems()` + `fetchLeads()`, which replaces `teamMembers`, recreates `fetchLeads`, and re-triggers `loadAll()` continuously (~18–54 `GET /items`, `/leads`, `/profiles` requests per typing window).
   - Every `fetchItems()` / `fetchLeads()` resolution calls `setItems(mapped)` / `setLeads(...)` with server snapshots, **clobbering mid-keystroke user text** (`"Hero Launch Reel 0 Q4 Lh Cut"`, `"Wide studio shotht."`, `"Acme Brand Studio Eerrs"`).
2. **Supabase Network Write(s) Per Keystroke:**
   - `DetailDrawer.tsx` invokes `onUpdate` / `onCopy` synchronously inside `onChange` for `title`, `brief`, `copy.*`, `shots`, and `references`.
   - `useContentStudio.updateItem` and `updateCopy` immediately call `await supabase.from('items').update(...)` on every character.
   - Worse, editing any field in `shots` (`item_shots`) or `references` (`item_references`) triggers a `DELETE` followed by sequential `UPDATE` queries for **every row** on **every keystroke** (`84` write requests for `21` keystrokes in `detailShotVisual`; `42` writes for `14` keystrokes in `detailRefLabel`).
   - `LeadsView.tsx:247-252` (`update()`) calls `await onUpdateLead(id, patch)` **before** `setLeads(...)`, firing `PATCH /rest/v1/leads` + two `localStorage` JSON writes per keystroke (`p95 = 308.79 ms` in `leadsRowName`).
3. **Top-Level Shared State Re-Renders Whole App Tree:**
   - Every item or lead keystroke updates `localItems`/`items` or `localLeads`/`leads` in `ContentStudioApp` (`src/App.tsx`), forcing full re-renders of `ContentStudioApp`, `AppLayout`, the active screen (`CalendarView`, `BoardView`, or `LeadsView`), and `DetailDrawer`.
   - `ReferenceView` search state (`search` / `setSearch`) lives at `App.tsx:103`, re-rendering the entire `ContentStudioApp` shell on every search keystroke.
4. **Expensive Synchronous Work Per Keystroke & Unstable Props:**
   - `App.tsx:75-81` (`localStorage.setItem('aspire-leads', ...)`) and `useContentStudio.ts:132-143` (`saveLeadMetaCache`) serialize JSON on every lead keystroke; `App.tsx:123-127` writes `sessionStorage` per keystroke in demo mode.
   - `App.tsx:538-589` passes fresh inline callbacks on every render to `DetailDrawer` and view routes; `LeadsView` recomputes queue filters (`activeFollowUps`, `overdueLeads`, `todayLeads`, `upcomingLeads`, `filteredLeads`) unmemoized across both desktop table and mobile cards.
   - `DetailReferences` passes live keystrokes of `r.url` directly into `ReferenceEmbedPreview`, triggering URL regex parsing and embed mounts mid-typing.
5. **Realtime Echoes:**
   - `rg` confirms `main` has **no** active `supabase.channel(...)` Realtime subscriptions. However, `loadAll()` background fetches and `App.tsx:110-114` (`setLocalLeads(studio.leads)`) act as server-echo overwrites against active drafts unless guarded.

---

## 3. Complete Text Input & Textarea Audit (Before Fix)

| Location / Field | State Location | Updated On Keystroke | Supabase Call / Keystroke | Components Re-rendered / Keystroke |
|---|---|---|---|---|
| `DetailDrawer`: `title`, `brief` | `App.tsx` (`localItems`) + `useContentStudio` (`items`) | `localItems`, `items`, `sessionStorage` (demo) | Yes (`PATCH /items`) | `ContentStudioApp`, `AppLayout`, `CalendarView`/`BoardView`, `DetailDrawer` |
| `DetailDrawer`: `copy.onScreen`, `caption`, `hashtags`, `cta`, `script` (+ carousel `slides`) | `DetailDrawer` (`slides` local) + `App.tsx` + `useContentStudio` | `slides` (carousel), `localItems`, `items` | Yes (`PATCH /items`) | Same full tree (`ContentStudioApp` -> `DetailDrawer`) |
| `DetailDrawer`: `shots[i].order/visual/text` | `App.tsx` + `useContentStudio` | Full `shots` array on `items` | **Yes (`1 DELETE + N PATCHes` / keystroke)** | Same full tree |
| `DetailDrawer`: `references[i].label/url/instruction` | `App.tsx` + `useContentStudio` | Full `references` array + `ReferenceEmbedPreview` | **Yes (`1 DELETE + N PATCHes` / keystroke)** | Same full tree + `ReferenceEmbedPreview` |
| `DetailDrawer`: `comment` | Local `useState` in `DetailDrawer` | `DetailDrawer` only (`POST` on button click) | No | `DetailDrawer` (+ background `loadAll` loop) |
| `LeadsView`: expanded row `name`, `contact`, `service`, `budget` | `App.tsx` (`localLeads`) + `useContentStudio` (`leads`) | `localStorage` x2, `leads`, `localLeads`, KPI/queue derivation | Yes (`PATCH /leads`) | `ContentStudioApp`, `AppLayout`, `LeadsView` (table + mobile cards) |
| `LeadsView`: `searchQuery`, `holdNotes`, `customHoldReason`, `customDateReason`, `newActivityNote` | Local `useState` in `LeadsView` | `LeadsView` local state (+ filter/queue recompute) | No | `LeadsView` (+ background `loadAll` loop) |
| `ReferenceView`: library `search` | **`App.tsx:103` (`search`)** | Top-level `App` state + `filtered` list | No | `ContentStudioApp`, `AppLayout`, `ReferenceView` |
| `ReferenceView`: modal `newLabel`, `newUrl`, `newInstruction` | Local `useState` in `ReferenceView` | `ReferenceView` state (+ live preview on `newUrl`) | No | `ReferenceView` |
| `AuthView`: `fullName`, `email`, `password` | Local `useState` in `AuthView` | `AuthView` only | No | `AuthView` |

---

## 4. Measured BEFORE Baseline (Untouched `main` at `fbe1091`)

Command: `node tests/perf/typing-latency-harness.mjs baseline` (Exit `0`, mock Supabase `45 ms` latency, Chromium `1440×900`):

| Scenario (Keystrokes) | Mean / p95 Frame (ms) | Writes During / After | Reads During / After | Total Commits | `ContentStudioApp` Renders | Active View / Drawer Renders | Text Intact? |
|---|---:|---:|---:|---:|---:|---:|---|
| `detailTitle` (19 chars) | 27.63 / 76.63 | 19 / 19 | 18 / 42 | 32 | 32 | Cal: 32, Drawer: 32 | **NO** (`"Hero Launch Reel 0 Q4 Lh Cut"`) |
| `detailBrief` (22 chars) | 22.07 / 35.23 | 22 / 22 | 18 / 45 | 35 | 35 | Cal: 35, Drawer: 35 | **NO** (`" copy for item 1ighteook ming."`) |
| `detailCaption` (28 chars) | 28.85 / 76.98 | 28 / 28 | 27 / 54 | 45 | 45 | Cal: 45, Drawer: 45 | **NO** (`"n body Link in bio for fl ide."`) |
| `detailShotVisual` (21 chars, 3 shots) | 27.67 / 55.17 | 45 / **84** | 15 / 33 | 56 | 56 | Cal: 56, Drawer: 56 | **NO** (`"Wide studio shotht."`) |
| `detailRefLabel` (14 chars, 2 refs) | 23.35 / 36.56 | 28 / **42** | 10 / 30 | 18 | 18 | Cal: 18, Drawer: 18 | YES (`"...Hook Reference - Ref Updated"`) |
| `detailComment` (21 chars) | 20.21 / 33.56 | 0 / 0 | 15 / 39 | 33 | 33 | Cal: 33, Drawer: 33 | YES |
| `leadsRowName` (11 chars, 12 leads) | 71.80 / **308.79** | 11 / 11 | 18 / 36 | 37 | 37 | Leads: 37 | **NO** (`"Acme Brand Studio Eerrs"`) |
| `referenceSearch` (19 chars) | 18.83 / 32.83 | 0 / 0 | 15 / 42 | 28 | 28 | Ref: 28 | YES |

---

## 5. Implemented Fix & Measured AFTER Results

### Summary of Changes (No Schema / Migration Changes)
1. **Eliminated Infinite Refetch Loop & Added Coalescing + Echo Protection ([useContentStudio.ts](file:///c:/Users/kumar/OneDrive/Desktop/AW-update/Aspire%20World%20Content%20Studio/src/hooks/useContentStudio.ts)):**
   - Moved `teamMembers` lookup in `fetchLeads` onto `teamMembersRef`, breaking the `fetchTeamMembers -> setTeamMembers -> fetchLeads -> loadAll` infinite refetch loop (`18–54` continuous background `GET`s per typing burst -> `0`).
   - Added per-record write coalescing queues (`itemWriteQueueRef`, `leadWriteQueueRef`) so at most `1` write per entity ID is in flight at once, intermediate updates batch cleanly, write errors propagate (`throw`), child row updates run via `Promise.all`, and `fetchItems` / `fetchLeads` ignore server echoes while local saves are active or within a `2.5s` echo window.
2. **Local-First Drafts, `600 ms` Debounced Save & Multi-Trigger Flush ([useDebouncedSave.ts](file:///c:/Users/kumar/OneDrive/Desktop/AW-update/Aspire%20World%20Content%20Studio/src/hooks/useDebouncedSave.ts), [DetailDrawer.tsx](file:///c:/Users/kumar/OneDrive/Desktop/AW-update/Aspire%20World%20Content%20Studio/src/views/DetailDrawer.tsx), [LeadsView.tsx](file:///c:/Users/kumar/OneDrive/Desktop/AW-update/Aspire%20World%20Content%20Studio/src/views/LeadsView.tsx)):**
   - Added shared `useEntityDraft` hook with immediate local `draft` state, dirty-field echo protection, `600 ms` debounced batched saves, immediate flush on `blur`, `close`, item switch, navigation/unmount, and `beforeunload`, plus `Unsaved…` / `Saving…` / `Saved` / `Save failed + Retry` UI indicators (preserving all local text on failed saves).
   - Isolated lead row editing into `React.memo(LeadQuickEditDesktop)` / `React.memo(LeadQuickEditMobile)` and memoized `LeadsView` queue & filtered derivations (`useMemo`).
3. **Render Isolation & Deferred Embed Previews ([App.tsx](file:///c:/Users/kumar/OneDrive/Desktop/AW-update/Aspire%20World%20Content%20Studio/src/App.tsx), [ReferenceView.tsx](file:///c:/Users/kumar/OneDrive/Desktop/AW-update/Aspire%20World%20Content%20Studio/src/views/ReferenceView.tsx), [CalendarView.tsx](file:///c:/Users/kumar/OneDrive/Desktop/AW-update/Aspire%20World%20Content%20Studio/src/views/CalendarView.tsx), [BoardView.tsx](file:///c:/Users/kumar/OneDrive/Desktop/AW-update/Aspire%20World%20Content%20Studio/src/views/BoardView.tsx), [AppLayout.tsx](file:///c:/Users/kumar/OneDrive/Desktop/AW-update/Aspire%20World%20Content%20Studio/src/components/layout/AppLayout.tsx)):**
   - Moved Reference Library `search` state out of `App.tsx` into `ReferenceView`, memoized parent routes/layout (`React.memo` + `useCallback`), skipped redundant `localStorage` serialization while connected to Supabase, cleared `selectedId` on route leave so navigation flushes & closes the drawer, and deferred URL embed parsing (`useDeferredValue`).

### Measured BEFORE vs AFTER (`tests/perf/typing-latency-harness.mjs verify-fix`, Exit `0`)

Note: During verification, `typing-latency-harness.mjs` Fiber tracking was tightened (`actualStartTime` + `PerformedWork`) so untouched ancestor/sibling subtrees are not falsely credited with descendant `actualDuration`. Under `verify-fix`:

| Scenario (Keystrokes) | Mean / p95 Frame (ms) Before -> After | Writes During / After (Before -> After) | Reads During / After (Before -> After) | Parent `ContentStudioApp` Renders (Before -> After) | Focused Component Renders After | Text Intact? (Before -> After) |
|---|---|---|---|---|---|---|
| `detailTitle` (19) | 27.63 / 76.63 -> **22.96 / 37.16** | 19/19 -> **0/1** | 18/42 -> **0/0** | 32 -> **1** (open) | `DetailDrawer`: 20 | NO -> **YES** |
| `detailBrief` (22) | 22.07 / 35.23 -> **18.59 / 32.93** | 22/22 -> **0/1** | 18/45 -> **0/0** | 35 -> **0** | `DetailDrawer`: 22 | NO -> **YES** |
| `detailCaption` (28) | 28.85 / 76.98 -> **16.56 / 19.11** | 28/28 -> **0/1** | 27/54 -> **0/0** | 45 -> **0** | `DetailDrawer`: 28 | NO -> **YES** |
| `detailShotVisual` (21) | 27.67 / 55.17 -> **16.80 / 18.00** | 45/84 -> **0/4** | 15/33 -> **0/0** | 56 -> **0** | `DetailDrawer`: 21 | NO -> **YES** |
| `detailRefLabel` (14) | 23.35 / 36.56 -> **18.01 / 33.42** | 28/42 -> **0/3** | 10/30 -> **0/0** | 18 -> **0** | `DetailDrawer`: 14 | YES -> **YES** |
| `detailComment` (21) | 20.21 / 33.56 -> **16.71 / 18.05** | 0/0 -> **0/0** | 15/39 -> **0/0** | 33 -> **0** | `DetailDrawer`: 21 | YES -> **YES** |
| `leadsRowName` (11) | 71.80 / 308.79 -> **19.01 / 35.02** | 11/11 -> **0/1** | 18/36 -> **0/0** | 37 -> **0** (`LeadsView`: 0) | `LeadQuickEditDesktop`: 11 | NO -> **YES** |
| `referenceSearch` (19) | 18.83 / 32.83 -> **16.62 / 18.27** | 0/0 -> **0/0** | 15/42 -> **0/0** | 28 -> **0** | `ReferenceView`: 19 | YES -> **YES** |

### Behavioral Durability Checks (`verify-fix`)
- **Quick Close Flush:** Typing `' QUICKCLOSE'` and closing drawer before `600 ms` -> `reqsBeforeClose = 0`, `reqsAfterClose = 1`, `savedTitleEndsWithQuickClose = true`.
- **Navigation Flush:** Typing `' NAVFLUSH'` and clicking sidebar `Lead tracker` -> `reqsBeforeNav = 0`, `reqsAfterNav = 1`, `savedTitleEndsWithNavFlush = true`.
- **Failed Save Durability (`500` injection):** Drawer displays `Save failed ... Retry` (`errorStatusVisible = true`), retains local textarea draft (`textPreservedOnError = true`), and persists cleanly when clicking `Retry` (`recoveredBriefSaved = true`).

