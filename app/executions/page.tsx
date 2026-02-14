'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, ExternalLink, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { TraceViewerModal } from '@/components/aei/trace-viewer-modal';

interface Execution {
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
}

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [traceModalOpen, setTraceModalOpen] = useState(false);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

  useEffect(() => {
    loadExecutions();
    const interval = setInterval(loadExecutions, 2000); // Refresh every 2s
    return () => clearInterval(interval);
  }, []);

  const loadExecutions = async () => {
    try {
      const response = await fetch('/api/executions');
      if (response.ok) {
        const data = await response.json();
        setExecutions(data.executions || []);
      }
    } catch (error) {
      console.error('Failed to load executions:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Execution History</h1>
          <p className="text-slate-400">Track and replay orchestrator executions</p>
          <Button
            onClick={loadExecutions}
            variant="outline"
            size="sm"
            className="mt-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Executions List */}
        {loading ? (
          <div className="text-center text-slate-400">Loading...</div>
        ) : executions.length === 0 ? (
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-8 text-center">
              <p className="text-slate-400">No executions yet. Create one in the Orchestrator Hub.</p>
              <Link href="/orchestrator">
                <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
                  Go to Orchestrator
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {executions.map((execution) => (
              <Card
                key={execution.execution_id}
                className="bg-slate-900 border-slate-700 hover:border-slate-600 transition"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">
                        {execution.execution_id}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(execution.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge className={`${getStatusColor(execution.status)} text-xs`}>
                      {execution.status.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="bg-slate-800 p-2 rounded">
                      <p className="text-xs text-slate-400">Rule Set</p>
                      <p className="font-mono text-sm text-slate-300">
                        {execution.rule_set_id}
                      </p>
                    </div>

                    <div className="bg-slate-800 p-2 rounded">
                      <p className="text-xs text-slate-400">Agents</p>
                      <p className="font-semibold text-sm text-blue-400">
                        {execution.assigned_agents.length}
                      </p>
                    </div>

                    <div className="bg-slate-800 p-2 rounded">
                      <p className="text-xs text-slate-400">Est. Cost</p>
                      <p className="font-semibold text-sm text-emerald-400">
                        ${execution.estimated_cost.toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-slate-800 p-2 rounded">
                      <p className="text-xs text-slate-400">Est. Duration</p>
                      <p className="font-semibold text-sm text-yellow-400">
                        {execution.estimated_duration}s
                      </p>
                    </div>
                  </div>

                  {/* Actual Metrics (if complete) */}
                  {execution.status === 'complete' && execution.actual_cost !== undefined && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 border-t border-slate-700 pt-3">
                      <div>
                        <p className="text-xs text-slate-400">Actual Cost</p>
                        <p className="font-semibold text-sm text-emerald-400">
                          ${execution.actual_cost.toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Actual Duration</p>
                        <p className="font-semibold text-sm text-yellow-400">
                          {execution.actual_duration}s
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Success Prob.</p>
                        <p className="font-semibold text-sm text-blue-400">
                          {execution.success_probability}%
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Efficiency</p>
                        <p className="font-semibold text-sm text-slate-300">
                          {(
                            ((execution.estimated_cost - (execution.actual_cost || 0)) /
                              execution.estimated_cost) *
                            100
                          ).toFixed(0)}
                          %
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/executions/${execution.execution_id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View Details
                      </Button>
                    </Link>
                    <Link href={`/traces/${execution.execution_id}`} target="_blank">
                      <Button size="sm" variant="outline" className="text-xs">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Open Trace
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => {
                        setSelectedExecutionId(execution.execution_id);
                        setTraceModalOpen(true);
                      }}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Trace
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      disabled
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Replay
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Trace Viewer Modal */}
        {selectedExecutionId && (
          <TraceViewerModal
            executionId={selectedExecutionId}
            open={traceModalOpen}
            onOpenChange={setTraceModalOpen}
          />
        )}
      </div>
    </div>
  );
}
