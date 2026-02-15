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
import { AdoptionDashboard } from '@/components/analytics/adoption-dashboard';
import { useAnalyticsSummary } from '@/hooks/use-analytics-summary';
import { useAdoptionSummary, type AdoptionPeriod } from '@/hooks/use-adoption-summary';
import { useActiveProject } from '@/components/aei/active-project-provider';

export default function AnalyticsPage() {
  const { activeProjectId, activeProjectName } = useActiveProject();
  const { summary, loading, error } = useAnalyticsSummary(activeProjectId);
  const [mounted, setMounted] = useState(false);
  const [adoptionPeriod, setAdoptionPeriod] = useState<AdoptionPeriod>('last_30d');
  const { summary: adoptionSummary, loading: adoptionLoading, error: adoptionError } =
    useAdoptionSummary(activeProjectId, adoptionPeriod);

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

        {/* Adoption KPIs */}
        <div className="mb-10">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold">Chat Adoption KPIs</h2>
              <p className="text-slate-400 text-sm">
                {activeProjectName
                  ? `Project: ${activeProjectName}`
                  : 'Select a project to view adoption metrics.'}
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              {(['last_24h', 'last_7d', 'last_30d', 'ytd'] as AdoptionPeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setAdoptionPeriod(period)}
                  className={`px-3 py-1 rounded-md border ${
                    adoptionPeriod === period
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-900 text-slate-300 border-slate-800'
                  }`}
                >
                  {period.replace('last_', '').toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {adoptionError ? (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-200">
              <p>Failed to load adoption metrics. Please try again later.</p>
            </div>
          ) : (
            <AdoptionDashboard summary={adoptionSummary} loading={adoptionLoading} />
          )}
        </div>

        {/* Core KPI Dashboard */}
        <div className="mb-4">
          <h2 className="text-2xl font-semibold">Core KPIs</h2>
          <p className="text-slate-400 text-sm">
            {activeProjectName
              ? `Project: ${activeProjectName}`
              : 'Select a project to view KPI metrics.'}
          </p>
        </div>
        {error ? (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-200">
            <p>Failed to load analytics data. Please try again later.</p>
          </div>
        ) : (
          <AnalyticsDashboard summary={summary ?? undefined} loading={loading} />
        )}
      </div>
    </main>
  );
}
