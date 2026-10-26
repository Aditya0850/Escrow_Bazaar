# Escrow Pigeon — Security & Threat Model

**Version:** 0.1 (Draft)  
**Status:** Planning Phase  
**Last Updated:** 2026-10-26

---

## 1. Security Objectives

| Objective | Description | Priority |
|-----------|-------------|----------|
| **Confidentiality** | Protect PII, financial data, deal communications, evidence files | P0 |
| **Integrity** | Ensure deal terms, payment state, evidence immutable; prevent tampering | P0 |
| **Availability** | 99.9% uptime; payment webhook processing within 5 min; deal room responsive | P0 |
| **Accountability** | Full audit trail for all state changes; tamper-evident logs | P0 |
| **Non-Repudiation** | Digital acceptance with timestamps; cryptographic agreement hashes | P0 |
| **Fraud Resistance** | Multi-layer prevention, detection, and response for payment fraud, collusion, account takeover | P0 |

---

## 2. Threat Model (STRIDE)

### 2.1 Asset Inventory

| Asset | Classification | Sensitivity | Regulations |
|-------|----------------|-------------|-------------|
| User PII (email, name, KYC docs) | Restricted | High | GDPR, CCPA |
| Payment credentials (tokens, not PAN) | Restricted | High | PCI DSS SAQ A |
| Deal agreements & terms | Confidential | Medium | Contract law |
| Evidence files (delivery proof) | Confidential | High | Dispute resolution |
| Financial ledger entries | Restricted | High | SOX, tax audit |
| Authentication secrets (password hashes, MFA seeds) | Restricted | Critical | OWASP ASVS L2 |
| API keys (provider secrets, webhook secrets) | Restricted | Critical | Provider contracts |

### 2.2 Threat Enumeration

| ID | Threat | STRIDE | Asset | Likelihood | Impact | Mitigation |
|----|--------|--------|-------|------------|--------|------------|
| **T-01** | SQL Injection via deal creation | Tampering | Database | Medium | High | Parameterized queries (Prisma); input validation (Zod) |
| **T-02** | XSS in deal room evidence viewer | Tampering | User browsers | Medium | High | CSP headers; sanitization; `DOMPurify` on upload preview |
| **T-03** | CSRF on payment initiation | Spoofing | User funds | Low | Critical | SameSite=Strict cookies; double-submit cookie pattern |
| **T-04** | Payment webhook spoofing | Spoofing | Financial state | Medium | Critical | Signature verification (Stripe-Signature); idempotency keys |
| **T-05** | IDOR on deal room access | Information Disclosure | Deal data | Medium | High | RLS policies; authorization checks in use-cases |
| **T-06** | Privilege escalation (user→admin) | Elevation of Privilege | Admin functions | Low | Critical | RBAC enforcement on every endpoint; audit log on role changes |
| **T-07** | Account takeover (credential stuffing) | Spoofing | User accounts | High | High | Rate limiting; MFA; device fingerprinting; breached password check |
| **T-08** | Malicious file upload (malware, polyglot) | Tampering | Evidence storage | Medium | High | MIME validation; ClamAV scan; S3 presigned URLs; no direct execution |
| **T-09** | Deal term manipulation after acceptance | Tampering | Agreement integrity | Low | Critical | Immutable agreement snapshots; SHA-256 content hash; dual acceptance required |
| **T-10** | Payment amount manipulation | Tampering | Financial integrity | Low | Critical | Amount fixed at agreement acceptance; provider validates on capture |
| **T-11** | Replay attack on payment confirmation | Repudiation | Payment state | Low | High | Idempotency keys per operation; webhook event ID deduplication |
| **T-12** | Insider threat (support accessing deals) | Information Disclosure | Deal privacy | Low | Medium | RLS; audit log; admin actions require dual approval >$X |
| **T-13** | DoS via deal creation spam | Denial of Service | Platform availability | Medium | Medium | Rate limits per user/IP; CAPTCHA on registration; queue depth monitoring |
| **T-14** | Webhook flooding (provider retry storm) | Denial of Service | Worker queue | Medium | High | Exponential backoff; circuit breaker; dead letter queue |
| **T-15** | Collusion (buyer+seller fake deals for money laundering) | Fraud | Platform integrity | Low | High | KYC tiers; velocity limits; AML monitoring; suspicious pattern alerts |
| **T-16** | Chargeback fraud (buyer accepts then disputes) | Fraud | Seller funds | Medium | High | Evidence-rich representment; acceptance proof; terms acceptance log |
| **T-17** | Session hijacking | Spoofing | User sessions | Low | High | Secure cookies; short TTL; rotation on privilege change; HTTPS only |
| **T-18** | Insecure deserialization (evidence JSON) | Tampering | Application logic | Low | High | Zod schema validation; no `eval`/`Function` constructor |

---

## 3. Attack Surface Analysis

### 3.1 External Attack Surface

| Entry Point | Protocol | Auth | Rate Limit | Validation |
|-------------|----------|------|------------|------------|
| `/api/trpc/*` | HTTPS (tRPC) | Session cookie | 100 req/min/user | Zod schemas per procedure |
| `/api/webhooks/stripe` | HTTPS (POST) | Signature header | 1000 req/min/IP | Stripe signature + idempotency |
| `/api/webhooks/paypal` | HTTPS (POST) | Certificate/Secret | 1000 req/min/IP | PayPal verification + idempotency |
| `/auth/*` | HTTPS | None (public) | 10 req/min/IP | Zod; breached password API |
| `/deal/[id]` (public invitation) | HTTPS | None (token in URL) | 50 req/min/IP | Token validation; expiry check |
| File upload (S3 presigned) | HTTPS (PUT) | Presigned URL (short TTL) | N/A (S3) | MIME + size + malware scan async |

### 3.2 Internal Attack Surface

| Component | Trust Boundary | Communication |
|-----------|----------------|---------------|
| App Pods → PostgreSQL | Private subnet | TLS 1.3; IAM auth; connection pooling |
| App Pods → Redis | Private subnet | TLS 1.3; AUTH; no internet egress |
| App Pods → S3 | VPC Endpoint | HTTPS; SigV4; presigned URLs |
| App Pods → Stripe/PayPal | NAT Gateway | HTTPS; mTLS (where supported); circuit breaker |
| Worker Pods → Queue | Private subnet | Redis (BullMQ); TLS |
| Admin UI → App Pods | Private subnet | Same as user traffic + RBAC |

---

## 4. Security Controls

### 4.1 Authentication (OWASP ASVS Level 2)

| Control | Implementation |
|---------|----------------|
| **Password Policy** | Min 12 chars; breached password check (HaveIBeenPwned API); Argon2id hashing |
| **MFA** | TOTP (RFC 6238); WebAuthn (Phase 2); recovery codes; enforced for admin/seller tiers |
| **Session Management** | Lucia Auth; secure HttpOnly SameSite=Strict cookies; 30-min idle, 14-day absolute; rotation on role change |
| **Account Recovery** | Email verification link (15-min TTL); no security questions |
| **Brute Force Protection** | 5 attempts → 15-min lockout; exponential backoff; CAPTCHA after 3 failures |
| **Device Trust** | Fingerprint on login; new device → email notification; optional trust |

### 4.2 Authorization

| Layer | Mechanism |
|-------|-----------|
| **API (tRPC)** | Middleware: `auth` → `rbac` → `resourceOwnership` per procedure |
| **Database (RLS)** | PostgreSQL policies: `current_user_id()`, `current_user_has_role()` |
| **Admin Actions** | Dual approval for financial ops >$1,000; audit log with approver IDs |
| **Payment Operations** | Provider adapter validates amount matches deal; no client-supplied amounts |

### 4.3 Encryption

| Data | At Rest | In Transit | Key Management |
|------|---------|------------|----------------|
| PostgreSQL | AES-256 (RDS) | TLS 1.3 | AWS KMS (auto-rotate 30d) |
| Redis | AES-256 (ElastiCache) | TLS 1.3 | AWS KMS |
| S3 (evidence, exports) | SSE-KMS (CMK) | TLS 1.3 | AWS KMS (auto-rotate annually) |
| PII fields (KYC) | Application-level AES-GCM | — | AWS KMS (envelope encryption) |
| Password hashes | Argon2id (memory-hard) | — | N/A (one-way) |
| MFA secrets | AES-GCM (app-level) | — | AWS KMS |

### 4.4 Input Validation & Output Encoding

| Context | Control |
|---------|---------|
| **API Input** | Zod schemas on every tRPC procedure; reject unknown fields |
| **File Upload** | MIME allowlist; magic bytes verification; ClamAV async scan; max 50MB |
| **HTML Output** | React auto-escaping; `DOMPurify` for any dangerouslySetInnerHTML |
| **SQL** | Prisma parameterized queries; no raw SQL in application code |
| **Shell/OS** | No shell execution; use Node.js APIs |
| **Template Rendering** | React Email (JSX) — no user input in templates |

