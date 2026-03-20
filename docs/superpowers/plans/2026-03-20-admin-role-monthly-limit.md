# Admin Role + Monthly Generation Limit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin bypass (no limit), change daily-5 → monthly-13 generation limit, show remaining count in GenerateMealPlanSheet.

**Architecture:** The API reads the user's email from Firestore server-side (never trusts client input) and compares against a hardcoded admin list. The monthly counter uses a new `generationsThisMonth` / `lastResetMonth` Firestore field pair. A new lightweight `GET /api/usage` endpoint lets the UI show the counter before the user hits Generate. All limit constants and admin email list live in a single shared module to avoid duplication.

**Tech Stack:** TypeScript, Vercel Serverless Functions, Firebase Admin SDK (server), React local state (client), existing `useLanguage` + `useAuth` hooks.

---

## Important: Correct `api/` directory

**ALL server files are in the ROOT-level `api/` folder** — the one at the same level as `PersonalFit/` (the Vite app folder). There is also a `PersonalFit/api/` folder that is NOT deployed to Vercel. Always work in the root `api/` (e.g. `/path/to/PersonalFit/api/generate-meal-plan.ts`).

---

## File Map

| File | Role |
|---|---|
| `api/_shared/limits.ts` | Create: single source of truth for `FREE_MONTHLY_LIMIT`, `ADMIN_EMAILS`, date helpers |
| `api/generate-meal-plan.ts` | Modify: import shared limits, admin bypass, monthly limit, enriched response |
| `api/usage.ts` | Create: lightweight GET usage endpoint, imports shared limits |
| `PersonalFit/src/app/features/nutrition/components/GenerateMealPlanSheet.tsx` | Modify: fetch usage on open, show counter, disable at 0, pass userId, use `limit` from state |
| `PersonalFit/src/i18n/locales/hu.ts` | Add 3 translation keys |
| `PersonalFit/src/i18n/locales/en.ts` | Add 3 translation keys |
| `PersonalFit/src/i18n/locales/ro.ts` | Add 3 translation keys |

---

## Task 1: Create `api/_shared/limits.ts` — shared constants

**Files:**
- Create: `api/_shared/limits.ts`

This is the single source of truth. Both `generate-meal-plan.ts` and `usage.ts` import from here. Never duplicate `ADMIN_EMAILS` or `FREE_MONTHLY_LIMIT` elsewhere.

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p api/_shared
```

```ts
// api/_shared/limits.ts

export const FREE_MONTHLY_LIMIT = 13;

// Add the developer/admin email(s) here. Server reads email from Firestore,
// so spoofing is not possible.
export const ADMIN_EMAILS: string[] = [
  'your-real-email@example.com',  // ← replace with actual admin email
];

