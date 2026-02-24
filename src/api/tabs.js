// src/api/tabs.js — chrome.tabs API wrapper

export async function getAllTabsByWindow() {
  const windows = await chrome.windows.getAll({ populate: true });
  return windows.map(win => ({
    id: win.id,
    focused: win.focused,
    type: win.type,
    tabs: win.tabs.map(tab => ({
      id: tab.id,
      title: tab.title || 'Untitled',
      url: tab.url || '',
      favIconUrl: tab.favIconUrl || '',
      pinned: tab.pinned,
      audible: tab.audible,
      discarded: tab.discarded,
      active: tab.active,
      groupId: tab.groupId,
      windowId: tab.windowId,
      index: tab.index,
      mutedInfo: tab.mutedInfo,
    }))
  }));
}

export async function closeTab(tabId) {
  return chrome.tabs.remove(tabId);
}

export async function discardTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (tab.active) throw new Error('Cannot discard active tab');
  return chrome.tabs.discard(tabId);
}

export async function togglePin(tabId) {
  const tab = await chrome.tabs.get(tabId);
  return chrome.tabs.update(tabId, { pinned: !tab.pinned });
}

export async function toggleMute(tabId) {
  const tab = await chrome.tabs.get(tabId);
  return chrome.tabs.update(tabId, { muted: !tab.mutedInfo.muted });
}

export async function activateTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  await chrome.tabs.update(tabId, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
}

export async function createTab(url) {
  const isUrl = /^(https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,})/i.test(url);
  const finalUrl = isUrl
    ? (url.startsWith('http') ? url : 'https://' + url)
    : 'https://www.google.com/search?q=' + encodeURIComponent(url);
  return chrome.tabs.create({ url: finalUrl });
}

export async function duplicateTab(tabId) {
  return chrome.tabs.duplicate(tabId);
}

export async function moveToNewWindow(tabId) {
  return chrome.windows.create({ tabId });
}

export async function discardAllInactive() {
  const tabs = await chrome.tabs.query({ active: false, discarded: false });
  const results = await Promise.allSettled(
    tabs.filter(t => !t.pinned).map(t => chrome.tabs.discard(t.id))
  );
  return results.filter(r => r.status === 'fulfilled').length;
}

export async function moveTab(tabId, index) {
  return chrome.tabs.move(tabId, { index });
}

export async function moveTabToWindow(tabId, windowId, index = -1) {
  return chrome.tabs.move(tabId, { windowId, index });
}

export async function closeDuplicateTabs() {
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
  return toClose.length;
}
