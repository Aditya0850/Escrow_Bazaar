# Escrow Pigeon — Product Requirements

**Version:** 0.1 (Draft)  
**Status:** Planning Phase  
**Last Updated:** 2026-10-21

---

## 1. Functional Requirements

### 1.1 External Deals (Core)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| **ED-01** | Create deal with item/service, amount, currency, deliverables, deadlines, milestones, acceptance criteria | P0 | Deal created with all fields validated; unique deal ID generated |
| **ED-02** | Shareable invitation link with configurable expiry | P0 | Link works for unregistered users; expires per config; revocable by creator |
| **ED-03** | Counterparty registration/authentication via invitation | P0 | New users can register; existing users can login; identity linked to deal |
| **ED-04** | Dual explicit acceptance of identical agreement version | P0 | Both parties must accept same version hash; acceptance recorded with timestamp |
| **ED-05** | Agreement version history with diff view | P1 | All versions stored; diff accessible; immutable once accepted |
| **ED-06** | Renegotiation: create new version requiring re-acceptance | P1 | New version supersedes previous; funds not released until re-acceptance |
| **ED-07** | Cancellation by either party before payment (with reason) | P0 | Deal marked cancelled; no fees; notifications sent |
| **ED-08** | Milestone-based payments with independent acceptance | P1 | Each milestone has amount, deliverables, deadline; paid/released independently |
| **ED-09** | Partial completion handling | P1 | Pro-rata release or dispute based on agreement terms |

### 1.2 Marketplace

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| **MP-01** | Seller onboarding with verification tiers | P0 | Email verified → Basic; ID verified → Verified; Business docs → Business |
| **MP-02** | Listing CRUD with categories, pricing, media, delivery terms | P0 | Draft → Published → Archived states; validation on publish |
| **MP-03** | Category taxonomy with search filters and sort options | P0 | Hierarchical categories; faceted search; relevance/popularity/newest sorts |
| **MP-04** | Listing detail page with seller profile, reviews, transaction protection info | P0 | All info visible; protection terms linked; CTA to start deal |
| **MP-05** | Seller reputation: verified transaction reviews only | P0 | Reviews only from completed protected deals; rating + written review |
| **MP-06** | Reporting and moderation workflow | P1 | User reports → Admin queue → Action (remove/warn/ban) with audit trail |
| **MP-07** | Prohibited listing enforcement (automated + manual) | P0 | Keyword/pattern scanning; manual review queue; appeal process |

### 1.3 Deal Room & Transaction Workflow

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| **DR-01** | Unified deal room for marketplace and external deals | P0 | Same UI, same state machine, same evidence/dispute flows |
| **DR-02** | Payment initiation only after dual acceptance | P0 | Payment button disabled until both parties accept |
| **DR-03** | Payment status from provider webhook (not client) | P0 | Authorized/Captured/Failed/Refunded states synced from provider |
| **DR-04** | Seller delivery with structured evidence upload | P0 | Files + text + links; malware scanned; private storage; timestamps |
| **DR-05** | Buyer acceptance or dispute initiation within window | P0 | Accept button; dispute button with reason categories; deadline timer |
| **DR-06** | Automatic release on buyer acceptance (provider-authorized) | P0 | Release API called only after provider confirms capture |
| **DR-07** | Automatic refund on buyer acceptance failure (if no dispute) | P1 | Configurable auto-refund after acceptance window expires |
| **DR-08** | Deal timeline: immutable event log with timestamps | P0 | All state changes, communications, evidence, payments logged |

### 1.4 Disputes & Trust

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| **DT-01** | Dispute initiation with structured reason codes | P0 | Reason categories: Not delivered, Not as described, Incomplete, Other |
| **DT-02** | Evidence submission by both parties with deadlines | P0 | File + text evidence; deadline per policy; late submissions flagged |
| **DT-03** | Human review assignment with SLA | P0 | Auto-assigned or manual; reviewer sees anonymized evidence; decision required |
| **DT-04** | Decision outcomes: Full release, Partial release, Full refund, No action | P0 | Decision recorded with rationale; both parties notified; funds moved per decision |
| **DT-05** | Appeal process with senior reviewer | P1 | One appeal per party; new evidence allowed; final binding decision |
| **DT-06** | Immutable audit trail for all dispute actions | P0 | Append-only log; tamper-evident; exportable for compliance |
| **DT-07** | Chargeback integration: auto-open dispute on provider chargeback | P1 | Webhook triggers dispute; evidence pre-populated; representment workflow |

