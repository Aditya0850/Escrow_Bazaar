# Escrow Pigeon — API Specification

**Version:** 0.1 (Draft)  
**Status:** Planning Phase  
**Last Updated:** 2026-10-26

---

## 1. API Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Protocol** | tRPC (TypeScript-first RPC) over HTTP/2 |
| **Transport** | HTTPS only; HTTP/2 with TLS 1.3 |
| **Authentication** | Session cookie (Lucia Auth); `Authorization: Bearer` for API keys (Phase 2) |
| **Validation** | Zod schemas on every procedure; input + output |
| **Error Format** | Standardized `AppError` with code, message, context |
| **Rate Limiting** | Per-user (authenticated) / per-IP (anonymous); configurable tiers |
| **Idempotency** | `Idempotency-Key` header required for all mutations |
| **Versioning** | Header-based: `X-API-Version: 2026-10`; backward compatible within major |
| **Pagination** | Cursor-based (opaque tokens); max 100 items per page |
| **Webhooks** | Separate endpoint (`/api/webhooks/*`); signature verification required |

---

## 2. tRPC Router Structure

```typescript
// src/shared/api/router.ts
export const appRouter = createTRPCRouter({
  // Public procedures (no auth)
  auth: authRouter,
  public: publicRouter,
  webhooks: webhooksRouter,

  // Protected procedures (require session)
  user: userRouter,
  deals: dealsRouter,
  marketplace: marketplaceRouter,
  payments: paymentsRouter,
  disputes: disputesRouter,
  notifications: notificationsRouter,
  seller: sellerRouter,
  buyer: buyerRouter,

  // Admin procedures (require admin role)
  admin: adminRouter,
});
```

### 2.1 Middleware Chain

```typescript
// Applied in order
const protectedProcedure = t.procedure
  .use(authMiddleware)        // Validates session, attaches user
  .use(rateLimitMiddleware)   // Per-user rate limits
  .use(loggingMiddleware);    // Structured request logging

const adminProcedure = protectedProcedure
  .use(rbacMiddleware(['admin', 'superadmin']));
```

---

## 3. Core Procedures by Module

### 3.1 Authentication (`authRouter`)

| Procedure | Type | Input | Output | Auth |
|-----------|------|-------|--------|------|
| `register` | Mutation | `{ email, password, displayName }` | `{ user, session }` | Public |
| `login` | Mutation | `{ email, password, mfaCode? }` | `{ user, session }` | Public |
| `logout` | Mutation | `{}` | `{ success: true }` | Session |
| `verifyEmail` | Mutation | `{ token }` | `{ success: true }` | Public |
| `requestPasswordReset` | Mutation | `{ email }` | `{ success: true }` | Public |
| `resetPassword` | Mutation | `{ token, password }` | `{ success: true }` | Public |
| `enableMFA` | Mutation | `{}` | `{ secret, qrCode, recoveryCodes }` | Session |
| `verifyMFA` | Mutation | `{ code }` | `{ success: true }` | Session |
| `disableMFA` | Mutation | `{ password }` | `{ success: true }` | Session |
| `getSession` | Query | `{}` | `{ user, session } \| null` | Session |

---

### 3.2 User Profile (`userRouter`)

| Procedure | Type | Input | Output | Auth |
|-----------|------|-------|--------|------|
| `getProfile` | Query | `{ userId? }` | `UserProfile` | Session |
| `updateProfile` | Mutation | `{ displayName?, avatarUrl?, locale?, timezone?, currency? }` | `UserProfile` | Session |
| `getVerificationStatus` | Query | `{}` | `VerificationStatus` | Session |
| `startVerification` | Mutation | `{ tier: 'verified' \| 'business' }` | `{ verificationId, uploadUrls }` | Session |
| `submitVerificationDocs` | Mutation | `{ verificationId, documents: DocumentInput[] }` | `{ status: 'pending' }` | Session |
| `getNotificationPreferences` | Query | `{}` | `NotificationPrefs` | Session |
| `updateNotificationPreferences` | Mutation | `{ email?, push?, inApp? }` | `NotificationPrefs` | Session |
| `deleteAccount` | Mutation | `{ password }` | `{ success: true }` | Session |

---

### 3.3 Deals (`dealsRouter`)

