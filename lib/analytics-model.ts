/**
 * Analytics Data Model & Schema
 * Feature: F06-MH-01 (Analytics Pane - KPI Aggregation Pipeline)
 *
 * Defines TypeScript interfaces for analytics metrics, time-series events,
 * KPI aggregations, anomaly detection, and alert configurations.
 *
 * Database: Postgres + TimescaleDB (time-series tables with auto-downsampling)
 * Real-time: WebSocket events (batched every 5 seconds)
 * Storage: 90-day rolling window (older data auto-archived)
 * Query Latency: <500ms for 30-day history + 9 KPIs
 */

// ============================================================================
// CORE TIME-SERIES METRIC EVENT
// ============================================================================

/**
 * Core metric event (one per heartbeat, ~10s intervals)
 * Granularity: agent_id, project_id, task_type, status
 */
export interface MetricEvent {
  id: string;                    // UUID
  timestamp: string;             // ISO 8601, 10s granularity
  agent_id: string;              // Which agent produced this metric
  project_id: string;            // Which project context
  task_type: string;             // e.g., 'code_gen', 'test', 'deploy'
  status: 'processing' | 'success' | 'failed' | 'queued';

  // Execution metrics
  cost_usd: number;              // Cost in dollars (per execution)
  quality_score: number;         // 0-100 (quality of output)
  error_occurred: boolean;       // Did error occur?
  latency_ms: number;            // Execution duration
  tokens_used: number;           // LLM tokens consumed
  tokens_per_second: number;     // Token throughput

  // Anomaly detection metadata (added by anomaly detector)
  anomaly?: {
    type: 'spike' | 'dip' | 'trend_change';
    metric_name: string;         // 'cost', 'quality', 'latency', etc.
    magnitude: number;            // % change or std dev multiple
    confidence: number;           // 0-1 (confidence in anomaly)
    baseline_value: number;       // What was expected
    actual_value: number;         // What was observed
  };
}

// ============================================================================
// KPI DEFINITIONS & AGGREGATIONS
// ============================================================================

/**
 * KPI metric names (used in dashboards, queries, and exports)
 */
export type KPIMetricName =
  | 'cost_total'               // Total cost YTD or period
  | 'cost_daily'               // Daily average cost
  | 'quality_score_avg'        // Average quality score
  | 'error_rate'               // % of tasks that failed
  | 'latency_p95'              // 95th percentile latency
  | 'agent_count_active'       // # of active agents
  | 'success_rate'             // % of successful executions
  | 'token_spend'              // Total tokens consumed
  | 'execution_duration_avg';  // Average execution time

/**
 * KPI aggregation levels (time + dimension)
 */
export interface KPIAggregation {
  metric_name: KPIMetricName;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  granularity: 'by_agent' | 'by_project' | 'by_task_type' | 'global';
  timestamp: string;           // ISO 8601 (start of period)
  value: number;               // Aggregated value
  dimensions?: {
    agent_id?: string;
    project_id?: string;
    task_type?: string;
  };
  percentiles?: {
    p50: number;
    p95: number;
    p99: number;
  };
}

// ============================================================================
// AGGREGATION COMPUTATION RESULTS
// ============================================================================

/**
 * Pre-computed KPI summary (computed hourly, available sub-1s)
 * Used for dashboard display and real-time metric updates
 */
export interface KPISummary {
  timestamp: string;           // ISO 8601 (current time)
  period: 'last_24h' | 'last_7d' | 'last_30d' | 'ytd';
  kpis: {
    [K in KPIMetricName]?: number;
  };
  trends?: {
    [K in KPIMetricName]?: {
      current: number;
      previous: number;
      percent_change: number;
    };
  };
  metadata: {
    total_executions: number;
    total_agents: number;
    total_projects: number;
  };
}

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

/**
 * Anomaly detection result (computed every 5 minutes)
 * Uses two algorithms: moving average spike detection + percent-change
 */
export interface AnomalyDetectionResult {
  id: string;                  // UUID
  timestamp: string;           // ISO 8601 (when anomaly detected)
  metric_name: KPIMetricName;
  algorithm: 'spike_detection' | 'percent_change';
  
  // Spike detection (moving average)
  moving_avg_window?: number;  // e.g., 7 days
  std_dev_multiplier?: number; // e.g., 2.0
  
  // Percent-change detection
  percent_change_threshold?: number; // e.g., 20%
  comparison_period?: 'vs_yesterday' | 'vs_last_week';

