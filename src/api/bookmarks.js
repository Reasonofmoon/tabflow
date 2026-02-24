// src/api/bookmarks.js — chrome.bookmarks API wrapper

export async function getAllBookmarks() {
  const tree = await chrome.bookmarks.getTree();
  const flat = [];
  function walk(nodes, folder = 'Root') {
    for (const node of nodes) {
      if (node.url) {
        flat.push({
          id: node.id,
          title: node.title,
          url: node.url,
          folder,
          folderId: node.parentId,
          dateAdded: node.dateAdded,
        });
      }
      if (node.children) walk(node.children, node.title);
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
