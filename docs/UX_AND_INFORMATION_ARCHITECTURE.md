# Escrow Pigeon — UX & Information Architecture

**Version:** 0.1 (Draft)  
**Status:** Planning Phase  
**Last Updated:** 2026-10-26

---

## 1. Information Architecture

### 1.1 Sitemap

```
Escrow Pigeon
├── Public (Unauthenticated)
│   ├── /                          # Landing page
│   ├── /marketplace               # Browse listings (search, filter, categories)
│   ├── /marketplace/[category]    # Category landing pages
│   ├── /marketplace/[id]          # Listing detail page
│   ├── /deal/[dealId]             # Public deal invitation (signup/login flow)
│   ├── /pricing                   # Fee transparency page
│   ├── /how-it-works              # Educational content
│   ├── /trust-safety              # Protection explainer, dispute process
│   ├── /legal/terms               # Terms of Service
│   ├── /legal/privacy             # Privacy Policy
│   ├── /legal/acceptable-use      # Acceptable Use Policy
│   ├── /login                     # Authentication
│   ├── /register                  # Registration
│   ├── /forgot-password           # Password reset
│   └── /verify-email              # Email verification
│
├── Authenticated — Buyer & Seller (Shared)
│   ├── /dashboard                 # Unified dashboard (role-aware)
│   │   ├── /deals                 # Active deals (tabs: Buying, Selling)
│   │   ├── /deals/[dealId]        # Deal room (core transaction workspace)
│   │   │   ├── /evidence          # Evidence upload/view
│   │   │   ├── /timeline          # Immutable event log
│   │   │   ├── /payment           # Payment status & actions
│   │   │   └── /dispute           # Dispute initiation & management
│   │   ├── /history               # Completed/cancelled deals
│   │   ├── /notifications         # Notification center
│   │   ├── /settings
│   │   │   ├── /profile           # Profile, avatar, display name
│   │   │   ├── /security          # MFA, sessions, password
│   │   │   ├── /notifications     # Email/push preferences
│   │   │   ├── /verification      # KYC/KYB progress
│   │   │   └── /preferences       # Currency, language, timezone
│   │   └── /help                  # Contextual help, contact support
│
├── Authenticated — Seller Specific
│   ├── /seller/listings           # My listings (CRUD, drafts, archived)
│   ├── /seller/listings/new       # Create listing wizard
│   ├── /seller/listings/[id]      # Edit listing
│   ├── /seller/payouts            # Payout history, schedule, methods
│   ├── /seller/analytics          # Revenue, conversion, listing performance
│   └── /seller/verification       # Verification upgrade flow
│
├── Authenticated — Buyer Specific
│   ├── /buyer/purchases           # Purchase history with protection status
│   └── /buyer/saved               # Saved listings, searches
│
└── Admin (Role-gated)
    ├── /admin                     # Admin dashboard
    ├── /admin/users               # User management, verification review
    ├── /admin/listings            # Listing moderation queue
    ├── /admin/disputes            # Dispute review & decision interface
    ├── /admin/finance             # Refund/payout authorization, fee rules
    ├── /admin/analytics           # Operational dashboards
    ├── /admin/settings            # Platform configuration
    └── /admin/audit               # Immutable audit log viewer
```

### 1.2 Navigation Principles

| Principle | Implementation |
|---|---|
| **Role-aware, not role-segregated** | Shared deal room for buyers/sellers; contextual tabs |
| **Progressive disclosure** | Core actions primary; advanced settings secondary |
| **Persistent deal context** | Deal ID in URL breadcrumb; quick-switch between deals |
| **Status visibility** | Deal state badges everywhere (color + icon + text) |

---

## 2. User Journeys

### 2.1 External Deal — Happy Path (Buyer Initiates)

```
1. User lands on /deal/new (or clicks "Create Deal" from dashboard)
2. Guided form: Item/Service → Amount/Currency → Deliverables → Milestones → Acceptance Criteria → Deadlines
3. Review summary → "Create & Share"
4. System generates: dealId, invitation link (expires 72h default, configurable)
5. User shares link via Telegram/Discord/Email/Clipboard
6. Counterparty clicks link:
   a. Unregistered → /register?deal=[dealId] → email verify → lands in deal room
   b. Registered → /login?next=/deal/[dealId] → lands in deal room
7. Deal room shows: terms, "Accept Agreement" button (disabled until both accept)
8. Both parties accept → Agreement version locked (SHA-256 hash recorded)
9. Buyer sees "Pay Now" (seller sees "Awaiting Payment")
10. Buyer pays via payment provider checkout (redirect or embedded)
11. Webhook: payment.authorized → deal: PAYMENT_AUTHORIZED
12. Seller delivers → uploads evidence (files, links, text)
13. Buyer reviews → "Accept Delivery" or "Open Dispute"
14. On acceptance: platform calls provider release → RELEASED → SETTLED → COMPLETED
15. Both parties prompted for review (optional)
16. Deal moves to /history with COMPLETED badge
```

