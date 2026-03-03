// src/api/bookmarks.js — chrome.bookmarks API wrapper

export async function getUnorganizedBookmarks() {
  const tree = await chrome.bookmarks.getTree();
  const flat = [];
  
  // Only target links directly in main root folders (Bookmarks Bar, Other Bookmarks, Mobile Bookmarks)
  // These usually have parentId '1', '2', '3' or are children of '0'
  function walk(nodes, depth = 0) {
    for (const node of nodes) {
      if (node.url && depth <= 2) { 
        // depth 0 = root, depth 1 = standard folders (Bar, Other), depth 2 = direct children of standard folders
        flat.push({
          id: node.id,
          title: node.title,
          url: node.url,
          folder: '미분류', // Mark as unorganized
          folderId: node.parentId,
          dateAdded: node.dateAdded,
        });
      }
      // Only traverse down to the main standard folders to find unorganized links
      // Do NOT traverse into user-created subfolders to avoid destroying their structure
      if (node.children && depth < 2) {
        walk(node.children, depth + 1);
      }
    }
  }
  
  walk(tree);
  return flat;
}

export async function getBookmarkTree() {
  return chrome.bookmarks.getTree();
}

export async function addBookmark(title, url, parentId) {
  const opts = { title, url };
  if (parentId) opts.parentId = parentId;
  return chrome.bookmarks.create(opts);
}

export async function removeBookmark(id) {
  return chrome.bookmarks.remove(id);
}

export async function updateBookmark(id, changes) {
  return chrome.bookmarks.update(id, changes);
}

export async function moveBookmark(id, destination) {
  return chrome.bookmarks.move(id, destination);
}

export async function searchBookmarks(query) {
  return chrome.bookmarks.search(query);
}

export async function createFolder(title, parentId) {
  const opts = { title };
  if (parentId) opts.parentId = parentId;
  return chrome.bookmarks.create(opts);
}

export async function removeTree(id) {
  return chrome.bookmarks.removeTree(id);
}
