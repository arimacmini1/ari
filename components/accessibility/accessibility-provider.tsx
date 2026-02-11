'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AccessibilitySettings,
  DEFAULT_ACCESSIBILITY_SETTINGS,
  loadAccessibilitySettings,
  persistAccessibilitySettings,
} from '@/lib/accessibility/settings';

type AccessibilityContextValue = {
  settings: AccessibilitySettings;
  setSettings: (next: AccessibilitySettings) => void;
  updateSettings: (partial: Partial<AccessibilitySettings>) => void;
  userId: string;
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

function applySettingsToDocument(settings: AccessibilitySettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-contrast', settings.highContrast ? 'high' : 'normal');
  root.setAttribute('data-text', settings.largeText ? 'large' : 'normal');
  root.setAttribute('data-reduced-motion', settings.reducedMotion ? 'true' : 'false');
}

function resolveUserId(): string {
  if (typeof window === 'undefined') return 'anonymous';
  return window.localStorage.getItem('aei.userId') || 'anonymous';
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [userId] = useState(resolveUserId);
  const [settings, setSettingsState] = useState<AccessibilitySettings>(
    () => ({ ...DEFAULT_ACCESSIBILITY_SETTINGS })
  );

  useEffect(() => {
    setSettingsState(loadAccessibilitySettings(userId));
  }, [userId]);

  useEffect(() => {
    applySettingsToDocument(settings);
    persistAccessibilitySettings(userId, settings);
  }, [settings, userId]);

  const setSettings = useCallback((next: AccessibilitySettings) => {
    setSettingsState(next);
  }, []);

  const updateSettings = useCallback((partial: Partial<AccessibilitySettings>) => {
    setSettingsState((prev) => ({ ...prev, ...partial }));
  }, []);

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      updateSettings,
      userId,
    }),
    [settings, setSettings, updateSettings, userId]
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibilitySettings() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error('useAccessibilitySettings must be used within AccessibilityProvider');
  }
  return ctx;
}
