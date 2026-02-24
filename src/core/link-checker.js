// src/core/link-checker.js — Broken link checker with batch processing

export async function checkLink(url, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return { url, status: res.ok ? 'ok' : 'broken', code: res.status };
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') {
      return { url, status: 'timeout', code: 0 };
    }
    return { url, status: 'broken', code: 0 };
  }
}

// Batch check with rate limiting (3 concurrent requests)
export async function checkAllLinks(bookmarks, onProgress) {
  const results = [];
  const batchSize = 3;
  const delay = 200;

  for (let i = 0; i < bookmarks.length; i += batchSize) {
    const batch = bookmarks.slice(i, i + batchSize);
    const checked = await Promise.all(
      batch.map(bm => checkLink(bm.url))
    );
    results.push(...checked);
    onProgress?.({
      done: results.length,
      total: bookmarks.length,
      percent: Math.round((results.length / bookmarks.length) * 100),
    });
    if (i + batchSize < bookmarks.length) {
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return results;
}