#### 3.3.1 Deal Creation & Invitation

| Procedure | Type | Input | Output | Auth |
|-----------|------|-------|--------|------|
| `createDeal` | Mutation | `CreateDealInput` | `{ dealId, invitationUrl, expiresAt }` | Session |
| `getDealInvitation` | Query | `{ dealId }` | `DealInvitationView` | Public (token) |
| `acceptInvitation` | Mutation | `{ dealId, invitationToken }` | `{ deal, agreement }` | Session |
| `declineInvitation` | Mutation | `{ dealId, invitationToken, reason? }` | `{ success: true }` | Session |
| `revokeInvitation` | Mutation | `{ dealId }` | `{ success: true }` | Session (creator) |

**CreateDealInput:**
```typescript
{
  title: string;              // max 100
  description: string;        // max 5000
  categoryId: string;         // UUID
  type: 'service' | 'asset';
  amountCents: number;        // >= 1000
  currency: 'USD' | 'EUR' | 'GBP';
  feePayer: 'buyer' | 'seller' | 'split';
  deliverables: DeliverableInput[];  // min 1
  milestones?: MilestoneInput[];     // optional, sum = amountCents
  acceptanceWindowDays: number;      // 1-30, default 7
  autoAcceptEnabled: boolean;        // default false
  invitationExpiresHours: number;    // 1-720, default 72
  invitationMessage?: string;        // max 500
}
```

#### 3.3.2 Deal Lifecycle

| Procedure | Type | Input | Output | Auth |
|-----------|------|-------|--------|------|
| `getDeal` | Query | `{ dealId }` | `DealDetail` | Session (party) |
| `getMyDeals` | Query | `{ state?, role?, cursor?, limit? }` | `Paginated<DealSummary>` | Session |
| `initiatePayment` | Mutation | `{ dealId, idempotencyKey }` | `{ clientSecret, paymentId }` | Session (buyer) |
| `confirmPayment` | Mutation | `{ paymentId, paymentMethodId }` | `{ status: 'authorized' \| 'failed' }` | Session (buyer) |
| `submitDelivery` | Mutation | `{ dealId, milestoneId?, evidence: EvidenceInput }` | `{ evidenceId }` | Session (seller) |
| `acceptDelivery` | Mutation | `{ dealId, milestoneId? }` | `{ status: 'completed' \| 'disputed' }` | Session (buyer) |
| `requestRevision` | Mutation | `{ dealId, milestoneId?, reason }` | `{ success: true }` | Session (buyer) |
| `cancelDeal` | Mutation | `{ dealId, reason }` | `{ success: true }` | Session (party) |
| `getDealTimeline` | Query | `{ dealId, cursor?, limit? }` | `Paginated<TimelineEvent>` | Session (party) |
| `downloadAgreementPDF` | Query | `{ dealId, version }` | `{ pdfUrl }` | Session (party) |

#### 3.3.3 Milestones

| Procedure | Type | Input | Output | Auth |
|-----------|------|-------|--------|------|
| `getMilestones` | Query | `{ dealId }` | `Milestone[]` | Session (party) |
| `updateMilestone` | Mutation | `{ milestoneId, title?, description?, dueAt? }` | `Milestone` | Session (seller, pre-payment) |

---

### 3.4 Marketplace (`marketplaceRouter`)

#### 3.4.1 Listings

| Procedure | Type | Input | Output | Auth |
|-----------|------|-------|--------|------|
| `createListing` | Mutation | `CreateListingInput` | `{ listingId }` | Session (seller) |
| `updateListing` | Mutation | `{ listingId, ...updates }` | `Listing` | Session (seller) |
| `publishListing` | Mutation | `{ listingId }` | `Listing` | Session (seller) |
| `archiveListing` | Mutation | `{ listingId }` | `{ success: true }` | Session (seller) |
| `getMyListings` | Query | `{ state?, cursor?, limit? }` | `Paginated<Listing>` | Session (seller) |
| `getListing` | Query | `{ listingId }` | `ListingDetail` | Public |
| `searchListings` | Query | `SearchParams` | `Paginated<ListingSummary>` | Public |

