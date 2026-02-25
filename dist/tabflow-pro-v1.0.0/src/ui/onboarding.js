// src/ui/onboarding.js — Animated tutorial with Korean/English i18n

const STEPS = {
  ko: [
    {
      icon: '⚡',
      title: 'Moon-TabFlow에 오신 것을 환영합니다!',
      desc: '탭과 북마크를 <strong>한 곳에서</strong> 관리하세요.\n사이드 패널에서 모든 기능을 사용할 수 있습니다.',
      features: [
        { icon: '📋', label: '탭 매니저', sub: '모든 윈도우의 탭을 한눈에 보고 관리' },
        { icon: '⭐', label: '북마크 매니저', sub: '분류 · 청소 · 백업을 원클릭으로' },
        { icon: '🎨', label: '테마 시스템', sub: '라이트 / 다크 / 시스템 모드 지원' },
        { icon: '⌨️', label: '단축키', sub: 'Ctrl+Shift+K 검색 · Ctrl+Shift+D Discard' },
      ],
    },
    {
      icon: '📋',
      title: '탭을 스마트하게 관리하세요',
      desc: '열린 탭을 한 화면에서 보고, <strong>정리·그룹핑·메모리 절약</strong>까지.',
      features: [
        { icon: '💤', label: '비활성 Discard', sub: '사용하지 않는 탭의 메모리를 즉시 해제' },
        { icon: '🔄', label: '중복 닫기', sub: '같은 URL의 중복 탭을 자동 감지 & 정리' },
        { icon: '📁', label: '자동 그룹', sub: '키워드 기반 AI가 개발·SNS·쇼핑 등으로 자동 분류' },
        { icon: '🖱️', label: '드래그앤드롭', sub: '탭을 끌어서 순서를 변경하거나 다른 윈도우로 이동' },
      ],
    },
    {
      icon: '⭐',
      title: '북마크를 깨끗하게 유지하세요',
      desc: '<strong>대시보드</strong>에서 건강도를 확인하고, <strong>3단계 청소</strong>를 실행하세요.',
      features: [
        { icon: '📊', label: '건강도 대시보드', sub: '중복·깨진링크·분류 상태를 한눈에 파악' },
        { icon: '🧹', label: '3단계 청소', sub: '① 중복 제거 → ② 깨진 링크 → ③ 빈 폴더 정리' },
        { icon: '🤖', label: 'AI 자동 분류', sub: '9개 카테고리로 북마크를 자동 정리' },
        { icon: '📥', label: 'JSON 백업', sub: '북마크를 JSON으로 내보내고 복구 가능' },
      ],
    },
    {
      icon: '🚀',
      title: '시작할 준비가 되었습니다!',
      desc: '왼쪽 사이드바에서 원하는 메뉴를 선택하세요.\n언제든지 <strong>설정 → 튜토리얼 다시 보기</strong>에서 이 가이드를 다시 볼 수 있습니다.',
      features: [
        { icon: '📋', label: '전체 탭', sub: '모든 윈도우의 탭 관리' },
        { icon: '📊', label: '대시보드', sub: '북마크 건강도 분석' },
        { icon: '🧹', label: '청소 도구', sub: '중복·깨진링크 자동 정리' },
        { icon: '⚙️', label: '설정', sub: '테마 · 자동 분류 · 백업' },
      ],
    },
  ],
  en: [
    {
      icon: '⚡',
      title: 'Welcome to Moon-TabFlow!',
      desc: 'Manage your tabs and bookmarks <strong>all in one place</strong>.\nEverything runs in Chrome\'s side panel.',
      features: [
        { icon: '📋', label: 'Tab Manager', sub: 'View and manage all tabs across windows' },
        { icon: '⭐', label: 'Bookmark Manager', sub: 'Classify, clean, and backup in one click' },
        { icon: '🎨', label: 'Theme System', sub: 'Light / Dark / System mode support' },
        { icon: '⌨️', label: 'Shortcuts', sub: 'Ctrl+Shift+K Search · Ctrl+Shift+D Discard' },
      ],
    },
    {
      icon: '📋',
      title: 'Manage Tabs Smarter',
      desc: 'See all open tabs in one view. <strong>Organize, group, and save memory</strong> instantly.',
      features: [
        { icon: '💤', label: 'Discard Inactive', sub: 'Free memory from unused tabs instantly' },
        { icon: '🔄', label: 'Close Duplicates', sub: 'Auto-detect and close same-URL tabs' },
        { icon: '📁', label: 'Auto Group', sub: 'AI sorts tabs by keyword: Dev, SNS, Shopping…' },
        { icon: '🖱️', label: 'Drag & Drop', sub: 'Reorder tabs or move between windows' },
      ],
    },
    {
      icon: '⭐',
      title: 'Keep Bookmarks Clean',
      desc: 'Check health on the <strong>Dashboard</strong> and run the <strong>3-step cleanup</strong>.',
      features: [
        { icon: '📊', label: 'Health Dashboard', sub: 'See duplicates, broken links, and status at a glance' },
        { icon: '🧹', label: '3-Step Cleanup', sub: '① Remove dupes → ② Fix broken → ③ Clean folders' },
        { icon: '🤖', label: 'AI Classify', sub: 'Auto-sort bookmarks into 9 smart categories' },
        { icon: '📥', label: 'JSON Backup', sub: 'Export and restore bookmarks anytime' },
      ],
    },
    {
      icon: '🚀',
      title: 'You\'re All Set!',
      desc: 'Pick a menu from the left sidebar to get started.\nYou can revisit this guide anytime from <strong>Settings → Replay Tutorial</strong>.',
      features: [
        { icon: '📋', label: 'All Tabs', sub: 'Manage tabs across all windows' },
        { icon: '📊', label: 'Dashboard', sub: 'Bookmark health analysis' },
        { icon: '🧹', label: 'Cleanup', sub: 'Auto-fix duplicates & broken links' },
        { icon: '⚙️', label: 'Settings', sub: 'Theme · Auto-classify · Backup' },
      ],
    },
  ],
};

