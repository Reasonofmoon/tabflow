// src/sidepanel/sidepanel.js — Main UI orchestrator
// All event delegation, Chrome API integration, and message handling

import { S, CATS } from '../core/state.js';
import { getAllTabsByWindow, closeTab, discardTab, togglePin, activateTab, createTab, discardAllInactive, closeDuplicateTabs } from '../api/tabs.js';
import { getAllBookmarks, removeBookmark } from '../api/bookmarks.js';
import { removeWindow } from '../api/windows.js';
import { autoGroupByKeywords, queryGroups } from '../api/groups.js';
import { searchHistory } from '../api/history.js';
import { exportBackup, importBackup } from '../api/storage.js';
import { findDuplicates, removeDuplicates, findEmptyFolders, calculateHealthScore } from '../core/health-checker.js';
import { checkAllLinks, checkLink } from '../core/link-checker.js';
import { classify, classifyAndOrganize, organizeByDomain } from '../core/classifier.js';
import { render, renderMain, updateStats, updateBadges, updateSelBar } from '../ui/renderer.js';
import { attachDrag } from '../ui/drag-drop.js';
import { showContextMenu, hideContextMenu, handleContextAction, initContextMenuDismiss } from '../ui/context-menu.js';
import { toast } from '../ui/toast.js';

// ===================================================================
//  DATA LOADING — Replace demo data with Chrome API calls
// ===================================================================
async function loadTabs() {
  try {
    const windows = await getAllTabsByWindow();
    S.wins = windows.map(w => ({
      ...w,
      collapsed: false,
    }));
    // Load real groups
    try {
      const groups = await queryGroups({});
      S.groups = groups.map(g => ({
        id: g.id,
        name: g.title || '그룹',
        title: g.title || '그룹',
        color: g.color || '#999',
        tabIds: [],
      }));
      // Map tabs to groups
      S.wins.forEach(w => w.tabs.forEach(t => {
        if (t.groupId >= 0) {
          const g = S.groups.find(x => x.id === t.groupId);
          if (g) g.tabIds.push(t.id);
        }
      }));
    } catch { /* tabGroups may not be available */ }
  } catch (err) {
    console.error('Failed to load tabs:', err);
    toast('⚠️', '탭 로딩 실패');
  }
}

async function loadBookmarks() {
  try {
    const allBm = await getAllBookmarks();
    S.bm = allBm.map(bm => ({
      ...bm,
      favIconUrl: '',
    }));
    recalcBookmarks();
  } catch (err) {
    console.error('Failed to load bookmarks:', err);
    toast('⚠️', '북마크 로딩 실패');
  }
}

async function loadHistory() {
  try {
    S.hist = await searchHistory('', 100);
  } catch (err) {
    console.error('Failed to load history:', err);
  }
}

function recalcBookmarks() {
  S.bmDups = findDuplicates(S.bm);
  S.bmBroken = []; // Actual link checking done on demand
  S.bmEmpty = []; // Calculated when needed
  const dupCount = S.bmDups.reduce((s, d) => s + d.length - 1, 0);
  S.bmHealth = S.bm.length
    ? Math.max(0, Math.round(((S.bm.length - dupCount) / S.bm.length) * 100))
    : 100;
}

// ===================================================================
//  THEME MANAGEMENT
// ===================================================================
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  // Update theme toggle buttons
  document.querySelectorAll('#themeToggle button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === theme);
  });
  // Also update settings page if visible
  document.querySelectorAll('[data-action="set-theme"]').forEach(btn => {
    btn.classList.remove('btn-p');
    if (btn.dataset.val === theme) btn.classList.add('btn-p');
  });
}

async function loadSavedTheme() {
  try {
    const result = await chrome.storage.sync.get('theme');
    applyTheme(result.theme || 'dark');
  } catch {
    applyTheme('dark');
  }
}

async function setTheme(theme) {
  applyTheme(theme);
  try { await chrome.storage.sync.set({ theme }); } catch {}
  toast(theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '💻',
    theme === 'light' ? '라이트 모드' : theme === 'dark' ? '다크 모드' : '시스템 모드');
}

