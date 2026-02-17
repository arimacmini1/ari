/**
 * Quick Actions Menu Component
 * Feature: P1-SH-03 - Quick Actions Menu
 * 
 * Command palette for common actions (Cmd+K)
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Search, 
  Plus, 
  Upload, 
  FolderOpen, 
  MessageSquare,
  Settings,
  Command,
  X
} from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

export interface QuickAction {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  shortcut?: string
  action: () => void
  category: "create" | "import" | "navigation" | "settings"
}

export interface QuickActionsMenuProps {
  actions?: QuickAction[]
  onOpenChange?: (open: boolean) => void
}

const defaultActions: QuickAction[] = [
  {
    id: "import-repo",
    label: "Import Repository",
    description: "Import a GitHub repository",
    icon: <Upload className="w-4 h-4" />,
    shortcut: "⌘I",
    category: "import",
    action: () => console.log("Import repo"),
  },
  {
    id: "new-meeting",
    label: "New Meeting",
    description: "Start a new AI meeting",
    icon: <Plus className="w-4 h-4" />,
    shortcut: "⌘N",
    category: "create",
    action: () => console.log("New meeting"),
  },
  {
    id: "open-workspace",
    label: "Open Workspace",
    description: "Open code workspace",
    icon: <FolderOpen className="w-4 h-4" />,
    shortcut: "⌘W",
    category: "navigation",
    action: () => console.log("Open workspace"),
  },
  {
    id: "open-canvas",
    label: "Open Canvas",
    description: "Open prompt canvas",
    icon: <MessageSquare className="w-4 h-4" />,
    shortcut: "⌘K",
    category: "navigation",
    action: () => console.log("Open canvas"),
  },
  {
    id: "settings",
    label: "Settings",
    description: "Open settings",
    icon: <Settings className="w-4 h-4" />,
    shortcut: "⌘,",
    category: "settings",
    action: () => console.log("Settings"),
  },
]

const categoryLabels = {
  create: "Create",
  import: "Import",
  navigation: "Navigation",
  settings: "Settings",
}

export function QuickActionsMenu({
  actions = defaultActions,
  onOpenChange,
}: QuickActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  const filteredActions = actions.filter(
    (action) =>
      action.label.toLowerCase().includes(query.toLowerCase()) ||
      action.description?.toLowerCase().includes(query.toLowerCase())
  )
  
  const groupedActions = filteredActions.reduce((acc, action) => {
    if (!acc[action.category]) {
      acc[action.category] = []
    }
    acc[action.category].push(action)
    return acc
  }, {} as Record<string, QuickAction[]>)
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault()
      setOpen(true)
    }
    
    if (!open) return
    
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filteredActions.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
        break
      case "Enter":
        e.preventDefault()
        if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].action()
          setOpen(false)
        }
        break
      case "Escape":
        setOpen(false)
        break
    }
  }, [open, filteredActions, selectedIndex])
  
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
  
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])
  
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    setQuery("")
    setSelectedIndex(0)
    onOpenChange?.(isOpen)
  }
  
  let globalIndex = -1
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 bg-slate-900 border-slate-700">
        {/* Search Input */}
        <div className="flex items-center gap-2 p-3 border-b border-slate-700">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-slate-200 placeholder-slate-400 outline-none text-sm"
            autoFocus
          />
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
        </div>
        
        {/* Actions List */}
        <div className="max-h-[300px] overflow-auto p-2">
          {filteredActions.length === 0 ? (
            <div className="text-center text-slate-500 py-8 text-sm">
              No actions found
            </div>
          ) : (
            Object.entries(groupedActions).map(([category, categoryActions]) => (
              <div key={category} className="mb-2">
                <div className="text-xs text-slate-500 px-2 py-1">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </div>
                {categoryActions.map((action) => {
                  globalIndex++
                  const idx = globalIndex
                  return (
                    <button
                      key={action.id}
                      onClick={() => {
                        action.action()
                        handleOpenChange(false)
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left ${
                        idx === selectedIndex
                          ? "bg-blue-600 text-white"
                          : "text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      {action.icon}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{action.label}</div>
                        {action.description && (
                          <div className={`text-xs ${
                            idx === selectedIndex ? "text-blue-200" : "text-slate-400"
                          }`}>
                            {action.description}
                          </div>
                        )}
                      </div>
                      {action.shortcut && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          idx === selectedIndex ? "bg-blue-700" : "bg-slate-700"
                        }`}>
                          {action.shortcut}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-700 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Hook to trigger quick actions from anywhere
 */
export function useQuickActions() {
  const [isOpen, setIsOpen] = useState(false)
  
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((o) => !o),
  }
}