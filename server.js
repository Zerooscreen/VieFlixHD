const express = require('express');
const path = require('path');
const { tmdb, img, slugify } = require('./lib/tmdb');
const { head, layout, posterCard, genreRow, trailerBlock, castGrid, escapeHtml, movieJsonLd, tvJsonLd, sideBannerAd, nativeBannerAd, DEFAULT_TITLE, DEFAULT_DESC, SITE_NAME } = require('./lib/render');

const app = express();
const PORT = process.env.PORT || 3000;

// Ganti dengan URL Railway Anda
const SITE_URL = process.env.SITE_URL || 'https://vieflixhd.up.railway.app';

app.use(express.static(path.join(__dirname, 'public')));

const ROWS = {
  movie: [
    { key: '01', title: 'Phim thịnh hành', path: '/trending/movie/week' },
    { key: '02', title: 'Phim phổ biến', path: '/movie/popular' },
    { key: '03', title: 'Phim được đánh giá cao nhất', path: '/movie/top_rated' },
    { key: '04', title: 'Phim sắp chiếu', path: '/movie/upcoming' },
  ],
  tv: [
    { key: '01', title: 'Phim bộ thịnh hành', path: '/trending/tv/week' },
    { key: '02', title: 'Phim bộ phổ biến', path: '/tv/popular' },
    { key: '03', title: 'Phim bộ được đánh giá cao nhất', path: '/tv/top_rated' },
    { key: '04', title: 'Phim bộ đang chiếu', path: '/tv/on_the_air' },
  ],
};

function seoTitle(kind, title, year) {
  const label = kind === 'movie' ? 'Phim' : 'Phim Bộ';
  const y = year || 'chưa rõ năm';
  return `[${label}] ${title} (${y}) - Xem tại VieFlixHD`;
}

function seoDescription(title, year, genreNames) {
  const yearPart = year ? `năm ${year}, ` : '';
  const genrePart = genreNames ? `thể loại ${genreNames}, ` : '';
  return `Xem phim ${title} trên VieFlixHD. ${genrePart}${yearPart}Tốc độ cao, sub chuẩn, không quảng cáo!`;
}

async function renderHome(req, res, tab) {
  try {
    const heroData = await tmdb(tab === 'movie' ? '/trending/movie/week' : '/trending/tv/week');
    const hero = heroData.results[0];
    const heroTitle = hero ? (hero.title || hero.name) : 'VieFlixHD';
    const heroOverview = hero ? (hero.overview || '') : '';

    const rowsHtml = [];
    for (const def of ROWS[tab]) {
      const data = await tmdb(def.path);
      const cards = data.results.slice(0, 12).map(item => posterCard(item, tab)).join('');
      rowsHtml.push(`
        <section class="row">
          <div class="row-head"><span class="row-num">${def.key}</span><h2>${def.title}</h2></div>
          <div class="grid">${cards}</div>
        </section>
      `);
    }

    const heroHtml = hero ? `
      <div id="hero">
        <div class="hero-bg" style="background-image:url('${img(hero.backdrop_path, 'original')}')"></div>
        <div class="hero-fade"></div>
        <div class="hero-content">
          <div class="hero-eyebrow">Nổi bật trong tuần</div>
          <div class="hero-title">${escapeHtml(heroTitle)}</div>
          <div class="hero-overview">${escapeHtml(heroOverview).slice(0, 180)}${heroOverview.length > 180 ? '…' : ''}</div>
          <a class="hero-btn" href="/${tab}/${hero.id}/${encodeURIComponent(slugify(heroTitle))}?vi">Xem ngay ▸</a>
        </div>
      </div>` : '';

    const bodyHtml = heroHtml + `<div id="rows">${rowsHtml.join('')}</div>`;

    const headHtml = head({
      title: 'VieFlix - Trạm Cày Phim Online Vietsub & Thuyết Minh HD Chuẩn GenZ',
      description: 'Truy cập ngay VieFlixHD - Vũ trụ cày phim online vietsub, anime, phim chiếu rạp bom tấn mới nhất 2026 hoàn toàn miễn phí.',
      url: `${SITE_URL}/${tab}`,
      image: hero ? img(hero.backdrop_path, 'w780') : null,
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: tab }));
  } catch (e) {
    res.status(500).send(layout({
      headHtml: head({ title: 'VieFlixHD', description: 'Trạm cày phim online', url: `${SITE_URL}/${tab}` }),
      bodyHtml: `<div class="empty">Không thể tải dữ liệu. Vui lòng thử lại sau.</div>`,
      activeTab: tab,
    }));
  }
}

