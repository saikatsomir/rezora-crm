# Rezora CRM — Deployment guide (GitHub + Vercel + Neon)

## 1. Database (Neon)
1. Create a Neon project (free tier is enough). Copy the **pooled** string → `DATABASE_URL` and the **direct** string → `DIRECT_URL`.
2. Locally: `npm install`, then `npx prisma migrate dev --name init` (creates `prisma/migrations/`; commit that folder).
3. Seed the Super Admin: `npm run db:seed`. Use `SKIP_DEMO=1 npm run db:seed` for production (no demo leads/moderators).

## 2. GitHub
`git init && git add . && git commit -m "Rezora CRM"` then push to a **private** repo. `.env` is gitignored — never commit it.

## 3. Vercel
1. Import the repo. Framework: Next.js. Build command: `npm run build` (runs `prisma generate`).
2. Environment variables: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (`openssl rand -base64 48`), `AUTH_URL` (your https domain), `SUPER_ADMIN_NAME/EMAIL/PASSWORD` (only needed when seeding).
3. Apply migrations to Neon from your machine: `npx prisma migrate deploy` (with production `DIRECT_URL`).
4. Deploy, sign in, **change the Super Admin password in Settings immediately**.

## 4. Before go-live checklist
- Rotate any secret that was ever pasted in chat/email (Neon password, `AUTH_SECRET`, admin password) and update Vercel env.
- Delete demo moderators (`*@rezora.demo`) if you seeded demo data.
- Confirm `/leads` as a moderator shows only the 7 allowed columns and `/overview` redirects.
- Run `npm test` and the manual checks in `TESTING.md`.

## 5. Backups
- Neon keeps point-in-time history (window depends on plan) — know your restore window and test a branch restore once.
- Take a logical dump weekly: `pg_dump "$DIRECT_URL" -Fc -f rezora-$(date +%F).dump`; store it off-platform (encrypted).
- Export leads CSV from the Leads page after big imports as a second safety net.

## 6. Operations notes
- Rate limits are in-memory per serverless instance. For strict limits use Upstash Redis in `src/lib/rate-limit.ts`.
- Sessions are JWTs (12h). Disabling a moderator takes effect immediately because every page re-checks the database; changing a password does not revoke already-issued tokens until they expire.