**SearchParams:**
```typescript
{
  query?: string;
  categoryId?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  currency?: string;
  sellerTier?: 'basic' | 'verified' | 'business';
  sort?: 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'popular';
  cursor?: string;
  limit?: number;  // max 50
}
```

#### 3.4.2 Categories & Reviews

| Procedure | Type | Input | Output | Auth |
|-----------|------|-------|--------|------|
| `getCategories` | Query | `{ parentId? }` | `Category[]` | Public |
| `submitReview` | Mutation | `{ dealId, rating, comment }` | `Review` | Session (party, post-completion) |
| `getReviews` | Query | `{ revieweeId, cursor?, limit? }` | `Paginated<Review>` | Public |
| `reportListing` | Mutation | `{ listingId, reason, details }` | `{ reportId }` | Session |

---

### 3.5 Payments (`paymentsRouter`)

| Procedure | Type | Input | Output | Auth |
|-----------|------|-------|--------|------|
| `getPaymentStatus` | Query | `{ dealId }` | `PaymentStatus` | Session (party) |
| `getPayoutStatus` | Query | `{ dealId }` | `PayoutStatus` | Session (seller) |
| `getSellerPayouts` | Query | `{ state?, cursor?, limit? }` | `Paginated<Payout>` | Session (seller) |
| `requestPayoutMethod` | Mutation | `{ type: 'bank' \| 'card', details }` | `{ setupUrl }` | Session (seller) |
| `getFeePreview` | Query | `{ amountCents, currency, categoryId, isCrossBorder }` | `FeeBreakdown` | Public |

---

### 3.6 Disputes (`disputesRouter`)

| Procedure | Type | Input | Output | Auth |
|-----------|------|-------|--------|------|
| `openDispute` | Mutation | `{ dealId, reasonCategory, reasonDescription, evidence }` | `{ disputeId }` | Session (party) |
| `submitEvidence` | Mutation | `{ disputeId, evidence }` | `{ success: true }` | Session (party) |
| `getDispute` | Query | `{ disputeId }` | `DisputeDetail` | Session (party, admin) |
| `getMyDisputes` | Query | `{ state?, cursor?, limit? }` | `Paginated<DisputeSummary>` | Session |

---

### 3.7 Notifications (`notificationsRouter`)

| Procedure | Type | Input | Output | Auth |
|-----------|------|-------|--------|------|
| `getNotifications` | Query | `{ unreadOnly?, cursor?, limit? }` | `Paginated<Notification>` | Session |
| `markAsRead` | Mutation | `{ notificationIds }` | `{ success: true }` | Session |
| `markAllAsRead` | Mutation | `{}` | `{ success: true }` | Session |

---

### 3.8 Seller Dashboard (`sellerRouter`)

| Procedure | Type | Input | Output | Auth |
|-----------|------|-------|--------|------|
| `getAnalytics` | Query | `{ period: '7d' \| '30d' \| '90d' }` | `SellerAnalytics` | Session (seller) |
| `getRevenueChart` | Query | `{ period, granularity }` | `ChartData[]` | Session (seller) |
| `getConversionFunnel` | Query | `{ period }` | `FunnelData[]` | Session (seller) |

---

### 3.9 Admin (`adminRouter`)

| Procedure | Type | Input | Output | Auth |
|-----------|------|-------|--------|------|
| `getUsers` | Query | `{ query?, tier?, status?, cursor?, limit? }` | `Paginated<AdminUser>` | Admin |
| `updateUserVerification` | Mutation | `{ userId, tier, status, notes? }` | `{ success: true }` | Admin |
| `suspendUser` | Mutation | `{ userId, reason }` | `{ success: true }` | Admin |
| `getListingsQueue` | Query | `{ status?, cursor?, limit? }` | `Paginated<AdminListing>` | Admin |
| `moderateListing` | Mutation | `{ listingId, action: 'approve' \| 'reject' \| 'remove', reason }` | `{ success: true }` | Admin |
| `getDisputesQueue` | Query | `{ status?, cursor?, limit? }` | `Paginated<AdminDispute>` | Admin |
| `assignDisputeReviewer` | Mutation | `{ disputeId, reviewerId }` | `{ success: true }` | Admin |
| `recordDisputeDecision` | Mutation | `{ disputeId, decision, rationale, partialPercent? }` | `{ success: true }` | Admin |
| `authorizePayout` | Mutation | `{ payoutId, approverId }` | `{ success: true }` | Admin (dual if >$1000) |
| `manageFeeRules` | Mutation | `{ action: 'create' \| 'update' \| 'delete', rule }` | `FeeRule` | Admin |
| `toggleCurrency` | Mutation | `{ currency, enabled }` | `{ success: true }` | Admin |
| `getAnalytics` | Query | `{ period }` | `AdminAnalytics` | Admin |
| `exportAuditLog` | Query | `{ from, to, format }` | `{ downloadUrl }` | Admin |

