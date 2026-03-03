// src/core/classifier.js — Category-based classification engine (max 20 categories)
import { CATS } from './state.js';

export function classify(url, customRules = []) {
  const rules = [...customRules, ...CATS];
  const lower = (url || '').toLowerCase();
  for (const rule of rules) {
    if (rule.keywords.length === 0) continue; // Skip catch-all '기타'
    if (rule.keywords.some(k => lower.includes(k))) {
      return rule;
    }
  }
  // Return the last category (📦 기타) as catch-all
  return CATS[CATS.length - 1] || { name: '📦 기타', color: '#94a3b8', keywords: [] };
}

export function classifyAll(bookmarks, customRules = []) {
  return bookmarks.map(bm => ({
    ...bm,
    category: classify(bm.url, customRules),
  }));
}

// Classify ALL bookmarks into max 20 category folders
export async function classifyAndOrganize(bookmarks, customRules = []) {
  const categoryMap = new Map();
  
  for (const bm of bookmarks) {
    if (!bm.url) continue; // Skip folders
    const cat = classify(bm.url, customRules);
    if (!categoryMap.has(cat.name)) categoryMap.set(cat.name, { cat, bookmarks: [] });
    categoryMap.get(cat.name).bookmarks.push(bm);
  }

  console.log(`[Classify] ${bookmarks.length} bookmarks → ${categoryMap.size} categories`);
  for (const [name, { bookmarks: bms }] of categoryMap) {
    console.log(`  ${name}: ${bms.length}`);
  }
  
  const results = [];
  for (const [name, { cat, bookmarks: bms }] of categoryMap) {
    try {
      // Search for existing folder with same name, or create new
      const existing = await chrome.bookmarks.search({ title: name });
      const folder = existing.find(e => !e.url) || await chrome.bookmarks.create({ title: name });
      
      for (const bm of bms) {
        try {
          await chrome.bookmarks.move(bm.id, { parentId: folder.id });
        } catch (err) {
          console.warn(`[Classify] Move failed "${bm.title}":`, err.message);
        }
      }
      results.push({ category: name, count: bms.length });
    } catch (err) {
      console.warn(`[Classify] Folder failed "${name}":`, err);
    }
  }

  console.log(`[Classify] Done! ${results.length} categories created`);
  return results;
}

// organizeByDomain removed — creates too many folders (862+)
