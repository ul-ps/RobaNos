let GAMES_DATA = [];


window.addEventListener('firebaseDataReady', () => {
  // 1. Get user name from URL parameters
  const params = new URLSearchParams(window.location.search);
  const userName = params.get('user');

  if (!userName) {
    document.getElementById('user-profile-header').innerHTML = `<div style="text-align:center;padding:50px;color:var(--text-muted)">لم يتم العثور على المستخدم!</div>`;
    return;
  }

  // 2. Filter games submitted by this user
  // Combine GAMES_DATA and approved gv_extra_games just like in home page
  const extraGames = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
  const filteredExtra = extraGames.filter(g => !g.type);
  const user = JSON.parse(localStorage.getItem('gv_session') || '{}');
  const simulatedViews = JSON.parse(localStorage.getItem('gv_simulated_views') || '{}');
  
  const gamesWithViews = GAMES_DATA.map(g => ({
    ...g,
    views: simulatedViews[g.id] || g.views || 0
  }));
  const allGames = [...gamesWithViews, ...filteredExtra];
  const userGames = allGames.filter(g => g.submittedBy === userName);

  // 3. Find User details for social links
  const allUsers = (typeof getUsers === 'function') ? getUsers() : JSON.parse(localStorage.getItem('gv_users') || '[]');
  const targetUser = allUsers.find(u => u.name === userName);

  // 3. Render Profile Header
  renderProfileHeader(userName, userGames.length, userGames, targetUser);

  // 4. Render User's Games
  renderUserGamesGrid(userGames, allGames);
});

function renderProfileHeader(name, count, games, userObj) {
  const avatarLetter = name.charAt(0).toUpperCase();
  // Get unique categories uploaded by the user
  const categories = [...new Set(games.map(g => g.category))].slice(0, 3).join('، ');

  document.getElementById('profile-avatar').innerHTML = '<i class="fas fa-user-astronaut"></i>';
  document.getElementById('profile-name').textContent = name;
  document.getElementById('profile-count').textContent = `${count} لعبة مرفوعة`;
  
  if (categories) {
    document.getElementById('profile-tags').innerHTML = `
      <span class="user-tag"><i class="fas fa-gamepad"></i> مهتم بـ: ${categories}</span>
      <span class="user-tag"><i class="fas fa-check-circle" style="color:var(--primary-light)"></i> مساهم معتمد</span>
    `;
  }
  
  // Update stats
  const totalDownloads = games.reduce((sum, g) => sum + getGameDownloads(g), 0);
  const avgRating = games.length > 0 ? (games.reduce((sum, g) => sum + (Number(g.rating) || 0), 0) / games.length).toFixed(1) : '0.0';
  
  const elDownloads = document.getElementById('stat-downloads');
  const elRating = document.getElementById('stat-rating');
  
  if (elDownloads) elDownloads.textContent = formatNumber(totalDownloads);
  if (elRating) elRating.textContent = avgRating + ' / 5';

  if (userObj && userObj.social) {
    renderSocialLinks(userObj.social);
  } else {
    // Check if it's the admin
    if (name === 'المشرف') {
       renderSocialLinks({ facebook: '#', twitter: '#', youtube: '#' }); // dummy for admin
    }
  }
}

function renderSocialLinks(links) {
  const container = document.getElementById('pf-social-links');
  if (!container) return;
  
  let html = '';
  const platforms = [
    { key: 'facebook',  icon: 'fab fa-facebook',  color: '#1877f2' },
    { key: 'twitter',   icon: 'fab fa-twitter',   color: '#1da1f2' },
    { key: 'instagram', icon: 'fab fa-instagram', color: '#e1306c' },
    { key: 'youtube',   icon: 'fab fa-youtube',   color: '#ff0000' },
    { key: 'discord',   icon: 'fab fa-discord',   color: '#5865f2' }
  ];

  platforms.forEach(p => {
    const url = links[p.key];
    if (url && url.length > 5) {
      html += `
        <a href="${url}" target="_blank" style="
          width:38px; height:38px; border-radius:12px;
          background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1);
          display:flex; align-items:center; justify-content:center;
          color:${p.color}; transition:0.3s; font-size:1.2rem;
        " onmouseover="this.style.background='rgba(255,255,255,0.08)';this.style.transform='translateY(-3px)'" onmouseout="this.style.background='rgba(255,255,255,0.04)';this.style.transform='translateY(0)'">
          <i class="${p.icon}"></i>
        </a>
      `;
    }
  });
  
  container.innerHTML = html;
}

function renderUserGamesGrid(games, allGamesData) {
  const grid = document.getElementById('user-games-grid');
  if (!grid) return;

  if (games.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: rgba(255,255,255,0.02); border-radius: 20px; border: 1px bordered rgba(255,255,255,0.05);">
        <div style="font-size: 3rem; margin-bottom: 15px;">🎮</div>
        <h3 style="color: var(--text-main); margin-bottom: 5px;">لا توجد ألعاب</h3>
        <p style="color: var(--text-muted)">هذا المستخدم لم يقم برفع أي ألعاب بعد.</p>
      </div>`;
    return;
  }

  grid.innerHTML = games.map((g, i) => {
    const colors = CATEGORY_COLORS[g.category] || 'hsl(260,50%,12%), hsl(280,40%,9%)';
    return `
      <div class="game-card" style="animation-delay:${i * 0.1}s" onclick="window.location.href='game.html?id=${g.id}'">
        <div class="game-cover">
          <div class="game-cover-emoji" style="${g.imageUrl ? `background:url('${g.imageUrl}') center/cover no-repeat;color:transparent;` : `background:linear-gradient(135deg,${colors})`}">${getCategoryIcon(g.category, g.emoji)}</div>
          <div class="game-cover-shine"></div>
          ${(() => {
            const b = getGameBadge(g, allGamesData);
            return b ? `<span class="game-badge badge-${b}">${badgeLabel(b)}</span>` : '';
          })()}
          <div class="game-cover-overlay">
            <div class="game-play-btn"><i class="fas fa-download"></i></div>
          </div>
        </div>
        <div class="game-info">
          <div class="game-category">${g.category}</div>
          <div class="game-name">${g.name}</div>
          <div class="game-stars">${renderStars(g.rating)}<span>${g.rating}</span></div>
          <div class="game-meta">
            <span><i class="fas fa-hdd" style="margin-left:3px"></i>${g.size}</span>
            <span style="color:var(--primary-light);font-weight:600">${g.status === 'featured' ? '⭐ مميز' : ''}</span>
          </div>
        </div>
        <div class="game-footer">
          <div class="download-count" id="game-download-count-${g.id}" data-base="${g.downloads}"><i class="fas fa-download"></i>${formatNumber(getGameDownloads(g))}</div>
          <button class="btn-download" onclick="event.stopPropagation(); window.location.href='game.html?id=${g.id}'">
            <i class="fas fa-download"></i> عرض
          </button>
        </div>
      </div>`;
  }).join('');
}

// Helpers

const CATEGORY_COLORS = {
  'أكشن': '#dc2626, #991b1b',
  'مغامرات': '#d97706, #92400e',
  'رياضة': '#16a34a, #166534',
  'RPG': '#7c3aed, #5b21b6',
  'إستراتيجية': '#2563eb, #1e40af',
  'هدوء': '#059669, #065f46' // fixed green tones
};

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let html = '';
  for (let i = 0; i < full; i++) html += '<i class="fas fa-star"></i>';
  if (half) html += '<i class="fas fa-star-half-alt"></i>';
  return html;
}

