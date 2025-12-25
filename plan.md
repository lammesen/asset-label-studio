# Asset Label Creation Studio - Implementation Plan

## Project Overview

A multi-tenant asset management toolkit for delivery network equipment. Create, manage, and print asset labels with enterprise-grade security and extensibility.

### Technology Stack
- **Runtime**: Bun
- **Frontend**: React 19 + TypeScript (strict) + Tailwind v4 + shadcn/ui (new-york style)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **ORM**: Drizzle ORM
- **Auth**: JWT access/refresh tokens (HTTP-only cookies)
- **Validation**: Zod

---

## Implementation Phases

### Phase 0: Enterprise Foundations ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| PostgreSQL + Drizzle setup with RLS | ✅ | `src/db/schema.ts`, migrations |
| Tenant context middleware | ✅ | `src/lib/tenant.ts`, `src/api/middleware/` |
| Auth with refresh tokens | ✅ | `src/services/auth-service.ts`, `src/lib/auth.ts` |
| Permission system | ✅ | `src/lib/permissions.ts`, role-based (admin, manager, user, viewer) |
| Audit logging | ✅ | `src/services/audit-service.ts` |
| Rate limiting | ✅ | `src/api/middleware/rate-limit.ts` |

**Files Created:**
- `src/db/schema.ts` - Database schema with tenants, users, sessions, assets, templates, audit_logs
- `src/db/migrations/0001_rls_policies.sql` - Row Level Security policies
- `src/lib/auth.ts` - Password hashing, JWT utilities
- `src/lib/permissions.ts` - Permission definitions and checks
- `src/lib/tenant.ts` - Tenant context wrapper
- `src/api/middleware/auth.ts` - Auth middleware
- `src/api/middleware/permissions.ts` - Permission middleware
- `src/api/middleware/rate-limit.ts` - Rate limiting

---

### Phase 1: Asset Management Core ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Asset CRUD operations | ✅ | `src/services/asset-service.ts` |
| Category system with schemas | ✅ | 6 categories with custom field schemas |
| Asset search and filtering | ✅ | Full-text search, category/status filters |
| User dashboard | ✅ | `src/components/dashboard/dashboard-layout.tsx` |
| User management | ✅ | `src/components/users/user-management.tsx` |

**Files Created:**
- `src/services/asset-service.ts` - Asset CRUD with tenant isolation
- `src/services/user-service.ts` - User management
- `src/api/routes/assets.ts` - Asset API endpoints
- `src/api/routes/users.ts` - User API endpoints
- `src/api/routes/auth.ts` - Auth endpoints (login, logout, refresh)
- `src/components/auth/login-form.tsx` - Login UI
- `src/components/dashboard/dashboard-layout.tsx` - Main layout with sidebar
- `src/components/assets/asset-list.tsx` - Asset list with filters
- `src/components/assets/asset-form.tsx` - Asset create/edit form
- `src/components/users/user-management.tsx` - User CRUD UI
- `src/hooks/use-auth.ts` - Auth state hook
- `src/hooks/use-assets.ts` - Asset operations hook
- `src/hooks/use-users.ts` - User operations hook

---

### Phase 2: Label Designer & Templates ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| SVG-based design canvas | ✅ | `src/components/labels/label-designer.tsx` |
| LabelSpec generation | ✅ | `src/types/label-spec.ts` with full type definitions |
| Versioned template system | ✅ | `src/services/template-service.ts` |
| Category-specific templates | ✅ | 7 default templates in `src/db/seed.ts` |
| Template library UI | ✅ | `src/components/templates/template-library.tsx` |
| Template create dialog | ✅ | Format/category selection before designer |
| Label preview component | ✅ | `src/components/labels/label-preview.tsx` |
| Advanced field editor | ✅ | `src/components/labels/field-editor.tsx` |

**Files Created:**
- `src/types/label-spec.ts` - LabelSpec, LabelField, LabelElement types
- `src/types/template.ts` - Template types
- `src/services/template-service.ts` - Template CRUD with versioning
- `src/api/routes/templates.ts` - Template API endpoints
- `src/components/labels/label-designer.tsx` - SVG canvas editor (~700 lines)
- `src/components/labels/label-preview.tsx` - Preview renderer with sample data
- `src/components/labels/field-editor.tsx` - Advanced property editor
- `src/components/templates/template-library.tsx` - Template browser/manager
- `src/components/templates/template-create-dialog.tsx` - New template wizard
- `src/hooks/use-templates.ts` - Template operations hook
- `src/lib/validations.ts` - Zod schemas including LabelSpec validation

**Critical Fixes Applied (from Oracle review):**

1. **Runtime Validation** - Added Zod discriminated unions for field styles:
   - `textStyleSchema`, `barcodeStyleSchema`, `qrcodeStyleSchema`, `imageStyleSchema`
   - Size limits: max 50 fields, max 50 elements

2. **Drag Performance** - Optimized label-designer.tsx:
   - Switched to Pointer Events for touch/pen support
   - `requestAnimationFrame` throttling
   - Position tracked in ref during drag, committed on pointerUp

