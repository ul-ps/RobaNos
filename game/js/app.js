/* ========================================================
   app.js — Main Site Logic | RobaNos (v2)
======================================================== */

// ===== GAME DATA — Loaded exclusively from Firebase =====
let GAMES_DATA = [];

const CATEGORY_COLORS = {
  'أكشن': 'hsl(0,60%,14%) , hsl(350,50%,10%)',
  'مغامرات': 'hsl(200,60%,12%), hsl(180,50%,8%)',
  'رياضة': 'hsl(120,50%,10%), hsl(150,45%,8%)',
  'RPG': 'hsl(270,60%,12%), hsl(290,50%,8%)',
  'إستراتيجية': 'hsl(30,60%,12%), hsl(40,50%,8%)',
  'هدوء': 'hsl(180,40%,12%), hsl(200,30%,8%)',
  'تعليمية': 'hsl(210,60%,12%), hsl(230,50%,8%)'
};

let activeCategory = 'all';

/* ============================================================
   INIT
============================================================ */
window.addEventListener('firebaseDataReady', () => {
  // Load games exclusively from Firebase (gv_extra_games synced by firebase-sync.js)
  try {
    const firebaseGames = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
    // Filter out standalone videos (items with type field)
    GAMES_DATA = firebaseGames.filter(g => !g.type);
    // Sort: Newest first (Descending by ID)
    GAMES_DATA.sort((a, b) => (parseFloat(b.id) || 0) - (parseFloat(a.id) || 0));
  } catch (e) {
    console.error('Failed to load games from Firebase', e);
    GAMES_DATA = [];
  }

  initCanvas();
  initUserExperience();
  renderFeatured();
  renderGames(GAMES_DATA);
  renderHeroShowcase();
  renderHomepageVideos();
  updateCount(GAMES_DATA.length);
  animateHeroStats();
});

/* ============================================================
   HERO SHOWCASE (DYNAMIC)
============================================================ */
function renderHeroShowcase() {
  const card = document.getElementById('hero-main-card');
  if (!card) return;

  const showcaseWrapper = card.closest('.hero-showcase');
  if (!GAMES_DATA || !GAMES_DATA.length) {
    if (showcaseWrapper) showcaseWrapper.style.display = 'none';
    return;
  }
  if (showcaseWrapper) showcaseWrapper.style.display = 'block'; // Restore if previously hidden

  // Find the top game by downloads
  const topGame = [...GAMES_DATA].sort((a, b) => (parseInt(b.downloads) || 0) - (parseInt(a.downloads) || 0))[0];
  if (!topGame) return;

  const cover = document.getElementById('hero-cover');
  const name = document.getElementById('hero-name');

  if (cover) {
    if (topGame.imageUrl) {
      cover.style.background = `url('${topGame.imageUrl}') center/cover no-repeat`;
      cover.innerHTML = '';
    } else {
      const colors = CATEGORY_COLORS[topGame.category] || 'hsl(260,50%,12%), hsl(280,40%,9%)';
      cover.style.background = `linear-gradient(135deg, ${colors})`;
      cover.innerHTML = topGame.emoji ? topGame.emoji : '<i class="fas fa-gamepad" style="color:rgba(255,255,255,0.2); font-size:3rem;"></i>';
      cover.style.fontSize = '80px';
      cover.style.display = 'flex';
      cover.style.alignItems = 'center';
      cover.style.justifyContent = 'center';
    }
  }

  if (name) name.textContent = topGame.name;

  const metaSpans = card.querySelectorAll('.showcase-meta span');
  if (metaSpans.length >= 2) {
    metaSpans[0].innerHTML = `<i class="fas fa-star" style="color:#fbbf24"></i> ${getGameRating(topGame)}`;
    metaSpans[1].innerHTML = `<i class="fas fa-download"></i> ${Number(topGame.downloads || 0).toLocaleString('en-US')}`;
  }

  const btn = card.querySelector('.showcase-btn');
  if (btn) {
    btn.onclick = () => window.location.href = `game.html?id=${topGame.id}`;
  }
}

