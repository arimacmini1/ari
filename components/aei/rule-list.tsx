'use client';

import { Rule } from '@/app/orchestrator/page';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Edit2, Trash2 } from 'lucide-react';

interface RuleListProps {
  rules: Rule[];
  selectedRule: Rule | null;
  onSelectRule: (rule: Rule) => void;
  onEditRule: (rule: Rule) => void;
  onDeleteRule: (ruleId: string) => void;
}

export default function RuleList({
  rules,
  selectedRule,
  onSelectRule,
  onEditRule,
  onDeleteRule,
}: RuleListProps) {
  return (
    <div className="p-4 space-y-2">
      {rules.length === 0 ? (
        <div className="p-4 text-center text-slate-400 text-sm">
          No rules yet. Create one to get started.
        </div>
      ) : (
        rules.map((rule) => (
          <div
            key={rule.id}
            onClick={() => onSelectRule(rule)}
            className={`bg-slate-800 border-slate-700 cursor-pointer transition rounded-lg border shadow-sm ${
              selectedRule?.id === rule.id
                ? 'border-blue-500 ring-2 ring-blue-500/50'
                : 'hover:border-slate-600'
            }`}
          >
            <Card className={`bg-slate-800 border-slate-700 overflow-hidden border-0 shadow-none pointer-events-none`}>
              <CardContent className="p-3 pointer-events-auto">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-white">
                    {rule.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    ID: {rule.id}
                  </p>
                </div>
                <Badge variant="outline" className="bg-blue-900/50 text-blue-300 border-blue-600">
                  P{rule.priority}
                </Badge>
              </div>

              {/* Affinity Summary */}
              {Object.keys(rule.agent_type_affinity).length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-slate-400 mb-1">Affinity:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(rule.agent_type_affinity).map(
                      ([taskType, agentType]) => (
                        <Badge
                          key={`${taskType}-${agentType}`}
                          variant="secondary"
                          className="text-xs bg-slate-700 text-slate-300"
                        >
                          {taskType} → {agentType}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Constraints Summary */}
              {(rule.constraints.max_agents || rule.constraints.max_cost_per_task) && (
                <div className="mb-2">
                  <p className="text-xs text-slate-400 mb-1">Constraints:</p>
                  <div className="flex flex-wrap gap-1">
                    {rule.constraints.max_agents && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-slate-700 text-slate-300"
                      >
                        Max Agents: {rule.constraints.max_agents}
                      </Badge>
                    )}
                    {rule.constraints.max_cost_per_task && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-slate-700 text-slate-300"
                      >
                        Max Cost: ${rule.constraints.max_cost_per_task}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 mt-3 pt-2 border-t border-slate-700">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditRule(rule);
                  }}
                  className="flex-1 text-xs h-7"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRule(rule.id);
                  }}
                  className="flex-1 text-xs h-7 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
            </Card>
            </div>
            ))
            )}
            </div>
            );
            }
