# Privacy Policy

Last updated: February 25, 2026

## Overview

TabFlow Pro is a tab and bookmark management Chrome Extension. It does not collect, transmit, or sell personal data. All data processing occurs locally within your browser.

## Data Processed

The extension stores only the following data in Chrome local extension storage (`chrome.storage.sync`):

- User theme preference (light/dark/system)
- Toggle settings for auto-sync, auto-classify, and auto-discard features

This data is stored in the user's Chrome profile and is used only to provide extension functionality.

## Data Not Collected

The extension does **not** collect:

- Personal identity information
- Browsing history (the extension reads but does not store or transmit browsing history)
- Authentication credentials
- Financial or health information
- Website content or cookies
- Analytics, telemetry, or tracking data

## Data Sharing

**No data is shared with any third party.** The extension does not connect to any external server or API. All operations (tab management, bookmark analysis, classification) are performed entirely within the local browser.

## Permissions Justification

| Permission | Purpose |
|-----------|---------|
| `tabs` | Read and manage open tabs across all windows (core feature) |
| `tabGroups` | Create and manage tab group classifications |
| `bookmarks` | Read, create, and organize bookmark entries (core feature) |
| `history` | Read recent browsing history for the history viewer |
| `storage` | Save user preferences (theme, settings) locally |
| `sidePanel` | Render the main UI in Chrome's built-in side panel |
| `contextMenus` | Provide right-click context menu options for tabs |
| `favicon` | Display website favicons next to tab and bookmark entries |
| `host_permissions` (`<all_urls>`) | Required by the `favicon` API to fetch favicons for any website. No content is read or modified on any webpage. |

## No Remote Code

- The extension contains no remote code execution
- No `eval()` or `Function()` constructors
- No code obfuscation
- No Content Delivery Network (CDN) dependencies
- All JavaScript is bundled within the extension package

## Contact

For support or privacy-related requests, contact the extension publisher through the Chrome Web Store support channel or via the GitHub repository.