---

## 4. Shared Types

### 4.1 Common Enums

```typescript
enum DealState {
  DRAFT = 'draft',
  INVITED = 'invited',
  ACCEPTED = 'accepted',
  PAYMENT_PENDING = 'payment_pending',
  PAYMENT_AUTHORIZED = 'payment_authorized',
  IN_PROGRESS = 'in_progress',
  DELIVERED = 'delivered',
  DISPUTED = 'disputed',
  RESOLVED = 'resolved',
  RELEASED = 'released',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  REFUNDED = 'refunded',
}

enum PaymentState {
  CREATED = 'created',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  HELD = 'held',
  RELEASED = 'released',
  SETTLED = 'settled',
  FAILED = 'failed',
  VOIDED = 'voided',
  REFUNDED = 'refunded',
}

enum DisputeReason {
  NOT_DELIVERED = 'not_delivered',
  NOT_AS_DESCRIBED = 'not_as_described',
  INCOMPLETE = 'incomplete',
  OTHER = 'other',
}

enum VerificationTier {
  BASIC = 'basic',
  VERIFIED = 'verified',
  BUSINESS = 'business',
}
```

### 4.2 Core Entity Types

```typescript
interface DealSummary {
  id: string;
  title: string;
  amountCents: number;
  currency: string;
  state: DealState;
  role: 'buyer' | 'seller';
  counterparty: UserSummary;
  createdAt: Date;
  updatedAt: Date;
  nextAction?: NextAction;
}

interface DealDetail extends DealSummary {
  description: string;
  agreement: AgreementView;
  milestones: Milestone[];
  payment?: PaymentView;
  evidence: Evidence[];
  timeline: TimelineEvent[];
  dispute?: DisputeSummary;
}

interface AgreementView {
  version: number;
  contentHash: string;
  content: AgreementContent;
  buyerAccepted: boolean;
  buyerAcceptedAt?: Date;
  sellerAccepted: boolean;
  sellerAcceptedAt?: Date;
}

interface Milestone {
  id: string;
  sequence: number;
  title: string;
  description: string;
  amountCents: number;
  dueAt: Date;
  state: MilestoneState;
  evidence?: Evidence[];
  completedAt?: Date;
}

interface Evidence {
  id: string;
  party: 'buyer' | 'seller';
  files: FileRef[];
  text?: string;
  submittedAt: Date;
}

interface FileRef {
  url: string;          // Presigned S3 URL (1hr TTL)
  name: string;
  size: number;
  mimeType: string;
  sha256: string;
}

interface PaymentView {
  id: string;
  provider: 'stripe' | 'paypal';
  amountCents: number;
  currency: string;
  state: PaymentState;
  authorizedAt?: Date;
  capturedAt?: Date;
  clientSecret?: string;  // Only for buyer, when payment_pending
}

interface PayoutView {
  id: string;
  amountCents: number;
  feeCents: number;
  netCents: number;
  currency: string;
  state: PayoutState;
  scheduledFor: Date;
  processedAt?: Date;
}

interface UserSummary {
  id: string;
  displayName: string;
  avatarUrl?: string;
  verificationTier: VerificationTier;
}

interface Paginated<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}
```

---

## 5. Error Handling

### 5.1 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHENTICATED` | 401 | No valid session |
| `UNAUTHORIZED` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Zod schema validation failed |
| `CONFLICT` | 409 | State conflict (e.g., duplicate acceptance) |
| `IDEMPOTENCY_CONFLICT` | 409 | Duplicate idempotency key |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `PAYMENT_REQUIRED` | 402 | Payment needed before action |
| `PROVIDER_ERROR` | 502 | Payment provider error |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### 5.2 Error Response Format

