/**
 * File Browser Page
 * Feature: P1-SH-02 - File Tree Sidebar
 */

"use client"

import { FileTree } from "@/components/file-tree"
import { useState } from "react"

const sampleFiles = [
  {
    name: "src",
    path: "/src",
    type: "directory" as const,
    children: [
      { name: "components", path: "/src/components", type: "directory" as const, children: [
        { name: "Header.tsx", path: "/src/components/Header.tsx", type: "file" as const },
        { name: "Footer.tsx", path: "/src/components/Footer.tsx", type: "file" as const },
      ]},
      { name: "lib", path: "/src/lib", type: "directory" as const, children: [
        { name: "utils.ts", path: "/src/lib/utils.ts", type: "file" as const },
        { name: "api.ts", path: "/src/lib/api.ts", type: "file" as const },
      ]},
      { name: "app", path: "/src/app", type: "directory" as const },
      { name: "index.ts", path: "/src/index.ts", type: "file" as const },
    ],
  },
  {
    name: "package.json",
    path: "/package.json",
    type: "file" as const,
  },
  {
    name: "README.md",
    path: "/README.md",
    type: "file" as const,
  },
  {
    name: "tsconfig.json",
    path: "/tsconfig.json",
    type: "file" as const,
  },
]

export default function FilesPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  return (
    <div className="flex h-full">
      {/* File Tree Sidebar */}
      <div className="w-64 border-r border-border bg-card">
        <FileTree 
          files={sampleFiles} 
          onFileSelect={(path) => setSelectedFile(path)}
        />
      </div>
      
      {/* File Content Preview */}
      <div className="flex-1 p-4">
        {selectedFile ? (
          <div>
            <h2 className="text-lg font-semibold mb-2">{selectedFile}</h2>
            <p className="text-muted-foreground">File preview would appear here</p>
          </div>
        ) : (
          <p className="text-muted-foreground">Select a file to preview</p>
        )}
      </div>
    </div>
  )
}
