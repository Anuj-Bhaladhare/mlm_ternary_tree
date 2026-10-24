# Ternary Tree MLM Platform — Updated AGENTS.md

Below is the complete revised specification. All binary-tree concepts have been replaced with **ternary tree** (three positions: `LEFT`, `MIDDLE`, `RIGHT`) and the admin member-creation + ternary-tree visualization feature has been added. Changed sections are marked with `🔺` in headings for easy review.

---

## 1. Project Mission

You are a senior software architect, full-stack engineer, PostgreSQL database specialist, security engineer, and automated testing engineer.

Build a secure, scalable, maintainable, production-quality Multi-Level Marketing (MLM) **Ternary Tree** Management Platform using:

- **Frontend:** Next.js App Router, React, TypeScript
- **Backend:** Next.js server-side services and Route Handlers
- **Database:** PostgreSQL
- **Database access:** Drizzle ORM with explicit SQL migrations
- **Validation:** Zod
- **Forms:** React Hook Form
- **Styling:** Tailwind CSS and accessible UI components
- **Testing:** Vitest, React Testing Library, and Playwright
- **Deployment:** Docker, Docker Compose, and a production-ready Linux environment

Use stable, mutually compatible package versions. Verify current framework documentation before adopting APIs or dependencies.

The objective is to create a complete business application that manages **ternary genealogy**, referrals, members, activation, commissions, wallets, payouts, reporting, and administrative operations. Administrators must be able to create members directly and view an interactive ternary-tree representation of the network.

Do not build a superficial demo. Build a properly structured application with documented business rules, enforced database integrity, automated tests, and secure operational workflows.

## 2. Rules for AI Coding Agents

These rules apply to every task.

1. Inspect the existing repository before modifying files.
2. Read this document and any applicable nested `AGENTS.md` files before implementation.
3. Preserve working functionality unless the requested change explicitly requires modifying it.
4. Follow existing conventions where they do not conflict with security, data integrity, or this document.
5. Never fabricate business requirements, commission percentages, fees, payout limits, or placement policies.
6. Never use mock data as a substitute for production database operations without clearly separating development fixtures from production functionality.
7. Never silently delete user data, database records, migrations, or existing modules.
8. Never commit credentials, access tokens, private keys, or real customer data.
9. Never claim a feature works unless its implementation and relevant tests have been verified.
10. Keep changes focused, documented, and reviewable.

Before implementing a feature:

- Inspect related source files, database schemas, migrations, and tests.
- Identify dependencies and affected modules.
- Confirm any missing business rules.
- Write a short implementation plan for complex changes.
- Implement the smallest complete solution.
- Run relevant tests, type checks, linting, and builds.
- Report changed files, verification results, and known limitations.

If requirements conflict, prioritize data integrity, security, explicit business rules, and existing production data safety.

## 3. Architecture and Engineering Principles

Use a modular monolith initially. Keep business logic separate from UI components, database access, authentication, and HTTP handlers.

Follow these architectural principles:

- Separation of concerns.
- High cohesion and low coupling.
- Strong TypeScript typing.
- Explicit service boundaries.
- Dependency direction toward domain logic.
- Reusable, testable business services.
- Server-side authorization.
- Transactional database operations.
- Structured logging and operational observability.
- Backward-compatible database migrations where practical.

Do not introduce microservices, message brokers, distributed caching, or unnecessary infrastructure without a demonstrated requirement.

### Request processing flow

Browser/UI → Next.js Route Handler or Server Action → Authentication and authorization → Input validation → Domain service → Database transaction → Response.

Use Server Components for data-driven pages where appropriate. Use Client Components only when browser interaction or client-side state is required.

Do not access PostgreSQL directly from browser code.

## 4. Recommended Project Structure

Maintain clear boundaries between application routes, reusable UI, business services, and database infrastructure.

