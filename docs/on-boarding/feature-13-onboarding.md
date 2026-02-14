# Feature 13 – Comparative Trace Analysis On-Boarding Guide

**Feature task file:** `docs/tasks/feature-13-comparative-trace-analysis.md`
**Related architecture:** `docs/architecture/feature-13-architecture.md`
**Status:** COMPLETED (mock/simulated re-execution)

## Quick Start (5 minutes)

### What You'll Need
- Dev server running.
- An execution id with decision nodes that include alternatives (example seeded: `exec-001`).

### Step-by-Step
1. Open Trace Viewer.
2. Load `exec-001` (or another execution id).
3. Find a node with `Compare` action and click `Compare`.
4. Choose an alternative outcome in the dropdown.
5. Confirm you see:
   - Side-by-side Original/Alternative lists.
   - `changed`/`added`/`removed` highlights.
   - Confidence/Cost/Latency delta cards.
6. Click `Fork` and confirm:
   - `fork_status=queued` then `running` then `completed`.
   - You are navigated to the forked execution id (`fork_...`).

---

## Common Use Cases (15 minutes)

### Use Case 1: Compare Two Decisions Without Changing Anything
1. Open Compare for a node.
2. Switch the alternative outcome.
3. Use the delta cards to assess tradeoffs (confidence/cost/latency).
4. Use the per-decision delta table to find which node shifted the most.

### Use Case 2: Fork and Continue Debugging in a Separate Execution
1. Open Compare for a node.
2. Click `Fork`.
3. When the fork loads, export JSON to share the forked trace with teammates.

### Use Case 3: Disable Compare/Fork During Testing
1. In Trace Viewer header, toggle `Compare` off and confirm compare is blocked.
2. Toggle `Fork` off and confirm forking returns a clear disabled error.
3. Toggle back on to continue.

---

## Testing Procedures

### Manual Testing Checklist
- [ ] Compare opens from a decision node that has alternatives.
- [ ] Side-by-side highlights show `changed`/`added`/`removed`.
- [ ] Delta cards render non-empty values.
- [ ] Fork shows status progression (`queued` -> `running` -> `completed`) and loads the forked execution.
- [ ] Error path: invalid `node_id` returns actionable error.
- [ ] Toggle path: disabling Compare/Fork prevents actions without breaking trace viewing.

### Failure Injection (API)
Run these with the dev server running:
```bash
curl -s -X POST http://localhost:3000/api/traces/compare \
  -H "Content-Type: application/json" \
  -d '{"execution_id":"exec-001","node_id":"bad-node","alternative_outcome":"x"}'

curl -s -X POST http://localhost:3000/api/traces/fork \
  -H "Content-Type: application/json" \
  -d '{"execution_id":"exec-001","node_id":"bad-node","alternative_outcome":"x"}'
```

Expected: `Decision node not found: bad-node` in the error payload.

---

## Troubleshooting

### Issue: Compare/Fork shows disabled but I expect it enabled
**Symptoms:** UI shows Compare/Fork disabled or endpoints return `503`.
**Cause:** Runtime flags are set to disabled.
**Solution:** In Trace Viewer, toggle `Compare`/`Fork` on. If server restarts, flags reset to env defaults.

### Issue: Fork never completes
**Symptoms:** `fork_status` stays `queued` or `running`.
**Cause:** In the mock implementation, fork completion is simulated asynchronously; a stalled status usually implies the server restarted.
**Solution:** Re-run fork after refresh; fork jobs are stored in-memory and do not persist across restarts.

---

## Related Features
- Feature 05 – Trace Viewer base experience.
- Feature 03 – Execution surfaces/history (where traces are generated).

## Reporting Issues
Report issues in `docs/tasks/feature-13-comparative-trace-analysis.md` under the relevant task’s `Progress / Fixes / Updates`.
