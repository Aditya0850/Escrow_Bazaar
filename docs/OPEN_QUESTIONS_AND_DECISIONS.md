# Escrow Pigeon — Open Questions & Decisions

**Version:** 0.1 (Draft)  
**Status:** Planning Phase  
**Last Updated:** 2026-10-26

---

## How to Read This Document

| Column | Meaning |
|--------|---------|
| **ID** | Stable identifier; never reused |
| **Question** | What must be decided |
| **Status** | `Open` \| `Decided` \| `Deferred` \| `Blocked` |
| **Options** | Viable alternatives (with trade-offs) |
| **Recommendation** | Author's preferred option (not a decision) |
| **Rationale** | Why the recommendation makes sense |
| **Dependencies** | Other decisions that must land first |
| **Delay Cost** | What happens if this slips |

> **Convention:** Recommendations are *not* decisions. A decision is recorded only when `Status = Decided` and the `Decision` field is filled.

---

## 1. Technology Stack

| ID | Question | Status | Options | Recommendation | Rationale | Dependencies | Delay Cost |
|----|----------|--------|---------|----------------|-----------|--------------|------------|
| **TECH-01** | Primary API protocol | Open | tRPC (current), REST + OpenAPI, GraphQL | tRPC | Type-safe end-to-end; matches Fastify/TypeScript stack; low boilerplate | None | Medium — rewrites API layer if changed late |
| **TECH-02** | Real-time updates (deal timeline, notifications) | Open | WebSocket (Socket.io), Server-Sent Events, polling, Pusher/Ably | SSE + polling fallback | Simpler infra; works over HTTP/2; no sticky sessions | TECH-01 | Low — can add later |
| **TECH-03** | Search backend | Open | PostgreSQL tsvector+trigram, Meilisearch, Typesense, Elasticsearch | PostgreSQL native (Phase 1), Meilisearch (Phase 2) | Zero external dep for MVP; Meilisearch scales when needed | DATABASE-01 | Low |
| **TECH-04** | PDF generation for agreements | Open | `@react-pdf/renderer`, Puppeteer, `pdfkit`, DocRaptor API | `@react-pdf/renderer` | React components → PDF; no headless browser in prod | UX-04 | Medium — agreement is core artifact |
| **TECH-05** | File storage | Open | MinIO (local/S3-compatible), AWS S3, Cloudflare R2, Supabase Storage | MinIO dev → S3 prod | S3 API portable; R2 for cost savings later | None | Low |
| **TECH-06** | Background job queue | Open | BullMQ (Redis), pg-boss (Postgres), Inngest, Temporal | BullMQ | Mature, typed, Redis already in stack | None | Low |

---

## 2. Legal Entity, Jurisdictions & Regulatory Feasibility

| ID | Question | Status | Options | Recommendation | Rationale | Dependencies | Delay Cost |
|----|----------|--------|---------|----------------|-----------|--------------|------------|
| **LAW-01** | Legal entity for platform (US LLC, C-Corp, UK Ltd, EU entity) | Open | US C-Corp (Stripe Atlas), UK Ltd, EU GmbH/BV, Dual entity | US C-Corp + UK Ltd subsidiary | Stripe Connect favors US; UK/EU for PSD2/DAC7 | None | **High** — onboarding, banking, tax all depend on this |
| **LAW-02** | Launch jurisdictions (Phase 1) | Open | US only, US+UK, US+EU, Global (excluding sanctioned) | US + UK + Canada | English-speaking; Stripe Connect mature; similar consumer protection | LAW-01 | **High** — KYC, compliance, banking |
| **LAW-03** | Money transmitter license (MTL) requirement | Open | None (agent of payee), Stripe as MSP, Apply for MTLs | Agent-of-payee via Stripe Connect | Stripe handles MTL for platform; avoids 50-state licensing | LAW-01, LAW-02 | **Critical** — operating without license = shutdown risk |
| **LAW-04** | Terms of Service & Escrow Agreement jurisdiction | Open | Delaware (US), England & Wales, Netherlands, Arbitration | Delaware law + binding arbitration | Standard for US platforms; enforceable internationally | LAW-01 | Medium |
| **LAW-05** | Consumer protection cooling-off periods | Open | None, 14-day (EU), 3-day (US some states), Configurable per jurisdiction | Configurable per buyer jurisdiction | Compliance by design; avoids legal exposure | LAW-02 | Medium |

