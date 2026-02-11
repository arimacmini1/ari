# Feature 07 – Audit Logs Usage Guide

**For**: Developers integrating audit logging into their features  
**Created**: February 9, 2025  
**Status**: Ready (F07-MH-01 complete)  

---

## Quick Start

### 1. Import & Use

```typescript
import { createAuditLog } from '@/lib/audit/audit-service';

// Log any significant action
await createAuditLog({
  actor: currentUser.id,           // Who did it
  action: 'execute',                // What they did
  resource_type: 'workflow',        // What resource
  resource_id: workflowId,          // Which resource
  context: {                        // Additional details
    workflow_name: 'Process Orders',
    execution_time_ms: 1250,
    status: 'completed'
  }
});
```

### 2. Query Logs

```typescript
import { queryAuditLogs } from '@/lib/audit/audit-service';

// Find all actions by a user
const result = await queryAuditLogs({
  actor: userId,
  limit: 100,
  offset: 0
});

console.log(result.entries);  // Array of audit log entries
```

### 3. Export for Compliance

```typescript
import { exportAuditLogs } from '@/lib/audit/audit-service';

// Export as CSV for audit meeting
const csv = await exportAuditLogs({
  start_date: new Date('2025-01-01'),
  end_date: new Date('2025-12-31')
}, 'csv');

// Save to file
fs.writeFileSync('audit-logs.csv', csv);
```

---

## Logging Best Practices

### 1. Log Significant Actions

**Always log:**
- ✅ Workflow execution (start, pause, resume, complete)
- ✅ Task assignment (assign, reassign, unassign)
- ✅ Permission changes (grant, revoke)
- ✅ Configuration changes (update settings, enable/disable)
- ✅ Data exports (who exported what)
- ✅ Failed authentication attempts
- ✅ Permission denials

**Don't log:**
- ❌ Page views (creates too much data)
- ❌ UI state changes (store locally)
- ❌ API pings/health checks
- ❌ Temporary data

### 2. Rich Context

Add relevant context for investigation:

```typescript
// Good - rich context for troubleshooting
await createAuditLog({
  actor: userId,
  action: 'execute',
  resource_type: 'workflow',
  resource_id: workflowId,
  context: {
    workflow_name: 'Process Orders',
    workflow_version: '2.3.1',
    triggered_by: 'scheduled',         // vs 'manual', 'webhook'
    duration_ms: 1250,
    status: 'completed',
    agents_involved: ['agent-1', 'agent-2'],
    tasks_processed: 42,
    errors: 0,
    performance_tier: 'standard'
  }
});

// Poor - no context for investigation
await createAuditLog({
  actor: userId,
  action: 'execute',
  resource_type: 'workflow',
  resource_id: workflowId,
  context: {}
});
```

### 3. Error Logging

Log both successes and failures:

```typescript
try {
  await executeWorkflow(workflowId);
  
  await createAuditLog({
    actor: userId,
    action: 'execute',
    resource_type: 'workflow',
    resource_id: workflowId,
    context: {
      status: 'completed',
      duration_ms: elapsed,
      result: 'success'
    }
  });
} catch (error) {
  await createAuditLog({
    actor: userId,
    action: 'execute',
    resource_type: 'workflow',
    resource_id: workflowId,
    context: {
      status: 'failed',
      duration_ms: elapsed,
      error_type: error.name,
      error_message: error.message,
      error_code: error.code
    }
  });
  throw error;
}
```

### 4. Permission Denial Logging

Always log when permissions are denied:

```typescript
import { createAuditLog } from '@/lib/audit/audit-service';

// In your permission middleware
if (!hasPermission(user, action, resource)) {
  await createAuditLog({
    actor: user.id,
    action: 'access',                    // Generic "access" for denials
    resource_type: 'workflow',
    resource_id: resourceId,
    context: {
      attempted_action: action,
      user_role: user.role,
      required_role: 'project_manager',
      reason: 'insufficient_permissions'
    }
  });
  
  return res.status(403).json({ error: 'Forbidden' });
}
```

---

## API Endpoints Reference

### POST /api/audit/logs – Create Entry

```bash
curl -X POST http://localhost:3000/api/audit/logs \
  -H "Content-Type: application/json" \
  -d '{
    "actor": "user-123",
    "action": "execute",
    "resource_type": "workflow",
    "resource_id": "workflow-456",
    "context": {
      "status": "completed",
      "duration_ms": 1250
    }
  }'
```

