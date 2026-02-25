// src/core/state.js — Central state management

const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#a855f7', '#f97316', '#06b6d4', '#ec4899'];

export function generateColor(id) {
  return COLORS[Math.abs(id) % COLORS.length];
}

export const S = {
  view: 'tabs',
  vmode: 'list',
  filter: 'all',
  query: '',
  sel: new Set(),
  ctx: null,
  drag: null,
  // Real data (populated from Chrome API)
  wins: [],
  groups: [],
  bm: [],
  hist: [],
  // Bookmark analysis
  bmDups: [],
  bmBroken: [],
  bmEmpty: [],
  bmHealth: 0,
};

export const CATS = [
  { name: '개발', color: '#3b82f6', keywords: ['github', 'stackoverflow', 'vscode', 'npm', 'vercel', 'react', 'mdn', 'w3schools', 'developer'] },
  { name: 'AI', color: '#a855f7', keywords: ['chatgpt', 'claude', 'anthropic', 'notebooklm', 'openai', 'gemini'] },
  { name: '생산성', color: '#22c55e', keywords: ['notion', 'docs.google', 'calendar', 'obsidian', 'raindrop', 'mail.google'] },
  { name: '미디어', color: '#f97316', keywords: ['youtube', 'spotify', 'netflix'] },
  { name: 'SNS', color: '#ec4899', keywords: ['twitter', 'x.com', 'reddit', 'linkedin', 'slack'] },
  { name: '뉴스', color: '#06b6d4', keywords: ['news', 'medium', 'hacker'] },
  { name: '쇼핑', color: '#eab308', keywords: ['coupang', '11st', 'amazon'] },
  { name: '디자인', color: '#f472b6', keywords: ['figma', 'canva'] },
  { name: '참고', color: '#94a3b8', keywords: ['wikipedia'] },
];

export { COLORS };
