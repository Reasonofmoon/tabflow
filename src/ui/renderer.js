// src/ui/renderer.js — DOM rendering engine with Affordance UI
import { S, CATS, COLORS, generateColor } from '../core/state.js';
import { classify } from '../core/classifier.js';
import { getDomain, getFaviconUrl } from '../utils/url-parser.js';
import { getTreeStats, findEmptyFolders, findDeepNested } from '../core/organizer.js';

// ── Helper: escape HTML for safe rendering ──
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function faviconImg(tab) {
  if (tab.favIconUrl) {
    return `<img src="${esc(tab.favIconUrl)}" width="18" height="18" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span style="display:none;width:18px;height:18px;align-items:center;justify-content:center;font-size:11px;background:var(--bg-4);border-radius:4px">🌐</span>`;
  }
  return `<span style="display:flex;width:18px;height:18px;align-items:center;justify-content:center;font-size:11px;background:var(--bg-4);border-radius:4px">🌐</span>`;
}

// ── Affordance Helpers ──
function heroCard(icon, title, desc, actions = '') {
  return `<div class="hero-card">
    <div class="hero-icon">${icon}</div>
    <div class="hero-body">
      <div class="hero-title">${title}</div>
      <div class="hero-desc">${desc}</div>
      ${actions ? `<div class="hero-actions">${actions}</div>` : ''}
    </div>
  </div>`;
}

function quickActions(items) {
  return `<div class="quick-actions">${items.map(i =>
    `<div class="qa-btn" data-action="${i.action}" ${i.val ? `data-val="${i.val}"` : ''}>
      <div class="qa-icon">${i.icon}</div>
      <div class="qa-label">${i.label}</div>
      <div class="qa-desc">${i.desc}</div>
    </div>`
  ).join('')}</div>`;
}

function hint(icon, text) {
  return `<div class="hint"><span class="hint-icon">${icon}</span>${text}</div>`;
}

function emptyState(icon, title, desc, cta = '') {
  return `<div class="empty">
    <div class="ei">${icon}</div>
    <h3>${title}</h3>
    <p>${desc}</p>
    ${cta}
  </div>`;
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
    case 'bm-organize': renderOrganizer(m); break;
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
  const dc = wins.reduce((s, w) => s + w.tabs.filter(t => t.discarded).length, 0);
  const savedMB = dc * 76;

  m.innerHTML = `
    ${quickActions([
      { icon: '💤', label: '비활성 Discard', desc: `메모리 ~${savedMB || '??'}MB 절약`, action: 'discard-all-inactive' },
      { icon: '🔄', label: '중복 닫기', desc: '같은 URL 탭 정리', action: 'close-dups' },
      { icon: '📁', label: '자동 그룹', desc: '키워드로 분류', action: 'auto-group' },
      { icon: '➕', label: '새 탭 열기', desc: 'URL 또는 검색', action: 'open-panel' },
    ])}
    ${hint('💡', '<strong>팁:</strong> 탭을 우클릭하면 이동·복제·고정 등 다양한 메뉴가 나타납니다. Ctrl+클릭으로 여러 탭을 선택할 수 있어요.')}
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
    ${!wins.length ? emptyState('📋', '열린 탭이 없습니다', '새 탭을 열어보세요.', `<button class="btn-cta" data-action="open-panel">➕ 새 탭 열기</button>`) : ''}
  `;
}

function renderWindowGroup(w) {
  const tabs = applyFilter(w.tabs);
  if (!tabs.length && S.filter !== 'all') return '';
  const color = generateColor(w.id);
  const headerBg = `linear-gradient(135deg, ${color}22, ${color}08)`;
  const headerBorder = `${color}44`;
  const body = S.vmode === 'grid'
    ? `<div class="tg" style="padding:12px;background:var(--bg-1);border:1px solid var(--border-0);border-top:none;border-radius:0 0 var(--r) var(--r)">${tabs.map(t => renderTabCard(t, w)).join('')}</div>`
    : `<div class="tl-wrap">${tabs.map((t, i) => renderTabItem(t, w, i)).join('')}</div>`;
  return `<div class="wg" id="win-${w.id}">
    <div class="wg-head" data-action="toggle-collapse" data-wid="${w.id}" style="background:${headerBg};border-color:${headerBorder};border-left:4px solid ${color}">
      <div class="wg-hl">
        <div class="wg-dot" style="background:${color}"></div>
        <span class="wg-title">윈도우 ${w.id}</span>
        <span class="wg-meta">${tabs.length}개 · ${w.focused ? '🟢 포커스' : '⚪ 비활성'}</span>
      </div>
      <div class="wg-hr">
        <button class="wg-btn dis" data-action="discard-win" data-wid="${w.id}" title="비활성 탭 Discard">💤</button>
        <button class="wg-btn cls" data-action="close-win" data-wid="${w.id}" title="윈도우 닫기">✕</button>
        <span style="font-size:12px;color:var(--text-3)">▼</span>
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
      <button class="ti-btn" data-action="toggle-pin" data-tid="${t.id}" title="고정/해제">📌</button>
      <button class="ti-btn" data-action="discard-tab" data-tid="${t.id}" title="메모리 절약 (Discard)">💤</button>
      <button class="ti-btn cls" data-action="close-tab" data-tid="${t.id}" title="탭 닫기">✕</button>
    </div>
  </div>`;
}

