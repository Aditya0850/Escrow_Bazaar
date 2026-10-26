# Escrow Pigeon — Database Design

**Version:** 0.1 (Draft)  
**Status:** Planning Phase  
**Last Updated:** 2026-10-26

---

## 1. Design Principles

| Principle | Application |
|---|---|
| **ACID for Financial Data** | All payment, ledger, payout, and deal state transitions in PostgreSQL with explicit transactions |
| **Append-Only Audit** | Immutable event log (`domain_events`) for all state changes; never UPDATE/DELETE on events |
| **Row-Level Security** | RLS policies enforce data isolation (users see only their deals, admins see all) |
| **Soft Deletes** | `deleted_at` timestamp on all entities; hard delete only via admin purge job |
| **Versioned References** | Agreement versions stored as immutable snapshots; deals reference agreement version hash |
| **Idempotency Keys** | All mutating operations accept `idempotency_key`; unique constraint prevents duplicate processing |

---

## 2. Entity Relationship Diagram (Logical)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    users    │       │   deals     │       │  agreements │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◀──────│ id (PK)     │       │ id (PK)     │
│ email       │       │ buyer_id    │──────▶│ deal_id (FK)│
│ password_hash           │ seller_id   │──────▶│ version     │
│ verification_tier       │ amount_cents│       │ content_hash│
│ kyc_status              │ currency    │       │ content_json│
│ created_at              │ state       │       │ accepted_by │
└─────────────┘       │ created_at  │       │ accepted_at │
       │              └──────┬──────┘       └─────────────┘
       │                     │
       │         ┌───────────┴───────────┐
       │         ▼                       ▼
       │  ┌─────────────┐         ┌─────────────┐
       │  │  milestones │         │  evidence   │
       │  ├─────────────┤         ├─────────────┤
       │  │ id (PK)     │         │ id (PK)     │
       │  │ deal_id(FK) │         │ deal_id(FK) │
       │  │ sequence    │         │ milestone_id│
       │  │ amount_cents│         │ (FK, null)  │
       │  │ title       │         │ party       │
       │  │ description │         │ (buyer/seller)
       │  │ due_at      │         │ files_json  │
       │  │ state       │         │ text        │
       │  └─────────────┘         │ submitted_at│
       │                          └─────────────┘
       │
       ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  listings   │       │  categories │       │   reviews   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ seller_id(FK)       │ parent_id   │       │ deal_id(FK) │
│ category_id(FK)     │ slug        │       │ reviewer_id │
│ title       │       │ name        │       │ rating      │
│ description │       │ sort_order  │       │ comment     │
│ price_cents │       └─────────────┘       │ created_at  │
│ state       │                              └─────────────┘
└─────────────┘
```

---

## 3. Table Specifications

### 3.1 Core Tables

#### `users`
```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           CITEXT NOT NULL UNIQUE,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash   TEXT NOT NULL,
    display_name    TEXT,
    avatar_url      TEXT,
    verification_tier verification_tier_enum NOT NULL DEFAULT 'basic',
    kyc_status      kyc_status_enum NOT NULL DEFAULT 'none',
    kyc_data        JSONB,              -- encrypted PII
    mfa_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret      TEXT,               -- encrypted
    locale          TEXT NOT NULL DEFAULT 'en',
    timezone        TEXT NOT NULL DEFAULT 'UTC',
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_verification ON users(verification_tier);
```

#### `deals`
```sql
CREATE TABLE deals (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id            UUID NOT NULL REFERENCES users(id),
    seller_id           UUID NOT NULL REFERENCES users(id),
    listing_id          UUID REFERENCES listings(id),  -- NULL for external deals
    amount_cents        BIGINT NOT NULL CHECK (amount_cents >= 1000),
    currency            CHAR(3) NOT NULL,
    fee_payer           fee_payer_enum NOT NULL DEFAULT 'buyer',
    platform_fee_cents  BIGINT NOT NULL DEFAULT 0,
    state               deal_state_enum NOT NULL DEFAULT 'draft',
    agreement_version   INTEGER NOT NULL DEFAULT 1,
    agreement_hash      CHAR(64) NOT NULL,       -- SHA-256 of agreement content
    max_hold_days       INTEGER NOT NULL DEFAULT 90,
    expires_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    
    CONSTRAINT different_parties CHECK (buyer_id <> seller_id)
);

