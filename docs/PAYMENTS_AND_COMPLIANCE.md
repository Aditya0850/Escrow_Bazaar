# Escrow Pigeon — Payments & Compliance

**Version:** 0.1 (Draft)  
**Status:** Planning Phase  
**Last Updated:** 2026-10-26

---

## 1. Payment Architecture

### 1.1 Core Principles

| Principle | Implementation |
|---|---|
| **Provider Abstraction** | Adapter pattern — Stripe Connect primary, pluggable for PayPal, Wise, etc. |
| **Escrow Flow** | Authorization → Hold (platform-controlled) → Release/Refund via provider API |
| **No Card Data on Platform** | SAQ A compliance — all PAN/tokenization handled by provider |
| **Idempotency Everywhere** | Every mutating payment call carries `idempotency_key` (stored in DB) |
| **Webhook as Source of Truth** | Payment state synced from provider webhooks; client state is advisory only |
| **Settlement-Aware Payouts** | Seller payouts scheduled only after provider settlement period (T+7 for Stripe) |

### 1.2 Money Movement Diagram

```
Buyer                          Platform                         Seller
  │                               │                               │
  │── Payment Intent (amount) ───▶│                               │
  │                               │── Create PaymentIntent ──────▶│ Stripe
  │◀─── Client Secret ───────────│◀─── pi_xxx_secret ────────────│
  │                               │                               │
  │── Confirm Payment (3DS) ──────▶│                               │
  │                               │── Confirm PaymentIntent ─────▶│ Stripe
  │◀─── Authorized/Captured ──────│◀─── authorized ───────────────│
  │                               │                               │
  │                               │  [Funds held in Stripe Connect│
  │                               │   balance, platform controls  │
  │                               │   release/refund]             │
  │                               │                               │
  │◀─── Delivery/Evidence ────────│◀─── Seller uploads ───────────│
  │                               │                               │
  │── Accept / Dispute ───────────▶│                               │
  │                               │                               │
  │        ACCEPT:                │                               │
  │                               │── Release (transfer to seller)▶│ Stripe
  │                               │◀─── transferred ──────────────│
  │                               │                               │
  │        DISPUTE:               │                               │
  │                               │── Refund (to buyer) ──────────▶│ Stripe
  │                               │◀─── refunded ─────────────────│
  │                               │                               │
  │        AUTO-REFUND (timeout): │                               │
  │                               │── Refund ─────────────────────▶│ Stripe
```

---

## 2. Provider Adapters

### 2.1 Stripe Connect (Primary — Phase 1)