/** Returns current month as "YYYY-MM" string (UTC). */
export function currentMonthStr(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Returns the first day of next calendar month as "YYYY-MM-01" (UTC). */
export function nextMonthFirstDay(): string {
  const now = new Date();
  const firstOfNext = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return firstOfNext.toISOString().slice(0, 10); // "YYYY-MM-01"
}
```

- [ ] **Step 2: Commit**

```bash
git add api/_shared/limits.ts
git commit -m "feat: extract shared limit constants and date helpers to api/_shared/limits.ts"
```

---

## Task 2: Rewrite usage logic in `api/generate-meal-plan.ts`

**Files:**
- Modify: `api/generate-meal-plan.ts`

### Context

Current code at lines 22–70:
- `FREE_DAILY_LIMIT = 5` and `todayStr()` helper
- `checkAndIncrementUsage(userId)` function using `generationsToday` / `lastResetDate` Firestore fields

We replace with monthly logic importing from `_shared/limits.ts`.

- [ ] **Step 1: Add import at top of `api/generate-meal-plan.ts`**

After the existing imports (after line 4 `import * as admin from 'firebase-admin';`):

```ts
import { FREE_MONTHLY_LIMIT, ADMIN_EMAILS, currentMonthStr, nextMonthFirstDay } from './_shared/limits';
```

- [ ] **Step 2: Remove old constants and replace `checkAndIncrementUsage`**

Remove lines 22–70 entirely (the `FREE_DAILY_LIMIT` constant, `todayStr` function, and the entire `checkAndIncrementUsage` function). Replace with:

```ts
async function checkAndIncrementUsage(userId: string): Promise<{
  allowed: boolean;
  remaining: number | null;
  limit: number | null;
  isAdmin: boolean;
  resetsAt: string;
}> {
  const resetsAt = nextMonthFirstDay();
  const app = getAdminApp();
  if (!app) return { allowed: true, remaining: FREE_MONTHLY_LIMIT, limit: FREE_MONTHLY_LIMIT, isAdmin: false, resetsAt };

  try {
    const db = admin.firestore(app);
    const ref = db.collection('users').doc(userId);
    const snap = await ref.get();

    if (!snap.exists) return { allowed: true, remaining: FREE_MONTHLY_LIMIT, limit: FREE_MONTHLY_LIMIT, isAdmin: false, resetsAt };

    const data = snap.data()!;

    // Admin bypass — email read from Firestore, never from request body
    const email: string = data.email ?? '';
    if (ADMIN_EMAILS.includes(email)) {
      await ref.update({
        'usage.totalGenerations': admin.firestore.FieldValue.increment(1),
        updatedAt: new Date().toISOString(),
      });
      return { allowed: true, remaining: null, limit: null, isAdmin: true, resetsAt };
    }

    // Pro plan — unlimited
    if (data.plan === 'pro') {
      await ref.update({
        'usage.totalGenerations': admin.firestore.FieldValue.increment(1),
        updatedAt: new Date().toISOString(),
      });
      return { allowed: true, remaining: null, limit: null, isAdmin: false, resetsAt };
    }

    const thisMonth = currentMonthStr();
    const isNewMonth = data.usage?.lastResetMonth !== thisMonth;
    const count: number = isNewMonth ? 0 : (data.usage?.generationsThisMonth ?? 0);

    if (count >= FREE_MONTHLY_LIMIT) {
      return { allowed: false, remaining: 0, limit: FREE_MONTHLY_LIMIT, isAdmin: false, resetsAt };
    }

    // Increment — reset monthly counter if new month, delete legacy daily fields
    if (isNewMonth) {
      await ref.update({
        'usage.generationsThisMonth': 1,
        'usage.lastResetMonth': thisMonth,
        'usage.totalGenerations': admin.firestore.FieldValue.increment(1),
        'usage.generationsToday': admin.firestore.FieldValue.delete(),
        'usage.lastResetDate': admin.firestore.FieldValue.delete(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await ref.update({
        'usage.generationsThisMonth': admin.firestore.FieldValue.increment(1),
        'usage.totalGenerations': admin.firestore.FieldValue.increment(1),
        updatedAt: new Date().toISOString(),
      });
    }

    return { allowed: true, remaining: FREE_MONTHLY_LIMIT - count - 1, limit: FREE_MONTHLY_LIMIT, isAdmin: false, resetsAt };
  } catch (e) {
    console.warn('[generate-meal-plan] Usage check failed, failing open:', e);
    return { allowed: true, remaining: FREE_MONTHLY_LIMIT, limit: FREE_MONTHLY_LIMIT, isAdmin: false, resetsAt };
  }
}
```

- [ ] **Step 3: Update the 429 response block**

Find the rate-limit check block (around the original line 334–344) and replace:

```ts
// BEFORE:
  if (userId) {
    const usage = await checkAndIncrementUsage(userId);
    if (!usage.allowed) {
      return res.status(429).json({
        error: 'daily_limit_reached',
        message: 'Napi generálási limit elérve. Próbáld holnap, vagy válts Pro-ra.',
        remaining: 0,
      });
    }
  }

// AFTER:
  let usageResult: Awaited<ReturnType<typeof checkAndIncrementUsage>> | null = null;
  if (userId) {
    usageResult = await checkAndIncrementUsage(userId);
    if (!usageResult.allowed) {
      return res.status(429).json({
        error: 'monthly_limit_reached',
        message: 'Havi generálási limit elérve.',
        remaining: 0,
        limit: FREE_MONTHLY_LIMIT,
        resetsAt: usageResult.resetsAt,
      });
    }
  }
```

- [ ] **Step 4: Update the success response — add usage fields**

Note: the cache-hit path (around line 331) returns early and skips usage enrichment. That is acceptable — the UI fetches usage separately via `/api/usage` on sheet open. No change needed there.

Find the final success `return res.status(200).json(responsePayload);` and replace:

```ts
// BEFORE:
    return res.status(200).json(responsePayload);

// AFTER:
    return res.status(200).json({
      ...responsePayload,
      remaining: usageResult?.remaining ?? null,
      limit: usageResult?.limit ?? null,
      isAdmin: usageResult?.isAdmin ?? false,
      resetsAt: usageResult?.resetsAt ?? nextMonthFirstDay(),
    });
```

- [ ] **Step 5: Commit**

```bash
git add api/generate-meal-plan.ts
git commit -m "feat: monthly generation limit + admin bypass in generate-meal-plan API"
```

---

## Task 3: Create `api/usage.ts`

**Files:**
- Create: `api/usage.ts` (in root-level `api/`, same folder as `generate-meal-plan.ts`)

- [ ] **Step 1: Create the file**

```ts
// api/usage.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { FREE_MONTHLY_LIMIT, ADMIN_EMAILS, currentMonthStr, nextMonthFirstDay } from './_shared/limits';

function getAdminApp(): admin.app.App | null {
  if (admin.apps.length > 0) return admin.apps[0]!;
  const keyB64 = process.env.FIREBASE_ADMIN_KEY;
  if (!keyB64) return null;
  try {
    const credential = JSON.parse(Buffer.from(keyB64, 'base64').toString('utf8'));
    return admin.initializeApp({ credential: admin.credential.cert(credential) });
  } catch { return null; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.query.userId as string | undefined;
  const resetsAt = nextMonthFirstDay();
  const openResponse = { remaining: FREE_MONTHLY_LIMIT, limit: FREE_MONTHLY_LIMIT, isAdmin: false, resetsAt };

  if (!userId) return res.status(200).json(openResponse);

  const app = getAdminApp();
  if (!app) return res.status(200).json(openResponse);

  try {
    const snap = await admin.firestore(app).collection('users').doc(userId).get();
    if (!snap.exists) return res.status(200).json(openResponse);

    const data = snap.data()!;
    const email: string = data.email ?? '';

    if (ADMIN_EMAILS.includes(email)) {
      return res.status(200).json({ remaining: null, limit: null, isAdmin: true, resetsAt });
    }

    if (data.plan === 'pro') {
      return res.status(200).json({ remaining: null, limit: null, isAdmin: false, resetsAt });
    }

    const thisMonth = currentMonthStr();
    const count: number = data.usage?.lastResetMonth !== thisMonth ? 0 : (data.usage?.generationsThisMonth ?? 0);
    const remaining = Math.max(0, FREE_MONTHLY_LIMIT - count);

    return res.status(200).json({ remaining, limit: FREE_MONTHLY_LIMIT, isAdmin: false, resetsAt });
  } catch (e) {
    console.warn('[usage] Failed, failing open:', e);
    return res.status(200).json(openResponse);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/usage.ts
git commit -m "feat: add GET /api/usage endpoint"
```

---

## Task 4: Add 3 translation keys (hu / en / ro)

**Files:**
- Modify: `PersonalFit/src/i18n/locales/hu.ts`
- Modify: `PersonalFit/src/i18n/locales/en.ts`
- Modify: `PersonalFit/src/i18n/locales/ro.ts`

- [ ] **Step 1: Add to `PersonalFit/src/i18n/locales/hu.ts`** — before the closing `} as const;`

```ts
  'generate.limitUsed': '{used} / {limit} generálás felhasználva',
  'generate.limitReached': 'Elérted a havi limitet.',
  'generate.limitResetsAt': 'Következő lehetőség: {date}',
```

- [ ] **Step 2: Add to `PersonalFit/src/i18n/locales/en.ts`** — before the closing `};`

```ts
  'generate.limitUsed': '{used} / {limit} generations used',
  'generate.limitReached': 'You have reached your monthly limit.',
  'generate.limitResetsAt': 'Next available: {date}',
```

- [ ] **Step 3: Add to `PersonalFit/src/i18n/locales/ro.ts`** — before the closing `};`

```ts
  'generate.limitUsed': '{used} / {limit} generări utilizate',
  'generate.limitReached': 'Ai atins limita lunară.',
  'generate.limitResetsAt': 'Disponibil din: {date}',
```

- [ ] **Step 4: Commit**

```bash
git add PersonalFit/src/i18n/locales/hu.ts PersonalFit/src/i18n/locales/en.ts PersonalFit/src/i18n/locales/ro.ts
git commit -m "feat: add monthly limit translation keys (hu/en/ro)"
```

---

## Task 5: Update `GenerateMealPlanSheet.tsx`

**Files:**
- Modify: `PersonalFit/src/app/features/nutrition/components/GenerateMealPlanSheet.tsx`

### Context

- File is at `PersonalFit/src/app/features/nutrition/components/GenerateMealPlanSheet.tsx`
- Currently does NOT send `userId` in the fetch body
- Has two generate entry points: "Generate Direct" (welcome step, line ~414) and the main button (calc step, line ~686)
- `useAuth` is at `../../../contexts/AuthContext` relative to this file

- [ ] **Step 1: Add `useAuth` import**

After line 10 (`import { useLanguage } from "../../../contexts/LanguageContext";`):

```ts
import { useAuth } from "../../../contexts/AuthContext";
```

- [ ] **Step 2: Add usage state inside the component**

After line 135 (after `const [burnPerDay, setBurnPerDay] = useState...`):

```ts
const { user } = useAuth();
const [remaining, setRemaining] = useState<number | null>(null);
const [limitTotal, setLimitTotal] = useState<number | null>(null);
const [isAdminUser, setIsAdminUser] = useState(false);
const [resetsAt, setResetsAt] = useState<string>('');
```

- [ ] **Step 3: Fetch usage on sheet open**

Add after the existing profile-load `useEffect` block (after line 174):

```ts
useEffect(() => {
  if (!open || !user?.id) return;
  fetch(`/api/usage?userId=${encodeURIComponent(user.id)}`)
    .then(r => r.json())
    .then((data: { remaining: number | null; limit: number | null; isAdmin: boolean; resetsAt: string }) => {
      setRemaining(data.remaining ?? null);
      setLimitTotal(data.limit ?? null);
      setIsAdminUser(data.isAdmin ?? false);
      setResetsAt(data.resetsAt ?? '');
    })
    .catch(() => {});
}, [open, user?.id]);
```

- [ ] **Step 4: Add `userId` to the generate fetch body and update state after success**

In `handleGenerate`, in the `JSON.stringify({...})` block (around line 248), add `userId: user?.id` as a field:

```ts
// existing fields stay — just add this one line inside the object:
userId: user?.id,
```

After `setStats(data.stats);` (around line 277), add:

```ts
if (data.remaining !== undefined) setRemaining(data.remaining);
if (data.limit !== undefined) setLimitTotal(data.limit);
if (data.isAdmin !== undefined) setIsAdminUser(data.isAdmin);
if (data.resetsAt) setResetsAt(data.resetsAt);
```

- [ ] **Step 5: Add `UsageBadge` helper component**

Add this function just above the `export function GenerateMealPlanSheet` line:

```tsx
function UsageBadge({
  remaining, limitTotal, isAdmin, resetsAt, t,
}: {
  remaining: number | null;
  limitTotal: number | null;
  isAdmin: boolean;
  resetsAt: string;
  t: (k: string) => string;
}) {
  if (isAdmin || remaining === null || limitTotal === null) return null;
  if (remaining === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-[10px] px-[14px] py-[10px] mb-[10px] text-[0.82rem] text-red-600 text-center">
        <div className="font-bold">{t('generate.limitReached')}</div>
        {resetsAt && (
          <div className="text-[0.78rem] mt-[3px] text-red-400">
            {t('generate.limitResetsAt').replace('{date}', resetsAt)}
          </div>
        )}
      </div>
    );
  }
  const used = limitTotal - remaining;
  return (
    <div className="text-center text-[0.78rem] text-gray-400 mb-[10px]">
      {t('generate.limitUsed')
        .replace('{used}', String(used))
        .replace('{limit}', String(limitTotal))}
    </div>
  );
}
```

- [ ] **Step 6: Render `UsageBadge` in the welcome step and disable "Generate Direct"**

In the welcome step, just before `{profileLoaded && personalValid ? (` (around line 412), insert:

```tsx
<UsageBadge remaining={remaining} limitTotal={limitTotal} isAdmin={isAdminUser} resetsAt={resetsAt} t={t} />
```

Update the "Generate Direct" button (around line 414) to be disabled when at limit:

```tsx
<button
  onClick={handleGenerate}
  disabled={remaining === 0 && !isAdminUser}
  className={`${btnPrimary} w-full mb-[10px] ${remaining === 0 && !isAdminUser ? "opacity-50 cursor-not-allowed" : ""}`}
>
  {t('generatePlan.generateDirect')} <ArrowRight size={18} />
</button>
```

- [ ] **Step 7: Render `UsageBadge` in the calc step and disable generate button**

In the calc step, just before `<div className="flex gap-2">` (the button row at ~line 684), insert:

```tsx
<UsageBadge remaining={remaining} limitTotal={limitTotal} isAdmin={isAdminUser} resetsAt={resetsAt} t={t} />
```

Update the generate button (around line 686):

```tsx
<button
  onClick={handleGenerate}
  disabled={foods.length === 0 || (remaining === 0 && !isAdminUser)}
  className={`${btnPrimary} flex-1 ${foods.length === 0 || (remaining === 0 && !isAdminUser) ? "opacity-50 cursor-not-allowed" : ""}`}
>
  <Sparkles size={17} /> {t('generatePlan.generateButton')}
</button>
```

- [ ] **Step 8: Reset usage state on sheet close**

In `handleClose` (around line 316), inside the `setTimeout` callback, add to the existing reset lines:

```ts
setRemaining(null); setLimitTotal(null); setIsAdminUser(false); setResetsAt('');
```

- [ ] **Step 9: Build check**

```bash
cd PersonalFit/PersonalFit && npm run build 2>&1 | tail -30
```

Expected: zero TypeScript errors.

- [ ] **Step 10: Commit**

```bash
git add PersonalFit/src/app/features/nutrition/components/GenerateMealPlanSheet.tsx
git commit -m "feat: monthly limit counter in GenerateMealPlanSheet, disable button at 0"
```

---

## Task 6: Push and smoke test

- [ ] **Step 1: Push**

```bash
git push
```

- [ ] **Step 2: Smoke test checklist (after Vercel deploy)**
  - Open GenerateMealPlanSheet → counter shows: "0 / 13 generálás felhasználva"
  - Complete a generation → counter updates to "1 / 13 ..."
  - Log in as admin email → no counter shown, generate works
  - Simulate limit: set `usage.generationsThisMonth = 13` in Firestore Console for your test user → reopen sheet → button disabled, red message, reset date shown
  - Check Vercel function logs → no 500 errors on generate
