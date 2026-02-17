/**
 * Browser Automation API - Standalone + OpenClaw Support
 * 
 * - If OpenClaw is running: connects to its browser via CDP
 * - If standalone: launches its own browser with Playwright
 * 
 * This makes Ari fully independent for UI testing/debugging
 */

import { NextRequest, NextResponse } from 'next/server'
import { chromium, Browser, Page } from 'playwright'

const OPENCLAW_CDP = 'http://127.0.0.1:18800'

// Session state
let browserState = {
  currentUrl: 'http://localhost:3000',
  title: 'ARI',
  sessionId: 'main',
  navigationHistory: [] as string[],
  mode: 'standalone' as 'openclaw' | 'standalone',
}

// Reuse browser instance
let browser: Browser | null = null

// Check if OpenClaw browser is available
async function isOpenClawAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${OPENCLAW_CDP}/json`, { method: 'GET' })
    return response.ok
  } catch {
    return false
  }
}

// Get a browser page - either from OpenClaw or standalone
async function getPage(): Promise<Page> {
  const openclawAvailable = await isOpenClawAvailable()
  
  if (openclawAvailable) {
    if (!browser) {
      // Connect to OpenClaw's browser via CDP
      browser = await chromium.connectOverCDP(OPENCLAW_CDP)
      browserState.mode = 'openclaw'
      console.log('[Browser API] Connected to OpenClaw browser')
    }
  } else {
    if (!browser) {
      // Launch standalone browser
      browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      browserState.mode = 'standalone'
      console.log('[Browser API] Launched standalone browser')
    }
  }
  
  const context = browser.contexts()[0] || await browser.newContext()
  const pages = context.pages()
  
  if (pages.length === 0) {
    return await context.newPage()
  }
  
  return pages[0]
}

// Get browser info
export async function GET(req: NextRequest) {
  const openclawAvailable = await isOpenClawAvailable()
  
  try {
    const response = await fetch(`${OPENCLAW_CDP}/json`)
    const pages = await response.json()
    
    return NextResponse.json({ 
      mode: browserState.mode,
      openclawAvailable,
      url: browserState.currentUrl,
      title: browserState.title,
      history: browserState.navigationHistory,
      openPages: pages.map((p: any) => ({ id: p.id, url: p.url, title: p.title })),
    })
  } catch {
    return NextResponse.json({ 
      mode: browserState.mode,
      openclawAvailable: false,
      url: browserState.currentUrl,
      title: browserState.title,
      history: browserState.navigationHistory,
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, path, url, selector, text, routes, sequence, fullPage = false, forceMode } = body
    
    // Force mode: 'openclaw' or 'standalone'
    if (forceMode === 'standalone' && browser) {
      await browser.close()
      browser = null
    }
    
    // Build URL
    let targetUrl = url || browserState.currentUrl
    if (path && !path.startsWith('http')) {
      targetUrl = `http://localhost:3000${path.startsWith('/') ? path : '/' + path}`
    }
    
    const p = await getPage()
    
    // Navigate
    if (action === 'navigate') {
      await p.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 })
      
      browserState.currentUrl = p.url()
      browserState.title = await p.title()
      browserState.navigationHistory.push(p.url())
      
      return NextResponse.json({ 
        success: true, 
        action: 'navigate', 
        url: p.url(),
        title: browserState.title,
        mode: browserState.mode,
        history: browserState.navigationHistory,
      })
    }
    
    // Fetch HTML
    if (action === 'fetch' || action === 'html') {
      const html = await p.content()
      
      return NextResponse.json({ 
        success: true, 
        action: 'html',
        url: p.url(),
        html: html.slice(0, 100000),
        length: html.length,
        mode: browserState.mode,
      })
    }
    
    // Screenshot
    if (action === 'screenshot') {
      const screenshot = await p.screenshot({ fullPage: !!fullPage })
      const base64 = screenshot.toString('base64')
      
      return NextResponse.json({ 
        success: true, 
        action: 'screenshot',
        screenshot: `data:image/png;base64,${base64}`,
        url: p.url(),
        mode: browserState.mode,
      })
    }
    
    // Click
    if (action === 'click') {
      await p.click(selector)
      
      return NextResponse.json({ 
        success: true, 
        action: 'click', 
        selector,
        url: p.url(),
        mode: browserState.mode,
      })
    }
    
    // Type
    if (action === 'type') {
      await p.fill(selector, text)
      
      return NextResponse.json({ 
        success: true, 
        action: 'type', 
        selector,
        text,
        url: p.url(),
        mode: browserState.mode,
      })
    }
    
    // Get elements
    if (action === 'elements' || action === 'links') {
      const elements = await p.evaluate(() => {
        const els = Array.from(document.querySelectorAll('a, button, input, select, [onclick], [role="button"]'))
        return els.slice(0, 50).map(el => ({
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          class: el.className?.slice(0, 30) || '',
          text: el.innerText?.slice(0, 30) || '',
          href: (el as HTMLAnchorElement).href || '',
        }))
      })
      
      return NextResponse.json({ 
        success: true, 
        action: 'elements',
        elements,
        url: p.url(),
        mode: browserState.mode,
      })
    }
    
    // Crawl
    if (action === 'crawl') {
      const routeList = routes || [
        '/', '/files', '/test-browser', '/agents', '/workflows',
        '/analytics', '/orchestrator', '/trace', '/compliance', '/plugins',
      ]
      
      const results = []
      for (const route of routeList) {
        const fullUrl = route.startsWith('http') ? route : `http://localhost:3000${route}`
        try {
          await p.goto(fullUrl, { timeout: 10000 })
          results.push({ url: fullUrl, status: 200, title: await p.title() })
        } catch {
          results.push({ url: fullUrl, status: 404 })
        }
      }
      
      const accessible = results.filter((r: any) => r.status === 200)
      
      return NextResponse.json({ 
        success: true, 
        action: 'crawl',
        mode: browserState.mode,
        totalRoutes: routeList.length,
        accessibleRoutes: accessible.length,
        routes: results,
      })
    }
    
    // Test sequence
    if (action === 'test') {
      const results = []
      for (const step of sequence) {
        try {
          if (step.action === 'navigate') {
            await p.goto(step.url, { waitUntil: 'networkidle', timeout: 10000 })
          } else if (step.action === 'click') {
            await p.click(step.selector)
          } else if (step.action === 'type') {
            await p.fill(step.selector, step.text)
          } else if (step.action === 'screenshot') {
            const screenshot = await p.screenshot()
            results.push({ action: 'screenshot', screenshot: screenshot.toString('base64') })
          }
          results.push({ step, success: true })
        } catch (e) {
          results.push({ step, success: false, error: String(e) })
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        action: 'test',
        mode: browserState.mode,
        results,
      })
    }
    
    // Close browser
    if (action === 'close') {
      if (browser) {
        await browser.close()
        browser = null
      }
      return NextResponse.json({ success: true, action: 'close' })
    }
    
    return NextResponse.json({ 
      error: 'Unknown action. Use: navigate, fetch, html, screenshot, click, type, elements, crawl, test, close' 
    }, { status: 400 })
    
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
