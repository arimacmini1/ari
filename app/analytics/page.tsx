'use client';

/**
 * Analytics Dashboard Page
 * Feature: F06-MH-02 (Analytics Pane - Dashboard Layout & KPI Cards)
 *
 * Renders a customizable 2×3 grid of KPI cards with real-time data,
 * trend indicators, and sparklines. Supports hide/show and drag-drop reordering
 * with localStorage persistence.
 */

import { useState, useEffect } from 'react';
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';
import { useAnalyticsSummary } from '@/hooks/use-analytics-summary';

export default function AnalyticsPage() {
  const { summary, loading, error } = useAnalyticsSummary();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-slate-400">
            Monitor project-wide KPIs: cost, quality, performance, and health metrics.
          </p>
        </div>

        {/* Dashboard */}
        {error ? (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-200">
            <p>Failed to load analytics data. Please try again later.</p>
          </div>
        ) : (
          <AnalyticsDashboard summary={summary} loading={loading} />
        )}
      </div>
    </main>
  );
}