**Key screens:** Deal Creation Wizard → Invitation Share Modal → Deal Room (Acceptance) → Payment Checkout → Deal Room (Delivery) → Deal Room (Acceptance/Dispute) → Completion Screen

### 2.2 External Deal — Seller Initiates

Same as above, but:
- Seller creates deal with terms favorable to them
- Buyer receives invitation, reviews terms, accepts
- Payment initiation still buyer's action (BR-01)

### 2.3 Marketplace Purchase

```
1. Buyer browses /marketplace → filters → finds listing
2. Listing detail: seller verification badge, reviews, protection terms, "Start Protected Deal"
3. Click → pre-fills deal creation with listing data (price, deliverables from listing)
4. Buyer adjusts milestones if needed → creates deal → invitation sent to seller
5. Seller receives notification → accepts → continues as external deal happy path
```

### 2.4 Dispute Flow

```
1. Buyer clicks "Open Dispute" in deal room (within 7-day window)
2. Structured form: Reason category → Description → Evidence upload
3. Submitted → Deal state: DISPUTED, Seller notified
4. Seller has 7 days to submit counter-evidence
5. Admin/Reviewer assigned (auto or manual)
6. Reviewer views anonymized evidence → Decision form:
   - Full release to seller
   - Partial release (slider % + rationale)
   - Full refund to buyer
   - No action (extend evidence period)
7. Decision recorded with rationale → Both parties notified
8. 7-day appeal window → Senior reviewer if appealed
9. Final → Funds moved per decision → Deal COMPLETED/REFUNDED
```

### 2.5 Seller Onboarding & Verification

```
1. Seller clicks "Start Selling" → /seller/onboarding
2. Tier 1 (Basic): Email verify → can list, low limits ($500/deal, $2000/mo)
3. Tier 2 (Verified): Government ID + selfie + address → higher limits ($10k/deal)
4. Tier 3 (Business): Business registration, tax ID, beneficial owners → highest limits
5. Each tier: Review queue → Approve/Reject/Request more → Notification
6. Verification badge displayed on profile & listings
```

---

## 3. Screen Specifications

### 3.1 Deal Creation Wizard (`/deal/new`)

| Step | Fields | Validation | Notes |
|---|---|---|---|
| **1. Basics** | Title (max 100), Description (max 5000), Category (select), Type (Service/Asset) | Required; category from taxonomy | Type affects later fields |
| **2. Financial** | Amount, Currency (USD/EUR/GBP), Fee payer (Buyer/Seller/Split) | Min $10, max per tier; currency from enabled list | Fee preview shown |
| **3. Deliverables** | Dynamic list: Name, Description, File types accepted, Deadline (per item) | At least 1; deadlines > now | Milestone toggle adds amount per item |
| **4. Milestones** (optional) | Per milestone: Amount, Deliverables subset, Deadline | Sum = total amount; sequential deadlines | Independent acceptance per milestone |
| **5. Acceptance** | Auto-accept after N days (1-30), Evidence requirements checklist | Default 7 days | Buyer can disable auto-accept |
| **6. Invitation** | Expiry (1h-30d), Message (optional, max 500), Share targets (clipboard, email, QR) | Expiry > now | Link preview generated |
| **7. Review** | Full summary, editable per section | All required complete | "Create & Share" → generates deal |

**States:** Draft (auto-saved) → Review → Created

### 3.2 Deal Room (`/deals/[dealId]`)

**Layout:** Three-column responsive (collapsible on mobile)

| Panel | Content | Actions |
|---|---|---|
| **Left: Context** | Deal header (title, ID, amount, currency, state badge), Counterparty info (name, verification, joined), Agreement version & hash, Key dates | "View Agreement", "Download PDF" |
| **Center: Timeline** | Immutable event log (chronological): Created, Invited, Accepted (buyer/seller), Payment authorized, Delivered, Accepted/Disputed, Resolved, Released/Refunded, Completed | Expandable entries; evidence thumbnails; filter by type |
| **Right: Actions** | State-dependent primary CTA + secondary actions | See state matrix below |

