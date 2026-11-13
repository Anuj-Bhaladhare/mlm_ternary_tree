-- PostgreSQL schema for the MLM application.
-- Intended for an empty database. Prefer Drizzle migrations for deployed environments.
-- Compensation rules are stored as versioned data; this schema does not invent rates,
-- payout limits, or other compensation-plan business decisions.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE member_position AS ENUM ('LEFT', 'MIDDLE', 'RIGHT');
CREATE TYPE member_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');
CREATE TYPE account_setup_token_purpose AS ENUM ('INITIAL_SETUP', 'PASSWORD_RESET');
CREATE TYPE compensation_plan_status AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE commission_event_status AS ENUM ('PENDING', 'PROCESSED', 'REJECTED', 'REVERSED');
CREATE TYPE ledger_normal_balance AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE ledger_entry_side AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE ledger_transaction_status AS ENUM ('DRAFT', 'POSTED', 'VOID');
CREATE TYPE payout_status AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');
CREATE TYPE payout_attempt_status AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- Better Auth identity tables.
CREATE TABLE "user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  password_set_at timestamptz,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX user_email_unique ON "user" (email);

CREATE TABLE "session" (
  id text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX session_token_unique ON "session" (token);
CREATE INDEX session_user_id_idx ON "session" (user_id);

CREATE TABLE "account" (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX account_provider_account_unique ON "account" (provider_id, account_id);
CREATE INDEX account_user_id_idx ON "account" (user_id);

CREATE TABLE "verification" (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX verification_identifier_idx ON "verification" (identifier);

-- Roles and permission assignments.
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
  code text PRIMARY KEY,
  description text NOT NULL
);

CREATE TABLE user_roles (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);
CREATE INDEX user_roles_role_id_idx ON user_roles (role_id);

CREATE TABLE role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_code)
);
CREATE INDEX role_permissions_permission_code_idx ON role_permissions (permission_code);

-- Member identity, sponsorship, and ternary placement are separate relationships.
CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_code text NOT NULL,
  name text NOT NULL,
  email text,
  user_id text REFERENCES "user"(id) ON DELETE RESTRICT,
  sponsor_id uuid REFERENCES members(id) ON DELETE RESTRICT,
  parent_id uuid REFERENCES members(id) ON DELETE RESTRICT,
  position member_position,
  is_root boolean NOT NULL DEFAULT false,
  status member_status NOT NULL DEFAULT 'PENDING',
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT members_not_own_parent_check CHECK (parent_id IS NULL OR parent_id <> id),
  CONSTRAINT members_not_own_sponsor_check CHECK (sponsor_id IS NULL OR sponsor_id <> id),
  CONSTRAINT members_parent_position_check CHECK (
    (parent_id IS NULL AND position IS NULL) OR
    (parent_id IS NOT NULL AND position IS NOT NULL)
  ),
  CONSTRAINT members_root_placement_check CHECK (
    is_root = (parent_id IS NULL AND position IS NULL)
  )
);
CREATE UNIQUE INDEX members_member_code_unique ON members (member_code);
CREATE UNIQUE INDEX members_email_unique ON members (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX members_user_id_unique ON members (user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX members_parent_position_unique
  ON members (parent_id, position) WHERE parent_id IS NOT NULL;
CREATE UNIQUE INDEX members_single_root_unique
  ON members ((is_root)) WHERE is_root = true;
CREATE INDEX members_sponsor_id_idx ON members (sponsor_id);
CREATE INDEX members_parent_id_idx ON members (parent_id);
CREATE INDEX members_position_idx ON members (position);
CREATE INDEX members_status_idx ON members (status);

CREATE TABLE member_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  previous_status member_status,
  new_status member_status NOT NULL,
  changed_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  reason text,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX member_status_history_member_created_idx
  ON member_status_history (member_id, created_at DESC);

CREATE TABLE placement_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  previous_parent_id uuid REFERENCES members(id) ON DELETE RESTRICT,
  previous_position member_position,
  new_parent_id uuid REFERENCES members(id) ON DELETE RESTRICT,
  new_position member_position,
  changed_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  reason text,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT placement_history_previous_pair_check CHECK (
    (previous_parent_id IS NULL AND previous_position IS NULL) OR
    (previous_parent_id IS NOT NULL AND previous_position IS NOT NULL)
  ),
  CONSTRAINT placement_history_new_pair_check CHECK (
    (new_parent_id IS NULL AND new_position IS NULL) OR
    (new_parent_id IS NOT NULL AND new_position IS NOT NULL)
  )
);
CREATE INDEX placement_history_member_created_idx
  ON placement_history (member_id, created_at DESC);

-- Single-use account activation and password-reset tokens.
CREATE TABLE account_setup_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  purpose account_setup_token_purpose NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX account_setup_tokens_hash_unique ON account_setup_tokens (token_hash);
CREATE INDEX account_setup_tokens_user_id_idx ON account_setup_tokens (user_id);
CREATE INDEX account_setup_tokens_expiry_idx ON account_setup_tokens (expires_at);

-- Idempotency and audit records for administrative and financial operations.
CREATE TABLE idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  scope text NOT NULL,
  key text NOT NULL,
  payload_hash text NOT NULL,
  member_id uuid REFERENCES members(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT idempotency_keys_actor_scope_key_unique UNIQUE (actor_id, scope, key)
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  outcome text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_actor_id_idx ON audit_logs (actor_id);
CREATE INDEX audit_logs_resource_idx ON audit_logs (resource_type, resource_id);
CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at);

-- Effective-dated compensation configuration. Rule contents require an approved plan.
CREATE TABLE compensation_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  status compensation_plan_status NOT NULL DEFAULT 'DRAFT',
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT compensation_plan_version_unique UNIQUE (code, version),
  CONSTRAINT compensation_plan_effective_range_check CHECK (
    effective_to IS NULL OR effective_to > effective_from
  )
);
CREATE INDEX compensation_plans_effective_idx
  ON compensation_plans (status, effective_from, effective_to);

