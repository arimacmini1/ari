'use client';

import { useState } from 'react';
import { Rule } from '@/app/orchestrator/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RuleEditorProps {
  rule: Rule;
  onSave: (rule: Rule) => void;
  onCancel: () => void;
}

const AGENT_TYPES = ['code_gen', 'test', 'deploy', 'review'];

export default function RuleEditor({ rule, onSave, onCancel }: RuleEditorProps) {
  const [formData, setFormData] = useState<Rule>(rule);
  const [errors, setErrors] = useState<string[]>([]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, name: e.target.value });
  };

  const handlePriorityChange = (value: number[]) => {
    setFormData({ ...formData, priority: value[0] });
  };

  const handleAffinityToggle = (taskType: string, agentType: string) => {
    const newAffinity = { ...formData.agent_type_affinity };

    if (newAffinity[taskType] === agentType) {
      delete newAffinity[taskType];
    } else {
      newAffinity[taskType] = agentType;
    }

    setFormData({ ...formData, agent_type_affinity: newAffinity });
  };

  const handleConstraintChange = (constraint: string, value: number) => {
    setFormData({
      ...formData,
      constraints: {
        ...formData.constraints,
        [constraint]: value,
      },
    });
  };

  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.name.trim()) {
      newErrors.push('Rule name is required');
    }

    if (formData.priority < 1 || formData.priority > 10) {
      newErrors.push('Priority must be between 1 and 10');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(formData);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl text-white">
        <DialogHeader>
          <DialogTitle>Edit Rule</DialogTitle>
          <DialogDescription>
            Configure the orchestration rule
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="p-3 bg-red-900/20 border border-red-700 rounded text-red-400 text-sm">
              {errors.map((err, i) => (
                <div key={i}>• {err}</div>
              ))}
            </div>
          )}

          {/* Rule Name */}
          <div className="space-y-2">
            <Label>Rule Name</Label>
            <Input
              value={formData.name}
              onChange={handleNameChange}
              placeholder="e.g., Fast Code Gen"
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>

          {/* Priority */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Priority</Label>
              <span className="text-blue-400 font-semibold">
                {formData.priority}/10
              </span>
            </div>
            <Slider
              value={[formData.priority]}
              onValueChange={handlePriorityChange}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
          </div>

          {/* Agent Type Affinity */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Agent Type Affinity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {AGENT_TYPES.map((taskType) => (
                <div key={taskType} className="space-y-2">
                  <Label className="text-slate-400 text-xs uppercase">
                    {taskType} tasks
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {AGENT_TYPES.map((agentType) => {
                      const isSelected =
                        formData.agent_type_affinity[taskType] === agentType;
                      return (
                        <button
                          key={agentType}
                          onClick={() =>
                            handleAffinityToggle(taskType, agentType)
                          }
                          className={`px-3 py-1 rounded text-xs font-medium transition ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {agentType}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Constraints */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Constraints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">Max Agents</Label>
                  <span className="text-blue-400 text-xs">
                    {formData.constraints.max_agents || 'unlimited'}
                  </span>
                </div>
                <Slider
                  value={[formData.constraints.max_agents || 50]}
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
                  <Label className="text-xs">Max Cost Per Task ($)</Label>
                  <span className="text-blue-400 text-xs">
                    {formData.constraints.max_cost_per_task || 'unlimited'}
                  </span>
                </div>
                <Slider
                  value={[formData.constraints.max_cost_per_task || 100]}
                  onValueChange={(value) =>
                    handleConstraintChange('max_cost_per_task', value[0])
                  }
                  min={1}
                  max={500}
                  step={5}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Save Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
