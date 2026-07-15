# Discipline

Private mobile-first PWA to track daily exercise, healthy eating, and weekly weight — with permanent history and reminder push notifications.

## Stack

- **Next.js** (App Router) on **Vercel**
- **Supabase** Auth + Postgres + RLS
- **Web Push** (works on iPhone only after **Add to Home Screen**, iOS 16.4+)
- **Supabase Cron** every 10 minutes (primary) + **Vercel Cron** once daily (Hobby-compatible backup) to finalize missed days and send reminders

## Features

- One-tap **Exercised**, **Ate healthy**, **Rest day**
- **No rest two days in a row** (enforced in Postgres)
- Unresolved past days auto-marked **failure** (timezone-aware)
- Lifetime **calendar grid** (exercise + nutrition indicators, weight marker)
- Day corrections with **append-only audit** of status changes
- Weekly **weight check-ins** + trend
- Multiple configurable daily reminders + weekly weight reminders
- Installable PWA with service worker, badges, offline shell

## Quick start

1. Create a Supabase project.
2. Run the SQL migration in the Supabase SQL editor:

   [`supabase/migrations/20260716000000_init.sql`](supabase/migrations/20260716000000_init.sql)

3. In Authentication settings, for private single-user use you can disable “Confirm email”.
4. Copy env:

```bash
cp .env.example .env.local
```

Fill in Supabase URL/keys. VAPID keys can be generated with:

```bash
npx web-push generate-vapid-keys
```

5. Install and run:

```bash
npm install
npm run dev
```

6. Sign up at `/signup`, then use the app at `/today`.

## iPhone notifications setup

1. Deploy over **HTTPS** (Vercel).
2. Open the site in **Safari**.
3. Share → **Add to Home Screen**.
4. Open the app from the Home Screen icon (standalone).
5. Settings → **Enable notifications** (must be a tap gesture).
6. Use **Send test** to verify.

Limitations: iOS Focus modes, notification permission, and Home Screen install are required. No web app can bypass those.

## Production (Vercel + Supabase)

1. Push this repo and import into Vercel.
2. Set environment variables from `.env.example` (including `SUPABASE_SERVICE_ROLE_KEY`, VAPID keys, `CRON_SECRET`).
3. Deploy. On **Vercel Hobby**, `vercel.json` runs `/api/cron/process-reminders` **once per day** (21:00 UTC) as a backup — Hobby cannot run crons more than once daily.
4. For multiple reminders per day, schedule **Supabase Cron** every 10 minutes:

   - Open Supabase → SQL editor
   - Edit and run [`supabase/cron-process-reminders.sql`](supabase/cron-process-reminders.sql)
   - Replace `YOUR_APP.vercel.app` and `YOUR_CRON_SECRET` with your real values (same `CRON_SECRET` as in Vercel)

   That POSTs to your app with `Authorization: Bearer <CRON_SECRET>` and is what actually powers daytime reminders on Hobby.

5. Create your private account via `/signup`. Restrict signups in Supabase if you want (disable public signups after creating your user).

### Smoke-test checklist

- [ ] Signup / login works
- [ ] Today actions update statuses
- [ ] Declaring rest on consecutive days fails with a clear error
- [ ] Calendar shows E / H / R / X / W markers
- [ ] Day sheet can correct statuses
- [ ] Weight check-in saves and lists history
- [ ] Settings saves timezone + reminder times
- [ ] PWA installs on Home Screen
- [ ] Notifications permission + test push received
- [ ] Supabase Cron job `discipline-process-reminders` is scheduled
- [ ] After midnight (timezone), pending yesterday becomes failure (cron or next open)

## Scripts

```bash
npm run dev
npm run build
npm run test
npm run test:e2e
npm run icons
```

## Domain rules (summary)

| Track | Values | Notes |
|------|--------|--------|
| Exercise | pending, completed, rest, failure | Rest cannot be adjacent to another rest |
| Nutrition | pending, healthy, failure | Rest does **not** exempt nutrition |
| Weight | weekly check-in | Reminders repeat until logged for the cycle |

Past unresolved `pending` values become `failure` once the local day ends.
