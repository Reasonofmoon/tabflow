// src/popup/popup.js — Quick access popup logic

document.addEventListener('DOMContentLoaded', async () => {
  // Load stats
  try {
    const tabs = await chrome.tabs.query({});
    const windows = await chrome.windows.getAll();
    const bookmarks = await chrome.bookmarks.getTree();
    
    let bmCount = 0;
    function countBookmarks(nodes) {
      for (const node of nodes) {
        if (node.url) bmCount++;
        if (node.children) countBookmarks(node.children);
      }
    }
    countBookmarks(bookmarks);

    document.getElementById('tabCount').textContent = tabs.length;
    document.getElementById('winCount').textContent = windows.length;
    document.getElementById('bmCount').textContent = bmCount;
  } catch (err) {
    console.error('Failed to load stats:', err);
  }

  // Open Side Panel
  document.getElementById('openSidePanel').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
    window.close();
  });

  // Discard Inactive
  document.getElementById('discardInactive').addEventListener('click', async () => {
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
    document.getElementById('discardInactive').textContent = `✅ ${count}개 Discard 완료`;
    setTimeout(() => window.close(), 1200);
  });

  // Close Duplicates
  document.getElementById('closeDups').addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({});
    const seen = new Map();
    const toClose = [];
    for (const tab of tabs) {
      if (seen.has(tab.url)) {
        toClose.push(tab.id);
      } else {
        seen.set(tab.url, tab.id);
      }
    }
    if (toClose.length) {
      await chrome.tabs.remove(toClose);
    }
    document.getElementById('closeDups').textContent = `✅ ${toClose.length}개 중복 닫기`;
    setTimeout(() => window.close(), 1200);
  });
});
