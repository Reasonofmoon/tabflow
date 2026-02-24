// src/options/options.js — Settings page logic

const CATS = [
  { name: '개발', color: '#3b82f6', keywords: ['github','stackoverflow','vscode','npm','vercel','react','mdn'] },
  { name: 'AI', color: '#a855f7', keywords: ['chatgpt','claude','anthropic','notebooklm','openai'] },
  { name: '생산성', color: '#22c55e', keywords: ['notion','docs.google','calendar','obsidian'] },
  { name: '미디어', color: '#f97316', keywords: ['youtube','spotify','netflix'] },
  { name: 'SNS', color: '#ec4899', keywords: ['twitter','x.com','reddit','linkedin','slack'] },
  { name: '뉴스', color: '#06b6d4', keywords: ['news','medium','hacker'] },
  { name: '쇼핑', color: '#eab308', keywords: ['coupang','11st','amazon'] },
];

const DEFAULT_SETTINGS = {
  autoSync: true,
  discardOnRestore: true,
  syncBookmarks: false,
  autoGroupTabs: false,
  autoClassifyBookmarks: false,
  autoDiscard: false,
};

async function loadSettings() {
  const result = await chrome.storage.sync.get('settings');
  return { ...DEFAULT_SETTINGS, ...result.settings };
}

async function saveSettings(settings) {
  await chrome.storage.sync.set({ settings });
  showSaved();
}

function showSaved() {
  const el = document.getElementById('saved');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await loadSettings();

  // Initialize toggles
  document.querySelectorAll('.tog').forEach(tog => {
    const key = tog.dataset.key;
    if (settings[key]) tog.classList.add('on');
    tog.addEventListener('click', async () => {
      tog.classList.toggle('on');
      const current = await loadSettings();
      current[key] = tog.classList.contains('on');
      await saveSettings(current);
    });
  });

  // Render rules
  const rulesEl = document.getElementById('rules');
  rulesEl.innerHTML = CATS.map(c => `
    <div class="rule">
      <div class="rule-dot" style="background:${c.color}"></div>
      <span style="font-weight:500;width:50px">${c.name}</span>
      <span class="rule-kw">${c.keywords.join(', ')}</span>
    </div>
  `).join('');

  // Export
  document.getElementById('exportBtn').addEventListener('click', async () => {
    const tree = await chrome.bookmarks.getTree();
    const settings = await loadSettings();
    const data = { bookmarks: tree, settings, exportedAt: new Date().toISOString(), version: '1.0' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tabflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSaved();
  });

  // Import
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });
  document.getElementById('fileInput').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.settings) {
          await saveSettings(data.settings);
          location.reload();
        }
      } catch (err) {
        alert('복구 실패: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
});
