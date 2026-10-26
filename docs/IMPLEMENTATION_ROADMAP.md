# Escrow Pigeon — Implementation Roadmap

**Version:** 0.1 (Draft)  
**Status:** Planning Phase  
**Last Updated:** 2026-10-26

---

## 1. Overview

This roadmap translates the product vision, requirements, architecture, and design documents into a phased delivery plan. Each phase delivers **end-to-end vertical slices** (not horizontal layers) so stakeholders can validate working software early.

### 1.1 Phase Structure

| Phase | Focus | Duration | Target |
|-------|-------|----------|--------|
| **Phase 0** | Foundation & Core Auth | 4 weeks | Dev environment, CI/CD, auth, user profiles |
| **Phase 1** | Deal Room MVP (Escrow Core) | 6 weeks | Create deal → invite → payment → delivery → release |
| **Phase 2** | Marketplace & Listings | 4 weeks | Seller listings, search, reviews, categories |
| **Phase 3** | Disputes & Admin | 4 weeks | Dispute flow, admin dashboard, moderation |
| **Phase 4** | PayPal & International | 4 weeks | PayPal adapter, multi-currency, KYC enhancements |
| **Phase 5** | Scale & Harden | Ongoing | Performance, observability, compliance, advanced features |

---

## 2. Phase 0 — Foundation & Core Auth (Weeks 1-4)

### 2.1 Goals
- Running development environment with hot reload
- CI/CD pipeline with tests, lint, type-check
- Authentication system (register, login, MFA, email verification)
- User profiles with verification tiers
- Database schema deployed (Prisma migrations)

### 2.2 Deliverables

| Area | Items |
|------|-------|
| **Infrastructure** | Docker Compose (Postgres, Redis, MinIO), GitHub Actions CI, Preview deployments |
| **Database** | All core tables via Prisma: `users`, `sessions`, `verification_requests`, `audit_logs`, `idempotency_keys` |
| **Auth Module** | `authRouter`: register, login, logout, verifyEmail, requestPasswordReset, resetPassword, enableMFA, verifyMFA, disableMFA, getSession |
| **User Module** | `userRouter`: getProfile, updateProfile, getVerificationStatus, startVerification, submitVerificationDocs, notification preferences |
| **Security** | Rate limiting, CSRF protection, secure cookies, password hashing (Argon2), audit logging |
| **Testing** | Unit tests for auth flows (>90% coverage), integration tests for registration/login |

### 2.3 Dependencies
- None (foundational)

### 2.4 Exit Criteria
- [ ] `pnpm dev` starts all services
- [ ] CI passes on every push
- [ ] New user can register, verify email, login with MFA
- [ ] User profile CRUD works
- [ ] Verification tier upgrade flow works (document upload → pending → approved)

---

## 3. Phase 1 — Deal Room MVP (Weeks 5-10)

### 3.1 Goals
- Complete escrow flow: create deal → invite counterparty → payment → delivery → acceptance → payout
- Stripe Connect Express onboarding for sellers
- Automated agreement generation & signing
- Real-time deal timeline

### 3.2 Deliverables

| Area | Items |
|------|-------|
| **Database** | `deals`, `deal_participants`, `agreements`, `milestones`, `evidence`, `payments`, `payouts`, `ledger_entries`, `deal_timeline_events` |
| **Deals Module** | `dealsRouter`: createDeal, getDealInvitation, acceptInvitation, declineInvitation, revokeInvitation, getDeal, getMyDeals, initiatePayment, confirmPayment, submitDelivery, acceptDelivery, requestRevision, cancelDeal, getDealTimeline, downloadAgreementPDF |
| **Payments Module** | Stripe Connect adapter, `paymentsRouter`: getPaymentStatus, getPayoutStatus, getSellerPayouts, requestPayoutMethod, getFeePreview |
| **Stripe Integration** | Express onboarding, PaymentIntent (manual capture), webhook handlers (succeeded, failed, refunded, dispute, payout), idempotency |
| **Agreement Engine** | Template-based PDF generation, content hashing, dual-signature tracking, versioning |
| **Notifications** | Email + in-app for: invitation, payment, delivery, acceptance, dispute, payout |
| **Testing** | E2E tests for happy path (create → invite → pay → deliver → accept → payout), edge cases (timeout, dispute, cancel) |

### 3.3 Dependencies
- Phase 0 complete (auth, users, database)

### 3.4 Exit Criteria
- [ ] Buyer creates deal, invites seller via email/link
- [ ] Seller accepts, completes Stripe Connect onboarding
- [ ] Buyer pays (3DS), funds held in escrow
- [ ] Seller delivers, buyer accepts
- [ ] Funds released to seller, payout completed
- [ ] Agreement PDF downloadable by both parties
- [ ] All webhook events handled idempotently
- [ ] Fee calculation matches spec (4% + $0.30 default)

