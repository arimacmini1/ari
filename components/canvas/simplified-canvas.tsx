/**
 * Simplified Canvas Flow
 * 
 * A much simpler way to build with the Canvas:
 * 1. What do you want? (Intent)
 * 2. How? (Steps)
 * 3. Run it!
 */

"use client"

import { useState } from "react"
import { 
  Play, 
  Plus, 
  Trash2, 
  ArrowRight, 
  Sparkles,
  Code,
  FileText,
  TestTube,
  Settings,
  ChevronRight,
  Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type StepType = 'analyze' | 'write' | 'test' | 'document' | 'review'

interface Step {
  id: string
  type: StepType
  prompt: string
  status: 'pending' | 'running' | 'done' | 'error'
  output?: string
}

const STEP_CONFIG: Record<StepType, {
  label: string
  icon: React.ElementType
  color: string
  placeholder: string
  description: string
}> = {
  analyze: {
    label: 'Analyze',
    icon: Sparkles,
    color: 'bg-purple-500',
    placeholder: 'What should I analyze? (e.g., "Look at the codebase and identify the main components")',
    description: 'Understand the code and structure'
  },
  write: {
    label: 'Write Code',
    icon: Code,
    color: 'bg-green-500',
    placeholder: 'What should I build? (e.g., "Create a new API endpoint for users")',
    description: 'Generate new code'
  },
  test: {
    label: 'Test',
    icon: TestTube,
    color: 'bg-amber-500',
    placeholder: 'What should I test? (e.g., "Write tests for the new endpoint")',
    description: 'Create and run tests'
  },
  document: {
    label: 'Document',
    icon: FileText,
    color: 'bg-pink-500',
    placeholder: 'What should I document? (e.g., "Create README for the API")',
    description: 'Generate documentation'
  },
  review: {
    label: 'Review',
    icon: Settings,
    color: 'bg-blue-500',
    placeholder: 'What should I review? (e.g., "Review the code for bugs")',
    description: 'Review and improve'
  }
}

interface SimplifiedCanvasProps {
  projectContext?: {
    name: string
    files: number
    branch: string
    commit: string
  }
  onExecute?: (steps: Step[]) => void
}

export function SimplifiedCanvas({ projectContext, onExecute }: SimplifiedCanvasProps) {
  const [intent, setIntent] = useState('')
  const [steps, setSteps] = useState<Step[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Add a step
  const addStep = (type: StepType) => {
    const newStep: Step = {
      id: `step-${Date.now()}`,
      type,
      prompt: '',
      status: 'pending'
    }
    setSteps([...steps, newStep])
  }

  // Remove a step
  const removeStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id))
  }

  // Update step prompt
  const updateStepPrompt = (id: string, prompt: string) => {
    setSteps(steps.map(s => s.id === id ? { ...s, prompt } : s))
  }

  // Run the workflow
  const runWorkflow = async () => {
    setIsRunning(true)
    
    // Mark all as running
    setSteps(steps.map(s => ({ ...s, status: 'running' })))
    
    // Execute each step (simulated - in real use, call the agent)
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      
      // Simulate execution
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setSteps(prev => prev.map((s, idx) => 
        idx === i 
          ? { ...s, status: 'done', output: `Completed ${STEP_CONFIG[s.type].label} step` }
          : s
      ))
    }
    
    setIsRunning(false)
    onExecute?.(steps)
  }

  // Quick add - intent to steps
  const autoGenerateSteps = () => {
    if (!intent) return
    
    // Simple heuristic to generate steps
    const newSteps: Step[] = []
    
    // Always start with analyze
    newSteps.push({
      id: `step-${Date.now()}-analyze`,
      type: 'analyze',
      prompt: `Analyze: ${intent}`,
      status: 'pending'
    })
    
    // Add write step
    if (intent.toLowerCase().includes('build') || intent.toLowerCase().includes('create') || intent.toLowerCase().includes('write')) {
      newSteps.push({
        id: `step-${Date.now()}-write`,
        type: 'write',
        prompt: intent,
        status: 'pending'
      })
    }
    
    // Add test step
    newSteps.push({
      id: `step-${Date.now()}-test`,
      type: 'test',
      prompt: `Test: ${intent}`,
      status: 'pending'
    })
    
    // Add document step
    newSteps.push({
      id: `step-${Date.now()}-doc`,
      type: 'document',
      prompt: `Document: ${intent}`,
      status: 'pending'
    })
    
    setSteps(newSteps)
  }

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Simple Canvas
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Build something in 3 steps: Analyze → Write → Test
        </p>
      </div>

      {/* Intent Input */}
      <div className="p-4 border-b border-gray-800">
        <label className="text-sm font-medium text-gray-300 mb-2 block">
          1. What do you want to build?
        </label>
        <div className="flex gap-2">
          <Input
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="e.g., Create a login page, Fix the bug, Add tests..."
            className="flex-1 bg-gray-900 border-gray-700"
            onKeyDown={(e) => e.key === 'Enter' && autoGenerateSteps()}
          />
          <Button onClick={autoGenerateSteps} className="bg-purple-600 hover:bg-purple-500">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Generate
          </Button>
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-auto p-4">
        <label className="text-sm font-medium text-gray-300 mb-3 block">
          2. Your Steps
        </label>
        
        {steps.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">No steps yet. Add one below or use AI Generate above.</p>
            
            {/* Quick Add Buttons */}
            <div className="flex flex-wrap justify-center gap-2">
              {(Object.keys(STEP_CONFIG) as StepType[]).map((type) => {
                const config = STEP_CONFIG[type]
                const Icon = config.icon
                return (
                  <button
                    key={type}
                    onClick={() => addStep(type)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Icon className={`w-4 h-4 ${config.color.replace('bg-', 'text-')}`} />
                    <span>{config.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, index) => {
              const config = STEP_CONFIG[step.type]
              const Icon = config.icon
              
              return (
                <Card key={step.id} className="bg-gray-900 border-gray-800">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {/* Step Number */}
                      <div className={`w-6 h-6 rounded-full ${config.color} flex items-center justify-center text-xs font-bold`}>
                        {index + 1}
                      </div>
                      
                      {/* Step Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-4 h-4 ${config.color.replace('bg-', 'text-')}`} />
                          <span className="font-medium">{config.label}</span>
                          <Badge variant="outline" className="text-xs">
                            {step.status}
                          </Badge>
                        </div>
                        
                        <Input
                          value={step.prompt}
                          onChange={(e) => updateStepPrompt(step.id, e.target.value)}
                          placeholder={config.placeholder}
                          className="bg-gray-800 border-gray-700 text-sm"
                        />
                        
                        {step.output && (
                          <div className="mt-2 p-2 bg-green-900/20 text-green-400 text-xs rounded">
                            {step.output}
                          </div>
                        )}
                      </div>
                      
                      {/* Remove */}
                      <button
                        onClick={() => removeStep(step.id)}
                        className="p-1 hover:bg-gray-800 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            
            {/* Add More */}
            <div className="flex justify-center gap-2 pt-2">
              {(Object.keys(STEP_CONFIG) as StepType[]).map((type) => {
                const config = STEP_CONFIG[type]
                const Icon = config.icon
                return (
                  <button
                    key={type}
                    onClick={() => addStep(type)}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                  >
                    <Plus className="w-3 h-3" />
                    <Icon className={`w-3 h-3 ${config.color.replace('bg-', 'text-')}`} />
                    {config.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Run Button */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-400 hover:text-white"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </button>
          
          <Button
            onClick={runWorkflow}
            disabled={steps.length === 0 || isRunning}
            className="bg-green-600 hover:bg-green-500 px-6"
          >
            {isRunning ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Workflow
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SimplifiedCanvas