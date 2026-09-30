# Orange account workspace

A responsive account application built with plain HTML/CSS/JavaScript, Express, and MySQL. Registration, authentication, profile updates, email preferences, and workspace content are persisted to MySQL.

## Requirements

- Node.js 20 or newer
- MySQL 8 or newer

## Run locally

1. Start MySQL and run `schema.sql` with your MySQL client. It creates the database, users table, and account-owned CMS content table. Re-run it after updates to add new tables safely.
2. Copy `.env.example` to `.env` and set your MySQL connection details plus a random `JWT_SECRET` with at least 32 characters.
3. Install dependencies with `npm install`.
4. Start the app with `npm start` and open `http://localhost:3000`.

For development, `npm run dev` restarts the server when files change. The server serves the frontend and API from the same origin. Passwords are hashed with bcrypt, SQL values are parameterized, and authentication uses a signed HTTP-only cookie.

Run `npm test` for the CMS content validation tests and `npm run check` for JavaScript syntax checks.

## Workspace CMS

After signing in, open **Content** in the sidebar to edit the brand name, navigation, dashboard cards, overview, profile, about, settings, and editor copy. Changes are validated and stored in `workspace_content`, keyed to the signed-in account. Other accounts cannot read or change that row through the API. Existing accounts get a default row automatically on their next sign-in.

Authentication prompts, security controls, validation errors, and CMS field labels remain application-owned so an account owner cannot remove the controls needed to sign in, correct content, or use the editor. The CMS edits the account's authenticated workspace, not a public multi-tenant login page.

If MySQL is unavailable or misconfigured, the app displays a connection/setup error instead of treating database failure as a signed-out state. The server requires a running MySQL instance; it does not use an in-memory or mock-data fallback.
