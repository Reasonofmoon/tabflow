// src/core/classifier.js — AI/keyword classification engine
import { CATS } from './state.js';

export function classify(url, customRules = []) {
  const rules = [...customRules, ...CATS];
  const lower = (url || '').toLowerCase();
  for (const rule of rules) {
    if (rule.keywords.some(k => lower.includes(k))) {
      return rule;
    }
  }
  return { name: '미분류', color: '#94a3b8', keywords: [] };
}

export function classifyAll(bookmarks, customRules = []) {
  return bookmarks.map(bm => ({
    ...bm,
    category: classify(bm.url, customRules),
  }));
}

// Organize bookmarks by domain into folders
export async function organizeByDomain(bookmarks) {
  const domainMap = new Map();
  for (const bm of bookmarks) {
    try {
      const domain = new URL(bm.url).hostname.replace('www.', '');
      if (!domainMap.has(domain)) domainMap.set(domain, []);
      domainMap.get(domain).push(bm);
    } catch { /* skip invalid URLs */ }
  }
  
  const results = [];
  for (const [domain, bms] of domainMap) {
    try {
      const folder = await chrome.bookmarks.create({ title: domain });
      for (const bm of bms) {
        await chrome.bookmarks.move(bm.id, { parentId: folder.id });
      }
      results.push({ domain, count: bms.length, folderId: folder.id });
    } catch (err) {
      console.warn(`Failed to organize domain ${domain}:`, err);
    }
  }
  return results;
}

// Classify and move bookmarks into category folders
export async function classifyAndOrganize(bookmarks, customRules = []) {
  const categoryMap = new Map();
  
  for (const bm of bookmarks) {
    const cat = classify(bm.url, customRules);
    if (cat.name === '미분류') continue;
    if (!categoryMap.has(cat.name)) categoryMap.set(cat.name, { cat, bookmarks: [] });
    categoryMap.get(cat.name).bookmarks.push(bm);
  }
  
  const results = [];
  for (const [name, { cat, bookmarks: bms }] of categoryMap) {
    try {
      // Search for existing folder or create new one
      const existing = await chrome.bookmarks.search({ title: name });
      const folder = existing.find(e => !e.url) || await chrome.bookmarks.create({ title: name });
      
      for (const bm of bms) {
        await chrome.bookmarks.move(bm.id, { parentId: folder.id });
      }
      results.push({ category: name, count: bms.length });
    } catch (err) {
      console.warn(`Failed to classify category ${name}:`, err);
    }
  }
  return results;
}
