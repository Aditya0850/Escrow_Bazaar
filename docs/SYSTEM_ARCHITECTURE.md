# Escrow Pigeon — System Architecture

**Version:** 0.1 (Draft)  
**Status:** Planning Phase  
**Last Updated:** 2026-10-26

---

## 1. Architectural Principles

| Principle | Decision | Rationale |
|---|---|---|
| **Modular Monolith** | Single deployable unit with clear internal boundaries | Solo/small team velocity; operational simplicity; extract services later if needed |
| **API-First** | All frontend/backend communication via typed contracts | Enables multiple clients; testability; clear boundaries |
| **Event-Driven Internally** | Domain events for cross-module communication | Decouples modules; enables async processing; audit trail |
| **Provider-Agnostic Payments** | Adapter pattern for payment providers | Avoid vendor lock-in; test with mocks; support multiple providers |
| **Immutable Event Log** | All state changes as append-only events | Audit, debugging, replay, compliance |
| **Stateless Horizontal Scaling** | No sticky sessions; shared-nothing app tier | Simple scaling; resilience |
| **Infrastructure as Code** | Terraform for all cloud resources | Reproducible environments; version control; reviewable changes |

---

## 2. Technology Stack

### 2.1 Application Layer

| Layer | Technology | Version | Justification |
|---|---|---|---|
| **Runtime** | Node.js | 22 LTS | Long-term support; performance; ecosystem |
| **Framework** | Fastify | 5.x | Low overhead; TypeScript native; plugin ecosystem |
| **Language** | TypeScript | 5.6+ | Type safety; developer productivity; refactoring confidence |
| **API Layer** | tRPC | 11.x | End-to-end type safety; no codegen step; React Query integration |
| **Validation** | Zod | 3.23+ | Schema-first; runtime + compile-time; tRPC native |
| **ORM** | Prisma | 6.x | Type-safe DB access; migrations; preview features |
| **Database** | PostgreSQL | 16+ | ACID; JSONB; row-level security; extensions |
| **Cache/Queue** | Redis | 7.2+ | Session store; rate limiting; BullMQ job queue |
| **Object Storage** | S3-compatible (MinIO local, AWS S3 prod) | — | Evidence files, exports; presigned URLs |
| **Authentication** | Lucia Auth | 3.x | Session-based; database-backed; framework-agnostic |
| **Email** | Resend (API) / Nodemailer (SMTP fallback) | — | Transactional email; deliverability |
| **Observability** | OpenTelemetry + Prometheus + Grafana | — | Vendor-neutral; standards-based |

### 2.2 Frontend

| Layer | Technology | Version | Justification |
|---|---|---|---|
| **Framework** | React | 19 | Concurrent features; Server Components ready |
| **Build Tool** | Vite | 6.x | Fast HMR; optimized builds; plugin ecosystem |
| **Routing** | TanStack Router | 1.x | Type-safe; file-based; loaders; search params |
| **State** | TanStack Query | 5.x | Server state; caching; mutations; optimistic updates |
| **Forms** | React Hook Form + Zod | 7.x / 3.x | Performant; type-safe validation |
| **UI Primitives** | Radix UI | 1.x | Accessible; unstyled; composable |
| **Styling** | Tailwind CSS | 4.x | Utility-first; design tokens; dark mode |
| **Icons** | Lucide React | 0.4.x | Consistent; tree-shakeable |
| **Date/Time** | date-fns | 4.x | Modular; i18n support; lightweight |
| **File Upload** | Uppy + Tus | 4.x / 2.x | Resumable; large files; progress |

### 2.3 Infrastructure & DevOps

| Category | Technology | Purpose |
|---|---|---|
| **Container** | Docker | Consistent environments |
| **Orchestration** | Docker Compose (dev), Kubernetes (prod) | Local dev parity; production scaling |
| **IaC** | Terraform | Provision cloud resources |
| **CI/CD** | GitHub Actions | Build, test, deploy pipelines |
| **Secrets** | 1Password CLI / AWS Secrets Manager | Secure secret injection |
| **DNS/CDN** | Cloudflare | DDoS, WAF, caching, SSL |
| **Monitoring** | Grafana Cloud / Self-hosted | Metrics, logs, traces, alerts |
| **Error Tracking** | Sentry | Frontend + backend errors |
| **Feature Flags** | Unleash | Gradual rollouts; kill switches |

---

## 3. Module Boundaries (Modular Monolith)

