<!--
  Feature 10 Architecture Document
  Version: 1.0 (2026-02-10, initial creation for F10-MH-01/02/03/04)
  Status: MVP - Accessibility + Adaptive UI
-->

# Feature 10 – Accessibility & Adaptive UI: Architecture & Design

## System Overview

Feature 10 adds **global accessibility settings**, **keyboard-first navigation**, **voice command scaffolding**, and **adaptive UI modes**. Settings persist per user in localStorage and apply globally via HTML data attributes. Novice mode hides advanced panels and shows idle tips after inactivity.

**Key Architecture Decisions:**
- Settings persistence is client-side (localStorage), keyed by user ID.
- UI mode is a single source of truth in accessibility settings.
- Voice commands are routed via custom `aei-voice-command` events.
- Adaptive UI is applied at the workspace tab level (no route duplication).

---

## Architecture Diagram

```
Accessibility Settings
  /accessibility (app/accessibility/page.tsx)
    -> AccessibilitySettingsPanel
    -> AccessibilityProvider (localStorage persistence)

Global Effects
  <html data-contrast|data-text|data-reduced-motion>
  VoiceCommandController (HUD + command routing)

Workspace
  MainWorkspace
    -> Filters visible tabs based on uiMode
    -> Idle tip banner after 15s inactivity (novice)
    -> Auto-fallback if active tab hidden
```

---

## Data & State Flow

1. User updates settings on `/accessibility`
2. Settings persisted to localStorage (`aei.accessibility.<userId>`)
3. Provider updates HTML `data-*` attributes
4. Main workspace reacts to `uiMode`

---

## Components & Responsibilities

### Accessibility Provider
**File:** `components/accessibility/accessibility-provider.tsx`
- Loads persisted settings after mount
- Writes settings to localStorage
- Applies document-level attributes for CSS overrides

### Accessibility Settings Panel
**File:** `components/accessibility/accessibility-settings-panel.tsx`
- Toggles for contrast/text/motion/voice
- UI mode selector (novice/expert)

### Voice Command Controller
**File:** `components/accessibility/voice-command-controller.tsx`
- SpeechRecognition (where supported)
- Manual command input fallback
- Dispatches `aei-voice-command` events

### Main Workspace
**File:** `components/aei/main-workspace.tsx`
- Filters tabs in novice mode
- Arrow key navigation for tabs
- Idle tip after 15s inactivity

---

## CSS & Global Styling

**File:** `app/globals.css`
- `data-contrast="high"`: high-contrast palette
- `data-text="large"`: 125% base font size
- `data-reduced-motion="true"`: reduces animation duration
- `:focus-visible` styling for keyboard focus

---

## Known Limitations

- Voice recognition relies on browser SpeechRecognition (Chrome/Edge).
- Manual fallback is required for unsupported browsers.
- Novice mode hides tabs but does not alter route access.

---

## References

- `/docs/tasks/feature-10-accessibility-adaptive-ui.md`
- `/docs/on-boarding/feature-10-onboarding.md`
- `lib/accessibility/settings.ts`
- `components/aei/main-workspace.tsx`