```typescript
interface AppError {
  code: string;
  message: string;
  context?: Record<string, unknown>;
  path?: string[];  // Zod error path
}
```

---

## 6. Rate Limiting

| Tier | Authenticated | Anonymous |
|------|---------------|-----------|
| **Default** | 100 req/min | 20 req/min |
| **Auth endpoints** | 10 req/min | 5 req/min |
| **Payment initiation** | 5 req/min | N/A |
| **Webhooks** | N/A | 1000 req/min/IP |
| **File upload (presign)** | 30 req/min | N/A |

---

## 7. Idempotency

All mutations **require** `Idempotency-Key` header (UUID v4 recommended).

```http
POST /api/trpc/deals.createDeal
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{ "json": { ... } }
```

- Keys stored 24 hours with request hash + response
- Duplicate key with different request → `IDEMPOTENCY_CONFLICT`
- Duplicate key with same request → Returns cached response

---

## 8. Webhook Endpoints

### 8.1 Stripe Webhooks

```
POST /api/webhooks/stripe
Headers: Stripe-Signature, Stripe-Event-ID
```

**Handled Events:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.closed`
- `payout.paid`
- `payout.failed`
- `account.updated`
- `radar.early_fraud_warning`

### 8.2 PayPal Webhooks

```
POST /api/webhooks/paypal
Headers: PayPal-Transmission-ID, PayPal-Cert-URL, PayPal-Transmission-Sig, PayPal-Auth-Algo
```

**Handled Events:**
- `CHECKOUT.ORDER.APPROVED`
- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.DENIED`
- `PAYMENT.REFUND.COMPLETED`
- `CUSTOMER.DISPUTE.CREATED`
- `CUSTOMER.DISPUTE.RESOLVED`
- `PAYOUT.ITEM.SUCCEEDED`
- `PAYOUT.ITEM.FAILED`

---

## 9. API Versioning

- **Current Version**: `2026-10`
- **Header**: `X-API-Version: 2026-10`
- **Deprecation**: 6-month notice; old versions supported in parallel
- **Breaking Changes**: New major version (e.g., `2027-04`)

---

## 10. Client SDK Usage (TypeScript)

```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from 'escrow-pigeon/api';

export const trpc = createTRPCReact<AppRouter>();

// In your app
const client = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      headers: () => ({
        'Idempotency-Key': crypto.randomUUID(), // Auto-generated per mutation
      }),
    }),
  ],
});

// Usage
const deal = await trpc.deals.createDeal.mutate({
  title: 'Website Design',
  amountCents: 50000,
  currency: 'USD',
  // ...
});
```

---

## 11. Cross-References

| Document | Related Content |
|----------|-----------------|
| `SYSTEM_ARCHITECTURE.md` | Module boundaries, tRPC setup, middleware |
| `DATABASE_DESIGN.md` | Entity schemas, enums, repository methods |
| `PRODUCT_REQUIREMENTS.md` | Functional requirements mapping (ED-01 to AD-08) |
| `SECURITY_AND_THREAT_MODEL.md` | Auth middleware, validation, rate limits, webhook security |
| `UX_AND_INFORMATION_ARCHITECTURE.md` | Screen-to-endpoint mapping |
| `PAYMENTS_AND_COMPLIANCE.md` | Payment procedures, webhook handlers, fee calculation |
| `IMPLEMENTATION_ROADMAP.md` | API delivery phases |

---

## 12. Open API Questions

| Question | Impact | Decision Needed |
|----------|--------|-----------------|
| **API-01** | Public REST API for webhooks/integrations alongside tRPC? | Phase 2 scope |
| **API-02** | GraphQL gateway for complex queries (analytics)? | Need vs. tRPC flexibility |
| **API-03** | Real-time subscriptions (deal updates) via WebSocket? | Infrastructure complexity |
| **API-04** | API key management for sellers (webhook endpoints)? | Phase 2+ |
| **API-05** | Request/response compression (gzip/brotli) config? | Performance baseline |
| **API-06** | OpenAPI/Swagger export from tRPC for external consumers? | Documentation automation |

---

*This specification evolves with implementation. tRPC procedures are the source of truth; this document reflects design intent.*