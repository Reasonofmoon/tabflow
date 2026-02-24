// src/ui/renderer.js — DOM rendering engine for all views
import { S, CATS, COLORS, generateColor } from '../core/state.js';
import { classify } from '../core/classifier.js';
import { getDomain, getFaviconUrl } from '../utils/url-parser.js';

// ── Helper: escape HTML for safe rendering ──
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function faviconImg(tab) {
  if (tab.favIconUrl) {
    return `<img src="${esc(tab.favIconUrl)}" width="16" height="16" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span style="display:none;width:16px;height:16px;align-items:center;justify-content:center;font-size:10px;background:var(--bg-4);border-radius:3px">🌐</span>`;
  }
  return `<span style="display:flex;width:16px;height:16px;align-items:center;justify-content:center;font-size:10px;background:var(--bg-4);border-radius:3px">🌐</span>`;
}

// ── STATS ──
export function updateStats() {
  const tt = S.wins.reduce((s, w) => s + w.tabs.length, 0);
  const dc = S.wins.reduce((s, w) => s + w.tabs.filter(t => t.discarded).length, 0);
  const el = (id) => document.getElementById(id);
  if (el('sWin')) el('sWin').textContent = S.wins.length;
  if (el('sTab')) el('sTab').textContent = tt;
  if (el('sBm')) el('sBm').textContent = S.bm.length;
  if (el('sMem')) el('sMem').textContent = (tt - dc) * 80 + dc * 4;
}

export function updateBadges() {
  const tt = S.wins.reduce((s, w) => s + w.tabs.length, 0);
  const el = (id) => document.getElementById(id);
  if (el('bAll')) el('bAll').textContent = tt;
  if (el('bGrp')) el('bGrp').textContent = S.groups.length;
  if (el('bBm')) el('bBm').textContent = S.bm.length;
}

export function updateSelBar() {
  const el = document.getElementById('selCnt');
  if (el) el.textContent = S.sel.size;
  document.getElementById('selBar')?.classList.toggle('vis', S.sel.size > 0);
}

// ── SIDEBAR WINDOWS ──
export function renderSidebarWins() {
  const container = document.getElementById('sbWins');
  if (!container) return;
  container.innerHTML = S.wins.map(w => `
    <div class="sb-win ${w.focused ? 'active' : ''}" data-action="scroll-win" data-wid="${w.id}">
      <div class="sb-win-dot" style="background:${generateColor(w.id)}"></div>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">윈도우 ${w.id}</span>
      <span class="sb-win-count">${w.tabs.length}</span>
    </div>
  `).join('');
}

// ── MAIN VIEW ROUTER ──
export function renderMain() {
  const m = document.getElementById('main');
  if (!m) return;
  switch (S.view) {
    case 'tabs': renderTabs(m); break;
    case 'groups': renderGroups(m); break;
    case 'bm-dash': renderBmDash(m); break;
    case 'bm-all': renderBmAll(m); break;
    case 'bm-clean': renderBmClean(m); break;
    case 'bm-cards': renderBmCards(m); break;
    case 'history': renderHistory(m); break;
    case 'settings': renderSettings(m); break;
  }
}

// ── TABS VIEW ──
function filteredWins() {
  if (!S.query) return S.wins;
  const q = S.query.toLowerCase();
  return S.wins.map(w => ({
    ...w,
    tabs: w.tabs.filter(t =>
      (t.title || '').toLowerCase().includes(q) || (t.url || '').toLowerCase().includes(q)
    )
  })).filter(w => w.tabs.length);
}

function applyFilter(tabs) {
  switch (S.filter) {
    case 'pinned': return tabs.filter(t => t.pinned);
    case 'audible': return tabs.filter(t => t.audible);
    case 'discarded': return tabs.filter(t => t.discarded);
    default: return tabs;
  }
}