**Response (201)**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-02-09T10:30:00Z",
  "actor": "user-123",
  "action": "execute",
  "resource_type": "workflow",
  "resource_id": "workflow-456",
  "context": {...},
  "entry_hash": "a1b2c3d4...",
  "previous_hash": "z9y8x7w6...",
  "nonce": "f1e2d3c4...",
  "created_at": "2025-02-09T10:30:00Z",
  "archived": false
}
```

### GET /api/audit/logs – Query Logs

```bash
# List all logs by actor
curl "http://localhost:3000/api/audit/logs?actor=user-123&limit=50"

# List all execute actions
curl "http://localhost:3000/api/audit/logs?action=execute"

# Date range query
curl "http://localhost:3000/api/audit/logs?start_date=2025-01-01&end_date=2025-12-31"

# Resource query
curl "http://localhost:3000/api/audit/logs?resource_type=workflow&resource_id=w-456"

# Paginated query
curl "http://localhost:3000/api/audit/logs?limit=100&offset=100&sort=asc"

# Export as CSV
curl "http://localhost:3000/api/audit/logs?export=csv" > logs.csv

# Export as JSON
curl "http://localhost:3000/api/audit/logs?export=json" > logs.json
```

**Response (200)**:
```json
{
  "entries": [
    { /* audit log entry */ },
    { /* audit log entry */ }
  ],
  "total_count": 1250,
  "limit": 50,
  "offset": 0,
  "has_more": true
}
```

### GET /api/audit/verify – Verify Integrity

```bash
# Verify last 100 entries
curl "http://localhost:3000/api/audit/verify?limit=100"

# Verify from specific entry onward
curl "http://localhost:3000/api/audit/verify?start_id=550e8400&limit=100"
```

**Response (200 - Valid)**:
```json
{
  "valid": true,
  "verified_count": 100,
  "errors": [],
  "verification_timestamp": "2025-02-09T10:35:00Z"
}
```

**Response (400 - Invalid)**:
```json
{
  "valid": false,
  "verified_count": 100,
  "errors": [
    {
      "entryId": "550e8400-...",
      "error": "Invalid entry hash. Expected abc123, got xyz789"
    }
  ],
  "verification_timestamp": "2025-02-09T10:35:00Z"
}
```

---

## Audit Actions (Enum)

Use these standard actions:

- **`execute`** – Workflow/task execution (start, run, process)
- **`assign`** – Resource assignment (assign user, assign agent)
- **`override`** – Manual override of automatic decision
- **`pause`** – Pause workflow/task execution
- **`resume`** – Resume paused workflow/task
- **`delete`** – Delete resource
- **`create`** – Create new resource
- **`update`** – Update resource configuration
- **`export`** – Export data (logs, reports, etc.)
- **`access`** – Access attempt (successful or denied)

---

## Resource Types (Enum)

Use these standard resource types:

- **`workflow`** – Orchestration workflows
- **`task`** – Individual tasks
- **`agent`** – AI agents
- **`user`** – User accounts
- **`role`** – User roles/permissions
- **`permission`** – Specific permission
- **`config`** – Configuration/settings
- **`report`** – Generated reports

---

## Integration Examples

### Example 1: Log Workflow Execution

```typescript
// In orchestrator/execute handler
import { createAuditLog } from '@/lib/audit/audit-service';

async function executeWorkflow(workflowId: string, userId: string) {
  const startTime = Date.now();
  
  try {
    const result = await orchestrator.execute(workflowId);
    
    await createAuditLog({
      actor: userId,
      action: 'execute',
      resource_type: 'workflow',
      resource_id: workflowId,
      context: {
        workflow_name: result.name,
        duration_ms: Date.now() - startTime,
        status: result.status,
        tasks_completed: result.completedTasks.length,
        agents_used: result.agentsInvolved,
        output_size_bytes: JSON.stringify(result.output).length
      }
    });
    
    return result;
  } catch (error) {
    await createAuditLog({
      actor: userId,
      action: 'execute',
      resource_type: 'workflow',
      resource_id: workflowId,
      context: {
        status: 'failed',
        duration_ms: Date.now() - startTime,
        error_type: error.name,
        error_message: error.message
      }
    });
    throw error;
  }
}
```

### Example 2: Log Permission Changes

```typescript
// In RBAC module
import { createAuditLog } from '@/lib/audit/audit-service';

async function grantPermission(
  userId: string,
  grantedBy: string,
  resourceType: string,
  resourceId: string,
  permission: string
) {
  // Perform the grant
  await db.permissions.create({
    userId,
    resourceType,
    resourceId,
    permission
  });
  
  // Log the change
  await createAuditLog({
    actor: grantedBy,
    action: 'update',
    resource_type: 'permission',
    resource_id: `${resourceType}:${resourceId}`,
    context: {
      target_user: userId,
      permission_granted: permission,
      resource_type: resourceType,
      reason: 'manual_assignment'
    }
  });
}
```

### Example 3: Log Export Operations

```typescript
// In data export handler
import { createAuditLog } from '@/lib/audit/audit-service';