function renderTabCard(t, w) {
  const sel = S.sel.has(t.id);
  return `<div class="tc ${sel ? 'sel' : ''}" data-tid="${t.id}" data-action="activate-tab" data-action-ctx="tab-ctx">
    <div class="tc-prev">${faviconImg(t)}</div>
    <div class="tc-head"><div class="ti-fav">${faviconImg(t)}</div><div class="ti-title" style="flex:1">${esc(t.title)}</div></div>
    <div class="ti-url">${esc(t.url)}</div>
    <div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap">
      ${t.pinned ? '<span class="badge badge-pin">PIN</span>' : ''}
      ${t.discarded ? '<span class="badge badge-dis">ZZZ</span>' : ''}
    </div>
  </div>`;
}

// ── GROUPS VIEW ──
function renderGroups(m) {
  m.innerHTML = `
    ${heroCard('📁', '탭 그룹으로 정리하세요', '열린 탭을 주제별로 자동 분류합니다. 키워드 기반 AI가 개발·SNS·쇼핑 등을 구분합니다.',
      `<button class="btn-cta" data-action="auto-group">🤖 자동 분류 시작</button>
       <button class="btn btn-sm" data-action="new-group">➕ 수동 그룹 만들기</button>`
    )}
    ${S.groups.length ? `
    <div class="cat-grid">${S.groups.map(g => `
      <div class="cat-tag" style="border-color:${g.color || '#999'}33;background:${g.color || '#999'}0d;color:${g.color || '#999'}">
        <div class="ct-dot" style="background:${g.color || '#999'}"></div>${esc(g.title || g.name)}
        <span class="ct-cnt">${g.tabIds?.length || 0}</span>
      </div>
    `).join('')}</div>` : ''}
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
    ${!S.groups.length ? emptyState('📁', '아직 그룹이 없습니다', '탭을 선택하거나 자동 분류로 그룹을 만들어보세요.', `<button class="btn-cta" data-action="auto-group">🤖 자동 분류 시작</button>`) : ''}
  `;
}

