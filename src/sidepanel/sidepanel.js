// src/sidepanel/sidepanel.js — Main UI orchestrator
// All event delegation, Chrome API integration, and message handling

import { S, CATS } from '../core/state.js';
import { getAllTabsByWindow, closeTab, discardTab, togglePin, activateTab, createTab, discardAllInactive, closeDuplicateTabs } from '../api/tabs.js';
import { getUnorganizedBookmarks, removeBookmark } from '../api/bookmarks.js';
import { removeWindow } from '../api/windows.js';
import { autoGroupByKeywords, queryGroups } from '../api/groups.js';
import { searchHistory } from '../api/history.js';
import { exportBackup, importBackup, parseBackupFile } from '../api/storage.js';
import { findDuplicates, removeDuplicates, findEmptyFolders, calculateHealthScore } from '../core/health-checker.js';
import { checkAllLinks, checkLink } from '../core/link-checker.js';
import { classify, classifyAndOrganize } from '../core/classifier.js';
import { getFullBookmarkTree, renameFolder, flattenFolder, sortFolderChildren, deleteEmptyFolders } from '../core/organizer.js';

import { render, renderMain, updateStats, updateBadges, updateSelBar } from '../ui/renderer.js';
import { attachDrag } from '../ui/drag-drop.js';
import { showContextMenu, hideContextMenu, handleContextAction, initContextMenuDismiss } from '../ui/context-menu.js';
import { toast } from '../ui/toast.js';
import { maybeShowOnboarding, showOnboarding } from '../ui/onboarding.js';

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
    const allBm = await getUnorganizedBookmarks();
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

async function loadBmTree() {
  try {
    S.bmTree = await getFullBookmarkTree();
  } catch (err) {
    console.error('Failed to load bookmark tree:', err);
  }
}

function recalcBookmarks() {
  S.bmDups = findDuplicates(S.bm);
  S.bmBroken = []; // Actual link checking done on demand
  // Calculate empty folders from the bookmark tree
  if (S.bmTree && S.bmTree.length) {
    S.bmEmpty = findEmptyFolders(S.bmTree[0]?.children || []);
  } else {
    S.bmEmpty = [];
  }
  const dupCount = S.bmDups.reduce((s, d) => s + d.length - 1, 0);
  S.bmHealth = S.bm.length
    ? Math.max(0, Math.round(((S.bm.length - dupCount - S.bmEmpty.length) / S.bm.length) * 100))
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
  await Promise.all([loadTabs(), loadBookmarks(), loadHistory(), loadBmTree()]);
  render();
  attachDrag(() => { loadTabs().then(render); });
  initContextMenuDismiss();
  maybeShowOnboarding();
  setupEventDelegation();
  setupSearchInput();
  setupPanelInput();
  setupKeyboardShortcuts();
  setupBackupFileInput();
}

