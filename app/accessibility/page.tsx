'use client';

import { AccessibilitySettingsPanel } from '@/components/accessibility/accessibility-settings-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AccessibilityPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Accessibility & Adaptive UI</h1>
          <p className="text-slate-400 mt-2">
            Configure high-contrast, large text, and reduced motion across AEI.
          </p>
        </div>

        <AccessibilitySettingsPanel />

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-lg">Where It Applies</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 text-sm text-slate-300 space-y-2">
            <p>These settings apply to all surfaces: Dashboard, Canvas, Orchestrator, and Trace Viewer.</p>
            <p>Large text uses a 125% base font size. Reduced motion disables animations and transitions.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