```
src/
├── app/
│   ├── (public)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── members/
│   │   ├── genealogy/
│   │   ├── commissions/
│   │   ├── wallet/
│   │   ├── payouts/
│   │   └── reports/
│   ├── admin/
│   │   ├── members/
│   │   │   ├── new/            # 🔺 Admin member creation
│   │   │   └── page.tsx
│   │   └── genealogy/
│   │       └── page.tsx        # 🔺 Full ternary tree admin view
│   ├── api/
│   ├── layout.tsx
│   ├── error.tsx
│   ├── loading.tsx
│   └── not-found.tsx
├── components/
│   ├── ui/
│   ├── forms/
│   ├── tables/
│   ├── charts/
│   ├── genealogy/
│   │   ├── TernaryTreeView.tsx      # 🔺
│   │   ├── TernaryTreeNode.tsx      # 🔺
│   │   ├── TernaryTreeToolbar.tsx   # 🔺
│   │   └── TernaryTreeLegend.tsx    # 🔺
│   └── layout/
├── modules/
│   ├── auth/
│   ├── members/
│   ├── genealogy/
│   │   ├── placement.service.ts     # 🔺 ternary placement
│   │   ├── traversal.service.ts     # 🔺 recursive CTEs
│   │   └── ternary-tree.ts          # 🔺 domain types/helpers
│   ├── commissions/
│   ├── wallet/
│   ├── payouts/
│   ├── reports/
│   └── administration/
│       └── admin-member.service.ts  # 🔺 admin-driven member creation
├── server/
│   ├── auth/
│   ├── db/
│   ├── permissions/
│   ├── services/
│   ├── audit/
│   └── observability/
├── lib/
│   ├── validation/
│   ├── errors/
│   ├── formatting/
│   └── constants/
├── types/
└── styles/

drizzle/
├── schema/
├── migrations/
└── seed.ts

tests/
├── unit/
├── integration/
├── security/
└── e2e/

docs/
├── architecture.md
├── database-design.md
├── ternary-tree-rules.md       # 🔺 renamed from binary-tree-rules.md
├── compensation-plan.md
├── api-contracts.md
├── security.md
└── deployment.md

docker/
scripts/
.env.example
.gitignore
Dockerfile
docker-compose.yml
drizzle.config.ts
package.json
tsconfig.json
README.md
AGENTS.md
```

Adapt this structure to the actual repository rather than recreating it unnecessarily. Keep individual modules cohesive and avoid excessively fragmented files.

## 5. 🔺 Ternary Tree Domain Model

Understand the difference between sponsorship and ternary placement.

### 5.1 Sponsor relationship

The sponsor is the member who referred or introduced another member to the business.

Store this relationship independently from ternary placement.

### 5.2 Ternary placement relationship

Every placed member can have **at most three direct children**:

- `LEFT` child
- `MIDDLE` child
- `RIGHT` child

Each member can have only one ternary parent.

Represent the relationship using fields equivalent to:

- `id`
- `member_code`
- `sponsor_id`
- `parent_id`
- `position` — one of `LEFT | MIDDLE | RIGHT`
- `status`
- `created_at`
- `updated_at`

Use UUIDs or another well-designed identifier strategy consistently.

`position` must be restricted to `LEFT`, `MIDDLE`, or `RIGHT` for placed members. The root node must follow an explicitly defined root policy.

The database must enforce that a parent cannot have two different children occupying the same position.

Use a unique constraint equivalent to:

```sql
UNIQUE(parent_id, position)
```

with a `CHECK (position IN ('LEFT','MIDDLE','RIGHT'))` constraint on the `members` table (or a dedicated `placements` table if you separate placement from the profile).

Account for the root member and nullable parent behavior explicitly. PostgreSQL ordinarily permits multiple NULL values in a unique constraint, so this constraint alone does not enforce a single root. Use a **partial unique index** to guarantee a single root:

```sql
CREATE UNIQUE INDEX members_single_root
  ON members ((TRUE))
  WHERE parent_id IS NULL AND status <> 'DELETED';
```

(or an equivalent application-enforced + database-verified constraint; document the chosen approach).

### 5.3 Fundamental tree invariants

The system must guarantee:

1. Every member has a unique identity.
2. A member has at most one ternary parent.
3. A parent has at most one `LEFT`, one `MIDDLE`, and one `RIGHT` child.
4. A member cannot be its own parent.
5. A member cannot appear in a cycle.
6. A member cannot be placed into an occupied position.
7. Placement must not silently overwrite existing relationships.
8. Sponsor and placement relationships must not be confused.
9. Members must not be physically deleted if that would corrupt financial or genealogy history.
10. All tree mutations must follow a documented transactional procedure.

Use PostgreSQL constraints for enforceable local invariants and transactions plus carefully designed service logic for complex invariants.

