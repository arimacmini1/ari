'use client';

import { useState } from 'react';
import { Rule } from '@/app/orchestrator/page';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Play, Loader2, Zap, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { Artifact } from '@/lib/artifact-model';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SimulationPanelProps {
  rule: Rule;
  onArtifactsGenerated?: (artifacts: Artifact[]) => void;
}

interface SimulationResult {
  assignment_plan: Array<{
    id: string;
    assigned_agent_id_or_pool: string;
    estimated_cost: number;
    estimated_duration: number;
    status: string;
  }>;
  critical_path: string[];
  estimated_total_cost: number;
  estimated_total_duration: number;
  success_probability: number;
  validation_errors: string[];
  artifacts?: Artifact[];
}

const CODE_EXPLORER_SNAPSHOT_EVENT = "aei:code-explorer-snapshot-updated";

// Helper functions for simulation result comprehension (UX-D-01)

function getGateStatus(result: SimulationResult, maxBudget: number): 'ready' | 'warnings' | 'blocked' {
  const costRatio = result.estimated_total_cost / maxBudget;
  const probability = result.success_probability;

  // Blocked conditions
  if (costRatio > 1.0 || probability < 70) {
    return 'blocked';
  }

  // Warning conditions
  if (costRatio > 0.7 || (probability >= 70 && probability < 80)) {
    return 'warnings';
  }

  // Ready
  return 'ready';
}

function getGateStatusBadge(result: SimulationResult, maxBudget: number) {
  const status = getGateStatus(result, maxBudget);

  if (status === 'ready') {
    return <Badge className="bg-emerald-900/50 text-emerald-300 border-emerald-600">✓ Ready to Execute</Badge>;
  }
  if (status === 'warnings') {
    return <Badge className="bg-amber-900/50 text-amber-300 border-amber-600">⚠ Review Warnings</Badge>;
  }
  return <Badge className="bg-red-900/50 text-red-300 border-red-600">✗ Blocked</Badge>;
}

function getCostGateIcon(cost: number, maxBudget: number) {
  const ratio = cost / maxBudget;
  if (ratio > 1.0) {
    return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
  }
  if (ratio > 0.7) {
    return <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />;
  }
  return <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
}

function getCostGateColor(cost: number, maxBudget: number) {
  const ratio = cost / maxBudget;
  if (ratio > 1.0) return 'text-red-400';
  if (ratio > 0.7) return 'text-amber-400';
  return 'text-emerald-400';
}

function getCostGateLabel(cost: number, maxBudget: number) {
  const ratio = cost / maxBudget;
  if (ratio > 1.0) {
    return `exceeds budget ($${cost.toFixed(2)} / $${maxBudget})`;
  }
  if (ratio > 0.7) {
    return `approaching limit ($${cost.toFixed(2)} / $${maxBudget})`;
  }
  return `within budget ($${cost.toFixed(2)} / $${maxBudget})`;
}

function getConfidenceGateIcon(probability: number) {
  if (probability < 70) {
    return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
  }
  if (probability < 80) {
    return <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />;
  }
  return <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
}

function getConfidenceGateColor(probability: number) {
  if (probability < 70) return 'text-red-400';
  if (probability < 80) return 'text-amber-400';
  return 'text-emerald-400';
}

function getConfidenceGateLabel(probability: number) {
  if (probability < 70) {
    return `too low (${probability}% < 70%)`;
  }
  if (probability < 80) {
    return `marginal (${probability}% ≥ 70% but < 80%)`;
  }
  return `acceptable (${probability}% ≥ 80%)`;
}

function getGateGuidance(result: SimulationResult, maxBudget: number): string | null {
  const costRatio = result.estimated_total_cost / maxBudget;
  const probability = result.success_probability;

  // Blocked guidance (highest priority)
  if (costRatio > 1.0) {
    return 'Increase cost budget or simplify workflow to proceed';
  }
  if (probability < 70) {
    return 'Success probability too low. Review workflow structure and add fallback steps.';
  }

  // Warning guidance
  if (costRatio > 0.7) {
    return 'Consider reducing max agents or simplifying workflow';
  }
  if (probability >= 70 && probability < 80) {
    return 'Review task complexity or add fallback steps to improve confidence';
  }

  return null;
}

