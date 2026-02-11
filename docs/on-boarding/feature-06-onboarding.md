<!--
  Feature 06 On-Boarding Guide
  Version: 1.0 (2026-02-09, initial creation for F06-MH-01 & F06-MH-02)
  Status: MVP - Analytics Pane with KPI Dashboard & Real-time Data Schema
-->

# Feature 06 – Analytics Pane: On-Boarding Guide

## Quick Start

**Access the Analytics Pane:**
1. In the sidebar navigation, click **"Analytics"** (📈 icon)
2. You'll see a dashboard with 6 KPI cards in a grid (responsive: 1 column on mobile, 3 columns on desktop)
3. Each card shows current metric value, trend indicator (↑/↓), and a 7-day sparkline chart

**Customize your dashboard:**
1. Click the **"⚙️ Customize"** button (top-left)
2. Toggle cards on/off with checkboxes
3. Click **"Done"** to close customizer
4. Your layout persists automatically (stored in localStorage)

**See a time-series chart:**
- Coming soon in F06-MH-03 (click a KPI card to expand to full-screen chart)

---

## Feature Overview

### What You Get

The Analytics Pane provides a **unified dashboard for monitoring project-wide KPIs** such as:

- **Cost metrics:** Daily cost, total cost YTD, token spend
- **Quality metrics:** Average quality score, success rate
- **Performance metrics:** Error rate, latency (p95), execution duration
- **Capacity metrics:** Active agent count

All KPIs update in **real-time** (<1s latency) as agents execute tasks. Metrics are aggregated by project, agent, or task type.

### Key Capabilities

✅ **Real-time KPI Dashboard**
- 6 main KPI cards (cost, quality, error rate, latency, agents, success rate)
- Current metric value displayed prominently
- Trend indicators showing % change from previous period
- 7-day sparkline mini-charts for visual trends
- Color-coded by metric type (red=cost/errors, green=quality, yellow=latency)

✅ **Customizable Layout**
- Show/hide any KPI card with toggle menu
- Drag-drop card reordering (coming in F06-MH-02+)
- Layout persists across sessions (localStorage)
- Responsive grid: 1 col (mobile) → 2-3 cols (desktop)

✅ **Loading & Empty States**
- Skeleton loaders while data fetches
- Empty state message if no execution data yet
- Error states with helpful messages

✅ **Analytics Data Schema** (Backend - F06-MH-01)
- Time-series metric events (granular timestamps every ~10s)
- KPI aggregations (hourly, daily, weekly, monthly summaries)
- 90-day rolling historical window
- Sub-500ms query latency for dashboard loads
- WebSocket real-time event batching (5-second intervals)

### Known Limitations

⚠️ **Not yet implemented:**
- Drill-down by agent/project/task type (coming F06-MH-03)
- Time-series chart viewer with zoom/pan (coming F06-MH-03)
- Threshold-based alerting (coming F06-MH-04)
- Anomaly detection flags (coming F06-MH-05)
- Report export (CSV/JSON/PDF) (coming F06-MH-06)
- Drag-drop card reordering (improved UI - Phase 2)
- Email/Slack notifications (Phase 2)

⚠️ **Mock data phase:**
- Dashboard currently shows **mock data** for demonstration
- Real data integration happens when backend aggregation engine ready
- Sparkline data is randomly generated (will show real 7-day trend)

### Learning Curve

- **Time to first use:** 1-2 minutes (navigate to /analytics, see cards)
- **Time to customize:** 30 seconds (toggle cards on/off)
- **Time to understand trends:** 3-5 minutes (read trend indicators, understand colors)

---

## Testing Guide

### Test Checklist (F06-MH-02)

Use this checklist to verify the dashboard works as expected:

#### Navigation & Access
- [ ] Sidebar has "Analytics" link with 📈 icon
- [ ] Clicking Analytics navigates to `/analytics` route
- [ ] Page loads without errors
- [ ] Header shows "Analytics Dashboard" title

#### KPI Cards Display
- [ ] See exactly 6 KPI cards in default view (cost_daily, quality, error_rate, latency_p95, agent_count, success_rate)
- [ ] Each card displays:
  - [ ] Card title (e.g., "Daily Cost")
  - [ ] Large metric value (e.g., "$245.32")
  - [ ] Unit label (e.g., "USD")
  - [ ] Trend indicator with arrow and percentage (e.g., "↑ 25.0%")
  - [ ] 7-day sparkline chart (mini line graph)
- [ ] Metric values are formatted correctly:
  - [ ] Cost values show as "$X.XX" (currency)
  - [ ] Quality/success rates show as "X.X%" (percent)
  - [ ] Latency shows as "Xms" (milliseconds)
  - [ ] Agent count shows as "X" (number)

