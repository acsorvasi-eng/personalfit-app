# Admin Role + Monthly Generation Limit Design

## Goal

Add an admin role (hardcoded email list, no generation limit) and change the meal plan generation limit from daily 5 to monthly 13, with a remaining-count indicator in the GenerateMealPlanSheet UI.

## Context

- Firebase Auth (Google + email/password) is already in place
- Firestore `users/{uid}` documents already have `plan: 'free' | 'pro'` and `usage` fields
- Current limit: `FREE_DAILY_LIMIT = 5` resets daily — changing to monthly 13
- All Vercel API functions are in the root `api/` folder

## Architecture

### API layer (`api/generate-meal-plan.ts`)

**Admin bypass** — hardcoded email list checked before the limit gate:
```ts
const ADMIN_EMAILS = ['your@email.com']; // extend as needed
```
If the requesting user's email is in `ADMIN_EMAILS` → skip limit check entirely.

The server reads the user's email **from Firestore** using `userId` — client-sent email is never trusted for the admin check. `ADMIN_EMAILS` check happens after the Firestore profile fetch.

**Monthly limit** — replace `FREE_DAILY_LIMIT` with `FREE_MONTHLY_LIMIT = 13`:

Firestore `usage` shape changes:
```
usage: {
  generationsThisMonth: number   // replaces generationsToday
  lastResetMonth: string         // "2026-03" format, replaces lastResetDate
  totalGenerations: number       // unchanged
}
```

Reset logic: on each request, compare `lastResetMonth` to current `YYYY-MM` string (UTC). If different → reset `generationsThisMonth` to 0 and update `lastResetMonth`. At the same time, delete the legacy fields `generationsToday` and `lastResetDate` via `FieldValue.delete()` to keep the schema clean. If `generationsThisMonth` field is missing (legacy documents) → treat as 0 (fresh state).

Increment uses `FieldValue.increment(1)` (atomic) to prevent race conditions on concurrent requests. The limit check reads the current value first, then increments — acceptable risk for the rare edge case of a simultaneous double-request at exactly the limit.

**API response** — every successful generation includes:
```json
{ "remaining": 10, "limit": 13, "isAdmin": false }
```
When `isAdmin: true` → `{ "remaining": null, "limit": null, "isAdmin": true }` (UI shows no counter for admins).

When limit is reached → `HTTP 429` with body:
```json
{ "error": "monthly_limit_reached", "message": "...", "resetsAt": "2026-04-01" }
```
`resetsAt` is always the first day of the next calendar month in UTC (`YYYY-MM-01`).

### New endpoint: `api/usage.ts`

Lightweight GET endpoint: `GET /api/usage?userId=xxx`

Returns current usage without triggering a generation:
```json
{ "remaining": 10, "limit": 13, "resetsAt": "2026-04-01", "isAdmin": false }
```

Used by the UI on sheet open to show the counter before the user clicks Generate.

### Client layer (`GenerateMealPlanSheet.tsx`)

- On sheet open: call `GET /api/usage?userId=...` → store `remaining` in local state
- Display above the generate button: `"X / 13 generálás felhasználva"`
- If `remaining === 0`: button is `disabled`, text shown: `"Elérted a havi limitet. Következő lehetőség: [resetsAt date]"`
- After a successful generation: update `remaining` from the response (`result.remaining`)

### Translations

Three new i18n keys needed (hu/en/ro flat locale files):
- `generate.limitUsed` — `"{used} / {limit} generálás felhasználva"`
- `generate.limitReached` — `"Elérted a havi limitet."`
- `generate.limitResetsAt` — `"Következő lehetőség: {date}"`

## What does NOT change

- Login system (Firebase Auth email/password + Google already works)
- `plan: 'pro'` logic (pro users remain unlimited — admin is a separate bypass)
- Other API files (`lookup-foods`, `split-food-name`, `parse-document`) — no limit logic there

## Files to change

| File | Change |
|---|---|
| `api/generate-meal-plan.ts` | Add `ADMIN_EMAILS`, replace daily→monthly limit (`FREE_DAILY_LIMIT` constant lives only here), add `remaining`/`resetsAt` to response |
| `api/usage.ts` | New file — lightweight usage GET endpoint |
| `PersonalFit/src/app/features/nutrition/components/GenerateMealPlanSheet.tsx` | Fetch usage on open, show counter, disable button at 0 |
| `PersonalFit/src/i18n/locales/hu.ts` | Add 3 new keys |
| `PersonalFit/src/i18n/locales/en.ts` | Add 3 new keys |
| `PersonalFit/src/i18n/locales/ro.ts` | Add 3 new keys |

## Out of scope

- Pro upgrade flow / payment
- Email notification when limit is low
- Admin dashboard