**Deal Room Action Matrix:**

| Deal State | Buyer Primary | Buyer Secondary | Seller Primary | Seller Secondary |
|---|---|---|---|---|
| INVITED | Accept Agreement | Decline, Message | Accept Agreement | Decline, Message |
| ACCEPTED (both) | Pay Now | Cancel | Await Payment | Cancel |
| PAYMENT_AUTHORIZED | Await Delivery | Open Dispute (early) | Deliver Work | Message |
| DELIVERED | Accept / Dispute | Request Revision | Await Acceptance | Message |
| DISPUTED | Submit Evidence | View Evidence | Submit Evidence | View Evidence |
| RESOLVED | View Decision | Appeal (if eligible) | View Decision | Appeal (if eligible) |
| COMPLETED | Leave Review | Download Receipt | Leave Review | Download Receipt |

### 3.3 Listing Detail (`/marketplace/[id]`)

| Section | Content |
|---|---|
| **Hero** | Media gallery (images/video), Title, Price, Currency, Category badge, Seller verification badge |
| **Protection Banner** | "Protected by Escrow Pigeon" → links to /trust-safety |
| **Description** | Rich text, deliverables list, delivery timeline, revisions included |
| **Seller Card** | Avatar, name, verification tier, rating, review count, response time, joined date |
| **Reviews** | Verified reviews only (from completed protected deals), filter by rating |
| **CTA** | "Start Protected Deal" (primary), "Save", "Share", "Report" |
| **Sidebar** | Price breakdown (fee estimate), Delivery guarantee, Refund policy, Seller's other listings |

### 3.4 Seller Listing Creator (`/seller/listings/new`)

Wizard steps mirror deal creation but for listing template:
1. **Category & Type** → 2. **Title & Description** → 3. **Media** (drag-drop, max 10, 10MB each) → 4. **Pricing** (fixed or tiered packages) → 5. **Delivery Terms** (timeline, revisions, file formats) → 6. **Requirements** (what buyer provides) → 7. **Review & Publish**

### 3.5 Admin Dispute Review (`/admin/disputes/[id]`)

| Panel | Content |
|---|---|
| **Header** | Deal ID, Parties (anonymized), Amount, State, SLA timer |
| **Evidence Viewer** | Side-by-side: Buyer evidence \| Seller evidence; each with timestamps, file preview, download |
| **Communication Log** | Filtered to deal-relevant messages |
| **Decision Form** | Radio: Full Release / Partial (slider %) / Full Refund / No Action; Required rationale (min 50 chars); Precedent references |
| **History** | Previous decisions, appeals, reviewer notes |

---

## 4. Design System Foundations

### 4.1 Color System

**Semantic Tokens (Light / Dark):**

| Token | Light | Dark | Usage |
|---|---|---|---|
| `color.bg.primary` | `#FAFAFA` | `#0A0A0F` | Page background |
| `color.bg.secondary` | `#FFFFFF` | `#14141E` | Cards, panels |
| `color.bg.tertiary` | `#F0F0F5` | `#1E1E2E` | Hover, subtle separation |
| `color.border.subtle` | `#E0E0E8` | `#2A2A3A` | Dividers, inputs |
| `color.border.strong` | `#C0C0CC` | `#3A3A4A` | Focus rings, active borders |
| `color.text.primary` | `#0F0F14` | `#F0F0F5` | Headlines, body |
| `color.text.secondary` | `#4A4A5A` | `#A0A0B0` | Metadata, hints |
| `color.text.inverse` | `#FFFFFF` | `#0A0A0F` | On primary actions |
| `color.brand.primary` | `#2563EB` | `#3B82F6` | Primary actions, links |
| `color.brand.hover` | `#1D4ED8` | `#60A5FA` | Hover states |
| `color.success` | `#059669` | `#10B981` | Completed, accepted, positive |
| `color.warning` | `#D97706` | `#F59E0B` | Pending, attention needed |
| `color.danger` | `#DC2626` | `#EF4444` | Disputes, errors, destructive |
| `color.info` | `#0284C7` | `#38BDF8` | Neutral information |

