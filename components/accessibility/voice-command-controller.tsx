'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAccessibilitySettings } from '@/components/accessibility/accessibility-provider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type VoiceCommand =
  | { type: 'switch-tab'; tab: string }
  | { type: 'execute-canvas' }
  | { type: 'canvas-zoom'; direction: 'in' | 'out' | 'fit' }
  | { type: 'canvas-select'; query: string }
  | { type: 'canvas-add-block'; blockType: string };

const COMMAND_HINTS = [
  'Open canvas',
  'Open agents',
  'Open trace viewer',
  'Open analytics',
  'Open orchestrator',
  'Run simulation',
  'Add task / decision / loop / parallel / text / artifact / preview',
  'Zoom in / Zoom out / Fit view',
  'Select node <label>',
];

function parseCommand(transcript: string): VoiceCommand | null {
  const normalized = transcript.toLowerCase();

  if (normalized.includes('open canvas')) return { type: 'switch-tab', tab: 'canvas' };
  if (normalized.includes('open agents')) return { type: 'switch-tab', tab: 'agents' };
  if (normalized.includes('open trace')) return { type: 'switch-tab', tab: 'traces' };
  if (normalized.includes('open analytics')) return { type: 'switch-tab', tab: 'analytics' };
  if (normalized.includes('open console')) return { type: 'switch-tab', tab: 'console' };
  if (normalized.includes('open orchestrator')) return { type: 'switch-tab', tab: 'orchestrator' };

  if (normalized.includes('run simulation') || normalized.includes('execute')) {
    return { type: 'execute-canvas' };
  }

  if (normalized.includes('zoom in')) return { type: 'canvas-zoom', direction: 'in' };
  if (normalized.includes('zoom out')) return { type: 'canvas-zoom', direction: 'out' };
  if (normalized.includes('fit view') || normalized.includes('zoom to fit')) {
    return { type: 'canvas-zoom', direction: 'fit' };
  }

  if (normalized.startsWith('add ')) {
    const block = normalized.replace('add ', '').trim();
    if (['task', 'decision', 'loop', 'parallel', 'text', 'artifact', 'preview'].includes(block)) {
      return { type: 'canvas-add-block', blockType: block };
    }
  }

  if (normalized.startsWith('select node')) {
    const query = normalized.replace('select node', '').trim();
    if (query) return { type: 'canvas-select', query };
  }

  return null;
}

export function VoiceCommandController({ embedded = false }: { embedded?: boolean }) {
  const { settings, updateSettings } = useAccessibilitySettings();
  const [listening, setListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [lastError, setLastError] = useState('');
  const [manualCommand, setManualCommand] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const Recognition = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
  }, []);

  useEffect(() => {
    if (!settings.voiceEnabled) {
      setListening(false);
      return;
    }
    if (!Recognition) {
      setLastError('Speech recognition is not available in this browser. Use command input below.');
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setListening(true);
      setLastError('');
    };

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0]?.transcript?.trim() || '';
      if (!transcript) return;
      setLastTranscript(transcript);
      const command = parseCommand(transcript);
      if (!command) {
        setLastError(`Unknown command: "${transcript}"`);
        return;
      }
      setLastError('');
      window.dispatchEvent(new CustomEvent('aei-voice-command', { detail: command }));
    };

    recognition.onerror = (event: any) => {
      setLastError(event?.error || 'Speech recognition error');
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();

    return () => {
      recognition.stop();
    };
  }, [settings.voiceEnabled, Recognition]);

  const submitManualCommand = () => {
    if (!manualCommand.trim()) return;
    const transcript = manualCommand.trim();
    setLastTranscript(transcript);
    const command = parseCommand(transcript);
    if (!command) {
      setLastError(`Unknown command: "${transcript}"`);
      return;
    }
    setLastError('');
    setManualCommand('');
    window.dispatchEvent(new CustomEvent('aei-voice-command', { detail: command }));
  };

  useEffect(() => {
    const toggleHandler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        updateSettings({ voiceEnabled: !settings.voiceEnabled });
      }
    };
    window.addEventListener('keydown', toggleHandler);
    return () => window.removeEventListener('keydown', toggleHandler);
  }, [settings.voiceEnabled, updateSettings]);

  if (!mounted) return null;

  return (
    <div
      className={cn(
        embedded
          ? 'w-full rounded-xl border border-slate-800 bg-slate-950/95 p-4'
          : 'fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-slate-800 bg-slate-950/95 p-4 shadow-lg',
        'text-slate-200'
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Voice Commands</h3>
          <p className="text-xs text-slate-400">{listening ? 'Listening…' : 'Paused'}</p>
        </div>
      </div>

      {!settings.voiceEnabled ? (
        <div className="mt-3 text-xs text-slate-400">
          Voice commands are off. Use Ctrl+Shift+V (or Cmd+Shift+V) to toggle on.
        </div>
      ) : null}

      {settings.voiceEnabled ? (
        <div className="mt-3 space-y-2 text-xs">
        <div>
          <span className="text-slate-400">Last heard:</span>
          <div className="mt-1 rounded-md border border-slate-800 bg-slate-900/60 p-2">
            {lastTranscript || '—'}
          </div>
        </div>
        {lastError ? (
          <div className="rounded-md border border-red-800/60 bg-red-900/20 p-2 text-red-200">
            {lastError}
          </div>
        ) : null}
        <div className="rounded-md border border-slate-800 bg-slate-900/60 p-2">
          <label htmlFor="voice-command-input" className="text-[11px] text-slate-400">
            Command input (fallback)
          </label>
          <div className="mt-2 flex gap-2">
            <Input
              id="voice-command-input"
              className="h-8 text-xs bg-slate-950 border-slate-800"
              placeholder="Type a command, e.g. Open canvas"
              value={manualCommand}
              onChange={(e) => setManualCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitManualCommand();
                }
              }}
            />
            <Button size="sm" variant="secondary" onClick={submitManualCommand}>
              Run
            </Button>
          </div>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900/40 p-2 text-slate-400">
          {COMMAND_HINTS.map((hint) => (
            <div key={hint}>• {hint}</div>
          ))}
        </div>
      </div>
      ) : null}
    </div>
  );
}
