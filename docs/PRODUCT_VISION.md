# Escrow Pigeon — Product Vision

**Version:** 0.1 (Draft)  
**Status:** Planning Phase — No implementation started  
**Last Updated:** 2026-10-21

---

## 1. Vision Statement

> **The deal can start anywhere. Trust is established on Escrow Pigeon.**

Escrow Pigeon is a global trust-first trading platform that combines a discovery marketplace with an external-deal system. We enable strangers to transact with confidence through mutually agreed terms, transparent payment status, delivery evidence, impartial dispute resolution, and properly authorized payment settlement.

The pigeon represents communication, delivery, and safe passage — carrying value from sender to recipient without interception or loss.

---

## 2. Product Positioning

### 2.1 Category Definition
**Primary:** Trusted transaction layer for digital goods and services  
**Secondary:** Marketplace for discovering verified sellers of permitted digital assets

### 2.2 Positioning Statement
For online traders, freelancers, and digital creators who currently rely on informal agreements and social trust, Escrow Pigeon is a transaction platform that provides structured deal workflows, evidence-based dispute resolution, and authorized payment settlement — unlike informal peer-to-peer trades or generic payment processors that offer no transaction-specific protection.

### 2.3 Key Differentiators (Proposed — Require Validation)

| Differentiator | Description | Validation Needed |
|---|---|---|
| **Shareable deal invitations** | Create a deal once, invite counterparty via link regardless of platform | Does this reduce friction enough to overcome network effects? |
| **Versioned agreements** | Immutable agreement history with explicit dual acceptance | Legal enforceability of digital acceptance across jurisdictions |
| **Evidence-rich deal rooms** | Structured delivery proof, timestamps, communication logs | Admissibility in provider disputes and chargeback representment |
| **Verified transaction history** | On-platform reputation from completed, protected transactions | Sybil resistance and manipulation prevention |
| **Unified transaction experience** | Same deal/payment infrastructure for marketplace and external deals | Technical complexity vs. user value |

---

## 3. Target Customers

### 3.1 Primary Segments (Phase 1)

| Segment | Description | Pain Points | Acquisition Channel |
|---|---|---|---|
| **Community traders** | Buy/sell via Telegram, Discord, Reddit, forums | Scams, chargebacks, no recourse | Community partnerships, content marketing |
| **Freelancers & clients** | Digital services (design, dev, writing, consulting) | Scope creep, non-payment, disputes | Freelance platforms, LinkedIn, referrals |
| **Digital asset buyers/sellers** | Templates, plugins, licensed assets, courses | IP concerns, delivery verification, fraud | Niche communities, marketplaces |

### 3.2 Secondary Segments (Future Phases)
- Agencies and teams needing bulk transaction tools
- Marketplace sellers wanting premium tools and analytics
- API consumers building integrated workflows

### 3.3 Excluded / Deferred Segments
- Physical goods (logistics complexity, carrier disputes)
- High-risk categories: accounts, credentials, unlicensed IP, regulated items
- Jurisdictions where payment provider onboarding is unavailable

---

## 4. Value Proposition

### 4.1 For Buyers
- **Payment protection:** Funds held until delivery acceptance or dispute resolution
- **Transparent terms:** Agreement locked before payment; no surprise terms
- **Evidence-based recourse:** Structured dispute process with human review
- **Verified sellers:** Reputation from completed protected transactions

### 4.2 For Sellers
- **Guaranteed payment:** Authorized payment confirmation before delivery
- **Chargeback protection:** Provider-level dispute representment with evidence
- **Reduced fraud:** Buyer identity verification and payment authorization
- **Professional workflow:** Milestone payments, clear acceptance criteria

### 4.3 For Platform
- **Transaction revenue:** Sustainable take-rate on protected volume
- **Network effects:** Each protected deal increases trust density
- **Data moat:** Transaction patterns improve risk models over time

---

## 5. Business Model

### 5.1 Revenue Streams

