# Chrome Web Store Submission Checklist

## v2.0.0 Production Release (2026-03-03)

### Package Preparation
- [x] Manifest V3 compliant
- [x] Icon set included (16/32/48/128)
- [x] Version updated to 2.0.0
- [x] i18n locales configured (ko/en)
- [ ] Final zip package generated

### Functional Testing
- [ ] Extension loads without warnings in chrome://extensions
- [ ] Tab manager — view/close/group/discard tabs
- [ ] Bookmark dashboard — health score, duplicates, broken links
- [ ] AI classify — 20 categories created correctly
- [ ] Backup restore — flat restore creates URLs without folders
- [ ] Folder organizer — rename, sort, flatten, delete empty
- [ ] Theme switching (light/dark/system)
- [ ] Keyboard shortcuts (Ctrl+Shift+K, Ctrl+Shift+D)
- [ ] Console error-free

### Security / Privacy
- [x] No remote code execution / eval / obfuscation
- [x] Minimal permissions (tabs, bookmarks, storage, sidePanel)
- [x] Privacy policy prepared (PRIVACY.md)
- [x] No external data transfer
- [x] All processing is local (keyword-based classification)

### Store Listing
- [x] Short description (45 chars)
- [x] Detailed description (bilingual EN/KO)
- [ ] Screenshots (minimum 1, recommended 3+)
- [x] Category: Productivity
- [x] Tags: 10 keywords
- [x] Privacy policy URL

### Final Pre-Submit
- [ ] Clean Chrome profile test
- [ ] Console error zero confirmed
- [ ] zip uploaded + listing complete
- [ ] Submit for review clicked