**State Badge Colors:**
- DRAFT: `text.secondary` / `bg.tertiary`
- INVITED: `info` / `bg.info-subtle`
- PAYMENT_PENDING: `warning` / `bg.warning-subtle`
- IN_PROGRESS: `brand.primary` / `bg.brand-subtle`
- DELIVERED: `info` / `bg.info-subtle`
- DISPUTED: `danger` / `bg.danger-subtle`
- COMPLETED: `success` / `bg.success-subtle`
- REFUNDED: `text.secondary` / `bg.tertiary`
- CANCELLED: `text.secondary` / `bg.tertiary`
- EXPIRED: `text.secondary` / `bg.tertiary`

### 4.2 Typography

| Token | Value | Usage |
|---|---|---|
| `font.family.sans` | `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` | UI, body |
| `font.family.display` | `'Inter Tight', 'Inter', system-ui, sans-serif` | Headlines, hero |
| `font.family.mono` | `'JetBrains Mono', 'Fira Code', monospace` | Deal IDs, code, amounts |
| `font.size.xs` | `0.75rem` (12px) | Labels, timestamps |
| `font.size.sm` | `0.875rem` (14px) | Body small, secondary |
| `font.size.base` | `1rem` (16px) | Body, inputs |
| `font.size.lg` | `1.125rem` (18px) | Body large, emphasis |
| `font.size.xl` | `1.25rem` (20px) | Subheadings |
| `font.size.2xl` | `1.5rem` (24px) | Section headings |
| `font.size.3xl` | `2rem` (32px) | Page titles |
| `font.size.4xl` | `2.5rem` (40px) | Hero headlines |
| `font.weight.normal` | `400` | Body |
| `font.weight.medium` | `500` | Emphasis, labels |
| `font.weight.semibold` | `600` | Headings, buttons |
| `font.weight.bold` | `700` | Hero, critical numbers |
| `lineHeight.tight` | `1.1` | Headlines |
| `lineHeight.normal` | `1.5` | Body |
| `lineHeight.relaxed` | `1.625` | Long-form content |

### 4.3 Spacing & Layout

| Token | Value | Usage |
|---|---|---|
| `space.0` | `0` | Reset |
| `space.1` | `0.25rem` (4px) | Micro gaps |
| `space.2` | `0.5rem` (8px) | Compact gaps |
| `space.3` | `0.75rem` (12px) | Standard gaps |
| `space.4` | `1rem` (16px) | Component padding |
| `space.5` | `1.25rem` (20px) | Section padding |
| `space.6` | `1.5rem` (24px) | Card padding |
| `space.8` | `2rem` (32px) | Section gaps |
| `space.10` | `2.5rem` (40px) | Page section gaps |
| `space.12` | `3rem` (48px) | Major section gaps |
| `radius.sm` | `0.25rem` (4px) | Inputs, badges |
| `radius.md` | `0.5rem` (8px) | Cards, buttons |
| `radius.lg` | `0.75rem` (12px) | Modals, panels |
| `radius.xl` | `1rem` (16px) | Hero cards |
| `radius.full` | `9999px` | Pills, avatars |