/* ============================================================
   PERSONALIZED USER EXPERIENCE
============================================================ */
function initUserExperience() {
  const userJson = localStorage.getItem('gv_session');
  if (!userJson) return;

  const user = JSON.parse(userJson);
  const guestHero = document.querySelector('.hero');
  const userHero = document.getElementById('user-hero');
  const whySection = document.getElementById('why-section');

  if (guestHero && userHero) {
    guestHero.style.display = 'none';
    if (whySection) whySection.style.display = 'none';
    userHero.style.display = 'flex';

    // Update Welcome Title
    const welcomeTitle = document.getElementById('uh-welcome-title');
    if (welcomeTitle) welcomeTitle.textContent = `أهلاً بعودتك، ${user.name}! ✨`;

    // Role display
    const approvedGames = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
    const hasApprovedGames = approvedGames.some(g => g.submittedBy === (user.userName || user.name));
    const roleEl = document.getElementById('uh-role-text');

    if (roleEl) {
      if (user.role === 'admin') roleEl.textContent = 'مدير المنصة';
      else if (hasApprovedGames) roleEl.textContent = 'مطور معتمد';
      else roleEl.textContent = 'عضو مجتمع';
    }

    // Stats calculation
    const userApprovedCount = approvedGames.filter(g => g.submittedBy === user.name).length;

    const submissions = JSON.parse(localStorage.getItem('gv_submissions') || '[]');
    const userPendingCount = submissions.filter(s => s.submitter === user.name && s.status === 'pending').length;

    document.getElementById('uh-stat-approved').textContent = userApprovedCount;
    document.getElementById('uh-stat-pending').textContent = userPendingCount;
  }
}