---

## 3. Payment Provider Approval & Escrow Workflow

| ID | Question | Status | Options | Recommendation | Rationale | Dependencies | Delay Cost |
|----|----------|--------|---------|----------------|-----------|--------------|------------|
| **PAY-01** | Stripe Connect approval timeline & requirements | Open | Express (fast), Standard (seller dashboard), Custom (full control) | Express for individuals, Standard for businesses | Express onboarding ~10 min; Standard gives seller visibility | LAW-01 | **High** — blocks Phase 1 delivery |
| **PAY-02** | Maximum hold period Stripe allows | Open | 90 days (manual capture), 7 days (auto-capture) | 90-day manual capture | Covers long service engagements; configurable per deal | PAY-01 | **High** — defines max deal duration |
| **PAY-03** | PayPal Commerce Platform approval for marketplaces | Open | Partner Marketplace, PayPal for Marketplaces, Braintree Marketplace | PayPal for Marketplaces (if available) | Native delayed capture; but stricter approval | PAY-01, LAW-02 | Medium — Phase 4 |
| **PAY-04** | Support for "platform controls release" vs. "seller controls payout" | Open | Express (platform), Standard (seller), Custom (platform) | Express accounts (platform controls) | Core escrow promise: platform releases on acceptance | PAY-01 | **High** — architectural |
| **PAY-05** | Instant payouts (Stripe Instant Payouts, Visa Direct, RTP) | Open | Standard (T+2/7), Instant (1.5% fee), Push-to-card | Standard only for MVP | Instant payouts add cost/complexity; defer | PAY-01 | Low |

---

## 4. Transaction Categories & Prohibited Goods

| ID | Question | Status | Options | Recommendation | Rationale | Dependencies | Delay Cost |
|----|----------|--------|---------|----------------|-----------|--------------|------------|
| **CAT-01** | Initial supported categories (Phase 1) | Open | 10-15 digital service categories, Broad "Digital Services" | Curated 12 categories (dev, design, writing, marketing, video, audio, consulting, data, translation, legal templates, finance templates, coaching) | Narrow = better trust, easier moderation, focused SEO | UX-01 | Medium |
| **CAT-02** | Prohibited categories enforcement point | Open | Listing creation, Payment initiation, Both | Both (listing block + payment reject) | Defense in depth; Stripe Radar also blocks | CAT-01 | Medium |
| **CAT-03** | Physical goods — ever supported? | Deferred | No (Phase 1-3), Yes (Phase 4+ with logistics partner) | Defer to Phase 4+ | Logistics, tracking, customs = different product | CAT-01 | None (explicit deferral) |
| **CAT-04** | Regulated professional services (legal, medical, financial) | Open | Block entirely, Allow with verification tier, Partner with licensed entities | Allow with Business tier + license verification | High-value; needs compliance review per jurisdiction | LAW-02, VER-01 | Medium |

---

## 5. Fees, Economics, Refunds, Chargebacks & Payouts

