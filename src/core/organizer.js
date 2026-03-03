// src/core/organizer.js — Bookmark folder organization engine

/**
 * Get full bookmark tree with stats
 */
export async function getFullBookmarkTree() {
  const tree = await chrome.bookmarks.getTree();
  return tree;
}

/**
 * Flatten tree into a list of all nodes with path info
 */
export function flattenTree(nodes, path = '', depth = 0) {
  const result = [];
  for (const node of nodes) {
    const currentPath = path ? `${path} / ${node.title}` : node.title;
    result.push({
      ...node,
      path: currentPath,
      depth,
      isFolder: !!node.children,
      childCount: node.children ? node.children.length : 0,
    });
    if (node.children) {
      result.push(...flattenTree(node.children, currentPath, depth + 1));
    }
  }
  return result;
}

/**
 * Find empty folders (folders with no children or only empty sub-folders)
 */
export function findEmptyFolders(nodes, result = []) {
  for (const node of nodes) {
    if (node.children) {
      if (node.children.length === 0) {
        result.push(node);
      } else {
        // Check if all children are also empty folders
        const allChildrenEmpty = node.children.every(
          c => c.children && c.children.length === 0
        );
        if (allChildrenEmpty && node.id !== '0' && node.id !== '1' && node.id !== '2') {
          result.push(node);
        }
        findEmptyFolders(node.children, result);
      }
    }
  }
  return result;
}

/**
 * Find folders nested deeper than maxDepth
 */
export function findDeepNested(nodes, maxDepth = 5, currentDepth = 0, result = []) {
  for (const node of nodes) {
    if (node.children) {
      if (currentDepth >= maxDepth) {
        result.push({ ...node, depth: currentDepth });
      }
      findDeepNested(node.children, maxDepth, currentDepth + 1, result);
    }
  }
  return result;
}

/**
 * Get tree statistics recursively
 */
export function getTreeStats(node) {
  let urls = 0, folders = 0, maxDepth = 0;
  function walk(n, depth) {
    if (n.url) urls++;
    if (n.children) {
      folders++;
      if (depth > maxDepth) maxDepth = depth;
      n.children.forEach(c => walk(c, depth + 1));
    }
  }
  if (Array.isArray(node)) {
    node.forEach(n => walk(n, 0));
  } else {
    walk(node, 0);
  }
  return { urls, folders, maxDepth };
}

/**
 * Merge folder: move all children from srcId to destId, then delete src
 */
export async function mergeFolder(srcId, destId) {
  const [src] = await chrome.bookmarks.getSubTree(srcId);
  if (!src || !src.children) throw new Error('Source is not a folder');
  
  for (const child of src.children) {
    await chrome.bookmarks.move(child.id, { parentId: destId });
  }
  await chrome.bookmarks.removeTree(srcId);
  return src.children.length;
}

/**
 * Rename a folder
 */
export async function renameFolder(id, newName) {
  return chrome.bookmarks.update(id, { title: newName });
}

/**
 * Flatten a folder: move all children of sub-folders up to this folder, then remove empty sub-folders
 */
export async function flattenFolder(id) {
  const [folder] = await chrome.bookmarks.getSubTree(id);
  if (!folder || !folder.children) return 0;
  
  let moved = 0;
  for (const child of folder.children) {
    if (child.children) {
      // Move all sub-children up to the parent folder
      for (const grandchild of child.children) {
        await chrome.bookmarks.move(grandchild.id, { parentId: id });
        moved++;
      }
      // Remove the now-empty sub-folder
      await chrome.bookmarks.removeTree(child.id);
    }
  }
  return moved;
}

/**
 * Sort children of a folder by name or date
 */
export async function sortFolderChildren(id, by = 'name') {
  const [folder] = await chrome.bookmarks.getSubTree(id);
  if (!folder || !folder.children) return;
  
  const sorted = [...folder.children].sort((a, b) => {
    if (by === 'name') return (a.title || '').localeCompare(b.title || '', 'ko');
    if (by === 'date') return (b.dateAdded || 0) - (a.dateAdded || 0);
    return 0;
  });
  
  for (let i = 0; i < sorted.length; i++) {
    await chrome.bookmarks.move(sorted[i].id, { parentId: id, index: i });
  }
}

/**
 * Delete all empty folders
 */
export async function deleteEmptyFolders(tree) {
  const empties = findEmptyFolders(tree);
  // Delete from deepest first to avoid parent deletion issues
  const sorted = empties.sort((a, b) => {
    const depthA = (a.path || '').split('/').length;
    const depthB = (b.path || '').split('/').length;
    return depthB - depthA;
  });
  
  let deleted = 0;
  for (const folder of sorted) {
    try {
      // Don't delete root folders
      if (folder.id === '0' || folder.id === '1' || folder.id === '2') continue;
      await chrome.bookmarks.removeTree(folder.id);
      deleted++;
    } catch { /* may have been already deleted as child */ }
  }
  return deleted;
}
