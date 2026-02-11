'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DecisionContextDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodeId: string
  context: string
}

export function DecisionContextDialog({
  open,
  onOpenChange,
  nodeId,
  context,
}: DecisionContextDialogProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(context)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[60vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Decision Context: {nodeId}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded border border-slate-800 font-mono text-sm whitespace-pre-wrap break-words text-slate-300">
          {context}
        </div>

        <DialogFooter className="gap-2">
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy to Clipboard
              </>
            )}
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            size="sm"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