CREATE TABLE commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES compensation_plans(id) ON DELETE RESTRICT,
  rule_code text NOT NULL,
  name text NOT NULL,
  rule_config jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commission_rule_plan_code_unique UNIQUE (plan_id, rule_code)
);

CREATE TABLE commission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  source_reference text NOT NULL,
  occurred_at timestamptz NOT NULL,
  status commission_event_status NOT NULL DEFAULT 'PENDING',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  rejection_reason text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commission_event_source_unique UNIQUE (event_type, source_reference)
);
CREATE INDEX commission_events_status_occurred_idx
  ON commission_events (status, occurred_at);

-- Amounts are exact integer minor units. Entries are not balances; balances are derived
-- from the append-only, double-entry ledger below.
CREATE TABLE commission_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES commission_events(id) ON DELETE RESTRICT,
  rule_id uuid NOT NULL REFERENCES commission_rules(id) ON DELETE RESTRICT,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  calculation_inputs jsonb NOT NULL,
  reversal_of uuid UNIQUE REFERENCES commission_entries(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commission_entry_event_rule_member_unique UNIQUE (event_id, rule_id, member_id)
);
CREATE INDEX commission_entries_member_created_idx
  ON commission_entries (member_id, created_at DESC);

-- Ledger accounts include member wallets and balancing/system accounts.
CREATE TABLE ledger_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code text NOT NULL,
  account_type text NOT NULL,
  member_id uuid REFERENCES members(id) ON DELETE RESTRICT,
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  normal_balance ledger_normal_balance NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ledger_accounts_code_currency_unique UNIQUE (account_code, currency),
  CONSTRAINT ledger_accounts_id_owner_currency_unique UNIQUE (id, member_id, currency)
);
CREATE UNIQUE INDEX ledger_accounts_member_currency_unique
  ON ledger_accounts (member_id, currency) WHERE member_id IS NOT NULL;
CREATE INDEX ledger_accounts_member_id_idx ON ledger_accounts (member_id);

CREATE TABLE ledger_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type text NOT NULL,
  business_reference text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  status ledger_transaction_status NOT NULL DEFAULT 'DRAFT',
  reverses_transaction_id uuid UNIQUE REFERENCES ledger_transactions(id) ON DELETE RESTRICT,
  actor_id text REFERENCES "user"(id) ON DELETE RESTRICT,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  posted_at timestamptz,
  CONSTRAINT ledger_transaction_business_reference_unique
    UNIQUE (transaction_type, business_reference),
  CONSTRAINT ledger_transaction_not_self_reversal_check
    CHECK (reverses_transaction_id IS NULL OR reverses_transaction_id <> id),
  CONSTRAINT ledger_transaction_posted_timestamp_check
    CHECK ((status = 'POSTED' AND posted_at IS NOT NULL) OR status <> 'POSTED')
);
CREATE INDEX ledger_transactions_created_at_idx ON ledger_transactions (created_at DESC);