CREATE INDEX idx_deals_buyer ON deals(buyer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_deals_seller ON deals(seller_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_deals_state ON deals(state) WHERE deleted_at IS NULL;
CREATE INDEX idx_deals_listing ON deals(listing_id) WHERE listing_id IS NOT NULL;
```

#### `agreements`
```sql
CREATE TABLE agreements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id         UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    version         INTEGER NOT NULL,
    content_hash    CHAR(64) NOT NULL,          -- SHA-256
    content_json    JSONB NOT NULL,             -- Full agreement terms
    buyer_accepted  BOOLEAN NOT NULL DEFAULT FALSE,
    buyer_accepted_at TIMESTAMPTZ,
    seller_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    seller_accepted_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE (deal_id, version)
);

CREATE INDEX idx_agreements_deal ON agreements(deal_id);
```

#### `milestones`
```sql
CREATE TABLE milestones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id         UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    sequence        INTEGER NOT NULL,           -- 1, 2, 3...
    title           TEXT NOT NULL,
    description     TEXT,
    amount_cents    BIGINT NOT NULL CHECK (amount_cents > 0),
    due_at          TIMESTAMPTZ NOT NULL,
    state           milestone_state_enum NOT NULL DEFAULT 'pending',
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE (deal_id, sequence)
);

CREATE INDEX idx_milestones_deal ON milestones(deal_id);
```

#### `evidence`
```sql
CREATE TABLE evidence (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id         UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    milestone_id    UUID REFERENCES milestones(id) ON DELETE SET NULL,
    party           evidence_party_enum NOT NULL,  -- 'buyer' | 'seller'
    files_json      JSONB NOT NULL DEFAULT '[]',   -- [{url, name, size, mime, sha256}]
    text            TEXT,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT evidence_has_content CHECK (
        jsonb_array_length(files_json) > 0 OR text IS NOT NULL
    )
);

CREATE INDEX idx_evidence_deal ON evidence(deal_id);
CREATE INDEX idx_evidence_milestone ON evidence(milestone_id);
```

### 3.2 Payment & Ledger Tables

#### `payments`
```sql
CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id             UUID NOT NULL REFERENCES deals(id),
    provider            payment_provider_enum NOT NULL,  -- 'stripe' | 'paypal'
    provider_payment_id TEXT NOT NULL,                   -- pi_xxx, pay_xxx
    provider_customer_id TEXT,                           -- cus_xxx
    amount_cents        BIGINT NOT NULL,
    currency            CHAR(3) NOT NULL,
    state               payment_state_enum NOT NULL DEFAULT 'created',
    idempotency_key     TEXT NOT NULL UNIQUE,
    metadata_json       JSONB DEFAULT '{}',
    authorized_at       TIMESTAMPTZ,
    captured_at         TIMESTAMPTZ,
    failed_at           TIMESTAMPTZ,
    failure_reason      TEXT,
    refunded_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_deal ON payments(deal_id);
CREATE INDEX idx_payments_provider ON payments(provider, provider_payment_id);
CREATE INDEX idx_payments_idempotency ON payments(idempotency_key);
```

#### `payouts`
```sql
CREATE TABLE payouts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id             UUID NOT NULL REFERENCES deals(id),
    seller_id           UUID NOT NULL REFERENCES users(id),
    payment_id          UUID NOT NULL REFERENCES payments(id),
    provider            payment_provider_enum NOT NULL,
    provider_payout_id  TEXT,                            -- po_xxx
    amount_cents        BIGINT NOT NULL,
    currency            CHAR(3) NOT NULL,
    fee_cents           BIGINT NOT NULL DEFAULT 0,       -- platform fee deducted
    net_cents           BIGINT NOT NULL,                 -- amount_cents - fee_cents
    state               payout_state_enum NOT NULL DEFAULT 'pending',
    idempotency_key     TEXT NOT NULL UNIQUE,
    metadata_json       JSONB DEFAULT '{}',
    scheduled_for       TIMESTAMPTZ NOT NULL,            -- after provider settlement period
    processed_at        TIMESTAMPTZ,
    failed_at           TIMESTAMPTZ,
    failure_reason      TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payouts_deal ON payouts(deal_id);