async function exportWorkflowData(workflowId: string, userId: string) {
  const startTime = Date.now();
  const data = await generateExport(workflowId);
  const fileSizeBytes = JSON.stringify(data).length;
  
  // Log the export
  await createAuditLog({
    actor: userId,
    action: 'export',
    resource_type: 'workflow',
    resource_id: workflowId,
    context: {
      export_format: 'json',
      file_size_bytes: fileSizeBytes,
      duration_ms: Date.now() - startTime,
      records_exported: data.records.length,
      destination: 'download'  // or 'email', 'api', etc.
    }
  });
  
  return data;
}
```

---

## Querying Logs for Compliance

### Example: SOC2 Audit Report

```typescript
// Generate 90-day audit report for SOC2
const ninetyDaysAgo = new Date();
ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

const allActions = await queryAuditLogs({
  start_date: ninetyDaysAgo,
  limit: 10000
});

// Analyze by action
const actionCounts = {};
allActions.entries.forEach(entry => {
  actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
});

console.log('Actions in last 90 days:', actionCounts);
// {
//   execute: 1250,
//   assign: 145,
//   override: 8,
//   export: 23,
//   access: 5000
// }
```

### Example: GDPR Data Subject Access Request

```typescript
// Find all actions related to a specific user
import { queryAuditLogs } from '@/lib/audit/audit-service';

async function getUserDataForDSAR(userId: string) {
  const result = await queryAuditLogs({
    actor: userId,
    limit: 10000
  });
  
  // Export as JSON for user
  const json = JSON.stringify(result.entries, null, 2);
  
  return {
    total_records: result.total_count,
    data: result.entries
  };
}
```

### Example: Detect Suspicious Activity

```typescript
// Find all failed access attempts in last 24 hours
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

const suspiciousAccess = await queryAuditLogs({
  action: 'access',
  start_date: yesterday,
  limit: 10000
});

// Filter to denials
const denials = suspiciousAccess.entries.filter(
  entry => entry.context?.reason === 'insufficient_permissions'
);

// Group by actor
const denialsByActor = {};
denials.forEach(entry => {
  denialsByActor[entry.actor] = (denialsByActor[entry.actor] || 0) + 1;
});

// Alert on unusual patterns
Object.entries(denialsByActor).forEach(([actor, count]) => {
  if (count > 10) {
    console.warn(`⚠️ ${actor} had ${count} access denials in 24 hours`);
  }
});
```

---

## Troubleshooting

### Issue: "Failed to create audit log"

**Cause**: Database connection error or validation failure

**Solution**:
1. Check DATABASE_URL is set
2. Verify PostgreSQL is running
3. Check schema migration ran: `SELECT COUNT(*) FROM audit_logs;`
4. Check required fields: actor, action, resource_type, resource_id

### Issue: Query returns 0 results

**Cause**: Filter is too restrictive or no entries exist

**Solution**:
1. Try without filters: `GET /api/audit/logs?limit=10`
2. Check data exists: `SELECT COUNT(*) FROM audit_logs;`
3. Verify filter values are exact: `action=execute` not `action=Execute`
4. Try wider date range: `start_date=2025-01-01&end_date=2025-12-31`

### Issue: Hash verification fails

**Cause**: Data tampering or corruption

**Solution**:
1. Run verification: `GET /api/audit/verify?limit=100`
2. Check error message for specific entry ID
3. Restore from backup if critical
4. Contact security team for investigation

---

## Environment Setup

### Development

```bash
# .env.local
DATABASE_URL=postgresql://localhost:5432/aei_app_dev
AUDIT_LOG_SECRET=dev-secret-key-do-not-use-in-production
AUDIT_LOG_KEY_VERSION=1
```

### Production

```bash
# Use AWS KMS or HashiCorp Vault
# Never hardcode secrets!

# Example with AWS KMS
AUDIT_LOG_SECRET=$(aws kms decrypt --ciphertext-blob fileb://secret.encrypted --output text --query Plaintext)
```

---

## Next Steps

- **F07-MH-02** – Build UI to query and display audit logs
- **F07-MH-03** – Implement RBAC with audit logging
- **F07-MH-04** – Create compliance dashboard
- **Phase 3** – Add encryption, key rotation, SIEM integration

---

**Questions?** See `/lib/audit/README.md` for detailed documentation.
