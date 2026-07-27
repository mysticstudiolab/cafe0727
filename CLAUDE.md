# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

A Vite + React app is scaffolded (JavaScript, not TypeScript). Commands:

```
npm run dev      # dev server, defaults to http://localhost:5173
npm run build    # production build (also useful as a quick "does this compile" check)
npm run preview  # serve the production build locally
npm run lint     # eslint .
```

There is no test runner configured yet. The app has no route beyond a single page (`src/App.jsx`) — no router is installed.

Before implementing a feature, read `PRD.md` in full — it is the single source of truth for scope and design decisions. Its final section ("오픈 이슈 / 구현 전 확인 필요") lists unresolved questions (comment length limit, email verification, stale-cafe handling on re-upload, category filtering, mobile support, my-visits screen layout, upload size limits — Excel header naming was resolved as Korean `이름`/`주소`/`카테고리`, admin-detection was resolved as an env-var email whitelist, see below). Confirm any remaining open item with the user before implementing the related feature rather than assuming an answer.

Auth (F4) is wired up for real: `src/lib/supabaseClient.js` builds the Supabase client from `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (exports `null` if either is unset, so the rest of the app keeps working without Supabase configured), `src/context/AuthContext.jsx` tracks the session, and `src/components/AuthDialog.jsx` is the email/password sign up/in form opened from the header or from the visit popup's login prompt. `useAuth()` must be called under `<AuthProvider>` (wired in `main.jsx`).

Cafe visits (`visited`/`comment`) are wired up to Supabase, but **not** via the PRD §7-style `visits` table (with a `cafe_id` FK) — instead there is a `public.visit_notes` table keyed by `(user_id, place_name, address)`. `place_name`/`address` stand in for a `cafe_id` FK, with a matching unique constraint (`visit_notes_user_id_place_name_address_key`) enforcing one record per user per cafe, and RLS scoped to `auth.uid() = user_id` for select/insert/update (visit data here is **not** public-readable the way PRD §9.2 describes — only the author can read their own row). `src/lib/visitNotes.js` has `fetchVisitNote`/`upsertVisitNote`/`fetchMyVisitedCafes` (the last one powers the "내 방문 목록" sidebar, `MyVisitsSection.jsx` — filters to `visited = true`, clicking an item pans the map via `KakaoMap`'s `focusTarget` prop) plus `isAuthRelatedError` to detect RLS/JWT failures. `App.jsx` fetches the note when a marker's popup opens for a logged-in user and upserts it from `saveVisit`; `CafeDetailPopup` shows a loading state while fetching, disables/labels the save button while saving, and shows an inline message (session-expired vs generic) instead of crashing on failure. `CafeDetailPopup` still gates the whole save form behind `isLoggedIn`; logged-out users only see a "로그인 후 남길 수 있어요" prompt. Migrating `visit_notes` to a real `cafe_id` FK is a schema migration, not just a frontend change — confirm with the user before changing `visit_notes`'s shape or RLS.

The `cafes` table (PRD §7.1) now exists too: `src/lib/cafes.js` has `fetchAllCafes` (public SELECT, `geocode_status = 'success'` only, used to seed `App.jsx`'s `cafes` state on mount — independent of any Excel upload this session) and `upsertCafes` (upsert on `(name, address)`, admin-only via RLS). Admin detection (PRD open issue #1) was resolved as an env-var email whitelist: `VITE_ADMIN_EMAILS` (comma-separated) is checked client-side by `src/lib/admin.js`'s `isAdminUser(user)` to show/hide the upload button in `Header.jsx`, and the *same* email(s) are hardcoded into the `cafes` table's INSERT/UPDATE/DELETE RLS policies (`auth.jwt() ->> 'email' = '...'`) as the actual enforcement — the env var alone is UI-only. Currently only `admin@naver.com` is an admin. If the admin list changes, both the env var and the RLS policies need updating together (a migration, via Supabase MCP).

## Tech stack

- **React + Vite**, plain JavaScript/JSX (env vars use the `VITE_` prefix, not `NEXT_PUBLIC_`)
- **Tailwind CSS + shadcn/ui**. shadcn/ui was set up manually (not via `npx shadcn init`, to avoid an interactive CLI/network dependency) — `components.json` matches that setup, so `npx shadcn add <component>` should still work going forward. The `@/` import alias points at `src/` (configured in `vite.config.js` + `jsconfig.json`). Only `ui/dialog.jsx` exists so far; add further primitives (`button`, `input`, `checkbox`, etc.) the same way — copy shadcn's standard source, strip TS types, keep imports as `@/lib/utils`.
- **xlsx** for parsing the admin's Excel upload in the browser (`src/lib/excel.js`). Expected header row (Korean, any column order): `이름` / `주소` / `카테고리`.
- **Kakao Maps JavaScript SDK** for the map, markers, and address→coordinate geocoding (`src/lib/kakaoMap.js`)
- **Supabase** for Auth (email/password) and Database (Postgres + RLS) — not yet wired up. When it is, schema and RLS changes must be done through the **Supabase MCP tool**, not raw SQL files or the dashboard, so schema state stays visible/reproducible in-session

## Product summary (from PRD.md)

A neighborhood cafe map service ("우리 동네 카페 지도"):
- An admin uploads an Excel file (name/address/category columns); addresses are geocoded client-side via the Kakao Maps JS SDK and rendered as markers. Addresses that fail to geocode are listed separately, not plotted.
- Any user (including logged-out visitors) can click a marker to see the cafe's info and all users' visit-checks/comments — visit/comment data is public read.
- Logged-in users (email/password via Supabase Auth) can toggle "visited" and leave a one-line comment per cafe. Re-clicking a marker they've already annotated reloads their prior entry.
- A "my visits" screen lists only the cafes the logged-in user has checked as visited, independent of any Excel state.

## Architecture constraints (fixed, do not deviate without asking)

- **Kakao Maps is called directly from the frontend** — no backend proxy for map rendering or geocoding (`kakao.maps.services.Geocoder`). Do not introduce a server-side geocoding endpoint.
- **Data lives in Supabase (Postgres) and is protected by Row Level Security**, not application-level checks. Any new table needs explicit RLS policies before it's usable — see PRD §9.
- **Two core tables** (both now implemented, see "Project status" above for how they actually differ from this original sketch):
  - `cafes` — shared/public data (name, address, category, lat/lng, geocode_status). Unique on `(name, address)`. Only admins can INSERT/UPDATE/DELETE; SELECT is open to everyone including anon.
  - `visits` (implemented as `visit_notes`, keyed by `place_name`/`address` instead of a `cafe_id` FK — see "Project status") — per-user data (visited, comment/impression). Unique per user+cafe — this is what enforces "one record per person per cafe," not application logic. INSERT/UPDATE/DELETE must be restricted to `auth.uid() = user_id`. Writes should be upserts, not blind inserts.
- **Re-uploading an Excel file merges by `(name, address)`**: matching rows update the existing `cafes` row in place (preserving its `id`); non-matching rows are inserted as new cafes. Never implement re-upload as delete-and-recreate — that would orphan or destroy existing visit data.
- **Secrets**: Kakao JS key and Supabase URL/anon key are client-exposed by design (protected via RLS + Kakao's domain restriction, not secrecy) and belong in `.env`/Vercel env vars, never hardcoded. `.env` must stay in `.gitignore`.
  - Env var names are fixed: `VITE_KAKAO_MAP_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_EMAILS` (comma-separated admin email whitelist — UI-only signal, see "Project status"; the real enforcement is the matching literal email(s) hardcoded into `cafes`' RLS policies).
- **Kakao Maps SDK must be loaded with `libraries=services`** — the address→coordinate geocoder (`kakao.maps.services.Geocoder`) lives in that library and won't be available without it.
- **Geocode addresses one at a time, sequentially**, not in parallel — failures are surfaced in the UI as a separate list rather than silently dropped or retried in a batch.
- **Marker redraw pattern**: when re-rendering markers (e.g. after a re-upload or filter change), clear *all* existing markers first, then draw the new set from scratch. Don't diff/patch the existing marker set.
- **Build screens against mock/fake data first**, wire up real Supabase/Kakao calls last — this applies to every screen, not just a subset.

## Working notes

- Keep `PRD.md` authoritative: if an implementation decision resolves one of its open issues, update the PRD rather than letting the decision live only in code/commit history.
