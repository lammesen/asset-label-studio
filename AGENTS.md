# AGENTS.md

## Project: Asset Label Creation Studio

A multi-tenant asset management toolkit for delivery network equipment. Create, manage, and print asset labels with enterprise-grade security and extensibility.

---

## Commands (run from `my-app/`)
- **Dev**: `bun --hot src/index.ts`
- **Build**: `bun run build.ts`
- **Test**: `bun test` | Single: `bun test path/to/file.test.ts`
- **Install**: `bun install` (not npm/yarn/pnpm)
- **DB Migrate**: `bun run db:migrate`
- **DB Seed**: `bun run db:seed`

---

## Tech Stack
- **Runtime**: Bun
- **Frontend**: React 19 + TypeScript (strict) + Tailwind v4 + shadcn/ui (new-york style)
- **Database**: PostgreSQL with Row Level Security (RLS), SQLite for dev only
- **ORM**: Drizzle ORM
- **Auth**: Short-lived access + refresh tokens (HTTP-only cookies)
- **Validation**: Zod
- **Forms**: react-hook-form
- **PDF**: jsPDF
- **QR/Barcode**: qrcode, JsBarcode

---

## Architecture

### Domain Boundaries
```
Identity/Tenancy → Assets → Templates/Designer → Print Jobs → Integrations/Audit
```

### Multi-Tenant Strategy
- PostgreSQL Row Level Security (RLS) enforces tenant isolation
- Every request resolves `{ tenantId, userId, permissions }` context
- All DB access wrapped in `withTenant(tenantId)` pattern
- Automated cross-tenant leakage tests required

### Label Pipeline
```
LabelSpec (JSON) → Layout Engine (mm/inch + DPI) → Renderer (PDF/SVG) → Delivery (print)
```

### Print Tiers
1. **Tier-1**: PDF generation + browser print (core)
2. **Tier-2**: Local print agent connector (optional)
3. **Tier-3**: Cloud print service (future)

---

## Directory Structure
```
src/
├── api/                    # API routes and handlers
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── assets.ts
│   │   ├── templates.ts
│   │   └── print.ts
│   └── middleware/
│       ├── auth.ts
│       ├── tenant.ts
│       └── permissions.ts
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── auth/               # Authentication components
│   │   ├── login-form.tsx
│   │   ├── user-dashboard.tsx
│   │   └── user-management.tsx
│   ├── assets/             # Asset management
│   │   ├── asset-form.tsx
│   │   ├── asset-list.tsx
│   │   └── asset-search.tsx
│   ├── labels/             # Label designer
│   │   ├── label-designer.tsx
│   │   ├── label-preview.tsx
│   │   ├── field-editor.tsx
│   │   └── print-dialog.tsx
│   └── templates/          # Template management
│       ├── template-editor.tsx
│       ├── template-library.tsx
│       └── category-templates/
├── db/                     # Database layer
│   ├── schema.ts           # Drizzle schema
│   ├── migrations/
│   └── seed.ts
├── lib/                    # Shared utilities
│   ├── utils.ts
│   ├── auth.ts
│   ├── tenant.ts
│   └── permissions.ts
├── types/                  # TypeScript definitions
│   ├── asset.ts
│   ├── label-spec.ts
│   ├── template.ts
│   └── user.ts
├── services/               # Business logic
│   ├── asset-service.ts
│   ├── template-service.ts
│   ├── print-service.ts
│   └── label-renderer.ts
└── hooks/                  # React hooks
    ├── use-auth.ts
    ├── use-tenant.ts
    └── use-assets.ts
```

---

## Code Style

### Imports
Use `@/` alias. Group: external libs → `@/` paths → relative.
```typescript
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import type { Asset } from "@/types/asset";

import { AssetRow } from "./asset-row";
```

### Types
- Strict mode. No `any`, `@ts-ignore`, or type assertions.
- Use `type` imports for types only.
- Define types in `src/types/` directory.

### Components
- Function declarations: `function Foo() {}`
- Use `cn()` from `@/lib/utils` for class merging.
- Tailwind classes only. Use `cva` for variants.

### Naming
- PascalCase: Components, Types, Interfaces
- camelCase: functions, variables, hooks
- kebab-case: file names, CSS classes
- SCREAMING_SNAKE: constants, env vars

### Server
- Use `Bun.serve()` with routes object.
- Use `Response.json()` for API responses.
- Always include tenant context in API handlers.

---

## Core Types

### LabelSpec (Single Source of Truth)
```typescript
interface LabelSpec {
  id: string;
  version: string;
  dimensions: { width: number; height: number; unit: "mm" | "in" };
  dpi: number;
  fields: LabelField[];
  elements: LabelElement[];
}

interface LabelField {
  id: string;
  type: "text" | "qrcode" | "barcode" | "image";
  source: string; // Asset field path
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: FieldStyle;
}
```

