// src/api/history.js — chrome.history API wrapper

export async function searchHistory(query = '', maxResults = 100) {
  return chrome.history.search({
    text: query,
    maxResults,
    startTime: Date.now() - 7 * 24 * 60 * 60 * 1000 // last 7 days
  });
}

export async function getVisits(url) {
  return chrome.history.getVisits({ url });
}

export async function deleteHistoryUrl(url) {
  return chrome.history.deleteUrl({ url });
}
