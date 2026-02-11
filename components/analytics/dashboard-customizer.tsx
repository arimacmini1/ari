'use client';

/**
 * Dashboard Customizer Component
 * Feature: F06-MH-02 (Analytics Pane - Card Toggle Menu)
 *
 * Allows users to toggle KPI card visibility with a toggle menu.
 * Cards are stored in localStorage and persist across sessions.
 */

import { KPIMetricName, getKPIMetadata } from '@/lib/analytics-model';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardCustomizerProps {
  visibleCards: Set<KPIMetricName>;
  onToggleCard: (metric: KPIMetricName) => void;
}

const ALL_METRICS: KPIMetricName[] = [
  'cost_daily',
  'cost_total',
  'quality_score_avg',
  'error_rate',
  'latency_p95',
  'agent_count_active',
  'success_rate',
  'token_spend',
  'execution_duration_avg',
];

export function DashboardCustomizer({
  visibleCards,
  onToggleCard,
}: DashboardCustomizerProps) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-lg">Customize Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-slate-400 mb-4">
            Toggle cards on/off. Your preferences are saved automatically.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ALL_METRICS.map((metric) => {
              const metadata = getKPIMetadata(metric);
              const isVisible = visibleCards.has(metric);
              return (
                <label
                  key={metric}
                  className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-800 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => onToggleCard(metric)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 cursor-pointer"
                  />
                  <span className="text-sm text-slate-300">{metadata.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
