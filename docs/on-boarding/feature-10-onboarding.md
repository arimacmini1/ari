<!--
  Feature 10 On-Boarding Guide
  Version: 1.0 (2026-02-10, initial creation for F10-MH-01/02/03/04)
  Status: MVP - Accessibility + Adaptive UI
-->

# Feature 10 – Accessibility & Adaptive UI: On-Boarding Guide

## Quick Start

### 1) Open Accessibility Settings
1. Navigate to `/accessibility`
2. Toggle **High contrast**, **Large text**, **Reduced motion**
3. Set **UI mode** to **Novice** or **Expert**
4. Toggle **Voice commands** ON (optional)

### 2) Verify Novice Mode
1. Go to `/`
2. Confirm **Trace Viewer** and **Orchestrator** tabs are hidden
3. Wait **15 seconds** without mouse/keyboard input → tip banner appears

### 3) Keyboard Shortcuts
1. Press `?` (or `Ctrl+/`) to open the shortcuts overlay
2. Use Arrow keys on the main tab bar to switch tabs
3. Press `Alt+Shift+A` to open `/accessibility`

### 4) Voice Commands (Optional)
1. Toggle **Voice commands** ON
2. Use the HUD input fallback to type commands like:
   - `Open canvas`
   - `Run simulation`
   - `Add task`

---

## Feature Overview

### What You Get
- Global accessibility settings (contrast, text size, reduced motion)
- Keyboard-first navigation aids
- Voice command layer (SpeechRecognition + manual fallback)
- Adaptive UI modes (novice vs expert)

### Key Capabilities
**Accessibility Settings**
- Persisted per user via localStorage
- Applied globally via HTML data attributes

**Keyboard Navigation**
- Skip-to-content
- Focus-visible styling
- Tablist semantics + arrow navigation

**Adaptive UI**
- Novice mode hides advanced panels
- Idle tips after 15s of inactivity
- Auto-fallback to a visible tab

---

## Testing Guide

### F10-MH-01 Accessibility Settings
- [ ] Toggle high-contrast and verify palette/background changes
- [ ] Toggle large text and verify base font size increases
- [ ] Toggle reduced motion and verify animations diminish

### F10-MH-02 Keyboard Navigation
- [ ] Use Tab/Shift+Tab across main controls
- [ ] Use Arrow keys on workspace tabs
- [ ] Open shortcuts overlay with `?`

### F10-MH-03 Voice Commands
- [ ] Enable voice commands and use manual input fallback
- [ ] Run “Add task” and confirm block appears
- [ ] Use “Open analytics” to switch tabs

### F10-MH-04 Adaptive UI
- [ ] Set UI mode to Novice
- [ ] Confirm Trace/Orchestrator tabs are hidden
- [ ] Wait 15s idle and confirm tip banner appears

---

## Key Files

- `lib/accessibility/settings.ts`
- `components/accessibility/accessibility-provider.tsx`
- `components/accessibility/accessibility-settings-panel.tsx`
- `components/accessibility/voice-command-controller.tsx`
- `components/accessibility/keyboard-shortcuts-overlay.tsx`
- `components/accessibility/skip-to-content.tsx`
- `components/aei/main-workspace.tsx`
- `components/aei/canvas-flow.tsx`
- `components/aei/block-palette.tsx`
- `components/aei/prompt-canvas.tsx`
- `app/accessibility/page.tsx`
- `app/globals.css`

---

## Debugging Guide

### Issue: Settings not applied
**Check:**
1. LocalStorage key `aei.accessibility.<userId>`
2. `data-contrast`, `data-text`, `data-reduced-motion` attributes on `<html>`

### Issue: Voice commands not working
**Check:**
1. Voice enabled in `/accessibility`
2. Browser supports SpeechRecognition (Chrome/Edge)
3. Use fallback input if SpeechRecognition unavailable

### Issue: Novice mode not hiding tabs
**Check:**
1. UI mode set to Novice in `/accessibility`
2. Reload `/` main workspace

---

## Related Docs

- `/docs/architecture/feature-10-architecture.md`
- `/docs/tasks/feature-10-accessibility-adaptive-ui.md`