#### Color Coding
- [ ] Cost cards display in **red** (indicate watch/caution)
- [ ] Quality cards display in **green** (indicate good)
- [ ] Error rate displays in **red**
- [ ] Latency displays in **yellow/amber** (indicate caution)
- [ ] Success rate displays in **green**
- [ ] Agent count displays in **blue** (neutral)
- [ ] Sparklines match card color

#### Responsive Design
- [ ] On mobile (< 640px): cards stack to 1 column, full width
- [ ] On tablet (640px - 1024px): cards stack to 2 columns
- [ ] On desktop (> 1024px): cards display in 3 columns (2×3 grid)
- [ ] All cards readable on all screen sizes

#### Dashboard Customization
- [ ] "⚙️ Customize" button visible at top
- [ ] Click "⚙️ Customize" → toggles customizer panel open/closed
- [ ] Customizer shows all 9 available KPI metrics as checkboxes
- [ ] Default 6 cards are checked (visible)
- [ ] Unchecked cards (cost_total, token_spend, execution_duration_avg) are hidden
- [ ] Toggle a card OFF → card disappears from dashboard
- [ ] Toggle a card ON → card reappears in dashboard
- [ ] Click "Done" → customizer closes
- [ ] Customized layout persists after page refresh
  1. Toggle "Agent Count" OFF
  2. Refresh page
  3. Verify "Agent Count" still hidden
- [ ] Customized layout persists across browser tabs (if localStorage synced)

#### Loading States
- [ ] When `loading={true}`: see skeleton loaders instead of real data
- [ ] Skeleton loaders animate (pulse effect)
- [ ] Skeleton loaders show placeholder for: title, value, trend, sparkline
- [ ] After data loads: skeleton disappears, real data appears

#### Empty State
- [ ] If `summary?.metadata.total_executions === 0`: show "No execution data yet" message
- [ ] Message appears instead of KPI cards
- [ ] Message suggests: "Run some executions in the canvas to see metrics appear here"

#### Error States
- [ ] If fetch fails: show error message (not cards)
- [ ] Error message says: "Failed to load analytics data. Please try again later."
- [ ] No broken cards or "undefined" values

#### Trend Indicator
- [ ] Trend shows % change: e.g., "↑ 25.0%" means 25% increase
- [ ] Arrow points UP (↑) for increases
- [ ] Arrow points DOWN (↓) for decreases
- [ ] Trend color:
  - [ ] **Green** for "good" changes (quality/success up, cost/errors down)
  - [ ] **Red** for "bad" changes (quality/success down, cost/errors up)

---

## Quick Reference

### Component Files

| File | Purpose |
|------|---------|
| `/app/analytics/page.tsx` | Main analytics page, fetches summary data |
| `/app/analytics/layout.tsx` | Layout for analytics route |
| `/components/analytics/analytics-dashboard.tsx` | Dashboard grid, customizer logic, localStorage |
| `/components/analytics/kpi-card.tsx` | Single KPI card component with trend/sparkline |
| `/components/analytics/sparkline.tsx` | Mini recharts line chart for trends |
| `/components/analytics/dashboard-customizer.tsx` | Card toggle menu |
| `/components/analytics/kpi-card-skeleton.tsx` | Skeleton loader |
| `/hooks/use-analytics-summary.ts` | Data fetching hook (mock data for now) |
| `/lib/analytics-model.ts` | Data models & helpers (from F06-MH-01) |
| `/lib/analytics-aggregation.ts` | KPI aggregation engine (from F06-MH-01) |
| `/lib/anomaly-detector.ts` | Anomaly detection algorithms (from F06-MH-01) |

### Key Component Props

**`<KPICard />`**
```typescript
interface KPICardProps {
  metric: KPIMetricName;              // 'cost_daily', 'quality_score_avg', etc.
  currentValue: number;                // e.g., 245.32
  previousValue?: number;              // e.g., 200 (for trend calculation)
  sparklineData?: number[];            // e.g., [100, 120, 110, 130, ...]
  loading?: boolean;                   // Show skeleton while fetching
  onClick?: () => void;                // Expand to chart view (F06-MH-03)
  draggable?: boolean;                 // Enable drag-drop reordering
}
```

**`<AnalyticsDashboard />`**
```typescript
interface AnalyticsDashboardProps {
  summary?: KPISummary;                // Aggregated KPI data
  loading?: boolean;                   // Show skeletons while fetching
}
```

### Data Models

**KPISummary** (from `lib/analytics-model.ts`)
```typescript
interface KPISummary {
  timestamp: string;                   // ISO 8601
  period: 'last_24h' | 'last_7d' | 'last_30d' | 'ytd';
  kpis: {
    [K in KPIMetricName]?: number;    // e.g., { cost_daily: 245.32 }
  };
  trends?: {
    [K in KPIMetricName]?: {
      current: number;
      previous: number;
      percent_change: number;          // e.g., 25.0 for 25% increase
    };
  };
  metadata: {
    total_executions: number;
    total_agents: number;
    total_projects: number;
  };
}
```