// ===================================================================
//  INITIALIZATION
// ===================================================================
async function init() {
  await loadSavedTheme();
  await Promise.all([loadTabs(), loadBookmarks(), loadHistory()]);
  render();
  attachDrag(() => { loadTabs().then(render); });
  initContextMenuDismiss();
  setupEventDelegation();
  setupSearchInput();
  setupPanelInput();
  setupKeyboardShortcuts();
  setupJsonImport();
}

// ===================================================================
//  EVENT DELEGATION — All clicks handled via data-action attributes
// ===================================================================
function setupEventDelegation() {
  document.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) {
      // Close overlay if clicking on overlay background
      if (e.target.classList.contains('overlay')) {
        closePanel();
      }
      return;
    }

    const action = target.dataset.action;
    const val = target.dataset.val;
    const tid = target.dataset.tid ? Number(target.dataset.tid) : null;
    const wid = target.dataset.wid ? Number(target.dataset.wid) : null;
    const bmid = target.dataset.bmid || null;
    const gid = target.dataset.gid ? Number(target.dataset.gid) : null;

    e.stopPropagation();

    try {
      switch (action) {
        // ── Navigation ──
        case 'nav':
          nav(val);
          break;

        // ── Tab view modes ──
        case 'set-vmode':
          S.vmode = val;
          render();
          break;
        case 'set-filter':
          S.filter = val;
          render();
          break;

        // ── Tab actions ──
        case 'close-tab':
          await closeTab(tid);
          toast('✕', '닫기 완료');
          await loadTabs();
          render();
          break;
        case 'discard-tab':
          try {
            await discardTab(tid);
            toast('💤', 'Discard 완료');
          } catch {
            toast('⚠️', '활성 탭은 Discard 불가');
          }
          await loadTabs();
          render();
          break;
        case 'toggle-pin':
          await togglePin(tid);
          toast('📌', '고정 토글');
          await loadTabs();
          render();
          break;
        case 'activate-tab':
          if (tid) {
            await activateTab(tid);
            toast('👆', '탭으로 이동');
          }
          break;
        case 'toggle-sel':
          S.sel.has(tid) ? S.sel.delete(tid) : S.sel.add(tid);
          render();
          break;
        case 'clear-sel':
          S.sel.clear();
          render();
          break;
        case 'discard-all-inactive': {
          const count = await discardAllInactive();
          toast('💤', count + '개 Discard');
          await loadTabs();
          render();
          break;
        }
        case 'close-dups': {
          const count = await closeDuplicateTabs();
          toast('🔄', count + '개 중복 닫기');
          await loadTabs();
          render();
          break;
        }

        // ── Window actions ──
        case 'toggle-collapse': {
          const w = S.wins.find(x => x.id === wid);
          if (w) { w.collapsed = !w.collapsed; render(); }
          break;
        }
        case 'close-win':
          e.stopPropagation();
          await removeWindow(wid);
          toast('✕', '윈도우 닫기');
          await loadTabs();
          render();
          break;
        case 'discard-win':
          e.stopPropagation();
          const win = S.wins.find(x => x.id === wid);
          if (win) {
            for (const t of win.tabs) {
              if (!t.active && !t.pinned) {
                try { await discardTab(t.id); } catch {}
              }
            }
            toast('💤', 'Discard 완료');
            await loadTabs();
            render();
          }
          break;
        case 'scroll-win':
          document.getElementById('win-' + wid)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;

        // ── Group actions ──
        case 'auto-group':
          await autoGroupByKeywords(CATS.map(c => ({
            name: c.name,
            color: mapCatColorToChrome(c.color),
            keywords: c.keywords,
          })));
          toast('🤖', '자동 분류 완료');
          await loadTabs();
          render();
          break;
        case 'new-group': {
          const name = prompt('그룹 이름:');
          if (!name) break;
          const selIds = [...S.sel];
          if (selIds.length) {
            const { createGroup } = await import('../api/groups.js');
            await createGroup(selIds, name, 'blue');
            S.sel.clear();
            toast('📁', `"${name}" 생성`);
            await loadTabs();
            render();
          } else {
            toast('ℹ️', '탭을 먼저 선택하세요');
          }
          break;
        }
        case 'delete-group':
          try {
            const { ungroupTabs } = await import('../api/groups.js');
            const grp = S.groups.find(g => g.id === gid);
            if (grp?.tabIds?.length) await ungroupTabs(grp.tabIds);
            toast('🗑️', '그룹 삭제');
            await loadTabs();
            render();
          } catch (err) {
            toast('⚠️', '그룹 삭제 실패');
          }
          break;

        // ── Selection bar actions ──
        case 'sel-act': {
          const ids = [...S.sel];
          if (!ids.length) break;
          switch (val) {
            case 'group': {
              const n = prompt('그룹 이름:');
              if (!n) break;
              const { createGroup } = await import('../api/groups.js');
              await createGroup(ids, n, 'blue');
              toast('📁', `"${n}" 생성`);
              break;
            }
            case 'move':
              await chrome.windows.create({ tabId: ids[0] });
              if (ids.length > 1) {
                const wins2 = await chrome.windows.getAll();
                const newWin = wins2[wins2.length - 1];
                for (const id of ids.slice(1)) {
                  await chrome.tabs.move(id, { windowId: newWin.id, index: -1 });
                }
              }
              toast('↗️', '새 윈도우 이동');
              break;
            case 'disc':
              for (const id of ids) {
                try { await discardTab(id); } catch {}
              }
              toast('💤', ids.length + '개 Discard');
              break;
            case 'bm':
              for (const id of ids) {
                const tab = await chrome.tabs.get(id);
                await chrome.bookmarks.create({ title: tab.title, url: tab.url });
              }
              toast('⭐', '북마크 추가');
              await loadBookmarks();
              break;
            case 'close':
              await chrome.tabs.remove(ids);
              toast('✕', ids.length + '개 닫기');
              break;
          }
          S.sel.clear();
          await loadTabs();
          render();
          break;
        }

        // ── Context menu ──
        case 'ctx-do':
          await handleContextAction(val, async () => {
            await loadTabs();
            await loadBookmarks();
            render();
          });
          break;

        // ── Bookmark actions ──
        case 'delete-bm':
          await removeBookmark(bmid);
          toast('✕', '삭제 완료');
          await loadBookmarks();
          render();
          break;
        case 'remove-dups':
          e.stopPropagation();
          const removed = await removeDuplicates(S.bmDups);
          toast('🧹', removed + '개 중복 제거 완료');
          await loadBookmarks();
          render();
          break;
        case 'remove-broken':
          e.stopPropagation();
          for (const bm of S.bmBroken) {
            await removeBookmark(bm.id);
          }
          toast('🧹', '깨진 링크 제거');
          await loadBookmarks();
          render();
          break;
        case 'check-link': {
          const bm = S.bm.find(b => b.id === bmid);
          if (bm) {
            const result = await checkLink(bm.url);
            if (result.status === 'ok') {
              toast('✅', '링크 정상');
            } else {
              toast('⚠️', '링크 깨짐: ' + result.status);
            }
          }
          break;
        }
        case 'run-full-clean':
          const dupRemoved = await removeDuplicates(S.bmDups);
          toast('🧹', dupRemoved + '개 중복 제거');
          await loadBookmarks();
          render();
          toast('🎉', '전체 청소 완료!');
          break;
        case 'ai-classify':
          await classifyAndOrganize(S.bm);
          toast('🤖', 'AI 자동 분류 완료');
          await loadBookmarks();
          render();
          break;
        case 'domain-sort':
          await organizeByDomain(S.bm);
          toast('🌐', '도메인별 폴더 생성 완료');
          await loadBookmarks();
          render();
          break;
        case 'alpha-sort':
          S.bm.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ko'));
          toast('🔤', '가나다 정렬 완료');
          render();
          break;
        case 'filter-bm-cat': {
          // Toggle cat filter chip UI
          target.closest('.cat-grid')?.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
          target.classList.add('active');
          S.query = val || '';
          render();
          S.query = '';
          break;
        }

        // ── Open URL in new tab ──
        case 'open-url':
          if (target.dataset.url) {
            await createTab(target.dataset.url);
          }
          break;

        // ── Toggle section (collapsible) ──
        case 'toggle-section': {
          const next = target.nextElementSibling;
          if (next) {
            next.style.display = next.style.display === 'none' ? '' : 'none';
          }
          break;
        }

        // ── Settings toggle ──
        case 'toggle-setting':
          target.classList.toggle('on');
          break;

        // ── Sync / Backup ──
        case 'do-sync':
          toast('☁️', '설정 동기화 완료');
          break;
        case 'export-json':
          await exportBackup();
          toast('📥', 'JSON 백업 완료');
          break;
        case 'import-json':
          document.getElementById('jsonFileInput')?.click();
          break;

        // ── Panel actions ──
        case 'open-panel':
          openPanel();
          break;
        case 'pan-tab':
          document.querySelectorAll('.pan-tab').forEach(e => e.classList.toggle('active', e.dataset.pt === val));
          panSearch(document.getElementById('panIn')?.value || '');
          break;
        case 'pan-open-url':
          await createTab(target.dataset.url);
          closePanel();
          break;

        // ── Theme ──
        case 'set-theme':
          await setTheme(val);
          render();
          break;

        // ── Add to bookmark from history ──
        case 'add-to-bm': {
          const url = target.dataset.url;
          const title = target.dataset.title;
          if (url) {
            await chrome.bookmarks.create({ title: title || url, url });
            toast('⭐', '북마크에 추가됨');
            await loadBookmarks();
            render();
          }
          break;
        }
      }
    } catch (err) {
      console.error(`Action "${action}" failed:`, err);
      toast('⚠️', '작업 실패');
    }
  });

  // Right-click context menu on tabs
  document.addEventListener('contextmenu', (e) => {
    const tabEl = e.target.closest('[data-action-ctx="tab-ctx"]');
    if (tabEl) {
      const tid = Number(tabEl.dataset.tid);
      const wid = Number(tabEl.dataset.wid);
      showContextMenu(e, tid, wid);
    }
  });

  // Click on tab item (not on a button) -> activate tab
  document.getElementById('main')?.addEventListener('click', async (e) => {
    const tabEl = e.target.closest('.ti[data-tid]');
    if (tabEl && !e.target.closest('[data-action]') && !e.target.closest('.ti-chk')) {
      const tid = Number(tabEl.dataset.tid);
      if (e.ctrlKey || e.metaKey) {
        S.sel.has(tid) ? S.sel.delete(tid) : S.sel.add(tid);
        render();
      } else {
        await activateTab(tid);
        toast('👆', '탭으로 이동');
      }
    }
  });
}