// ── BOOKMARK DASHBOARD ──
function renderBmDash(m) {
  const cats = {};
  S.bm.forEach(b => { const c = classify(b.url); cats[c.name] = (cats[c.name] || 0) + 1; });
  const dupCount = S.bmDups.reduce((s, d) => s + d.length - 1, 0);
  const folders = [...new Set(S.bm.map(b => b.folder))];

  m.innerHTML = `
    ${heroCard('📊', '북마크 건강도를 확인하세요', '중복·깨진 링크·분류 상태를 한눈에 파악하고, 원클릭으로 정리할 수 있습니다.',
      `<button class="btn-cta" data-action="nav" data-val="bm-clean">🧹 청소 시작하기</button>
       <button class="btn btn-sm" data-action="export-json">📥 JSON 백업</button>`
    )}
    <div class="bm-dashboard">
      <div class="bm-stat-card"><div class="num" style="color:var(--accent)">${S.bm.length}</div><div class="label">전체 북마크</div><div class="sub">${folders.length}개 폴더</div></div>
      <div class="bm-stat-card"><div class="num" style="color:${dupCount ? 'var(--red)' : 'var(--green)'}">${dupCount}</div><div class="label">중복 북마크</div><div class="sub">${S.bmDups.length}개 그룹</div></div>
      <div class="bm-stat-card"><div class="num" style="color:${S.bmBroken.length ? 'var(--red)' : 'var(--green)'}">${S.bmBroken.length}</div><div class="label">깨진 링크</div><div class="sub">자동 감지됨</div></div>
      <div class="bm-stat-card"><div class="num" style="color:var(--green)">${S.bmHealth}%</div><div class="label">건강도 점수</div><div class="sub">${S.bmHealth >= 80 ? '✅ 양호' : '⚠️ 개선 필요'}</div></div>
    </div>
    ${quickActions([
      { icon: '🔄', label: '중복 제거', desc: `${dupCount}개 정리 가능`, action: 'remove-dups' },
      { icon: '🔗', label: '깨진 링크 삭제', desc: `${S.bmBroken.length}개 감지`, action: 'remove-broken' },
      { icon: '🤖', label: 'AI 자동 분류', desc: '20개 카테고리', action: 'ai-classify' },
    ])}
    <div class="bm-health">
      <h3>🏥 북마크 건강도 분석</h3>
      ${healthBar('중복 없는 비율', S.bm.length ? 100 - Math.round(dupCount / S.bm.length * 100) : 100, 'var(--accent)')}
      ${healthBar('유효 링크 비율', S.bm.length ? Math.round((S.bm.length - S.bmBroken.length) / S.bm.length * 100) : 100, 'var(--green)')}
      ${healthBar('분류 완료 비율', S.bm.length ? Math.round(S.bm.filter(b => classify(b.url).name !== '📦 기타').length / S.bm.length * 100) : 100, 'var(--purple)')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="sett">
        <h3>📂 폴더별 분포</h3>
        ${folders.slice(0, 10).map(f => {
          const cnt = S.bm.filter(b => b.folder === f).length;
          const pct = S.bm.length ? Math.round(cnt / S.bm.length * 100) : 0;
          return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:var(--fs-sm)">
            <span style="flex:1;color:var(--text-1)">${esc(f)}</span>
            <span style="font-family:var(--mono);font-size:var(--fs-xs);color:var(--text-3)">${cnt}</span>
            <div style="width:80px;height:5px;background:var(--bg-4);border-radius:3px;overflow:hidden"><div style="width:${pct}%;height:100%;background:var(--accent);border-radius:3px"></div></div>
          </div>`;
        }).join('')}
      </div>
      <div class="sett">
        <h3>🏷️ 카테고리별 분포</h3>
        ${Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([cat, cnt]) => {
          const c = CATS.find(x => x.name === cat);
          const clr = c ? c.color : '#94a3b8';
          return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:var(--fs-sm)">
            <div style="width:8px;height:8px;border-radius:3px;background:${clr}"></div>
            <span style="flex:1;color:var(--text-1)">${esc(cat)}</span>
            <span style="font-family:var(--mono);font-size:var(--fs-xs);color:var(--text-3)">${cnt}</span>
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
    ${hint('🔍', '<strong>검색 팁:</strong> 상단 검색창에 키워드를 입력하면 북마크 제목과 URL에서 동시에 검색합니다.')}
    <div class="toolbar">
      <div class="tl"><h2 style="font-size:var(--fs-lg);font-weight:600">⭐ 전체 북마크 (${filtered.length})</h2></div>
      <div class="tr">
        <button class="btn btn-p btn-sm" data-action="ai-classify">🤖 AI 자동 분류</button>
        <button class="btn btn-sm" data-action="domain-sort">🌐 도메인별 정렬</button>
        <button class="btn btn-sm" data-action="alpha-sort">🔤 가나다 정렬</button>
      </div>
    </div>
    ${folders.map(f => `
      <div class="wg">
        <div class="wg-head" data-action="toggle-section">
          <div class="wg-hl"><span style="font-size:14px">📂</span><span class="wg-title">${esc(f)}</span><span class="wg-meta">${filtered.filter(b => b.folder === f).length}개</span></div>
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
    ${!filtered.length ? emptyState('⭐', '북마크가 없습니다', q ? '검색어를 변경해 보세요.' : '웹 페이지를 북마크에 추가하면 여기에 나타납니다.') : ''}
  `;
}

// ── BOOKMARK CLEANUP ──
function renderBmClean(m) {
  const dupCount = S.bmDups.reduce((s, d) => s + d.length - 1, 0);
  const step1Done = !dupCount;
  const step2Done = !S.bmBroken.length;
  const step3Done = !S.bmEmpty.length;

  m.innerHTML = `
    ${heroCard('🧹', '북마크를 깨끗하게 정리하세요', '아래 3단계를 순서대로 실행하면 북마크가 최적화됩니다.',
      `<button class="btn-cta" data-action="run-full-clean">🚀 원클릭 전체 청소</button>`
    )}
    <div class="steps">
      <div class="step ${step1Done ? 'done' : 'active'}">
        <div class="step-num">${step1Done ? '✓' : '1'}</div>
        <div class="step-text">중복 제거 (${dupCount}개)</div>
      </div>
      <div class="step ${step1Done && !step2Done ? 'active' : ''} ${step2Done ? 'done' : ''}">
        <div class="step-num">${step2Done ? '✓' : '2'}</div>
        <div class="step-text">깨진 링크 (${S.bmBroken.length}개)</div>
      </div>
      <div class="step ${step1Done && step2Done && !step3Done ? 'active' : ''} ${step3Done ? 'done' : ''}">
        <div class="step-num">${step3Done ? '✓' : '3'}</div>
        <div class="step-text">빈 폴더 (${S.bmEmpty.length}개)</div>
      </div>
    </div>
    <div class="bm-dashboard" style="grid-template-columns:repeat(3,1fr)">
      <div class="bm-stat-card" style="border-left:3px solid var(--red)"><div class="num" style="color:var(--red)">${dupCount}</div><div class="label">중복 북마크</div><div class="sub">${S.bmDups.length}개 중복 그룹 감지</div></div>
      <div class="bm-stat-card" style="border-left:3px solid var(--orange)"><div class="num" style="color:var(--orange)">${S.bmBroken.length}</div><div class="label">깨진 링크</div><div class="sub">응답 없는 URL</div></div>
      <div class="bm-stat-card" style="border-left:3px solid var(--yellow)"><div class="num" style="color:var(--yellow)">${S.bmEmpty.length}</div><div class="label">빈 폴더</div><div class="sub">삭제 권장</div></div>
    </div>
    <!-- Duplicates -->
    <div class="bm-cleanup-list">
      <div class="bm-cl-head" data-action="toggle-section">
        <div style="display:flex;align-items:center;gap:8px"><span style="font-size:15px">🔄</span><span style="font-size:var(--fs-base);font-weight:600">중복 북마크 (${dupCount}개)</span></div>
        <button class="btn btn-sm btn-d" data-action="remove-dups">모두 제거</button>
      </div>
      <div class="bm-cl-body">
        ${S.bmDups.map(group => group.map((b, i) => `
          <div class="bm-dup-item">
            <div class="ti-fav">${faviconImg(b)}</div>
            <div style="flex:1;min-width:0"><div class="ti-title">${esc(b.title)}</div><div class="ti-url">${esc(b.url)}</div></div>
            <span class="dup-badge" style="background:${i === 0 ? 'var(--green-bg)' : 'var(--red-bg)'};color:${i === 0 ? 'var(--green)' : 'var(--red)'}">${i === 0 ? '유지' : '중복'}</span>
            ${i > 0 ? `<button class="ti-btn cls" data-action="delete-bm" data-bmid="${b.id}" title="삭제">✕</button>` : ''}
          </div>
        `).join('')).join('')}
        ${!S.bmDups.length ? '<div style="padding:24px;text-align:center;color:var(--text-3);font-size:var(--fs-base)">✅ 중복 북마크가 없습니다</div>' : ''}
      </div>
    </div>
    <!-- Broken links -->
    <div class="bm-cleanup-list">
      <div class="bm-cl-head" data-action="toggle-section">
        <div style="display:flex;align-items:center;gap:8px"><span style="font-size:15px">🔗</span><span style="font-size:var(--fs-base);font-weight:600">깨진 링크 (${S.bmBroken.length}개)</span></div>
        <button class="btn btn-sm btn-d" data-action="remove-broken">모두 제거</button>
      </div>
      <div class="bm-cl-body">
        ${S.bmBroken.map(b => `
          <div class="bm-dup-item">
            <div class="ti-fav">${faviconImg(b)}</div>
            <div style="flex:1;min-width:0"><div class="ti-title">${esc(b.title)}</div><div class="ti-url">${esc(b.url)}</div></div>
            <span class="dup-badge" style="background:var(--red-bg);color:var(--red)">깨짐</span>
            <button class="ti-btn" data-action="check-link" data-bmid="${b.id}" title="재검사">🔄</button>
            <button class="ti-btn cls" data-action="delete-bm" data-bmid="${b.id}" title="삭제">✕</button>
          </div>
        `).join('')}
        ${!S.bmBroken.length ? '<div style="padding:24px;text-align:center;color:var(--text-3);font-size:var(--fs-base)">✅ 깨진 링크가 없습니다</div>' : ''}
      </div>
    </div>
    <!-- AI classify section -->
    <div class="sett">
      <h3>🤖 AI 자동 분류</h3>
      <p style="font-size:var(--fs-base);color:var(--text-2);margin-bottom:14px;line-height:var(--lh-relaxed)">도메인과 키워드를 분석하여 북마크를 자동으로 카테고리별 폴더로 분류합니다.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
        ${CATS.map(c => `<span class="bm-tag" style="background:${c.color}15;color:${c.color}">${esc(c.name)}</span>`).join('')}
      </div>
      <button class="btn-cta" data-action="ai-classify" style="font-size:var(--fs-sm);padding:8px 16px;margin-bottom:18px">🤖 자동 분류 실행 (${S.bm.length}개 북마크)</button>

      <h4 style="margin-top:8px;margin-bottom:8px;font-size:var(--fs-base);color:var(--text-1)">📝 커스텀 카테고리 (선택사항)</h4>
      <p style="font-size:var(--fs-xs);color:var(--text-3);margin-bottom:8px;line-height:var(--lh-relaxed)">나만의 폴더 분류 규칙을 추가하세요. 커스텀 규칙이 기본 20개 카테고리보다 우선 적용됩니다.<br>형식: <code style="background:var(--bg-4);padding:2px 5px;border-radius:3px">폴더이름: 키워드1, 키워드2, 키워드3</code></p>
      <textarea id="customCatsInput" placeholder="예시:
📐 수학: math, algebra, calculus, geometry
🎯 마케팅: marketing, seo, analytics, ads
🏫 학원: academy, hagwon, 학원, 수업" style="width:100%;min-height:90px;background:var(--bg-3);border:1px solid var(--border-0);border-radius:var(--r-sm);padding:10px;color:var(--text-0);font-size:var(--fs-sm);font-family:var(--mono);resize:vertical;line-height:1.5"></textarea>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-sm btn-p" data-action="save-custom-cats">💾 저장</button>
        <button class="btn btn-sm" data-action="ai-classify">🤖 커스텀 규칙으로 분류</button>
      </div>
    </div>
  `;
}

// ── BOOKMARK CARD VIEW ──
function renderBmCards(m) {
  const q = S.query.toLowerCase();
  const filtered = q ? S.bm.filter(b => (b.title || '').toLowerCase().includes(q) || (b.url || '').toLowerCase().includes(q)) : S.bm;

  m.innerHTML = `
    ${hint('🃏', '<strong>카드 뷰:</strong> 북마크를 시각적으로 탐색할 수 있습니다. 카테고리 필터로 원하는 항목만 빠르게 찾으세요.')}
    <div class="toolbar">
      <div class="tl">
        <h2 style="font-size:var(--fs-lg);font-weight:600">🃏 카드 뷰</h2>
        <span style="font-size:var(--fs-sm);color:var(--text-3)">(${filtered.length}개)</span>
      </div>
      <div class="tr"><button class="btn btn-sm" data-action="alpha-sort">🔤 정렬</button></div>
    </div>
    <div class="cat-grid" style="margin-bottom:16px">
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
            <span class="bm-tag" style="background:${cat.color}15;color:${cat.color};font-size:var(--fs-xs)">${esc(cat.name)}</span>
          </div>
        </div>`;
      }).join('')}
    </div>
    ${!filtered.length ? emptyState('🃏', '북마크가 없습니다', q ? '검색어를 변경해 보세요.' : '웹 페이지를 북마크에 추가하면 카드로 표시됩니다.') : ''}
  `;
}

// ── HISTORY ──
function renderHistory(m) {
  const today = new Date().toDateString();
  m.innerHTML = `
    ${hint('🕐', '<strong>방문기록:</strong> 최근 방문한 사이트 목록입니다. 클릭하면 해당 페이지가 열립니다.')}
    <div class="toolbar">
      <div class="tl"><h2 style="font-size:var(--fs-lg);font-weight:600">🕐 방문기록</h2></div>
    </div>
    <div class="tl-wrap" style="border:1px solid var(--border-0);border-radius:var(--r)">
      ${S.hist.map(h => {
        const d = new Date(h.lastVisitTime || h.time || Date.now());
        const ts = d.toDateString() === today
          ? d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
          : d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
        return `<div class="ti" data-action="open-url" data-url="${esc(h.url)}">
          <div class="ti-fav">${faviconImg(h)}</div>
          <div class="ti-info"><div class="ti-title">${esc(h.title)}</div><div class="ti-url">${esc(h.url)}</div></div>
          <span style="font-size:var(--fs-xs);color:var(--text-3);font-family:var(--mono)">${ts}</span>
          ${h.visitCount ? `<span style="font-size:var(--fs-xs);color:var(--text-3);font-family:var(--mono)">×${h.visitCount}</span>` : ''}
          <div class="ti-acts">
            <button class="ti-btn" data-action="add-to-bm" data-url="${esc(h.url)}" data-title="${esc(h.title)}" title="북마크에 추가">⭐</button>
          </div>
        </div>`;
      }).join('')}
      ${!S.hist.length ? '<div style="padding:24px;text-align:center;color:var(--text-3);font-size:var(--fs-base)">방문기록이 없습니다</div>' : ''}
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
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  m.innerHTML = `
    <h2 style="font-size:var(--fs-lg);font-weight:600;margin-bottom:18px">⚙️ 설정</h2>
    <div class="sett"><h3>🎨 테마 설정</h3>
      <p style="font-size:var(--fs-base);color:var(--text-2);margin-bottom:12px;line-height:var(--lh-relaxed)">화면 배경색과 글자색을 변경할 수 있습니다.</p>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm ${currentTheme === 'light' ? 'btn-p' : ''}" data-action="set-theme" data-val="light">☀️ 라이트</button>
        <button class="btn btn-sm ${currentTheme === 'dark' ? 'btn-p' : ''}" data-action="set-theme" data-val="dark">🌙 다크</button>
        <button class="btn btn-sm ${currentTheme === 'system' ? 'btn-p' : ''}" data-action="set-theme" data-val="system">💻 시스템</button>
      </div>
    </div>
    <div class="sett"><h3>☁️ 동기화</h3>
      ${settRow('자동 동기화', '열린 윈도우와 탭을 자동으로 동기화', 'autoSync')}
      ${settRow('복구 시 Discard', '복구할 때 Discard 상태로 로드하여 성능 향상', 'discardOnRestore')}
      ${settRow('북마크 동기화', '북마크도 함께 동기화', 'syncBookmarks')}
    </div>
    <div class="sett"><h3>🤖 자동 분류</h3>
      ${settRow('탭 자동 그룹', '키워드 기반 자동 탭 분류', 'autoGroupTabs')}
      ${settRow('북마크 자동 정리', 'AI 기반 카테고리 자동 분류', 'autoClassifyBookmarks')}
      <div style="margin-top:10px;font-size:var(--fs-sm);color:var(--text-2)">분류 규칙:</div>
      ${CATS.map(c => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:var(--fs-sm)">
        <div style="width:8px;height:8px;border-radius:3px;background:${c.color}"></div>
        <span style="font-weight:500;width:55px">${esc(c.name)}</span>
        <span style="color:var(--text-3);font-family:var(--mono);font-size:var(--fs-xs)">${c.keywords.join(', ')}</span>
      </div>`).join('')}
    </div>
    <div class="sett"><h3>💤 메모리 관리</h3>
      ${settRow('자동 Discard', '비활성 탭을 자동으로 Discard하여 메모리 절약', 'autoDiscard')}
    </div>
    <div class="sett"><h3>📥 데이터 백업</h3>
      <p style="font-size:var(--fs-base);color:var(--text-2);margin-bottom:12px;line-height:var(--lh-relaxed)">북마크를 JSON 파일로 내보낼 수 있습니다. (복구는 크롬의 기본 북마크 관리자를 이용해주세요)</p>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm" data-action="export-json">📥 JSON 내보내기</button>
      </div>
    </div>
    <div class="sett"><h3>📖 튜토리얼</h3>
      <p style="font-size:var(--fs-base);color:var(--text-2);margin-bottom:12px;line-height:var(--lh-relaxed)">처음 사용법을 다시 확인하려면 튜토리얼을 재생하세요.</p>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm btn-p" data-action="replay-tutorial" data-val="ko">🇰🇷 한국어 가이드</button>
        <button class="btn btn-sm" data-action="replay-tutorial" data-val="en">🇺🇸 English Guide</button>
      </div>
    </div>
    <div class="sett"><h3>ℹ️ 정보</h3>
      <div style="font-size:var(--fs-base);color:var(--text-2);line-height:var(--lh-relaxed)">
        <strong>Moon-TabFlow</strong> v1.0<br>
        탭 매니저 + 북마크 매니저 통합 도구<br>
        <span style="color:var(--text-3)">중복 제거 · 깨진 링크 검사 · AI 자동 분류 · 동기화 · 드래그앤드롭</span>
      </div>
    </div>
  `;
}

// ── BOOKMARK ORGANIZER (Restore & Organize) ──
function renderOrganizer(m) {
  const isRestore = S.organizerTab === 'restore';
  const isOrganize = S.organizerTab === 'organize';
  const preview = S.restorePreview;
  const progress = S.restoreProgress;

  // Build tree view HTML for current bookmarks
  function renderTreeNode(node, depth = 0) {
    if (!node) return '';
    const indent = depth * 20;
    const isFolder = !!node.children;
    const isRoot = node.id === '0' || node.id === '1' || node.id === '2';
    const childCount = node.children ? node.children.length : 0;
    const isEmpty = isFolder && childCount === 0 && !isRoot;

    let html = '';
    if (depth > 0) {
      html += `<div class="tree-node ${isEmpty ? 'tree-empty' : ''}" style="padding-left:${indent}px">`;
      if (isFolder) {
        html += `<span class="tree-icon">${isEmpty ? '📂' : '📁'}</span>`;
        html += `<span class="tree-title" style="flex:1">${esc(node.title || '(이름 없음)')}</span>`;
        html += `<span class="tree-count">${childCount}</span>`;
        if (isEmpty) html += `<span class="badge" style="background:var(--yellow);color:#000;font-size:9px;padding:1px 5px;border-radius:4px;margin-left:4px">빈 폴더</span>`;
        if (!isRoot) {
          html += `<div class="tree-actions">`;
          html += `<button class="ti-btn" data-action="rename-folder" data-bmid="${node.id}" title="이름 변경">✏️</button>`;
          html += `<button class="ti-btn" data-action="sort-folder" data-bmid="${node.id}" title="내용 정렬">🔤</button>`;
          if (isFolder && childCount > 0) html += `<button class="ti-btn" data-action="flatten-folder" data-bmid="${node.id}" title="하위 폴더 평탄화">⬆️</button>`;
          if (isEmpty) html += `<button class="ti-btn cls" data-action="delete-empty-folder" data-bmid="${node.id}" title="삭제">✕</button>`;
          html += `</div>`;
        }
      } else {
        html += `<span class="tree-icon">🔗</span>`;
        html += `<span class="tree-title" style="flex:1;color:var(--text-2)">${esc(node.title || node.url || '')}</span>`;
      }
      html += `</div>`;
    }
    if (node.children && depth < 4) {
      html += node.children.map(c => renderTreeNode(c, depth + 1)).join('');
    } else if (node.children && depth >= 4 && childCount > 0) {
      html += `<div style="padding-left:${(depth + 1) * 20}px;color:var(--text-3);font-size:var(--fs-xs)">... ${childCount}개 더</div>`;
    }
    return html;
  }

  // Build preview tree for backup data
  function renderPreviewTree(nodes, depth = 0, maxItems = 100) {
    let html = '', count = 0;
    for (const node of nodes) {
      if (count >= maxItems) {
        html += `<div style="padding-left:${depth * 18}px;color:var(--text-3);font-size:var(--fs-xs);padding:4px 0">... ${nodes.length - count}개 더</div>`;
        break;
      }
      const indent = depth * 18;
      const isFolder = !!node.children;
      html += `<div style="display:flex;align-items:center;gap:6px;padding:3px 0 3px ${indent}px;font-size:var(--fs-sm);color:${isFolder ? 'var(--text-0)' : 'var(--text-2)'}">`;
      html += `<span style="font-size:12px">${isFolder ? '📁' : '🔗'}</span>`;
      html += `<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(node.title || '(이름 없음)')}</span>`;
      if (isFolder && node.children) html += `<span style="font-size:10px;color:var(--text-3);font-family:var(--mono)">${node.children.length}</span>`;
      html += `</div>`;
      count++;
      if (isFolder && node.children && depth < 3) {
        const sub = renderPreviewTree(node.children, depth + 1, maxItems - count);
        html += sub.html;
        count += sub.count;
      }
    }
    return { html, count };
  }

  // Get current tree stats
  const treeStats = S.bmTree.length ? getTreeStats(S.bmTree) : { urls: 0, folders: 0, maxDepth: 0 };
  const emptyFolders = S.bmTree.length ? findEmptyFolders(S.bmTree[0]?.children || []) : [];
  const deepFolders = S.bmTree.length ? findDeepNested(S.bmTree[0]?.children || [], 5) : [];

  m.innerHTML = `
    ${heroCard('📦', '북마크 복원 & 폴더 정리', '백업 JSON 파일에서 북마크를 복원하거나, 현재 폴더 구조를 시각적으로 정리할 수 있습니다.')}
    <div class="org-tabs" style="display:flex;gap:4px;margin-bottom:16px">
      <button class="chip ${isRestore ? 'active' : ''}" data-action="org-tab" data-val="restore">📥 백업 복원</button>
      <button class="chip ${isOrganize ? 'active' : ''}" data-action="org-tab" data-val="organize">🗂️ 폴더 정리</button>
    </div>

    ${isRestore ? `
      <div class="sett">
        <h3>📥 백업 파일 불러오기</h3>
        <p style="font-size:var(--fs-base);color:var(--text-2);margin-bottom:14px;line-height:var(--lh-relaxed)">
          TabFlow에서 내보낸 JSON 백업 파일을 선택하면 북마크가 복원됩니다.
        </p>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn-cta" data-action="load-backup-file" style="font-size:var(--fs-sm);padding:8px 16px">📂 백업 파일 선택</button>
          ${progress > 0 && progress < 100 ? `<span style="font-size:var(--fs-sm);color:var(--accent)">복원 중... ${progress}%</span>` : ''}
          ${progress >= 100 ? `<span style="font-size:var(--fs-sm);color:var(--green)">✅ 복원 완료!</span>` : ''}
        </div>
      </div>

      ${progress > 0 ? `
        <div class="sett">
          <h3>⏳ 복원 진행률</h3>
          <div class="health-bar" style="margin:8px 0"><div class="health-bar-fill" style="width:${progress}%;background:var(--accent);transition:width 0.3s"></div></div>
          <div style="font-size:var(--fs-sm);color:var(--text-2)">${progress}% 완료</div>
        </div>
      ` : ''}

      ${preview ? `
        <div class="sett">
          <h3>📋 백업 정보</h3>
          <div class="bm-dashboard" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
            <div class="bm-stat-card"><div class="num" style="color:var(--accent)">${preview.stats.urls}</div><div class="label">URL</div></div>
            <div class="bm-stat-card"><div class="num" style="color:var(--purple)">${preview.stats.folders}</div><div class="label">폴더</div></div>
            <div class="bm-stat-card"><div class="num" style="color:var(--green);font-size:14px">${preview.stats.version}</div><div class="label">버전</div></div>
            <div class="bm-stat-card"><div class="num" style="color:var(--text-1);font-size:11px">${new Date(preview.stats.exportedAt).toLocaleDateString('ko-KR')}</div><div class="label">내보내기 날짜</div></div>
          </div>
        </div>

        <div class="sett">
          <h3>🌳 폴더 구조 미리보기</h3>
          <div style="max-height:400px;overflow-y:auto;border:1px solid var(--border-0);border-radius:var(--r);padding:12px;background:var(--bg-1)">
            ${preview.bookmarks[0]?.children ? preview.bookmarks[0].children.map(root => {
              const result = renderPreviewTree(root.children || [], 0, 80);
              return `<div style="margin-bottom:8px">
                <div style="font-weight:600;font-size:var(--fs-base);padding:6px 0;border-bottom:1px solid var(--border-0);margin-bottom:6px">📂 ${esc(root.title)}</div>
                ${result.html}
              </div>`;
            }).join('') : '<div style="color:var(--text-3)">미리보기 데이터 없음</div>'}
          </div>
        </div>

        <div class="sett">
          <h3>🚀 복원 실행</h3>
          <p style="font-size:var(--fs-base);color:var(--text-2);margin-bottom:14px;line-height:var(--lh-relaxed)">
            복원 모드를 선택하고 실행하세요. <strong>클린 복원</strong>은 기존 북마크를 모두 삭제한 후 백업에서 복원합니다.
          </p>
          <div style="display:flex;gap:8px">
            <button class="btn-cta" data-action="confirm-restore" data-val="append" style="font-size:var(--fs-sm);padding:8px 16px">➕ 기존에 추가</button>
            <button class="btn btn-sm btn-d" data-action="confirm-restore" data-val="clean" style="font-size:var(--fs-sm);padding:8px 16px">🧹 클린 복원</button>
          </div>
          <div style="margin-top:8px;font-size:var(--fs-xs);color:var(--text-3)">⚠️ 클린 복원은 현재 모든 북마크를 삭제합니다. 먼저 백업을 만들어두세요!</div>
        </div>
      ` : `
        ${emptyState('📥', '백업 파일을 선택하세요', 'tabflow-backup-YYYY-MM-DD.json 형식의 파일을 업로드하면 미리보기와 복원을 진행할 수 있습니다.')}
      `}
    ` : ''}

    ${isOrganize ? `
      <div class="bm-dashboard" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
        <div class="bm-stat-card"><div class="num" style="color:var(--accent)">${treeStats.urls}</div><div class="label">전체 URL</div></div>
        <div class="bm-stat-card"><div class="num" style="color:var(--purple)">${treeStats.folders}</div><div class="label">전체 폴더</div></div>
        <div class="bm-stat-card"><div class="num" style="color:${emptyFolders.length ? 'var(--yellow)' : 'var(--green)'}">${emptyFolders.length}</div><div class="label">빈 폴더</div></div>
        <div class="bm-stat-card"><div class="num" style="color:${deepFolders.length ? 'var(--red)' : 'var(--green)'}">${deepFolders.length}</div><div class="label">깊은 폴더 (5+)</div></div>
      </div>

      ${quickActions([
        { icon: '🗑️', label: '빈 폴더 삭제', desc: emptyFolders.length + '개 감지', action: 'delete-all-empty-folders' },
        { icon: '🔄', label: '트리 새로고침', desc: '최신 상태로 갱신', action: 'refresh-tree' },
        { icon: '📥', label: 'JSON 백업', desc: '현재 상태 저장', action: 'export-json' },
      ])}

      <div class="sett">
        <h3>🌳 전체 북마크 트리</h3>
        <p style="font-size:var(--fs-sm);color:var(--text-2);margin-bottom:12px">폴더 옆 버튼으로 이름 변경, 정렬, 평탄화, 삭제를 할 수 있습니다.</p>
        <div style="max-height:600px;overflow-y:auto;border:1px solid var(--border-0);border-radius:var(--r);padding:12px;background:var(--bg-1)">
          ${S.bmTree.length ? S.bmTree[0].children.map(root =>
            `<div style="margin-bottom:12px">
              <div style="font-weight:600;font-size:var(--fs-base);padding:8px 0;border-bottom:1px solid var(--border-0);margin-bottom:4px">📂 ${esc(root.title)}</div>
              ${renderTreeNode(root)}
            </div>`
          ).join('') : '<div style="padding:24px;text-align:center;color:var(--text-3)">트리를 로드 중...</div>'}
        </div>
      </div>
    ` : ''}
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
