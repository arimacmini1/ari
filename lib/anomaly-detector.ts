/**
 * Anomaly Detection Engine
 * Feature: F06-MH-01 (Analytics Pane - Anomaly Detection)
 *
 * Implements two algorithms:
 * 1. Spike Detection: Moving average ± 2 std dev
 * 2. Percent-Change: Detects >X% change from previous period
 *
 * Confidence threshold: >0.7 to display
 * False positive rate target: <10% for cost spikes, <15% for quality dips
 */

import { MetricEvent, KPIMetricName, AnomalyDetectionResult } from './analytics-model';

// ============================================================================
// ANOMALY DETECTION ENGINE
// ============================================================================

export class AnomalyDetector {
  /**
   * Default parameters for anomaly detection
   */
  private static readonly DEFAULTS = {
    movingAverageWindow: 7,      // 7 days
    stdDevMultiplier: 2.0,        // 2 std deviations
    percentChangeThreshold: 20,   // 20% change
    confidenceThreshold: 0.7,     // Only show if confidence > 0.7
  };

  /**
   * Detect anomalies in metric events using both algorithms
   */
  static detectAnomalies(
    events: MetricEvent[],
    metricNames: KPIMetricName[] = [
      'cost_daily',
      'quality_score_avg',
      'error_rate',
      'latency_p95',
    ],
  ): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    for (const metric of metricNames) {
      // Algorithm 1: Spike detection (moving average)
      const spikeAnomalies = this.detectSpikes(events, metric);
      anomalies.push(...spikeAnomalies);

      // Algorithm 2: Percent-change detection
      const percentChangeAnomalies = this.detectPercentChange(events, metric);
      anomalies.push(...percentChangeAnomalies);
    }

    // Filter by confidence threshold and sort by timestamp
    return anomalies
      .filter((a) => a.confidence >= this.DEFAULTS.confidenceThreshold)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Spike detection using moving average and standard deviation
   *
   * Algorithm:
   * 1. Compute 7-day moving average
   * 2. Compute standard deviation
   * 3. Flag points > 2 std dev from average
   * 4. Calculate confidence based on deviation magnitude
   */
  private static detectSpikes(events: MetricEvent[], metric: KPIMetricName): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    // Group events by day and compute daily metric values
    const dailyValues = this.computeDailyValues(events, metric);

    if (dailyValues.length < this.DEFAULTS.movingAverageWindow) {
      // Not enough data for moving average
      return anomalies;
    }

    // Compute moving average and std dev
    for (let i = this.DEFAULTS.movingAverageWindow; i < dailyValues.length; i++) {
      const window = dailyValues.slice(i - this.DEFAULTS.movingAverageWindow, i);
      const values = window.map((v) => v.value);
      const movingAvg = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - movingAvg, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      const currentValue = dailyValues[i].value;
      const zScore = stdDev > 0 ? Math.abs(currentValue - movingAvg) / stdDev : 0;

      if (zScore > this.DEFAULTS.stdDevMultiplier) {
        // Spike detected
        const magnitude = ((currentValue - movingAvg) / movingAvg) * 100;
        const confidence = Math.min(1, zScore / (this.DEFAULTS.stdDevMultiplier * 2));

        anomalies.push({
          id: `anomaly-${Date.now()}-${Math.random()}`,
          timestamp: dailyValues[i].date,
          metric_name: metric,
          algorithm: 'spike_detection',
          moving_avg_window: this.DEFAULTS.movingAverageWindow,
          std_dev_multiplier: this.DEFAULTS.stdDevMultiplier,
          baseline_value: movingAvg,
          actual_value: currentValue,
          magnitude: Math.abs(magnitude),
          confidence,
          severity: this.calculateSeverity(Math.abs(magnitude)),
          root_cause_hint: this.generateRootCauseHint(metric, magnitude),
        });
      }
    }