// ── Navigation ──
function nav(view) {
  S.view = view;
  document.querySelectorAll('.sb-item').forEach(e =>
    e.classList.toggle('active', e.dataset.v === view)
  );
  render();
  attachDrag(() => { loadTabs().then(render); });
}

// ── Search ──
function setupSearchInput() {
  document.getElementById('gSearch')?.addEventListener('input', (e) => {
    S.query = e.target.value;
    render();
  });
}

// ── Panel (New Tab) ──
function openPanel() {
  document.getElementById('panelOv')?.classList.add('open');
  const input = document.getElementById('panIn');
  if (input) { input.value = ''; input.focus(); }
  panSearch('');
}

function closePanel() {
  document.getElementById('panelOv')?.classList.remove('open');
}

function setupPanelInput() {
  const input = document.getElementById('panIn');
  if (!input) return;
  input.addEventListener('input', () => panSearch(input.value));
  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const v = input.value.trim();
      if (v) {
        await createTab(v);
        toast('➕', '새 탭 추가');
        closePanel();
        await loadTabs();
        render();
      }
    }
    if (e.key === 'Escape') closePanel();
  });
}

function panSearch(v) {
  const activeTab = document.querySelector('.pan-tab.active')?.dataset.pt || 'sug';
  const body = document.getElementById('panBody');
  if (!body) return;
  const q = (v || '').toLowerCase();

  if (activeTab === 'sug') {
    if (!v) {
      body.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-3);font-size:12px">URL → 이동 / 검색어 → Google 검색</div>';
      return;
    }
    const isUrl = /^(https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,})/i.test(v);
    let h = isUrl ? `<div class="pan-item" data-action="pan-open-url" data-url="${v}"><div class="pan-item-ic">🌐</div><div class="pan-item-info"><div class="pan-item-t">${v}</div><div class="pan-item-u">URL로 이동</div></div></div>` : '';
    h += `<div class="pan-item" data-action="pan-open-url" data-url="https://www.google.com/search?q=${encodeURIComponent(v)}"><div class="pan-item-ic">🔍</div><div class="pan-item-info"><div class="pan-item-t">Google: ${v}</div><div class="pan-item-u">google.com/search</div></div></div>`;
    // Show matching bookmarks
    S.bm.filter(x => (x.title || '').toLowerCase().includes(q) || (x.url || '').toLowerCase().includes(q)).slice(0, 3).forEach(x => {
      h += `<div class="pan-item" data-action="pan-open-url" data-url="${x.url}"><div class="pan-item-ic">⭐</div><div class="pan-item-info"><div class="pan-item-t">${x.title}</div><div class="pan-item-u">${x.url}</div></div><span class="pan-item-time">⭐</span></div>`;
    });
    body.innerHTML = h;
  } else if (activeTab === 'bm') {
    const items = S.bm.filter(x => !q || (x.title || '').toLowerCase().includes(q) || (x.url || '').toLowerCase().includes(q));
    body.innerHTML = items.map(x => `<div class="pan-item" data-action="pan-open-url" data-url="${x.url}"><div class="pan-item-ic">⭐</div><div class="pan-item-info"><div class="pan-item-t">${x.title}</div><div class="pan-item-u">${x.url}</div></div><span class="pan-item-time">${x.folder || ''}</span></div>`).join('') || '<div style="padding:20px;text-align:center;color:var(--text-3)">결과 없음</div>';
  } else {
    const items = S.hist.filter(x => !q || (x.title || '').toLowerCase().includes(q) || (x.url || '').toLowerCase().includes(q)).slice(0, 20);
    body.innerHTML = items.map(x => {
      const d = new Date(x.lastVisitTime || Date.now());
      return `<div class="pan-item" data-action="pan-open-url" data-url="${x.url}"><div class="pan-item-ic">🕐</div><div class="pan-item-info"><div class="pan-item-t">${x.title}</div><div class="pan-item-u">${x.url}</div></div><span class="pan-item-time">${d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span></div>`;
    }).join('') || '<div style="padding:20px;text-align:center;color:var(--text-3)">결과 없음</div>';
  }
}

