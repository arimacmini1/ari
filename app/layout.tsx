import React from "react"
import type { Metadata, Viewport } from 'next'

import './globals.css'
import { AccessibilityRoot } from '@/components/accessibility/accessibility-root'
import { ActiveProjectProvider } from '@/components/aei/active-project-provider'
import { KeyboardShortcutsOverlay } from '@/components/accessibility/keyboard-shortcuts-overlay'
import { SkipToContent } from '@/components/accessibility/skip-to-content'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'AEI - AI Engineering Interface',
  description: 'Post-IDE control center for AI agent orchestration and management',
}

export const viewport: Viewport = {
  themeColor: '#0a0d12',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className="font-sans antialiased"
        style={
          {
            // Build environments without network access can't fetch next/font/google assets.
            // Keep Tailwind's font variables defined with a sane local fallback stack.
            "--font-inter": "system-ui",
            "--font-jetbrains-mono":
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          } as React.CSSProperties
        }
      >
        <AccessibilityRoot>
          <ActiveProjectProvider>
            <SkipToContent />
            <KeyboardShortcutsOverlay />
            <div id="main-content" tabIndex={-1}>
              {children}
            </div>
            <Toaster />
          </ActiveProjectProvider>
        </AccessibilityRoot>
      </body>
    </html>
  )
}
