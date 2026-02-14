/**
 * useAnalyticsSummary Hook
 * Feature: F06-MH-02 (Analytics Pane - Data Fetching)
 *
 * Fetches project-scoped KPI summary data from analytics API.
 * Returns: summary data, loading state, error state.
 */

import { useState, useEffect } from 'react';
import { KPISummary } from '@/lib/analytics-model';
import type { AnalyticsPeriod } from '@/lib/analytics-metric-store';

interface UseAnalyticsSummaryResult {
  summary: KPISummary | null;
  loading: boolean;
  error: string | null;
}

export function useAnalyticsSummary(
  projectId: string | null,
  period: AnalyticsPeriod = 'last_30d'
): UseAnalyticsSummaryResult {
  const [summary, setSummary] = useState<KPISummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setSummary(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let inFlight = false;

    const fetchSummary = async (options?: { initial?: boolean }) => {
      if (inFlight) return;
      inFlight = true;

      try {
        if (options?.initial) {
          setLoading(true);
        }
        setError((prev) => (prev ? null : prev));

        const controller = new AbortController();
        const response = await fetch(`/api/analytics/summary?period=${period}`, {
          headers: { 'x-project-id': projectId },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Failed to fetch analytics summary');
        }
        const data = await response.json();
        if (!cancelled) {
          setSummary(data?.summary ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch analytics summary');
        }
      } finally {
        inFlight = false;
        if (!cancelled && options?.initial) {
          setLoading(false);
        }
      }
    };

    setError(null);
    void fetchSummary({ initial: true });

    const interval = setInterval(() => {
      void fetchSummary();
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [projectId, period]);

  return { summary, loading, error };
}