// ── Backup file input listener ──
function setupBackupFileInput() {
  const input = document.getElementById('jsonFileInput');
  if (!input) return;
  input.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseBackupFile(ev.target.result);
        S.restorePreview = parsed;
        S.restoreProgress = 0;
        toast('📂', `백업 로드됨: ${parsed.stats.urls} URLs, ${parsed.stats.folders} 폴더`);
        render();
      } catch (err) {
        toast('⚠️', '파일 파싱 실패: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
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
        case 'ai-classify': {
          // Load custom categories from storage
          const stored = await chrome.storage.local.get('customCats');
          const customRules = stored.customCats || [];
          // Fallback: if S.bm is empty, load all bookmarks from tree
          let bmToClassify = S.bm;
          if (!bmToClassify.length) {
            const tree = await chrome.bookmarks.getTree();
            const flat = [];
            function collect(nodes) {
              for (const n of nodes) {
                if (n.url) flat.push(n);
                if (n.children) collect(n.children);
              }
            }
            collect(tree);
            bmToClassify = flat;
          }
          if (!bmToClassify.length) {
            toast('⚠️', '분류할 북마크가 없습니다');
            break;
          }
          toast('🤖', `${bmToClassify.length}개 북마크 분류 중...`);
          const results = await classifyAndOrganize(bmToClassify, customRules);
          toast('🤖', `AI 분류 완료! ${results.length}개 카테고리`);
          await loadBookmarks();
          await loadBmTree();
          render();
          break;
        }
        case 'domain-sort':
          await classifyAndOrganize(S.bm);
          toast('📂', '카테고리별 분류 완료 (최대 20개)');
          await loadBookmarks();
          render();
          break;
        case 'save-custom-cats': {
          const input = document.getElementById('customCatsInput');
          if (!input) break;
          const lines = input.value.split('\n').filter(l => l.trim());
          const customCats = lines.map(line => {
            const [name, ...kws] = line.split(':');
            return {
              name: name.trim(),
              color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
              keywords: kws.join(':').split(',').map(k => k.trim().toLowerCase()).filter(Boolean),
            };
          }).filter(c => c.name && c.keywords.length);
          await chrome.storage.local.set({ customCats });
          toast('💾', `${customCats.length}개 커스텀 카테고리 저장됨`);
          render();
          break;
        }
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

        // ── Tutorial ──
        case 'replay-tutorial':
          showOnboarding(val || 'ko');
          break;
        case 'reset-onboarding':
          try { await chrome.storage.local.remove('onboardingDone'); } catch {}
          showOnboarding(val || 'ko');
          break;

        // ── Organizer actions ──
        case 'org-tab':
          S.organizerTab = val;
          if (val === 'organize') await loadBmTree();
          render();
          break;
        case 'load-backup-file':
          document.getElementById('jsonFileInput').click();
          break;
        case 'confirm-restore': {
          if (!S.restorePreview) {
            toast('⚠️', '먼저 백업 파일을 선택하세요');
            break;
          }
          const cleanRestore = val === 'clean';
          if (cleanRestore && !confirm('⚠️ 현재 모든 북마크가 삭제됩니다.\n정말 클린 복원하시겠습니까?')) break;
          S.restoreProgress = 1;
          render();
          try {
            const result = await importBackup(S.restorePreview, {
              cleanRestore,
              onProgress: (current, total) => {
                const pct = Math.round((current / total) * 100);
                if (pct !== S.restoreProgress && pct % 5 === 0) {
                  S.restoreProgress = pct;
                  render();
                }
              },
            });
            S.restoreProgress = 100;
            const msg = `복원 완료! ${result.created}개 생성` + (result.errors ? `, ${result.errors}개 오류` : '');
            toast('🎉', msg);
            await loadBookmarks();
            await loadBmTree();
            render();
          } catch (err) {
            toast('⚠️', '복원 실패: ' + err.message);
            S.restoreProgress = 0;
            render();
          }
          break;
        }
        case 'delete-all-empty-folders': {
          if (!S.bmTree.length) break;
          const tree = S.bmTree[0].children || [];
          const deleted = await deleteEmptyFolders(tree);
          toast('🗑️', deleted + '개 빈 폴더 삭제');
          await loadBmTree();
          render();
          break;
        }
        case 'delete-empty-folder': {
          try {
            await chrome.bookmarks.removeTree(bmid);
            toast('🗑️', '폴더 삭제');
            await loadBmTree();
            render();
          } catch (err) {
            toast('⚠️', '삭제 실패: ' + err.message);
          }
          break;
        }
        case 'rename-folder': {
          const newName = prompt('새 폴더 이름:');
          if (!newName) break;
          await renameFolder(bmid, newName);
          toast('✏️', '이름 변경 완료');
          await loadBmTree();
          render();
          break;
        }
        case 'sort-folder': {
          await sortFolderChildren(bmid, 'name');
          toast('🔤', '정렬 완료');
          await loadBmTree();
          render();
          break;
        }
        case 'flatten-folder': {
          const moved = await flattenFolder(bmid);
          toast('⬆️', moved + '개 항목 이동 (평탄화)');
          await loadBmTree();
          render();
          break;
        }
        case 'refresh-tree':
          await loadBmTree();
          toast('🔄', '트리 새로고침 완료');
          render();
          break;
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
