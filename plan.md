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

### Phase 3: Print System ✅ COMPLETE

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| PDF renderer (Tier-1) | ✅ | High | jsPDF + QRCode + JsBarcode |
| Print job queue | ✅ | High | `src/services/print-service.ts` |
| Multi-format support | ✅ | Medium | Avery, DYMO, Brother, Custom |
| Batch printing | ✅ | Medium | Multiple assets per job |
| Print preview | ✅ | Medium | Preview API endpoint |
| Print history | ✅ | Low | `src/components/labels/print-history.tsx` |

**Files Created:**
- `src/types/print.ts` - Print types (PrintJob, PrintJobItem, PrintOptions)
- `src/lib/print-utils.ts` - Unit conversions, layout helpers
- `src/services/label-renderer.ts` - LabelSpec + Asset → PDF rendering
- `src/services/print-service.ts` - Print job CRUD with tenant isolation
- `src/api/routes/print.ts` - Print API endpoints
- `src/hooks/use-print.ts` - React state management hook
- `src/components/labels/print-dialog.tsx` - Print dialog UI
- `src/components/labels/print-history.tsx` - Print history UI

**Technical Implementation:**
- Convert positions to PDF points: `72pt = 1in`, `1mm ≈ 2.83465pt`
- QRCode and JsBarcode for barcode rendering
- jsPDF for PDF generation
- Sheet layouts for Avery multi-label formats

**Critical Fixes Applied (from Oracle review):**

1. **Asset Query Optimization** - Fixed N+1 query in `print-service.ts`:
   - Changed from loading all tenant assets to `WHERE id IN (...)` with `inArray()`
   - Prevents loading entire asset table for every print job

2. **Rate Limiting** - Added rate limits to print endpoints in `src/index.ts`:
   - `PRINT_JOB_RATE_LIMIT`: 10 jobs/min (create)
   - `PRINT_RENDER_RATE_LIMIT`: 5 renders/min (render PDF)
   - `PRINT_PREVIEW_RATE_LIMIT`: 20 previews/min (preview)

3. **RLS Policies** - Created `src/db/migrations/0002_print_rls_policies.sql`:
   - `print_jobs` and `print_job_items` tables protected by tenant isolation
   - Same pattern as other tenant-scoped tables

4. **Server-Side Barcode Rendering** - Fixed in `label-renderer.ts`:
   - Replaced `OffscreenCanvas` with SVG string generation
   - Works in server-side Bun environment without DOM

5. **Copies Support** - Implemented in `label-renderer.ts`:
   - `options.copies` expands assets array before rendering
   - Capped at 100 copies max for safety

6. **Cancellation Check** - Added in `print-service.ts`:
   - Re-checks job status after render completes
   - Discards result if job was cancelled during processing

7. **QR/Barcode Caching** - Added in `label-renderer.ts`:
   - Per-render cache for QR codes and barcodes keyed by value + style
   - Avoids regenerating identical codes when printing copies or shared values

---

### Phase 4: Advanced Features ✅ COMPLETE

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| New permissions | ✅ | High | integration:manage, import:execute, export:read, webhook:manage, print:agent |
| API Keys infrastructure | ✅ | High | Create, revoke, validate with scoped permissions |
| Background Jobs framework | ✅ | High | DB-backed queue with FOR UPDATE SKIP LOCKED |
| Public API v1 | ✅ | High | API key auth, versioned endpoints |
| Webhooks | ✅ | High | Subscriptions, outbox, deliveries, SSRF protection |
| Import/Export | ✅ | High | CSV/Excel parsing, mapping templates, progress tracking |
| Local Print Agent (Tier-2) | ✅ | Medium | Agent registration, printer discovery, dispatch tracking |
| Cloud Print (Tier-3) | ✅ | Medium | Provider config, routing rules |

**Files Created:**
- `src/types/api-key.ts` - API key types
- `src/types/background-job.ts` - Job queue types
- `src/types/webhook.ts` - Webhook types with event types
- `src/types/import-export.ts` - Import/export types with field mapping
- `src/types/print-agent.ts` - Print agent and dispatch types
- `src/services/api-key-service.ts` - API key CRUD and validation
- `src/services/job-service.ts` - Background job queue management
- `src/services/webhook-service.ts` - Webhook subscriptions and delivery
- `src/services/import-service.ts` - CSV/Excel import processing
- `src/services/export-service.ts` - Asset export to CSV/Excel
- `src/services/print-agent-service.ts` - Print agent management
- `src/api/middleware/api-key.ts` - API key authentication middleware
- `src/api/routes/integrations.ts` - API key management routes
- `src/api/routes/webhooks.ts` - Webhook management routes
- `src/api/routes/imports.ts` - Import/export routes
- `src/db/migrations/0003_phase4_rls_policies.sql` - RLS for all Phase 4 tables