**Container widths:** `max-w-screen-sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px), `2xl` (1536px)

### 4.4 Component Primitives

| Component | Variants | States | Notes |
|---|---|---|---|
| **Button** | Primary, Secondary, Ghost, Danger, Link | Default, Hover, Active, Disabled, Loading | `aria-busy` on loading |
| **Input** | Text, Textarea, Select, Number, Currency | Default, Focus, Error, Disabled, ReadOnly | Label + hint + error slot |
| **Badge** | Neutral, Brand, Success, Warning, Danger, Info | Default, Dot indicator | Size: sm, md |
| **Card** | Elevated, Outlined, Filled | Default, Hover (interactive) | Consistent padding |
| **Avatar** | Image, Initials, Fallback | Sizes: xs(24), sm(32), md(40), lg(56), xl(80) | Verification badge overlay |
| **Dropdown/Menu** | Single, Multi, Nested | Open, Closed, Loading | Portal rendering |
| **Tabs** | Horizontal, Vertical | Active, Disabled | Keyboard navigation |
| **Modal** | Default, Fullscreen, Drawer | Open, Closing | Focus trap, ESC close |
| **Toast** | Success, Error, Warning, Info | Visible, Dismissing | Auto-dismiss (5s default) |
| **Table** | Striped, Bordered, Hover | Sortable, Selectable | Virtualized for large data |
| **Timeline** | Default, Compact | Interactive entries | Expandable details |

---

## 5. Responsive Breakpoints

| Breakpoint | Width | Target Devices | Layout Adjustments |
|---|---|---|---|
| `mobile` | < 640px | Phones | Single column; bottom nav; drawers for panels |
| `tablet` | 640–1023px | Tablets, small laptops | Two-column deal room; collapsible sidebar |
| `desktop` | 1024–1535px | Laptops, monitors | Three-column deal room; persistent sidebar |
| `wide` | ≥ 1536px | Large monitors | Max-width containers; generous whitespace |

---

## 6. Accessibility (WCAG 2.2 AA)

### 6.1 Checklist per Screen

| Requirement | Implementation |
|---|---|
| **Keyboard navigation** | All interactive elements reachable; focus visible (`outline: 2px solid color.brand.primary`); skip links |
| **Screen readers** | Semantic HTML5 (`main`, `nav`, `section`, `article`); ARIA labels on icon buttons; live regions for status changes |
| **Color contrast** | 4.5:1 text, 3:1 UI components; verified in both themes |
| **Focus management** | Modals trap focus; return focus on close; toast announces |
| **Form labels** | Explicit `<label for>`; required indicator; error linked via `aria-describedby` |
| **Motion** | `prefers-reduced-motion` respected; animations < 200ms or disabled |
| **Touch targets** | Minimum 44×44px; 8px gap between adjacent targets |
| **Language** | `lang` attribute; direction support for RTL |
| **Zoom** | Content reflows at 200% zoom; no horizontal scroll |

### 6.2 Deal Room Specific

- Status changes announced via `aria-live="polite"`
- Timeline entries: `article` with `aria-labelledby` on timestamp
- Evidence viewer: keyboard-navigable gallery; alt text required on upload
- Payment amounts: `role="status"` with currency announced

---

## 7. Empty States & Error Handling

### 7.1 Empty State Pattern

```
┌─────────────────────────────────────┐
│   [Illustration / Icon]             │
│   Title: "No deals yet"             │
│   Description: "Create your first   │
│   protected deal or browse the      │
│   marketplace to get started."      │
│   [Primary CTA] "Create Deal"       │
│   [Secondary] "Browse Marketplace"  │
└─────────────────────────────────────┘
```

### 7.2 Error State Pattern

| Error Type | User Message | Action |
|---|---|---|
| Network | "Connection lost. Retrying..." | Auto-retry with exponential backoff |
| Validation | Inline field errors + toast summary | Focus first error |
| Authorization | "You don't have permission" | Link to verification/upgrade |
| Not Found | "Deal not found" | Link to dashboard |
| Provider Error | "Payment unavailable. Try again." | Retry, contact support if persistent |

---

## 8. Internationalization Readiness

### 8.1 Text Externalization

- All user-facing strings in `messages/[locale].json`
- ICU MessageFormat for plurals, dates, numbers, currencies
- No string concatenation for sentences

### 8.2 Locale-Specific Formatting

| Element | Implementation |
|---|---|
| **Currency** | `Intl.NumberFormat(locale, { style: 'currency', currency })` |
| **Dates** | `Intl.DateTimeFormat(locale, { dateStyle: 'medium' })` |
| **Numbers** | `Intl.NumberFormat(locale)` |
| **Relative time** | `Intl.RelativeTimeFormat(locale)` |
| **Lists** | `Intl.ListFormat(locale)` |

### 8.3 RTL Support

- CSS logical properties (`margin-inline-start`, `padding-inline-end`)
- Flex/Grid with `direction: rtl` on `[dir="rtl"]`
- Icon mirroring via `transform: scaleX(-1)` on directional icons
- Timeline: chronological order preserved (not mirrored)

---

## 9. Cross-References

| Document | Related Content |
|---|---|
| `PRODUCT_VISION.md` | Brand attributes, visual direction |
| `PRODUCT_REQUIREMENTS.md` | Functional requirements mapping to screens |
| `SYSTEM_ARCHITECTURE.md` | Frontend tech stack, state management |
| `API_SPECIFICATION.md` | Endpoints powering each screen |
| `IMPLEMENTATION_ROADMAP.md` | UI delivery phases |

---

## 10. Open UX Questions

| Question | Impact | Decision Needed |
|---|---|---|
| **UX-01** | Embedded checkout vs. redirect for payment? | Conversion vs. PCI scope |
| **UX-02** | Real-time presence indicators in deal room? | WebSocket infrastructure |
| **UX-03** | AI-assisted dispute evidence summarization? | Phase 2+ feature |
| **UX-04** | Mobile app vs. PWA for Phase 1? | Development velocity vs. native feel |
| **UX-05** | Dark mode default or system-follow? | Brand consistency |

---

*This document evolves with design iterations. Screen specs are implementation targets, not final designs.*