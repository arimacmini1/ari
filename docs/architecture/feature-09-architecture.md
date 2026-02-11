<!--
  Feature 09 Architecture Document
  Version: 1.0 (2026-02-10, initial creation for F09-MH-01/02/03)
  Status: MVP - Plugin registry, marketplace, sandbox stub
-->

# Feature 09 – Plugin Marketplace: Architecture & Design

## System Overview

Feature 09 introduces a **plugin registry**, **marketplace UI**, and a **sandbox execution stub**. The registry stores versioned plugin metadata and validates manifests. The marketplace provides discovery and install controls. The sandbox runtime currently enforces permissions and logs audit events, but does not execute real plugin code until the runtime is selected (see `P3-SH-01`).

**Key Architecture Decisions:**
- **Registry storage:** Postgres tables with versioned metadata and JSONB manifests.
- **Validation:** `zod` schema validation for publish payloads.
- **Marketplace actions:** Install/update/uninstall tracked in `plugin_installations`.
- **Sandbox:** Permission enforcement + audit logs; execution stubbed.

---

## Architecture Diagram

```
Frontend
  /marketplace (app/marketplace/page.tsx)
    -> GET /api/plugins
    -> GET /api/plugins/installations
    -> POST /api/plugins/{id}/install|toggle|uninstall

Backend
  /api/plugins (registry)
    -> lib/plugins/registry-service.ts
    -> lib/plugins/registry-schema.ts

  /api/plugins/{id}/execute (sandbox stub)
    -> lib/plugins/sandbox-runtime.ts
    -> plugin_executions table

Database
  plugins
  plugin_versions
  plugin_installations
  plugin_executions
```

---

## Data Model

### Migrations
- `lib/db/migrations/005-plugin-registry.sql`
  - `plugins` (id, name, description, author, categories, status)
  - `plugin_versions` (manifest_json, permissions, pricing, compatibility)
- `lib/db/migrations/006-plugin-executions.sql`
  - `plugin_executions` (status, permissions, resource limits, error)
- `lib/db/migrations/007-plugin-installations.sql`
  - `plugin_installations` (installed_by, status, version_id)

---

## API Surface

### Registry
- `GET /api/plugins` (search, category, compatibility)
- `POST /api/plugins` (publish new plugin)
- `GET /api/plugins/{pluginId}`
- `POST /api/plugins/{pluginId}/versions`
- `PATCH /api/plugins/{pluginId}/versions/{versionId}`

### Installation
- `GET /api/plugins/installations`
- `POST /api/plugins/{pluginId}/install`
- `POST /api/plugins/{pluginId}/toggle`
- `POST /api/plugins/{pluginId}/uninstall`

### Execution (Sandbox Stub)
- `POST /api/plugins/{pluginId}/execute`

---

## Permission + Audit Logging

**RBAC**
- Registry publish/update uses `assign`
- Execution uses `execute`
- Install/uninstall/toggle uses `assign`

**Audit Logs**
- Resource type: `plugin` and `plugin_execution`
- Actions: `create`, `update`, `delete`, `execute`, `access`

---

## Marketplace UI

**Location:** `app/marketplace/page.tsx`  
**Behavior:**
- Loads plugin list and installations
- Shows status (installed/disabled/deprecated)
- Executes install/update/uninstall + enable/disable with async feedback

---

## Sandbox Stub Details

**Current Behavior:**
- Validates requested permissions against manifest allowlist.
- Denies excess permissions, records `denied` execution.
- Records audit logs for execution start and denial/completion.

**Deferred:**
- Real runtime integration (WASM or container) is scoped to `P3-SH-01`.

---

## Known Limitations

- No real plugin code execution (stub only).
- No review/ratings pipeline yet.
- No revenue sharing or certification yet.

---

## References

- `/docs/tasks/feature-09-plugin-marketplace.md`
- `/docs/on-boarding/feature-09-onboarding.md`
- `lib/plugins/registry-service.ts`
- `lib/plugins/sandbox-runtime.ts`
- `app/api/plugins/route.ts`
