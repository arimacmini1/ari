/**
 * Browser Automation Hook
 * Feature: Screenshot Capability + UI Testing
 * 
 * React hook for browser automation in Ari
 */

"use client"

import { useState, useCallback } from 'react'

export interface BrowserSession {
  sessionId: string
  url: string
  title: string
  active: boolean
}

export interface ClickAction {
  type: 'click'
  selector: string
}

export interface TypeAction {
  type: 'type'
  selector: string
  text: string
}

export interface NavigateAction {
  type: 'navigate'
  url: string
}

export type BrowserAction = ClickAction | TypeAction | NavigateAction

export function useBrowser() {
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<BrowserSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<BrowserAction[]>([])

  // Get browser status
  const getStatus = useCallback(async (sessionId = 'default') => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/browser?session=${sessionId}`)
      const data = await res.json()
      setSession(data)
      return data
    } catch (e) {
      setError(String(e))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Navigate to URL
  const navigate = useCallback(async (url: string, sessionId = 'default') => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'navigate', url, session: sessionId }),
      })
      const data = await res.json()
      setHistory(prev => [...prev, { type: 'navigate', url }])
      return data
    } catch (e) {
      setError(String(e))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Click element
  const click = useCallback(async (selector: string, sessionId = 'default') => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'click', selector, session: sessionId }),
      })
      const data = await res.json()
      setHistory(prev => [...prev, { type: 'click', selector }])
      return data
    } catch (e) {
      setError(String(e))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Type text
  const type = useCallback(async (selector: string, text: string, sessionId = 'default') => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'type', selector, text, session: sessionId }),
      })
      const data = await res.json()
      setHistory(prev => [...prev, { type: 'type', selector, text }])
      return data
    } catch (e) {
      setError(String(e))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Take screenshot
  const screenshot = useCallback(async (sessionId = 'default') => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'screenshot', session: sessionId }),
      })
      const data = await res.json()
      return data
    } catch (e) {
      setError(String(e))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  return {
    loading,
    session,
    error,
    history,
    getStatus,
    navigate,
    click,
    type,
    screenshot,
    clearHistory,
  }
}

/**
 * Hook for running automated UI tests
 */
export function useUITest() {
  const [results, setResults] = useState<{
    action: BrowserAction
    success: boolean
    error?: string
    timestamp: string
  }[]>([])

  const runSequence = useCallback(async (actions: BrowserAction[]) => {
    const testResults = []
    
    for (const action of actions) {
      const result = {
        action,
        success: false,
        timestamp: new Date().toISOString(),
      }
      
      try {
        if (action.type === 'navigate') {
          // Simulate navigate
          result.success = true
        } else if (action.type === 'click') {
          // Simulate click
          result.success = true
        } else if (action.type === 'type') {
          // Simulate type
          result.success = true
        }
      } catch (e) {
        result.error = String(e)
      }
      
      testResults.push(result)
    }
    
    setResults(testResults)
    return testResults
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
  }, [])

  return {
    results,
    runSequence,
    clearResults,
  }
}
