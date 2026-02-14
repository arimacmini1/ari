import { useEffect, useState } from 'react'
import type { AdoptionSummary } from '@/lib/telemetry-adoption'

export type AdoptionPeriod = 'last_24h' | 'last_7d' | 'last_30d' | 'ytd'

interface UseAdoptionSummaryResult {
  summary: AdoptionSummary | null
  loading: boolean
  error: string | null
}

export function useAdoptionSummary(
  projectId: string | null,
  period: AdoptionPeriod
): UseAdoptionSummaryResult {
  const [summary, setSummary] = useState<AdoptionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) {
      setSummary(null)
      setLoading(false)
      return
    }

    const fetchSummary = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/analytics/adoption/summary?period=${period}`,
          { headers: { 'x-project-id': projectId } }
        )
        if (!response.ok) throw new Error('Failed to fetch adoption summary')
        const data = await response.json()
        setSummary(data?.summary ?? null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch adoption summary')
        setSummary(null)
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [projectId, period])

  return { summary, loading, error }
}
