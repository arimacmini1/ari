'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, PanelRightOpen } from 'lucide-react';
import RuleEditor from '@/components/aei/rule-editor';
import RuleList from '@/components/aei/rule-list';
import RuleVisualization from '@/components/aei/rule-visualization';
import SimulationPanel from '@/components/aei/simulation-panel';
import { ArtifactPreviewPanel } from '@/components/aei/artifact-preview-panel';
import OrchestratorDagBuilder from '@/components/aei/orchestrator-dag-builder';
import TemporalWorkflowEditor from '@/components/aei/temporal-workflow-editor';
import type { Artifact } from '@/lib/artifact-model';

export interface Rule {
  id: string;
  name: string;
  priority: number;
  dependencies: string[];
  agent_type_affinity: Record<string, string>;
  constraints: {
    max_agents?: number;
    max_cost_per_task?: number;
  };
}

export default function OrchestratorPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [previousArtifacts, setPreviousArtifacts] = useState<Artifact[]>([]);
  const [previewPanelExpanded, setPreviewPanelExpanded] = useState(true);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/orchestrator');
      if (response.ok) {
        const data = await response.json();
        setRules(data.rules || []);
      }
    } catch (error) {
      console.error('Failed to load rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = () => {
    setEditingRule({
      id: `rule-${Date.now()}`,
      name: '',
      priority: 5,
      dependencies: [],
      agent_type_affinity: {},
      constraints: {},
    });
    setShowEditor(true);
  };

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule);
    setShowEditor(true);
  };

  const handleSaveRule = async (rule: Rule) => {
    try {
      const ruleExists = rules.some((existingRule) => existingRule.id === rule.id);
      const response = await fetch(
        ruleExists ? `/api/orchestrator/${rule.id}` : '/api/orchestrator',
        {
          method: ruleExists ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            ruleExists
              ? { rule }
              : {
                  rule_set_id: rule.id,
                  rule,
                }
          ),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRules((prev) => [
          ...prev.filter((r) => r.id !== rule.id),
          data.rule,
        ]);
        setShowEditor(false);
        setEditingRule(null);
        setSelectedRule(data.rule);
      } else {
        alert('Failed to save rule');
      }
    } catch (error) {
      console.error('Failed to save rule:', error);
      alert('Error saving rule');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Delete this rule?')) return;

    try {
      const response = await fetch(`/api/orchestrator/${ruleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setRules((prev) => prev.filter((r) => r.id !== ruleId));
        if (selectedRule?.id === ruleId) {
          setSelectedRule(null);
        }
      } else {
        alert('Failed to delete rule');
      }
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const handleArtifactsGenerated = useCallback((newArtifacts: Artifact[]) => {
    setPreviousArtifacts(artifacts);
    setArtifacts(newArtifacts);
    setPreviewPanelExpanded(true);
  }, [artifacts]);

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      {/* Left Sidebar: Rules */}
      <div className="w-80 border-r border-slate-700 overflow-y-auto shrink-0">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold mb-3">Orchestration Rules</h2>
          <Button
            onClick={handleCreateRule}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Rule
          </Button>
        </div>

        {loading ? (
          <div className="p-4 text-center text-slate-400">Loading...</div>
        ) : (
          <RuleList
            rules={rules}
            selectedRule={selectedRule}
            onSelectRule={setSelectedRule}
            onEditRule={handleEditRule}
            onDeleteRule={handleDeleteRule}
          />
        )}
      </div>

      {/* Main Content: Visualization & Simulation */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="grid grid-cols-2 gap-4 p-4 flex-1 min-h-0">
          {/* Rule Visualization */}
          <Card className="bg-slate-900 border-slate-700 overflow-hidden flex flex-col">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle>Rule Visualization</CardTitle>
              <CardDescription>
                {selectedRule ? selectedRule.name : 'Select a rule to visualize'}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1 min-h-0">
              {selectedRule ? (
                <RuleVisualization rule={selectedRule} />
              ) : (
                <div className="flex items-center justify-center text-slate-500 h-full">
                  Select a rule to see visualization
                </div>
              )}
            </CardContent>
          </Card>

          {/* Simulation Panel */}
          <Card className="bg-slate-900 border-slate-700 overflow-hidden flex flex-col">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle>Simulation</CardTitle>
              <CardDescription>
                {selectedRule ? 'Configure and run simulations' : 'Select a rule first'}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1 min-h-0">
              {selectedRule ? (
                <SimulationPanel
                  rule={selectedRule}
                  onArtifactsGenerated={handleArtifactsGenerated}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  Select a rule to simulate
                </div>
              )}
            </CardContent>
          </Card>

          {/* DAG Builder + Dynamic Allocation */}
          <Card className="bg-slate-900 border-slate-700 overflow-hidden flex flex-col col-span-2 min-h-[420px]">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle>DAG Builder & Dynamic Allocation</CardTitle>
              <CardDescription>
                {selectedRule
                  ? 'Build coordination DAG nodes/edges and inspect live agent allocation recommendations.'
                  : 'Select a rule to start building orchestration DAGs.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1 min-h-0">
              {selectedRule ? (
                <OrchestratorDagBuilder rule={selectedRule} />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  Select a rule to use the DAG builder
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-700 overflow-hidden flex flex-col col-span-2 min-h-[420px]">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle>Temporal Workflow Editor (Constrained)</CardTitle>
              <CardDescription>
                View workflow graph and edit safe fields with server-side validation gates.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1 min-h-0">
              <TemporalWorkflowEditor />
            </CardContent>
          </Card>
        </div>

        {/* Expand button when panel is collapsed */}
        {!previewPanelExpanded && artifacts.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="fixed right-4 top-4 z-10 bg-slate-800 border border-slate-700"
            onClick={() => setPreviewPanelExpanded(true)}
          >
            <PanelRightOpen className="w-4 h-4 mr-2" />
            Artifacts ({artifacts.length})
          </Button>
        )}
      </div>

      {/* Right Sidebar: Artifact Preview Panel */}
      {previewPanelExpanded && (
        <ArtifactPreviewPanel
          artifacts={artifacts}
          previousArtifacts={previousArtifacts}
          isExpanded={previewPanelExpanded}
          onToggle={setPreviewPanelExpanded}
        />
      )}

      {/* Rule Editor Modal */}
      {showEditor && editingRule && (
        <RuleEditor
          rule={editingRule}
          onSave={handleSaveRule}
          onCancel={() => {
            setShowEditor(false);
            setEditingRule(null);
          }}
        />
      )}
    </div>
  );
}