CREATE TABLE ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES ledger_transactions(id) ON DELETE RESTRICT,
  account_id uuid NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  side ledger_entry_side NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_entries_transaction_id_idx ON ledger_entries (transaction_id);
CREATE INDEX ledger_entries_account_created_idx ON ledger_entries (account_id, created_at DESC);

-- Enforce that every posted ledger transaction balances before its transaction commits.
CREATE FUNCTION assert_posted_ledger_transaction_balanced()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_transaction_id uuid;
  transaction_state ledger_transaction_status;
  entry_count bigint;
  debit_total numeric;
  credit_total numeric;
BEGIN
  target_transaction_id := CASE
    WHEN TG_TABLE_NAME = 'ledger_transactions' THEN NEW.id
    ELSE NEW.transaction_id
  END;

  SELECT status
    INTO transaction_state
    FROM ledger_transactions
    WHERE id = target_transaction_id;

  IF transaction_state = 'POSTED' THEN
    SELECT count(*),
           COALESCE(sum(amount_minor) FILTER (WHERE side = 'DEBIT'), 0),
           COALESCE(sum(amount_minor) FILTER (WHERE side = 'CREDIT'), 0)
      INTO entry_count, debit_total, credit_total
      FROM ledger_entries
      WHERE transaction_id = target_transaction_id;

    IF entry_count < 2 OR debit_total <> credit_total THEN
      RAISE EXCEPTION 'Posted ledger transaction % is not balanced', target_transaction_id
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER ledger_transaction_balanced_check
AFTER INSERT OR UPDATE ON ledger_transactions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION assert_posted_ledger_transaction_balanced();

CREATE CONSTRAINT TRIGGER ledger_entries_balanced_check
AFTER INSERT ON ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION assert_posted_ledger_transaction_balanced();

CREATE FUNCTION prevent_ledger_entry_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Ledger entries are append-only; post a reversal instead'
    USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER ledger_entries_append_only
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_entry_mutation();

CREATE TABLE payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  ledger_account_id uuid NOT NULL,
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  status payout_status NOT NULL DEFAULT 'REQUESTED',
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by text REFERENCES "user"(id) ON DELETE RESTRICT,
  reviewed_at timestamptz,
  reason text,
  ledger_transaction_id uuid UNIQUE REFERENCES ledger_transactions(id) ON DELETE RESTRICT,
  processed_at timestamptz,
  CONSTRAINT payout_wallet_owner_currency_fk
    FOREIGN KEY (ledger_account_id, member_id, currency)
    REFERENCES ledger_accounts (id, member_id, currency) ON DELETE RESTRICT
);
CREATE INDEX payout_requests_member_requested_idx
  ON payout_requests (member_id, requested_at DESC);
CREATE INDEX payout_requests_status_requested_idx
  ON payout_requests (status, requested_at);

CREATE TABLE payout_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_request_id uuid NOT NULL REFERENCES payout_requests(id) ON DELETE RESTRICT,
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  status payout_attempt_status NOT NULL DEFAULT 'PENDING',
  provider_reference text,
  failure_code text,
  failure_message text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT payout_attempt_number_unique UNIQUE (payout_request_id, attempt_number)
);
CREATE INDEX payout_attempts_payout_id_idx ON payout_attempts (payout_request_id);

CREATE TABLE system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by text REFERENCES "user"(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Initial role/permission catalog. Administrator creation and root-member creation
-- remain explicit application workflows; no credentials or root member are seeded here.
INSERT INTO permissions (code, description) VALUES
  ('dashboard:read', 'View the authenticated dashboard'),
  ('admin.members.read', 'View all member records'),
  ('admin.members.create', 'Create member accounts and placements'),
  ('admin.members.manage', 'Edit member accounts and issue setup links'),
  ('admin.genealogy.view', 'View the full ternary placement tree')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO roles (code, name) VALUES
  ('member', 'Member'),
  ('support', 'Support Operator'),
  ('administrator', 'Administrator'),
  ('finance', 'Finance Manager')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, p.permission_code
FROM roles AS r
CROSS JOIN (VALUES
  ('member', 'dashboard:read'),
  ('support', 'dashboard:read'),
  ('administrator', 'dashboard:read'),
  ('administrator', 'admin.members.read'),
  ('administrator', 'admin.members.create'),
  ('administrator', 'admin.members.manage'),
  ('administrator', 'admin.genealogy.view'),
  ('finance', 'dashboard:read')
) AS p(role_code, permission_code)
ON CONFLICT DO NOTHING;

COMMIT;