### localStorage Keys

| Key | Value | Example |
|-----|-------|---------|
| `analytics-dashboard-layout` | JSON string with visible cards & order | `{"visible":["cost_daily","quality_score_avg"],"order":[...]}` |

---

## Debugging Guide

### Issue: Dashboard shows skeleton loaders forever

**Symptom:** Skeleton loaders animate indefinitely, data never appears

**Root causes:**
1. `useAnalyticsSummary` hook never resolves
2. API endpoint `/api/analytics/summary` returns error or hangs
3. Mock data fetch in hook fails silently

**Debug steps:**
1. Open browser DevTools → Console tab
2. Check for errors in console
3. Check Network tab → look for `/api/analytics/summary` request
4. If request shows 404 or 500 → backend endpoint issue
5. If request hangs → timeout issue (set dev server timeout higher)

**Solution:**
- Hook currently uses mock data, so should resolve immediately
- If stuck: check `hooks/use-analytics-summary.ts` for logic errors
- Verify `loading` state is set to `false` after data loaded

---

### Issue: Cards show undefined or NaN values

**Symptom:** Metric values display as "undefined" or "NaN"

**Root causes:**
1. `KPISummary.kpis[metric]` is null/undefined
2. `formatMetricValue()` received invalid input
3. Mock data not initialized properly

**Debug steps:**
1. Open DevTools → Console
2. Add temporary log in `kpi-card.tsx`:
   ```typescript
   console.log('KPICard metric:', metric, 'value:', currentValue);
   ```
3. Verify `currentValue` is a number (not null/undefined)
4. Check `formatMetricValue()` function in `lib/analytics-model.ts`

**Solution:**
- Ensure `summary` object is populated before rendering cards
- Mock data in `use-analytics-summary.ts` should always populate all KPI values
- Add null check: `currentValue ?? 0`

---

### Issue: localStorage layout not persisting

**Symptom:** Toggle cards off, refresh page, cards are back (visible again)

**Root causes:**
1. localStorage write failed (private/incognito mode blocks localStorage)
2. `saveLayout()` function not called
3. `useEffect` dependency missing

**Debug steps:**
1. Open DevTools → Application tab → localStorage
2. Look for key `analytics-dashboard-layout`
3. If not present: localStorage write failed
4. If present: check JSON value matches expected format

**Solution:**
- Chrome incognito mode doesn't allow localStorage
- Test in normal browsing mode
- Verify `saveLayout()` is called after `setVisibleCards()` and `setCardOrder()`

---

### Issue: Sparkline chart doesn't render

**Symptom:** Blank space where sparkline should be

**Root causes:**
1. `sparklineData` array is empty
2. Recharts `ResponsiveContainer` has 0 height
3. Chart library not imported

**Debug steps:**
1. Check `sparklineData` length in props
2. Verify `height={40}` in `Sparkline` component
3. Look for Recharts import errors in console

**Solution:**
- Mock data generator in `analytics-dashboard.tsx` should always create data
- Ensure `sparklineData.length > 0` before rendering
- Test with hardcoded data: `[100, 120, 110, 130, 115]`

---

### Issue: Colors don't match expected (red/green/blue)

**Symptom:** Cost card is blue instead of red, etc.

**Root causes:**
1. `getCardColor()` function logic wrong
2. Tailwind color classes not applied
3. CSS not loaded

**Debug steps:**
1. Open DevTools → Inspect element on card value
2. Check computed styles → look for color property
3. Verify `text-red-500`, `text-green-500`, etc. in class list
4. Check `tailwind.config.ts` includes correct colors

**Solution:**
- Review `getCardColor()` in `kpi-card.tsx` for logic
- Ensure all color classes are in Tailwind config
- Test with simpler color utility: `className="text-red-500"`

---

### Issue: Grid doesn't stack responsively

**Symptom:** Always 3 columns even on mobile, or always 1 column on desktop

**Root causes:**
1. Tailwind responsive classes not working
2. CSS media queries not supported
3. Container width wrong

**Debug steps:**
1. Resize browser window, check if layout changes
2. Open DevTools → Device emulation (mobile)
3. Check applied Tailwind classes: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
4. Verify viewport meta tag in `app/layout.tsx`

**Solution:**
- Ensure `app/layout.tsx` has viewport meta tag
- Test in actual mobile device if possible
- Use DevTools device emulation (iPhone, iPad, Desktop)

---

## Known Issues & Workarounds

### 1. Mock Data Only
**Issue:** Dashboard shows random/placeholder data, not real metrics

**Status:** Expected (backend not integrated yet)

