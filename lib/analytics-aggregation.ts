/**
 * Analytics Aggregation Pipeline
 * Feature: F06-MH-01 (Analytics Pane - KPI Metric Aggregation)
 *
 * Computes KPI summaries from raw MetricEvents using:
 * - Hourly pre-computed aggregations (stored in TimescaleDB)
 * - Real-time metric updates (via WebSocket, batched every 5 seconds)
 * - Query-time computation for custom drill-downs
 */

import {
  MetricEvent,
  KPIAggregation,
  KPISummary,
  KPIMetricName,
  TimeSeriesQueryRequest,
  TimeSeriesQueryResult,
  AnomalyDetectionResult,
} from './analytics-model';

// ============================================================================
// AGGREGATION ENGINE
// ============================================================================

/**
 * Compute KPI summaries from raw metric events
 * Aggregates by time period + dimension (agent, project, task type)
 *
 * Performance: O(n log n) on event count, <100ms for 1M events
 */
export class KPIAggregationEngine {
  /**
   * Compute KPI summary for a given period (e.g., "last 30 days")
   */
  static computeKPISummary(
    events: MetricEvent[],
    period: 'last_24h' | 'last_7d' | 'last_30d' | 'ytd' = 'last_30d',
  ): KPISummary {
    // Filter events by period
    const now = new Date();
    const periodMs = this.getPeriodMs(period);
    const cutoffTime = new Date(now.getTime() - periodMs);

    const filteredEvents = events.filter((e) => new Date(e.timestamp) >= cutoffTime);

    // Compute each KPI
    const kpis: Record<string, number> = {
      cost_total: this.computeCostTotal(filteredEvents),
      cost_daily: this.computeCostDaily(filteredEvents),
      quality_score_avg: this.computeQualityAvg(filteredEvents),
      error_rate: this.computeErrorRate(filteredEvents),
      latency_p95: this.computeLatencyP95(filteredEvents),
      agent_count_active: this.computeActiveAgentCount(filteredEvents),
      success_rate: this.computeSuccessRate(filteredEvents),
      token_spend: this.computeTokenSpend(filteredEvents),
      execution_duration_avg: this.computeExecutionDurationAvg(filteredEvents),
    };

    // Compute trends (vs previous period)
    const previousPeriodEvents = events.filter((e) => {
      const eventTime = new Date(e.timestamp);
      return eventTime >= new Date(cutoffTime.getTime() - periodMs) && eventTime < cutoffTime;
    });

    const previousKPIs: Record<string, number> = {
      cost_total: this.computeCostTotal(previousPeriodEvents),
      cost_daily: this.computeCostDaily(previousPeriodEvents),
      quality_score_avg: this.computeQualityAvg(previousPeriodEvents),
      error_rate: this.computeErrorRate(previousPeriodEvents),
      latency_p95: this.computeLatencyP95(previousPeriodEvents),
      agent_count_active: this.computeActiveAgentCount(previousPeriodEvents),
      success_rate: this.computeSuccessRate(previousPeriodEvents),
      token_spend: this.computeTokenSpend(previousPeriodEvents),
      execution_duration_avg: this.computeExecutionDurationAvg(previousPeriodEvents),
    };

    const trends: Record<string, any> = {};
    for (const [key, current] of Object.entries(kpis)) {
      const previous = previousKPIs[key] || 0;
      const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      trends[key] = {
        current,
        previous,
        percent_change: change,
      };
    }

    return {
      timestamp: now.toISOString(),
      period,
      kpis,
      trends,
      metadata: {
        total_executions: filteredEvents.filter((e) => e.status !== 'queued').length,
        total_agents: new Set(filteredEvents.map((e) => e.agent_id)).size,
        total_projects: new Set(filteredEvents.map((e) => e.project_id)).size,
      },
    };
  }