```
src/
├── modules/
│   ├── auth/                    # Authentication & sessions
│   │   ├── domain/              # User, Session, VerificationToken entities
│   │   ├── ports/               # EmailSender, TokenGenerator, PasswordHasher
│   │   ├── adapters/            # LuciaAdapter, ResendEmail, Argon2Hasher
│   │   ├── use-cases/           # Register, Login, VerifyEmail, RequestPasswordReset, MFA
│   │   └── events/              # UserRegistered, EmailVerified, MFAEnabled
│   │
│   ├── users/                   # User profiles, verification, settings
│   │   ├── domain/              # UserProfile, VerificationTier, NotificationPrefs
│   │   ├── ports/               # ProfileStorage, VerificationReviewer
│   │   ├── adapters/            # PrismaProfileStorage, AdminVerificationReviewer
│   │   ├── use-cases/           # UpdateProfile, UpgradeVerification, UpdatePreferences
│   │   └── events/              # ProfileUpdated, VerificationTierChanged
│   │
│   ├── deals/                   # Core deal domain (external + marketplace)
│   │   ├── domain/              # Deal, Agreement, Milestone, Evidence, DealStateMachine
│   │   ├── ports/               # DealRepository, PaymentAdapter, NotificationSender, EvidenceStorage
│   │   ├── adapters/            # PrismaDealRepository, StripePaymentAdapter, S3EvidenceStorage, EmailNotificationSender
│   │   ├── use-cases/           # CreateDeal, InviteCounterparty, AcceptAgreement, InitiatePayment, SubmitDelivery, AcceptDelivery, OpenDispute, CancelDeal
│   │   ├── events/              # DealCreated, AgreementAccepted, PaymentAuthorized, DeliverySubmitted, DisputeOpened, DealCompleted
│   │   └── scheduler/           # Auto-expiry, Auto-refund, Max-hold enforcement
│   │
│   ├── marketplace/             # Listings, categories, search, reviews
│   │   ├── domain/              # Listing, Category, Review, SearchIndex
│   │   ├── ports/               # ListingRepository, SearchEngine, ImageOptimizer
│   │   ├── adapters/            # PrismaListingRepository, MeiliSearchAdapter, SharpImageOptimizer
│   │   ├── use-cases/           # CreateListing, PublishListing, SearchListings, SubmitReview, ReportListing
│   │   └── events/              # ListingPublished, ReviewSubmitted, ListingReported
│   │
│   ├── payments/                # Payment provider abstraction
│   │   ├── domain/              # Payment, Payout, Refund, FeeRule, LedgerEntry
│   │   ├── ports/               # PaymentProvider, Ledger, WebhookVerifier
│   │   ├── adapters/            # StripeConnectAdapter, PayPalAdapter, PrismaLedger, SvixWebhookVerifier
│   │   ├── use-cases/           # AuthorizePayment, CapturePayment, ReleaseFunds, RefundPayment, CreatePayout, CalculateFees
│   │   ├── events/              # PaymentAuthorized, PaymentCaptured, FundsReleased, PayoutCreated, RefundInitiated
│   │   └── webhooks/            # StripeWebhookHandler, PayPalWebhookHandler
│   │
│   ├── disputes/                # Dispute resolution workflow
│   │   ├── domain/              # Dispute, Evidence, Decision, Appeal, ReviewerAssignment
│   │   ├── ports/               # DisputeRepository, ReviewerPool, DecisionNotifier
│   │   ├── adapters/            # PrismaDisputeRepository, RoundRobinReviewerPool, EmailDecisionNotifier
│   │   ├── use-cases/           # OpenDispute, SubmitEvidence, AssignReviewer, RecordDecision, FileAppeal
│   │   └── events/              # DisputeOpened, EvidenceSubmitted, DecisionRecorded, AppealFiled
│   │
│   ├── admin/                   # Admin operations, analytics, configuration
│   │   ├── domain/              # AdminUser, Role, FeeRule, CurrencyConfig, AuditLog
│   │   ├── ports/               # AdminRepository, AnalyticsEngine, ConfigManager
│   │   ├── adapters/            # PrismaAdminRepository, ClickHouseAnalytics, PrismaConfigManager
│   │   ├── use-cases/           # ManageUsers, ModerateListings, ReviewDisputes, AuthorizePayout, ManageFeeRules, ViewAnalytics
│   │   └── events/              # FeeRuleUpdated, CurrencyEnabled, UserSuspended
│   │
│   └── notifications/           # Cross-cutting notification delivery
│       ├── domain/              # Notification, Channel, Template, Preference
│       ├── ports/               # NotificationChannel (Email, Push, InApp), TemplateRenderer
│       ├── adapters/            # ResendEmailChannel, FCMPushChannel, InAppNotificationChannel, ReactEmailRenderer
│       ├── use-cases/           # SendNotification, RenderTemplate, ManagePreferences
│       └── events/              # NotificationSent, NotificationFailed
│
├── shared/
│   ├── kernel/                  # Shared domain primitives
│   │   ├── value-objects/       # Money, Email, DealId, UserId, Currency, Percentage
│   │   ├── entities/            # BaseEntity, AggregateRoot
│   │   ├── events/              # DomainEvent, EventBus, EventStore
│   │   ├── errors/              # AppError, ValidationError, NotFoundError, AuthorizationError
│   │   └── utils/               # Result, Option, DateTime, UUID
│   │
│   ├── infrastructure/          # Shared infrastructure adapters
│   │   ├── database/            # PrismaClient, TransactionManager, MigrationRunner
│   │   ├── cache/               # RedisClient, CacheKeys, RateLimiter
│   │   ├── storage/             # S3Client, PresignedUrlGenerator
│   │   ├── queue/               # BullMQ, JobProcessor, ScheduledJobs
│   │   └── http/                # HttpClient, CircuitBreaker, RetryPolicy
│   │
│   └── api/                     # tRPC router composition, middleware, context
│       ├── router.ts            # Root router merging all module routers
│       ├── middleware/          # Auth, RateLimit, Logging, ErrorHandling
│       └── context.ts           # Request context (user, session, reqId)
│
├── app/
│   ├── api/                     # Fastify server, tRPC endpoint, webhook routes
│   ├── web/                     # React frontend (Vite + TanStack Router)
│   └── worker/                  # Background job processor (BullMQ)
│
└── config/                      # Environment-specific configuration
    ├── schema.ts                # Zod-validated config schema
    ├── development.ts
    ├── staging.ts
    └── production.ts
```

