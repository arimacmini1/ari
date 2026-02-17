'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, ExternalLink, RefreshCw, Play, CheckCircle, XCircle, Clock } from 'lucide-react';
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

export default function WorkflowsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [traceModalOpen, setTraceModalOpen] = useState(false);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

  useEffect(() => {
    loadExecutions();
    const interval = setInterval(loadExecutions, 2000);
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

  const getStatusIcon = (status: Execution['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-muted-foreground">View and manage workflow executions</p>
        </div>
        <Button onClick={loadExecutions} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : executions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground mb-4">No workflow executions yet</p>
            <p className="text-sm text-muted-foreground">
              Run a canvas to see executions here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {executions.map((execution) => (
            <Card key={execution.execution_id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-mono">
                    {execution.execution_id}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={execution.status === 'complete' ? 'default' : 'secondary'}>
                      {getStatusIcon(execution.status)}
                      <span className="ml-1">{execution.status}</span>
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex gap-4 text-muted-foreground">
                    <span>Agents: {execution.assigned_agents.length}</span>
                    <span>Rule: {execution.rule_set_id}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedExecutionId(execution.execution_id);
                        setTraceModalOpen(true);
                      }}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      View Trace
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {traceModalOpen && selectedExecutionId && (
        <TraceViewerModal
          open={traceModalOpen}
          onOpenChange={setTraceModalOpen}
          executionId={selectedExecutionId}
        />
      )}
    </div>
  );
}
