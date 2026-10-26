# Escrow Pigeon

A centralized escrow platform for secure peer-to-peer service transactions. Built for freelancers, agencies, and clients who need trusted payments without the complexity of crypto.

## Overview

Escrow Pigeon provides a managed escrow service where funds are held by the platform (via Stripe Connect) until both parties confirm delivery and acceptance. Unlike decentralized alternatives, we handle identity verification, dispute resolution, compliance, and payouts — so you can focus on the work.

**Key differentiator:** Traditional escrow for digital services, not crypto. SAQ A PCI compliance. No wallet required.

## Features

- **Managed Escrow**: Funds held in Stripe Connect; released on mutual acceptance or dispute resolution
- **Identity Verification**: Progressive tiers (Basic → Verified → Business) with Stripe Identity
- **Dispute Resolution**: Structured evidence submission, platform review, chargeback representation
- **Multi-currency**: USD, EUR, GBP at launch; seller chooses settlement currency
- **Marketplace**: Service listings with search, categories, reviews, and seller analytics
- **Compliance-ready**: PCI SAQ A, GDPR, CCPA; agent-of-payee MTL model via Stripe

## Tech Stack

| Layer | Technology |
|-------|------------|
| **API** | Fastify + tRPC (TypeScript-first RPC) |
| **Frontend** | React 18 + Vite + TanStack Query + Tailwind CSS |
| **Database** | PostgreSQL 16 + Prisma ORM |
| **Auth** | Lucia Auth (session cookies, Argon2, MFA) |
| **Payments** | Stripe Connect (Express + Standard) |
| **Queue** | BullMQ (Redis) |
| **Storage** | S3-compatible (MinIO dev, AWS S3 prod) |
| **Infra** | Fly.io (primary), Docker Compose (local) |
| **Observability** | Sentry + OpenTelemetry + PostHog |

## Documentation

| # | Document | Description |
|---|----------|-------------|
| 1 | [Product Vision](docs/PRODUCT_VISION.md) | Positioning, business model, success metrics, competitive landscape |
| 2 | [Product Requirements](docs/PRODUCT_REQUIREMENTS.md) | Functional/non-functional requirements, user stories, state machines |
| 3 | [UX & Information Architecture](docs/UX_AND_INFORMATION_ARCHITECTURE.md) | Sitemap, user journeys, screen specs, design system foundations |
| 4 | [System Architecture](docs/SYSTEM_ARCHITECTURE.md) | Module boundaries, deployment topology, observability, tech decisions |
| 5 | [Database Design](docs/DATABASE_DESIGN.md) | Schema, RLS policies, invariants, migrations strategy |
| 6 | [Payments & Compliance](docs/PAYMENTS_AND_COMPLIANCE.md) | Stripe Connect flow, fee model, webhooks, fraud controls, regulatory matrix |
| 7 | [Security & Threat Model](docs/SECURITY_AND_THREAT_MODEL.md) | STRIDE threat model, security controls, fraud prevention, incident response |
| 8 | [API Specification](docs/API_SPECIFICATION.md) | tRPC procedures, input/output schemas, auth middleware, error codes |
| 9 | [Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md) | Phased delivery plan (5 phases), milestones, risk register, team structure |
| 10 | [Open Questions & Decisions](docs/OPEN_QUESTIONS_AND_DECISIONS.md) | 50+ tracked decisions across tech, legal, payments, fees, MVP scope |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+ (recommended) or npm
- Docker & Docker Compose (for local Postgres, Redis, MinIO)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/escrow-pigeon.git
cd escrow-pigeon

# Install dependencies
pnpm install

# Start local infrastructure (Postgres, Redis, MinIO)
docker compose up -d

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration (Stripe keys, database URL, etc.)

# Run database migrations
pnpm prisma migrate dev

# Run development servers (API + Frontend)
pnpm dev
```

## Project Structure

```
escrow-pigeon/
├── apps/
│   ├── api/              # Fastify + tRPC backend
│   └── web/              # React + Vite frontend
├── packages/
│   ├── shared/           # Shared types, Zod schemas, utilities
│   ├── ui/               # Shared React component library
│   └── config/           # Shared ESLint, TypeScript, Tailwind config
├── prisma/               # Database schema & migrations
├── docs/                 # Documentation (see index above)
└── tools/                # Build scripts, generators, CI helpers
```

## Development Workflow

1. **Plan first** — Use the planner agent for complex features
2. **TDD mandatory** — Write tests first (80%+ coverage target)
3. **Code review** — Every PR reviewed; security-reviewer for auth/payments/admin
4. **Conventional commits** — `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
5. **Documentation updates** — Keep specs in sync with implementation

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

If you discover a security vulnerability, please report it responsibly by emailing security@escrowpigeon.com

## Links

- [Documentation](https://docs.escrowpigeon.com) (planned)
- [Discord Community](https://discord.gg/escrowpigeon) (planned)
- [Twitter](https://twitter.com/escrowpigeon) (planned)