3. **Tenant Security** - Fixed version queries in template-service.ts:
   - Added `tenantId` filter to `getTemplateWithHistory()`
   - Added `tenantId` filter to version update in `publishTemplate()`

4. **Deterministic Preview** - Replaced `Math.random()` in QR placeholder with static pattern

---

### Phase 3: Print System 🔲 NOT STARTED

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| PDF renderer (Tier-1) | 🔲 | High | jsPDF integration |
| Print job queue | 🔲 | High | Job management service |
| Multi-format support | 🔲 | Medium | Avery, DYMO, Brother, Zebra |
| Batch printing | 🔲 | Medium | Multiple assets per job |
| Print preview | 🔲 | Medium | Before-print confirmation |
| Print history | 🔲 | Low | Audit trail for prints |

**Technical Notes:**
- Convert positions to PDF points: `72pt = 1in`, `1mm ≈ 2.83465pt`
- Keep `dpi` for raster elements only (images, QR, barcode when not vector)
- Use QRCode and JsBarcode libraries for actual rendering

---

### Phase 4: Advanced Features 🔲 NOT STARTED

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Local print agent (Tier-2) | 🔲 | Medium | WebSocket connector |
| Import/export (CSV, Excel) | 🔲 | Medium | Bulk operations |
| API for integrations | 🔲 | Medium | REST/GraphQL public API |
| Webhooks | 🔲 | Low | Event notifications |
| Cloud print service (Tier-3) | 🔲 | Low | Future consideration |

---

## Recommended Improvements (from Oracle Review)

### High Priority (Production Must-Haves)

| Feature | Effort | Notes |
|---------|--------|-------|
| Undo/redo in designer | Medium | Mandatory for usability |
| Resize handles | Medium | Direct manipulation of field sizes |
| Snap-to-grid + alignment guides | Medium | Consistent layouts |
| Audit logging for template CRUD | Low | Currently missing |

### Medium Priority

| Feature | Effort | Notes |
|---------|--------|-------|
| Copy/paste in designer | Low | Duplicate fields/elements |
| Z-order control | Low | Bring to front/send to back |
| Safe area enforcement | Low | Warn when outside margins |

### Lower Priority

| Feature | Effort | Notes |
|---------|--------|-------|
| Multi-select + group/ungroup | High | Complex but valuable |
| Component decomposition | Medium | Extract Canvas, AddPalette, PropertiesPanel from label-designer.tsx |
| useLabelSpecEditor hook | Low | Extract shared mutation helpers |

---

## Database Schema

```
tenants
├── users (tenant_id FK)
│   └── sessions (user_id FK)
├── assets (tenant_id FK, created_by FK)
├── label_templates (tenant_id FK, created_by FK)
│   └── template_versions (template_id FK, tenant_id FK)
└── audit_logs (tenant_id FK, user_id FK)
```

**RLS Policies**: All tenant-scoped tables enforce `tenant_id = current_setting('app.current_tenant_id')::uuid`

---

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh tokens
- `GET /api/auth/me` - Current user

### Assets
- `GET /api/assets` - List assets (with filters)
- `GET /api/assets/:id` - Get asset
- `POST /api/assets` - Create asset
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset

### Users
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Templates
- `GET /api/templates` - List templates (with filters)
- `GET /api/templates/:id` - Get template (optionally with history)
- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `POST /api/templates/:id/publish` - Publish template
- `DELETE /api/templates/:id/publish` - Unpublish template
- `POST /api/templates/:id/duplicate` - Duplicate template
- `GET /api/templates/:id/versions/:version` - Get specific version
- `POST /api/templates/:id/versions/:version/revert` - Revert to version

---

## Label Formats Supported

| Format | Dimensions | Labels/Sheet |
|--------|------------|--------------|
| Avery 5160 | 66.7 × 25.4 mm | 30 |
| Avery 5161 | 101.6 × 25.4 mm | 20 |
| Avery 5163 | 101.6 × 50.8 mm | 10 |
| Avery 5164 | 101.6 × 88.9 mm | 6 |
| DYMO 30252 | 89 × 28 mm | 1 |
| DYMO 30336 | 54 × 25 mm | 1 |
| Brother DK-2205 | 62 × 30.48 mm | 1 |
| Custom | User-defined | 1 |

---

## Equipment Categories

| Category | Custom Fields |
|----------|---------------|
| Networking | ipAddress, macAddress, firmware, ports |
| Servers | cpu, ram, storage, os, rackUnit |
| Cabling | cableType, length, portA, portB |
| Power | capacity, outlets, inputVoltage, batteryRuntime |
| Physical | rackUnits, dimensions, weight, maxLoad |
| IoT/Edge | protocol, sensors, firmware, connectivity |

---

## Commands

```bash
# Development
cd my-app
bun --hot src/index.ts

# Build
bun run build.ts

# Test
bun test

# Database
bun run db:migrate
bun run db:seed
```

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.local | admin123! |
| Manager | manager@demo.local | manager123! |
| User | user@demo.local | user123! |

Tenant slug: `demo`
