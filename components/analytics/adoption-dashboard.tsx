'use client'

import type { AdoptionSummary } from '@/lib/telemetry-adoption'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface AdoptionDashboardProps {
  summary: AdoptionSummary | null
  loading?: boolean
}

export function AdoptionDashboard({ summary, loading = false }: AdoptionDashboardProps) {
  const cards = [
    {
      label: 'Chat Sessions',
      value: summary?.sessions_total ?? 0,
      helper: 'Main chat sessions in period',
    },
    {
      label: 'Conversion Rate',
      value: summary ? `${summary.conversion_rate.toFixed(1)}%` : '0.0%',
      helper: 'Expanded to canvas / sessions',
    },
    {
      label: 'Time to First Output',
      value:
        summary?.time_to_first_output_avg_s == null
          ? '—'
          : `${summary.time_to_first_output_avg_s.toFixed(1)}s`,
      helper: 'Avg time to first assistant response',
    },
    {
      label: 'Tutorial Completion',
      value: summary ? `${summary.tutorial_completion_rate.toFixed(1)}%` : '0.0%',
      helper: 'Tutorial completed / sessions',
    },
    {
      label: 'Import Attempts',
      value: summary?.import_attempts ?? 0,
      helper: 'Replit import attempts',
    },
    {
      label: 'Import Failure Rate',
      value: summary ? `${summary.import_failure_rate.toFixed(1)}%` : '0.0%',
      helper: 'Failed imports / attempts',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className={cn('border border-slate-800 bg-slate-900/60')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-slate-50">
                {loading ? '…' : card.value}
              </div>
              <p className="text-xs text-slate-400 mt-1">{card.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {summary && !loading ? (
        <div className="text-xs text-slate-400">
          Usage split: {summary.usage_split.chat_only} chat-only sessions, {summary.usage_split.expanded_to_canvas}{' '}
          expanded to canvas.
        </div>
      ) : null}
    </div>
  )
}
