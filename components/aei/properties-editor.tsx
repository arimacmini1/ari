"use client"

import React, { useState } from "react"
import { X, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { CanvasNode } from "@/lib/canvas-state"

interface PropertiesEditorProps {
  node: CanvasNode | null
  onClose: () => void
  onSave: (node: CanvasNode) => void
}

export function PropertiesEditor({ node, onClose, onSave }: PropertiesEditorProps) {
  const [formData, setFormData] = useState<CanvasNode["data"] | null>(
    node?.data || null
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!node || !formData) return null

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.label.trim()) {
      newErrors.label = "Label is required"
    }
    if (formData.blockType === "loop" && formData.loopCount !== undefined) {
      if (formData.loopCount < 1) {
        newErrors.loopCount = "Loop count must be > 0"
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (validate()) {
      onSave({ ...node, data: formData })
      onClose()
    }
  }

  return (
    <div className="w-64 border-l border-border bg-card/50 flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-sm font-semibold text-foreground">Properties</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-secondary/50 rounded transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Label */}
        <div className="space-y-2">
          <Label htmlFor="label" className="text-xs font-medium">
            Label
          </Label>
          <Input
            id="label"
            value={formData.label}
            onChange={(e) =>
              setFormData({ ...formData, label: e.target.value })
            }
            className="h-8 text-xs"
          />
          {errors.label && (
            <div className="flex items-center gap-1.5 text-destructive text-[10px]">
              <AlertCircle className="w-3 h-3" />
              {errors.label}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-xs font-medium">
            Description
          </Label>
          <textarea
            id="description"
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className={cn(
              "w-full p-2 text-xs border border-input bg-background rounded-md",
              "focus:outline-none focus:ring-1 focus:ring-primary"
            )}
            rows={3}
          />
        </div>

        {/* Block Type */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Block Type</Label>
          <div className="px-2 py-1.5 bg-secondary/50 rounded text-xs text-muted-foreground">
            {formData.blockType}
          </div>
        </div>

        {/* Loop Count */}
        {formData.blockType === "loop" && (
          <div className="space-y-2">
            <Label htmlFor="loopCount" className="text-xs font-medium">
              Loop Count
            </Label>
            <Input
              id="loopCount"
              type="number"
              value={formData.loopCount || 1}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  loopCount: Math.max(1, parseInt(e.target.value) || 1),
                })
              }
              className="h-8 text-xs"
              min="1"
            />
            {errors.loopCount && (
              <div className="flex items-center gap-1.5 text-destructive text-[10px]">
                <AlertCircle className="w-3 h-3" />
                {errors.loopCount}
              </div>
            )}
          </div>
        )}

        {/* Condition Text */}
        {formData.blockType === "decision" && (
          <div className="space-y-2">
            <Label htmlFor="conditionText" className="text-xs font-medium">
              Condition
            </Label>
            <textarea
              id="conditionText"
              value={formData.conditionText || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  conditionText: e.target.value,
                })
              }
              className={cn(
                "w-full p-2 text-xs border border-input bg-background rounded-md",
                "focus:outline-none focus:ring-1 focus:ring-primary"
              )}
              rows={2}
              placeholder="e.g., if x > 10"
            />
          </div>
        )}

        {/* Agent Type */}
        {formData.blockType === "task" && (
          <div className="space-y-2">
            <Label htmlFor="agentType" className="text-xs font-medium">
              Agent Type
            </Label>
            <Input
              id="agentType"
              value={formData.agentType || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  agentType: e.target.value,
                })
              }
              className="h-8 text-xs"
              placeholder="e.g., code-gen-alpha"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-2 p-4 border-t border-border shrink-0">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleSave}
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs"
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
