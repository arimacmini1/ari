/**
 * useAnalyticsSummary Hook
 * Feature: F06-MH-02 (Analytics Pane - Data Fetching)
 *
 * Fetches KPI summary data from analytics API.
 * Returns: summary data, loading state, error state.
 * TODO: Replace mock data with real API calls when backend ready.
 */

import { useState, useEffect } from 'react';
import { KPISummary } from '@/lib/analytics-model';

interface UseAnalyticsSummaryResult {
  summary: KPISummary | null;
  loading: boolean;
  error: string | null;
}

export function useAnalyticsSummary(
  period: 'last_24h' | 'last_7d' | 'last_30d' | 'ytd' = 'last_30d'
): UseAnalyticsSummaryResult {
  const [summary, setSummary] = useState<KPISummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: Replace with real API call
        // const response = await fetch(`/api/analytics/summary?period=${period}`);
        // if (!response.ok) throw new Error('Failed to fetch analytics');
        // const data = await response.json();
        // setSummary(data);

        // Mock data for now
        const mockSummary: KPISummary = {
          timestamp: new Date().toISOString(),
          period,
          kpis: {
            cost_daily: Math.random() * 500,
            cost_total: Math.random() * 5000,
            quality_score_avg: 75 + Math.random() * 20,
            error_rate: Math.random() * 10,
            latency_p95: 200 + Math.random() * 800,
            agent_count_active: Math.floor(Math.random() * 20) + 5,
            success_rate: 85 + Math.random() * 15,
            token_spend: Math.random() * 100000,
            execution_duration_avg: 500 + Math.random() * 1000,
          },
          trends: {
            cost_daily: {
              current: 250,
              previous: 200,
              percent_change: 25,
            },
            quality_score_avg: {
              current: 82,
              previous: 80,
              percent_change: 2.5,
            },
            error_rate: {
              current: 2.1,
              previous: 3.5,
              percent_change: -40,
            },
            latency_p95: {
              current: 450,
              previous: 500,
              percent_change: -10,
            },
            success_rate: {
              current: 97.9,
              previous: 96.5,
              percent_change: 1.4,
            },
          },
          metadata: {
            total_executions: Math.floor(Math.random() * 1000) + 100,
            total_agents: Math.floor(Math.random() * 10) + 2,
            total_projects: Math.floor(Math.random() * 5) + 1,
          },
        };

        setSummary(mockSummary);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to fetch analytics summary'
        );
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [period]);

  return { summary, loading, error };
}