### 3.2 Module Communication Rules

| Rule | Enforcement |
|---|---|
| **No direct cross-module imports** | ESLint rule: `no-restricted-imports` across `modules/*` |
| **Communicate via events** | `EventBus.publish()` for domain events; consumers subscribe |
| **Shared kernel only for primitives** | `shared/kernel` — no business logic |
| **Use-cases are entry points** | Controllers/workers call use-cases; use-cases orchestrate domain + ports |
| **Ports define contracts** | Adapters implement ports; swapped per environment |

---

## 4. Data Flow Diagrams

### 4.1 External Deal Creation Flow

```
┌─────────┐     ┌──────────────┐     ┌─────────────┐     ┌────────────────┐
│  User   │────▶│ CreateDealUC │────▶│ DealModule  │────▶│ EventBus       │
└─────────┘     └──────────────┘     └─────────────┘     └───────┬────────┘
                                                                   │
                                              ┌────────────────────┼────────────────────┐
                                              ▼                    ▼                    ▼
                                    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
                                    │ NotificationMod │  │ DealRepository  │  │ InvitationLink  │
                                    │ (email/push)    │  │ (persist)       │  │ Generator       │
                                    └─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 4.2 Payment Authorization Flow

```
┌─────────┐     ┌─────────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Buyer  │────▶│ InitiatePayment │────▶│ PaymentAdapter│────▶│ Payment Provider │
└─────────┘     └─────────────────┘     └──────────────┘     └────────┬─────────┘
                                                                       │
                                              ┌────────────────────────┘
                                              ▼
                                    ┌─────────────────┐
                                    │ Webhook Handler │◀── Provider Callback
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐     ┌──────────────┐     ┌─────────────────┐
                                    │ Verify Signature│────▶│ Update Deal   │────▶│ EventBus        │
                                    └─────────────────┘     │ State         │     └───────┬─────────┘
                                                             └──────────────┘             │
                                                                                           │
                                    ┌────────────────────────────────────────────────────┘
                                    ▼
                            ┌───────────────┐
                            │ Notification  │
                            │ Module        │
                            └───────────────┘
```

### 4.3 Dispute Resolution Flow

```
┌──────────┐    ┌──────────────┐    ┌────────────────┐    ┌──────────────────┐
│  Buyer   │───▶│ OpenDispute  │───▶│ DisputeModule  │───▶│ Evidence Period  │
└──────────┘    └──────────────┘    └────────────────┘    └────────┬─────────┘
                                                                     │
                                    ┌───────────────────────────────┘
                                    ▼
                            ┌───────────────┐
                            │ Seller Submits│
                            │ Counter-Evidence
                            └───────┬───────┘
                                    │
                            ┌───────▼───────┐    ┌──────────────────┐    ┌────────────────┐
                            │ Reviewer Pool │───▶│ Assign Reviewer  │───▶│ Reviewer Views │
                            └───────────────┘    └──────────────────┘    └───────┬────────┘
                                                                                  │
                                                                     ┌────────────┴────────────┐
                                                                     ▼                         ▼
                                                          ┌─────────────────┐   ┌─────────────────┐
                                                          │ Record Decision │   │ Notify Parties  │
                                                          └────────┬────────┘   └────────┬────────┘
                                                                   │                     │
                                                          ┌────────┴────────┐   ┌────────┴────────┐
                                                          ▼                 ▼   ▼                 ▼
                                                   ┌───────────┐     ┌───────────────┐ ┌──────────────────┐
                                                   │ Move Funds│     │ Appeal Window │ │ Update Deal State│
                                                   └───────────┘     └───────────────┘ └──────────────────┘
