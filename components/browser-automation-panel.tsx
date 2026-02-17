/**
 * Browser Automation Panel
 * Feature: Screenshot Capability + UI Testing
 * 
 * UI panel for testing UI through clicking sequences
 */

"use client"

import { useState } from 'react'
import { useBrowser, useUITest } from '@/lib/browser-automation'
import { 
  Monitor, 
  MousePointer, 
  Keyboard, 
  Camera, 
  Play, 
  Trash2,
  RefreshCw
} from 'lucide-react'

interface TestStep {
  id: string
  type: 'navigate' | 'click' | 'type'
  value: string
  optional?: string // for type: text to type
}

export function BrowserAutomationPanel() {
  const { history, clearHistory } = useBrowser()
  const { results, runSequence, clearResults } = useUITest()
  
  const [url, setUrl] = useState('http://localhost:3000')
  const [testSteps, setTestSteps] = useState<TestStep[]>([])
  const [running, setRunning] = useState(false)

  // Add test step
  const addStep = (type: TestStep['type']) => {
    const newStep: TestStep = {
      id: Math.random().toString(36).slice(2),
      type,
      value: type === 'navigate' ? url : '',
      optional: type === 'type' ? '' : undefined,
    }
    setTestSteps([...testSteps, newStep])
  }

  // Remove test step
  const removeStep = (id: string) => {
    setTestSteps(testSteps.filter(s => s.id !== id))
  }

  // Update step
  const updateStep = (id: string, field: 'value' | 'optional', value: string) => {
    setTestSteps(testSteps.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ))
  }

  // Run test sequence
  const handleRunTest = async () => {
    setRunning(true)
    const actions = testSteps.map(s => ({
      type: s.type,
      selector: s.value,
      url: s.value,
      text: s.optional,
    })) as any
    
    await runSequence(actions)
    setRunning(false)
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-2">
        <Monitor className="w-5 h-5" />
        <h2 className="text-lg font-semibold">UI Click-Through Testing</h2>
      </div>

      {/* URL Input */}
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://localhost:3000"
          className="flex-1 px-3 py-2 bg-background border rounded-md text-sm"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => addStep('navigate')}
          className="flex items-center gap-1 px-3 py-1.5 bg-secondary rounded-md text-xs hover:bg-secondary/80"
        >
          <Monitor className="w-3 h-3" /> Navigate
        </button>
        <button
          onClick={() => addStep('click')}
          className="flex items-center gap-1 px-3 py-1.5 bg-secondary rounded-md text-xs hover:bg-secondary/80"
        >
          <MousePointer className="w-3 h-3" /> Click
        </button>
        <button
          onClick={() => addStep('type')}
          className="flex items-center gap-1 px-3 py-1.5 bg-secondary rounded-md text-xs hover:bg-secondary/80"
        >
          <Keyboard className="w-3 h-3" /> Type
        </button>
        <button
          onClick={() => addStep('click')} // screenshot is click-like
          className="flex items-center gap-1 px-3 py-1.5 bg-secondary rounded-md text-xs hover:bg-secondary/80"
        >
          <Camera className="w-3 h-3" /> Screenshot
        </button>
      </div>

      {/* Test Steps */}
      {testSteps.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Test Sequence</h3>
          {testSteps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-2 p-2 bg-card rounded-md">
              <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
              <span className="text-xs px-2 py-0.5 bg-primary/20 rounded uppercase">
                {step.type}
              </span>
              {step.type === 'navigate' && (
                <input
                  type="url"
                  value={step.value}
                  onChange={(e) => updateStep(step.id, 'value', e.target.value)}
                  placeholder="URL to navigate"
                  className="flex-1 px-2 py-1 bg-background border rounded text-xs"
                />
              )}
              {step.type === 'click' && (
                <input
                  type="text"
                  value={step.value}
                  onChange={(e) => updateStep(step.id, 'value', e.target.value)}
                  placeholder="CSS selector (e.g., #button-id)"
                  className="flex-1 px-2 py-1 bg-background border rounded text-xs font-mono"
                />
              )}
              {step.type === 'type' && (
                <>
                  <input
                    type="text"
                    value={step.value}
                    onChange={(e) => updateStep(step.id, 'value', e.target.value)}
                    placeholder="Selector"
                    className="flex-1 px-2 py-1 bg-background border rounded text-xs font-mono"
                  />
                  <span className="text-xs text-muted-foreground">→</span>
                  <input
                    type="text"
                    value={step.optional || ''}
                    onChange={(e) => updateStep(step.id, 'optional', e.target.value)}
                    placeholder="Text to type"
                    className="flex-1 px-2 py-1 bg-background border rounded text-xs"
                  />
                </>
              )}
              <button
                onClick={() => removeStep(step.id)}
                className="p-1 hover:bg-destructive/20 rounded"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Run Button */}
      {testSteps.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={handleRunTest}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {running ? 'Running...' : 'Run Test'}
          </button>
          <button
            onClick={() => { setTestSteps([]); clearResults() }}
            className="flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-secondary"
          >
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Results</h3>
          <div className="space-y-1">
            {results.map((result, index) => (
              <div 
                key={index}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs ${
                  result.success ? 'bg-emerald-500/10' : 'bg-destructive/10'
                }`}
              >
                <span className={result.success ? 'text-emerald-500' : 'text-destructive'}>
                  {result.success ? '✓' : '✗'}
                </span>
                <span className="uppercase">{result.action.type}</span>
                <span className="text-muted-foreground">
                  {result.action.type === 'navigate' && result.action.url}
                  {result.action.type === 'click' && result.action.selector}
                  {result.action.type === 'type' && `${result.action.selector} → "${result.action.text}"`}
                </span>
                {result.error && (
                  <span className="text-destructive">{result.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Action History</h3>
            <button
              onClick={clearHistory}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1">
            {history.map((action, index) => (
              <div key={index} className="text-xs text-muted-foreground px-2">
                {action.type}: {action.type === 'navigate' ? (action as any).url : (action as any).selector}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
