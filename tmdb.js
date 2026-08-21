const API = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY || '513182919ede525d4b5c8292e15b3c06';
const IMG = 'https://image.tmdb.org/t/p/';

async function tmdb(path, params = {}) {
  const url = new URL(API + path);
  url.searchParams.set('api_key', API_KEY);
  url.searchParams.set('language', 'vi-VN'); // <-- tiếng Việt
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error('TMDB request failed: ' + res.status);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function img(path, size = 'w500') {
  return path ? IMG + size + path : 'https://placehold.co/342x513/17171b/8d8a92?text=No+Image';
}

// Slug từ tiêu đề (giữ chữ cái/số, bỏ ký hiệu).
// QUAN TRỌNG: KHÔNG encode ở đây -> chỉ dùng encodeURIComponent khi tạo href/redirect,
// để luôn khớp với req.params.slug (đã được Express tự động decode).
function slugify(title = '') {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'title';
}

module.exports = { tmdb, img, slugify, API_KEY };