### 4.5 Secrets Management

| Secret Type | Storage | Access | Rotation |
|-------------|---------|--------|----------|
| Database URL | AWS Secrets Manager | App pods (IAM role) | Auto 30 days |
| Stripe Secret Key | AWS Secrets Manager | Payments module only | Manual (Stripe dashboard) |
| Stripe Webhook Secret | AWS Secrets Manager | Webhook handler only | Manual |
| PayPal Credentials | AWS Secrets Manager | PayPal adapter only | Manual |
| JWT Signing Key | AWS Secrets Manager | Auth module only | Auto 90 days |
| Email API Key | AWS Secrets Manager | Notifications module | Manual |
| Encryption Keys | AWS KMS | App-level envelope encryption | Auto annually |

---

## 5. Payment Security (PCI DSS SAQ A)

### 5.1 Scope Reduction

- **No PAN storage**: All card data handled by Stripe Elements / PayPal SDK
- **No card data in logs**: Structured logging excludes payment fields
- **SAQ A eligibility**: Confirmed — only redirect/iframe integration

### 5.2 Payment Flow Security

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Browser   │────▶│  Stripe Elements │────▶│   Stripe    │
│  (Buyer)    │     │  (iframed,       │     │  (Tokenize  │
│             │     │   no card data   │     │   PAN)      │
└─────────────┘     │   touches host)  │     └──────┬──────┘
                    └──────────────────┘            │
                                                   ▼
                                            ┌─────────────┐
                                            │  Payment    │
                                            │  Intent     │
                                            │  Created    │
                                            └──────┬──────┘
                                                   │
                              ┌────────────────────┼────────────────────┐
                              ▼                    ▼                    ▼
                       ┌────────────┐      ┌──────────────┐      ┌─────────────┐
                       │   App      │      │   Webhook    │      │  Database   │
                       │  Backend   │◀─────│  (Verified)  │─────▶│  (Ledger)   │
                       └────────────┘      └──────────────┘      └─────────────┘
```

### 5.3 Webhook Security

```typescript
// Every webhook handler follows this pattern
async function handleStripeWebhook(request: Request) {
  const sigHeader = request.headers.get('stripe-signature');
  const eventId = request.headers.get('stripe-event-id');
  
  // 1. Verify signature (prevents spoofing)
  const event = stripe.webhooks.constructEvent(
    await request.text(),
    sigHeader,
    config.stripe.webhookSecret
  );
  
  // 2. Idempotency check (prevents replay)
  const existing = await idempotencyKeys.find(eventId);
  if (existing) return { received: true, duplicate: true };
  
  // 3. Process with exactly-once semantics
  await processEvent(event);
  
  // 4. Record idempotency key
  await idempotencyKeys.create({ key: eventId, ... });
}
```

---

## 6. Fraud Prevention Architecture

### 6.1 Layered Defense

```
┌─────────────────────────────────────────────────────────────┐
│                     FRAUD DEFENSE LAYERS                    │
├─────────────────────────────────────────────────────────────┤
│  L1: ONBOARDING                                             │
│  ├── Email verification (mandatory)                         │
│  ├── Phone verification (optional, high-value)              │
│  ├── Stripe Identity (ID doc + selfie for Verified+)       │
│  ├── Business docs verification (Business tier)             │
│  └── Sanctions screening (Phase 2+)                         │
├─────────────────────────────────────────────────────────────┤
│  L2: TRANSACTION                                            │
│  ├── 3DS mandatory (SCA compliance)                         │
│  ├── Velocity limits: $500/day (new), $5k/day (basic)      │
│  ├── Amount limits by verification tier                     │
│  ├── Device fingerprinting (fingerprintjs)                  │
│  ├── Geo-IP mismatch challenge                              │
│  └── Stripe Radar ML scoring (block >70, review >50)       │
├─────────────────────────────────────────────────────────────┤
│  L3: BEHAVIORAL                                             │
│  ├── New buyer + high value = manual review queue           │
│  ├── Rapid repeat disputes = account flag                   │
│  ├── Chargeback rate >0.5% = seller review                  │
│  ├── Collusion detection: same device/IP, circular deals   │
│  └── Money laundering: structuring, round amounts, speed   │
├─────────────────────────────────────────────────────────────┤
│  L4: POST-TRANSACTION                                       │
│  ├── Chargeback monitoring dashboard                        │
│  ├── Dispute pattern analysis (seller/buyer)                │
│  ├── Seller payout holds on risk signals                    │
│  ├── Automated SAR filing (Phase 2+)                        │
│  └── Law enforcement cooperation process                    │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Chargeback Representment Automation