For operations that can race, use appropriate locking or transaction isolation and retry handling. A pre-insert availability check is not sufficient to guarantee safe placement.

## 6. 🔺 Ternary Placement Strategies

Implement placement as a dedicated domain service rather than embedding it in registration forms.

Support a configurable placement policy only when the business requirements are defined.

Potential policies include:

- Manual placement by an authorized administrator (including during admin-driven member creation).
- Member-selected `LEFT`, `MIDDLE`, or `RIGHT` placement.
- Automatic placement in the next eligible position (defined order, e.g., LEFT → MIDDLE → RIGHT).
- Spillover placement beneath an existing subtree.

Do not assume that automatic placement or spillover is required. These policies produce different business outcomes and must be approved explicitly.

For every placement operation:

1. Authenticate the requester.
2. Authorize the operation.
3. Validate the member and intended parent.
4. Check the selected position (`LEFT | MIDDLE | RIGHT`).
5. Apply the documented placement policy.
6. Perform the mutation transactionally.
7. Record an audit event.
8. Return the persisted placement details.

If concurrent requests attempt to occupy the same position, only a valid transaction may succeed. Handle unique-constraint conflicts and retryable transaction failures safely.

Do not allow ordinary member updates to change `parent_id`, `position`, or `sponsor_id` directly.

If placement corrections are supported, provide a dedicated, permission-controlled workflow with validation, audit history, and an explicit policy for existing descendants.

## 7. 🔺 Ternary Tree Queries

The application must provide a usable representation of the ternary network.

Required capabilities:

- Display `LEFT`, `MIDDLE`, and `RIGHT` branches.
- Expand and collapse subtrees.
- Navigate to a member's profile.
- Search members by member code or permitted identifying fields.
- Display placement depth and parent information.
- Show `LEFT`, `MIDDLE`, and `RIGHT` subtree counts.
- Support pagination or lazy loading for large networks.
- Restrict access to member information based on permissions.
- Provide a clear empty state and useful error messages.
- Provide an admin-only full-network view with the ternary-tree visualization (see §13).

Use PostgreSQL recursive CTEs or another measured, tested query strategy for descendant and ancestor traversal.

Avoid loading the entire genealogy into application memory for every request.

Define the difference between:

- Placement depth.
- Total descendants.
- `LEFT` subtree members.
- `MIDDLE` subtree members.
- `RIGHT` subtree members.
- Direct referrals.
- Total sponsored members.

Do not label one metric as another.

For large networks, measure recursive query performance and add suitable indexes. Consider a closure table or materialized path only when the required queries and observed workload justify the additional maintenance complexity.

## 8. Database Design

Use PostgreSQL as the authoritative source of truth.

Create normalized, documented schemas and version-controlled migrations.

Expected tables include, where required by the approved feature scope:

### Identity and access

- `users`
- `roles`
- `permissions`
- `user_roles`
- `sessions` or the chosen authentication provider's equivalent

### MLM members and genealogy

- `members` — 🔺 includes `parent_id`, `position ∈ {LEFT,MIDDLE,RIGHT}`, `sponsor_id`
- `member_status_history`
- `placement_history` — 🔺 records `LEFT/MIDDLE/RIGHT` changes
- `sponsorship_history`, if required

### Compensation and finance

- `compensation_plans`
- `commission_rules`
- `commission_events`
- `commission_entries`
- `wallet_accounts`
- `wallet_transactions`
- `payout_requests`
- `payout_attempts`
- `refunds` or `reversals`, where applicable

### Operations

- `audit_logs`
- `idempotency_keys`
- `notifications`
- `system_settings`

Do not create every table blindly. Design schemas around the actual approved features and business rules.

### 🔺 Ternary-specific database requirements

- `position` column: `CHECK (position IN ('LEFT','MIDDLE','RIGHT'))`.
- `UNIQUE (parent_id, position)` to prevent duplicate occupancy.
- Partial unique index to enforce a **single root** when `parent_id IS NULL`.
- A `CHECK (parent_id IS DISTINCT FROM id)` on `members` prevents self-parent.
- Cycle prevention is enforced in the placement service inside a transaction (recursive ancestor check + `FOR UPDATE` lock on affected nodes).
- Consider a `tree_path` materialized path column (`LEFT.MIDDLE.RIGHT…`) or a closure table **only if** query profiling shows recursive CTEs are insufficient; document the trade-off.

