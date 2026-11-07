# Rezora CRM — Phase 1

## Setup
1. `npm install`
2. `.env` is pre-filled locally (gitignored). For others, copy `.env.example`.
3. `npx prisma migrate dev --name init`   (uses DIRECT_URL)
4. `npm run db:seed`   (creates Super Admin from env + demo data; `SKIP_DEMO=1` for admin only)
5. `npm run dev` → http://localhost:3000

## Deploy (Vercel + Neon)
Add all env vars in Vercel (AUTH_URL = your domain), build command `npm run build`, run `npx prisma migrate deploy` once against Neon. Enable Neon backups/branching.

## Security notes
- Role checks: middleware (edge) + `requireUser()` in every page/action, re-checked against the DB (deactivation is immediate).
- Moderator column whitelist is applied in the Prisma `select`, not in the UI.
- Login limiter is in-memory; use Redis/Upstash in production. Rotate secrets before go-live.

## Phase 2 — Leads
- Editable leads table (double-click, Enter/Esc/blur), search, filters, sort, pagination, column visibility, bulk actions.
- Add Lead (React Hook Form + server-side Zod), CSV/XLSX import wizard, CSV export (`/api/leads/export`), notes with reminders.
- All mutations are server actions guarded by `requireUser(["SUPER_ADMIN"])` and written to `AuditLog`.
- No schema change since Phase 1 — no new migration needed. Run `npm install` for the new dependencies.

## All phases
Phase 3: `/clients/[growth|business|starter|subscription]` reuse the Leads table on the same records. Phase 4: `/meetings` (calendar, table, upcoming, today, completed, cancelled). Phase 5: `/payments`, Overview revenue analytics (Recharts). Phase 6: `/moderators`, `/settings`, security headers, rate limits, tests.
See `DEPLOYMENT.md` and `TESTING.md`. Revenue = payments with status Paid or Partial; Pending is tracked separately; Refunded is excluded.
