// src/ui/context-menu.js — Right-click context menu for tabs (DOM-based)

import { S } from '../core/state.js';
import { closeTab, togglePin, toggleMute, discardTab, duplicateTab, moveToNewWindow, activateTab } from '../api/tabs.js';
import { addBookmark } from '../api/bookmarks.js';
import { toast } from './toast.js';

const CTX_EL_ID = 'ctx';

export function showContextMenu(event, tabId, windowId) {
  event.preventDefault();
  event.stopPropagation();
  S.ctx = { tid: tabId, wid: windowId };
  const menu = document.getElementById(CTX_EL_ID);
  menu.classList.add('open');
  menu.style.left = Math.min(event.clientX, innerWidth - 200) + 'px';
  menu.style.top = Math.min(event.clientY, innerHeight - 300) + 'px';
}

export function hideContextMenu() {
  document.getElementById(CTX_EL_ID)?.classList.remove('open');
}

export async function handleContextAction(action, renderCallback) {
  hideContextMenu();
  if (!S.ctx) return;
  const { tid } = S.ctx;

  try {
    switch (action) {
      case 'go':
        await activateTab(tid);
        toast('👆', '탭으로 이동');
        break;
      case 'dup':
        await duplicateTab(tid);
        toast('📑', '복제 완료');
        break;
      case 'pin':
        await togglePin(tid);
        toast('📌', '고정 토글');
        break;
      case 'mute':
        await toggleMute(tid);
        toast('🔇', '음소거 토글');
        break;
      case 'disc':
        await discardTab(tid);
        toast('💤', 'Discard 완료');
        break;
      case 'newwin':
        await moveToNewWindow(tid);
        toast('↗️', '새 창 이동');
        break;
      case 'copy': {
        const tab = await chrome.tabs.get(tid);
        await navigator.clipboard?.writeText(tab.url);
        toast('🔗', 'URL 복사 완료');
        break;
      }
      case 'bm': {
        const tab = await chrome.tabs.get(tid);
        await addBookmark(tab.title, tab.url);
        toast('⭐', '북마크 추가 완료');
        break;
      }
      case 'close':
        await closeTab(tid);
        toast('✕', '닫기 완료');
        break;
    }
    renderCallback?.();
  } catch (err) {
    console.error(`Context action "${action}" failed:`, err);
    toast('⚠️', '작업 실패: ' + err.message);
  }
}

export function initContextMenuDismiss() {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#' + CTX_EL_ID)) {
      hideContextMenu();
    }
  });
}