    return anomalies;
  }

  /**
   * Percent-change detection
   *
   * Algorithm:
   * 1. Compare each day's metric to previous day (or previous week)
   * 2. Flag if change > threshold (default 20%)
   * 3. Calculate confidence based on change magnitude
   */
  private static detectPercentChange(events: MetricEvent[], metric: KPIMetricName): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    const dailyValues = this.computeDailyValues(events, metric);

    if (dailyValues.length < 2) {
      return anomalies;
    }

    for (let i = 1; i < dailyValues.length; i++) {
      const current = dailyValues[i].value;
      const previous = dailyValues[i - 1].value;

      if (previous === 0) continue;

      const percentChange = Math.abs((current - previous) / previous) * 100;

      if (percentChange > this.DEFAULTS.percentChangeThreshold) {
        // Percent change exceeded threshold
        const direction = current > previous ? 'increase' : 'decrease';
        const confidence = Math.min(1, percentChange / (this.DEFAULTS.percentChangeThreshold * 2));

        anomalies.push({
          id: `anomaly-${Date.now()}-${Math.random()}`,
          timestamp: dailyValues[i].date,
          metric_name: metric,
          algorithm: 'percent_change',
          percent_change_threshold: this.DEFAULTS.percentChangeThreshold,
          comparison_period: 'vs_yesterday',
          baseline_value: previous,
          actual_value: current,
          magnitude: percentChange,
          confidence,
          severity: this.calculateSeverity(percentChange),
          root_cause_hint: this.generateRootCauseHint(metric, percentChange, direction),
        });
      }
    }

    return anomalies;
  }

  /**
   * Compute daily aggregated metric values
   */
  private static computeDailyValues(events: MetricEvent[], metric: KPIMetricName): Array<{ date: string; value: number }> {
    const dailyMap = new Map<string, MetricEvent[]>();

    for (const event of events) {
      const date = event.timestamp.split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, []);
      }
      dailyMap.get(date)!.push(event);
    }

    const dailyValues = Array.from(dailyMap.entries())
      .map(([date, dayEvents]) => ({
        date: `${date}T00:00:00Z`,
        value: this.computeMetricValue(metric, dayEvents),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return dailyValues;
  }

  /**
   * Compute metric value for a set of events
   */
  private static computeMetricValue(metric: KPIMetricName, events: MetricEvent[]): number {
    if (events.length === 0) return 0;

    switch (metric) {
      case 'cost_daily':
        return events.reduce((sum, e) => sum + e.cost_usd, 0);

      case 'quality_score_avg':
        return events.reduce((sum, e) => sum + e.quality_score, 0) / events.length;

      case 'error_rate':
        const errors = events.filter((e) => e.error_occurred).length;
        return (errors / events.length) * 100;

      case 'latency_p95':
        const latencies = events.map((e) => e.latency_ms).sort((a, b) => a - b);
        const p95Index = Math.ceil(latencies.length * 0.95) - 1;
        return latencies[Math.max(0, p95Index)];

      case 'cost_total':
      case 'agent_count_active':
      case 'success_rate':
      case 'token_spend':
      case 'execution_duration_avg':
        // Not typically used for anomaly detection, but support for completeness
        return 0;

      default:
        return 0;
    }
  }

  /**
   * Calculate severity level based on magnitude
   */
  private static calculateSeverity(magnitude: number): 'low' | 'medium' | 'high' {
    if (magnitude > 50) return 'high';
    if (magnitude > 20) return 'medium';
    return 'low';
  }

  /**
   * Generate a heuristic-based root cause hint
   * Note: These are simple heuristics. True RCA requires ML/causal inference (Phase 2)
   */
  private static generateRootCauseHint(
    metric: KPIMetricName,
    magnitude: number,
    direction?: 'increase' | 'decrease',
  ): string {
    if (metric === 'cost_daily') {
      if (direction === 'increase' && magnitude > 30) {
        return 'Cost spike detected. Possible cause: increased task volume or higher-cost agent assignment.';
      }
      if (direction === 'decrease' && magnitude > 20) {
        return 'Cost dip detected. Possible cause: fewer tasks or more efficient agent utilization.';
      }
    }

    if (metric === 'quality_score_avg') {
      if (direction === 'decrease' && magnitude > 20) {
        return 'Quality dip detected. Possible cause: task complexity increase or agent configuration change.';
      }
      if (direction === 'increase') {
        return 'Quality improvement detected. Verify if due to process improvement or reduced task complexity.';
      }
    }

    if (metric === 'error_rate') {
      if (direction === 'increase') {
        return 'Error rate spike. Check agent logs for failures. May indicate resource exhaustion or dependency issues.';
      }
    }

    if (metric === 'latency_p95') {
      if (direction === 'increase') {
        return 'Latency increase detected. Check system resources (CPU, memory) and external service dependencies.';
      }
    }

    return 'Anomaly detected. Review related metrics and agent logs for context.';
  }
}