  // Results
  baseline_value: number;
  actual_value: number;
  magnitude: number;           // % or std dev
  confidence: number;          // 0-1 (confidence > 0.7 only displayed)
  severity: 'low' | 'medium' | 'high';

  // Context
  affected_dimension?: {
    agent_id?: string;
    project_id?: string;
    task_type?: string;
  };

  // Root cause hints (heuristic-based, Phase 1)
  root_cause_hint?: string;    // e.g., "Agent X processed 2x normal task volume"
}

// ============================================================================
// ALERT RULES & CONFIGURATIONS
// ============================================================================

/**
 * Alert rule (user-configurable threshold monitoring)
 */
export interface AlertRule {
  id: string;                  // UUID
  name: string;                // User-friendly name
  metric_name: KPIMetricName;
  enabled: boolean;
  
  // Threshold configuration
  threshold_type: 'absolute' | 'relative' | 'percentile';
  threshold_value: number;     // e.g., 100 for "$100/day"
  
  // For relative thresholds
  relative_change_percent?: number; // e.g., 10% increase
  comparison_period?: 'vs_yesterday' | 'vs_last_week';
  
  // For compound conditions (Phase 2)
  compound_conditions?: {
    metric_name: KPIMetricName;
    operator: 'AND' | 'OR';
    threshold_value: number;
  }[];

  // Alert actions
  alert_actions: AlertAction[];

  // Alert fatigue control
  debounce_minutes: number;    // e.g., 5 (max 1 alert per 5 min)
  require_consecutive_breaches?: number; // e.g., 2 (require 2 data points)

  // Muting
  muted_until?: string;        // ISO 8601 (when mute expires)
  mute_reason?: string;

  // Metadata
  severity: 'info' | 'warning' | 'critical';
  created_at: string;          // ISO 8601
  updated_at: string;          // ISO 8601
}

/**
 * Alert action (where to send alert)
 */
export interface AlertAction {
  type: 'in_app' | 'email' | 'slack_webhook'; // (email/slack = Phase 2)
  enabled: boolean;
  config?: {
    email?: string;            // For email action
    slack_webhook_url?: string; // For Slack action
  };
}

/**
 * Alert triggered event (logged when alert fires)
 */
export interface AlertTriggeredEvent {
  id: string;                  // UUID
  alert_rule_id: string;
  timestamp: string;           // ISO 8601
  metric_name: KPIMetricName;
  value: number;               // Metric value that triggered alert
  threshold: number;
  status: 'triggered' | 'resolved' | 'muted';
  actions_executed: {
    action_type: string;
    success: boolean;
    error?: string;
  }[];
}

// ============================================================================
// TIME-SERIES CHART QUERIES
// ============================================================================

/**
 * Query request for time-series chart data
 */
export interface TimeSeriesQueryRequest {
  metric_names: KPIMetricName[];
  date_range: {
    start: string;             // ISO 8601
    end: string;               // ISO 8601
  };
  resolution: 'hourly' | 'daily' | 'weekly'; // Granularity
  
  // Drill-down filters (optional)
  filters?: {
    agent_id?: string;
    project_id?: string;
    task_type?: string;
  };
}

/**
 * Query result for time-series data
 */
export interface TimeSeriesQueryResult {
  metric_name: KPIMetricName;
  data_points: {
    timestamp: string;         // ISO 8601
    value: number;
    percentiles?: {
      p50: number;
      p95: number;
      p99: number;
    };
    anomalies?: AnomalyDetectionResult[];
  }[];
  total_data_points: number;
  query_time_ms: number;       // Should be <500ms
}

// ============================================================================
// REPORT EXPORT
// ============================================================================

/**
 * Report export configuration
 */
export interface ReportExportRequest {
  format: 'csv' | 'json' | 'pdf';
  date_range: {
    start: string;             // ISO 8601
    end: string;               // ISO 8601
  };
  kpi_metrics: KPIMetricName[]; // Which KPIs to include
  include_charts: boolean;
  include_tables: boolean;
  
  // Filters (optional)
  filters?: {
    agent_id?: string;
    project_id?: string;
    task_type?: string;
  };

  // PDF styling (optional)
  branding?: {
    title?: string;
    logo_url?: string;
    include_company_name?: boolean;
  };
}

/**
 * Generated report metadata
 */
