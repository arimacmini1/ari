'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';

interface ExecutionDetail {
  execution_id: string;
  rule_set_id: string;
  created_at: string;
  assigned_agents: string[];
  estimated_cost: number;
  estimated_duration: number;
  success_probability: number;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  actual_cost?: number;
  actual_duration?: number;
  assignment_plan: Array<{
    id: string;
    assigned_agent_id_or_pool: string;
    estimated_cost: number;
    estimated_duration: number;
    status: string;
  }>;
}

export default function ExecutionDetailPage() {
  const params = useParams();
  const executionIdParam = params.executionId;
  const executionId =
    typeof executionIdParam === 'string' ? decodeURIComponent(executionIdParam) : '';
  const [execution, setExecution] = useState<ExecutionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExecution = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/executions/${executionId}`);
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error || 'Failed to load execution');
        setExecution(null);
        return;
      }
      setExecution(payload.execution || null);
    } catch (err) {
      setError(String(err));
      setExecution(null);
    } finally {
      setLoading(false);
    }
  }, [executionId]);

  useEffect(() => {
    if (!executionId) return;
    loadExecution();
  }, [executionId, loadExecution]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-slate-600 text-slate-200';
      case 'processing':
        return 'bg-blue-600 text-blue-100';
      case 'complete':
        return 'bg-emerald-600 text-emerald-100';
      case 'failed':
        return 'bg-red-600 text-red-100';
      default:
        return 'bg-slate-600 text-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/executions">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Execution Details</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={loadExecution} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Link href={`/traces/${executionId}`} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Trace
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-8 text-slate-400">Loading execution...</CardContent>
          </Card>
        ) : error ? (
          <Card className="bg-slate-900 border-red-700">
            <CardContent className="p-8 text-red-300">{error}</CardContent>
          </Card>
        ) : !execution ? (
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-8 text-slate-400">Execution not found.</CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="font-mono text-base">{execution.execution_id}</span>
                  <Badge className={getStatusColor(execution.status)}>
                    {execution.status.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-400">Rule Set</p>
                  <p className="font-mono text-sm">{execution.rule_set_id}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Created</p>
                  <p className="text-sm">{new Date(execution.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Assigned Agents</p>
                  <p className="text-sm">{execution.assigned_agents.length}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Estimated Cost</p>
                  <p className="text-sm">${execution.estimated_cost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Estimated Duration</p>
                  <p className="text-sm">{execution.estimated_duration}s</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Success Probability</p>
                  <p className="text-sm">{execution.success_probability}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Actual Cost</p>
                  <p className="text-sm">
                    {typeof execution.actual_cost === 'number'
                      ? `$${execution.actual_cost.toFixed(2)}`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Actual Duration</p>
                  <p className="text-sm">
                    {typeof execution.actual_duration === 'number'
                      ? `${execution.actual_duration}s`
                      : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle>Assignment Plan ({execution.assignment_plan.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {execution.assignment_plan.length === 0 ? (
                  <p className="text-slate-400">No assignments recorded.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-700">
                          <th className="py-2 pr-4">Task</th>
                          <th className="py-2 pr-4">Agent/Pool</th>
                          <th className="py-2 pr-4">Est. Cost</th>
                          <th className="py-2 pr-4">Est. Duration</th>
                          <th className="py-2 pr-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {execution.assignment_plan.map((assignment) => (
                          <tr key={assignment.id} className="border-b border-slate-800">
                            <td className="py-2 pr-4 font-mono">{assignment.id}</td>
                            <td className="py-2 pr-4">{assignment.assigned_agent_id_or_pool}</td>
                            <td className="py-2 pr-4">${assignment.estimated_cost.toFixed(2)}</td>
                            <td className="py-2 pr-4">{assignment.estimated_duration}s</td>
                            <td className="py-2 pr-4">{assignment.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
