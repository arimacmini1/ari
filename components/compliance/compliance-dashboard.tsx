'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ComplianceControl {
  id: string;
  framework: string;
  name: string;
  description: string;
  type: 'auto' | 'manual';
  status?: 'implemented' | 'in_progress' | 'not_started';
  evidence?: string;
}

interface ComplianceSnapshot {
  frameworks: Record<string, ComplianceControl[]>;
  overall_score: number;
}

const STATUS_COLORS: Record<string, string> = {
  implemented: 'bg-emerald-600/20 text-emerald-200 border-emerald-500/40',
  in_progress: 'bg-amber-600/20 text-amber-200 border-amber-500/40',
  not_started: 'bg-slate-700/30 text-slate-300 border-slate-600/40',
};

const STATUS_OPTIONS = ['implemented', 'in_progress', 'not_started'] as const;

export function ComplianceDashboard() {
  const [snapshot, setSnapshot] = useState<ComplianceSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/compliance');
      if (!response.ok) {
        throw new Error('Failed to load compliance data.');
      }
      const data: ComplianceSnapshot = await response.json();
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load compliance data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const overallScore = snapshot?.overall_score ?? 0;

  const handleSave = async (control: ComplianceControl) => {
    setSaving((prev) => ({ ...prev, [control.id]: true }));
    setError(null);
    try {
      const response = await fetch('/api/compliance', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin',
        },
        body: JSON.stringify({
          control_id: control.id,
          status: statusOverrides[control.id] || control.status,
          notes: notes[control.id] || '',
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to update control.');
      }
      await loadSnapshot();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update control.');
    } finally {
      setSaving((prev) => ({ ...prev, [control.id]: false }));
    }
  };

  const frameworks = useMemo(() => {
    if (!snapshot) return [];
    return Object.entries(snapshot.frameworks);
  }, [snapshot]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Compliance Readiness</h3>
            <p className="text-xs text-slate-400">
              Automated checks refresh on load. Manual controls require admin update.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-slate-800 text-slate-200 border border-slate-700">
              Overall Score: {overallScore}%
            </Badge>
            <Button size="sm" variant="outline" onClick={loadSnapshot}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-slate-400 text-sm">Loading compliance checklist...</div>
      )}

      {!loading && frameworks.length === 0 && (
        <div className="text-slate-400 text-sm">No compliance data available.</div>
      )}

      {frameworks.map(([framework, controls]) => (
        <Card key={framework} className="bg-slate-900 border-slate-800 p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-base font-semibold">{framework}</h4>
              <p className="text-xs text-slate-400">{controls.length} controls</p>
            </div>
            <Badge className="bg-slate-800 text-slate-200 border border-slate-700">
              {Math.round(
                (controls.filter((control) => control.status === 'implemented').length /
                  Math.max(controls.length, 1)) *
                  100
              )}
              % implemented
            </Badge>
          </div>

          <div className="mt-4 grid gap-4">
            {controls.map((control) => {
              const status = statusOverrides[control.id] || control.status || 'not_started';
              return (
                <div
                  key={control.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/40 p-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-semibold">{control.name}</h5>
                        <Badge className={STATUS_COLORS[status]}>
                          {status.replace('_', ' ')}
                        </Badge>
                        <Badge className="bg-slate-800 text-slate-200 border border-slate-700">
                          {control.type.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{control.description}</p>
                      {control.evidence && (
                        <p className="text-xs text-slate-500 mt-1">Evidence: {control.evidence}</p>
                      )}
                    </div>
                    {control.type === 'manual' && (
                      <div className="flex flex-col gap-2 md:w-72">
                        <Select
                          value={status}
                          onValueChange={(value) =>
                            setStatusOverrides((prev) => ({ ...prev, [control.id]: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option.replace('_', ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Notes or evidence"
                          value={notes[control.id] || ''}
                          onChange={(e) =>
                            setNotes((prev) => ({ ...prev, [control.id]: e.target.value }))
                          }
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSave(control)}
                          disabled={saving[control.id]}
                        >
                          {saving[control.id] ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
