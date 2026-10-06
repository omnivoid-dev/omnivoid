# Transition & Handover Plan: Modern React Site

Based on a thorough analysis of the codebase, the modern Next.js site (`LABS3`) is exceptionally well-prepared for this transition. The backend (Prisma) is fully wired, and a comprehensive Admin Dashboard already exists under `src/app/admin`. The frontend is also already designed to support "Choose Your Edition" logic.

The goal now is to safely unlock the modern site, retain the legacy site (`LABSNEW`) as a backup, and transition the infrastructure to the client's Vercel and Supabase accounts.

## User Review Required

> [!IMPORTANT]
> The database is currently pointing to a Neon PostgreSQL instance. We will need the client to create a **Supabase** account and project so we can point the production environment there.

> [!NOTE]
> The client will also need to create a **Vercel** account. They can add you as a collaborator on both Vercel and Supabase so you can handle the technical integration while they retain ownership and billing.

## Proposed Plan

### 1. Enable the Modern React Site (`LABS3`)
Currently, the main entry point to the new site is disabled on the splash screen. We will:
- **Enable the "V4 Portal" Button:** Modify `StartScreen.tsx` to unlock the main button so users can enter the modern application.
- **Edition Chooser Navigation:** Ensure the main `page.tsx` UI clearly exposes the "Choose Your Edition" dropdown or selector. The data structure for this is already built into the backend.
- **Admin UI Polish:** Ensure the `src/app/admin` login and dashboard are ready for the client to start uploading Mixcloud links, text documents, and edition metadata.

### 2. Legacy Site Backup (`LABSNEW`)
We will preserve the legacy vanilla JS site as a fallback.
- **Deployment:** We can deploy `LABSNEW` as a completely separate project on Vercel (e.g., `legacy.omnivoidlabs.com`), or serve it from a `/legacy` path on the main domain.
- **Cross-linking:** We will ensure the "Original Repository" button on the modern splash screen points to this new legacy URL.

### 3. Vercel & Supabase Handover Setup
To ensure the client handles hosting/billing and you act as a collaborator:

1. **Supabase Setup:**
   - Client creates a new Supabase project.
   - Client invites you to the Supabase organization.
   - We obtain the `DATABASE_URL` and `DATABASE_URL_UNPOOLED` strings.
2. **Database Migration:**
   - We run `npx prisma db push` on the new Supabase database to instantly construct all tables (`Edition`, `Gig`, `Document`, `Resource`, `Link`).
   - We run the seed script (`npm run seed:admin`) to generate the initial admin login credentials for the client.
3. **Vercel Setup:**
   - Client creates a Vercel account and links their GitHub.
   - Client imports the `QuantumClimb/omnivoid` repository.
   - Client invites you as a Developer/Collaborator on the Vercel project.
   - We configure the Vercel Environment Variables (`DATABASE_URL`, `JWT_SECRET`, etc.) to point to Supabase.

## Open Questions

> [!WARNING]
> 1. **Domain Names:** What domain names will we use for the main site vs. the legacy backup? (e.g., `omnivoidlabs.com` for modern, `legacy.omnivoidlabs.com` for backup?)
> 2. **Authentication:** Have you already decided on a default admin email and password that we should seed for the client to use for their first login?

## Verification Plan

### Automated Tests
- Build verification via `npm run build` prior to handing over the Vercel connection.
- Database schema validation via `npx prisma validate`.

### Manual Verification
- We will log into the Admin Dashboard locally using the seeded credentials to test uploading a Mixcloud link.
- We will verify that changing the "Active Edition" in the admin panel correctly updates the frontend's Edition Chooser.
