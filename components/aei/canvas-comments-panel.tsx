"use client"

import { useMemo, useState } from "react"
import { MessageSquare, AtSign, Clock, Trash2, PanelRightClose } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CanvasNode } from "@/lib/canvas-state"
import type { CanvasCommentThread, CanvasActivityEntry, CanvasActivityType } from "@/lib/canvas-comments"

interface CanvasCommentsPanelProps {
  selectedNode: CanvasNode | null
  activeThread: CanvasCommentThread | null
  activity: CanvasActivityEntry[]
  unreadMentions: number
  actorMentionHandle: string
  onAddComment: (nodeId: string, nodeLabel: string, body: string) => boolean
  onMarkActivityRead: (activityId: string) => void
  onMarkAllActivityRead: () => void
  onClearReadActivity: () => void
  onHidePanel: () => void
}

export function CanvasCommentsPanel({
  selectedNode,
  activeThread,
  activity,
  unreadMentions,
  actorMentionHandle,
  onAddComment,
  onMarkActivityRead,
  onMarkAllActivityRead,
  onClearReadActivity,
  onHidePanel,
}: CanvasCommentsPanelProps) {
  const [draft, setDraft] = useState("")
  const [activityFilter, setActivityFilter] = useState<"all" | CanvasActivityType>("all")

  const filteredActivity = useMemo(() => {
    if (activityFilter === "all") return activity
    return activity.filter((entry) => entry.type === activityFilter)
  }, [activity, activityFilter])
  const recentActivity = useMemo(() => filteredActivity.slice(0, 8), [filteredActivity])

  const submitComment = () => {
    if (!selectedNode) return
    const label = selectedNode.data.label?.trim() || selectedNode.id
    const added = onAddComment(selectedNode.id, label, draft)
    if (added) setDraft("")
  }

  return (
    <div className="w-80 border-l border-border bg-card/40 flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Comments</h3>
          <p className="text-[11px] text-muted-foreground">@{actorMentionHandle} activity tracked</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadMentions > 0 && (
            <span className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-200/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
              {unreadMentions} unread
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={onHidePanel}
            aria-label="Hide comments panel"
            title="Hide comments panel"
          >
            <PanelRightClose className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-foreground flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              Block thread
            </div>
            <span className="text-[10px] text-muted-foreground">
              {selectedNode ? selectedNode.data.label || selectedNode.id : "Select a block"}
            </span>
          </div>

          {!selectedNode && (
            <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
              Select a canvas block to start or view a thread.
            </div>
          )}

          {selectedNode && (
            <>
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Add comment (use @user for mentions)"
                className="h-8 text-xs"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    submitComment()
                  }
                }}
              />
              <div className="flex justify-end">
                <Button size="sm" className="h-7 text-xs" onClick={submitComment}>
                  Post
                </Button>
              </div>

              <div className="space-y-2">
                {(activeThread?.comments || []).length === 0 && (
                  <div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
                    No comments yet.
                  </div>
                )}
                {(activeThread?.comments || []).map((comment) => (
                  <div key={comment.id} className="rounded-md border border-border px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground">{comment.author_name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(comment.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-foreground/90 whitespace-pre-wrap">{comment.body}</p>
                    {comment.mentions.length > 0 && (
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        mentions: {comment.mentions.map((mention) => `@${mention}`).join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-foreground flex items-center gap-1">
              <AtSign className="w-3 h-3" />
              Activity feed
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={onMarkAllActivityRead}>
                Mark all read
              </Button>
              <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={onClearReadActivity}>
                <Trash2 className="w-3 h-3" />
                Clear read
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {(["all", "mention", "comment", "edit", "rollback"] as const).map((filterId) => (
              <button
                key={filterId}
                type="button"
                onClick={() => setActivityFilter(filterId)}
                className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                  activityFilter === filterId
                    ? "border-primary/50 bg-primary/20 text-foreground"
                    : "border-border text-muted-foreground hover:bg-secondary/40"
                }`}
              >
                {filterId === "all" ? "all" : `${filterId}s`}
              </button>
            ))}
          </div>

          {recentActivity.length === 0 && (
            <div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
              No activity yet.
            </div>
          )}

          {recentActivity.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onMarkActivityRead(entry.id)}
              className="w-full text-left rounded-md border border-border px-3 py-2 hover:bg-secondary/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground">
                  {entry.type === "mention" && entry.mention ? `@${entry.mention}` : entry.type}
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(entry.created_at).toLocaleTimeString()}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {entry.actor_name} on {entry.node_label}
              </div>
              <div className="mt-1 text-xs text-foreground/90">{entry.summary}</div>
              {entry.read_at === null && (
                <div className="mt-1 text-[10px] text-amber-300">Unread</div>
              )}
            </button>
          ))}
        </section>
      </div>
    </div>
  )
}