### Database requirements

- Use foreign keys.
- Use appropriate unique, check, and not-null constraints.
- Index frequently queried foreign keys and filter columns (`members(parent_id)`, `members(position)`, `members(sponsor_id)`).
- Use explicit database transactions for multi-record business operations.
- Store timestamps consistently, preferably as `timestamptz`.
- Store monetary amounts using integer minor units or an appropriately sized PostgreSQL `NUMERIC` type.
- Never use JavaScript floating-point arithmetic as the authoritative money calculation.
- Define currency, rounding, precision, and conversion rules explicitly.
- Keep schema changes in migrations.
- Do not use destructive schema synchronization in production.
- Do not edit already-applied migrations in a way that breaks existing environments.

Drizzle ORM should be the normal application database interface. Use parameterized SQL for operations that benefit from PostgreSQL-specific functionality, including recursive CTEs and carefully designed locking queries.

## 9. Financial Ledger and Wallet Integrity

Treat all financial records as auditable business records.

Never implement wallet balances as an editable number that administrators or members can arbitrarily change.

Use an append-only transaction ledger with a documented balance calculation or a safely maintained balance projection backed by ledger entries.

Every financial transaction must have:

- A unique identifier.
- A member or account reference.
- A transaction type.
- An exact amount and currency.
- A status.
- A business reference.
- A creation timestamp.
- An idempotency reference where applicable.

Where applicable, record debit and credit entries in a balanced ledger.

Enforce financial invariants inside database transactions. A failed commission, debit, credit, or payout operation must not leave partial financial records.

Prevent duplicate processing using database-enforced idempotency keys and unique business references.

Never silently edit or delete posted financial entries. Use explicit reversal or adjustment entries with a reason and audit trail.

Wallet balance displays must reconcile with the authoritative ledger.

## 10. Commission Engine

Implement the compensation engine as an isolated, independently tested domain module.

Do not hardcode commission calculations inside API handlers, React components, or member registration logic.

Potential commission types include:

- 🔺 Ternary sales commission.
- 🔺 Left / Middle / Right business volume matching.
- Pairing or cycle bonuses (ternary: triads).
- Level-based bonuses.
- Rank-based bonuses.
- Referral bonuses.
- Caps and carry-forward rules.

These are potential features, not assumed requirements.

Before implementing any commission type, obtain the approved compensation plan specifying:

- Qualifying events.
- Eligible member statuses.
- Commission rates or fixed amounts.
- Eligible volume definitions.
- 🔺 Left/Middle/Right matching rules (e.g., how a triad is formed and matched).
- Carry-forward behavior (e.g., unmatched volumes in one leg carry forward).
- Daily, weekly, or monthly caps.
- Rounding rules.
- Refund and chargeback treatment.
- Rank eligibility.
- Effective dates.
- Payout eligibility and restrictions.

Represent effective-dated rules explicitly so that changing a plan does not silently rewrite historical results.

For every commission calculation:

1. Identify the qualifying event.
2. Validate event eligibility.
3. Resolve the applicable compensation plan.
4. Calculate the commission using deterministic arithmetic.
5. Record calculation inputs and rule versions.
6. Persist the result transactionally.
7. Prevent duplicate commission generation.
8. Record any rejection or reversal reason.
9. Make the calculation reproducible for authorized audits.

Do not pay commissions merely because a new member registered. Tie compensation to legitimate, documented qualifying activity under the approved plan.

Do not invent a compensation plan to make the demo appear functional.

## 11. Authentication and Authorization

Implement secure authentication using a maintained authentication library appropriate for the Next.js version.

Never invent custom cryptographic algorithms or store plaintext passwords.

Requirements:

- Secure password hashing when password authentication is used.
- Secure session management.
- Session invalidation and logout.
- Password reset with expiring, single-use tokens.
- Email verification if required.
- Rate limiting for authentication-sensitive endpoints.
- Appropriate session cookie flags.
- Protection against cross-site request forgery where applicable.
- Protection against brute-force attempts.
- Server-side authorization on every protected operation.

Use role-based access control with explicit permissions.

Expected roles may include:

- Super Administrator.
- Administrator.
- Finance Manager.
- Support Operator.
- Member.