| ID | Question | Status | Options | Recommendation | Rationale | Dependencies | Delay Cost |
|----|----------|--------|---------|----------------|-----------|--------------|------------|
| **FEE-01** | Default platform fee | Open | 3-5% + $0.30, Tiered by volume, Category-specific | 4% + $0.30 (400 bps + 30¢) | Competitive with Upwork/Fiverr; covers Stripe ~2.9% + margin | PAY-01 | **High** — revenue model |
| **FEE-02** | Fee payer default (buyer vs. seller vs. split) | Open | Buyer pays, Seller pays, 50/50 split, Configurable per deal | Buyer pays (configurable) | Buyer-paid is marketplace norm; seller can absorb in pricing | FEE-01 | Medium |
| **FEE-03** | Cross-border FX markup | Open | 0% (mid-market), 1-2% buffer, Pass-through Stripe FX | +1% buffer (100 bps) | Covers FX volatility; transparent to users | FEE-01 | Low |
| **FEE-04** | Minimum payout threshold | Open | None, $25, $50, $100 | $25 | Reduces payout frequency/cost; reasonable for freelancers | PAY-01 | Low |
| **FEE-05** | Refund policy (buyer remorse vs. not-delivered) | Open | No remorse refunds, 48-hour cooling off, Category-specific | No remorse; only not-delivered/not-as-described | Escrow ≠ return policy; protects sellers | CAT-01, DIS-01 | Medium |
| **FEE-06** | Chargeback liability & representment automation | Open | Platform absorbs, Seller liable, Auto-represent with deal evidence | Auto-represent with evidence; platform covers <0.5% rate | Evidence from deal room = high win rate; platform insures tail | DIS-01, SEC-03 | **High** — financial risk |

---

## 6. KYC/KYB, Dispute Rules, Evidence & Operations

| ID | Question | Status | Options | Recommendation | Rationale | Dependencies | Delay Cost |
|----|----------|--------|---------|----------------|-----------|--------------|------------|
| **VER-01** | Verification tiers & requirements | Open | Basic (email), Verified (ID+selfie), Business (docs+KYB) | Three tiers as specified | Progressive trust; Stripe Identity for Verified | LAW-01 | **High** — onboarding funnel |
| **VER-02** | Stripe Identity integration scope | Open | All sellers, Verified+ only, Business only | Verified+ (individuals), Business (entities) | Cost per check; balance friction vs. trust | VER-01, PAY-01 | Medium |
| **DIS-01** | Dispute resolution workflow | Open | Platform decides, Community jury, External arbitrator, Hybrid | Platform reviewer (Phase 1), External arbiter (Phase 3+) | Speed + consistency; arbitration for high-value | ADM-01 | **High** — core trust mechanism |
| **DIS-02** | Evidence retention period | Open | 1 year, 3 years, 7 years (financial), Indefinite | 7 years (financial regulation) | Covers chargeback window + tax audit | LAW-03 | Low |
| **DIS-03** | Dispute fee (filing fee, loser pays) | Open | Free, $25 filing (refunded if win), Loser pays platform fee | Free to file; platform fee deducted from award | Low barrier to legitimate disputes | FEE-01 | Low |
| **OPS-01** | Support team structure (Phase 1) | Open | Founder-only, Part-time contractor, Full-time hire | Founder + 1 contractor (20h/wk) | Cost control; scales with volume | None | Medium |
| **OPS-02** | SLA for dispute resolution | Open | 48h, 5 business days, 10 business days | 5 business days | Realistic for evidence review; communicable to users | DIS-01 | Low |

---

## 7. Currency Conversion & Settlement

| ID | Question | Status | Options | Recommendation | Rationale | Dependencies | Delay Cost |
|----|----------|--------|---------|----------------|-----------|--------------|------------|
| **CUR-01** | Supported settlement currencies (Phase 1) | Open | USD only, USD+EUR+GBP, All Stripe-supported | USD, EUR, GBP | Covers US/UK/EU launch; Stripe handles settlement | LAW-02, PAY-01 | **High** — database, fees, payouts |
| **CUR-02** | FX rate source & refresh cadence | Open | Stripe FX, Open Exchange Rates (daily), ECB (daily), Real-time | Stripe FX (built into Connect) | No extra integration; consistent with payout | CUR-01 | Low |
| **CUR-03** | Seller receives local currency vs. deal currency | Open | Deal currency only, Seller chooses (FX at payout), Auto-convert | Seller chooses at onboarding | Flexibility; seller bears FX risk if they choose | CUR-01 | Medium |
| **CUR-04** | Stablecoin / crypto settlement | Deferred | No, USDC on Polygon, Custom | Defer indefinitely | Regulatory uncertainty; banking partner risk | LAW-03 | None |

