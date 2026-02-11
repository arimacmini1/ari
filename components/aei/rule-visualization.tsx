'use client';

import { Rule } from '@/app/orchestrator/page';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RuleVisualizationProps {
  rule: Rule;
}

export default function RuleVisualization({ rule }: RuleVisualizationProps) {
  const taskTypes = Object.keys(rule.agent_type_affinity);

  return (
    <div className="space-y-4">
      {/* Rule Summary */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-3 space-y-2">
          <div>
            <p className="text-xs text-slate-400">Rule ID</p>
            <p className="font-mono text-sm text-blue-400">{rule.id}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Priority</p>
            <p className="text-sm font-semibold text-white">{rule.priority}/10</p>
          </div>
        </CardContent>
      </Card>

      {/* Dependencies */}
      {rule.dependencies.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-3">
            <p className="text-xs text-slate-400 mb-2">Dependencies</p>
            <div className="space-y-1">
              {rule.dependencies.map((dep) => (
                <div
                  key={dep}
                  className="text-xs font-mono bg-slate-900 p-2 rounded text-slate-300"
                >
                  {dep}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Type Affinity Graph */}
      {taskTypes.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-3">
            <p className="text-xs text-slate-400 mb-3">Agent Type Affinity</p>
            <div className="space-y-3">
              {taskTypes.map((taskType) => {
                const agentType = rule.agent_type_affinity[taskType];
                return (
                  <div key={taskType} className="flex items-center gap-2">
                    {/* Task Type */}
                    <Badge className="bg-emerald-900/50 text-emerald-300 border-emerald-600 text-xs">
                      {taskType}
                    </Badge>

                    {/* Arrow */}
                    <div className="flex-1 border-t border-dashed border-slate-600" />

                    {/* Agent Type */}
                    <Badge className="bg-blue-900/50 text-blue-300 border-blue-600 text-xs">
                      {agentType}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Constraints */}
      {(rule.constraints.max_agents || rule.constraints.max_cost_per_task) && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-3 space-y-2">
            <p className="text-xs text-slate-400 mb-2">Constraints</p>
            {rule.constraints.max_agents && (
              <div className="text-xs">
                <p className="text-slate-400">Max Agents:</p>
                <p className="font-semibold text-white ml-2">
                  {rule.constraints.max_agents}
                </p>
              </div>
            )}
            {rule.constraints.max_cost_per_task && (
              <div className="text-xs">
                <p className="text-slate-400">Max Cost Per Task:</p>
                <p className="font-semibold text-white ml-2">
                  ${rule.constraints.max_cost_per_task}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {taskTypes.length === 0 && rule.dependencies.length === 0 && (
        <div className="p-4 text-center text-slate-500 text-sm">
          No affinity or dependencies configured
        </div>
      )}
    </div>
  );
}