These roles must be configurable according to business requirements.

Never rely on hidden buttons or client-side route protection as the only authorization mechanism.

Members must not access another member's private information or financial data simply by changing an identifier in a request.

Verify ownership and permissions inside server-side services.

### 🔺 Administrator capabilities (explicit)

Members holding the `admin.members.create` and `admin.genealogy.view` permissions (typically `Administrator` and `Super Administrator`) must be able to:

1. **Create members directly** via an admin form (`/admin/members/new`).
2. Choose the **sponsor** and **placement parent + position** (`LEFT | MIDDLE | RIGHT`).
3. Trigger the ternary placement service transactionally with audit logging.
4. **View the full ternary-tree representation** at `/admin/genealogy`.

These capabilities are permission-gated server-side. Hiding UI controls is not sufficient — the corresponding Route Handler and service must reject unauthorized callers.

## 12. API and Validation Standards

Use consistent request and response contracts.

For every mutation endpoint:

1. Authenticate the requester.
2. Authorize the requested action.
3. Validate input using Zod.
4. Normalize permitted input.
5. Invoke a domain service.
6. Apply the necessary database transaction.
7. Return a predictable response.
8. Log operational failures without exposing secrets.

Use appropriate HTTP status codes, including:

- `200` for successful retrieval or updates.
- `201` for successful resource creation.
- `400` for invalid requests.
- `401` for unauthenticated requests.
- `403` for forbidden actions.
- `404` for missing resources.
- `409` for conflicting state (e.g., `POSITION_OCCUPIED`).
- `422` where semantic validation errors are appropriate.
- `429` for rate limiting.
- `500` for unexpected server failures.

Use a consistent error structure, for example:

```json
{
  "error": {
    "code": "POSITION_OCCUPIED",
    "message": "The selected position is unavailable.",
    "requestId": "request-id"
  }
}
```

Do not expose SQL queries, database credentials, stack traces, password hashes, or internal infrastructure details to clients.

Use pagination and explicit limits for list endpoints. Validate sorting and filtering fields against allowlists.

### 🔺 Required admin endpoints

- `POST /api/admin/members` — create a member with `sponsorId`, optional `parentId`, and `position`.
  - Permission: `admin.members.create`.
  - Idempotency: `Idempotency-Key` header required.
  - Errors: `POSITION_OCCUPIED`, `INVALID_PARENT`, `CYCLE_DETECTED`, `SELF_PARENT`, `SPONSOR_NOT_FOUND`.
- `GET /api/admin/genealogy/tree?rootId=&depth=` — returns the ternary tree subtree for rendering.
  - Permission: `admin.genealogy.view`.
  - Returns `{ id, memberCode, displayName, position, children: { LEFT, MIDDLE, RIGHT } }`.

## 13. 🔺 Frontend and User Experience

Build a consistent, professional administrative dashboard.

The interface should be responsive, accessible, and practical for daily business operations.

### Member experience

- Secure login and account management.
- Member dashboard.
- Referral and sponsor information.
- **Ternary genealogy visualization.**
- `LEFT`, `MIDDLE`, `RIGHT` business statistics.
- Commission history.
- Wallet transaction history.
- Payout requests and statuses.
- Profile settings.

### Administration experience

- Business overview and analytics.
- Member search and management.
- **Admin member creation flow** (`/admin/members/new`).
- **Full ternary-tree inspection view** (`/admin/genealogy`).
- Genealogy inspection and authorized placement.
- Member status management.
- Compensation plan configuration.
- Commission review.
- Wallet reconciliation.
- Payout approval and processing.
- Audit log viewer.
- Operational and financial reports.

Only implement screens backed by defined business rules and server-side functionality.

### 🔺 Admin Member Creation UI

A dedicated page at `/admin/members/new` that:

- Uses React Hook Form + Zod schema mirrored from the server.
- Fields: `sponsorId` (searchable), `parentId` (searchable, defaults to root or auto-placement), `position ∈ {LEFT, MIDDLE, RIGHT}`, member profile fields, initial status.
- Shows a **live preview** of the intended ternary slot and a warning if occupied.
- Disables submit during request and surfaces server error codes as accessible messages.
- Redirects to the new member's profile on success.

### 🔺 Ternary Tree Visualization Component

Reusable component `components/genealogy/TernaryTreeView.tsx`:

- Renders a node with **three** child slots labeled `Left`, `Middle`, `Right`.
- Empty slots are visible as dashed placeholders (admin can click to place a member there).
- Collapsible subtrees with lazy fetch on expand (`GET /api/admin/genealogy/tree?rootId=…`).
- Node card shows: member code, display name, status badge, `LEFT/MIDDLE/RIGHT` subtree counts.
- Keyboard navigable: `↑/↓` move between siblings, `←/→` cycle legs, `Enter` opens profile, `Space` toggles expansion.
- Search box filters/highlights nodes by member code.
- Zoom/pan controls; default viewport fit-to-subtree.
- Uses semantic HTML (`<ul>/<li>` or ARIA `tree`/`treeitem`/`group` roles).
- Respects permissions: read-only users cannot see click-to-place affordances.

### UI quality standards

- Use shared design tokens and reusable components.
- Use semantic HTML and accessible labels.
- Support keyboard navigation.
- Provide loading, empty, error, and success states.
- Use confirmation dialogs for destructive or financially consequential actions.
- Prevent accidental duplicate submissions.
- Show clear validation messages.
- Use appropriate date, number, and currency formatting.
- Avoid unnecessary animations and excessive dashboard decoration.
- Never show fabricated production statistics.

For the genealogy visualization, prioritize readable branches, efficient rendering, member search, and controlled expansion over displaying thousands of nodes simultaneously.

## 14. Security Requirements

Treat security as a design requirement, not a final cleanup task.

- Validate and authorize every untrusted input.
- Use parameterized database queries.
- Protect against SQL injection, XSS, CSRF, and broken access control.
- Restrict file uploads by type, size, and content when uploads exist.
- Apply appropriate security headers and a considered Content Security Policy.
- Store secrets in environment variables or an appropriate secret manager.
- Keep `.env` files containing real secrets out of version control.
- Provide a safe `.env.example` without real credentials.
- Use least-privilege database credentials.
- Restrict administrative and financial permissions.
- Audit sensitive changes and financial operations.
- Redact tokens, passwords, and sensitive personal information from logs.
- Configure request size limits and rate limits.
- Review dependencies for known vulnerabilities.
- Use secure production cookie and transport settings.
- Verify backup and restore procedures.
- Never disable security checks merely to make a test pass.

Do not trust role names, member IDs, amounts, commissions, or balances supplied by the client.

### 🔺 Admin-specific controls

- Admin member creation and genealogy viewing require explicit permissions enforced server-side.
- Admin placement mutations require `Idempotency-Key` to prevent duplicate member creation on retry.
- Every admin create/placement action writes an `audit_logs` entry with actor, target member, sponsor, parent, position, and request ID.

## 15. Auditability and Observability

Create structured logs and meaningful operational events.

Track important actions, including:

- Authentication failures.
- Permission denials.
- Member creation and status changes (🔺 including admin-created members).
- 🔺 Placement operations (including `position` chosen and `parentId`).
- Compensation plan changes.
- Commission generation and reversal.
- Wallet adjustments.
- Payout approval and failure.
- Administrative configuration changes.
- 🔺 Admin genealogy view access (aggregate usage, not per-node).

Audit events should include the actor, action, affected resource, timestamp, outcome, and relevant non-sensitive context.

For high-risk operations, capture a reason and a correlation or request identifier.

Do not store passwords, session secrets, payment credentials, or unnecessary sensitive data in audit logs.

Use monitoring and alerting appropriate to the deployment environment. Do not log every database query indiscriminately.

## 16. Testing Strategy

Testing is mandatory for every business-critical feature.

### Unit tests

Test isolated business rules:

- Placement validation (`LEFT`, `MIDDLE`, `RIGHT`).
- Position availability checks.
- Ancestor and descendant calculations across three legs.
- Commission arithmetic.
- Eligibility rules.
- Rounding behavior.
- Permission decisions (`admin.members.create`, `admin.genealogy.view`).
- Payout state transitions.

### Integration tests

Test actual PostgreSQL behavior:

- Unique placement constraints across `(parent_id, position)`.
- Single-root partial unique index.
- Self-parent `CHECK` constraint.
- Foreign key enforcement.
- Transaction rollback.
- Concurrent placement attempts on the same `LEFT`/`MIDDLE`/`RIGHT` slot.
- Recursive tree queries returning three legs correctly.
- Duplicate commission prevention.
- Wallet ledger reconciliation.
- Payout processing and reversal.
- Authorization at service and API boundaries.
- 🔺 Admin member creation writes member + placement + audit atomically.

### End-to-end tests

Test essential workflows:

1. Administrator creates or configures the initial network root.
2. 🔺 Administrator creates a member via `/admin/members/new`, choosing `LEFT`/`MIDDLE`/`RIGHT`.
3. 🔺 The new member appears in `/admin/genealogy` under the correct parent and slot.
4. A member registers and is placed according to policy.
5. An authorized user views the genealogy.
6. 🔺 A parent cannot exceed three direct ternary children (one per slot).
7. Unauthorized users cannot modify placement or call admin create endpoints.
8. Qualifying events generate commissions correctly.
9. Duplicate events do not generate duplicate commissions.
10. Wallet and payout balances remain consistent.
11. Administrative actions produce audit events.
12. Errors do not leave partial database mutations.

Test both successful and rejected operations.

### Required verification

Before declaring a change complete, run the applicable commands, such as:

```
npm run lint
npx tsc --noEmit
npm run test
npm run test:e2e
npm run build
```

Use the scripts actually defined by the project. Do not claim a command passed if it was not executed successfully.

## 17. Performance and Scalability

Design for growth without premature complexity.

- Add indexes based on query patterns and execution plans.
- Avoid N+1 queries.
- Paginate large datasets.
- Use lazy loading for large genealogy views (especially the ternary tree).
- Select only the columns required by each operation.
- Use database aggregation for suitable reporting queries.
- Avoid unbounded recursive queries (cap depth and node count; require `rootId`).
- Establish sensible request and query timeouts.
- Profile expensive queries before introducing caching.
- Cache only data that can safely tolerate the selected invalidation policy.
- Never serve stale financial authorization or balance data as authoritative.
- Use background workers only when justified by asynchronous workloads.

Test realistic network sizes and concurrent placement and financial operations before making scalability claims.

## 18. Configuration and Deployment

Support separate local development, test, staging, and production configurations.

Provide:

- A documented `.env.example`.
- A reproducible dependency installation process.
- Database migrations and seed scripts.
- Docker-based local development where appropriate.
- Production build instructions.
- Health checks.
- Database backup and restore documentation.
- Secure deployment configuration.
- Logging and error-monitoring guidance.
- A rollback plan for application releases and database migrations.

Use environment variables for database connections and authentication secrets.

Fail safely when required configuration is missing. Do not silently substitute development secrets or insecure defaults in production.

Use non-destructive migrations and verify database backups before risky schema changes.

## 19. Documentation Requirements

Maintain the following documentation as the project evolves:

- `README.md`: installation, configuration, development, testing, and deployment.
- `docs/architecture.md`: application layers and module responsibilities.
- `docs/database-design.md`: entities, relationships, constraints, and indexes.
- 🔺 `docs/ternary-tree-rules.md`: placement policies, `LEFT/MIDDLE/RIGHT` invariants, and single-root policy.
- `docs/compensation-plan.md`: approved commission rules and examples.
- `docs/api-contracts.md`: endpoints, schemas, authorization, and errors (including admin endpoints).
- `docs/security.md`: authentication, authorization, secrets, and threat controls.
- `docs/deployment.md`: environment setup, migrations, backups, and recovery.

Document non-obvious decisions and their rationale. Keep examples consistent with the actual implementation.

## 20. Development Phases

Build the application in the following order.

### Phase 1 — Discovery and foundation

- Inspect the repository.
- Confirm framework and dependency versions.
- Define architecture and module boundaries.
- Configure TypeScript, linting, formatting, and environment validation.
- Configure PostgreSQL and Drizzle.
- Establish migrations and automated test infrastructure.

### Phase 2 — Identity and access

- Implement authentication.
- Implement session management.
- Add roles and permissions (including `admin.members.create`, `admin.genealogy.view`).
- Add authorization tests.
- Create initial administrative access securely.

### Phase 3 — Member management

- Implement member profiles and unique member codes.
- Implement sponsor relationships.
- Add member status management.
- Add registration validation and audit events.
- 🔺 Implement admin member creation service and `/admin/members/new` UI.