**Workaround:** 
- Data will be real once `useAnalyticsSummary` hook integrated with API
- For now, test UI with mock data

**Target fix:** After F06-MH-01 backend complete

---

### 2. No Drag-Drop Reordering
**Issue:** "⚙️ Customize" menu only has toggle checkboxes, no drag-drop

**Status:** Expected (Phase 2 enhancement)

**Workaround:**
- Use toggle to hide/show cards
- Card order is fixed (but persists if you add/remove cards)

**Target fix:** F06-SH-01 (drag-drop library integration)

---

### 3. No Drill-Down Charts
**Issue:** Clicking KPI card doesn't expand to full-screen chart

**Status:** Expected (F06-MH-03)

**Workaround:**
- Charts coming in next milestone
- Currently see only sparkline mini-chart

**Target fix:** F06-MH-03

---

## FAQ

**Q: How do I see real data instead of mock data?**
A: Once the backend aggregation engine (F06-MH-01) is complete and API endpoint ready, update `useAnalyticsSummary` hook to call real API. Currently using mock data for UI/UX validation.

**Q: Can I export the KPI data?**
A: Export is coming in F06-MH-06. For now, you can screenshot the dashboard or inspect the summary data in DevTools console.

**Q: How often do metrics update?**
A: Real-time updates every 5 seconds (WebSocket batching). Currently mock data shows static values. Will refresh when backend ready.

**Q: Can I see metrics by specific agent or project?**
A: Drill-down filtering comes in F06-MH-03. Currently dashboard shows global metrics only.

**Q: What does the trend percentage mean?**
A: Percent change from previous period. "↑ 25%" = 25% increase from yesterday. "↓ 10%" = 10% decrease from yesterday. Color indicates if change is good (green) or bad (red) for that metric.

**Q: How long is data retained?**
A: 90-day rolling window. Older data is archived automatically. Full historical data available via reports (F06-MH-06).

---

## Component Hierarchy

```
/analytics (route)
├── <AnalyticsDashboard>
│   ├── <DashboardCustomizer>
│   │   └── Checkboxes for each KPI
│   └── Grid of KPI cards
│       ├── <KPICard>
│       │   ├── <Sparkline>
│       │   │   └── recharts LineChart
│       │   └── Trend indicator
│       ├── <KPICard>
│       ├── ... (repeats)
│       └── Loading state: array of <KPICardSkeleton>
```

---

## Data Flow

```
User navigates to /analytics
        ↓
AnalyticsPage loads
        ↓
useAnalyticsSummary hook fetches KPI data
        ↓
<AnalyticsDashboard> receives KPISummary + loading state
        ↓
If loading: render <KPICardSkeleton> array
If error: render error message
If empty: render empty state message
        ↓
Render <KPICard> for each visible metric
        ↓
Each <KPICard> formats value, calculates trend, renders <Sparkline>
        ↓
User toggles cards via <DashboardCustomizer>
        ↓
localStorage updated, layout persists
```

---

## File Structure

```
app/
├── analytics/
│   ├── layout.tsx          # Analytics route layout
│   └── page.tsx            # Main dashboard page
│
components/
├── analytics/
│   ├── analytics-dashboard.tsx      # Dashboard grid + customizer
│   ├── kpi-card.tsx                 # Single KPI card
│   ├── sparkline.tsx                # Mini recharts line chart
│   ├── dashboard-customizer.tsx     # Card toggle menu
│   └── kpi-card-skeleton.tsx        # Loading skeleton
│
hooks/
├── use-analytics-summary.ts         # Data fetching hook (mock)
│
lib/
├── analytics-model.ts               # Data models & helpers
├── analytics-aggregation.ts         # KPI aggregation engine
└── anomaly-detector.ts              # Anomaly detection algorithms
```

---

## Related Documentation

- **Task File:** `/docs/tasks/feature-06-analytics-pane.md` (tracks F06-MH-01, F06-MH-02 progress)
- **Architecture:** `/docs/architecture/feature-06-architecture.md` (system design)
- **Data Models:** `/lib/analytics-model.ts` (type definitions)

---

## Next Steps (Upcoming Features)

**F06-MH-03:** Time-series chart viewer
- Click KPI card → expand to full-screen chart
- Zoom, pan, drill-down by agent/project/task type
- Export chart as PNG

**F06-MH-04:** Threshold-based alerting
- Configure alerts (e.g., "warn if cost > $100")
- Toast notifications when alerts fire
- Alert history and muting

**F06-MH-05:** Anomaly detection
- Moving average spike detection (7-day window)
- Percent-change detection (20% default)
- Confidence scoring, root cause hints

**F06-MH-06:** Report export
- Export metrics as CSV, JSON, or PDF
- Include charts and summary tables
- Date range and filter selection

---

*For more details, see `/docs/architecture/feature-06-architecture.md`*