```

---

## 5. Deployment Architecture

### 5.1 Environments

| Environment | Purpose | Infrastructure | Data |
|---|---|---|---|
| **Local** | Development | Docker Compose (Postgres, Redis, MinIO, Mailpit) | Synthetic seed data |
| **Preview** | PR validation | Ephemeral K8s namespace (per PR) | Anonymized production subset |
| **Staging** | Integration testing | Dedicated K8s cluster (scaled down) | Synthetic + migrated test data |
| **Production** | Live traffic | Multi-AZ K8s cluster | Real customer data |

### 5.2 Production Topology

```
                                    ┌─────────────────┐
                                    │   Cloudflare    │
                                    │  (WAF, CDN,     │
                                    │   DNS, SSL)     │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  Load Balancer  │
                                    │  (Cloudflare /  │
                                    │   AWS ALB)      │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
            ┌───────▼───────┐        ┌───────▼───────┐        ┌───────▼───────┐
            │  App Pod 1    │        │  App Pod 2    │        │  App Pod N    │
            │ (API + Web)   │        │ (API + Web)   │        │ (API + Web)   │
            └───────┬───────┘        └───────┬───────┘        └───────▼───────┘
                    │                        │                        │
                    └────────────────────────┼────────────────────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
            ┌───────▼───────┐        ┌───────▼───────┐        ┌───────▼───────┐
            │  PostgreSQL   │        │    Redis      │        │   S3/MinIO    │
            │  (Primary +   │        │  (Cluster/    │        │  (Evidence,   │
            │   Replicas)   │        │   Sentinel)   │        │   Exports)    │
            └───────────────┘        └───────────────┘        └───────────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
            ┌───────▼───────┐        ┌───────▼───────┐        ┌───────▼───────┐
            │  Worker Pod 1 │        │  Worker Pod 2 │        │  Worker Pod N │
            │ (BullMQ Jobs) │        │ (BullMQ Jobs) │        │ (BullMQ Jobs) │
            └───────────────┘        └───────────────┘        └───────────────┘
```

### 5.3 Scaling Strategy

| Component | Scaling Trigger | Max Replicas |
|---|---|---|
| **App Pods** | CPU > 70%, Memory > 80%, Request latency p95 > 500ms | 20 |
| **Worker Pods** | Queue depth > 100 per worker, Job latency > 30s | 10 |
| **PostgreSQL** | Read replica lag > 5s, Connection pool exhaustion | 3 replicas |
| **Redis** | Memory > 80%, Command latency p99 > 10ms | Cluster mode (6 shards) |

---

## 6. Security Architecture

### 6.1 Network Segmentation

```
┌─────────────────────────────────────────────────────────────────┐
│                      VPC (10.0.0.0/16)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Public Subnet│  │ Private Subnet│  │ Data Subnet   │             │
│  │ (AZ-a, AZ-b, │  │ (AZ-a, AZ-b, │  │ (AZ-a, AZ-b,  │             │
│  │  AZ-c)       │  │  AZ-c)       │  │  AZ-c)        │             │
│  │              │  │              │  │               │             │
│  │ • ALB        │  │ • App Pods   │  │ • PostgreSQL  │             │
│  │ • NAT GW     │  │ • Worker Pods│  │ • Redis       │             │
│  │ • Bastion    │  │              │  │ • S3 VPC Endpt│             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

- App pods: No direct internet egress (via NAT GW for provider APIs only)
- Database: No internet access; only accessible from private subnets
- S3: VPC Gateway Endpoint (no NAT traversal)

### 6.2 Secrets Management

| Secret Type | Storage | Rotation |
|---|---|---|
| **Database credentials** | AWS Secrets Manager | Auto-rotate 30 days |
| **Payment provider keys** | AWS Secrets Manager | Manual (provider dashboard) |
| **JWT/Signing keys** | AWS Secrets Manager | Auto-rotate 90 days |
| **Email API keys** | AWS Secrets Manager | Manual |
| **Encryption keys** | AWS KMS | Auto-rotate annually |