---

## 8. MVP Scope, Launch Criteria & Founder Decisions

| ID | Question | Status | Options | Recommendation | Rationale | Dependencies | Delay Cost |
|----|----------|--------|---------|----------------|-----------|--------------|------------|
| **MVP-01** | MVP definition (what ships at launch) | Open | Deal room only, Deal room + basic listings, Full marketplace | Deal room + seller profiles (no public search) | Validates escrow first; marketplace is growth lever | All Phase 0-1 | **Critical** — defines Phase 1 scope |
| **MVP-02** | Launch criteria (go/no-go checklist) | Open | Technical only, Technical + legal + compliance, All above + beta users | Technical + legal + compliance + 50 beta deals | Real usage proves escrow flow; compliance non-negotiable | LAW-03, PAY-01 | **Critical** |
| **MVP-03** | Founder approval required for: fee changes, new jurisdictions, category additions, dispute policy | Open | All above, Fees + jurisdictions only, Fees only | Fees + jurisdictions + dispute policy | High-impact; reversible tech decisions don't need founder | FEE-01, LAW-02, DIS-01 | Medium |
| **MVP-04** | Brand name finalization (Escrow Pigeon vs. alternatives) | Decided | Escrow Pigeon, EscrowNest, SafeDeal, TrustEscrow | **Escrow Pigeon** (decided) | Memorable; pigeon = trusted messenger; domain available | None | None |
| **MVP-05** | Pricing page & public fee transparency | Open | Full transparency, "Contact for enterprise", Tiered public | Full transparency | Trust signal; competitors hide fees | FEE-01 | Low |

---

## 9. Infrastructure & Operations

| ID | Question | Status | Options | Recommendation | Rationale | Dependencies | Delay Cost |
|----|----------|--------|---------|----------------|-----------|--------------|------------|
| **INF-01** | Hosting provider (production) | Open | Fly.io, Railway, Render, AWS ECS, GCP Cloud Run | Fly.io (primary), AWS (backup) | Edge deployment, Postgres/Redis managed, simple scaling | None | Medium |
| **INF-02** | Database hosting (PostgreSQL) | Open | Neon, Supabase, RDS, Cloud SQL, Self-managed | Neon (serverless, branching) | DX for preview deployments; cost-effective | None | Low |
| **INF-03** | Email provider | Open | Resend, SendGrid, Postmark, Mailgun | Resend | React Email compatible; good deliverability; simple API | None | Low |
| **INF-04** | Error tracking & monitoring | Open | Sentry, Datadog, Highlight.io, OpenTelemetry self-hosted | Sentry (errors) + OpenTelemetry (traces) | Sentry for app errors; OTel for vendor-neutral tracing | None | Low |
| **INF-05** | Analytics / product metrics | Open | PostHog, Mixpanel, Amplitude, Plausible | PostHog (self-hostable, feature flags) | Feature flags + analytics + session replay | None | Low |

---

## 10. Security & Compliance Decisions