### Phase 4 — 🔺 Ternary genealogy

- Implement the root member and `LEFT/MIDDLE/RIGHT` placement model.
- Enforce per-slot constraints and the single-root invariant.
- Build transactional placement services (including admin-driven placement).
- Implement ancestor and descendant queries (recursive CTEs).
- 🔺 Build the `TernaryTreeView` component and `/admin/genealogy` page.
- Test concurrent placement and invalid tree mutations (self-parent, cycles, occupied slots).

### Phase 5 — Compensation configuration

- Document and approve the compensation plan.
- Implement versioned rules and effective dates.
- Build deterministic commission calculation services.
- Test eligibility, matching (including ternary triad matching if approved), caps, rounding, and reversals.

Do not implement actual commission calculations before the business rules are defined.

### Phase 6 — Wallet and payouts

- Implement the financial ledger.
- Implement wallet history and reconciliation.
- Add payout requests and approval workflows.
- Add idempotency, audit events, and failure recovery.
- Test duplicate and concurrent financial operations.

### Phase 7 — Administration and reporting

- Build administrative dashboards.
- Add member and financial reports.
- Add filters, pagination, and exports where required.
- Enforce data access permissions on every report.

### Phase 8 — Production hardening

- Run security and dependency reviews.
- Run integration and end-to-end tests.
- Profile important database queries.
- Verify backup and restore procedures.
- Test production configuration and deployment.
- Document operational procedures and known limitations.

Do not mark a phase complete merely because its UI has been created.

## 21. Definition of Done

A feature is complete only when all applicable requirements are satisfied:

- Business rules are explicit and implemented.
- Types and input validation are correct.
- Authorization is enforced server-side.
- Database constraints protect persistent data.
- Mutations are transactional where necessary.
- Error handling is predictable and safe.
- Audit requirements are satisfied.
- Unit and integration tests cover critical cases.
- Relevant end-to-end tests pass.
- Linting, type checking, and builds succeed.
- Documentation is updated.
- No unrelated existing functionality has been broken.
- Remaining limitations are clearly reported.

## 22. Final Instructions

Act as a careful engineering partner, not merely a code generator.

Prioritize:

1. Correct **ternary** genealogy.
2. Strong PostgreSQL integrity.
3. Secure authentication and authorization.
4. Accurate and auditable financial records.
5. Maintainable TypeScript architecture.
6. Accessible and efficient user interfaces.
7. Automated testing and reliable deployment.

When a requirement is ambiguous, explain the options and ask for the missing business decision before implementing irreversible behavior. In particular, confirm the compensation plan, placement policy, and single-root policy before implementing irreversible behavior.

When a feature is requested, inspect the existing implementation and integrate with it instead of creating duplicate modules.

Never sacrifice security, financial correctness, or database integrity for speed.

The final deliverable must be a coherent, documented, tested application whose behavior is consistent with the approved business rules.

---

## 🔺 Summary of Changes

| Area | Binary (old) | Ternary (new) |
|---|---|---|
| Child positions | `LEFT`, `RIGHT` | `LEFT`, `MIDDLE`, `RIGHT` |
| Max direct children | 2 | 3 |
| Unique constraint | `(parent_id, position)` | `(parent_id, position)` + `CHECK(position IN ('LEFT','MIDDLE','RIGHT'))` |
| Root enforcement | partial unique index | same, still required |
| Commission matching | left/right pairing | triad-based matching (per approved plan) |
| Traversal | 2-leg recursive CTE | 3-leg recursive CTE |
| UI tree | binary branch component | `TernaryTreeView` with three slots |
| Docs | `binary-tree-rules.md` | `ternary-tree-rules.md` |

**New feature — Admin member creation & ternary tree view:**
- New permissions: `admin.members.create`, `admin.genealogy.view`.
- New endpoint: `POST /api/admin/members` (idempotent, audited, transactional).
- New endpoint: `GET /api/admin/genealogy/tree` for lazy tree rendering.
- New pages: `/admin/members/new`, `/admin/genealogy`.
- New components: `TernaryTreeView`, `TernaryTreeNode`, `TernaryTreeToolbar`, `TernaryTreeLegend`.
- Tests: integration tests for concurrent placement into the same slot, single-root, self-parent, cycle rejection, and admin creation audit trail.
