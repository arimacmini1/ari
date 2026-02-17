/**
 * Commit Badge Display Component
 * Feature: P1-SH-01 - Commit Badge Display
 * 
 * Shows current branch and commit hash in the header
 */

"use client"

import { useState, useEffect } from "react"
import { GitBranch, GitCommit, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface CommitBadgeProps {
  branch?: string
  commitHash?: string
  commitMessage?: string
  className?: string
}

export function CommitBadge({
  branch = "main",
  commitHash,
  commitMessage,
  className = "",
}: CommitBadgeProps) {
  const [copied, setCopied] = useState(false)
  const [shortHash, setShortHash] = useState(commitHash?.slice(0, 7) || "-----")

  const copyToClipboard = async () => {
    if (commitHash) {
      await navigator.clipboard.writeText(commitHash)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 bg-slate-800 rounded-md text-xs ${className}`}
    >
      {/* Branch Icon + Name */}
      <div className="flex items-center gap-1 text-blue-400">
        <GitBranch className="w-3 h-3" />
        <span className="font-mono">{branch}</span>
      </div>

      {/* Divider */}
      <div className="w-px h-3 bg-slate-600" />

      {/* Commit Icon + Hash */}
      <button
        onClick={copyToClipboard}
        className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
        title={commitHash ? `Click to copy ${commitHash}` : "No commit"}
      >
        <GitCommit className="w-3 h-3" />
        <span className="font-mono">{shortHash}</span>
        {copied ? (
          <Check className="w-3 h-3 text-green-400" />
        ) : (
          <Copy className="w-3 h-3 opacity-50" />
        )}
      </button>

      {/* Commit Message (truncated) */}
      {commitMessage && (
        <>
          <div className="w-px h-3 bg-slate-600" />
          <span className="text-slate-500 truncate max-w-[150px]">
            {commitMessage}
          </span>
        </>
      )}
    </div>
  )
}

/**
 * Hook to get current repo commit info
 */
export function useCurrentCommit() {
  const [commitInfo, setCommitInfo] = useState<{
    branch: string
    hash: string
    message: string
  } | null>(null)

  useEffect(() => {
    // Get from project context if available
    const fetchCommit = async () => {
      try {
        const res = await fetch("/api/projects/active")
        const data = await res.json()
        if (data.project?.last_commit_hash) {
          setCommitInfo({
            branch: data.project.branch || "main",
            hash: data.project.last_commit_hash,
            message: data.project.last_commit || "",
          })
        }
      } catch (e) {
        // Silent fail
      }
    }
    fetchCommit()
  }, [])

  return commitInfo
}
