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
  // Organizer state
  bmTree: [],           // Full bookmark tree for organizer view
  restorePreview: null, // Parsed backup data for preview
  restoreProgress: 0,   // 0-100 restore progress
  organizerTab: 'restore', // 'restore' | 'organize'
};

export const CATS = [
  { name: '📚 교육', color: '#3b82f6', keywords: ['edu', 'learn', 'teach', 'school', 'lesson', 'course', 'academy', 'classroom', 'khan', 'edx', 'coursera', 'quiz', 'flashcard', 'tutor', 'student', 'literacy', 'reading', 'reader', 'readworks', 'readcentral', 'k12', 'engoo', 'lessonup', 'edsurge', 'edtech', 'edukids', 'eltngl', 'sporcle', 'testyourvocab', 'lxper', 'connectedu', 'brighthubeducation', 'readinggate', 'sharebookquiz'] },
  { name: '🤖 AI', color: '#a855f7', keywords: ['chatgpt', 'claude', 'anthropic', 'openai', 'gemini', 'notebooklm', 'perplexity', 'copilot', 'huggingface', 'hf.space', 'replicate', 'groq', 'mistral', 'cohere', 'together.ai', 'deepseek', 'qwen', 'fellou', 'skywork', 'supercraft', 'theresanaiforthat', 'aicofounder', 'aiprm', 'aitestkitchen', 'readdy.ai', 'to-teach.ai', 'smithery.ai', 'snackprompt', 'turboscribe'] },
  { name: '💻 개발', color: '#10b981', keywords: ['github', 'stackoverflow', 'npm', 'pypi', 'developer', 'mdn', 'w3schools', 'api', 'sdk', 'devtools', 'webpack', 'vite', 'typescript', 'python', 'javascript', 'rust', 'docker', 'kubernetes', 'git', 'code', 'hackernews', 'ycombinator', 'tiptap', 'tldraw', 'swagger', 'spacy', 'scipy', 'scikit', 'seaborn', 'streamlit', 'svgo', 'overleaf'] },
  { name: '🔬 연구', color: '#06b6d4', keywords: ['research', 'paper', 'scholar', 'arxiv', 'ssrn', 'sci-hub', 'semantic', 'plato.stanford', 'researchrabbit', 'scispace', 'wolfram', 'encyclopedia', 'wikipedia', 'openlibrary', 'studylib', 'studypool', 'gradesaver', 'sparknotes', 'litcharts', 'cgscholar'] },
  { name: '☁️ 클라우드', color: '#f59e0b', keywords: ['cloud.google', 'console.cloud', 'firebase', 'aws', 'azure', 'vercel', 'netlify', 'heroku', 'railway', 'supabase', 'neon', 'planetscale', 'cloudflare', 'ngrok', 'upstage', 'render', 'fly.io'] },
  { name: '🎨 디자인', color: '#f472b6', keywords: ['figma', 'canva', 'dribbble', 'behance', 'adobe', 'sketch', 'stitch', 'lottie', 'coolors', 'vecterize', 'waifu2x', 'vectorizer', 'milanote', 'stipop', 'shortbread', 'tlooto', 'evoto', 'vplate', 'wonderdynamics', 'artbasel'] },
  { name: '📝 생산성', color: '#22c55e', keywords: ['notion', 'obsidian', 'docs.google', 'calendar', 'raindrop', 'clickup', 'todoist', 'trello', 'asana', 'airtable', 'evernote', 'clockwise', 'mail', 'task-master', 'typeform', 'talltweets', 'summernote', 'send-anywhere', 'webwave'] },
  { name: '🎵 미디어', color: '#f97316', keywords: ['youtube', 'spotify', 'netflix', 'suno', 'udio', 'soundful', 'stableaudio', 'voicemod', 'speechma', 'wellsaidlabs', 'synthesys', 'storylineonline', 'storytel', 'storybee', 'tenor', 'music', 'audio', 'video', 'podcast', 'topview'] },
  { name: '💬 SNS', color: '#ec4899', keywords: ['twitter', 'x.com', 'reddit', 'linkedin', 'slack', 'discord', 'telegram', 'instagram', 'facebook', 'tiktok', 'threads', 'mastodon', 'medium', 'velog', 'blog', 'simonwillison', 'stratechery', 'substack'] },
  { name: '📰 뉴스', color: '#64748b', keywords: ['news', 'hacker', 'techcrunch', 'theverge', 'aitimes', 'edtechmagazine', 'newsnow', 'informationisbeautiful', 'slj.com', 'booktrust', 'unite.ai', 'thevisualizer'] },
  { name: '🛒 쇼핑', color: '#eab308', keywords: ['coupang', '11st', 'amazon', 'gmarket', 'shopping', 'kmong', 'udemy', 'gumroad', 'zazzle'] },
  { name: '📖 도서', color: '#8b5cf6', keywords: ['book', 'novel', 'library', 'lib', 'icanread', 'junieb', 'wimpy', 'rif.org', 'hbook', 'wish4book', 'openlibrary', 'z-lib', 'singlelogin', 'scribd', 'novelstudies', 'readcentral'] },
  { name: '🌐 번역/언어', color: '#14b8a6', keywords: ['translate', 'deepl', 'papago', 'dict', 'vocab', 'grammar', 'syntax', 'trancy', 'membean', 'wordtune', 'textify', 'urltotext', 'usetextify', 'skell', 'opensubtitles', 'testyourvocab', 'vocabularycartoons'] },
  { name: '🔐 특허/법률', color: '#78716c', keywords: ['patent', 'justia', 'kipris', 'wipo', 'copyright', 'openfontlicense', 'legal'] },
  { name: '🎮 인터랙티브', color: '#ef4444', keywords: ['game', 'play', 'quiz', 'spatial', 'immerse', 'plickers', 'tinkerplot', 'miro', 'quizalize', 'semantle', 'teachable'] },
  { name: '📊 데이터', color: '#0ea5e9', keywords: ['chart', 'graph', 'data', 'analytics', 'dashboard', 'excel', 'sheets', 'tableau', 'pdf', 'zamzar', 'offcloud', 'smmry'] },
  { name: '🖼️ 3D/VR', color: '#d946ef', keywords: ['3d', 'vr', 'ar', 'threejs', 'blender', 'unity', 'unreal', 'mesh', 'meshy', 'skybox', 'blockade', 'wonderunit', 'geacron'] },
  { name: '🔧 유틸리티', color: '#84cc16', keywords: ['tool', 'util', 'convert', 'compress', 'download', 'upload', 'spoo.me', 'smart-q', 'pdf.io', 'veluga', 'vizzy', 'suksuk', 'weights.gg'] },
  { name: '🇰🇷 한국', color: '#0891b2', keywords: ['.kr', 'naver', 'daum', 'kakao', 'skt', 'corespeed', 'newsac', 'hankyung', 'chosun', 'donga', 'mk.co'] },
  { name: '📦 기타', color: '#94a3b8', keywords: [] },
];

export { COLORS };