const BTN_TEXT = {
  ko: { next: '다음', prev: '이전', start: '시작하기!', skip: '건너뛰기', step: '단계' },
  en: { next: 'Next', prev: 'Back', start: 'Get Started!', skip: 'Skip', step: 'Step' },
};

let currentStep = 0;
let currentLang = 'ko';
let overlayEl = null;

function buildCard() {
  const steps = STEPS[currentLang];
  const s = steps[currentStep];
  const btn = BTN_TEXT[currentLang];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  return `
    <div class="ob-card">
      <button class="ob-skip" data-ob="skip">${btn.skip}</button>
      <div class="ob-lang">
        <button class="${currentLang === 'ko' ? 'active' : ''}" data-ob="lang" data-val="ko">한국어</button>
        <button class="${currentLang === 'en' ? 'active' : ''}" data-ob="lang" data-val="en">EN</button>
      </div>
      <div class="ob-icon-area">
        <div class="ob-dot"></div><div class="ob-dot"></div><div class="ob-dot"></div>
        <div class="ob-emoji">${s.icon}</div>
      </div>
      <div class="ob-content">
        <div class="ob-step-counter">${btn.step} ${currentStep + 1} / ${steps.length}</div>
        <div class="ob-title">${s.title}</div>
        <div class="ob-desc">${s.desc.replace(/\n/g, '<br>')}</div>
        <div class="ob-features">
          ${s.features.map(f => `
            <div class="ob-feat">
              <div class="ob-feat-icon">${f.icon}</div>
              <div class="ob-feat-text">
                <div class="ob-feat-label">${f.label}</div>
                <div class="ob-feat-sub">${f.sub}</div>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="ob-progress">
          ${steps.map((_, i) => `<div class="ob-pip ${i === currentStep ? 'active' : i < currentStep ? 'done' : ''}"></div>`).join('')}
        </div>
      </div>
      <div class="ob-actions">
        ${!isFirst ? `<button class="ob-btn" data-ob="prev">${btn.prev}</button>` : ''}
        <button class="ob-btn ob-btn-p" data-ob="${isLast ? 'done' : 'next'}">${isLast ? btn.start : btn.next}</button>
      </div>
    </div>
  `;
}

function renderStep() {
  if (!overlayEl) return;
  overlayEl.innerHTML = buildCard();
}

function handleClick(e) {
  const t = e.target.closest('[data-ob]');
  if (!t) return;
  const action = t.dataset.ob;
  const val = t.dataset.val;

  switch (action) {
    case 'next':
      currentStep = Math.min(currentStep + 1, STEPS[currentLang].length - 1);
      renderStep();
      break;
    case 'prev':
      currentStep = Math.max(currentStep - 1, 0);
      renderStep();
      break;
    case 'done':
    case 'skip':
      closeOnboarding();
      break;
    case 'lang':
      currentLang = val;
      renderStep();
      break;
  }
}

function handleKeydown(e) {
  if (!overlayEl) return;
  if (e.key === 'ArrowRight' || e.key === 'Enter') {
    if (currentStep < STEPS[currentLang].length - 1) {
      currentStep++;
      renderStep();
    } else {
      closeOnboarding();
    }
  }
  if (e.key === 'ArrowLeft' && currentStep > 0) {
    currentStep--;
    renderStep();
  }
  if (e.key === 'Escape') closeOnboarding();
}

function closeOnboarding() {
  if (!overlayEl) return;
  overlayEl.classList.add('closing');
  setTimeout(() => {
    overlayEl.removeEventListener('click', handleClick);
    document.removeEventListener('keydown', handleKeydown);
    overlayEl.remove();
    overlayEl = null;
  }, 250);
  // Mark as completed
  try { chrome.storage.local.set({ onboardingDone: true }); } catch {}
}

export function showOnboarding(lang = 'ko') {
  if (overlayEl) return; // already showing
  currentStep = 0;
  currentLang = lang;
  overlayEl = document.createElement('div');
  overlayEl.className = 'ob-overlay';
  overlayEl.innerHTML = buildCard();
  document.body.appendChild(overlayEl);
  overlayEl.addEventListener('click', handleClick);
  document.addEventListener('keydown', handleKeydown);
}

export async function maybeShowOnboarding() {
  try {
    const result = await chrome.storage.local.get('onboardingDone');
    if (!result.onboardingDone) {
      // Detect browser language
      const lang = navigator.language?.startsWith('ko') ? 'ko' : 'en';
      // Small delay so UI loads first
      setTimeout(() => showOnboarding(lang), 600);
    }
  } catch {
    // Not in extension context (dev/testing) — show anyway
    setTimeout(() => showOnboarding('ko'), 600);
  }
}
