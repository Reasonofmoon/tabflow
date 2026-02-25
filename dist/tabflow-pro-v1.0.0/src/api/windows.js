// src/api/windows.js — chrome.windows API wrapper

export async function getAllWindows() {
  return chrome.windows.getAll({ populate: true });
}

export async function createWindow(options = {}) {
  return chrome.windows.create(options);
}

export async function removeWindow(windowId) {
  return chrome.windows.remove(windowId);
}

export async function focusWindow(windowId) {
  return chrome.windows.update(windowId, { focused: true });
}

export async function getCurrentWindow() {
  return chrome.windows.getCurrent({ populate: true });
}
