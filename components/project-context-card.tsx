'use client'

/**
 * Project Context Card Component
 * Feature: P1-MH-02 - Project Context Card
 * 
 * Displays imported repo info: name, files count, last commit, branch
 */

import { useState, useEffect } from 'react'
import { StatusIndicator } from './status-indicator'

interface RepoInfo {
  id: string
  name: string
  url: string
  status: string
  files_count?: number
  last_commit?: string
  last_commit_hash?: string
  branch?: string
  project_path?: string
}

interface ProjectContextCardProps {
  repoId?: string
}

export function ProjectContextCard({ repoId }: ProjectContextCardProps) {
  const [repo, setRepo] = useState<RepoInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRepo() {
      try {
        const url = repoId 
          ? `/api/repos/import?id=${repoId}`
          : '/api/repos/import'
        const response = await fetch(url)
        const data = await response.json()
        
        if (repoId && data.repo) {
          setRepo(data.repo)
        } else if (!repoId && data.repos && data.repos.length > 0) {
          setRepo(data.repos[0])
        }
      } catch (err) {
        console.error('Failed to load repo:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchRepo()
  }, [repoId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-500/20 text-green-400 border-green-500'
      case 'indexing': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
      case 'cloning': return 'bg-blue-500/20 text-blue-400 border-blue-500'
      case 'queued': return 'bg-slate-500/20 text-slate-400 border-slate-500'
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return '✓'
      case 'indexing': return '⟳'
      case 'cloning': return '↓'
      case 'queued': return '○'
      case 'failed': return '✗'
      default: return '○'
    }
  }

  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [workspaceUrl, setWorkspaceUrl] = useState<string | null>(null)

  const openWorkspace = async () => {
    if (!repo) return
    setWorkspaceLoading(true)
    try {
      const response = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_id: repo.id }),
      })
      const data = await response.json()
      if (data.workspace) {
        setWorkspaceUrl(data.workspace.code_server_url)
        // Open in new tab
        window.open(data.workspace.code_server_url, '_blank')
      }
    } catch (err) {
      console.error('Failed to open workspace:', err)
    } finally {
      setWorkspaceLoading(false)
    }
  }
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-700 rounded-lg"></div>
          <div className="flex-1">
            <div className="h-4 bg-slate-700 rounded w-32 mb-2"></div>
            <div className="h-3 bg-slate-700 rounded w-24"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!repo) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
        <p className="text-slate-400 text-sm">No project imported yet</p>
        <button className="mt-2 text-blue-400 text-sm hover:text-blue-300">
          Import a repository →
        </button>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-slate-200">{repo.name}</h3>
            <p className="text-xs text-slate-400">{repo.url}</p>
          </div>
        </div>
        <span className={`px-2 py-0.5 text-xs rounded border ${getStatusColor(repo.status)}`}>
          {getStatusIcon(repo.status)} {repo.status}
        </span>
        
        {/* P1-MH-06: Real-time Status Indicator */}
        <StatusIndicator 
          status={repo.status === 'ready' ? 'success' : repo.status === 'failed' ? 'error' : 'loading'}
          label={repo.status.charAt(0).toUpperCase() + repo.status.slice(1)}
          subStatus={`${repo.files_count || 0} files`}
          showSpinner={repo.status !== 'ready' && repo.status !== 'failed'}
          className="mt-2"
        />
      </div>
      
      {repo.status === 'ready' && (
        <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-slate-500">Files</p>
            <p className="text-slate-200">{repo.files_count || '-'}</p>
          </div>
          <div>
            <p className="text-slate-500">Branch</p>
            <p className="text-slate-200">{repo.branch || '-'}</p>
          </div>
          <div>
            <p className="text-slate-500">Last Commit</p>
            <p className="text-slate-200 font-mono text-xs">{repo.last_commit_hash?.slice(0, 7) || '-'}</p>
          </div>
        </div>
      )}
      
      {repo.status === 'ready' && (
        <div className="mt-3 flex gap-2">
          <button 
            onClick={openWorkspace}
            disabled={workspaceLoading}
            className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white text-sm rounded-md transition-colors"
          >
            {workspaceLoading ? 'Opening...' : 'Open Workspace'}
          </button>
          <button className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-md transition-colors">
            Canvas
          </button>
        </div>
      )}
    </div>
  )
}
