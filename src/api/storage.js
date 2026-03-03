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

/**
 * Import backup: restore bookmarks from TabFlow JSON backup
 * Flat mode: all URLs created directly under bookmarks bar (no domain folders)
 * @param {Object} data - Parsed JSON backup data
 * @param {Object} options - { cleanRestore, onProgress }
 */
export async function importBackup(data, options = {}) {
  const { cleanRestore = false, onProgress } = options;

  if (!data || !data.bookmarks || !data.bookmarks.length) {
    throw new Error('유효하지 않은 백업 파일입니다.');
  }

  const rootNode = data.bookmarks[0];
  if (!rootNode || !rootNode.children) {
    throw new Error('북마크 트리가 비어있습니다.');
  }

  // ── Step 1: Collect ALL URLs from the backup tree ──
  const allUrls = [];
  const BLOCKED = ['chrome://', 'chrome-extension://', 'javascript:', 'data:', 'blob:', 'about:'];

  function collectUrls(nodes) {
    for (const n of nodes) {
      if (n.url) {
        const lower = n.url.toLowerCase();
        if (!BLOCKED.some(s => lower.startsWith(s))) {
          allUrls.push({ title: n.title || '', url: n.url });
        }
      }
      if (n.children) collectUrls(n.children);
    }
  }
  collectUrls(rootNode.children);
  console.log(`[Restore] Collected ${allUrls.length} valid URLs from backup`);

  // ── Step 2: Clean restore ──
  if (cleanRestore) {
    console.log('[Restore] Cleaning existing bookmarks...');
    const preTree = await chrome.bookmarks.getTree();
    for (const root of preTree[0].children) {
      if (root.children) {
        for (const child of [...root.children]) {
          try { await chrome.bookmarks.removeTree(child.id); } catch { }
        }
      }
    }
    console.log('[Restore] Clean done.');
  }

  // ── Step 3: Find a valid parent ID ──
  const freshTree = await chrome.bookmarks.getTree();
  const chromeRoots = freshTree[0].children;
  // Use the first available root (typically Bookmarks Bar)
  const parentId = chromeRoots[0]?.id;
  if (!parentId) throw new Error('Chrome 루트 폴더를 찾을 수 없습니다.');
  console.log(`[Restore] Using parent: id=${parentId} title="${chromeRoots[0].title}"`);

  // ── Step 4: Create all URLs flat under the parent ──
  let created = 0;
  let errors = 0;
  let lastProgressTime = 0;
  const totalItems = allUrls.length;

  for (const item of allUrls) {
    try {
      await chrome.bookmarks.create({
        parentId,
        title: item.title,
        url: item.url,
      });
      created++;
    } catch (err) {
      errors++;
      if (errors <= 10) console.warn(`[Restore] Failed "${item.title}":`, err.message);
    }

    // Throttled progress
    const now = Date.now();
    if (onProgress && (now - lastProgressTime > 300 || created >= totalItems)) {
      lastProgressTime = now;
      onProgress(created, totalItems);
    }
  }

  // Restore settings if present
  if (data.settings) await saveSettings(data.settings);

  console.log(`[Restore] DONE: ${created} created, ${errors} errors out of ${totalItems}`);
  return { created, total: totalItems, errors };
}



/**
 * Parse and validate a backup file
 */
export function parseBackupFile(jsonString) {
  const data = JSON.parse(jsonString);
  if (!data.bookmarks) throw new Error('bookmarks 필드가 없습니다.');

  // Compute stats
  function countNodes(nodes) {
    let urls = 0, folders = 0;
    for (const n of nodes) {
      if (n.url) urls++;
      if (n.children) {
        folders++;
        const sub = countNodes(n.children);
        urls += sub.urls;
        folders += sub.folders;
      }
    }
    return { urls, folders };
  }

  const stats = countNodes(data.bookmarks);
  return {
    ...data,
    stats: {
      urls: stats.urls,
      folders: stats.folders,
      exportedAt: data.exportedAt || 'unknown',
      version: data.version || '?',
    },
  };
}

