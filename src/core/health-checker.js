// src/core/health-checker.js — Bookmark health analysis

export function findDuplicates(bookmarks) {
  const urlMap = new Map();
  for (const bm of bookmarks) {
    try {
      const parsed = new URL(bm.url);
      const normalized = parsed.origin + parsed.pathname;
      if (!urlMap.has(normalized)) urlMap.set(normalized, []);
      urlMap.get(normalized).push(bm);
    } catch { /* skip invalid URLs */ }
  }
  return [...urlMap.values()].filter(arr => arr.length > 1);
}

export async function removeDuplicates(dupGroups) {
  let removed = 0;
  for (const group of dupGroups) {
    for (const bm of group.slice(1)) {
      try {
        await chrome.bookmarks.remove(bm.id);
        removed++;
      } catch (err) {
        console.warn(`Failed to remove duplicate bookmark ${bm.id}:`, err);
      }
    }
  }
  return removed;
}

export function findEmptyFolders(tree) {
  const empty = [];
  function isDeepEmpty(node) {
    // A leaf without children or URL = empty
    if (!node.children) return false; // it's a URL, not empty
    if (node.children.length === 0) return true; // no children at all
    // Folder has children: check if ALL children are also empty folders
    return node.children.every(c => c.children && isDeepEmpty(c));
  }
  function walk(nodes) {
    for (const node of nodes) {
      if (node.children) {
        // Skip root folders (id 0, 1, 2)
        if (node.id !== '0' && node.id !== '1' && node.id !== '2') {
          if (isDeepEmpty(node)) {
            empty.push(node);
          }
        }
        // Always recurse into sub-folders
        walk(node.children);
      }
    }
  }
  walk(tree);
  return empty;
}

export async function removeEmptyFolders(folders) {
  let removed = 0;
  for (const folder of folders) {
    try {
      await chrome.bookmarks.removeTree(folder.id);
      removed++;
    } catch (err) {
      console.warn(`Failed to remove folder ${folder.id}:`, err);
    }
  }
  return removed;
}

export function calculateHealthScore(bookmarks, dupGroups, brokenLinks, emptyFolders) {
  const total = bookmarks.length;
  if (total === 0) return 100;
  const issues = dupGroups.reduce((s, d) => s + d.length - 1, 0)
    + brokenLinks.length
    + emptyFolders.length;
  return Math.max(0, Math.round(((total - issues) / total) * 100));
}