| Trigger | Evidence Package | Deadline |
|---------|------------------|----------|
| `charge.dispute.created` | Agreement snapshot, delivery proof, acceptance proof, communication log, tracking (if applicable), platform fee justification, ToS URL | Provider deadline - 48 hours |
| `charge.dispute.closed` (won) | Release funds to seller | Immediate |
| `charge.dispute.closed` (lost) | Refund buyer, record loss | Immediate |

---

## 7. Data Protection & Privacy

### 7.1 GDPR Compliance

| Right | Implementation |
|-------|----------------|
| **Access (Art. 15)** | `/api/user/data-export` — JSON + PDF; 30-day SLA |
| **Rectification (Art. 16)** | Profile edit UI; admin correction workflow |
| **Erasure (Art. 17)** | Anonymization pipeline: retain financial records (legal basis), pseudonymize PII |
| **Portability (Art. 20)** | Same as access; machine-readable format |
| **Restriction (Art. 18)** | `processing_restricted` flag; blocks non-essential processing |
| **Objection (Art. 21)** | Marketing opt-out; legitimate interest assessment for fraud prevention |

### 7.2 Data Retention

| Data Category | Retention | Legal Basis | Disposal |
|---------------|-----------|-------------|----------|
| Financial records (ledger, payments, payouts) | 7 years | Legal obligation (tax, AML) | Secure deletion after period |
| Deal agreements & evidence | 7 years post-completion | Contract evidence | Secure deletion |
| User PII (active accounts) | Account lifetime + 2 years | Contract performance | Anonymization on deletion request |
| User PII (deleted accounts) | 2 years post-deletion | Legal claims defense | Secure deletion |
| Authentication logs | 1 year | Security monitoring | Auto-purge |
| Webhook payloads | 90 days | Debugging, audit | Auto-purge |
| Analytics events | 2 years | Product improvement | Aggregation + deletion |

### 7.3 Cross-Border Transfers

- **Default**: Data stored in primary region (e.g., `us-east-1`)
- **EU users**: Optional EU region (`eu-central-1`) — requires infrastructure duplication
- **SCCs**: Standard Contractual Clauses with subprocessors (Stripe, AWS, Resend)
- **Transfer Impact Assessment**: Documented per subprocessor

---

## 8. Incident Response

### 8.1 Severity Classification

| Severity | Criteria | Response Time | Escalation |
|----------|----------|---------------|------------|
| **SEV-1 (Critical)** | Active data breach; payment diversion; platform-wide outage | 15 min | CTO, Legal, CEO |
| **SEV-2 (High)** | Single user account compromise; payment webhook failure >1hr; RCE vuln | 1 hour | Engineering lead, Security |
| **SEV-3 (Medium)** | XSS in non-critical page; rate limit bypass; info disclosure (non-PII) | 4 hours | On-call engineer |
| **SEV-4 (Low)** | Security misconfiguration; missing header; dependency vuln (non-exploitable) | Next sprint | Backlog |

### 8.2 Incident Response Playbook

```
1. DETECT
   ├── Alert: Sentry, Grafana, Webhook DLQ, User report, Security scan
   └── Triage: Assign severity, incident commander, communication channel

2. CONTAIN
   ├── Revoke compromised credentials (rotate keys, invalidate sessions)
   ├── Block malicious IPs (Cloudflare WAF)
   ├── Disable affected features (feature flags)
   └── Preserve evidence (DB snapshots, logs, memory dumps)

3. ERADICATE
   ├── Root cause analysis (5 Whys)
   ├── Patch vulnerability (deploy fix)
   ├── Rotate all potentially exposed secrets
   └── Verify fix in staging

4. RECOVER
   ├── Gradual traffic restoration (canary)
   ├── Monitor for regression (enhanced alerting)
   ├── Notify affected users (template per regulation)
   └── Regulatory notification (GDPR 72hr, PCI, etc.)

5. POST-INCIDENT
   ├── Blameless postmortem (within 5 business days)
   ├── Action items with owners and due dates
   ├── Update threat model and runbooks
   └── Share learnings (internal + appropriate external)
```

---

## 9. Secure Development Lifecycle

### 9.1 Pre-Commit