function getCostBadgeStyle(cost: number, maxBudget: number) {
  const ratio = cost / maxBudget;
  if (ratio > 1.0) {
    return 'bg-red-900/50 text-red-300 border-red-600';
  }
  if (ratio > 0.7) {
    return 'bg-amber-900/50 text-amber-300 border-amber-600';
  }
  return 'bg-emerald-900/50 text-emerald-300 border-emerald-600';
}

function getCostBadgeText(cost: number, maxBudget: number) {
  const ratio = cost / maxBudget;
  if (ratio > 1.0) return '✗ Over budget';
  if (ratio > 0.7) return '⚠ Approaching limit';
  return '✓ Well within budget';
}

function getDurationContext(taskCount: number, durationSeconds: number): string {
  const avgPerTask = durationSeconds / taskCount;

  if (avgPerTask < 30) {
    return `Lower than typical for ${taskCount} tasks`;
  }
  if (avgPerTask > 60) {
    return `Higher than typical for ${taskCount} tasks`;
  }
  return `Typical for ${taskCount} tasks`;
}

function getConfidenceLabel(probability: number): string {
  if (probability >= 85) return 'High confidence';
  if (probability >= 70) return 'Medium confidence';
  return 'Low confidence';
}

export default function SimulationPanel({ rule, onArtifactsGenerated }: SimulationPanelProps) {
  const [simulating, setSimulating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [constraints, setConstraints] = useState({
    max_agents: rule.constraints.max_agents || 10,
    max_cost_budget: 1000,
  });
  const { toast } = useToast();

  const handleConstraintChange = (key: string, value: number) => {
    setConstraints({ ...constraints, [key]: value });
  };

  const handleSimulate = async () => {
    // Mock instruction graph for now
    const mockGraph = [
      {
        id: 'task-1',
        type: 'code_gen',
        description: 'Generate API',
        estimated_cost: 20,
        estimated_duration: 45,
      },
      {
        id: 'task-2',
        type: 'test',
        description: 'Test API',
        estimated_cost: 15,
        estimated_duration: 30,
        dependencies: ['task-1'],
      },
      {
        id: 'task-3',
        type: 'deploy',
        description: 'Deploy',
        estimated_cost: 30,
        estimated_duration: 60,
        dependencies: ['task-2'],
      },
    ];

    setSimulating(true);
    try {
      const response = await fetch('/api/orchestrator/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction_graph: mockGraph,
          rule_set_id: rule.id,
          constraints_override: constraints,
        }),
      });

      if (response.ok) {
         const data = await response.json();
         setResult(data.simulation);
         setExecutionId(null); // Reset execution ID for new simulation
         // Pass artifacts to parent
         if (data.simulation?.artifacts && onArtifactsGenerated) {
           onArtifactsGenerated(data.simulation.artifacts);
         }
         if (data.simulation?.artifacts) {
           const snapshotResponse = await fetch('/api/code-explorer/snapshot', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               source: 'generated',
               artifacts: data.simulation.artifacts,
             }),
           });
           if (snapshotResponse.ok) {
             window.dispatchEvent(new Event(CODE_EXPLORER_SNAPSHOT_EVENT));
           }
         }
       } else {
         console.error('Simulation failed');
       }
    } catch (error) {
      console.error('Failed to run simulation:', error);
    } finally {
      setSimulating(false);
    }
  };

  const handleExecute = async () => {
    if (!result) return;

    setExecuting(true);
    try {
      const repoUrl = localStorage.getItem("aei.workflow.context.repo_url") || undefined;
      const repoBranch = localStorage.getItem("aei.workflow.context.repo_branch") || undefined;
      const repoCommit = localStorage.getItem("aei.workflow.context.repo_commit") || undefined;
      const source_repo = repoUrl
        ? { url: repoUrl, branch: repoBranch || "main", commit: repoCommit }
        : undefined;

      const response = await fetch('/api/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule_set_id: rule.id,
          assignment_plan: result.assignment_plan,
          estimated_cost: result.estimated_total_cost,
          estimated_duration: result.estimated_total_duration,
          success_probability: result.success_probability,
          source_repo,
        }),
      });

      const payload = await response.json().catch(() => ({} as any));

      if (response.ok) {
        const data = payload;
        setExecutionId(data.execution_id);
        toast({
          title: 'Execution dispatched',
          description: `ID: ${data.execution_id} • ${data.assigned_agents.length} agent(s)`,
        });
        if (data?.budget_warning?.code === 'PROJECT_BUDGET_WARNING_THRESHOLD') {
          const projected = data?.budget_warning?.budget?.projected_spend;
          const threshold = data?.budget_warning?.budget?.budget_warning_threshold;
          toast({
            title: 'Project budget warning',
            description:
              typeof projected === 'number' && typeof threshold === 'number'
                ? `Projected spend $${projected.toFixed(2)} crossed warning threshold $${threshold.toFixed(2)}.`
                : 'Projected spend crossed project warning threshold.',
            variant: 'destructive',
          });
        }
      } else {
        const errorMessage =
          payload?.error || (response.status === 402 ? 'Execution blocked by project budget hard cap.' : 'Failed to execute');
        toast({
          title: 'Execution failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to execute:', error);
      toast({
        title: 'Execution failed',
        description: 'Error executing plan',
        variant: 'destructive',
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Constraints */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Constraints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs text-slate-400">Max Agents</label>
              <span className="text-blue-400 text-xs font-semibold">
                {constraints.max_agents}
              </span>
            </div>
            <Slider
              value={[constraints.max_agents]}
              onValueChange={(value) =>
                handleConstraintChange('max_agents', value[0])
              }
              min={1}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs text-slate-400">Cost Budget ($)</label>
              <span className="text-blue-400 text-xs font-semibold">
                {constraints.max_cost_budget}
              </span>
            </div>
            <Slider
              value={[constraints.max_cost_budget]}
              onValueChange={(value) =>
                handleConstraintChange('max_cost_budget', value[0])
              }
              min={10}
              max={5000}
              step={50}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Simulate Button */}
      <Button
        onClick={handleSimulate}
        disabled={simulating}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {simulating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Simulating...
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2" />
            Run Simulation
          </>
        )}
      </Button>

      {/* Execute Button (shown when simulation complete) */}
      {result && !executionId && (
        <Button
          onClick={() => {
            const gateStatus = getGateStatus(result, constraints.max_cost_budget);
            if (gateStatus === 'warnings') {
              // Show confirmation for warnings
              if (confirm('⚠ Simulation has warnings. Review the Gate Status card before proceeding.\n\nContinue with execution?')) {
                handleExecute();
              }
            } else {
              handleExecute();
            }
          }}
          disabled={executing || getGateStatus(result, constraints.max_cost_budget) === 'blocked'}
          className={cn(
            "w-full text-white",
            getGateStatus(result, constraints.max_cost_budget) === 'blocked'
              ? "bg-slate-600 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-700"
          )}
          title={
            getGateStatus(result, constraints.max_cost_budget) === 'blocked'
              ? 'Execution blocked. Review Gate Status and adjust constraints.'
              : undefined
          }
        >
          {executing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Dispatching...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Execute Plan
            </>
          )}
        </Button>
      )}

      {/* Execution Status */}
      {executionId && (
        <Card className="bg-emerald-900/20 border-emerald-700">
          <CardContent className="p-3">
            <p className="text-xs text-emerald-400 mb-1">✓ Execution Dispatched</p>
            <p className="font-mono text-xs text-slate-300 break-all">
              {executionId}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="flex-1 overflow-y-auto space-y-3">
          {/* Mock Behavior Banner */}
          <Card className="bg-blue-900/20 border-blue-700">
            <CardContent className="p-3">
              <p className="text-xs text-blue-300">
                ℹ️ <strong>Mock Simulation:</strong> Results are generated with deterministic test data. Production behavior will use live agent assignment and cost estimation.
              </p>
            </CardContent>
          </Card>

          {/* Errors */}
          {result.validation_errors.length > 0 && (
            <Card className="bg-red-900/20 border-red-700">
              <CardContent className="p-3">
                <div className="flex gap-2 text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    {result.validation_errors.map((error, i) => (
                      <div key={i}>• {error}</div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gate Status */}
          <Card className={cn(
            "border-2",
            getGateStatus(result, constraints.max_cost_budget) === 'ready' && "bg-emerald-900/20 border-emerald-700",
            getGateStatus(result, constraints.max_cost_budget) === 'warnings' && "bg-amber-900/20 border-amber-700",
            getGateStatus(result, constraints.max_cost_budget) === 'blocked' && "bg-red-900/20 border-red-700"
          )}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                Gate Status
                {getGateStatusBadge(result, constraints.max_cost_budget)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1.5 text-xs">
                {/* Cost gate */}
                <div className="flex items-start gap-2">
                  {getCostGateIcon(result.estimated_total_cost, constraints.max_cost_budget)}
                  <span className={getCostGateColor(result.estimated_total_cost, constraints.max_cost_budget)}>
                    Cost {getCostGateLabel(result.estimated_total_cost, constraints.max_cost_budget)}
                  </span>
                </div>
                {/* Success probability gate */}
                <div className="flex items-start gap-2">
                  {getConfidenceGateIcon(result.success_probability)}
                  <span className={getConfidenceGateColor(result.success_probability)}>
                    Success probability {getConfidenceGateLabel(result.success_probability)}
                  </span>
                </div>
              </div>
              {/* Guidance */}
              {getGateGuidance(result, constraints.max_cost_budget) && (
                <div className="mt-3 pt-2 border-t border-slate-600">
                  <p className="text-xs text-slate-300">
                    {getGateGuidance(result, constraints.max_cost_budget)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metrics */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Simulation Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Cost */}
              <div>
                <p className="text-xs text-slate-400 mb-1">Cost</p>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-slate-200">
                    ${result.estimated_total_cost.toFixed(2)} / ${constraints.max_cost_budget}
                  </p>
                  <Badge className={cn(
                    "text-xs",
                    getCostBadgeStyle(result.estimated_total_cost, constraints.max_cost_budget)
                  )}>
                    {getCostBadgeText(result.estimated_total_cost, constraints.max_cost_budget)}
                  </Badge>
                </div>
              </div>
              {/* Duration */}
              <div>
                <p className="text-xs text-slate-400 mb-1">Duration</p>
                <p className="text-lg font-bold text-slate-200">
                  ~{Math.ceil(result.estimated_total_duration / 60)} min
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {getDurationContext(result.assignment_plan.length, result.estimated_total_duration)}
                </p>
              </div>
              {/* Success Probability */}
              <div>
                <p className="text-xs text-slate-400 mb-1">Success Probability</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-700 rounded h-2 overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all",
                        result.success_probability >= 85 && "bg-emerald-500",
                        result.success_probability >= 70 && result.success_probability < 85 && "bg-amber-500",
                        result.success_probability < 70 && "bg-red-500"
                      )}
                      style={{
                        width: `${result.success_probability}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-200">
                    {result.success_probability}%
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {getConfidenceLabel(result.success_probability)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Critical Path */}
          {result.critical_path.length > 0 && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Critical Path</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {result.critical_path.map((taskId, i) => (
                    <div key={taskId} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">
                        {i + 1}.
                      </span>
                      <Badge className="bg-amber-900/50 text-amber-300 border-amber-600 text-xs">
                        {taskId}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assignment Plan */}
          {result.assignment_plan.length > 0 && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Task Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {result.assignment_plan.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="bg-slate-900 p-2 rounded text-xs border border-slate-700"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-slate-400">
                          {assignment.id}
                        </span>
                        <Badge variant="outline" className="text-xs bg-blue-900/50 text-blue-300">
                          ${assignment.estimated_cost}
                        </Badge>
                      </div>
                      <p className="text-slate-400 mt-1">
                        Agent: {assignment.assigned_agent_id_or_pool}
                      </p>
                      <p className="text-slate-400">
                        Duration: {assignment.estimated_duration}s
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {!result && (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          Run simulation to see results
        </div>
      )}
    </div>
  );
}