CREATE INDEX idx_payouts_seller ON payouts(seller_id);
CREATE INDEX idx_payouts_state_scheduled ON payouts(state, scheduled_for) 
    WHERE state IN ('pending', 'scheduled');
```

#### `ledger_entries` (Immutable Financial Audit Log)
```sql
CREATE TABLE ledger_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id         UUID NOT NULL REFERENCES deals(id),
    payment_id      UUID REFERENCES payments(id),
    payout_id       UUID REFERENCES payouts(id),
    entry_type      ledger_entry_type_enum NOT NULL,  -- 'platform_fee' | 'seller_payout' | 'buyer_refund' | 'chargeback' | 'adjustment'
    amount_cents    BIGINT NOT NULL,                  -- positive = credit to platform, negative = debit
    currency        CHAR(3) NOT NULL,
    balance_after_cents BIGINT NOT NULL,              -- running platform balance for this deal
    description     TEXT NOT NULL,
    metadata_json   JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT valid_party CHECK (
        (payment_id IS NOT NULL AND payout_id IS NULL) OR
        (payment_id IS NULL AND payout_id IS NOT NULL) OR
        (payment_id IS NULL AND payout_id IS NULL)  -- adjustments
    )
);

CREATE INDEX idx_ledger_deal ON ledger_entries(deal_id, created_at);
CREATE INDEX idx_ledger_payment ON ledger_entries(payment_id);
CREATE INDEX idx_ledger_payout ON ledger_entries(payout_id);

-- Trigger to enforce append-only (no UPDATE/DELETE)
CREATE TRIGGER ledger_immutable
    BEFORE UPDATE OR DELETE ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION prevent_modification();
```

### 3.3 Dispute Tables

#### `disputes`
```sql
CREATE TABLE disputes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id             UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    opened_by           UUID NOT NULL REFERENCES users(id),  -- buyer or seller
    reason_category     dispute_reason_enum NOT NULL,
    reason_description  TEXT NOT NULL,
    state               dispute_state_enum NOT NULL DEFAULT 'open',
    evidence_deadline   TIMESTAMPTZ NOT NULL,
    assigned_reviewer_id UUID REFERENCES users(id),
    assigned_at         TIMESTAMPTZ,
    decision            dispute_decision_enum,
    decision_rationale  TEXT,
    decided_at          TIMESTAMPTZ,
    appeal_deadline     TIMESTAMPTZ,
    appealed            BOOLEAN NOT NULL DEFAULT FALSE,
    appeal_decision     dispute_decision_enum,
    appeal_rationale    TEXT,
    appeal_decided_at   TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disputes_deal ON disputes(deal_id);
CREATE INDEX idx_disputes_state ON disputes(state);
CREATE INDEX idx_disputes_reviewer ON disputes(assigned_reviewer_id) WHERE state = 'under_review';
```

#### `dispute_evidence`
```sql
CREATE TABLE dispute_evidence (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id      UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    submitted_by    UUID NOT NULL REFERENCES users(id),
    files_json      JSONB NOT NULL DEFAULT '[]',
    text            TEXT,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_late         BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_dispute_evidence_dispute ON dispute_evidence(dispute_id);
```

### 3.4 Marketplace Tables

#### `listings`
```sql
CREATE TABLE listings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id       UUID NOT NULL REFERENCES users(id),
    category_id     UUID NOT NULL REFERENCES categories(id),
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    price_cents     BIGINT NOT NULL CHECK (price_cents >= 1000),
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    delivery_terms  JSONB NOT NULL DEFAULT '{}',  -- {timeline_days, revisions_included, file_formats[]}
    requirements    TEXT,                         -- what buyer must provide
    state           listing_state_enum NOT NULL DEFAULT 'draft',
    view_count      INTEGER NOT NULL DEFAULT 0,
    purchase_count  INTEGER NOT NULL DEFAULT 0,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_listings_seller ON listings(seller_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_listings_category ON listings(category_id) WHERE state = 'published';
CREATE INDEX idx_listings_published ON listings(published_at DESC) WHERE state = 'published';
```

#### `categories`
```sql
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id       UUID REFERENCES categories(id),
    slug            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    description     TEXT,
    icon            TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
```

#### `reviews`
```sql
CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id         UUID NOT NULL REFERENCES deals(id),
    reviewer_id     UUID NOT NULL REFERENCES users(id),
    reviewee_id     UUID NOT NULL REFERENCES users(id),
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    is_verified     BOOLEAN NOT NULL DEFAULT TRUE,  -- only from completed protected deals
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE (deal_id, reviewer_id),
    CONSTRAINT different_parties CHECK (reviewer_id <> reviewee_id)
);

CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);
```

### 3.5 Notification & System Tables

#### `notifications`
```sql
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            notification_type_enum NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    data_json       JSONB DEFAULT '{}',     -- {dealId, actionUrl, ...}
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

