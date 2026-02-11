export type AccessibilitySettings = {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  voiceEnabled: boolean;
  uiMode: 'novice' | 'expert';
};

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  voiceEnabled: false,
  uiMode: 'expert',
};

const STORAGE_PREFIX = 'aei.accessibility';

export function getAccessibilityStorageKey(userId: string) {
  return `${STORAGE_PREFIX}.${userId}`;
}

export function loadAccessibilitySettings(userId: string): AccessibilitySettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_ACCESSIBILITY_SETTINGS };
  }

  const raw = window.localStorage.getItem(getAccessibilityStorageKey(userId));
  if (!raw) {
    return { ...DEFAULT_ACCESSIBILITY_SETTINGS };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      highContrast: Boolean(parsed?.highContrast),
      largeText: Boolean(parsed?.largeText),
      reducedMotion: Boolean(parsed?.reducedMotion),
      voiceEnabled: Boolean(parsed?.voiceEnabled),
      uiMode: parsed?.uiMode === 'novice' ? 'novice' : 'expert',
    };
  } catch {
    return { ...DEFAULT_ACCESSIBILITY_SETTINGS };
  }
}

export function persistAccessibilitySettings(userId: string, settings: AccessibilitySettings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getAccessibilityStorageKey(userId), JSON.stringify(settings));
}