// ── Keyboard ──
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openPanel();
    }
    if (e.key === 'Escape') {
      hideContextMenu();
      closePanel();
      if (S.sel.size) { S.sel.clear(); render(); }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'a' && S.view === 'tabs') {
      e.preventDefault();
      S.wins.forEach(w => w.tabs.forEach(t => S.sel.add(t.id)));
      render();
    }
  });
}

// ── JSON Import ──
function setupJsonImport() {
  document.getElementById('jsonFileInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importBackup(file);
      toast('📤', 'JSON 복구 완료');
      await loadBookmarks();
      render();
    } catch (err) {
      toast('⚠️', '복구 실패: ' + err.message);
    }
    e.target.value = '';
  });
}

// ── Chrome color mapping ──
function mapCatColorToChrome(hexColor) {
  const map = {
    '#3b82f6': 'blue',
    '#a855f7': 'purple',
    '#22c55e': 'green',
    '#f97316': 'orange',
    '#ec4899': 'pink',
    '#06b6d4': 'cyan',
    '#eab308': 'yellow',
    '#ef4444': 'red',
    '#f472b6': 'pink',
    '#94a3b8': 'grey',
  };
  return map[hexColor] || 'grey';
}

// ===================================================================
//  SERVICE WORKER MESSAGE LISTENER — Real-time updates
// ===================================================================
chrome.runtime.onMessage.addListener(async (msg) => {
  switch (msg.type) {
    case 'tab-created':
    case 'tab-removed':
    case 'tab-updated':
    case 'tab-moved':
      await loadTabs();
      render();
      attachDrag(() => { loadTabs().then(render); });
      break;
    case 'bm-created':
    case 'bm-removed':
    case 'bm-changed':
      await loadBookmarks();
      render();
      break;
    case 'toast':
      toast(msg.data.icon, msg.data.message);
      break;
  }
});

// ===================================================================
//  BOOTSTRAP
// ===================================================================
init();