**Database Tables Added:**
- `api_keys` - API key storage with hashed keys
- `background_jobs` - Job queue with status tracking
- `webhook_subscriptions` - Webhook endpoint configs
- `webhook_outbox` - Pending/delivered events
- `webhook_deliveries` - Delivery attempt logs
- `import_templates` - Field mapping presets
- `import_jobs` - Import job tracking
- `import_job_errors` - Per-row error logging
- `export_jobs` - Export job tracking
- `print_agents` - Registered print agents
- `print_agent_printers` - Discovered printers
- `print_dispatches` - Agent print job tracking
- `cloud_print_providers` - Cloud print configs
- `print_routes` - Print routing rules

**Security Features:**
- SSRF protection for webhooks (blocks private IPs, requires HTTPS)
- API key hashing with SHA-256
- Webhook signature verification (HMAC-SHA256)
- Scoped permissions per API key
- RLS policies on all new tables

---

### P0 Hardening (Production Blockers) ✅ COMPLETE

Oracle identified critical production blockers. All have been addressed:

| Issue | Status | Fix Applied |
|-------|--------|-------------|
| RLS not enforced on all tables | ✅ | `0004_force_rls.sql` - `FORCE ROW LEVEL SECURITY` on all 22 tables |
| API key lookup bypasses RLS | ✅ | `0005_api_key_lookup.sql` - SECURITY DEFINER function for pre-tenant lookup |
| In-memory rate limiting not distributed | ✅ | `0006_rate_limits.sql` - DB-backed rate limiting table |
| Refresh token missing tenantId | ✅ | Added `tid` to RefreshTokenPayload, updated auth flow |
| Session validation not tenant-scoped | ✅ | `getSessionInfo(sessionId, tenantId)` with `withTenant()` |
| Job queue race conditions | ✅ | `acquireJob`, `completeJob`, `failJob` use `withTenant()` |
| Webhook SSRF vulnerability | ✅ | `src/lib/ssrf.ts` - DNS resolution + IP range validation |
| Webhook delivery DNS rebinding | ✅ | Re-validate URL at delivery time |

**Migrations Created:**
- `src/db/migrations/0004_force_rls.sql` - Force RLS on all tables with safe UUID fallback
- `src/db/migrations/0005_api_key_lookup.sql` - SECURITY DEFINER API key lookup function
- `src/db/migrations/0006_rate_limits.sql` - Rate limits table for distributed deployments

**Files Created:**
- `src/lib/ssrf.ts` - Comprehensive SSRF protection (blocks private IPs, metadata endpoints, validates before fetch)

**Files Updated:**
- `src/types/user.ts` - Added `tid` to RefreshTokenPayload
- `src/lib/auth.ts` - tenantId in refresh token creation/verification
- `src/services/auth-service.ts` - `getSessionInfo(sessionId, tenantId)` with `withTenant()`
- `src/api/middleware/auth.ts` - Pass tenantId to session validation
- `src/api/middleware/permissions.ts` - Pass tenantId to session validation
- `src/api/middleware/rate-limit.ts` - DB-backed `checkRateLimitDb()`
- `src/services/job-service.ts` - All job operations use `withTenant()`
- `src/services/api-key-service.ts` - Uses SECURITY DEFINER lookup function
- `src/services/webhook-service.ts` - SSRF validation, tenant-scoped processing

---

### P1 Security Improvements ✅ COMPLETE

| Issue | Status | Fix Applied |
|-------|--------|-------------|
| AES-GCM IV length (16→12 bytes) | ✅ | `webhook-service.ts` - IV_LENGTH now 12 (NIST recommended) |
| Duplicate auth middleware | ✅ | Removed Request overload from `permissions.ts`, refactored `print.ts` and `templates.ts` to use `withAuth(requirePermission(...))` |
| Refresh token reuse detection | ✅ | Mark consumed tokens, detect reuse and invalidate all sessions, audit log `TOKEN_REUSE_DETECTED` |
| Job reaper for stuck jobs | ✅ | `reapStuckJobs()` and `reapStuckJobsAllTenants()` in `job-service.ts` |

**Files Updated:**
- `src/services/webhook-service.ts` - IV_LENGTH = 12 (was 16)
- `src/api/middleware/permissions.ts` - Simplified to handler-wrapper only
- `src/api/routes/print.ts` - Refactored to use `withAuth(requirePermission(...))` pattern
- `src/api/routes/templates.ts` - Refactored to use `withAuth(requirePermission(...))` pattern
- `src/services/auth-service.ts` - Token reuse detection with `CONSUMED:` prefix, `handleTokenReuse()` function
- `src/services/job-service.ts` - Added `reapStuckJobs()` and `reapStuckJobsAllTenants()`
- `src/types/audit.ts` - Added `TOKEN_REUSE_DETECTED` audit action

---

### Security Hardening Round 2 (Oracle Review) ✅ COMPLETE

A second Oracle security review identified additional production issues across all priority levels. All have been addressed:

#### P0 - Critical (Production Blockers)

| Issue | Status | Fix Applied |
|-------|--------|-------------|
| CSRF Protection Missing | ✅ | `src/api/middleware/csrf.ts` - Origin/Referer validation on state-changing routes |
| Rate Limit Table Not Tenant-Scoped | ✅ | `0007_rate_limits_hardening.sql` - Added tenant_id, RLS, improved cleanup |
| CSV/Excel Formula Injection | ✅ | `export-service.ts` - `sanitizeForSpreadsheet()` prefixes dangerous chars with `'` |

#### P1 - High Priority

| Issue | Status | Fix Applied |
|-------|--------|-------------|
| Refresh Token Race Condition | ✅ | Atomic UPDATE with conditional WHERE clause in `refreshSession()` |
| User Enumeration in Audit Logs | ✅ | Single "invalid_credentials" reason for user_not_found and invalid_password |
| Rate Limiting Gaps | ✅ | Added `IMPORT_RATE_LIMIT`, `EXPORT_RATE_LIMIT`, `WEBHOOK_RATE_LIMIT` |

#### P2 - Medium Priority

| Issue | Status | Fix Applied |
|-------|--------|-------------|
| Permission String Literals | ✅ | `print.ts` and `templates.ts` use `PERMISSIONS.PRINT_EXECUTE`, etc. |
| Refresh Cookie Path Too Broad | ✅ | Changed from `/api/auth` to `/api/auth/refresh` in `auth.ts` |
| Distinguishable Auth Errors | ✅ | Single `{ error: "Unauthorized" }` for all auth failures |
| Import Mapping Path Validation | ✅ | `ALLOWED_ASSET_FIELDS` set with `isValidFieldPath()` validation |

#### P3 - Low Priority

| Issue | Status | Fix Applied |
|-------|--------|-------------|
| Security Headers Missing | ✅ | HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy |
| Request ID for Tracing | ✅ | `generateRequestId()` with `X-Request-Id` header on all responses |

**Migrations Created:**
- `src/db/migrations/0007_rate_limits_hardening.sql` - Tenant-scoped rate limits with RLS

**Files Created:**
- `src/api/middleware/csrf.ts` - CSRF protection with Origin/Referer validation

**Files Updated:**
- `src/index.ts` - CSRF on routes, security headers, request ID, rate limits for imports/exports/webhooks
- `src/api/middleware/auth.ts` - Single "Unauthorized" error for all auth failures
- `src/api/middleware/rate-limit.ts` - Added IMPORT/EXPORT/WEBHOOK rate limit constants
- `src/api/routes/print.ts` - Uses PERMISSIONS constants
- `src/api/routes/templates.ts` - Uses PERMISSIONS constants
- `src/services/auth-service.ts` - Atomic refresh token rotation, "invalid_credentials" audit
- `src/services/export-service.ts` - Formula injection protection
- `src/services/import-service.ts` - Path validation against allowed fields whitelist
- `src/lib/auth.ts` - Scoped refresh cookie to `/api/auth/refresh`

---

### Phase 5: Future Considerations 🔲 NOT STARTED

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

### Print
- `POST /api/print/jobs` - Create print job
- `GET /api/print/jobs` - List print jobs (with filters)
- `GET /api/print/jobs/:id` - Get print job status
- `POST /api/print/jobs/:id/render` - Render print job to PDF
- `DELETE /api/print/jobs/:id` - Cancel print job
- `GET /api/print/preview/:templateId/:assetId` - Preview single label

### Integrations (API Keys)
- `GET /api/integrations/api-keys` - List API keys
- `POST /api/integrations/api-keys` - Create API key (returns secret once)
- `GET /api/integrations/api-keys/:id` - Get API key details
- `PUT /api/integrations/api-keys/:id` - Update API key
- `DELETE /api/integrations/api-keys/:id` - Revoke API key

### Webhooks
- `GET /api/webhooks/subscriptions` - List webhook subscriptions
- `POST /api/webhooks/subscriptions` - Create subscription
- `GET /api/webhooks/subscriptions/:id` - Get subscription
- `PUT /api/webhooks/subscriptions/:id` - Update subscription
- `DELETE /api/webhooks/subscriptions/:id` - Delete subscription
- `GET /api/webhooks/outbox` - List outbox entries
- `GET /api/webhooks/outbox/:id/deliveries` - Get delivery attempts
- `POST /api/webhooks/outbox/:id/retry` - Retry dead letter

### Import/Export
- `GET /api/imports` - List import jobs
- `POST /api/imports` - Create import job (multipart file upload)
- `GET /api/imports/:id` - Get import job status
- `GET /api/imports/:id/errors` - Get import errors
- `GET /api/import-templates` - List import templates
- `POST /api/import-templates` - Create import template
- `DELETE /api/import-templates/:id` - Delete import template
- `GET /api/exports/assets` - Export assets (CSV/XLSX download)

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