| ID | Question | Status | Options | Recommendation | Rationale | Dependencies | Delay Cost |
|----|----------|--------|---------|----------------|-----------|--------------|------------|
| **SEC-01** | Penetration test before launch | Open | Internal only, External firm (1 week), Bug bounty | External firm (1 week) | Required for SOC 2; finds blind spots | All Phase 1 | Medium |
| **SEC-02** | SOC 2 Type I / II timeline | Deferred | Phase 2, Phase 3, After $1M ARR | After $1M ARR | Cost/benefit; early customers don't require | LAW-01 | None (deferred) |
| **SEC-03** | PCI DSS SAQ A attestation process | Open | Self-attest (Stripe handles), External QSA | Self-attest annually | Stripe Elements = SAQ A eligible; low effort | PAY-01 | **High** — annual requirement |
| **SEC-04** | GDPR DPA with Stripe & subprocessors | Open | Stripe DPA signed, Review all subprocessors | Sign Stripe DPA; audit subprocessors quarterly | Required for EU users | LAW-02 | Medium |
| **SEC-05** | Data deletion / right to erasure implementation | Open | Soft delete + 30-day purge, Immediate hard delete, Anonymize | Soft delete + 30-day purge (financial records retained) | Balances GDPR + financial regulation | LAW-03, DIS-02 | Low |

---

## 11. Decision Log (Confirmed Decisions)

| ID | Decision | Date | Decided By | Notes |
|----|----------|------|------------|-------|
| **MVP-04** | Brand name = **Escrow Pigeon** | 2026-10-26 | Founder | Domain secured; consistent across docs |
| **TECH-01** | API protocol = **tRPC** | 2026-10-26 | Architect | Type-safe, Fastify-native |
| **LAW-03** | MTL strategy = **Agent of payee via Stripe Connect** | 2026-10-26 | Legal counsel (pending) | Avoids 50-state licensing |
| **PAY-01** | Stripe Connect = **Express (individuals) + Standard (businesses)** | 2026-10-26 | Product | Onboarding UX vs. payout control |
| **FEE-01** | Default fee = **4% + $0.30** | 2026-10-26 | Founder | Competitive positioning |
| **VER-01** | Verification = **Three tiers (Basic/Verified/Business)** | 2026-10-26 | Product | Progressive trust model |
| **DIS-01** | Dispute resolution = **Platform reviewer (Phase 1)** | 2026-10-26 | Product | Speed + consistency |

---

## 12. Cross-References

| Document | Related Decisions |
|----------|-------------------|
| `PRODUCT_VISION.md` | MVP-01, MVP-02, MVP-04 |
| `PRODUCT_REQUIREMENTS.md` | CAT-01, CAT-02, DIS-01, DIS-02, VER-01 |
| `SYSTEM_ARCHITECTURE.md` | TECH-01 through TECH-06, INF-01 through INF-05 |
| `DATABASE_DESIGN.md` | CUR-01, VER-01, DIS-02 |
| `API_SPECIFICATION.md` | TECH-01, TECH-02, PAY-01, PAY-04 |
| `UX_AND_INFORMATION_ARCHITECTURE.md` | CAT-01, VER-01, MVP-01 |
| `PAYMENTS_AND_COMPLIANCE.md` | PAY-01 through PAY-05, FEE-01 through FEE-06, CUR-01 through CUR-04, LAW-03, SEC-03 |
| `SECURITY_AND_THREAT_MODEL.md` | SEC-01 through SEC-05, LAW-03, LAW-04 |
| `IMPLEMENTATION_ROADMAP.md` | All (phases map to decision dependencies) |

---

## 13. Next Actions

| Priority | Decision | Owner | Target Date |
|----------|----------|-------|-------------|
| **P0** | LAW-01 (Entity formation) | Founder + Legal | 2026-11-02 |
| **P0** | LAW-03 (MTL confirmation) | Legal counsel | 2026-11-02 |
| **P0** | PAY-01 (Stripe Connect application) | Product + Eng | 2026-11-09 |
| **P0** | MVP-01 (MVP scope freeze) | Founder | 2026-10-28 |
| **P1** | VER-01 (Stripe Identity pricing/limits) | Product | 2026-11-16 |
| **P1** | INF-01 (Hosting decision) | DevOps | 2026-11-09 |
| **P2** | CAT-01 (Final category list) | Product | 2026-11-16 |
| **P2** | SEC-03 (PCI SAQ A process) | Security | 2026-12-01 |

---

*Update this document at every major decision. Archive decided items to the Decision Log. Keep Open items actionable.*