| Check | Tool | Gate |
|-------|------|------|
| **Secrets scan** | `gitleaks` / `trufflehog` | Block commit |
| **Dependency audit** | `npm audit --audit-level=high` | Warn (block critical) |
| **SAST** | `eslint-plugin-security` / Semgrep | Block on high |
| **Type safety** | `tsc --noEmit` | Block on error |

### 9.2 CI/CD Pipeline

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  Code   │──▶│  Build  │──▶│  Test   │──▶│ Security│──▶│ Deploy  │
│  Push   │   │         │   │ (unit,  │   │  Scan   │   │ (staging)│
│         │   │         │   │  integ) │   │         │   │         │
└─────────┘   └─────────┘   └─────────┘   └────┬────┘   └────┬────┘
                                                │           │
                                         ┌──────┴──────┐    │
                                         ▼             ▼    ▼
                                  ┌──────────┐  ┌──────────┐
                                  │  SAST    │  │  DAST    │
                                  │ (Semgrep)│  │ (OWASP   │
                                  │          │  │  ZAP)    │
                                  └──────────┘  └──────────┘
```

### 9.3 Production Gates

- [ ] All CI checks passing
- [ ] Security scan: 0 critical, 0 high (or accepted risk documented)
- [ ] Dependency review: no new critical vulns
- [ ] Database migration reviewed (backward compatible)
- [ ] Feature flag default: OFF for risky changes
- [ ] Rollback plan documented and tested

### 9.4 Penetration Testing

| Frequency | Scope | Provider |
|-----------|-------|----------|
| **Annual** | Full application + infrastructure | Third-party (CREST certified) |
| **Per Major Release** | Changed attack surface only | Internal + automated |
| **Continuous** | Dependency scanning; bug bounty | GitHub Dependabot + HackerOne |

---

## 10. Compliance Mapping

| Requirement | Document Reference | Implementation Status |
|-------------|-------------------|----------------------|
| **PCI DSS SAQ A** | `PAYMENTS_AND_COMPLIANCE.md` §5 | Designed; validation pre-launch |
| **GDPR Art. 25 (Privacy by Design)** | This doc §7; `DATABASE_DESIGN.md` RLS | Architecture complete |
| **GDPR Art. 32 (Security of Processing)** | This doc §4, §5, §6 | Controls defined |
| **CCPA/CPRA** | This doc §7.1 | Requirements mapped |
| **PSD2/SCA** | `PAYMENTS_AND_COMPLIANCE.md` §6.1 | Provider responsibility |
| **OWASP ASVS L2** | This doc §4.1 | Target baseline |
| **SOX (Financial Controls)** | `DATABASE_DESIGN.md` §6 (ledger immutability) | Designed |
| **AML/KYC** | `PAYMENTS_AND_COMPLIANCE.md` §6.1, §7 | Provider + platform layers |

---

## 11. Cross-References

| Document | Related Content |
|----------|-----------------|
| `SYSTEM_ARCHITECTURE.md` | Network segmentation, deployment topology, observability |
| `DATABASE_DESIGN.md` | RLS policies, immutable ledger, encryption, enums |
| `PAYMENTS_AND_COMPLIANCE.md` | Payment flow, webhook security, fraud controls, fee model |
| `PRODUCT_REQUIREMENTS.md` | Non-functional security requirements (NFR-2.3) |
| `API_SPECIFICATION.md` | tRPC procedures with auth middleware, validation schemas |
| `IMPLEMENTATION_ROADMAP.md` | Security delivery phases |

---

## 12. Open Security Questions

| Question | Impact | Decision Needed |
|----------|--------|-----------------|
| **SEC-01** | Bug bounty program: launch timing, scope, rewards? | Post-MVP budget allocation |
| **SEC-02** | WAF rules: managed (Cloudflare OWASP) vs. custom? | False positive rate vs. coverage |
| **SEC-03** | Runtime application self-protection (RASP) needed? | Cost vs. detection capability |
| **SEC-04** | Encrypt deal communications (E2E) vs. platform access for disputes? | Privacy vs. dispute resolution |
| **SEC-05** | Hardware security module (HSM) for signing keys? | KMS vs. CloudHSM cost/benefit |
| **SEC-06** | Zero-trust network (service mesh) vs. current segmentation? | Complexity vs. lateral movement risk |
| **SEC-07** | Automated penetration testing in CI (e.g., StackHawk)? | Coverage vs. pipeline time |

---

*This threat model is a living document. Update with each architecture change, incident, and penetration test finding.*