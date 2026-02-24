// src/api/storage.js — chrome.storage API wrapper

// Synced settings (shared across devices)
export async function getSettings() {
  const result = await chrome.storage.sync.get('settings');
  return result.settings || getDefaultSettings();
}

export async function saveSettings(settings) {
  return chrome.storage.sync.set({ settings });
}

export function getDefaultSettings() {
  return {
    autoSync: true,
    discardOnRestore: true,
    syncBookmarks: false,
    autoGroupTabs: false,
    autoClassifyBookmarks: false,
    autoDiscard: false,
  };
}

// Local cache (large data, device-specific)
export async function getCache(key) {
  const result = await chrome.storage.local.get(key);
  return result[key];
}

export async function setCache(key, val) {
  return chrome.storage.local.set({ [key]: val });
}

// JSON Backup export
export async function exportBackup() {
  const tree = await chrome.bookmarks.getTree();
  const settings = await getSettings();
  const data = {
    bookmarks: tree,
    settings,
    exportedAt: new Date().toISOString(),
    version: '1.0'
  };
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  // Trigger download via anchor element (side panel context)
  const a = document.createElement('a');
  a.href = url;
  a.download = `tabflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// JSON Backup import
export async function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.settings) {
          await saveSettings(data.settings);
        }
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