### 6.3 Encryption

| Data | At Rest | In Transit |
|---|---|---|
| **Database** | AES-256 (RDS encryption) | TLS 1.3 |
| **Redis** | AES-256 (ElastiCache encryption) | TLS 1.3 |
| **S3** | SSE-KMS (customer-managed key) | TLS 1.3 |
| **Application** | — | TLS 1.3 (Cloudflare + ALB) |
| **PII Fields** | Application-level encryption (AES-GCM) | — |

---

## 7. Observability

### 7.1 Metrics (Prometheus)

| Metric | Type | Labels | Alert Threshold |
|---|---|---|---|
| `http_requests_total` | Counter | method, path, status | — |
| `http_request_duration_seconds` | Histogram | method, path | p95 > 300ms |
| `deal_state_transitions_total` | Counter | from_state, to_state | — |
| `payment_authorized_total` | Counter | provider, currency | — |
| `dispute_opened_total` | Counter | reason_category | Rate > 5% of deals |
| `job_queue_depth` | Gauge | queue_name | > 1000 |
| `job_processing_duration_seconds` | Histogram | job_name | p95 > 30s |
| `db_query_duration_seconds` | Histogram | query_name | p95 > 100ms |

### 7.2 Distributed Tracing (OpenTelemetry)

- **Trace Context Propagation:** W3C TraceContext headers
- **Instrumented:** HTTP client, DB queries, Redis, BullMQ, Payment adapters
- **Sampling:** 10% default; 100% for errors; head-based

### 7.3 Logging (Structured JSON)

```json
{
  "timestamp": "2026-10-26T10:30:00.000Z",
  "level": "info",
  "service": "escrow-pigeon-api",
  "traceId": "abc123",
  "spanId": "def456",
  "message": "Deal created",
  "context": {
    "dealId": "deal_abc123",
    "userId": "user_789",
    "amount": 50000,
    "currency": "USD"
  }
}
```

### 7.4 Alerting Rules (Critical)

| Alert | Condition | Severity | Runbook |
|---|---|---|---|
| **APIErrorRateHigh** | 5xx rate > 1% for 5m | Critical | Check deployment, provider status |
| **WebhookProcessingLag** | Webhook age > 5min | Critical | Check worker logs, queue depth |
| **PaymentAuthFailures** | Auth failure rate > 5% for 10m | Critical | Check provider status page |
| **DatabaseConnectionsHigh** | Pool usage > 90% | Warning | Check query performance, scale read replicas |
| **DiskSpaceLow** | > 80% on any volume | Warning | Cleanup, expand volume |

---

## 8. Disaster Recovery

| Scenario | RPO | RTO | Strategy |
|---|---|---|---|
| **Primary DB failure** | < 1s (synchronous replica) | < 2min | Automated failover to replica |
| **Region outage** | < 1hr (cross-region backup) | < 4hr | Restore from backup to standby region |
| **Data corruption** | < 1hr (point-in-time recovery) | < 2hr | PITR to new instance |
| **Accidental deletion** | < 24hr (daily snapshot) | < 4hr | Restore snapshot, replay WAL |

---

## 9. Cross-References

| Document | Related Content |
|---|---|
| `PRODUCT_REQUIREMENTS.md` | Non-functional requirements (performance, reliability) |
| `DATABASE_DESIGN.md` | Schema supporting module domains |
| `API_SPECIFICATION.md` | tRPC procedures per module |
| `PAYMENTS_AND_COMPLIANCE.md` | Payment adapter implementations |
| `SECURITY_AND_THREAT_MODEL.md` | Threat model, mitigations |
| `IMPLEMENTATION_ROADMAP.md` | Infrastructure delivery phases |

---

## 10. Open Architecture Questions

| Question | Impact | Decision Needed |
|---|---|---|
| **ARCH-01** | Kubernetes from Day 1 or start with managed services (Fly.io, Railway)? | Operational complexity vs. control |
| **ARCH-02** | Event store: PostgreSQL (event sourcing) vs. dedicated (EventStoreDB)? | Complexity vs. replay capability |
| **ARCH-03** | Search: MeiliSearch (self-hosted) vs. Typesense vs. Algolia? | Cost vs. relevance vs. ops burden |
| **ARCH-04** | Real-time: WebSockets (Socket.io) vs. Server-Sent Events vs. Polling? | Browser support vs. infrastructure |
| **ARCH-05** | Multi-tenancy for future white-label? | Schema design impact |

---

*Architecture evolves with validated learning. Prefer reversible decisions.*