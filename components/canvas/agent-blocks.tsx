/**
 * Agent Blocks for Prompt Canvas
 * Feature: P2-MH-01 - Agent Blocks Framework
 * 
 * 6 agent types as draggable canvas blocks:
 * - Planner
 * - Architect
 * - Implementer
 * - Tester
 * - Docs
 * - Lead
 * 
 * Each block has input/output ports and connects to form execution graph
 */

import React, { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { 
  Brain, 
  Pencil, 
  Code, 
  TestTube, 
  FileText, 
  Users,
  Settings,
  Play,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'

// Agent types
export type AgentType = 'planner' | 'architect' | 'implementer' | 'tester' | 'docs' | 'lead'

// Agent configuration
export const AGENT_CONFIG: Record<AgentType, {
  label: string
  description: string
  icon: React.ElementType
  color: string
  defaultPrompt: string
}> = {
  planner: {
    label: 'Planner',
    description: 'Breaks down tasks into actionable steps',
    icon: Brain,
    color: '#8B5CF6', // Purple
    defaultPrompt: 'Analyze the requirements and create a detailed task plan with dependencies.'
  },
  architect: {
    label: 'Architect',
    description: 'Designs system architecture and patterns',
    icon: Pencil,
    color: '#3B82F6', // Blue
    defaultPrompt: 'Design the system architecture and identify key components.'
  },
  implementer: {
    label: 'Implementer',
    description: 'Writes code and implements features',
    icon: Code,
    color: '#10B981', // Emerald
    defaultPrompt: 'Implement the feature according to the specifications.'
  },
  tester: {
    label: 'Tester',
    description: 'Writes tests and validates functionality',
    icon: TestTube,
    color: '#F59E0B', // Amber
    defaultPrompt: 'Write comprehensive tests and validate the implementation.'
  },
  docs: {
    label: 'Docs',
    description: 'Generates documentation and comments',
    icon: FileText,
    color: '#EC4899', // Pink
    defaultPrompt: 'Generate documentation for the implemented features.'
  },
  lead: {
    label: 'Lead',
    description: 'Coordinates team and manages workflow',
    icon: Users,
    color: '#6366F1', // Indigo
    defaultPrompt: 'Coordinate the team and manage the workflow execution.'
  }
}

// Base Agent Block Component
interface AgentBlockProps {
  id: string
  type: AgentType
  data: {
    label?: string
    prompt?: string
    status?: 'idle' | 'running' | 'success' | 'error'
    output?: string
    onConfigure?: (id: string, config: any) => void
    onRun?: (id: string) => void
  }
}

export const AgentBlock = memo(({ id, type, data }: AgentBlockProps) => {
  const config = AGENT_CONFIG[type]
  const Icon = config.icon
  
  const statusColors = {
    idle: 'border-gray-500',
    running: 'border-yellow-500 animate-pulse',
    success: 'border-green-500',
    error: 'border-red-500'
  }

  return (
    <div 
      className={`bg-gray-900 rounded-lg border-2 ${statusColors[data.status || 'idle']} min-w-[200px] shadow-lg`}
      style={{ borderColor: config.color }}
    >
      {/* Input Handle */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 !bg-gray-400"
      />
      
      {/* Header */}
      <div 
        className="flex items-center gap-2 px-3 py-2 rounded-t-lg"
        style={{ backgroundColor: `${config.color}20` }}
      >
        <Icon className="w-4 h-4" style={{ color: config.color }} />
        <span className="text-sm font-medium text-white">
          {data.label || config.label}
        </span>
        <div className="ml-auto">
          {data.status === 'running' && <Clock className="w-3 h-3 text-yellow-500 animate-spin" />}
          {data.status === 'success' && <CheckCircle className="w-3 h-3 text-green-500" />}
          {data.status === 'error' && <XCircle className="w-3 h-3 text-red-500" />}
        </div>
      </div>
      
      {/* Body */}
      <div className="px-3 py-2">
        <p className="text-xs text-gray-400 mb-2">
          {config.description}
        </p>
        
        {/* Prompt preview */}
        {data.prompt && (
          <div className="text-xs text-gray-500 bg-gray-800 p-2 rounded truncate">
            {data.prompt.slice(0, 50)}...
          </div>
        )}
        
        {/* Output preview */}
        {data.output && (
          <div className="text-xs text-green-400 bg-green-900/20 p-2 rounded mt-2">
            {data.output.slice(0, 50)}...
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex gap-1 px-3 py-2 border-t border-gray-700">
        <button 
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
          onClick={() => data.onConfigure?.(id, { type })}
        >
          <Settings className="w-3 h-3" /> Configure
        </button>
        <button 
          className="flex items-center justify-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded transition-colors"
          onClick={() => data.onRun?.(id)}
        >
          <Play className="w-3 h-3" /> Run
        </button>
      </div>
      
      {/* Output Handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 !bg-gray-400"
      />
    </div>
  )
})

AgentBlock.displayName = 'AgentBlock'

// Agent Block Palette Item
interface AgentPaletteItemProps {
  type: AgentType
  onDragStart: (event: React.DragEvent, type: AgentType) => void
}

export const AgentPaletteItem = ({ type, onDragStart }: AgentPaletteItemProps) => {
  const config = AGENT_CONFIG[type]
  const Icon = config.icon
  
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, type)}
      className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-grab transition-colors"
    >
      <Icon className="w-4 h-4" style={{ color: config.color }} />
      <span className="text-sm text-gray-200">{config.label}</span>
    </div>
  )
}

// Agent Blocks Palette Component
interface AgentBlocksPaletteProps {
  onDragStart: (event: React.DragEvent, type: AgentType) => void
}

export const AgentBlocksPalette = ({ onDragStart }: AgentBlocksPaletteProps) => {
  const agentTypes: AgentType[] = ['planner', 'architect', 'implementer', 'tester', 'docs', 'lead']
  
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Agent Blocks
      </h3>
      <div className="space-y-1">
        {agentTypes.map((type) => (
          <AgentPaletteItem 
            key={type} 
            type={type} 
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  )
}

export default AgentBlock
