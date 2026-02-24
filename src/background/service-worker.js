// src/background/service-worker.js — Extension background process

// ── Installation ──
chrome.runtime.onInstalled.addListener(async (details) => {
  // Set side panel as default action click behavior
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  // Register context menus
  chrome.contextMenus.create({
    id: 'add-bookmark',
    title: 'TabFlow에 북마크 추가',
    contexts: ['page', 'link']
  });
  chrome.contextMenus.create({
    id: 'discard-tab',
    title: '이 탭 Discard',
    contexts: ['page']
  });
});

// ── Tab event watchers ──
chrome.tabs.onCreated.addListener((tab) => broadcast('tab-created', tab));
chrome.tabs.onRemoved.addListener((tabId) => broadcast('tab-removed', tabId));
chrome.tabs.onUpdated.addListener((tabId, changes, tab) => {
  if (changes.status === 'complete' || changes.title) {
    broadcast('tab-updated', tab);
  }
});
chrome.tabs.onMoved.addListener((tabId, moveInfo) =>
  broadcast('tab-moved', { tabId, ...moveInfo }));

// ── Bookmark event watchers ──
chrome.bookmarks.onCreated.addListener((id, bm) =>
  broadcast('bm-created', bm));
chrome.bookmarks.onRemoved.addListener((id, info) =>
  broadcast('bm-removed', { id, ...info }));
chrome.bookmarks.onChanged.addListener((id, changes) =>
  broadcast('bm-changed', { id, ...changes }));

// ── Keyboard shortcuts ──
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'discard-inactive') {
    const tabs = await chrome.tabs.query({ active: false, discarded: false });
    let count = 0;
    for (const t of tabs) {
      if (!t.pinned) {
        try {
          await chrome.tabs.discard(t.id);
          count++;
        } catch {}
      }
    }
    broadcast('toast', { icon: '💤', message: `${count}개 탭 Discard 완료` });
  }
  if (command === 'open-search') {
    // Open side panel if not already open
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  }
});

// ── Context menu handler ──
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'add-bookmark') {
    await chrome.bookmarks.create({
      title: tab.title,
      url: info.linkUrl || tab.url,
    });
    broadcast('toast', { icon: '⭐', message: '북마크 추가 완료' });
  }
  if (info.menuItemId === 'discard-tab') {
    try {
      await chrome.tabs.discard(tab.id);
      broadcast('toast', { icon: '💤', message: 'Discard 완료' });
    } catch {
      broadcast('toast', { icon: '⚠️', message: '활성 탭은 Discard 불가' });
    }
  }
});

// ── Broadcast utility ──
function broadcast(type, data) {
  chrome.runtime.sendMessage({ type, data }).catch(() => {
    // Side panel may not be open — ignore
  });
}