export interface Report {
  id: string;                  // UUID
  name: string;                // Auto-generated from date range + filters
  format: 'csv' | 'json' | 'pdf';
  download_url: string;        // S3 or CDN URL
  created_at: string;          // ISO 8601
  expires_at: string;          // ISO 8601 (delete after 7 days)
  file_size_bytes: number;
  generated_ms: number;        // How long to generate
}

// ============================================================================
// DASHBOARD CUSTOMIZATION
// ============================================================================

/**
 * Dashboard layout configuration (user-customizable)
 */
export interface DashboardLayout {
  id: string;                  // UUID
  name: string;                // e.g., "Team View", "Cost View"
  is_default: boolean;
  kpi_cards: {
    metric_name: KPIMetricName;
    position: number;          // Grid position (0-5)
    visible: boolean;
    size: 'small' | 'medium' | 'large'; // Card size variant
  }[];
  theme?: {
    color_scheme: 'light' | 'dark';
    accent_color?: string;
  };
  created_at: string;          // ISO 8601
  updated_at: string;          // ISO 8601
}

/**
 * Preset dashboard views (built-in)
 */
export const PRESET_DASHBOARDS: DashboardLayout[] = [
  {
    id: 'preset-team-view',
    name: 'Team View',
    is_default: true,
    kpi_cards: [
      { metric_name: 'cost_daily', position: 0, visible: true, size: 'medium' },
      { metric_name: 'success_rate', position: 1, visible: true, size: 'medium' },
      { metric_name: 'quality_score_avg', position: 2, visible: true, size: 'medium' },
      { metric_name: 'error_rate', position: 3, visible: true, size: 'medium' },
      { metric_name: 'latency_p95', position: 4, visible: true, size: 'medium' },
      { metric_name: 'agent_count_active', position: 5, visible: true, size: 'medium' },
    ],
    theme: { color_scheme: 'light' },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'preset-cost-view',
    name: 'Cost View',
    is_default: false,
    kpi_cards: [
      { metric_name: 'cost_total', position: 0, visible: true, size: 'large' },
      { metric_name: 'cost_daily', position: 1, visible: true, size: 'large' },
      { metric_name: 'token_spend', position: 2, visible: true, size: 'medium' },
      { metric_name: 'agent_count_active', position: 3, visible: true, size: 'medium' },
      { metric_name: 'success_rate', position: 4, visible: false, size: 'medium' },
      { metric_name: 'quality_score_avg', position: 5, visible: false, size: 'medium' },
    ],
    theme: { color_scheme: 'light' },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get KPI display name and unit
 */
export function getKPIMetadata(metric: KPIMetricName) {
  const metadata: Record<KPIMetricName, { label: string; unit: string; format: 'currency' | 'percent' | 'number' | 'duration' }> = {
    cost_total: { label: 'Total Cost YTD', unit: 'USD', format: 'currency' },
    cost_daily: { label: 'Daily Cost', unit: 'USD', format: 'currency' },
    quality_score_avg: { label: 'Avg Quality', unit: '%', format: 'percent' },
    error_rate: { label: 'Error Rate', unit: '%', format: 'percent' },
    latency_p95: { label: 'Latency (p95)', unit: 'ms', format: 'duration' },
    agent_count_active: { label: 'Active Agents', unit: 'count', format: 'number' },
    success_rate: { label: 'Success Rate', unit: '%', format: 'percent' },
    token_spend: { label: 'Token Spend', unit: 'tokens', format: 'number' },
    execution_duration_avg: { label: 'Avg Duration', unit: 'ms', format: 'duration' },
  };
  return metadata[metric];
}

/**
 * Format metric value for display
 */
export function formatMetricValue(value: number, metric: KPIMetricName): string {
  const meta = getKPIMetadata(metric);
  switch (meta.format) {
    case 'currency':
      return `$${value.toFixed(2)}`;
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'duration':
      return `${value.toFixed(0)}ms`;
    case 'number':
    default:
      return value.toFixed(0);
  }
}

/**
 * Get color coding for KPI (red/orange/green)
 */
export function getKPIColor(metric: KPIMetricName, value: number): string {
  if (metric.includes('cost') || metric === 'error_rate' || metric === 'latency_p95') {
    // Lower is better
    if (metric.includes('cost')) {
      if (value < 50) return 'text-green-600';
      if (value < 200) return 'text-amber-600';
      return 'text-red-600';
    }
  } else {
    // Higher is better (quality, success rate)
    if (value >= 90) return 'text-green-600';
    if (value >= 70) return 'text-amber-600';
    return 'text-red-600';
  }
  return 'text-gray-600';
}
