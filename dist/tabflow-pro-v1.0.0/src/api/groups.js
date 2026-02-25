// src/api/groups.js — chrome.tabGroups API wrapper

// Available group colors in Chrome
export const GROUP_COLORS = [
  'grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'
];

export async function createGroup(tabIds, title, color = 'blue') {
  const groupId = await chrome.tabs.group({ tabIds });
  await chrome.tabGroups.update(groupId, { title, color });
  return groupId;
}

export async function updateGroup(groupId, properties) {
  return chrome.tabGroups.update(groupId, properties);
}

export async function ungroupTabs(tabIds) {
  return chrome.tabs.ungroup(tabIds);
}

export async function queryGroups(queryInfo = {}) {
  return chrome.tabGroups.query(queryInfo);
}

export async function autoGroupByKeywords(rules) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const created = [];
  for (const rule of rules) {
    const matched = tabs.filter(t =>
      rule.keywords.some(k => (t.url || '').toLowerCase().includes(k))
    );
    if (matched.length > 0) {
      const groupId = await createGroup(
        matched.map(t => t.id),
        rule.name,
        rule.color
      );
      created.push({ groupId, name: rule.name, count: matched.length });
    }
  }
  return created;
}
