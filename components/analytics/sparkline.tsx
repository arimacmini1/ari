'use client';

/**
 * Sparkline Component
 * Feature: F06-MH-02 (Analytics Pane - Sparkline Chart)
 *
 * Lightweight mini line chart using recharts for inline KPI trend visualization.
 * Shows last 7 days of data in a compact, inline format.
 */

import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { KPIMetricName } from '@/lib/analytics-model';
import { cn } from '@/lib/utils';

interface SparklineProps {
  data: number[];
  metric: KPIMetricName;
  height?: number;
}

export function Sparkline({
  data,
  metric,
  height = 40,
}: SparklineProps) {
  if (data.length === 0) {
    return <div className="h-10 bg-slate-800 rounded opacity-50" />;
  }

  // Transform data for recharts
  const chartData = data.map((value, index) => ({
    index,
    value,
  }));

  // Get color for metric
  const lineColor = getSparklineColor(metric);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={lineColor}
          dot={false}
          isAnimationActive={false}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * Get sparkline color based on metric type
 */
function getSparklineColor(metric: KPIMetricName): string {
  if (metric.includes('cost')) return '#ef4444'; // red
  if (metric.includes('quality')) return '#22c55e'; // green
  if (metric === 'error_rate') return '#ef4444'; // red
  if (metric === 'latency_p95') return '#eab308'; // yellow
  if (metric === 'success_rate') return '#22c55e'; // green
  if (metric === 'agent_count_active') return '#3b82f6'; // blue
  if (metric === 'token_spend') return '#f97316'; // orange
  if (metric === 'execution_duration_avg') return '#94a3b8'; // gray
  return '#94a3b8';
}
