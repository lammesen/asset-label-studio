# AGENTS.md - AI Agent Instructions

This document provides specialized technical context and rules for AI agents working on the Asset Label Creation Studio project.

## Development Environment & Tooling

- **Runtime**: ALWAYS use **Bun**. Never use Node.js, npm, yarn, or pnpm.
- **Commands**:
  - Dev: `bun --hot src/index.ts`
  - Build: `bun run build.ts`
  - Test: `bun test`
  - DB Migrate: `bun run db:migrate`
  - DB Seed: `bun run db:seed`
  - DB Studio: `bun run db:studio`
- **APIs**:
  - Use `Bun.serve()` for the server. Do not introduce Express.
  - Use `Bun.file()` for file operations instead of `node:fs`.
  - Use `Bun.sql` or `postgres` (via Drizzle) for database access.
  - Bun automatically loads `.env` files.

## Architecture & Code Style

### Multi-Tenancy & Security
- **RLS is Mandatory**: Every table must have Row Level Security enabled.
- **Tenant Isolation**: All database queries MUST use the `withTenant(tenantId, tx => ...)` wrapper from `src/lib/tenant.ts`.
- **Permissions**: Use `requirePermission(permission)` middleware for all protected routes.
- **Audit Logging**: Every state-changing action (C-U-D) MUST be logged via `AuditService`.
- **SSRF**: Use `validateUrlForFetch(url)` from `src/lib/ssrf.ts` before making external requests (webhooks).

### Code Style Guidelines
- **Imports**: Use `@/` alias for all internal paths.
  - Order: external libs → `@/` paths → relative paths.
- **Types**:
  - Strict mode enabled. No `any` or `@ts-ignore`.
  - Prefer `interface` for object shapes, `type` for unions/aliases.
  - Use `type` imports for types: `import type { Asset } from "@/types/asset"`.
- **Frontend**:
  - Function components only: `export function MyComponent() { ... }`.
  - Use `cn()` from `@/lib/utils` for class merging.
  - Tailwind CSS v4 for all styling.
- **Server**:
  - Routes are defined as an object passed to `Bun.serve({ routes: { ... } })`.
  - Use `Response.json()` for API responses.

## Core Types Reference

### LabelSpec
The source of truth for label design.
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
  source: string; // Path to asset field (e.g., "serialNumber", "customFields.ipAddress")
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: FieldStyle;
}
```

### Asset
```typescript
type EquipmentCategory = "networking" | "servers" | "cabling" | "power" | "physical" | "iot-edge";

interface Asset {
  id: string;
  tenantId: string;
  category: EquipmentCategory;
  customFields: Record<string, unknown>;
  // ... core fields (serialNumber, manufacturer, etc.)
}
```

## Implementation Phases

### Phase 0-4: Completed
- [x] RLS & Tenant Isolation
- [x] Auth with Refresh Token Rotation
- [x] Label Designer (SVG)
- [x] PDF Renderer (Tier-1)
- [x] API Keys & Webhooks
- [x] CSRF & SSRF Hardening
- [x] Import/Export (CSV/Excel)

### Current Priorities
- **Phase 5 (Next)**: Local Print Agent (Tier-2) WebSocket connector.
- **Usability**: Designer improvements (Undo/Redo, resize handles, snap-to-grid).
- **Optimization**: Component decomposition for `label-designer.tsx`.

## Testing Rules
- Use `bun:test` for all tests.
- Cross-tenant isolation tests are critical. Always verify that a user in Tenant A cannot see or modify data in Tenant B.
- Use `bun test --watch` during development.
