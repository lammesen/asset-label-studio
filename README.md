# Asset Label Creation Studio

A multi-tenant asset management toolkit for delivery network equipment. Create, manage, and print asset labels with enterprise-grade security and extensibility.

## Features

- **Multi-Tenant Architecture**: Robust isolation using PostgreSQL Row Level Security (RLS).
- **Asset Management**: Comprehensive CRUD operations for networking, servers, cabling, power, physical, and IoT/Edge equipment.
- **Label Designer**: SVG-based design canvas for creating custom label templates with text, QR codes, and barcodes.
- **Advanced Printing System**:
  - **Tier-1**: Browser-based PDF generation and printing.
  - **Tier-2**: Local print agent connector for direct printer communication.
  - **Tier-3**: Future cloud print service integration.
- **Template System**: Versioned templates with category-specific presets and library management.
- **Import/Export**: Bulk data operations via CSV and Excel with field mapping.
- **Integrations & Webhooks**: Scoped API keys for public API access and real-time event notifications with SSRF protection.
- **Security & Audit**: Argon2id password hashing, JWT rotation, CSRF protection, rate limiting, and comprehensive audit logging.

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, [shadcn/ui](https://ui.shadcn.com/)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Auth**: JWT (Access + Refresh tokens) with HTTP-only cookies
- **Validation**: [Zod](https://zod.dev/)
- **PDF Generation**: [jsPDF](https://rawgit.com/MrRio/jsPDF/master/docs/index.html)
- **Codes**: qrcode, JsBarcode

## Prerequisites

- **Bun**: v1.1.0 or higher
- **PostgreSQL**: v14 or higher (required for RLS support)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/asset-label-studio.git
   cd asset-label-studio
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Update .env with your database credentials and secrets
   ```

4. Setup the database:
   ```bash
   bun run db:migrate
   bun run db:seed
   ```

## Available Scripts

- `bun dev`: Start development server with HMR.
- `bun start`: Run the production build.
- `bun run build.ts`: Build the application for production.
- `bun run db:migrate`: Apply database migrations.
- `bun run db:seed`: Seed the database with demo data.
- `bun run db:studio`: Launch Drizzle Studio for database exploration.
- `bun test`: Run the test suite.

## Project Structure

```
src/
├── api/             # API routes, middleware, and handlers
├── components/      # React components (UI, Auth, Assets, Labels)
├── db/              # Database schema, migrations, and seed scripts
├── hooks/           # Custom React hooks
├── lib/             # Shared utilities (auth, tenant context, permissions)
├── services/        # Business logic and service layer
├── types/           # TypeScript type definitions
└── index.ts         # Application entry point (Bun.serve)
```

## Security & Architecture

### Multi-Tenant Strategy
- Every request resolves a `{ tenantId, userId, permissions }` context.
- PostgreSQL RLS enforces isolation at the database level.
- `withTenant(tenantId)` pattern ensures all DB transactions are correctly scoped.

### Authentication & Authorization
- **JWT**: Short-lived access tokens (15m) and long-lived refresh tokens (7d).
- **Permissions**: Granular action-level permissions (e.g., `asset:write`, `print:execute`).
- **CSRF**: Origin and Referer validation for state-changing requests.
- **SSRF**: Comprehensive protection for webhook deliveries.

## API Overview

The application provides a comprehensive REST API:
- `POST /api/auth/*`: Authentication and session management.
- `GET/POST/PUT/DELETE /api/assets/*`: Asset CRUD and search.
- `GET/POST/PUT/DELETE /api/templates/*`: Label template management and versioning.
- `POST /api/print/*`: Print job creation, status tracking, and PDF rendering.
- `GET/POST /api/integrations/api-keys/*`: API key management.
- `GET/POST /api/webhooks/*`: Webhook subscriptions and delivery tracking.
- `POST /api/imports/*`: Bulk asset import from CSV/Excel.

## Label Formats Supported

| Format | Dimensions | Labels/Sheet |
|--------|------------|--------------|
| Avery 5160 | 66.7 × 25.4 mm | 30 |
| Avery 5161 | 101.6 × 25.4 mm | 20 |
| Avery 5163 | 101.6 × 50.8 mm | 10 |
| DYMO 30252 | 89 × 28 mm | 1 |
| Brother DK-2205| 62 × 30.48 mm | 1 |
| Custom | User-defined | 1 |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ACCESS_TOKEN_SECRET` | Secret for signing access tokens |
| `REFRESH_TOKEN_SECRET` | Secret for signing refresh tokens |
| `WEBHOOK_SECRET_KEY` | Key for encrypting webhook secrets |
| `APP_ORIGIN` | Allowed origin for CSRF protection |

## Development & Testing

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@demo.local` | `admin123!` |
| Manager | `manager@demo.local` | `manager123!` |
| User | `user@demo.local` | `user123!` |

**Tenant Slug**: `demo`

## License

Copyright © 2025. All rights reserved.
