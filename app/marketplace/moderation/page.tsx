'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

type ModerationStatus = 'pending' | 'approved' | 'rejected'

interface ModerationReviewRow {
  id: string
  plugin_id: string
  version_id: string
  user_id: string
  rating: number
  review_text: string
  status: ModerationStatus
  created_at: string
  plugin_name: string
  version: string
}

export default function MarketplaceModerationPage() {
  const [status, setStatus] = useState<ModerationStatus>('pending')
  const [reviews, setReviews] = useState<ModerationReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [noteById, setNoteById] = useState<Record<string, string>>({})
  const { toast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/plugins/reviews/moderation?status=${encodeURIComponent(status)}`)
      if (!res.ok) throw new Error('Failed to load moderation queue')
      const data = await res.json()
      setReviews(Array.isArray(data.reviews) ? data.reviews : [])
    } catch (error: any) {
      toast({
        title: 'Moderation load failed',
        description: error?.message || 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [status])

  const decide = async (reviewId: string, next: 'approved' | 'rejected') => {
    setBusyId(reviewId)
    try {
      const res = await fetch(`/api/plugins/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next, note: noteById[reviewId] || undefined }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.error || 'Update failed')
      }
      toast({ title: `Review ${next}` })
      await load()
    } catch (error: any) {
      toast({
        title: 'Moderation update failed',
        description: error?.message || 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Marketplace Moderation</h1>
          <p className="text-slate-400">Approve or reject plugin reviews.</p>
        </div>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-lg">Queue</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex gap-2">
            {(['pending', 'approved', 'rejected'] as const).map((s) => (
              <Button
                key={s}
                variant={status === s ? 'default' : 'outline'}
                onClick={() => setStatus(s)}
              >
                {s}
              </Button>
            ))}
            <Button className="ml-auto" onClick={load} variant="outline">
              Refresh
            </Button>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-slate-400">Loading…</div>
        ) : reviews.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-8 text-center text-slate-400">
              No reviews in this queue.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reviews.map((r) => (
              <Card key={r.id} className="bg-slate-900 border-slate-800">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{r.plugin_name}</div>
                        <Badge className="bg-slate-800 border border-slate-700 text-slate-200">
                          {r.version}
                        </Badge>
                        <Badge className="bg-slate-800 border border-slate-700 text-slate-200">
                          {r.rating}/5
                        </Badge>
                        <Badge className="bg-slate-800 border border-slate-700 text-slate-200">
                          {r.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        By {r.user_id} • {new Date(r.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => decide(r.id, 'approved')}
                        disabled={busyId === r.id || r.status !== 'pending'}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => decide(r.id, 'rejected')}
                        disabled={busyId === r.id || r.status !== 'pending'}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>

                  <div className="text-slate-300 whitespace-pre-wrap text-sm">
                    {r.review_text || <span className="text-slate-500">(no text)</span>}
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 mb-1">Moderation note (optional)</div>
                    <Textarea
                      className="bg-slate-950 border-slate-800"
                      value={noteById[r.id] ?? ''}
                      onChange={(e) => setNoteById((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="Reason for rejection / internal note"
                      disabled={r.status !== 'pending'}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