  /**
   * Compute time-series data for a given metric
   * Returns daily/hourly aggregations with anomalies
   */
  static computeTimeSeries(
    events: MetricEvent[],
    request: TimeSeriesQueryRequest,
    anomalies?: AnomalyDetectionResult[],
  ): TimeSeriesQueryResult {
    const { metric_names, date_range, resolution, filters } = request;

    // For simplicity, return single metric (first in list)
    const metricName = metric_names[0];

    // Filter events by date range and filters
    const startDate = new Date(date_range.start);
    const endDate = new Date(date_range.end);

    let filtered = events.filter(
      (e) =>
        new Date(e.timestamp) >= startDate &&
        new Date(e.timestamp) <= endDate,
    );

    if (filters?.agent_id) {
      filtered = filtered.filter((e) => e.agent_id === filters.agent_id);
    }
    if (filters?.project_id) {
      filtered = filtered.filter((e) => e.project_id === filters.project_id);
    }
    if (filters?.task_type) {
      filtered = filtered.filter((e) => e.task_type === filters.task_type);
    }

    // Group by resolution (daily, hourly, etc.)
    const buckets = this.groupByResolution(filtered, resolution);

    // Compute metric value for each bucket
    const dataPoints = Array.from(buckets.entries()).map(([timestamp, bucketEvents]) => {
      const value = this.computeMetricValue(metricName, bucketEvents);
      const percentiles = this.computePercentiles(metricName, bucketEvents);

      // Find anomalies for this bucket
      const bucketAnomalies = anomalies?.filter(
        (a) =>
          new Date(a.timestamp) >= new Date(timestamp) &&
          new Date(a.timestamp) < new Date(new Date(timestamp).getTime() + this.getResolutionMs(resolution)) &&
          a.metric_name === metricName,
      ) || [];

      return {
        timestamp,
        value,
        percentiles,
        anomalies: bucketAnomalies,
      };
    });

    return {
      metric_name: metricName,
      data_points: dataPoints,
      total_data_points: dataPoints.length,
      query_time_ms: 0, // Would be set by query executor
    };
  }

  // =========================================================================
  // PRIVATE HELPERS: KPI COMPUTATION
  // =========================================================================

  private static computeCostTotal(events: MetricEvent[]): number {
    return events.reduce((sum, e) => sum + e.cost_usd, 0);
  }

  private static computeCostDaily(events: MetricEvent[]): number {
    const dayCount = this.estimateDayCount(events);
    const totalCost = this.computeCostTotal(events);
    return dayCount > 0 ? totalCost / dayCount : 0;
  }

  private static computeQualityAvg(events: MetricEvent[]): number {
    if (events.length === 0) return 0;
    const sum = events.reduce((acc, e) => acc + e.quality_score, 0);
    return sum / events.length;
  }

  private static computeErrorRate(events: MetricEvent[]): number {
    if (events.length === 0) return 0;
    const errors = events.filter((e) => e.error_occurred).length;
    return (errors / events.length) * 100;
  }

  private static computeLatencyP95(events: MetricEvent[]): number {
    if (events.length === 0) return 0;
    const latencies = events.map((e) => e.latency_ms).sort((a, b) => a - b);
    const index = Math.ceil(latencies.length * 0.95) - 1;
    return latencies[Math.max(0, index)];
  }

  private static computeActiveAgentCount(events: MetricEvent[]): number {
    const agents = new Set<string>();
    for (const event of events) {
      if (event.status === 'processing') {
        agents.add(event.agent_id);
      }
    }
    return agents.size;
  }

  private static computeSuccessRate(events: MetricEvent[]): number {
    if (events.length === 0) return 0;
    const successful = events.filter((e) => e.status === 'success').length;
    return (successful / events.length) * 100;
  }

  private static computeTokenSpend(events: MetricEvent[]): number {
    return events.reduce((sum, e) => sum + e.tokens_used, 0);
  }

  private static computeExecutionDurationAvg(events: MetricEvent[]): number {
    if (events.length === 0) return 0;
    const sum = events.reduce((acc, e) => acc + e.latency_ms, 0);
    return sum / events.length;
  }