#### Primary: Transaction Commission
- **Structure:** Percentage of transaction volume (proposed: 3–5% + fixed fee)
- **Applied to:** Both marketplace and external deals
- **Collected at:** Settlement (release to seller or refund to buyer)

#### Secondary (Future Phases)
| Stream | Description | Timeline |
|---|---|---|
| **Seller premium tools** | Analytics, bulk listings, promoted placement, team access | Phase 2+ |
| **Business/Enterprise plans** | API access, volume pricing, dedicated support, SLA | Phase 3+ |
| **Value-added services** | Identity verification upgrades, priority dispute handling, insurance | Phase 3+ |

### 5.2 Transaction Economics (Illustrative — Assumptions Labeled)

> **⚠️ All figures below are illustrative assumptions for modeling purposes only. Not validated market data.**

| Component | Assumption | Notes |
|---|---|---|
| **Platform take-rate** | 4% + $0.30 per transaction | Blended rate; may vary by category/volume |
| **Payment processing (Stripe Connect)** | 2.9% + $0.30 (US); higher intl | Pass-through or absorbed |
| **Chargeback rate** | 0.5–1.5% of volume | Digital goods typically higher |
| **Chargeback loss rate** | 30–50% of chargebacks | With evidence representment |
| **Fraud loss rate** | 0.2–0.8% of volume | Account takeover, collusion |
| **Dispute operations cost** | $15–40 per case | Human review, tooling, escalation |
| **Payout cost (ACH/SEPA)** | $0.25–1.00 per payout | Varies by provider and currency |
| **FX spread (cross-border)** | 1–2% on conversion | If platform absorbs |
| **Tax compliance** | 0.5–1% of revenue | Filing, reporting, registrations |
| **Customer acquisition (CAC)** | $25–100 per activated user | Content, referrals, partnerships |

#### Example Scenarios

**Scenario A: $100 Digital Template Sale (Domestic)**
```
Gross volume:           $100.00
Platform fee (4%+$0.30): $4.30
Payment processing:     -$3.20  (2.9%+$0.30)
Net platform revenue:   $1.10
Less: Fraud/chargeback provision (1%): -$1.00
Less: Dispute ops (amortized):        -$0.20
Less: Payout cost:                    -$0.25
Estimated contribution:               -$0.35  (loss at this volume)
```
*→ Minimum viable transaction size likely $50+ for positive unit economics*

**Scenario B: $500 Freelance Milestone (International)**
```
Gross volume:           $500.00
Platform fee (4%+$0.30): $20.30
Payment processing:     -$16.80 (3.4%+$0.30 intl)
FX spread (1.5%):       -$7.50
Net platform revenue:   -$4.00  (loss before ops)
Less: Fraud/chargeback provision (0.8%): -$4.00
Less: Dispute ops:                    -$0.50
Less: Payout cost:                    -$1.00
Estimated contribution:              -$9.50
```
*→ International requires higher take-rate, volume discounts, or seller-paid FX*

### 5.3 Reducing Off-Platform Leakage
**Strategy: Value-based retention, not artificial trapping**
- Deal rooms so useful (evidence, milestones, communication) that parties prefer staying on-platform
- Reputation that accrues only from on-platform completed transactions
- Invitation flow so frictionless that creating a deal is easier than sharing PayPal/Venmo details
- API/webhooks for power users to integrate without leaving their workflow
- **Never:** Artificial restrictions, hidden fees, or data lock-in

---

## 6. Scope and Phased Category Expansion

### 6.1 Phase 1 Categories (Validated for Payment Provider Eligibility)
- ✅ Digital services: design, development, writing, consulting, marketing
- ✅ Licensed digital assets: templates, plugins, themes, UI kits, fonts
- ✅ Educational content: courses, tutorials, ebooks (creator-owned)
- ⚠️ **Requires provider confirmation:** Game assets, 3D models, audio/video licenses