/* ============================================================
   CANVAS BACKGROUND — Floating Particles
============================================================ */
function initCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 50; i++) {
    particles.push({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.15,
    });
  }

  function draw() {
    // Optimization: Stop the loop if Visual FX are disabled globally
    if (document.documentElement.classList.contains('gv-no-fx')) {
      ctx.clearRect(0, 0, W, H);
      requestAnimationFrame(draw); // Keep loop alive but idle
      return; 
    }

    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(168,85,247,${p.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ============================================================
   HERO STAT COUNTER
============================================================ */
function animateHeroStats() {
  document.querySelectorAll('.hero-stat-value[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const duration = 1800;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = Math.floor(eased * target);

      if (suffix === 'M+') {
        el.textContent = (val / 1000000).toFixed(1) + 'M+';
      } else if (suffix === '%') {
        el.textContent = val + '%';
      } else {
        el.textContent = val.toLocaleString('ar-EG') + '+';
      }
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* ============================================================
   FEATURED SECTION — 3 col grid (main + 2 side)
============================================================ */
function renderFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;

  // GAMES_DATA is already from Firebase — use it directly
  const featured = [...GAMES_DATA]
    .sort((a, b) => (getGameDownloads(b) || b.downloads || 0) - (getGameDownloads(a) || a.downloads || 0))
    .slice(0, 10);

  if (featured.length === 0) {
    grid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)"><i class="fas fa-gamepad" style="font-size:2rem;margin-bottom:10px;opacity:0.3"></i><br>لا توجد ألعاب بعد</div>`;
    return;
  }

  grid.innerHTML = featured.map((g, i) => {
    const colors = CATEGORY_COLORS[g.category] || 'hsl(260,50%,12%), hsl(280,40%,9%)';
    const rank = i + 1;
    const currentRating = getGameRating(g);
    
    // Graphical Medal Mapping
    let medalIcon = '<i class="fas fa-award"></i>';
    if (rank === 1) medalIcon = '<i class="fas fa-crown"></i>';
    if (rank === 2) medalIcon = '<i class="fas fa-shield-halved"></i>';
    if (rank === 3) medalIcon = '<i class="fas fa-star"></i>';

    return `
      <div class="featured-card rank-${rank}" onclick="window.location.href='game.html?id=${g.id}'">
        <div class="featured-card-bg">
          <div class="featured-card-img" style="${g.imageUrl ? `background-image:url('${g.imageUrl}');` : `background:linear-gradient(135deg,${colors})`}"></div>
          <div class="featured-card-bg-emoji">${getCategoryIcon(g.category, g.emoji)}</div>
          <div class="featured-card-shine"></div>
        </div>
        
        <!-- Prestige Side-Glow Strip -->
        <div class="prestige-glow-strip"></div>

        <!-- Graphical Pro Medal -->
        <div class="featured-pro-medal">${medalIcon}</div>

        <div class="featured-info-minimal">
          <div style="margin-top:auto">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
              <span style="color:var(--primary-light); font-size:0.9rem; opacity:0.9;">${getCategoryIcon(g.category, g.emoji)}</span>
              <span style="color:var(--primary-light); font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; opacity:0.9;">${g.category}</span>
            </div>
            <div style="font-size: 1.35rem; font-weight:900; color:#fff; line-height:1.2; margin-bottom:10px; text-shadow:0 2px 15px rgba(0,0,0,0.8);">${g.name}</div>
            
            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:5px;">
              <div style="display:flex; align-items:center; gap:12px; font-size:0.9rem; color:rgba(255,255,255,0.9); font-weight:600;">
                 <span style="display:flex; align-items:center; gap:5px;"><i class="fas fa-star" style="color:#fbbf24;"></i> ${currentRating}</span>
                 <span style="display:flex; align-items:center; gap:5px;"><i class="fas fa-download"></i> ${formatNumber(g.downloads)}</span>
              </div>
              <div class="game-play-btn" style="width:38px; height:38px; border-radius:12px; background:rgba(255,255,255,0.1); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:1.1rem; transition:0.3s; transform:none; opacity:1; position:static;">
                <i class="${getBranding().logo} site-brand-icon"></i>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');

  initFeaturedCarousel();
}

function initFeaturedCarousel() {
  const grid = document.getElementById('featured-grid');
  const prevBtn = document.getElementById('featured-prev');
  const nextBtn = document.getElementById('featured-next');
  const dotsContainer = document.getElementById('featured-dots');

  if (!grid || !prevBtn || !nextBtn || !dotsContainer) return;

  const cards = grid.querySelectorAll('.featured-card');
  if (cards.length === 0) return;

  const getScrollAmount = () => cards[0].offsetWidth + 20;

  nextBtn.addEventListener('click', () => {
    grid.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
  });

  prevBtn.addEventListener('click', () => {
    grid.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
  });

  const totalCards = cards.length;
  dotsContainer.innerHTML = '';

  const numDots = Math.ceil(totalCards / 3);
  for (let i = 0; i < numDots; i++) {
    const dot = document.createElement('div');
    dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => {
      const targetIndex = Math.min(i * 3, totalCards - 1);
      cards[targetIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
    dotsContainer.appendChild(dot);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const index = Array.from(cards).indexOf(entry.target);
        const dotIndex = Math.floor(index / 3);
        const dots = dotsContainer.querySelectorAll('.carousel-dot');
        if (dots[dotIndex]) {
          dots.forEach(d => d.classList.remove('active'));
          dots[dotIndex].classList.add('active');
        }
      }
    });
  }, { root: grid, threshold: 0.6 });

  cards.forEach(c => observer.observe(c));
}

/* ============================================================
   GAMES GRID (with Pagination)
============================================================ */
const GAMES_PER_PAGE = 24;
let currentPage = 1;
let currentGamesPool = [];

function renderGames(games, page) {
  currentGamesPool = games;
  currentPage = page || 1;
  const grid = document.getElementById('games-grid');
  if (!grid) return;

  if (games.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">🔍</div>
        <p>لا توجد ألعاب تطابق بحثك</p>
      </div>`;
    renderPagination(0, 1);
    return;
  }

  const totalPages = Math.ceil(games.length / GAMES_PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * GAMES_PER_PAGE;
  const pageGames = games.slice(start, start + GAMES_PER_PAGE);

  grid.innerHTML = pageGames.map((g, i) => {
    const colors = CATEGORY_COLORS[g.category] || 'hsl(260,50%,12%), hsl(280,40%,9%)';
    const currentRating = getGameRating(g);
    const stars = renderStars(currentRating);
    return `
      <div class="game-card" style="animation-delay:${i * 0.05}s" onclick="window.location.href='game.html?id=${g.id}'">
        <div class="game-cover">
          <div class="game-cover-emoji" style="${g.imageUrl ? `background:url('${g.imageUrl}') center/cover no-repeat;color:transparent;text-shadow:none;` : `background:linear-gradient(135deg,${colors})`}">${getCategoryIcon(g.category, g.emoji)}</div>
          <div class="game-cover-shine"></div>
          ${(() => {
        const b = getGameBadge(g, GAMES_DATA);
        return b ? `<span class="game-badge badge-${b}">${badgeLabel(b)}</span>` : '';
      })()}
          <div class="game-cover-overlay">
            <div class="game-play-btn"><i class="fas fa-dragon"></i></div>
          </div>
        </div>
        <div class="game-info" style="display:flex; flex-direction:column; flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <div>
              <div class="game-category" style="margin-bottom:4px;">${g.category}</div>
              ${g.status === 'featured' ? '<span style="display:inline-block;color:var(--primary-light);font-size:0.65rem;font-weight:800;background:rgba(124,58,237,0.15);padding:2px 8px;border-radius:6px;border:1px solid rgba(124,58,237,0.2);"><i class="fas fa-gem" style="margin-left:3px"></i>اختيارنا</span>' : ''}
            </div>
            <div style="background:rgba(251,191,36,0.12); border:1px solid rgba(251,191,36,0.25); border-radius:8px; padding:4px 8px; display:flex; align-items:center; gap:4px; box-shadow:0 0 10px rgba(251,191,36,0.1);">
              <span style="color:#fbbf24; font-weight:800; font-size:0.85rem; line-height:1;">${currentRating}</span>
              <i class="fas fa-star" style="color:#fbbf24; font-size:0.75rem;"></i>
            </div>
          </div>
          
          <div class="game-name" style="margin-bottom:6px;">${g.name}</div>
          ${g.company ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:12px; display:flex; align-items:center;"><i class="fas fa-building" style="margin-left:6px; color:var(--primary-light); opacity:0.8;"></i>${g.company}</div>` : ''}
          
          <div style="margin-top:auto; padding-top:12px;">
            ${g.submittedBy ? `
            <div style="display:flex; align-items:center; gap:10px; padding:6px 10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:14px; width:100%; transition:all 0.3s; cursor:pointer;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
              <div style="width:28px; height:28px; border-radius:50%; background:linear-gradient(135deg, var(--primary), var(--accent)); display:flex; align-items:center; justify-content:center; color:white; font-size:0.75rem; box-shadow:0 4px 10px rgba(124,58,237,0.3); flex-shrink:0;"><i class="fas fa-user-astronaut"></i></div>
              <div style="line-height:1.3; overflow:hidden;">
                <div style="font-size:0.65rem; color:var(--text-dim); margin-bottom:2px;">رُفعت بواسطة</div>
                <div style="font-size:0.8rem; font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${g.submittedBy}</div>
              </div>
            </div>` : `
            <div style="display:flex; align-items:center; gap:10px; padding:6px 10px; background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.1); border-radius:14px; width:100%;">
              <div class="verified-badge verified-green" style="font-size:1.1rem; flex-shrink:0;"><i class="fas fa-check"></i></div>
              <div style="line-height:1.3; overflow:hidden;">
                <div style="font-size:0.65rem; color:var(--text-dim); margin-bottom:2px;">الناشر</div>
                <div style="font-size:0.8rem; font-weight:700; color:#10b981; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">رسمي</div>
              </div>
            </div>`}
          </div>
        </div>
        <div class="game-footer" style="justify-content: space-between; padding-top:12px; border-top: 1px solid rgba(255, 255, 255, 0.05); background: transparent;">
          <div class="download-count" id="game-download-count-${g.id}" data-base="${g.downloads}"><i class="fas fa-arrow-down" style="margin-left:4px; color:var(--primary-light)"></i>${formatNumber(getGameDownloads(g))}</div>
          <div style="font-size:0.75rem; color:var(--text-dim); display:flex; align-items:center; gap:4px; font-weight:600;"><i class="fas fa-hdd"></i>${g.size}</div>
        </div>
      </div>`;
  }).join('');

  renderPagination(games.length, totalPages);
}

function renderPagination(totalGames, totalPages) {
  const bar = document.getElementById('pagination-bar');
  if (!bar) return;

  if (totalPages <= 1) {
    bar.style.display = 'none';
    bar.innerHTML = '';
    return;
  }

  bar.style.display = 'flex';

  const btnStyle = `
    display:inline-flex; align-items:center; justify-content:center;
    min-width:38px; height:38px; padding:0 10px;
    border-radius:10px; border:1px solid var(--border);
    background:rgba(255,255,255,0.04); color:var(--text-muted);
    font-family:'Exo 2',sans-serif; font-size:0.88rem; font-weight:600;
    cursor:pointer; transition:all 0.2s; backdrop-filter:blur(6px);
  `;
  const activeBtnStyle = `
    display:inline-flex; align-items:center; justify-content:center;
    min-width:38px; height:38px; padding:0 10px;
    border-radius:10px; border:1px solid var(--primary-light);
    background:rgba(124,58,237,0.2); color:#fff;
    font-family:'Exo 2',sans-serif; font-size:0.88rem; font-weight:700;
    cursor:pointer; transition:all 0.2s; box-shadow:0 0 12px rgba(124,58,237,0.25);
  `;

  let html = '';

  // Prev button
  html += `<button style="${btnStyle}${currentPage === 1 ? 'opacity:0.4;cursor:not-allowed;' : ''}" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
    <i class="fas fa-chevron-right"></i>
  </button>`;

  // Page numbers (show max 7 with ellipsis)
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  pages.forEach(p => {
    if (p === '...') {
      html += `<span style="color:var(--text-dim);padding:0 4px;">...</span>`;
    } else {
      html += `<button style="${p === currentPage ? activeBtnStyle : btnStyle}" onclick="goToPage(${p})">${p}</button>`;
    }
  });

  // Next button
  html += `<button style="${btnStyle}${currentPage === totalPages ? 'opacity:0.4;cursor:not-allowed;' : ''}" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
    <i class="fas fa-chevron-left"></i>
  </button>`;

  bar.innerHTML = html;
}

function goToPage(page) {
  const totalPages = Math.ceil(currentGamesPool.length / GAMES_PER_PAGE);
  if (page < 1 || page > totalPages) return;
  renderGames(currentGamesPool, page);
  // Scroll to top of games section
  document.getElementById('games-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ============================================================
   FILTER & SEARCH
============================================================ */
function filterGames(cat, el) {
  activeCategory = cat;
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');

  const title = document.getElementById('section-games-title');
  if (title) title.textContent = cat === 'all' ? 'كل الألعاب' : `ألعاب ${cat}`;

  const query = document.getElementById('main-search')?.value?.toLowerCase() || '';
  applyFilters(cat, query);
}

function handleSearch(val) {
  applyFilters(activeCategory, val.toLowerCase().trim());
}

function applyFilters(cat, query) {
  const filtered = GAMES_DATA.filter(g => {
    const matchCat = cat === 'all' || g.category === cat;
    const matchQ = !query || g.name.toLowerCase().includes(query) || g.category.includes(query);
    return matchCat && matchQ;
  });
  renderGames(filtered, 1); // Reset to page 1 on filter change
  updateCount(filtered.length);
}

function updateCount(n) {
  const el = document.getElementById('game-count');
  if (el) el.textContent = `${n} لعبة`;
}

/* ============================================================
   MODAL
============================================================ */
function openModal(id) {
  const g = GAMES_DATA.find(x => x.id === id);
  if (!g) return;

  const currentRating = getGameRating(g);
  const colors = CATEGORY_COLORS[g.category] || 'hsl(260,50%,12%), hsl(280,40%,9%)';
  const modalEmoji = document.getElementById('modal-emoji');
  const modalBadge = document.getElementById('modal-badge');

  if (g.imageUrl) {
    modalEmoji.style.background = `url('${g.imageUrl}') center/cover no-repeat`;
    modalEmoji.style.color = 'transparent';
    modalEmoji.style.textShadow = 'none';
  } else {
    modalEmoji.style.background = `linear-gradient(135deg, ${colors})`;
    modalEmoji.style.color = 'white';
    modalEmoji.style.textShadow = '';
  }

  modalEmoji.innerHTML = getCategoryIcon(g.category, g.emoji);
  document.getElementById('modal-title').textContent = g.name;
  document.getElementById('modal-cat').textContent = g.category;
  document.getElementById('modal-size').textContent = g.size;
  document.getElementById('modal-rating').innerHTML = `<span style="color:#fbbf24"><i class="fas fa-star"></i></span> ${currentRating}/5`;
  document.getElementById('modal-downloads').innerHTML = `<span id="game-download-count-modal-${g.id}" data-base="${g.downloads}">${formatNumber(getGameDownloads(g))}</span> تحميل`;

  if (g.badge || getGameBadge(g, GAMES_DATA)) {
    const b = getGameBadge(g, GAMES_DATA);
    modalBadge.textContent = badgeLabel(b);
    modalBadge.className = `game-badge badge-${b}`;
    modalBadge.style.display = 'inline-block';
  } else {
    modalBadge.style.display = 'none';
  }

  const descEl = document.getElementById('modal-desc');
  if (descEl) {
    descEl.innerHTML = g.desc;
    if (g.submittedBy) {
      descEl.innerHTML += `
      <div style="margin-top:20px;padding:12px 16px;background:rgba(255,255,255,0.03);border-radius:12px;display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:1rem">${g.submitterAvatar || g.submittedBy.charAt(0)}</div>
        <div>
          <div style="font-size:0.75rem;color:var(--text-muted)">تم الرفع والمشاركة بواسطة</div>
          <div style="font-size:0.95rem;font-weight:700;color:var(--text-main)">${g.submittedBy}</div>
        </div>
      </div>`;
    }
  }

  // Stars
  const starsEl = document.getElementById('modal-stars');
  if (starsEl) starsEl.innerHTML = renderStars(currentRating) + `<span style="margin-right:6px;color:var(--text-muted);font-size:0.88rem">(${currentRating}/5)</span>`;

  // Cover box
  const coverBox = document.getElementById('modal-cover-box');
  if (coverBox) {
    const colors = CATEGORY_COLORS[g.category] || 'hsl(260,50%,12%), hsl(280,40%,9%)';
    coverBox.style.background = `linear-gradient(135deg, ${colors})`;
    coverBox.innerHTML = getCategoryIcon(g.category, g.emoji);
  }

  document.getElementById('game-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('game-modal').classList.remove('active');
  document.body.style.overflow = '';
}

function handleDownload(e) {
  e.preventDefault();
  closeModal();
  showToast('🎮 جاري التحميل... شكراً لاختيارك RobaNos!', 'success');
}

document.getElementById('game-modal')?.addEventListener('click', e => {
  if (e.target === document.getElementById('game-modal')) closeModal();
});

/* ============================================================
   HELPERS
============================================================ */
function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let html = '';
  for (let i = 0; i < full; i++) html += '<i class="fas fa-star"></i>';
  if (half) html += '<i class="fas fa-star-half-alt"></i>';
  return html;
}



/* ============================================================
   TOAST
============================================================ */
/* ============================================================
   BOTTOM NAV
============================================================ */
function bottomNav(el) {
  document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
  if (el && !el.href?.includes('dashboard')) el.classList.add('active');
}

function toggleMobileSearch() {
  const overlay = document.getElementById('mobile-search-overlay');
  const isOpen = overlay.classList.toggle('active');
  if (isOpen) {
    setTimeout(() => document.getElementById('mobile-search-input')?.focus(), 300);
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

/* ============================================================
   LATEST VIDEOS (HOMEPAGE)
============================================================ */
function renderHomepageVideos() {
  const container = document.getElementById('homepage-videos-grid');
  const section = document.getElementById('latest-videos-section');
  if (!container || !section) return;

  // Use GAMES_DATA (from Firebase) and add extra videos
  let allGames = [...GAMES_DATA];

  try {
    // Add official videos from gv_extra_videos (Firebase-synced)
    const extraVideos = JSON.parse(localStorage.getItem('gv_extra_videos') || '[]');
    const officialExtra = extraVideos.filter(v => v.type === 'official');
    allGames = [...allGames, ...officialExtra];
  } catch (e) { }

  const videoGames = allGames.filter(g => g.videoUrl && g.videoUrl.trim() !== '' && (g.type === 'official' || g.category === 'official-channel' || g.submittedBy?.includes('Official')));

  // Sort: Newest first (Descending by ID)
  videoGames.sort((a, b) => (parseFloat(b.id) || 0) - (parseFloat(a.id) || 0));

  if (videoGames.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  // Show latest 8 videos for slider
  const latest = videoGames.slice(0, 8);

  container.innerHTML = latest.map((g, index) => {
    const thumb = getThumbUrl(g);
    const displayCat = g.category === 'official-channel' ? 'القناة الرسمية' : (g.category || 'عام');
    return `
      <div class="video-card" onclick="window.location.href='watch.html?id=${g.id}'">
        <div class="video-thumb-container">
          <div class="video-thumb" style="background-image:url('${thumb}')"></div>
          <div class="play-overlay">
            <div class="play-btn"><i class="fas fa-play"></i></div>
          </div>
        </div>
        <div class="video-info">
          <div class="v-cat">${displayCat}</div>
          <div class="v-title-text">${g.name}</div>
          <div class="v-footer">
            <span><i class="far fa-user"></i> ${g.submittedBy || 'فريق الموقع'}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  initVideoCarousel();
}

function initVideoCarousel() {
  const grid = document.getElementById('homepage-videos-grid');
  const prevBtn = document.getElementById('videos-prev');
  const nextBtn = document.getElementById('videos-next');
  const dotsContainer = document.getElementById('videos-dots');

  if (!grid || !prevBtn || !nextBtn || !dotsContainer) return;

  const cards = grid.querySelectorAll('.video-card');
  if (cards.length === 0) return;

  const getScrollAmount = () => cards[0].offsetWidth + 20;

  nextBtn.addEventListener('click', () => {
    grid.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
  });

  prevBtn.addEventListener('click', () => {
    grid.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
  });

  // Dots logic
  const totalCards = cards.length;
  dotsContainer.innerHTML = '';
  const numDots = Math.ceil(totalCards / 2);
  for (let i = 0; i < numDots; i++) {
    const dot = document.createElement('div');
    dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => {
      const targetIndex = Math.min(i * 2, totalCards - 1);
      cards[targetIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    });
    dotsContainer.appendChild(dot);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const index = Array.from(cards).indexOf(entry.target);
        const dotIndex = Math.floor(index / 2);
        const dots = dotsContainer.querySelectorAll('.carousel-dot');
        if (dots[dotIndex]) {
          dots.forEach(d => d.classList.remove('active'));
          dots[dotIndex].classList.add('active');
        }
      }
    });
  }, { root: grid, threshold: 0.6 });

  cards.forEach(c => observer.observe(c));
}

function getThumbUrl(g) {
  if (!g.videoUrl) return g.imageUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop';
  const ytMatch = g.videoUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  if (ytMatch && ytMatch[1]) return `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
  return g.imageUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop';
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✅', info: 'ℹ️', error: '❌' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'all 0.35s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-100%)';
    setTimeout(() => toast.remove(), 380);
  }, 3500);
}
