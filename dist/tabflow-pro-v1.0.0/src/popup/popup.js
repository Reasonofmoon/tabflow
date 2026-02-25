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
    console.warn('Failed to load stats:', err);
  }

  function showResult(msg) {
    const el = document.getElementById('result');
    if (el) { el.textContent = msg; el.classList.add('show'); }
  }

  // Open Side Panel
  document.getElementById('openSidePanel')?.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        await chrome.sidePanel.open({ tabId: tab.id });
      }
    } catch (err) {
      console.warn('Side panel open failed:', err);
    }
    window.close();
  });

  // Discard Inactive
  document.getElementById('discardInactive')?.addEventListener('click', async () => {
    try {
      const tabs = await chrome.tabs.query({ active: false, discarded: false });
      let count = 0;
      for (const t of tabs) {
        if (!t.pinned) {
          try { await chrome.tabs.discard(t.id); count++; } catch {}
        }
      }
      showResult(`✅ ${count}개 탭 Discard 완료`);
      setTimeout(() => window.close(), 1500);
    } catch (err) {
      console.warn('Discard failed:', err);
    }
  });

  // Close Duplicates
  document.getElementById('closeDups')?.addEventListener('click', async () => {
    try {
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
      showResult(`✅ ${toClose.length}개 중복 닫기 완료`);
      setTimeout(() => window.close(), 1500);
    } catch (err) {
      console.warn('Close dups failed:', err);
    }
  });
});