### 6.2 Explicitly Prohibited (All Phases)
- Account sales/transfers (ToS violations, fraud magnet)
- Credentials, API keys, access tokens
- Unlicensed/copyrighted content
- Regulated items: financial instruments, crypto (as primary), pharmaceuticals
- Adult content (provider restrictions)
- Physical goods (Phase 1–2)
- Services requiring professional licensure (legal, medical, financial advice)

### 6.3 Expansion Criteria (Per Category)
Before adding a category:
1. Payment provider confirms eligibility for delayed settlement/escrow
2. Fraud patterns understood and mitigations designed
3. Dispute evidence standards defined
4. Legal review completed for jurisdiction coverage
5. Seller onboarding/KYC requirements mapped

---

## 7. Success Metrics (Leading Indicators)

| Metric | Phase 1 Target | Measurement |
|---|---|---|
| **Deal completion rate** | >85% | Completed / (Completed + Disputed + Cancelled) |
| **Dispute rate** | <5% | Disputes / Total deals |
| **Chargeback rate** | <1% | Chargebacks / Successful payments |
| **Median dispute resolution time** | <14 days | Open to decision |
| **Seller activation rate** | >40% | Listings with ≥1 sale / Total approved sellers |
| **Repeat transaction rate (30d)** | >20% | Users with ≥2 deals / Activated users |
| **Off-platform leakage (survey)** | <30% | "Would you have used another method?" |

---

## 8. Brand Identity Direction

### 8.1 Brand Attributes
| Attribute | Expression |
|---|---|
| **Trustworthy** | Transparent terms, visible security, no dark patterns |
| **Premium** | Polished UI, thoughtful micro-interactions, quality typography |
| **Approachable** | Clear language, guided flows, helpful empty states |
| **Global** | Multi-currency, RTL-ready, culturally neutral symbols |
| **Memorable** | Distinctive pigeon mark, cohesive color system, ownable visual language |

### 8.2 Visual Direction (High-Level)
- **Mark:** Stylized pigeon in flight — geometric, modern, scalable to 16px
- **Palette:** Deep trust blues + warm accent (not generic fintech blue/green)
- **Typography:** System font stack with distinctive display face for headlines
- **Motion:** Purposeful transitions (deal state changes, evidence upload, payment confirmation)
- **Tone:** Professional, direct, reassuring — never playful or crypto-native slang

### 8.3 Anti-Patterns to Avoid
- ❌ Fake live counters ("12 deals in the last minute!")
- ❌ Fabricated testimonials or trust badges
- ❌ "Bank-grade security" claims without certification
- ❌ Crypto/Web3 aesthetics unless blockchain is core (it is not)
- ❌ Dark patterns in cancellation or dispute flows

---

## 9. Cross-References

| Document | Purpose |
|---|---|
| `PRODUCT_REQUIREMENTS.md` | Functional/non-functional requirements, user stories |
| `UX_AND_INFORMATION_ARCHITECTURE.md` | Sitemap, journeys, screen specs, design system |
| `SYSTEM_ARCHITECTURE.md` | Technical stack, modules, deployment |
| `PAYMENTS_AND_COMPLIANCE.md` | Payment models, provider evaluation, legal questions |
| `IMPLEMENTATION_ROADMAP.md` | Phased delivery plan, dependencies |

---

## 10. Decision Log

| Date | Decision | Rationale | Status |
|---|---|---|---|
| 2026-10-21 | Product name: Escrow Pigeon | Memorable, metaphorical, brandable | Confirmed |
| 2026-10-21 | Dual experience: Marketplace + External deals | Addresses both discovery and existing relationships | Confirmed |
| 2026-10-21 | No blockchain/crypto in core product | Payment provider compatibility, regulatory simplicity | Confirmed |
| 2026-10-21 | Phase 1: Digital services + licensed assets only | Manageable fraud surface, provider eligibility | Proposed |
| 2026-10-21 | Modular monolith architecture | Solo/small team velocity, operational simplicity | Proposed |

---

*This document is a living blueprint. All "Proposed" and "Assumption" items require validation before implementation commitment.*