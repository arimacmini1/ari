'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SHORTCUT_SECTIONS = [
  {
    title: 'Navigation',
    items: [
      { keys: 'Tab / Shift+Tab', action: 'Move focus forward/backward' },
      { keys: 'Enter / Space', action: 'Activate focused control' },
      { keys: 'Esc', action: 'Close dialogs and overlays' },
    ],
  },
  {
    title: 'Accessibility',
    items: [
      { keys: '? or Ctrl+/', action: 'Open keyboard shortcuts overlay' },
      { keys: 'Alt+Shift+A', action: 'Open Accessibility settings page' },
    ],
  },
];

export function KeyboardShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      return target.isContentEditable || Boolean(target.closest('[contenteditable="true"]'));
    };

    const handler = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      const key = event.key;
      if (key === '?' || (key === '/' && (event.ctrlKey || event.metaKey))) {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (event.altKey && event.shiftKey && key.toLowerCase() === 'a') {
        event.preventDefault();
        window.location.assign('/accessibility');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl bg-slate-950 text-slate-100 border-slate-800">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription className="text-slate-400">
            Core navigation and accessibility shortcuts available across AEI.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {SHORTCUT_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                {section.title}
              </h3>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <div
                    key={`${section.title}-${item.keys}`}
                    className="flex items-center justify-between gap-4 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2"
                  >
                    <span className="text-xs font-mono text-slate-200">{item.keys}</span>
                    <span className="text-xs text-slate-400">{item.action}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
