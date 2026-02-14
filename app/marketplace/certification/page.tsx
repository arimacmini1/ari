'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

type CertStatus = 'submitted' | 'scanned' | 'approved' | 'denied'

interface CertRow {
  id: string
  plugin_id: string
  version_id: string
  status: CertStatus
  scan_report: any
  decision_reason: string | null
  created_at: string
  plugin_name: string
  version: string
}

export default function MarketplaceCertificationPage() {
  const [status, setStatus] = useState<CertStatus>('scanned')
  const [rows, setRows] = useState<CertRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [reasonById, setReasonById] = useState<Record<string, string>>({})
  const { toast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/plugins/certification/queue?status=${encodeURIComponent(status)}`)
      if (!res.ok) throw new Error('Failed to load certification queue')
      const data = await res.json()
      setRows(Array.isArray(data.requests) ? data.requests : [])
    } catch (error: any) {
      toast({
        title: 'Certification load failed',
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

  const decide = async (requestId: string, next: 'approved' | 'denied') => {
    setBusyId(requestId)
    try {
      const res = await fetch(`/api/plugins/certification/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next, reason: reasonById[requestId] || undefined }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.error || 'Update failed')
      }
      toast({ title: `Certification ${next}` })
      await load()
    } catch (error: any) {
      toast({
        title: 'Certification update failed',
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
          <h1 className="text-3xl font-semibold">Certification Queue</h1>
          <p className="text-slate-400">Review scan reports and approve/deny certification.</p>
        </div>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-lg">Queue</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex gap-2">
            {(['scanned', 'approved', 'denied', 'submitted'] as const).map((s) => (
              <Button key={s} variant={status === s ? 'default' : 'outline'} onClick={() => setStatus(s)}>
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
        ) : rows.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-8 text-center text-slate-400">No requests.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {rows.map((r) => (
              <Card key={r.id} className="bg-slate-900 border-slate-800">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{r.plugin_name}</div>
                        <Badge className="bg-slate-800 border border-slate-700 text-slate-200">{r.version}</Badge>
                        <Badge className="bg-slate-800 border border-slate-700 text-slate-200">{r.status}</Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {new Date(r.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => decide(r.id, 'approved')}
                        disabled={busyId === r.id || r.status !== 'scanned'}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => decide(r.id, 'denied')}
                        disabled={busyId === r.id || r.status !== 'scanned'}
                      >
                        Deny
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400">Scan report</div>
                  <pre className="text-xs bg-slate-950 border border-slate-800 rounded p-3 overflow-auto max-h-64">
                    {JSON.stringify(r.scan_report ?? {}, null, 2)}
                  </pre>

                  <div>
                    <div className="text-xs text-slate-400 mb-1">Decision reason (optional)</div>
                    <Textarea
                      className="bg-slate-950 border-slate-800"
                      value={reasonById[r.id] ?? ''}
                      onChange={(e) => setReasonById((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="Reason for denial or approval notes"
                      disabled={r.status !== 'scanned'}
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

