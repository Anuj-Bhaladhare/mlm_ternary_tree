# MLM Ternary Tree

## Authentication

- Sign in with the email address or member code assigned to the account and its password.
- Member accounts are created by an administrator and activated through a secure, single-use setup link. Public self-registration is intentionally disabled so new accounts cannot bypass member and placement provisioning.
- Password setup, sign-in, and password reset do not require email verification or an email OTP. The activation/reset link is issued through the administrator workflow.
- Passwords must be 12–128 characters. Better Auth manages password hashing and sessions; inactive or pending members cannot establish a session.
- The initial administrator must use the one-time bootstrap flow at `/admin/setup` with the server-configured identity and bootstrap token.
- Alternatively, set `APP_ADMIN_USER` and `APP_ADMIN_PASSWORD` in the server environment to provision the administrator automatically when the Next.js server starts. The app creates the account only when that email is not already registered, assigns the administrator role, and never changes an existing account's password. Both variables must be set together; the configured password must be 12–128 characters. Apply database migrations before starting the app.
- Administrators may also be registered at `/admin/register` using the server-only `ADMIN_CREATION_KEY` (minimum 16 random characters). Configure this secret in the server environment before starting the app; it is never sent to or stored by the browser. The registration endpoint is rate-limited, rejects existing email addresses, assigns the administrator role server-side, and redirects successful registrations to sign-in.
- Members cannot self-register. Existing administrator-only member creation provisions MEMBER accounts using the established activation-link flow.
