import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'

import './globals.css'
import { AccessibilityRoot } from '@/components/accessibility/accessibility-root'
import { KeyboardShortcutsOverlay } from '@/components/accessibility/keyboard-shortcuts-overlay'
import { SkipToContent } from '@/components/accessibility/skip-to-content'

const _inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const _jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' })

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
      <body className={`${_inter.variable} ${_jetbrainsMono.variable} font-sans antialiased`}>
        <AccessibilityRoot>
          <SkipToContent />
          <KeyboardShortcutsOverlay />
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
        </AccessibilityRoot>
      </body>
    </html>
  )
}