### 1.5 User Dashboard

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| **DB-01** | Buyer dashboard: active deals, completed, pending actions, history | P0 | Filterable, paginated, real-time status badges |
| **DB-02** | Seller dashboard: listings, active deals, payouts, analytics | P0 | Revenue charts, payout schedule, listing performance |
| **DB-03** | Shared: notifications, security settings, verification status | P0 | In-app + email notifications; MFA; verification progress |
| **DB-04** | Transaction detail view with full timeline and evidence | P0 | Expandable timeline; downloadable evidence; payment receipts |

### 1.6 Administration

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| **AD-01** | Role-based access: Support, Risk, Finance, Admin, Superadmin | P0 | RBAC enforced on all endpoints; audit log on role changes |
| **AD-02** | User verification review (KYC/KYB) | P0 | Document review UI; approve/reject/request more; audit trail |
| **AD-03** | Listing moderation queue with bulk actions | P0 | Filter by status/reports; approve/reject/remove; reason required |
| **AD-04** | Dispute review and decision interface | P0 | Evidence viewer; decision form; partial release controls |
| **AD-05** | Refund/payout authorization with dual approval (configurable) | P0 | Single approval <$X; dual >$X; audit log with approver IDs |
| **AD-06** | Fee rule management (percentage, fixed, minimums, by category) | P1 | Versioned fee rules; effective dates; preview impact |
| **AD-07** | Currency and jurisdiction enable/disable | P1 | Toggle per currency/country; blocks new deals in disabled |
| **AD-08** | Operational analytics: volume, disputes, fraud, conversion | P1 | Dashboards with time-series; export CSV; scheduled reports |

---

## 2. Non-Functional Requirements

### 2.1 Performance

| Requirement | Target | Measurement |
|---|---|---|
| **API latency (p95)** | <300ms | Excluding payment provider calls |
| **Page load (LCP)** | <2.5s | Core Web Vitals on 3G |
| **Deal room updates** | <1s | WebSocket/polling latency |
| **File upload (10MB)** | <10s | Client-to-S3 direct upload |
| **Background job processing** | <30s | Celery task queue latency |

### 2.2 Reliability