function renderTabs(m) {
  const wins = filteredWins();
  const tt = wins.reduce((s, w) => s + w.tabs.length, 0);
  m.innerHTML = `
    <div class="toolbar">
      <div class="tl">
        <div class="vtoggle">
          <button class="${S.vmode === 'list' ? 'active' : ''}" data-action="set-vmode" data-val="list">☰ 목록</button>
          <button class="${S.vmode === 'grid' ? 'active' : ''}" data-action="set-vmode" data-val="grid">▦ 그리드</button>
        </div>
        <button class="chip ${S.filter === 'all' ? 'active' : ''}" data-action="set-filter" data-val="all">전체 (${tt})</button>
        <button class="chip ${S.filter === 'pinned' ? 'active' : ''}" data-action="set-filter" data-val="pinned">📌 고정</button>
        <button class="chip ${S.filter === 'audible' ? 'active' : ''}" data-action="set-filter" data-val="audible">🔊 재생</button>
        <button class="chip ${S.filter === 'discarded' ? 'active' : ''}" data-action="set-filter" data-val="discarded">💤 Discard</button>
      </div>
      <div class="tr">
        <button class="btn btn-sm" data-action="discard-all-inactive">💤 비활성 Discard</button>
        <button class="btn btn-sm btn-d" data-action="close-dups">🔄 중복 닫기</button>
      </div>
    </div>
    ${wins.map(w => renderWindowGroup(w)).join('')}
  `;
}

function renderWindowGroup(w) {
  const tabs = applyFilter(w.tabs);
  if (!tabs.length && S.filter !== 'all') return '';
  const color = generateColor(w.id);
  const body = S.vmode === 'grid'
    ? `<div class="tg" style="padding:10px;background:var(--bg-1);border:1px solid var(--border-0);border-top:none;border-radius:0 0 var(--r) var(--r)">${tabs.map(t => renderTabCard(t, w)).join('')}</div>`
    : `<div class="tl-wrap">${tabs.map((t, i) => renderTabItem(t, w, i)).join('')}</div>`;
  return `<div class="wg" id="win-${w.id}">
    <div class="wg-head" data-action="toggle-collapse" data-wid="${w.id}">
      <div class="wg-hl">
        <div class="wg-dot" style="background:${color}"></div>
        <span class="wg-title">윈도우 ${w.id}</span>
        <span class="wg-meta">${tabs.length}개 · ${w.focused ? '🟢 포커스' : '⚪ 비활성'}</span>
      </div>
      <div class="wg-hr">
        <button class="wg-btn dis" data-action="discard-win" data-wid="${w.id}" title="Discard">💤</button>
        <button class="wg-btn cls" data-action="close-win" data-wid="${w.id}" title="닫기">✕</button>
        <span style="font-size:11px;color:var(--text-3)">▼</span>
      </div>
    </div>
    ${w.collapsed ? '' : body}
  </div>`;
}

function renderTabItem(t, w, idx) {
  const sel = S.sel.has(t.id);
  const groupInfo = t.groupId >= 0 ? S.groups.find(g => g.id === t.groupId) : null;
  return `<div class="ti ${t.active ? 'at' : ''} ${sel ? 'sel' : ''} ${t.discarded ? 'disc' : ''}"
    data-tid="${t.id}" data-wid="${w.id}" data-idx="${idx}" draggable="true"
    data-action-ctx="tab-ctx">
    <div class="ti-chk ${sel ? 'on' : ''}" data-action="toggle-sel" data-tid="${t.id}">${sel ? '✓' : ''}</div>
    <div class="ti-fav">${faviconImg(t)}</div>
    <div class="ti-info">
      <div class="ti-title">${esc(t.title)}</div>
      <div class="ti-url">${esc(t.url)}</div>
    </div>
    <div class="ti-badges">
      ${t.pinned ? '<span class="badge badge-pin">PIN</span>' : ''}
      ${t.audible ? '<span class="badge badge-aud">♪</span>' : ''}
      ${t.discarded ? '<span class="badge badge-dis">ZZZ</span>' : ''}
      ${groupInfo ? `<span class="badge badge-grp" style="background:${groupInfo.color}18;color:${groupInfo.color}">${esc(groupInfo.title || groupInfo.name || '')}</span>` : ''}
    </div>
    <div class="ti-acts">
      <button class="ti-btn" data-action="toggle-pin" data-tid="${t.id}" title="고정">📌</button>
      <button class="ti-btn" data-action="discard-tab" data-tid="${t.id}" title="Discard">💤</button>
      <button class="ti-btn cls" data-action="close-tab" data-tid="${t.id}" title="닫기">✕</button>
    </div>
  </div>`;
}

