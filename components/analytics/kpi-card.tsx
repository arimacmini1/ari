'use client';

/**
 * KPI Card Component
 * Feature: F06-MH-02 (Analytics Pane - KPI Card)
 *
 * Displays a single KPI metric with:
 * - Title and current metric value (large)
 * - Unit label and color-coded trend indicator (↑/↓)
 * - Sparkline mini-chart showing 7-day trend
 * - Color coding by metric type (cost=red/orange, quality=green, etc.)
 * - Accessibility: patterns + colors for color-blind users
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KPIMetricName, getKPIMetadata, formatMetricValue } from '@/lib/analytics-model';
import { Sparkline } from './sparkline';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  metric: KPIMetricName;
  currentValue: number;
  previousValue?: number;
  sparklineData?: number[];
  loading?: boolean;
  onClick?: () => void;
  draggable?: boolean;
}

export function KPICard({
  metric,
  currentValue,
  previousValue,
  sparklineData = [],
  loading = false,
  onClick,
  draggable = false,
}: KPICardProps) {
  const metadata = getKPIMetadata(metric);
  const trendPercent = previousValue
    ? ((currentValue - previousValue) / previousValue) * 100
    : 0;
  const isPositive = trendPercent >= 0;

  // Determine if trend is good or bad
  const isBetterTrend = metric.includes('cost') || metric === 'error_rate'
    ? !isPositive // Lower is better
    : isPositive; // Higher is better

  // Color and icon based on metric
  const trendColor = isBetterTrend
    ? 'text-green-500'
    : 'text-red-500';

  const cardColor = getCardColor(metric);

  return (
    <Card
      onClick={onClick}
      draggable={draggable}
      className={cn(
        'cursor-pointer transition-all hover:shadow-lg hover:shadow-slate-700/50',
        'bg-slate-900 border-slate-800 hover:border-slate-700',
        draggable && 'cursor-grab active:cursor-grabbing',
        loading && 'opacity-50'
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm font-semibold text-slate-300">
              {metadata.label}
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {metadata.unit}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Value */}
        <div>
          <p className={cn('text-3xl font-bold', cardColor)}>
            {formatMetricValue(currentValue, metric)}
          </p>
        </div>

        {/* Trend Indicator */}
        {previousValue !== undefined && (
          <div className="flex items-center gap-2">
            <div className={cn('flex items-center gap-1', trendColor)}>
              {isPositive ? (
                <ArrowUp className="w-4 h-4" />
              ) : (
                <ArrowDown className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {Math.abs(trendPercent).toFixed(1)}%
              </span>
            </div>
            <span className="text-xs text-slate-500">from previous period</span>
          </div>
        )}

        {/* Sparkline Chart */}
        {sparklineData.length > 0 && (
          <div className="pt-2">
            <Sparkline data={sparklineData} metric={metric} />
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse" />
            <span className="text-xs text-slate-500">Updating...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Get card color based on metric type
 * Uses colors + patterns for accessibility
 */
function getCardColor(metric: KPIMetricName): string {
  if (metric.includes('cost')) {
    return 'text-red-500'; // Cost = red/orange (watch for high spending)
  }
  if (metric.includes('quality')) {
    return 'text-green-500'; // Quality = green (good)
  }
  if (metric === 'error_rate') {
    return 'text-red-500'; // Errors = red (bad)
  }
  if (metric === 'latency_p95') {
    return 'text-amber-500'; // Latency = yellow/amber (caution)
  }
  if (metric === 'success_rate') {
    return 'text-green-500'; // Success = green (good)
  }
  if (metric === 'agent_count_active') {
    return 'text-blue-500'; // Agents = blue (neutral)
  }
  if (metric === 'token_spend') {
    return 'text-orange-500'; // Tokens = orange (watch)
  }
  if (metric === 'execution_duration_avg') {
    return 'text-slate-400'; // Duration = gray (neutral)
  }
  return 'text-slate-400';
}
