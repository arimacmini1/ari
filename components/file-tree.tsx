/**
 * File Tree Sidebar Component
 * Feature: P1-SH-02 - File Tree Sidebar
 * 
 * Navigate repo files in sidebar with collapsible folders
 */

"use client"

import { useState, useEffect } from "react"
import { 
  Folder, 
  FolderOpen, 
  File, 
  FileCode, 
  FileText, 
  ChevronRight, 
  ChevronDown,
  Search
} from "lucide-react"

export interface FileTreeItem {
  name: string
  path: string
  type: "file" | "directory"
  children?: FileTreeItem[]
}

export interface FileTreeProps {
  files?: FileTreeItem[]
  onFileSelect?: (path: string) => void
  className?: string
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
      return <FileCode className="w-4 h-4 text-yellow-500" />
    case "md":
    case "txt":
      return <FileText className="w-4 h-4 text-slate-400" />
    default:
      return <File className="w-4 h-4 text-slate-400" />
  }
}

function FileTreeNode({ 
  item, 
  depth = 0,
  onSelect 
}: { 
  item: FileTreeItem
  depth?: number
  onSelect?: (path: string) => void
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const isDir = item.type === "directory"
  
  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 hover:bg-slate-700/50 rounded cursor-pointer text-sm`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => {
          if (isDir) {
            setExpanded(!expanded)
          } else {
            onSelect?.(item.path)
          }
        }}
      >
        {isDir ? (
          <>
            {expanded ? (
              <ChevronDown className="w-3 h-3 text-slate-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-slate-400" />
            )}
            {expanded ? (
              <FolderOpen className="w-4 h-4 text-amber-400" />
            ) : (
              <Folder className="w-4 h-4 text-amber-400" />
            )}
          </>
        ) : (
          <span className="w-3" />
        )}
        <span className="truncate text-slate-200">{item.name}</span>
      </div>
      
      {isDir && expanded && item.children && (
        <div>
          {item.children.map((child) => (
            <FileTreeNode 
              key={child.path} 
              item={child} 
              depth={depth + 1}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree({ 
  files = [], 
  onFileSelect,
  className = "" 
}: FileTreeProps) {
  const [search, setSearch] = useState("")
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  
  const filteredFiles = search
    ? filterFiles(files, search.toLowerCase())
    : files
  
  function filterFiles(items: FileTreeItem[], query: string): FileTreeItem[] {
    return items
      .map(item => {
        if (item.type === "file") {
          return item.name.toLowerCase().includes(query) ? item : null
        }
        const filteredChildren = filterFiles(item.children || [], query)
        if (filteredChildren.length > 0) {
          return { ...item, children: filteredChildren }
        }
        return null
      })
      .filter(Boolean) as FileTreeItem[]
  }
  
  const handleFileSelect = (path: string) => {
    setSelectedFile(path)
    onFileSelect?.(path)
  }
  
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Search */}
      <div className="p-2 border-b border-slate-700">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
      
      {/* File List */}
      <div className="flex-1 overflow-auto p-2">
        {filteredFiles.length === 0 ? (
          <div className="text-center text-slate-500 py-8 text-sm">
            {search ? "No files match your search" : "No files in repository"}
          </div>
        ) : (
          filteredFiles.map((item) => (
            <FileTreeNode 
              key={item.path} 
              item={item} 
              onSelect={handleFileSelect}
            />
          ))
        )}
      </div>
      
      {/* Status Bar */}
      {selectedFile && (
        <div className="p-2 border-t border-slate-700 text-xs text-slate-400">
          Selected: {selectedFile}
        </div>
      )}
    </div>
  )
}

/**
 * Hook to fetch repo files
 */
export function useRepoFiles(repoId?: string) {
  const [files, setFiles] = useState<FileTreeItem[]>([])
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (!repoId) return
    
    setLoading(true)
    fetch(`/api/repos/files?repo_id=${repoId}`)
      .then(res => res.json())
      .then(data => {
        setFiles(data.files || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [repoId])
  
  return { files, loading }
}