function renderTabCard(t, w) {
  const sel = S.sel.has(t.id);
  return `<div class="tc ${sel ? 'sel' : ''}" data-tid="${t.id}" data-action="activate-tab" data-action-ctx="tab-ctx">
    <div class="tc-prev">${faviconImg(t)}</div>
    <div class="tc-head"><div class="ti-fav">${faviconImg(t)}</div><div class="ti-title" style="flex:1">${esc(t.title)}</div></div>
    <div class="ti-url">${esc(t.url)}</div>
    <div style="margin-top:6px;display:flex;gap:3px;flex-wrap:wrap">
      ${t.pinned ? '<span class="badge badge-pin">PIN</span>' : ''}
      ${t.discarded ? '<span class="badge badge-dis">ZZZ</span>' : ''}
    </div>
  </div>`;
}

// ── GROUPS VIEW ──
function renderGroups(m) {
  m.innerHTML = `
    <div class="toolbar">
      <div class="tl"><h2 style="font-size:15px;font-weight:600">📁 탭 그룹</h2></div>
      <div class="tr">
        <button class="btn btn-p btn-sm" data-action="new-group">➕ 새 그룹</button>
        <button class="btn btn-sm" data-action="auto-group">🤖 자동 분류</button>
      </div>
    </div>
    <div class="cat-grid">${S.groups.map(g => `
      <div class="cat-tag" style="border-color:${g.color || '#999'}33;background:${g.color || '#999'}0d;color:${g.color || '#999'}">
        <div class="ct-dot" style="background:${g.color || '#999'}"></div>${esc(g.title || g.name)}
        <span class="ct-cnt">${g.tabIds?.length || 0}</span>
      </div>
    `).join('')}</div>
    ${S.groups.map(g => {
      const groupTabs = [];
      S.wins.forEach(w => w.tabs.forEach(t => {
        if (t.groupId === g.id) groupTabs.push({ t, w });
      }));
      return `<div class="wg">
        <div class="wg-head">
          <div class="wg-hl">
            <div class="wg-dot" style="background:${g.color || '#999'}"></div>
            <span class="wg-title">${esc(g.title || g.name)}</span>
            <span class="wg-meta">${groupTabs.length}개</span>
          </div>
          <div class="wg-hr">
            <button class="wg-btn cls" data-action="delete-group" data-gid="${g.id}">✕</button>
          </div>
        </div>
        <div class="tl-wrap">${groupTabs.map(({ t, w }, i) => renderTabItem(t, w, i)).join('')}</div>
      </div>`;
    }).join('')}
    ${!S.groups.length ? '<div class="empty"><div class="ei">📁</div><h3>그룹이 없습니다</h3><p>자동 분류를 실행하거나 탭을 선택하여 그룹을 만드세요.</p></div>' : ''}
  `;
}

