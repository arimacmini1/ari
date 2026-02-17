/**
 * Simple Canvas Page
 * A streamlined way to build with the Canvas
 */

"use client"

import { SimplifiedCanvas } from "@/components/canvas/simplified-canvas"

export default function SimpleCanvasPage() {
  // In a real app, this would come from the project context
  const projectContext = {
    name: "My Project",
    files: 42,
    branch: "main",
    commit: "abc1234"
  }

  const handleExecute = (steps: any[]) => {
    console.log('Executing steps:', steps)
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <SimplifiedCanvas 
        projectContext={projectContext}
        onExecute={handleExecute}
      />
    </div>
  )
}
