<!--
  Feature 09 On-Boarding Guide
  Version: 1.0 (2026-02-10, initial creation for F09-MH-01/02/03)
  Status: MVP - Plugin registry, marketplace, sandbox stub
-->

# Feature 09 – Plugin Marketplace: On-Boarding Guide

## Quick Start

### 1) Publish a Plugin (API)
1. Send a POST to `/api/plugins` with a manifest (see example below)
2. Confirm the plugin appears in `/marketplace`

### 2) Install + Toggle
1. Open `/marketplace`
2. Click **Install**
3. Click **Disable** then **Enable**

### 3) Execute (Sandbox Stub)
1. POST `/api/plugins/{pluginId}/execute` with `versionId` + permissions
2. Confirm you get an execution record (status: completed or denied)

---

## Feature Overview

### What You Get
- **Registry** for versioned plugin metadata + manifest validation
- **Marketplace UI** for discovery, install/update/uninstall, enable/disable
- **Sandbox execution stub** with permission enforcement + audit logging

### Key Capabilities
**Registry**
- Publish new plugins with semver manifests
- Search and filter by category / compatibility

**Marketplace**
- Install/update/uninstall from `/marketplace`
- Enable/disable installed plugins

**Sandbox Stub**
- Permissions checked against manifest allowlist
- Audit logs for execution start/end/denials
- Real runtime deferred to `P3-SH-01`

---

## Testing Guide

### Registry (F09-MH-01)
- [ ] POST `/api/plugins` with a valid manifest
- [ ] GET `/api/plugins?search=...` returns the plugin
- [ ] POST `/api/plugins/{pluginId}/versions` adds a new version
- [ ] PATCH `/api/plugins/{pluginId}/versions/{versionId}` to set `deprecated=true`

### Sandbox Stub (F09-MH-02)
- [ ] POST `/api/plugins/{pluginId}/execute` with allowed permissions
- [ ] POST with a denied permission and verify `status=denied`
- [ ] Verify audit log entries for execute + denied access

### Marketplace UI (F09-MH-03)
- [ ] Install from `/marketplace`
- [ ] Disable/Enable an installed plugin
- [ ] Uninstall the plugin and verify status updates

---

## API Reference (Quick)

### Registry
- `GET /api/plugins`
- `POST /api/plugins`
- `GET /api/plugins/{pluginId}`
- `POST /api/plugins/{pluginId}/versions`
- `PATCH /api/plugins/{pluginId}/versions/{versionId}`

### Installations
- `GET /api/plugins/installations`
- `POST /api/plugins/{pluginId}/install`
- `POST /api/plugins/{pluginId}/toggle`
- `POST /api/plugins/{pluginId}/uninstall`

### Execution
- `POST /api/plugins/{pluginId}/execute`

---

## Example Manifest Payload

```json
{
  "manifest": {
    "name": "security-scanner",
    "version": "1.0.0",
    "description": "Static analysis plugin",
    "author": "AEI Labs",
    "entrypoint": "index.js",
    "categories": ["security", "analysis"],
    "compatibility": ["aei>=1.0.0"],
    "permissions": ["network"],
    "pricing": { "type": "free" }
  }
}
```

---

## Key Files

- `lib/plugins/registry-schema.ts`
- `lib/plugins/registry-service.ts`
- `lib/plugins/sandbox-runtime.ts`
- `lib/plugins/installation-service.ts`
- `app/api/plugins/route.ts`
- `app/api/plugins/[pluginId]/route.ts`
- `app/api/plugins/[pluginId]/versions/route.ts`
- `app/api/plugins/[pluginId]/versions/[versionId]/route.ts`
- `app/api/plugins/[pluginId]/execute/route.ts`
- `app/api/plugins/installations/route.ts`
- `app/api/plugins/[pluginId]/install/route.ts`
- `app/api/plugins/[pluginId]/toggle/route.ts`
- `app/api/plugins/[pluginId]/uninstall/route.ts`
- `app/marketplace/page.tsx`
- `lib/db/migrations/005-plugin-registry.sql`
- `lib/db/migrations/006-plugin-executions.sql`
- `lib/db/migrations/007-plugin-installations.sql`

---

## Debugging Guide

### Issue: 403 on plugin routes
**Check:**
1. `x-user-id` header is set
2. User has RBAC permission `assign` or `execute`
3. `RBAC_BOOTSTRAP_ADMIN_USER_ID` set in `.env.local`

### Issue: No plugins in marketplace
**Check:**
1. Registry publish succeeded
2. Migrations `005/006/007` applied

### Issue: Execution denied
**Check:**
1. Requested permissions are in manifest allowlist
2. Version ID matches plugin

---

## Related Docs

- `/docs/architecture/feature-09-architecture.md`
- `/docs/tasks/feature-09-plugin-marketplace.md`
