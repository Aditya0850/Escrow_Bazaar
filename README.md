# Escrow Bazaar

A decentralized escrow marketplace platform for secure peer-to-peer transactions.

## Overview

Escrow Bazaar provides a trustless escrow service that enables buyers and sellers to conduct secure transactions without requiring a centralized intermediary. Built with smart contracts and modern web technologies.

## Features

- **Secure Escrow**: Funds held in smart contracts until both parties confirm satisfaction
- **Decentralized**: No single point of failure or control
- **Dispute Resolution**: Built-in arbitration mechanism for conflict resolution
- **Multi-chain Support**: Compatible with multiple blockchain networks
- **User-Friendly Interface**: Clean, intuitive UI for managing transactions

## Tech Stack

- **Frontend**: React/Next.js with TypeScript
- **Smart Contracts**: Solidity (EVM-compatible chains)
- **Backend**: Node.js/Express API
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Web3 wallet integration (MetaMask, WalletConnect)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/Escrow_Bazaar.git
cd Escrow_Bazaar

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run development server
pnpm dev
```

## Project Structure

```
escrow-bazaar/
├── contracts/          # Smart contracts
├── frontend/           # Next.js frontend application
├── backend/            # Node.js API server
├── shared/             # Shared types and utilities
└── docs/               # Documentation
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

If you discover a security vulnerability, please report it responsibly by emailing security@escrowbazaar.com

## Links

- [Documentation](https://docs.escrowbazaar.com)
- [Discord Community](https://discord.gg/escrowbazaar)
- [Twitter](https://twitter.com/escrowbazaar)