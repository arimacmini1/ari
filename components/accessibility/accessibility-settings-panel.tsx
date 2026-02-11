'use client';

import React from 'react';
import { useAccessibilitySettings } from '@/components/accessibility/accessibility-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function AccessibilitySettingsPanel() {
  const { settings, updateSettings, userId } = useAccessibilitySettings();

  return (
    <Card className="bg-slate-900/60 border-slate-800">
      <CardHeader className="border-b border-slate-800">
        <CardTitle className="text-lg">Accessibility Settings</CardTitle>
        <p className="text-sm text-slate-400">Saved for user: {userId}</p>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm text-slate-200">High contrast</Label>
            <p className="text-xs text-slate-400">Boosts contrast across all panels.</p>
          </div>
          <Switch
            checked={settings.highContrast}
            onCheckedChange={(checked) => updateSettings({ highContrast: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm text-slate-200">Large text</Label>
            <p className="text-xs text-slate-400">Increases base font size to 125%.</p>
          </div>
          <Switch
            checked={settings.largeText}
            onCheckedChange={(checked) => updateSettings({ largeText: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm text-slate-200">Reduced motion</Label>
            <p className="text-xs text-slate-400">Minimizes animations and transitions.</p>
          </div>
          <Switch
            checked={settings.reducedMotion}
            onCheckedChange={(checked) => updateSettings({ reducedMotion: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm text-slate-200">Voice commands (beta)</Label>
            <p className="text-xs text-slate-400">Enable voice control for navigation and actions.</p>
          </div>
          <Switch
            checked={settings.voiceEnabled}
            onCheckedChange={(checked) => updateSettings({ voiceEnabled: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm text-slate-200">UI mode</Label>
            <p className="text-xs text-slate-400">Novice hides advanced panels.</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Button
              type="button"
              variant={settings.uiMode === 'novice' ? 'default' : 'outline'}
              onClick={() => updateSettings({ uiMode: 'novice' })}
            >
              Novice
            </Button>
            <Button
              type="button"
              variant={settings.uiMode === 'expert' ? 'default' : 'outline'}
              onClick={() => updateSettings({ uiMode: 'expert' })}
            >
              Expert
            </Button>
          </div>
        </div>

        <div className="pt-2">
          <Button
            variant="outline"
            onClick={() =>
              updateSettings({
                highContrast: false,
                largeText: false,
                reducedMotion: false,
                voiceEnabled: false,
                uiMode: 'expert',
              })
            }
          >
            Reset to defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
