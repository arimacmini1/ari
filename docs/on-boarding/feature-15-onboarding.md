<!--
  Feature 15 On-Boarding Guide
  Version: 1.0 (2026-02-13)
  Status: Complete
-->

# Feature 15 - Main Workspace Chat Adoption (Telemetry + Migration + Import UX): On-Boarding Guide

**Feature task file:** `docs/tasks/feature-15-main-workspace-chat-adoption.md`  
**Related architecture:** `docs/architecture/feature-15-architecture.md`  
**Status:** COMPLETE

## Quick Start (10 minutes)

This guide validates:
- Telemetry events are emitted and ingested
- Adoption KPIs render in analytics dashboard
- Migration tips appear and can be dismissed
- Import UX validates and supports recovery

### What You’ll Need
- Dev server: `npm run dev`
- Access to main workspace chat page
- Verification script: `bash scripts/verify-feature-15.sh`

---

## Testing Guide

### Manual Testing Checklist
- [ ] Emit main chat events and confirm ingestion
- [ ] Verify KPI cards update for the active project
- [ ] Trigger migration tips and confirm dismiss persists
- [ ] Run import with valid and invalid payloads; confirm retry preserves input

### Scripted Verification
Run:
```bash
bash scripts/verify-feature-15.sh
```
Expected: script reports all checks as `[PASS]` and exits `0`.

### Test 1 — Telemetry ingestion
1. Open the main workspace chat and send a message.
2. Confirm a telemetry event is emitted (network panel or server logs).
3. Verify the event is stored and counted in KPIs.

Expected: Event ingested, KPI updates or is queued for rollup.

### Test 2 — KPI dashboard
1. Open analytics dashboard.
2. Filter by the active project.
3. Confirm usage split and time-to-first-output populate.

Expected: KPI cards show data for the selected project and time window.

### Test 3 — Migration tips
1. Trigger a migration tip via chat context.
2. Dismiss the tip.
3. Refresh the page.

Expected: Tip remains dismissed for the user/project.

### Test 4 — Import UX validation
1. Run an import with a valid payload.
2. Run an import with an invalid payload.
3. Retry the invalid case after fixing the input.

Expected: Invalid case returns actionable errors and preserves input; valid case shows summary.

---

## Troubleshooting

### Issue: KPIs are empty
**Symptoms:** KPI cards show zero values.
**Cause:** No events ingested for current project/time window.
**Solution:** Emit a test event and confirm ingestion path is active.

### Issue: Migration tips keep reappearing
**Symptoms:** Dismissed tips show again after refresh.
**Cause:** Dismiss state not persisted.
**Solution:** Verify tip dismissal persistence (localStorage or server state).

### Issue: Import retry loses input
**Symptoms:** Re-run wipes the previous payload.
**Cause:** Missing input persistence on error.
**Solution:** Ensure retry path reuses stored payload.

---

## Related Features
- Feature 11 – Main workspace chat entry flow
- Feature 06 – Analytics Pane
- Feature 14 – Projects & Workspaces

---

## Reporting Issues

If you find bugs or issues:
1. Check Troubleshooting above
2. If still stuck, report to: `docs/tasks/feature-15-main-workspace-chat-adoption.md` (Progress / Fixes / Updates section)

Include:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if relevant