---

## 4. Phase 2 — Marketplace & Listings (Weeks 11-14)

### 4.1 Goals
- Sellers create and manage service listings
- Buyers search, filter, and discover listings
- Reviews and ratings system
- Category hierarchy

### 4.2 Deliverables

| Area | Items |
|------|-------|
| **Database** | `listings`, `categories`, `reviews`, `listing_reports`, `listing_media` |
| **Marketplace Module** | `marketplaceRouter`: createListing, updateListing, publishListing, archiveListing, getMyListings, getListing, searchListings, getCategories, submitReview, getReviews, reportListing |
| **Search** | Full-text search (PostgreSQL tsvector + trigram), filters (category, price, tier), sorting, pagination |
| **Seller Dashboard** | `sellerRouter`: getAnalytics, getRevenueChart, getConversionFunnel |
| **Media Handling** | Presigned S3/MinIO upload URLs, image optimization, CDN |
| **Testing** | Search relevance tests, listing CRUD, review submission constraints |

### 4.3 Dependencies
- Phase 1 complete (deals, payments, users)

### 4.4 Exit Criteria
- [ ] Seller creates listing with media, publishes
- [ ] Buyer searches with filters, sees results
- [ ] Completed deals generate review prompts
- [ ] Reviews display on seller profile & listing
- [ ] Analytics dashboard shows views, conversions, revenue

---

## 5. Phase 3 — Disputes & Admin (Weeks 15-18)

### 5.1 Goals
- Structured dispute resolution with evidence
- Admin dashboard for moderation, user management, financial oversight
- Dual-approval for high-value payouts

### 5.2 Deliverables

| Area | Items |
|------|-------|
| **Database** | `disputes`, `dispute_evidence`, `dispute_decisions`, `admin_actions`, `fee_rules` |
| **Disputes Module** | `disputesRouter`: openDispute, submitEvidence, getDispute, getMyDisputes |
| **Admin Module** | `adminRouter`: getUsers, updateUserVerification, suspendUser, getListingsQueue, moderateListing, getDisputesQueue, assignDisputeReviewer, recordDisputeDecision, authorizePayout, manageFeeRules, toggleCurrency, getAnalytics, exportAuditLog |
| **Dispute Workflow** | Evidence submission → reviewer assignment → decision (full/partial/buyer) → execution (release/refund) |
| **Chargeback Representation** | Auto-evidence compilation from deal room, Stripe/PayPal submission |
| **Admin UI** | User management, listing moderation queue, dispute queue, fee rule editor, analytics |
| **Testing** | Dispute state machine tests, admin permission tests, dual-approval enforcement |

### 5.3 Dependencies
- Phase 1 complete (deals, payments)
- Phase 2 complete (listings for moderation context)

### 5.4 Exit Criteria
- [ ] Either party can open dispute with evidence
- [ ] Admin assigns reviewer, records decision
- [ ] Decision executes (release/refund/partial)
- [ ] Chargeback evidence auto-submitted
- [ ] Admin can manage users, listings, fees, currencies
- [ ] Payouts >$1000 require dual admin approval

---

## 6. Phase 4 — PayPal & International (Weeks 19-22)

### 6.1 Goals
- PayPal Commerce Platform adapter
- Multi-currency support (USD, EUR, GBP launch)
- Enhanced KYC for Business tier
- Cross-border fee handling

### 6.2 Deliverables

| Area | Items |
|------|-------|
| **Payments** | PayPal adapter (Order API, delayed capture, Payouts API), webhook handlers |
| **Currency** | Multi-currency deals, FX rate caching, cross-border fee bracket |
| **KYC** | Stripe Identity integration for Business tier, document verification workflow |
| **Seller Onboarding** | PayPal onboarding flow, account linking |
| **Compliance** | DAC7 reporting prep, 1099-K thresholds, tax info collection |
| **Testing** | Cross-provider parity tests, currency conversion tests, KYC flow tests |

### 6.3 Dependencies
- Phase 1 complete (Stripe adapter pattern established)
- Phase 3 complete (disputes need PayPal handlers)

### 6.4 Exit Criteria
- [ ] Buyer can pay via PayPal
- [ ] Seller receives PayPal payout
- [ ] Deals work in USD/EUR/GBP
- [ ] Business tier KYC enforced
- [ ] Fee rules apply per currency

---

## 7. Phase 5 — Scale & Harden (Ongoing)

### 7.1 Goals
- Production hardening, observability, performance
- Advanced features: subscriptions, API keys, webhooks for sellers
- Compliance automation

### 7.2 Key Initiatives