// ── BOOKMARK DASHBOARD ──
function renderBmDash(m) {
  const cats = {};
  S.bm.forEach(b => { const c = classify(b.url); cats[c.name] = (cats[c.name] || 0) + 1; });
  const dupCount = S.bmDups.reduce((s, d) => s + d.length - 1, 0);
  const folders = [...new Set(S.bm.map(b => b.folder))];

  m.innerHTML = `
    <div class="toolbar">
      <div class="tl"><h2 style="font-size:15px;font-weight:600">📊 북마크 대시보드</h2></div>
      <div class="tr">
        <button class="btn btn-p btn-sm" data-action="nav" data-val="bm-clean">🧹 청소 시작</button>
        <button class="btn btn-sm" data-action="export-json">📥 JSON 백업</button>
        <button class="btn btn-sm btn-s" data-action="import-json">📤 JSON 복구</button>
      </div>
    </div>
    <div class="bm-dashboard">
      <div class="bm-stat-card"><div class="num" style="color:var(--accent)">${S.bm.length}</div><div class="label">전체 북마크</div><div class="sub">${folders.length}개 폴더</div></div>
      <div class="bm-stat-card"><div class="num" style="color:${dupCount ? 'var(--red)' : 'var(--green)'}">${dupCount}</div><div class="label">중복 북마크</div><div class="sub">${S.bmDups.length}개 그룹</div></div>
      <div class="bm-stat-card"><div class="num" style="color:${S.bmBroken.length ? 'var(--red)' : 'var(--green)'}">${S.bmBroken.length}</div><div class="label">깨진 링크</div><div class="sub">자동 감지됨</div></div>
      <div class="bm-stat-card"><div class="num" style="color:var(--green)">${S.bmHealth}%</div><div class="label">건강도 점수</div><div class="sub">${S.bmHealth >= 80 ? '양호' : '개선 필요'}</div></div>
    </div>
    <div class="bm-health">
      <h3>🏥 북마크 건강도 분석</h3>
      ${healthBar('중복 없는 비율', S.bm.length ? 100 - Math.round(dupCount / S.bm.length * 100) : 100, 'var(--accent)')}
      ${healthBar('유효 링크 비율', S.bm.length ? Math.round((S.bm.length - S.bmBroken.length) / S.bm.length * 100) : 100, 'var(--green)')}
      ${healthBar('분류 완료 비율', S.bm.length ? Math.round(S.bm.filter(b => classify(b.url).name !== '미분류').length / S.bm.length * 100) : 100, 'var(--purple)')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="sett">
        <h3>📂 폴더별 분포</h3>
        ${folders.slice(0, 10).map(f => {
          const cnt = S.bm.filter(b => b.folder === f).length;
          const pct = S.bm.length ? Math.round(cnt / S.bm.length * 100) : 0;
          return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11.5px">
            <span style="flex:1;color:var(--text-1)">${esc(f)}</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--text-3)">${cnt}</span>
            <div style="width:80px;height:4px;background:var(--bg-4);border-radius:2px;overflow:hidden"><div style="width:${pct}%;height:100%;background:var(--accent);border-radius:2px"></div></div>
          </div>`;
        }).join('')}
      </div>
      <div class="sett">
        <h3>🏷️ 카테고리별 분포</h3>
        ${Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([cat, cnt]) => {
          const c = CATS.find(x => x.name === cat);
          const clr = c ? c.color : '#94a3b8';
          return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11.5px">
            <div style="width:8px;height:8px;border-radius:2px;background:${clr}"></div>
            <span style="flex:1;color:var(--text-1)">${esc(cat)}</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--text-3)">${cnt}</span>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

function healthBar(label, pct, color) {
  return `<div class="health-bar-wrap">
    <div class="health-bar-label"><span>${label}</span><span style="font-family:var(--mono)">${pct}%</span></div>
    <div class="health-bar"><div class="health-bar-fill" style="width:${pct}%;background:${color}"></div></div>
  </div>`;
}

// ── BOOKMARK ALL ──
function renderBmAll(m) {
  const q = S.query.toLowerCase();
  const filtered = q ? S.bm.filter(b => (b.title || '').toLowerCase().includes(q) || (b.url || '').toLowerCase().includes(q)) : S.bm;
  const folders = [...new Set(filtered.map(b => b.folder))];

  m.innerHTML = `
    <div class="toolbar">
      <div class="tl"><h2 style="font-size:15px;font-weight:600">⭐ 전체 북마크 (${filtered.length})</h2></div>
      <div class="tr">
        <button class="btn btn-sm" data-action="ai-classify">🤖 AI 자동 분류</button>
        <button class="btn btn-sm" data-action="domain-sort">🌐 도메인별 정렬</button>
        <button class="btn btn-sm" data-action="alpha-sort">🔤 가나다 정렬</button>
      </div>
    </div>
    ${folders.map(f => `
      <div class="wg">
        <div class="wg-head" data-action="toggle-section">
          <div class="wg-hl"><span style="font-size:13px">📂</span><span class="wg-title">${esc(f)}</span><span class="wg-meta">${filtered.filter(b => b.folder === f).length}개</span></div>
        </div>
        <div class="tl-wrap">
          ${filtered.filter(b => b.folder === f).map(b => {
            const cat = classify(b.url);
            return `<div class="ti" data-action="open-url" data-url="${esc(b.url)}">
              <div class="ti-fav">${faviconImg(b)}</div>
              <div class="ti-info"><div class="ti-title">${esc(b.title)}</div><div class="ti-url">${esc(b.url)}</div></div>
              <div class="ti-badges">
                <span class="badge badge-grp" style="background:${cat.color}18;color:${cat.color}">${esc(cat.name)}</span>
              </div>
              <div class="ti-acts">
                <button class="ti-btn cls" data-action="delete-bm" data-bmid="${b.id}" title="삭제">✕</button>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    `).join('')}
    ${!filtered.length ? '<div class="empty"><div class="ei">⭐</div><h3>북마크가 없습니다</h3></div>' : ''}
  `;
}

// ── BOOKMARK CLEANUP ──
function renderBmClean(m) {
  const dupCount = S.bmDups.reduce((s, d) => s + d.length - 1, 0);
  m.innerHTML = `
    <div class="toolbar">
      <div class="tl"><h2 style="font-size:15px;font-weight:600">🧹 북마크 청소 도구</h2></div>
      <div class="tr"><button class="btn btn-p btn-sm" data-action="run-full-clean">🚀 전체 청소 실행</button></div>
    </div>
    <div class="bm-dashboard" style="grid-template-columns:repeat(3,1fr)">
      <div class="bm-stat-card" style="border-left:3px solid var(--red)"><div class="num" style="color:var(--red)">${dupCount}</div><div class="label">중복 북마크</div><div class="sub">${S.bmDups.length}개 중복 그룹 감지</div></div>
      <div class="bm-stat-card" style="border-left:3px solid var(--orange)"><div class="num" style="color:var(--orange)">${S.bmBroken.length}</div><div class="label">깨진 링크</div><div class="sub">응답 없는 URL</div></div>
      <div class="bm-stat-card" style="border-left:3px solid var(--yellow)"><div class="num" style="color:var(--yellow)">${S.bmEmpty.length}</div><div class="label">빈 폴더</div><div class="sub">삭제 권장</div></div>
    </div>
    <!-- Duplicates -->
    <div class="bm-cleanup-list">
      <div class="bm-cl-head" data-action="toggle-section">
        <div style="display:flex;align-items:center;gap:8px"><span style="font-size:14px">🔄</span><span style="font-size:13px;font-weight:600">중복 북마크 (${dupCount}개)</span></div>
        <button class="btn btn-sm btn-d" data-action="remove-dups">모두 제거</button>
      </div>
      <div class="bm-cl-body">
        ${S.bmDups.map(group => group.map((b, i) => `
          <div class="bm-dup-item">
            <div class="ti-fav">${faviconImg(b)}</div>
            <div style="flex:1;min-width:0"><div class="ti-title" style="font-size:12px">${esc(b.title)}</div><div class="ti-url">${esc(b.url)}</div></div>
            <span class="dup-badge" style="background:${i === 0 ? 'var(--green-bg)' : 'var(--red-bg)'};color:${i === 0 ? 'var(--green)' : 'var(--red)'}">${i === 0 ? '유지' : '중복'}</span>
            ${i > 0 ? `<button class="ti-btn cls" data-action="delete-bm" data-bmid="${b.id}" title="삭제">✕</button>` : ''}
          </div>
        `).join('')).join('')}
        ${!S.bmDups.length ? '<div style="padding:20px;text-align:center;color:var(--text-3);font-size:12px">✅ 중복 북마크가 없습니다</div>' : ''}
      </div>
    </div>
    <!-- Broken links -->
    <div class="bm-cleanup-list">
      <div class="bm-cl-head" data-action="toggle-section">
        <div style="display:flex;align-items:center;gap:8px"><span style="font-size:14px">🔗</span><span style="font-size:13px;font-weight:600">깨진 링크 (${S.bmBroken.length}개)</span></div>
        <button class="btn btn-sm btn-d" data-action="remove-broken">모두 제거</button>
      </div>
      <div class="bm-cl-body">
        ${S.bmBroken.map(b => `
          <div class="bm-dup-item">
            <div class="ti-fav">${faviconImg(b)}</div>
            <div style="flex:1;min-width:0"><div class="ti-title" style="font-size:12px">${esc(b.title)}</div><div class="ti-url">${esc(b.url)}</div></div>
            <span class="dup-badge" style="background:var(--red-bg);color:var(--red)">깨짐</span>
            <button class="ti-btn" data-action="check-link" data-bmid="${b.id}" title="재검사">🔄</button>
            <button class="ti-btn cls" data-action="delete-bm" data-bmid="${b.id}" title="삭제">✕</button>
          </div>
        `).join('')}
        ${!S.bmBroken.length ? '<div style="padding:20px;text-align:center;color:var(--text-3);font-size:12px">✅ 깨진 링크가 없습니다</div>' : ''}
      </div>
    </div>
    <!-- AI classify section -->
    <div class="sett">
      <h3>🤖 AI 자동 분류</h3>
      <p style="font-size:12px;color:var(--text-2);margin-bottom:12px">도메인과 키워드를 분석하여 북마크를 자동으로 카테고리별 폴더로 분류합니다.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        ${CATS.map(c => `<span class="bm-tag" style="background:${c.color}15;color:${c.color}">${esc(c.name)} (${c.keywords.slice(0, 3).join(', ')}...)</span>`).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-p btn-sm" data-action="ai-classify">🤖 자동 분류 실행</button>
        <button class="btn btn-sm" data-action="domain-sort">🌐 도메인별 폴더 생성</button>
      </div>
    </div>
  `;
}

// ── BOOKMARK CARD VIEW ──
function renderBmCards(m) {
  const q = S.query.toLowerCase();
  const filtered = q ? S.bm.filter(b => (b.title || '').toLowerCase().includes(q) || (b.url || '').toLowerCase().includes(q)) : S.bm;

  m.innerHTML = `
    <div class="toolbar">
      <div class="tl">
        <h2 style="font-size:15px;font-weight:600">🃏 카드 뷰</h2>
        <span style="font-size:11px;color:var(--text-3)">(${filtered.length}개)</span>
      </div>
      <div class="tr"><button class="btn btn-sm" data-action="alpha-sort">🔤 정렬</button></div>
    </div>
    <div class="cat-grid" style="margin-bottom:14px">
      <button class="chip active" data-action="filter-bm-cat" data-val="">전체</button>
      ${CATS.map(c => `<button class="chip" data-action="filter-bm-cat" data-val="${c.name}" style="border-color:${c.color}33;color:${c.color}">${esc(c.name)}</button>`).join('')}
    </div>
    <div class="bm-cards">
      ${filtered.map(b => {
        const cat = classify(b.url);
        const domain = getDomain(b.url);
        return `<div class="bm-card" data-action="open-url" data-url="${esc(b.url)}">
          <div class="bm-card-actions">
            <button class="ti-btn cls" data-action="delete-bm" data-bmid="${b.id}" title="삭제">✕</button>
          </div>
          <div class="bm-card-domain"><div class="dot" style="background:${cat.color}"></div>${esc(domain)}</div>
          <h4>${esc(b.title)}</h4>
          <div class="bm-card-url">${esc(b.url)}</div>
          <div class="bm-card-tags">
            <span class="bm-tag" style="background:${cat.color}15;color:${cat.color};font-size:9px">${esc(cat.name)}</span>
          </div>
        </div>`;
      }).join('')}
    </div>
    ${!filtered.length ? '<div class="empty"><div class="ei">🃏</div><h3>북마크가 없습니다</h3></div>' : ''}
  `;
}

// ── HISTORY ──
function renderHistory(m) {
  const today = new Date().toDateString();
  m.innerHTML = `
    <div class="toolbar"><div class="tl"><h2 style="font-size:15px;font-weight:600">🕐 방문기록</h2></div></div>
    <div class="tl-wrap" style="border:1px solid var(--border-0);border-radius:var(--r)">
      ${S.hist.map(h => {
        const d = new Date(h.lastVisitTime || h.time || Date.now());
        const ts = d.toDateString() === today
          ? d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
          : d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
        return `<div class="ti" data-action="open-url" data-url="${esc(h.url)}">
          <div class="ti-fav">${faviconImg(h)}</div>
          <div class="ti-info"><div class="ti-title">${esc(h.title)}</div><div class="ti-url">${esc(h.url)}</div></div>
          <span style="font-size:9.5px;color:var(--text-3);font-family:var(--mono)">${ts}</span>
          ${h.visitCount ? `<span style="font-size:9.5px;color:var(--text-3);font-family:var(--mono)">×${h.visitCount}</span>` : ''}
        </div>`;
      }).join('')}
      ${!S.hist.length ? '<div style="padding:20px;text-align:center;color:var(--text-3);font-size:12px">방문기록이 없습니다</div>' : ''}
    </div>
  `;
}

// ── SETTINGS ──
function settRow(label, desc, key) {
  return `<div class="sett-row">
    <div class="sett-label">${label}<small>${desc}</small></div>
    <div class="tog" data-action="toggle-setting" data-key="${key}"></div>
  </div>`;
}

function renderSettings(m) {
  m.innerHTML = `
    <h2 style="font-size:15px;font-weight:600;margin-bottom:14px">⚙️ 설정</h2>
    <div class="sett"><h3>☁️ 동기화</h3>
      ${settRow('자동 동기화', '열린 윈도우와 탭을 자동으로 동기화', 'autoSync')}
      ${settRow('복구 시 Discard', '복구할 때 Discard 상태로 로드하여 성능 향상', 'discardOnRestore')}
      ${settRow('북마크 동기화', '북마크도 함께 동기화', 'syncBookmarks')}
    </div>
    <div class="sett"><h3>🤖 자동 분류</h3>
      ${settRow('탭 자동 그룹', '키워드 기반 자동 탭 분류', 'autoGroupTabs')}
      ${settRow('북마크 자동 정리', 'AI 기반 카테고리 자동 분류', 'autoClassifyBookmarks')}
      <div style="margin-top:8px;font-size:11px;color:var(--text-2)">분류 규칙:</div>
      ${CATS.map(c => `<div style="display:flex;align-items:center;gap:7px;padding:4px 0;font-size:11px">
        <div style="width:8px;height:8px;border-radius:2px;background:${c.color}"></div>
        <span style="font-weight:500;width:50px">${esc(c.name)}</span>
        <span style="color:var(--text-3);font-family:var(--mono);font-size:9.5px">${c.keywords.join(', ')}</span>
      </div>`).join('')}
    </div>
    <div class="sett"><h3>💤 메모리 관리</h3>
      ${settRow('자동 Discard', '비활성 탭을 자동으로 Discard', 'autoDiscard')}
    </div>
    <div class="sett"><h3>📥 데이터 백업</h3>
      <p style="font-size:11.5px;color:var(--text-2);margin-bottom:10px">북마크를 JSON 파일로 내보내거나 가져올 수 있습니다.</p>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm" data-action="export-json">📥 JSON 내보내기</button>
        <button class="btn btn-sm btn-s" data-action="import-json">📤 JSON 가져오기</button>
      </div>
    </div>
    <div class="sett"><h3>ℹ️ 정보</h3>
      <div style="font-size:11.5px;color:var(--text-2);line-height:1.7">
        <strong>TabFlow Pro</strong> v1.0<br>
        탭 매니저 + 북마크 매니저 통합 도구<br>
        <span style="color:var(--text-3)">중복 제거 · 깨진 링크 검사 · AI 자동 분류 · 동기화 · 드래그앤드롭</span>
      </div>
    </div>
  `;
}

// ── FULL RENDER ──
export function render() {
  updateStats();
  renderSidebarWins();
  renderMain();
  updateSelBar();
  updateBadges();
}
