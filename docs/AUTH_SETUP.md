# Firebase sign-in and PostgreSQL workspaces

This milestone adds real email/password and Google sign-in, password reset, workspace creation/listing, owner membership, a member list, and workspace-scoped persistent issues. The existing `/board` demo remains a separate local sandbox. Real workspaces start empty at `/workspaces` and `/w/:workspaceId`.

## Local setup

1. Copy `.env.example` to `.env` at the repository root. This file is ignored by Git.
2. Choose a local PostgreSQL password, set both `POSTGRES_PASSWORD` and the password inside `DATABASE_URL`, and keep port `55432` unless it is occupied. Use a URL-encoded password if it contains punctuation.
3. Set `WORKSPACES_ENABLED=true` and `FIREBASE_PROJECT_ID` to your project ID.
4. Register a Firebase Web app. Copy `apiKey`, `authDomain`, `projectId`, and `appId` into their matching `VITE_FIREBASE_*` variables. These values identify the web app; they are not service-account private keys. Analytics is deliberately not initialized.
5. Enable Email/Password and Google in Firebase Authentication. Add `localhost` and `127.0.0.1` to Authorized domains. Choose a support email for Google.
6. Run:

```sh
pnpm install
pnpm --filter @sprintpilot/api db:generate
docker compose up -d postgres
pnpm --filter @sprintpilot/api db:migrate
pnpm dev
```

Open http://127.0.0.1:5173/login. Create your account or continue with Google, then create a workspace and an issue. Move the issue, refresh, and check persistence. Sign out: protected workspace URLs redirect to login. To try the demo without signing in, open http://127.0.0.1:5173/board.

Restart the development servers after changing `.env`. Vite exposes only the `VITE_` variables to the browser. Database credentials and server-only variables remain on the API.

## Verification and boundaries

The API verifies ID-token signature, project audience/issuer, and expiry through Firebase Admin. It does not trust a user ID supplied by the browser. Membership is checked before every workspace operation, and issue updates/deletes include both issue ID and workspace ID. Workspace creation and owner membership are atomic. Issue-number allocation uses a row update inside a database transaction.

Only token verification is used; the application does not administer Firebase accounts. No service-account private key is needed by this code path with an explicit project ID. Deployment, account administration, and revocation checks will use Application Default Credentials and least-privilege service identities in a later milestone. Do not set `FIREBASE_AUTH_EMULATOR_HOST` when testing real Firebase accounts.

`pnpm test` runs the authentication boundary tests with a fake verifier, with no real Google calls. Set `TEST_DATABASE_URL` to a migrated test database to also run the PostgreSQL integration test. It creates uniquely identified test users/workspaces and removes only its own records. CI provides a dedicated PostgreSQL service and runs these tests automatically. Browser tests use isolated ports and disable live Firebase configuration, so they never create cloud accounts or send reset emails.

A real Google popup/email sign-in needs the account owner to complete the browser interaction. Automated tests do not establish that the project's provider settings are correct.

## Remaining workspace features

Invitations, administrator controls, team assignment, epics, comments, sprint lifecycle, workspace standups, events, and AI remain in the roadmap. Workspace issues are currently unassigned. The server stays on loopback because the unauthenticated demo is still enabled.

References: [Firebase web setup](https://firebase.google.com/docs/web/setup), [ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [Prisma 7 configuration](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7).