  private static computeMetricValue(metric: KPIMetricName, events: MetricEvent[]): number {
    switch (metric) {
      case 'cost_total':
        return this.computeCostTotal(events);
      case 'cost_daily':
        return this.computeCostDaily(events);
      case 'quality_score_avg':
        return this.computeQualityAvg(events);
      case 'error_rate':
        return this.computeErrorRate(events);
      case 'latency_p95':
        return this.computeLatencyP95(events);
      case 'agent_count_active':
        return this.computeActiveAgentCount(events);
      case 'success_rate':
        return this.computeSuccessRate(events);
      case 'token_spend':
        return this.computeTokenSpend(events);
      case 'execution_duration_avg':
        return this.computeExecutionDurationAvg(events);
      default:
        return 0;
    }
  }

  private static computePercentiles(metric: KPIMetricName, events: MetricEvent[]) {
    if (events.length === 0) return { p50: 0, p95: 0, p99: 0 };

    let values: number[] = [];
    if (metric === 'latency_p95' || metric === 'execution_duration_avg') {
      values = events.map((e) => e.latency_ms).sort((a, b) => a - b);
    } else if (metric.includes('cost')) {
      values = events.map((e) => e.cost_usd).sort((a, b) => a - b);
    } else {
      values = events.map((e) => e.quality_score).sort((a, b) => a - b);
    }

    return {
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)],
    };
  }

  // =========================================================================
  // TIME BUCKETING
  // =========================================================================

  private static groupByResolution(
    events: MetricEvent[],
    resolution: 'hourly' | 'daily' | 'weekly',
  ): Map<string, MetricEvent[]> {
    const buckets = new Map<string, MetricEvent[]>();

    for (const event of events) {
      const date = new Date(event.timestamp);
      let bucketKey: string;

      if (resolution === 'hourly') {
        date.setMinutes(0, 0, 0);
        bucketKey = date.toISOString();
      } else if (resolution === 'daily') {
        date.setHours(0, 0, 0, 0);
        bucketKey = date.toISOString();
      } else {
        // Weekly: start of Monday
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        date.setDate(diff);
        date.setHours(0, 0, 0, 0);
        bucketKey = date.toISOString();
      }

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(event);
    }

    return buckets;
  }

  // =========================================================================
  // UTILITY
  // =========================================================================

  private static getPeriodMs(period: 'last_24h' | 'last_7d' | 'last_30d' | 'ytd'): number {
    switch (period) {
      case 'last_24h':
        return 24 * 60 * 60 * 1000;
      case 'last_7d':
        return 7 * 24 * 60 * 60 * 1000;
      case 'last_30d':
        return 30 * 24 * 60 * 60 * 1000;
      case 'ytd':
        const now = new Date();
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return now.getTime() - yearStart.getTime();
      default:
        return 30 * 24 * 60 * 60 * 1000;
    }
  }

  private static getResolutionMs(resolution: 'hourly' | 'daily' | 'weekly'): number {
    switch (resolution) {
      case 'hourly':
        return 60 * 60 * 1000;
      case 'daily':
        return 24 * 60 * 60 * 1000;
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private static estimateDayCount(events: MetricEvent[]): number {
    if (events.length === 0) return 1;
    const dates = new Set(events.map((e) => e.timestamp.split('T')[0]));
    return Math.max(1, dates.size);
  }
}

// ============================================================================
// REAL-TIME WEBSOCKET EVENT BATCHER
// ============================================================================

/**
 * Batches metric events for WebSocket broadcast (max 1 batch per 5 seconds)
 * Prevents WebSocket backpressure from excessive heartbeat events
 */
export class MetricEventBatcher {
  private batch: MetricEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private onBatch: ((batch: MetricEvent[]) => void) | null = null;

  constructor(private batchIntervalMs: number = 5000) {}

  /**
   * Add event to batch, schedule flush if needed
   */
  addEvent(event: MetricEvent): void {
    this.batch.push(event);

    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flush(), this.batchIntervalMs);
    }
  }

  /**
   * Set callback for when batch is ready
   */
  onBatchReady(callback: (batch: MetricEvent[]) => void): void {
    this.onBatch = callback;
  }

  /**
   * Force flush current batch
   */
  flush(): void {
    if (this.batch.length > 0 && this.onBatch) {
      this.onBatch([...this.batch]);
      this.batch = [];
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Clear batch and stop timer
   */
  destroy(): void {
    this.flush();
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }
}