| Capability | Implementation |
|---|---|
| **Onboarding** | OAuth + Express/Standard accounts; KYC/KYB via Stripe Identity |
| **Escrow Mechanism** | `PaymentIntent` with `capture_method=manual` + `setup_future_usage=off_session` |
| **Hold Period** | Up to 90 days (configurable per jurisdiction) via manual capture |
| **Release** | `PaymentIntent.capture()` → funds move to connected account balance |
| **Refund** | `Refund.create({payment_intent: pi_xxx})` — full or partial |
| **Payouts** | Automatic daily (T+2 US, T+7 intl) or manual via `Payout.create()` |
| **Webhooks** | `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `account.updated`, `payout.paid`, `payout.failed`, `radar.early_fraud_warning` |
| **Dispute/Chargeback** | `charge.dispute.created` → auto-open platform dispute; representment via evidence upload |
| **Fees** | Application fee (`application_fee_amount`) collected at capture; Stripe fees on connected account |

#### Stripe Connect Account Types
| Type | Use Case | KYC Burden | Payout Control |
|---|---|---|---|
| **Express** | Individual freelancers | Stripe-hosted onboarding | Platform can delay payouts |
| **Standard** | Businesses with own Stripe dashboard | Full Stripe dashboard | Seller controls payout schedule |
| **Custom** | Platform-built onboarding (Phase 2+) | Platform responsibility | Full platform control |

> **Phase 1 Decision:** Express accounts for individuals, Standard for businesses. Custom deferred.

### 2.2 PayPal (Phase 2)

| Capability | Implementation |
|---|---|
| **Product** | PayPal Commerce Platform (Marketplaces) or Partner Marketplace |
| **Escrow** | Order API with `payment_instruction` for delayed capture |
| **Hold** | Up to 29 days (PayPal limit) — shorter than Stripe |
| **Release** | `POST /v2/checkout/orders/{id}/capture` |
| **Payouts** | PayPal Payouts API (batch, T+1-3) |
| **Key Difference** | Shorter hold window; different dispute process; no Connect-style account management |

### 2.3 Wise / Bank Transfer (Phase 3+)

- For high-value B2B where card fees are prohibitive
- Manual verification + escrow agreement
- Platform holds funds in segregated account
- Requires banking license / EMI partnership

---

## 3. Fee Model

### 3.1 Fee Structure

```typescript
interface FeeRule {
  id: string;
  name: string;
  // Scope
  category_id?: string;      // null = global
  currency?: string;         // null = all
  min_amount_cents?: number; // tiered pricing
  max_amount_cents?: number;
  // Calculation
  type: 'percentage' | 'fixed' | 'tiered';
  percentage_bps?: number;   // 400 = 4%
  fixed_cents?: number;      // 30 = $0.30
  tiered_brackets?: Array<{ max_cents: number; percentage_bps: number }>;
  // Min/Max bounds
  min_fee_cents?: number;
  max_fee_cents?: number;
  // Who pays
  fee_payer: 'buyer' | 'seller' | 'split';  // split = 50/50
  // Timing
  collected_at: 'capture' | 'release' | 'payout';  // 'release' for escrow
  // Validity
  effective_from: Date;
  effective_to?: Date;
  is_active: boolean;
}
```

### 3.2 Default Fee Rules (Illustrative)

| Rule | Scope | Fee | Collected At | Payer |
|---|---|---|---|---|
| **Global Default** | All categories | 4% + $0.30 (400 bps + 30¢) | Release | Buyer |
| **Digital Services** | Development, Design, Writing | 3.5% + $0.30 | Release | Buyer |
| **High-Value** | Amount > $5,000 | 2.5% + $0.30 (capped $100) | Release | Buyer |
| **International** | Cross-border (currency ≠ seller) | +1% FX buffer | Release | Buyer |
| **Seller-Paid Promo** | Promotional campaigns | 0% (platform absorbs) | N/A | Platform |

### 3.3 Fee Calculation Examples

```python
def calculate_fee(amount_cents: int, currency: str, category_id: str, 
                  is_cross_border: bool, fee_payer: str) -> FeeBreakdown:
    rule = get_matching_rule(amount_cents, currency, category_id)
    base_fee = (amount_cents * rule.percentage_bps // 10000) + rule.fixed_cents
    base_fee = clamp(base_fee, rule.min_fee_cents, rule.max_fee_cents)
    
    if is_cross_border:
        base_fee += amount_cents * 100 // 10000  # +1%
    
    if fee_payer == 'split':
        buyer_fee = base_fee // 2
        seller_fee = base_fee - buyer_fee
    elif fee_payer == 'seller':
        buyer_fee = 0
        seller_fee = base_fee
    else:
        buyer_fee = base_fee
        seller_fee = 0
    
    return FeeBreakdown(
        platform_fee_cents=base_fee,
        buyer_pays_cents=buyer_fee,
        seller_pays_cents=seller_fee,
        stripe_fee_cents=estimate_stripe_fee(amount_cents, currency),
        net_to_seller_cents=amount_cents - base_fee - seller_fee - stripe_fee_cents
    )
```

---

## 4. Webhook Processing

### 4.1 Webhook Endpoint

```
POST /api/webhooks/stripe
Headers: Stripe-Signature, Stripe-Event-ID
Body: Stripe Event object
```

### 4.2 Processing Guarantees

| Requirement | Implementation |
|---|---|
| **Exactly-once** | Idempotency key = `Stripe-Event-ID`; `idempotency_keys` table deduplicates |
| **Ordering** | Per-resource ordering via `created` timestamp; out-of-order handled by state machine |
| **Retry** | Exponential backoff (1m, 5m, 15m, 1h, 6h, 24h); max 7 days |
| **DLQ** | Failed events after max retries → dead letter table + alert |
| **Verification** | `stripe.webhooks.constructEvent(payload, sig_header, secret)` |

### 4.3 Critical Event Handlers

| Event | Handler | Side Effects |
|---|---|---|
| `payment_intent.succeeded` | Mark payment `authorized`/`captured`; if escrow, mark `held` | Notify parties; schedule auto-release job |
| `payment_intent.payment_failed` | Mark payment `failed`; notify buyer; release hold | Deal stays in `payment_pending` |
| `charge.refunded` | Mark payment `refunded`; create `ledger_entries` (buyer_refund) | Deal → `refunded`/`completed` |
| `charge.dispute.created` | Auto-create platform `Dispute` with `reason_category='chargeback'` | Evidence deadline = provider deadline - 2 days |
| `charge.dispute.closed` | If won → release to seller; if lost → refund buyer | Update dispute `decision`; notify |
| `payout.paid` | Mark `payout.completed`; create `ledger_entries` (seller_payout, platform_fee) | Notify seller; deal → `completed` if all milestones done |
| `payout.failed` | Mark `payout.failed`; alert finance; retry logic | Seller notified; manual intervention queue |
| `account.updated` | Sync KYC status, payout capabilities, restrictions | Update `users.kyc_status`, `verification_tier` |

---

## 5. Escrow State Machine (Payment Perspective)

```
PAYMENT_CREATED
    │
    ▼ (buyer confirms 3DS)
PAYMENT_AUTHORIZED  ──(timeout/fail)──▶ PAYMENT_FAILED → DEAL_CANCELLED
    │
    ▼ (capture confirmed by provider)
PAYMENT_CAPTURED (HELD)
    │
    ├──▶ BUYER_ACCEPTS ──▶ RELEASE_INITIATED ──▶ PAYOUT_SCHEDULED ──▶ PAYOUT_COMPLETED
    │                                                  │
    │                                                  ▼
    │                                            PAYOUT_FAILED (retry/alert)
    │
    ├──▶ BUYER_DISPUTES ──▶ DISPUTE_OPENED
    │         │
    │         ├──▶ SELLER_WINS ──▶ RELEASE_INITIATED ...
    │         │
    │         └──▶ BUYER_WINS ──▶ REFUND_INITIATED ──▶ REFUND_COMPLETED
    │
    └──▶ ACCEPTANCE_TIMEOUT ──▶ AUTO_REFUND_INITIATED ──▶ REFUND_COMPLETED
```

---

## 6. Compliance Matrix

### 6.1 Regulatory Requirements

| Regulation | Jurisdiction | Status | Platform Responsibility |
|---|---|---|---|
| **PCI DSS** | Global | SAQ A (Provider handles card data) | No PAN storage; provider iframe/Elements only |
| **PSD2 / SCA** | EU/UK | Provider responsibility (3DS) | Trigger 3DS via `confirm_payment` |
| **GDPR** | EU | Required before EU launch | Data minimization; right to erasure (except financial); DPA with Stripe |
| **CCPA/CPRA** | California | Required before US launch | Opt-out of sale; data access/deletion; no sale of PI |
| **AML/KYC** | Per jurisdiction | Provider onboarding + platform enhanced | Stripe Identity for Express; enhanced for high-volume |
| **Tax Reporting (1099-K)** | US | Phase 2+ | Stripe issues 1099-K for connected accounts >$600/200 txns |
| **Tax Reporting (DAC7)** | EU | Phase 2+ | Platform reports seller earnings to tax authority |
| **Consumer Protection** | Various | Ongoing | Clear terms; cooling-off where required; dispute access |

### 6.2 Prohibited Categories (Enforced at Listing + Payment)

| Category | Reason | Enforcement |
|---|---|---|
| Account sales/credentials | ToS violations, fraud | Keyword scanning + manual review |
| Unlicensed IP/copyright | Legal liability | DMCA process; repeat offender ban |
| Financial instruments | Regulation, fraud | Category block; payment provider rejects |
| Crypto (primary payment) | Provider restriction | Block at payment method selection |
| Adult content | Provider restriction | Category block |
| Physical goods (Phase 1-2) | Logistics complexity | Category block |
| Regulated professional services | Licensing requirements | Verification gating |

---

## 7. Risk & Fraud Controls

### 7.1 Prevention Layers

| Layer | Controls |
|---|---|
| **Onboarding** | Email verification, phone (optional), Stripe Identity (ID doc + selfie), business docs for Business tier |
| **Transaction** | 3DS mandatory; velocity rules (max $X/day new user); amount limits by tier; device fingerprinting |
| **Behavioral** | New buyer + high value = review; rapid repeat disputes = flag; geo mismatch = challenge |
| **Provider** | Stripe Radar (ML fraud scoring); early fraud warnings; block lists |
| **Post-Transaction** | Chargeback monitoring (>0.5% = review); dispute pattern analysis; seller payout holds on risk |

### 7.2 Chargeback Representment

```typescript
interface ChargebackEvidence {
  // Auto-populated from deal room
  agreement: AgreementSnapshot;           // Signed terms
  delivery_proof: Evidence[];             // Files, timestamps, comms
  acceptance_proof?: BuyerAcceptance;     // If buyer accepted then charged back
  communication_log: Message[];           // Platform messages
  tracking?: TrackingInfo;                // If applicable
  // Platform-generated
  platform_fee_justification: string;     // Service provided
  terms_of_service_url: string;
}
```

- **Auto-submit** for disputes opened via `charge.dispute.created` webhook
- **Deadline**: Provider deadline - 48 hours buffer
- **Win rate target**: >60% with evidence (vs ~20% without)

---

## 8. Financial Operations

### 8.1 Reconciliation

| Frequency | Process |
|---|---|
| **Daily** | Stripe balance report ↔ `ledger_entries` sum per deal; payout status sync |
| **Weekly** | Fee revenue recognition; platform fee vs. Stripe fee breakdown |
| **Monthly** | Full P&L: volume, fees, chargebacks, refunds, payouts, net revenue |
| **Quarterly** | Audit sample (1% of deals): verify ledger entries match provider statements |

### 8.2 Settlement Timeline

| Event | Timeline | Notes |
|---|---|---|
| Payment authorized | T+0 | Buyer card charged, funds reserved |
| Payment captured | T+0 to T+7 | Configurable; immediate for low-risk |
| Platform fee recognized | At capture | `ledger_entries` entry |
| Seller payout scheduled | Capture + provider settlement (T+2 US, T+7 intl) | `payouts.scheduled_for` |
| Seller receives funds | Payout processed + 1-3 business days | Bank-dependent |

---

## 9. Cross-References

| Document | Related Content |
|---|---|
| `PRODUCT_REQUIREMENTS.md` | DR-02, DR-03, DR-06, DR-07, DT-07, AD-05, AD-06 |
| `DATABASE_DESIGN.md` | `payments`, `payouts`, `ledger_entries`, `idempotency_keys` tables |
| `SYSTEM_ARCHITECTURE.md` | `payments` module, adapter pattern, webhook handlers |
| `SECURITY_AND_THREAT_MODEL.md` | PCI scope, secrets, encryption, fraud controls |
| `IMPLEMENTATION_ROADMAP.md` | Phase 1: Stripe Connect; Phase 2: PayPal; Phase 3: Wise |

---

## 10. Open Payments Questions

| Question | Impact | Decision Needed |
|---|---|---|
| **PAY-01** | Stripe Connect Express vs. Standard as default for individuals? | Onboarding UX vs. payout control |
| **PAY-02** | Platform absorbs Stripe fees or passes through? | Unit economics; seller adoption |
| **PAY-03** | Support split payments (buyer pays fee, seller pays fee)? | Complexity vs. flexibility |
| **PAY-04** | Minimum payout threshold (e.g., $25) to reduce payout cost? | Seller cash flow vs. ops cost |
| **PAY-05** | Multi-currency settlement (seller receives local currency)? | FX cost; provider capability |
| **PAY-06** | Escrow for subscription/recurring deals? | Phase 2 scope |
| **PAY-07** | Insurance/protection fund for seller guarantees? | Business model; capital requirement |

---

*All payment flows designed for provider-agnostic adapter pattern. Stripe Connect is the reference implementation for Phase 1.*