#### `domain_events` (Immutable Event Store)
```sql
CREATE TABLE domain_events (
    id              BIGSERIAL PRIMARY KEY,
    aggregate_type  TEXT NOT NULL,           -- 'Deal', 'Payment', 'Dispute', 'User'
    aggregate_id    UUID NOT NULL,
    event_type      TEXT NOT NULL,           -- 'DealCreated', 'PaymentAuthorized', ...
    event_version   INTEGER NOT NULL DEFAULT 1,
    payload_json    JSONB NOT NULL,
    metadata_json   JSONB DEFAULT '{}',      -- {userId, correlationId, causationId}
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_domain_events_aggregate ON domain_events(aggregate_type, aggregate_id, id);
CREATE INDEX idx_domain_events_correlation ON domain_events((metadata_json->>'correlationId'));
CREATE INDEX idx_domain_events_created ON domain_events(created_at);
```

#### `idempotency_keys`
```sql
CREATE TABLE idempotency_keys (
    key             TEXT PRIMARY KEY,
    request_hash    CHAR(64) NOT NULL,       -- SHA-256 of request body
    response_status INTEGER,
    response_body   JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at) 
    WHERE expires_at < now();
```

---

## 4. Enums (PostgreSQL Types)

```sql
CREATE TYPE verification_tier_enum AS ENUM ('basic', 'verified', 'business');
CREATE TYPE kyc_status_enum AS ENUM ('none', 'pending', 'approved', 'rejected', 'expired');
CREATE TYPE fee_payer_enum AS ENUM ('buyer', 'seller', 'split');
CREATE TYPE deal_state_enum AS ENUM (
    'draft', 'invited', 'accepted', 'payment_pending', 'payment_authorized',
    'in_progress', 'delivered', 'disputed', 'resolved', 'released', 'completed',
    'cancelled', 'expired', 'refunded'
);
CREATE TYPE milestone_state_enum AS ENUM ('pending', 'in_progress', 'delivered', 'accepted', 'disputed', 'completed');
CREATE TYPE evidence_party_enum AS ENUM ('buyer', 'seller');
CREATE TYPE payment_provider_enum AS ENUM ('stripe', 'paypal');
CREATE TYPE payment_state_enum AS ENUM ('created', 'authorized', 'captured', 'held', 'released', 'settled', 'failed', 'voided', 'refunded');
CREATE TYPE payout_state_enum AS ENUM ('pending', 'scheduled', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE ledger_entry_type_enum AS ENUM ('platform_fee', 'seller_payout', 'buyer_refund', 'chargeback', 'adjustment');
CREATE TYPE dispute_reason_enum AS ENUM ('not_delivered', 'not_as_described', 'incomplete', 'other');
CREATE TYPE dispute_state_enum AS ENUM ('open', 'evidence_period', 'under_review', 'decided', 'appeal_window', 'appealed', 'final');
CREATE TYPE dispute_decision_enum AS ENUM ('full_release', 'partial_release', 'full_refund', 'no_action');
CREATE TYPE listing_state_enum AS ENUM ('draft', 'published', 'archived', 'rejected', 'removed');
CREATE TYPE notification_type_enum AS ENUM ('deal_created', 'agreement_accepted', 'payment_authorized', 'delivery_submitted', 'dispute_opened', 'dispute_decided', 'payout_completed', 'review_received', 'verification_update', 'system');
```

