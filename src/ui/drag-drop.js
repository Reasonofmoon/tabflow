// src/ui/drag-drop.js — Drag and drop handler for tab reordering

import { S } from '../core/state.js';
import { moveTab, moveTabToWindow } from '../api/tabs.js';
import { toast } from './toast.js';

export function attachDrag(renderCallback) {
  document.querySelectorAll('.ti[draggable]').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      S.drag = {
        tid: Number(el.dataset.tid),
        wid: Number(el.dataset.wid),
        idx: Number(el.dataset.idx || 0),
      };
      e.target.style.opacity = '.4';
      e.dataTransfer.effectAllowed = 'move';
    });

    el.addEventListener('dragend', (e) => {
      e.target.style.opacity = '';
      document.querySelectorAll('.drag-over').forEach(x => x.classList.remove('drag-over'));
      S.drag = null;
    });

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      e.target.closest('.ti')?.classList.add('drag-over');
    });

    el.addEventListener('dragleave', (e) => {
      e.target.closest('.ti')?.classList.remove('drag-over');
    });

    el.addEventListener('drop', async (e) => {
      e.preventDefault();
      const target = e.target.closest('.ti');
      if (!target || !S.drag) return;

      const targetTabId = Number(target.dataset.tid);
      const targetWindowId = Number(target.dataset.wid);
      const targetIndex = Number(target.dataset.idx || 0);
      const sourceTabId = S.drag.tid;
      const sourceWindowId = S.drag.wid;

      if (sourceTabId === targetTabId) return;

      try {
        if (sourceWindowId === targetWindowId) {
          await moveTab(sourceTabId, targetIndex);
          toast('↕️', '순서 변경');
        } else {
          await moveTabToWindow(sourceTabId, targetWindowId, targetIndex);
          toast('↕️', '윈도우 간 이동');
        }
        renderCallback?.();
      } catch (err) {
        console.error('Drag-drop move failed:', err);
        toast('⚠️', '이동 실패');
      }
    });
  });
}