### Asset
```typescript
interface Asset {
  id: string;
  tenantId: string;
  category: EquipmentCategory;
  type: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  status: AssetStatus;
  assignedTo: string;
  purchaseDate: Date;
  warrantyExpiry: Date;
  customFields: Record<string, unknown>;
  schemaVersion: number;
  createdBy: string;
  createdAt: Date;
}

type EquipmentCategory =
  | "networking"    // Routers, Switches, Firewalls, Access Points
  | "servers"       // Rack servers, Blade servers, Storage
  | "cabling"       // Patch panels, Faceplates, Cable labels
  | "power"         // UPS, PDUs
  | "physical"      // Racks, Enclosures
  | "iot-edge";     // Gateways, Sensors, Controllers

type AssetStatus = "active" | "maintenance" | "retired" | "pending";
```

### Permissions
```typescript
type Permission =
  | "asset:read" | "asset:write" | "asset:delete"
  | "template:read" | "template:write" | "template:publish"
  | "print:execute" | "print:admin"
  | "user:manage" | "tenant:admin";

interface TenantContext {
  tenantId: string;
  userId: string;
  permissions: Permission[];
}
```

---

## Security Requirements

### Authentication
- Short-lived access tokens (15min) + refresh tokens (7d)
- HTTP-only, SameSite cookies (no localStorage for tokens)
- Argon2id for password hashing
- Token rotation on refresh

### Authorization
- Permission checks at resource/action level, always tenant-scoped
- Use `requirePermission()` middleware on all protected routes
- Never trust client-side role checks alone

### Tenant Isolation
- RLS policies on all tenant-scoped tables
- `SET LOCAL app.current_tenant_id` in transactions
- Automated cross-tenant access tests

### Audit Logging
- Log all: login, logout, role changes, asset CRUD, prints, exports
- Include: userId, tenantId, action, resourceId, timestamp, IP

### Input Validation
- Zod schemas at API boundary
- Rate limiting on auth endpoints
- CSRF protection for cookie-based auth

---

## Database Patterns

### Tenant-Scoped Queries
```typescript
// Always use withTenant wrapper
const assets = await withTenant(ctx.tenantId, async (tx) => {
  return tx.select().from(assetsTable).where(eq(assetsTable.status, "active"));
});
```

### Indexes (Required)
- `(tenant_id, created_at)` on all tenant tables
- `(tenant_id, serial_number)` on assets
- GIN index on `custom_fields` JSONB

### Schema Versioning
- Never mutate published templates in place
- Create new versions; keep old versions functional
- Track `schema_version` on assets for migration

---

## Print System

### Label Formats Supported
- **Avery**: 5160, 5161, 5162, 5163, 5164, 8660
- **DYMO**: LabelWriter 450, 4XL
- **Brother**: QL series, P-touch
- **Zebra**: Industrial (ZPL via Tier-2)
- **Custom**: User-defined dimensions

### Rendering Pipeline
```typescript
async function renderLabel(spec: LabelSpec, asset: Asset): Promise<Buffer> {
  const layout = layoutEngine.process(spec);
  const pdf = await pdfRenderer.render(layout, asset);
  return pdf;
}
```

### Caching
Cache rendered outputs by: `(templateVersion, assetId, locale, dpi)`

---

## Testing

### Required Test Types
- Unit tests for services and utilities
- Integration tests for API routes
- Cross-tenant isolation tests (security critical)
- Print output validation tests

### Test Commands
```bash
bun test                           # All tests
bun test src/services/             # Service tests only
bun test --watch                   # Watch mode
```

---

## Bun-Specific

- Use `bun:test` for testing
- Use `Bun.file()` over `fs`
- Use `Bun.$` for shell commands
- Bun auto-loads `.env` - no dotenv needed
- HTML imports work directly with React/CSS/Tailwind

---

## Implementation Phases

### Phase 0: Enterprise Foundations
- [ ] PostgreSQL + Drizzle setup with RLS
- [ ] Tenant context middleware
- [ ] Auth with refresh tokens
- [ ] Permission system
- [ ] Audit logging

### Phase 1: Asset Management Core
- [ ] Asset CRUD operations
- [ ] Category system with schemas
- [ ] Asset search and filtering
- [ ] User dashboard

### Phase 2: Label Designer & Templates
- [ ] SVG-based design canvas
- [ ] LabelSpec generation
- [ ] Versioned template system
- [ ] Category-specific templates

### Phase 3: Print System
- [ ] PDF renderer (Tier-1)
- [ ] Print job queue
- [ ] Multi-format support
- [ ] Batch printing

### Phase 4: Advanced Features
- [ ] Local print agent (Tier-2)
- [ ] Import/export (CSV, Excel)
- [ ] API for integrations
- [ ] Webhooks