---

## 5. Row-Level Security Policies

```sql
-- Enable RLS on all user-data tables
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users see only their own deals
CREATE POLICY deals_user_access ON deals
    USING (buyer_id = current_user_id() OR seller_id = current_user_id())
    WITH CHECK (buyer_id = current_user_id() OR seller_id = current_user_id());

-- Admins see all (via role check)
CREATE POLICY deals_admin_access ON deals
    USING (current_user_has_role('admin'))
    WITH CHECK (current_user_has_role('admin'));

-- Similar policies for agreements, milestones, evidence, payments, payouts, ledger_entries, disputes
-- Listings: sellers see own; published visible to all
CREATE POLICY listings_seller_access ON listings
    USING (seller_id = current_user_id())
    WITH CHECK (seller_id = current_user_id());

CREATE POLICY listings_public_read ON listings
    FOR SELECT USING (state = 'published' OR seller_id = current_user_id());
```

---

## 6. Critical Invariants (Enforced by Triggers/Constraints)

| Invariant | Enforcement |
|---|---|
| **Deal amount = sum of milestone amounts** | Trigger on `milestones` INSERT/UPDATE/DELETE |
| **Platform fee deducted at settlement, not authorization** | `ledger_entries` entry on `payouts.completed` |
| **No payout before provider settlement period (T+7)** | `payouts.scheduled_for` >= `payments.captured_at` + 7 days |
| **Single active dispute per deal** | Partial unique index: `UNIQUE (deal_id) WHERE state NOT IN ('final', 'cancelled')` |
| **Evidence only during evidence period** | Trigger checks `disputes.evidence_deadline` |
| **Immutable ledger** | Trigger prevents UPDATE/DELETE on `ledger_entries` |
| **Agreement hash matches stored content** | Trigger on `agreements` INSERT validates `content_hash = sha256(content_json)` |
| **Idempotency key uniqueness per operation** | Unique constraint on `idempotency_keys.key` |

---

## 7. Migrations Strategy

| Phase | Approach |
|---|---|
| **Development** | Prisma Migrate (`prisma migrate dev`) - generates SQL, applies to local DB |
| **Staging** | `prisma migrate deploy` in CI/CD pipeline; review generated SQL |
| **Production** | Manual review + `prisma migrate deploy` during maintenance window; rollback plan required |
| **Destructive Changes** | Never in same migration as additive; separate PR; data backfill script reviewed |

### Naming Convention
```
YYYYMMDD_HHMMSS_description.sql
Example: 20261026_143000_add_dispute_appeal_fields.sql
```

---

## 8. Cross-References

| Document | Related Content |
|---|---|
| `PRODUCT_REQUIREMENTS.md` | Business rules (BR-01 through BR-10) map to constraints |
| `SYSTEM_ARCHITECTURE.md` | Module boundaries map to table ownership |
| `PAYMENTS_AND_COMPLIANCE.md` | Payment provider fields, webhook processing |
| `SECURITY_AND_THREAT_MODEL.md` | Encryption, RLS, audit requirements |
| `API_SPECIFICATION.md` | tRPC procedures map to repository methods |
| `IMPLEMENTATION_ROADMAP.md` | Schema delivery phases |

---

## 9. Open Database Questions

| Question | Impact | Decision Needed |
|---|---|---|
| **DB-01** | Partition `domain_events` by month for performance? | Table size growth projection |
| **DB-02** | Use advisory locks for deal state transitions vs. row locks? | Concurrency vs. simplicity |
| **DB-03** | Materialized views for seller analytics vs. real-time queries? | Refresh latency vs. query complexity |
| **DB-04** | Separate `payments` and `payouts` tables or unified `transactions`? | Audit clarity vs. query uniformity |
| **DB-05** | Soft-delete cleanup policy (GDPR Art. 17)? | Retention schedule automation |

---

*Schema evolves with requirements. All financial tables append-only. Migration review mandatory for production.*