| Requirement | Target |
|---|---|
| **Uptime (excluding maintenance)** | 99.9% monthly |
| **Payment webhook processing** | 100% exactly-once within 5 min |
| **Data durability** | 99.999999999% (11 9's) for Postgres + S3 |
| **Backup RPO** | <1 hour (continuous WAL archiving) |
| **Backup RTO** | <4 hours (tested quarterly) |

### 2.3 Security

| Requirement | Standard |
|---|---|
| **Authentication** | OWASP ASVS Level 2 minimum |
| **Authorization** | RBAC + resource-level checks on every endpoint |
| **Encryption in transit** | TLS 1.3 everywhere |
| **Encryption at rest** | AES-256 for DB, S3 SSE-KMS |
| **Secrets management** | Vault/Parameter Store; no secrets in code/env |
| **PCI DSS** | SAQ A (provider handles card data) |
| **Penetration testing** | Annual third-party; critical findings fixed <30 days |

### 2.4 Accessibility

| Requirement | Standard |
|---|---|
| **WCAG** | 2.2 AA minimum |
| **Keyboard navigation** | All interactive elements reachable and operable |
| **Screen readers** | Semantic HTML, ARIA labels, live regions for status |
| **Color contrast** | 4.5:1 text, 3:1 UI components |
| **Motion** | Respect prefers-reduced-motion |

### 2.5 Internationalization

| Requirement | Phase 1 | Future |
|---|---|---|
| **Currencies** | USD, EUR, GBP | 20+ via provider |
| **Languages** | English | ES, FR, DE, PT, JA, ZH |
| **Date/number formats** | Locale-aware | Full ICU support |
| **RTL support** | CSS logical properties | Full RTL audit |

### 2.6 Compliance

| Requirement | Jurisdiction | Status |
|---|---|---|
| **GDPR** | EU | Required before EU launch |
| **CCPA/CPRA** | California | Required before US launch |
| **PSD2/SCA** | EU/UK | Provider responsibility |
| **AML/KYC** | Per jurisdiction | Provider onboarding + platform enhanced |
| **Tax reporting** | US (1099-K), EU (DAC7) | Phase 2+ |

---

## 3. User Stories

### 3.1 External Deal Creator (Buyer or Seller)

> **As a** user who found a counterparty on Telegram  
> **I want to** create a deal with terms and send them a link  
> **So that** we transact with protection without either of us leaving our chat

**Acceptance Criteria:**
- Deal created in <3 minutes with guided form
- Link works for unregistered users (signup flow integrated)
- Terms locked on dual acceptance
- Payment only initiated after both accept
- Deal room shows clear status at all times

### 3.2 Marketplace Buyer

> **As a** buyer browsing for a React component template  
> **I want to** see verified sellers with protected transaction history  
> **So that** I can purchase confidently without prior relationship

**Acceptance Criteria:**
- Search/filter finds relevant listings
- Seller profile shows verification badge and review count
- Listing page explains protection terms clearly
- Checkout flows into same deal room as external deals
- Post-purchase: evidence upload, acceptance, review

### 3.3 Freelancer (Seller)

> **As a** freelance developer delivering a milestone  
> **I want to** upload code repo access and demo video as evidence  
> **So that** client can verify delivery and release payment

**Acceptance Criteria:**
- Evidence upload supports large files (via S3 direct)
- Multiple evidence types per milestone
- Client sees structured evidence viewer
- Payment released only on client acceptance or dispute resolution
- Timeline shows all milestones with independent status

### 3.4 Dispute Participant

> **As a** buyer who received incomplete work  
> **I want to** open a dispute with screenshots and chat logs  
> **So that** a neutral reviewer decides fairly

**Acceptance Criteria:**
- Dispute form guides through reason categories
- Evidence uploaded with timestamps preserved
- Reviewer decision communicated with rationale
- Funds moved per decision without further action needed
- Appeal available within 7 days

---

## 4. State Machines

### 4.1 Deal State Machine

```
DRAFT → INVITED → ACCEPTED (both) → PAYMENT_PENDING → PAYMENT_AUTHORIZED 
  → IN_PROGRESS → DELIVERED → ACCEPTED → RELEASED → COMPLETED
                    ↓                    ↓
               DISPUTED ← DISPUTED    DISPUTED
                    ↓                    ↓
               RESOLVED              RESOLVED
                    ↓                    ↓
               RELEASED/REFUNDED   RELEASED/REFUNDED
                    ↓                    ↓
               COMPLETED           COMPLETED
```

**Terminal states:** COMPLETED, CANCELLED, EXPIRED, REFUNDED

### 4.2 Payment State Machine

```
CREATED → AUTHORIZED → CAPTURED → HELD → RELEASED → SETTLED
              ↓          ↓        ↓
            FAILED    FAILED   REFUNDED
              ↓          ↓        ↓
            VOIDED    VOIDED   REFUNDED
```

### 4.3 Dispute State Machine

```
OPEN → EVIDENCE_PERIOD → UNDER_REVIEW → DECIDED → APPEAL_WINDOW → FINAL
                ↓                ↓           ↓
           EXTENDED        ESCALATED   APPEALED
```

---

## 5. Business Rules

| Rule | Description | Enforcement |
|---|---|---|
| **BR-01** | No payment initiation before dual agreement acceptance | API guard + UI disable |
| **BR-02** | Funds held max 90 days (configurable per jurisdiction) | Scheduler job auto-resolves |
| **BR-03** | Minimum deal amount $10 (or currency equivalent) | Validation on create |
| **BR-04** | Maximum deal amount $10,000 without enhanced verification | Tiered limits |
| **BR-05** | Dispute window: 7 days from delivery (configurable) | Deadline enforced in state machine |
| **BR-06** | Platform fee deducted at settlement, not authorization | Ledger entry on release/refund |
| **BR-07** | Seller payout only after provider settlement period (e.g., T+7) | Payout scheduler checks provider status |
| **BR-08** | No partial releases without dispute decision or milestone completion | API validation |
| **BR-09** | Evidence files retained 7 years post-completion | Retention policy + S3 lifecycle |
| **BR-10** | User data deletion on request (GDPR) except financial records | Anonymization pipeline |

---

## 6. Cross-References

| Document | Related Content |
|---|---|
| `PRODUCT_VISION.md` | Vision, positioning, business model |
| `UX_AND_INFORMATION_ARCHITECTURE.md` | Screen specs for each requirement |
| `SYSTEM_ARCHITECTURE.md` | Technical implementation of requirements |
| `DATABASE_DESIGN.md` | Schema supporting these requirements |
| `API_SPECIFICATION.md` | Endpoints implementing requirements |
| `IMPLEMENTATION_ROADMAP.md` | Phased delivery of requirements |

---

## 7. Open Requirements Questions

| Question | Impact | Decision Needed |
|---|---|---|
| **QR-01** | Should external deals support multi-party (3+ participants)? | Scope for Phase 1 |
| **QR-02** | Recurring/subscription deals? | Phase 2+ |
| **QR-03** | Escrow for crypto payments? | Legal/provider blocker |
| **QR-04** | Buyer-initiated deals only, or seller-initiated too? | UX decision |
| **QR-05** | Mandatory arbitration clause in agreements? | Legal decision |
| **QR-06** | Insurance/protection fund for seller guarantees? | Business model decision |

---

*All P0 requirements must be satisfied for MVP. P1 requirements targeted for Phase 2. Priorities may shift based on provider capabilities and legal review.*