app.get('/', (req, res) => renderHome(req, res, 'movie'));
app.get('/movie', (req, res) => renderHome(req, res, 'movie'));
app.get('/tv', (req, res) => renderHome(req, res, 'tv'));

app.get('/movie/:id/:slug?', async (req, res) => {
  const { id } = req.params;
  try {
    const [data, credits, videos] = await Promise.all([tmdb(`/movie/${id}`), tmdb(`/movie/${id}/credits`), tmdb(`/movie/${id}/videos`)]);
    const correctSlug = slugify(data.title);
    if (req.params.slug !== correctSlug) return res.redirect(301, `/movie/${id}/${encodeURIComponent(correctSlug)}?vi`);

    const bodyHtml = `
      <a class="back-btn" href="/movie">← Quay lại</a>
      <div class="detail-hero">
        <div class="hero-bg" style="background-image:url('${img(data.backdrop_path, 'original')}')"></div>
        <div class="hero-fade"></div>
        <div class="detail-poster"><img src="${img(data.poster_path)}" alt="${escapeHtml(data.title)}"></div>
        <div class="detail-info">
          <div class="detail-eyebrow">Phim</div>
          <h1 class="detail-title">${escapeHtml(data.title)}</h1>
          <div class="detail-orig">${escapeHtml(data.original_title)} · ${(data.release_date || '').slice(0, 4)}</div>
          ${genreRow(data.genres)}
        </div>
      </div>
      <div class="section-block"><h3>Nội dung</h3><div class="bio-text">${escapeHtml(data.overview) || 'Chưa có thông tin.'}</div></div>
      ${nativeBannerAd()}
      <div class="section-block"><h3>Trailer</h3>${trailerBlock(videos)}</div>
      <div class="section-block"><h3>Diễn viên</h3>${castGrid(credits)}</div>
      ${sideBannerAd()}
      ${movieJsonLd(data, `${SITE_URL}/movie/${id}/${encodeURIComponent(correctSlug)}?vi`)}
    `;

    const headHtml = head({
      title: seoTitle('movie', data.title, (data.release_date || '').slice(0, 4)),
      description: seoDescription(data.title, (data.release_date || '').slice(0, 4), (data.genres || []).map(g => g.name).join(', ')),
      url: `${SITE_URL}/movie/${id}/${encodeURIComponent(correctSlug)}?vi`,
      image: img(data.backdrop_path || data.poster_path, 'w780'),
      type: 'video.movie',
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: 'movie' }));
  } catch (e) {
    res.status(404).send(layout({ headHtml: head({ title: 'Không tìm thấy' }), bodyHtml: '<div class="empty">Phim không tồn tại.</div>', activeTab: 'movie' }));
  }
});

app.get('/tv/:id/:slug?', async (req, res) => {
  const { id } = req.params;
  try {
    const [data, credits, videos] = await Promise.all([tmdb(`/tv/${id}`), tmdb(`/tv/${id}/credits`), tmdb(`/tv/${id}/videos`)]);
    const correctSlug = slugify(data.name);
    if (req.params.slug !== correctSlug) return res.redirect(301, `/tv/${id}/${encodeURIComponent(correctSlug)}?vi`);

    const seasons = (data.seasons || []).filter(s => s.season_number >= 0);
    const seasonsHtml = seasons.map(s => `
      <div class="season-item" data-season="${s.season_number}" data-tv="${id}">
        <div class="season-head">
          <img src="${img(s.poster_path, 'w92')}" alt="${escapeHtml(s.name)}">
          <div><div class="s-title">${escapeHtml(s.name)}</div><div class="s-meta">${s.episode_count} tập</div></div>
          <div class="chev">▶</div>
        </div>
        <div class="episode-panel"></div>
      </div>`).join('');

    const bodyHtml = `
      <a class="back-btn" href="/tv">← Quay lại</a>
      <div class="detail-hero">
        <div class="hero-bg" style="background-image:url('${img(data.backdrop_path, 'original')}')"></div>
        <div class="hero-fade"></div>
        <div class="detail-poster"><img src="${img(data.poster_path)}" alt="${escapeHtml(data.name)}"></div>
        <div class="detail-info">
          <div class="detail-eyebrow">Phim Bộ</div>
          <h1 class="detail-title">${escapeHtml(data.name)}</h1>
          ${genreRow(data.genres)}
        </div>
      </div>
      <div class="section-block"><h3>Nội dung</h3><div class="bio-text">${escapeHtml(data.overview) || 'Chưa có thông tin.'}</div></div>
      <div class="section-block"><h3>Trailer</h3>${trailerBlock(videos)}</div>
      <div class="section-block"><h3>Diễn viên</h3>${castGrid(credits)}</div>
      <div class="section-block"><h3>Mùa & Tập</h3><div class="season-list" id="season-list">${seasonsHtml}</div></div>
      ${tvJsonLd(data, `${SITE_URL}/tv/${id}/${encodeURIComponent(correctSlug)}?vi`)}
    `;

    const headHtml = head({
      title: seoTitle('tv', data.name, (data.first_air_date || '').slice(0, 4)),
      description: seoDescription(data.name, (data.first_air_date || '').slice(0, 4), (data.genres || []).map(g => g.name).join(', ')),
      url: `${SITE_URL}/tv/${id}/${encodeURIComponent(correctSlug)}?vi`,
      image: img(data.backdrop_path || data.poster_path, 'w780'),
      type: 'video.tv_show',
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: 'tv' }));
  } catch (e) {
    res.status(404).send(layout({ headHtml: head({ title: 'Không tìm thấy' }), bodyHtml: '<div class="empty">Phim không tồn tại.</div>', activeTab: 'tv' }));
  }
});

app.get('/api/search', async (req, res) => {
  const q = req.query.q || '';
  if (!q.trim()) return res.json({ results: [] });
  const data = await tmdb('/search/multi', { query: q });
  res.json({ results: data.results.filter(r => r.media_type === 'movie' || r.media_type === 'tv').slice(0, 8).map(r => ({
    id: r.id, type: r.media_type, title: r.title || r.name,
    year: (r.release_date || r.first_air_date || '').slice(0, 4),
    poster: img(r.poster_path, 'w92'), slug: slugify(r.title || r.name)
  }))});
});

app.get('/api/season/:tvId/:seasonNumber', async (req, res) => {
  const data = await tmdb(`/tv/${req.params.tvId}/season/${req.params.seasonNumber}`);
  res.json({ episodes: (data.episodes || []).map(ep => ({
    number: ep.episode_number, name: ep.name, rating: ep.vote_average ? ep.vote_average.toFixed(1) : '-',
    overview: ep.overview, still: img(ep.still_path, 'w300')
  }))});
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    const [mp, tp] = await Promise.all([tmdb('/movie/popular'), tmdb('/tv/popular')]);
    const today = new Date().toISOString().slice(0, 10);
    const urls = [...mp.results.map(m => `${SITE_URL}/movie/${m.id}/${encodeURIComponent(slugify(m.title))}?vi`),
                  ...tp.results.map(t => `${SITE_URL}/tv/${t.id}/${encodeURIComponent(slugify(t.name))}?vi`)];
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${u}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq></url>`).join('')}</urlset>`;
    res.type('application/xml').send(xml);
  } catch (e) { res.status(500).send(''); }
});

app.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`));

app.listen(PORT, () => console.log(`VieFlixHD đang chạy tại: http://localhost:${PORT}`));
