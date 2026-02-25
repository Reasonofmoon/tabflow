# Chrome Web Store Submission Checklist

## v1.0.0 Production Release (2026-02-25)

### Package Preparation

- [x] Manifest V3 compliant
- [x] Icon set included (`16/32/48/128`)
- [x] Version set to `1.0.0`
- [x] i18n locale configured (`_locales/ko`)
- [x] Service worker (background) declared as module
- [x] Side panel default path configured
- [ ] `_locales/en/messages.json` 추가 (영어 지원)
- [ ] Final zip package generated: `dist/tabflow-pro-v1.0.0.zip`

### Functional Testing

- [ ] Extension loads without warnings in `chrome://extensions`
- [ ] Side panel opens and renders correctly
- [ ] Popup opens with quick stats
- [ ] Tab list view: tabs shown with favicon, title, URL
- [ ] Grid view toggle works
- [ ] Tab actions: close, discard, pin, mute
- [ ] Multi-select + selection bar works
- [ ] Drag-and-drop tab reordering
- [ ] Right-click context menu on tabs
- [ ] Tab groups: auto-group creates groups
- [ ] Bookmark dashboard: stats, health bar, category distribution
- [ ] Bookmark all: folder tree + AI category badges
- [ ] Bookmark cleanup: duplicate detection, step indicator
- [ ] Bookmark card view: cards with category tags
- [ ] History view: recent sites with timestamps
- [ ] Settings page: toggles, theme selector, export/import
- [ ] Theme toggle: Light / Dark / System (persists reload)
- [ ] Search: filters tabs and bookmarks
- [ ] Keyboard shortcuts: Ctrl+Shift+K (search), Ctrl+Shift+D (discard)
- [ ] Options page renders and saves settings

### Security / Privacy

- [x] No remote code execution
- [x] No `eval` usage
- [x] No code obfuscation
- [x] No CDN dependencies (zero external JS)
- [x] No external server connections
- [x] Permissions justified in PRIVACY.md
- [x] Privacy policy prepared (`PRIVACY.md`)
- [x] `<all_urls>` justified (favicon API only)

### Store Listing

- [x] Short description (under 45 chars)
- [x] Detailed description (bilingual Korean/English)
- [ ] Screenshots (minimum 1, recommended 5+: tabs, dashboard, cleanup, groups, cards)
- [ ] Category: Productivity
- [ ] Privacy policy URL configured
- [ ] Support contact configured

### Final Pre-Submit

- [ ] Re-test on clean Chrome profile
- [ ] Verify no console errors in side panel / popup / service worker
- [ ] Upload zip package to Chrome Web Store dashboard
- [ ] Complete all listing fields
- [ ] Click `Submit for review`