| Initiative | Description |
|------------|-------------|
| **Observability** | Distributed tracing (OpenTelemetry), structured logging, SLO dashboards, alerting |
| **Performance** | Query optimization, caching (Redis), CDN, bundle size, Core Web Vitals |
| **Security** | Penetration test, dependency scanning, secret rotation, CSP hardening |
| **Compliance** | Automated GDPR/CCPA data export/deletion, SOC 2 prep, PCI SAQ A attestation |
| **Seller API** | API key management, webhook subscriptions (deal.created, payment.released, dispute.opened) |
| **Subscriptions** | Recurring escrow for retainer agreements (Phase 2+ scope) |
| **Mobile** | React Native / Expo app (separate repo, shared API) |

---

## 8. Cross-Cutting Concerns (All Phases)

| Concern | Implementation |
|---------|----------------|
| **Testing** | TDD mandatory; unit + integration + E2E; 80% coverage minimum |
| **Code Review** | Every PR reviewed; security-reviewer for auth/payments/admin |
| **Documentation** | Update specs with implementation decisions; ADR for architectural choices |
| **Database Migrations** | Reviewed in PR; backward compatible; rollback tested |
| **Feature Flags** | LaunchDarkly-style flags for gradual rollout |
| **Secrets** | 1Password/Infisical; never in code; rotation schedule |
| **Accessibility** | WCAG 2.1 AA baseline; a11y tests in CI |

---

## 9. Team Structure (Suggested)

| Role | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|------|---------|---------|---------|---------|---------|---------|
| **Backend (2-3)** | Auth, DB, CI | Deals, Payments, Stripe | Listings, Search | Disputes, Admin | PayPal, Multi-currency | Perf, Observability |
| **Frontend (2)** | Auth UI, Profile | Deal Room, Agreement | Marketplace, Seller Dash | Dispute UI, Admin Dash | PayPal UI, KYC | Mobile, Accessibility |
| **DevOps (1)** | CI/CD, Infra | Webhooks, Monitoring | Search Infra | Admin Tools | Multi-region | Scale, Security |
| **QA (1)** | Test Framework | E2E Escrow | Search/Listing | Dispute/Admin | PayPal/KYC | Automation |

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Stripe Connect onboarding friction | High | High | Express accounts; clear UX; fallback to Standard |
| Chargeback/fraud rate > threshold | Medium | High | Stripe Radar; velocity limits; evidence automation |
| PayPal hold window (29 days) < deal duration | Medium | Medium | Limit PayPal to deals ≤21 days; document clearly |
| Regulatory changes (DAC7, 1099-K) | Medium | Medium | Modular tax reporting; Stripe Tax integration |
| Database migration complexity | Low | High | Prisma migrate; staging validation; rollback scripts |
| Third-party API changes | Medium | Low | Adapter pattern; version pinning; contract tests |

---

## 11. Milestone Summary

| Milestone | Target Week | Criteria |
|-----------|-------------|----------|
| **M0: Dev Ready** | 4 | CI green, auth working, DB migrated |
| **M1: Escrow MVP** | 10 | Full deal flow works end-to-end |
| **M2: Marketplace Live** | 14 | Listings searchable, reviews working |
| **M3: Dispute/Admin** | 18 | Disputes resolvable, admin can moderate |
| **M4: Multi-Provider** | 22 | PayPal + multi-currency operational |
| **M5: Production Ready** | 26+ | Observability, security, compliance complete |

---

## 12. Cross-References

| Document | Mapping |
|----------|---------|
| `PRODUCT_VISION.md` | Phases align with MVP → Growth → Scale milestones |
| `PRODUCT_REQUIREMENTS.md` | Each requirement (ED-01 to AD-08) mapped to phase |
| `SYSTEM_ARCHITECTURE.md` | Module delivery order matches router structure |
| `DATABASE_DESIGN.md` | Schema delivered incrementally per phase |
| `API_SPECIFICATION.md` | Procedures implemented per phase |
| `UX_AND_INFORMATION_ARCHITECTURE.md` | Screens delivered per phase |
| `PAYMENTS_AND_COMPLIANCE.md` | Provider adapters per phase |
| `SECURITY_AND_THREAT_MODEL.md` | Security controls implemented per phase |
| `OPEN_QUESTIONS_AND_DECISIONS.md` | Decisions unblock phases |

---

## 13. Open Roadmap Questions

| Question | Impact | Decision Needed |
|----------|--------|-----------------|
| **ROAD-01** | Exact team size & hiring timeline | Resource planning |
| **ROAD-02** | Launch geography (US-first vs. global) | KYC, currency, compliance scope |
| **ROAD-03** | Mobile app: parallel or sequential? | Resource allocation |
| **ROAD-04** | Subscription/recurring escrow in Phase 1 or 5? | Scope creep vs. early revenue |
| **ROAD-05** | White-label / API-first for platforms? | Architecture investment |

---

*This roadmap is a living document. Update with each sprint retrospective and major decision.*