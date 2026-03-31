console.log('🚀 GameVault Dashboard JS [v2.1-ARMOURED] Initializing...');
window.onerror = function (msg, url, lineNo, columnNo, error) {
  console.error('❌ GLOBAL ERROR:', msg, 'at', lineNo + ':' + columnNo);
  if (typeof showToast === 'function') showToast('⚠️ خطأ برمج: ' + msg, 'error');
  return false;
};

// Global Click Monitor for Debugging
document.addEventListener('mousedown', (e) => {
  const btn = e.target.closest('.action-btn');
  if (btn) {
    console.log('🖱️ [DEBUG] Click captured on:', btn.className, 'Action:', btn.getAttribute('onclick'));
  }
});

/* ========================================================
   TOAST NOTIFICATION SYSTEM (Dashboard)
======================================================== */
if (typeof window.showToast !== 'function') {
  window.showToast = function(msg, type = 'success') {
    // Create container if missing
    let container = document.getElementById('gv-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'gv-toast-container';
      container.style.cssText = `
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        z-index: 999999; display: flex; flex-direction: column; gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const colors = {
      success: { bg: 'rgba(16,185,129,0.95)', icon: '✅' },
      error:   { bg: 'rgba(239,68,68,0.95)',  icon: '❌' },
      info:    { bg: 'rgba(59,130,246,0.95)', icon: 'ℹ️' },
      warning: { bg: 'rgba(245,158,11,0.95)', icon: '⚠️' },
    };
    const c = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: ${c.bg};
      color: #fff;
      padding: 14px 24px;
      border-radius: 14px;
      font-family: 'Exo 2', 'Segoe UI', sans-serif;
      font-size: 0.95rem;
      font-weight: 700;
      box-shadow: 0 8px 30px rgba(0,0,0,0.4);
      backdrop-filter: blur(10px);
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1);
      pointer-events: all;
      display: flex;
      align-items: center;
      gap: 10px;
      direction: rtl;
      white-space: nowrap;
    `;
    toast.innerHTML = `<span>${c.icon}</span><span>${msg}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  };
}


window.showCustomConfirm = function({ title, message, icon, confirmText, type, onConfirm }) {
  const overlay = document.getElementById('gv-custom-confirm-overlay');
  const titleEl = document.getElementById('gv-confirm-title');
  const msgEl = document.getElementById('gv-confirm-msg');
  const iconEl = document.getElementById('gv-confirm-icon');
  const yesBtn = document.getElementById('gv-confirm-yes');

  if (!overlay) {
    console.error('❌ Confirm Overlay NOT found in DOM!');
    return;
  }

  titleEl.textContent = title || 'تأكيد الإجراء';
  msgEl.textContent = message || 'هل أنت متأكد؟';
  yesBtn.textContent = confirmText || 'نعم، متأكد';
  
  if (type === 'danger') {
    iconEl.innerHTML = `<i class="fas ${icon || 'fa-trash-alt'}"></i>`;
    iconEl.style.background = 'rgba(239, 68, 68, 0.1)';
    iconEl.style.color = '#ef4444';
    iconEl.style.border = '1px solid rgba(239, 68, 68, 0.2)';
    yesBtn.style.background = '#ef4444';
  } else {
    iconEl.innerHTML = `<i class="fas ${icon || 'fa-info-circle'}"></i>`;
    iconEl.style.background = 'rgba(124, 58, 237, 0.1)';
    iconEl.style.color = 'var(--primary-light)';
    iconEl.style.border = '1px solid rgba(124, 58, 237, 0.2)';
    yesBtn.style.background = 'var(--primary)';
  }

  yesBtn.onclick = () => {
    closeCustomConfirm();
    if (typeof onConfirm === 'function') onConfirm();
  };

  overlay.style.display = 'flex';
  overlay.style.setProperty('display', 'flex', 'important');
  overlay.style.zIndex = '2147483647';
  
  setTimeout(() => {
    overlay.style.opacity = '1';
    overlay.style.visibility = 'visible';
    overlay.querySelector('.gv-confirm-card').style.transform = 'translateY(0) scale(1)';
  }, 10);
};

window.closeCustomConfirm = function() {
  const overlay = document.getElementById('gv-custom-confirm-overlay');
  if (!overlay) return;
  overlay.style.opacity = '0';
  overlay.style.visibility = 'hidden';
  overlay.querySelector('.gv-confirm-card').style.transform = 'translateY(20px) scale(0.95)';
  setTimeout(() => { overlay.style.display = 'none'; }, 300);
};

/* ========================================================
   dashboard.js — Admin Dashboard Logic | GameVault
 ======================================================== */

// ===== SHARED GAME DATA (synced with app.js) =====
let gamesData = [];
let editingId = null;

// SYNC: Load extra games and tracked downloads from localStorage
const extra = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
const trackedDL = JSON.parse(localStorage.getItem('gv_download_counts') || '{}');

// Filter out standalone videos
const approvedGames = extra.filter(g => !g.type);

// Merge base + extra AND apply tracked downloads
gamesData = [...gamesData, ...approvedGames].map(g => {
  const extraDL = trackedDL[g.id] || 0;
  return { ...g, downloads: (g.downloads || 0) + extraDL };
});

// Sort by ID desc
gamesData.sort((a, b) => (parseFloat(b.id) || 0) - (parseFloat(a.id) || 0));

// ===== INIT =====
window.addEventListener('firebaseDataReady', () => {
  loadSettings();
  updateStats();
  initNotifications();
  renderChart();
  renderTopGames();
  renderRecentTable();
  renderGamesTable();
  renderCategoriesPage();
  renderDownloadsPage();
  renderReportsPage();
  renderReviewsPage();
  renderUserReportsPage();
  renderInboxPage();
  renderUsersPage();
});

// ===== PAGE NAVIGATION =====
function showPage(name, el) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Show selected
  document.getElementById('page-' + name)?.classList.add('active');
  // Update sidebar
  document.querySelectorAll('.g-nav-link').forEach(l => l.classList.remove('active'));
  if (el) el.classList.add('active');
  // Update topbar title
  const titles = {
    dashboard: 'الإحصائيات',
    games: 'إدارة الألعاب',
    categories: 'الفئات',
    downloads: 'التحميلات',
    reports: 'التحليلات',
    'user-reports': 'بلاغات المستخدمين',
    settings: 'الإعدادات',
    reviews: 'طلبات المراجعة',
    inbox: 'البريد الوارد',
    users: 'إدارة المستخدمين'
  };
  document.getElementById('page-title').textContent = titles[name] || name;

  if (name === 'user-reports') renderUserReportsPage();
  if (name === 'users') renderUsersPage();
  if (name === 'downloads') renderDownloadsPage();
  if (name === 'reports') renderReportsPage();
  if (name === 'categories') renderCategoriesPage();
}

// ===== UPDATE STATS =====
function updateStats() {
  const totalDownloads = gamesData.reduce((a, g) => a + g.downloads, 0);
  const cats = new Set(gamesData.map(g => g.category)).size;

  animateCount('total-games-stat', gamesData.length);
  animateCount('total-downloads-stat', totalDownloads, true);
  animateCount('total-cats-stat', cats);

  // Update Users count (Sync with Firestore users collection)
  if (typeof db !== 'undefined') {
    db.collection("users").get().then(snapshot => {
      animateCount('total-users-stat', snapshot.size);
      const badge = document.getElementById('nav-badge-users');
      if (badge) {
        badge.textContent = snapshot.size;
        badge.style.display = snapshot.size > 0 ? 'flex' : 'none';
      }
    });
  }

  // Update reviews badge
  const subs = JSON.parse(localStorage.getItem('gv_submissions') || '[]');
  const pendingCount = subs.filter(s => s.status === 'pending').length;
  const badge = document.getElementById('nav-badge-reviews');
  if (badge) {
    badge.textContent = pendingCount;
    badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }

  // Update reports badge
  const reports = JSON.parse(localStorage.getItem('gv_reports') || '[]');
  const pendingReports = reports.filter(r => r.status === 'pending').length;
  const reportsBadge = document.getElementById('nav-badge-reports');
  if (reportsBadge) {
    reportsBadge.textContent = pendingReports;
    reportsBadge.style.display = pendingReports > 0 ? 'inline-block' : 'none';
  }

  // Update inbox badge
  const inbox = JSON.parse(localStorage.getItem('gv_inbox') || '[]');
  const unreadCount = inbox.filter(m => m.status === 'unread').length;
  const inboxBadge = document.getElementById('nav-badge-inbox');
  if (inboxBadge) {
    inboxBadge.textContent = unreadCount;
    inboxBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
  }
}

function animateCount(id, target, abbreviated = false) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 1200;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(easedProgress * target);
    el.textContent = abbreviated ? formatNumber(current) : current.toLocaleString('ar-EG');
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = abbreviated ? formatNumber(target) : target.toLocaleString('ar-EG');
  };
  requestAnimationFrame(step);
}

// ===== CHART =====
function renderChart() {
  const container = document.getElementById('downloads-chart');
  if (!container) return;

  // Read real per-day download history from localStorage
  const history = JSON.parse(localStorage.getItem('gv_download_history') || '{}');

  // Build last 7 days labels + dates
  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const labels = [];
  const values = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    labels.push(dayNames[d.getDay()]);
    values.push(history[key] || 0);
  }

  const max = Math.max(...values, 1); // avoid 0-max

  container.innerHTML = labels.map((d, i) => `
    <div class="chart-bar-group">
      <div class="chart-bar" style="height:${(values[i] / max) * 100}%;min-height:${values[i] > 0 ? 8 : 2}px" title="${d}: ${values[i].toLocaleString('ar-EG')} تحميل"></div>
      <div class="chart-label">${d.slice(0, 3)}</div>
    </div>
  `).join('');

  // Animate bars in
  setTimeout(() => {
    container.querySelectorAll('.chart-bar').forEach((bar, i) => {
      const originalHeight = bar.style.height;
      bar.style.height = '0%';
      setTimeout(() => {
        bar.style.transition = `height 0.8s cubic-bezier(0.4,0,0.2,1) ${i * 0.08}s`;
        bar.style.height = originalHeight;
      }, 100);
    });
  }, 200);
}

// ===== TOP GAMES =====
function renderTopGames() {
  const el = document.getElementById('top-games-list');
  if (!el) return;

  // Sort by real merged downloads (downloads already includes trackedDL from init)
  const sorted = [...gamesData].sort((a, b) => b.downloads - a.downloads);
  const top = sorted.slice(0, 5);
  const max = Math.max(top[0]?.downloads || 1, 1);
  const rankClasses = ['gold', 'silver', 'bronze', '', ''];
  const rankEmojis = ['🥇', '🥈', '🥉', '4', '5'];

  el.innerHTML = top.map((g, i) => {
    const gameVisual = g.imageUrl
      ? `<img src="${g.imageUrl}" class="td-game-img" style="width:32px; height:32px; border-radius:8px; object-fit:cover; margin-left:10px;">`
      : `<div class="td-game-img" style="width:32px; height:32px; border-radius:8px; font-size:14px; margin-left:10px;">${g.emoji || '🎮'}</div>`;

    return `
      <div class="top-game-item">
        <div class="top-game-rank ${rankClasses[i]}">${rankEmojis[i]}</div>
        ${gameVisual}
        <div class="top-game-info">
          <div class="top-game-name">${g.name}</div>
          <div class="top-game-dl">${formatNumber(g.downloads)} تحميل</div>
        </div>
        <div class="top-game-bar-wrap">
          <div class="top-game-bar" style="width:${Math.round((g.downloads / max) * 100)}%"></div>
          <div class="top-game-pct">${Math.round((g.downloads / max) * 100)}%</div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== RECENT TABLE =====
function renderRecentTable() {
  const tbody = document.getElementById('recent-tbody');
  if (!tbody) return;
  // Sort by dateAdded DESC — newest games first
  const recent = [...gamesData]
    .sort((a, b) => {
      const da = a.dateAdded ? new Date(a.dateAdded) : new Date(0);
      const db = b.dateAdded ? new Date(b.dateAdded) : new Date(0);
      return db - da;
    })
    .slice(0, 5);

  tbody.innerHTML = recent.map(g => {
    const gameVisual = g.imageUrl
      ? `<img src="${g.imageUrl}" class="td-game-img" style="object-fit:cover;">`
      : `<div class="td-game-img">${g.emoji || '🎮'}</div>`;

    return `
    <tr>
      <td>
        <div class="td-game">
          ${gameVisual}
          <div>
            <div class="td-game-name">${g.name}</div>
            <div class="td-game-cat">${g.category}</div>
          </div>
        </div>
      </td>
      <td>${g.category}</td>
      <td>${g.size}</td>
      <td>${formatNumber(g.downloads)}</td>
      <td>${formatNumber(g.views || 0)}</td>
      <td><span style="color:#fbbf24">⭐ ${g.rating}</span></td>
      <td>${statusBadge(g.status)}</td>
    </tr>
    `;
  }).join('');
}

// ===== GAMES TABLE =====
function renderGamesTable() {
  const tbody = document.getElementById('games-tbody');
  if (!tbody) return;

  const catFilter = document.getElementById('filter-cat')?.value || '';
  const statusFilter = document.getElementById('filter-status')?.value || '';
  const searchVal = document.getElementById('dashboard-search')?.value?.toLowerCase() || '';

  let filtered = gamesData.filter(g => {
    const matchCat = !catFilter || g.category === catFilter;
    const matchStatus = !statusFilter || g.status === statusFilter;
    const matchSearch = !searchVal || g.name.toLowerCase().includes(searchVal) || g.category.includes(searchVal);
    return matchCat && matchStatus && matchSearch;
  });

  // Sort by dateAdded DESC
  filtered.sort((a, b) => {
    const da = a.dateAdded ? new Date(a.dateAdded) : new Date(0);
    const db = b.dateAdded ? new Date(b.dateAdded) : new Date(0);
    return db - da; // Newest first
  });

  tbody.innerHTML = filtered.map((g, i) => {
    const gameVisual = g.imageUrl
      ? `<img src="${g.imageUrl}" class="td-game-img" style="object-fit:cover;">`
      : `<div class="td-game-img">${g.emoji || '🎮'}</div>`;

    return `
    <tr>
      <td>${i + 1}</td>
      <td>
        <div class="td-game">
          ${gameVisual}
          <div>
            <div class="td-game-name">${g.name}</div>
            <div class="td-game-cat">${g.category}</div>
          </div>
        </div>
      </td>
      <td>${g.category}</td>
      <td>${g.size}</td>
      <td>${formatNumber(g.downloads)}</td>
      <td>${formatNumber(g.views || 0)}</td>
      <td><span style="color:#fbbf24">⭐ ${g.rating}</span></td>
      <td>${statusBadge(g.status)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="action-btn" onclick="editGame('${g.id}')" title="تعديل">✏️</button>
          <button class="action-btn del" onclick="deleteGame('${g.id}')" title="حذف">🗑️</button>
        </div>
      </td>
    </tr>
  `}).join('');
}

// ===== CATEGORIES PAGE =====
function renderCategoriesPage() {
  const grid = document.getElementById('cats-grid');
  if (!grid) return;

  // Merge auto-detected categories from games + custom saved ones
  const catMap = {};
  gamesData.forEach(g => { catMap[g.category] = (catMap[g.category] || 0) + 1; });

  // Load custom categories (may include ones with 0 games)
  const customCats = JSON.parse(localStorage.getItem('gv_custom_categories') || '[]');
  customCats.forEach(c => { if (!catMap[c.name]) catMap[c.name] = 0; });

  const catColors = ['stat-icon-1', 'stat-icon-2', 'stat-icon-3', 'stat-icon-4'];
  const entries = Object.entries(catMap);

  if (entries.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--text-muted); font-size:1rem;"><i class="fas fa-folder-open" style="font-size:3rem; margin-bottom:16px; display:block; opacity:0.3;"></i>لا توجد فئات بعد. أضف فئتك الأولى!</div>`;
    return;
  }

  grid.innerHTML = entries.map(([cat, count], i) => {
    const isCustom = customCats.some(c => c.name === cat);
    const catData = customCats.find(c => c.name === cat);
    const catColors = ['stat-icon-1', 'stat-icon-2', 'stat-icon-3', 'stat-icon-4'];

    // Determine icon: FA class for custom, getCategoryIcon for built-in
    let iconHtml;
    if (catData && catData.icon && catData.icon.startsWith('fa-')) {
      // Map FA icons to colors matching the picker
      const iconColorMap = {
        'fa-shield-halved':'#a78bfa','fa-gun':'#f87171','fa-dragon':'#34d399',
        'fa-trophy':'#fbbf24','fa-brain':'#60a5fa','fa-dice':'#c084fc',
        'fa-flag-checkered':'#f97316','fa-ghost':'#94a3b8','fa-earth-americas':'#22d3ee',
        'fa-chess-pawn':'#e879f9','fa-puzzle-piece':'#4ade80','fa-rocket':'#38bdf8',
        'fa-volleyball':'#fb923c','fa-mountain-sun':'#a3e635','fa-car-side':'#f43f5e',
        'fa-crosshairs':'#ef4444','fa-graduation-cap':'#818cf8','fa-wand-magic-sparkles':'#e0aaff'
      };
      const c = iconColorMap[catData.icon] || 'var(--primary-light)';
      iconHtml = `<i class="fas ${catData.icon}" style="font-size:1.6rem;color:${c};"></i>`;
    } else {
      iconHtml = typeof getCategoryIcon === 'function' ? getCategoryIcon(cat) : '🎮';
    }

    return `
    <div class="stat-card" style="position:relative;">
      ${isCustom && count === 0 ? `<button onclick="window.deleteCustomCategory('${cat.replace(/'/g, "\\'")}')"
        style="position:absolute;top:12px;left:12px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#f87171;width:28px;height:28px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.8rem;transition:0.3s;"
        onmouseover="this.style.background='rgba(239,68,68,0.25)'" onmouseout="this.style.background='rgba(239,68,68,0.1)'" title="حذف الفئة">
        <i class="fas fa-times"></i></button>` : ''}
      <div class="stat-icon ${catColors[i % catColors.length]}">${iconHtml}</div>
      <div class="stat-info">
        <div class="stat-value">${count}</div>
        <div class="stat-label">${cat}</div>
        <div class="stat-change ${count > 0 ? 'up' : ''}" style="${count === 0 ? 'color:var(--text-dim)' : ''}"><i class="fas fa-gamepad"></i> ${count} ${count === 1 ? 'لعبة' : 'ألعاب'}</div>
      </div>
    </div>`;
  }).join('');
}

window.deleteCustomCategory = function(catName) {
  const customs = JSON.parse(localStorage.getItem('gv_custom_categories') || '[]');
  const updated = customs.filter(c => c.name !== catName);
  localStorage.setItem('gv_custom_categories', JSON.stringify(updated));
  renderCategoriesPage();
  showToast(`✅ تم حذف الفئة "${catName}"`, 'success');
};

// ===== DOWNLOADS PAGE =====
function renderDownloadsPage() {
  const tbody = document.getElementById('dl-tbody');
  if (!tbody) return;
  const sorted = [...gamesData].sort((a, b) => b.downloads - a.downloads);
  tbody.innerHTML = sorted.map(g => {
    const monthly = Math.floor(g.downloads * 0.08);
    const growth = (Math.random() * 30 + 5).toFixed(1);
    const gameVisual = g.imageUrl
      ? `<img src="${g.imageUrl}" class="td-game-img" style="object-fit:cover;">`
      : `<div class="td-game-img">${g.emoji || '🎮'}</div>`;

    return `
      <tr>
        <td>
          <div class="td-game">
            ${gameVisual}
            <div><div class="td-game-name">${g.name}</div><div class="td-game-cat">${g.category}</div></div>
          </div>
        </td>
        <td>${formatNumber(g.downloads)}</td>
        <td>${formatNumber(monthly)}</td>
        <td><span style="color:var(--green)">▲ ${growth}%</span></td>
      </tr>`;
  }).join('');
}

// ===== REPORTS PAGE =====
function renderReportsPage() {
  // Category distribution chart
  const catsChart = document.getElementById('cats-chart');
  if (catsChart) {
    const catMap = {};
    gamesData.forEach(g => { catMap[g.category] = (catMap[g.category] || 0) + 1; });
    const total = gamesData.length;
    catsChart.innerHTML = Object.entries(catMap).map(([cat, count]) => {
      const pct = Math.round((count / total) * 100);
      return `
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="font-size:0.88rem;font-weight:600">${cat}</span>
            <span style="font-size:0.82rem;color:var(--text-muted)">${count} ألعاب (${pct}%)</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
        </div>`;
    }).join('');
  }

  // Top rated
  const topRatedEl = document.getElementById('top-rated-list');
  if (topRatedEl) {
    const topRated = [...gamesData].sort((a, b) => b.rating - a.rating).slice(0, 5);
    topRatedEl.innerHTML = topRated.map((g, i) => `
      <div class="top-game-item">
        <div class="top-game-rank ${['gold', 'silver', 'bronze', '', ''][i]}">${['🥇', '🥈', '🥉', '4', '5'][i]}</div>
        <div class="top-game-info">
          <div class="top-game-name">${g.emoji} ${g.name}</div>
          <div class="top-game-dl">${g.category}</div>
        </div>
        <div style="color:#fbbf24;font-weight:700">⭐ ${g.rating}</div>
      </div>
    `).join('');
  }
}

// ===== USER REPORTS PAGE =====
function renderUserReportsPage() {
  const tbody = document.getElementById('user-reports-tbody');
  if (!tbody) return;

  const reports = JSON.parse(localStorage.getItem('gv_reports') || '[]');

  if (reports.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted)">لا توجد بلاغات نشطة</td></tr>';
    return;
  }

  // Sort: pending first, then by id desc
  reports.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return (parseFloat(b.id) || 0) - (parseFloat(a.id) || 0);
  });

  tbody.innerHTML = reports.map(r => {
    const reasonMap = {
      broken_link: 'الروابط لا تعمل',
      link_broken: 'الروابط لا تعمل',
      inappropriate: 'محتوى غير لائق',
      wrong_content: 'محتوى غير لائق',
      malware: 'ملف ضار / فيروسات',
      misleading: 'بيانات مضللة',
      copyright: 'حقوق ملكية',
      other: 'سبب آخر'
    };

    const isPending = r.status === 'pending';

    return `
      <tr style="opacity: ${isPending ? '1' : '0.7'}">
        <td>
          <div style="font-weight:700; color:var(--text)">${r.gameName || 'بلاغ غير مسمى'}</div>
          <div style="font-size:0.75rem; color:var(--text-muted)">ID: ${r.gameId || '—'}</div>
        </td>
        <td><span class="badge-pill" style="background:rgba(239,68,68,0.1); color:#f87171">${reasonMap[r.reason] || (r.reason === 'broken' ? 'الروابط لا تعمل' : r.reason)}</span></td>
        <td><div style="max-width:180px; font-size:0.85rem; color:var(--text-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis" title="${r.details || ''}">${r.details || '—'}</div></td>
        <td>${r.reporter || 'زائر'}</td>
        <td><div style="font-size:0.75rem">${r.date || 'غير محدد'}</div></td>
        <td>
          <div style="display:flex; gap:6px">
            <button class="action-btn view" onclick="window.openReportPreview('${r.id}'); return false;" title="معاينة"><i class="fas fa-eye"></i></button>
            ${isPending ? `
            <button class="action-btn" style="color:#34d399; background:rgba(52,211,153,0.1)" onclick="window.dismissReport('${r.id}')" title="معالجة البلاغ"><i class="fas fa-check"></i></button>
              <button class="action-btn del" onclick="window.deleteReportedGame('${r.id}', '${r.gameId}', '${(r.gameName || 'بلاغ').replace(/'/g, "\\'")}')" title="حذف اللعبة"><i class="fas fa-trash-alt"></i></button>
            ` : '<span style="color:var(--text-muted); font-size:0.75rem"><i class="fas fa-check-circle"></i> تم الحل</span>'}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.openReportPreview = function (reportId) {
  console.log('Opening Report Preview:', reportId);
  const reports = JSON.parse(localStorage.getItem('gv_reports') || '[]');
  const r = reports.find(x => String(x.id) === String(reportId));

  if (!r) {
    console.error('Report not found for ID:', reportId);
    if (window.showToast) window.showToast('⚠️ لم يتم العثور على بيانات هذا البلاغ');
    return;
  }

  const overlay = document.getElementById('message-modal-overlay');
  const body = document.getElementById('message-modal-body');

  if (!overlay || !body) {
    console.error('Modal elements missing from DOM');
    return;
  }

  const reasonMap = {
    broken_link: 'الروابط لا تعمل',
    link_broken: 'الروابط لا تعمل',
    broken: 'الروابط لا تعمل',
    inappropriate: 'محتوى غير لائق',
    wrong_content: 'محتوى غير لائق',
    malware: 'ملف ضار / فيروسات',
    misleading: 'بيانات مضللة',
    copyright: 'حقوق ملكية',
    other: 'سبب آخر'
  };

  // Safe injection
  const safeTitle = r.gameName || 'بلاغ';
  const displayDetails = r.details || 'لا توجد تفاصيل إضافية.';

  body.innerHTML = `
    <div class="report-preview-content">
      <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--border)">
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 5px;">اللعبة المُبلغ عنها:</div>
        <div style="font-weight: 700; color: var(--text); font-size: 1.2rem;">${safeTitle} <span style="font-weight:400; font-size:0.8rem; color:var(--text-muted)">(ID: ${r.gameId})</span></div>
      </div>
      
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
        <div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 5px;">نوع المشكلة:</div>
          <span class="badge-pill" style="background:rgba(239,68,68,0.1); color:#f87171">${reasonMap[r.reason] || r.reason}</span>
        </div>
        <div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 5px;">بواسطة:</div>
          <div style="font-weight:600; color:var(--text)">${r.reporter || 'زائر'}</div>
        </div>
      </div>

      <div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">تفاصيل البلاغ:</div>
        <div style="background: rgba(255,100,100,0.03); padding: 20px; border-radius: 18px; border: 1px solid rgba(255,100,100,0.1); line-height: 1.7; color: var(--text); white-space: pre-wrap; font-size:0.95rem;">
          ${displayDetails}
        </div>
      </div>
      
      <div style="margin-top: 20px; font-size: 0.75rem; color: var(--text-dim); text-align: left;">
        تاريخ البلاغ: ${r.date}
      </div>

      ${r.status === 'pending' ? `
        <div style="margin-top:25px; display:flex; gap:12px">
          <button class="btn btn-grad" style="flex:1" onclick="window.dismissReport('${r.id}'); window.closeMessageModal();">
            <i class="fas fa-check"></i> حل البلاغ (تجاهل)
          </button>
          <button class="btn btn-ghost" style="color:#f87171" onclick="window.deleteReportedGame('${r.id}', '${r.gameId}', '${safeTitle.replace(/'/g, "\\'")}'); window.closeMessageModal();">
            <i class="fas fa-trash-alt"></i> حذف اللعبة
          </button>
        </div>
      ` : `
        <div style="margin-top:20px; padding:12px; background:rgba(52,211,153,0.1); color:#34d399; border-radius:12px; text-align:center; font-weight:600">
          <i class="fas fa-check-circle"></i> تم التعامل مع هذا البلاغ مسبقاً
        </div>
      `}
    </div>
  `;

  // Hide the email button as it's not relevant for reports
  const replyBtn = document.getElementById('btn-reply-email');
  if (replyBtn) replyBtn.style.display = 'none';

  // Force reset potential visibility issues and activate
  overlay.style.display = 'flex';
  overlay.style.opacity = '1';
  overlay.style.visibility = 'visible';
  overlay.classList.add('active');
}

window.dismissReport = function (reportId) {
  const reports = JSON.parse(localStorage.getItem('gv_reports') || '[]');
  const idx = reports.findIndex(r => String(r.id) === String(reportId));
  if (idx === -1) return;

  const r = reports[idx];
  r.status = 'resolved';
  localStorage.setItem('gv_reports', JSON.stringify(reports));

  // SEND NOTIFICATION TO REPORTER
  if (r.reporter !== 'زائر' && typeof addNotification === 'function') {
    addNotification(
      r.reporter,
      'success',
      '✅ تم حل البلاغ',
      `يسعدنا إخبارك بأنه تمت مراجعة بلاغك بخصوص "${r.gameName}" وحل المشكلة. شكراً لمساهمتك!`
    );
  }

  renderUserReportsPage();
  updateStats();
  showToast('✅ تم حل البلاغ بنجاح وتنبيه المستخدم', 'success');
}

window.deleteReportedGame = function (reportId, gameId, gameName) {
  showCustomConfirm({
    title: 'حذف اللعبة',
    message: `تحذير: هل أنت متأكد من حذف لعبة "${gameName}" نهائياً من المتجر بناءً على هذا البلاغ؟`,
    type: 'danger',
    icon: 'fa-trash-alt',
    confirmText: 'حذف اللعبة',
    onConfirm: () => {
      // 1. Mark report as resolved
      const reports = JSON.parse(localStorage.getItem('gv_reports') || '[]');
      const idx = reports.findIndex(r => String(r.id) === String(reportId));
      let reporter = 'زائر';
      if (idx !== -1) {
        reports[idx].status = 'resolved';
        reporter = reports[idx].reporter;
      }
      localStorage.setItem('gv_reports', JSON.stringify(reports));

      // 2. Remove from global games (if string ID starting with EXT_ it's in extra_games)
      if (typeof gameId === 'string' && gameId.startsWith('EXT_')) {
        const extra = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
        const newExtra = extra.filter(g => g.id != gameId);
        localStorage.setItem('gv_extra_games', JSON.stringify(newExtra));
      }

      // 3. Update memory data
      gamesData = gamesData.filter(g => g.id != gameId);

      // 4. Send notification to reporter
      if (reporter !== 'زائر' && typeof addNotification === 'function') {
        addNotification(
          reporter,
          'success',
          '✅ تمت معالجة بلاغك',
          `بناءً على بلاغك الحكيم، تم فحص لعبة "${gameName}" وحذفها من الموقع نهائياً. شكراً لحرصك!`
        );
      }

      renderUserReportsPage();
      renderGamesTable();
      updateStats();
      showToast(`🗑️ تم حذف اللعبة ونبذة المستخدم`, 'info');
    }
  });
}

function clearAllReports() {
  showCustomConfirm({
    title: 'مسح البلاغات',
    message: 'هل أنت متأكد من مسح جميع سجلات البلاغات؟',
    type: 'danger',
    icon: 'fa-dumpster',
    confirmText: 'مسح الكل',
    onConfirm: () => {
      localStorage.removeItem('gv_reports');
      renderUserReportsPage();
      updateStats();
      showToast('✅ تم مسح السجل بنجاح', 'success');
    }
  });
}

// ===== INBOX PAGE =====
function renderInboxPage() {
  const tbody = document.getElementById('inbox-tbody');
  if (!tbody) return;

  const inbox = JSON.parse(localStorage.getItem('gv_inbox') || '[]');

  if (inbox.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted)">البريد الوارد فارغ</td></tr>';
    return;
  }

  // Sort by date desc
  inbox.sort((a, b) => new Date(b.date) - new Date(a.date));

  tbody.innerHTML = inbox.map(m => {
    const isUnread = m.status === 'unread';
    const isReplied = m.status === 'replied';
    const dateStr = new Date(m.date).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    let badgeColor = isUnread ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)';
    let badgeText = isUnread ? 'جديدة' : 'تمت القراءة';
    let textColor = isUnread ? 'var(--primary-light)' : 'var(--text-dim)';

    if (isReplied) {
      badgeColor = 'rgba(52,211,153,0.1)';
      badgeText = 'تم الرد';
      textColor = '#10b981';
    }

    return `
      <tr style="background: ${isUnread ? 'rgba(124, 58, 237, 0.05)' : 'transparent'}">
        <td>
          <div style="font-weight:700; color:var(--text)">${m.name} ${m.userName ? '<i class="fas fa-user-check" title="عضو مسجل" style="color:var(--primary-light); font-size:0.7rem; margin-right:4px"></i>' : ''}</div>
          <div style="font-size:0.75rem; color:var(--text-muted)">${m.email}</div>
        </td>
        <td style="font-weight: ${isUnread ? '700' : '400'}">${m.subject}</td>
        <td><div style="font-size:0.75rem">${dateStr}</div></td>
        <td>
          <span class="badge-pill" style="background: ${badgeColor}; color: ${textColor}">
            ${badgeText}
          </span>
        </td>
        <td>
          <div style="display:flex; gap:6px">
            <button class="action-btn view" onclick="openInboxMessage('${m.id}')" title="عرض"><i class="fas fa-eye"></i></button>
            <button class="action-btn del" onclick="deleteInboxMessage('${m.id}')" title="حذف"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openInboxMessage(id) {
  const inbox = JSON.parse(localStorage.getItem('gv_inbox') || '[]');
  const msg = inbox.find(m => String(m.id) === String(id));
  if (!msg) return;

  // Mark as read
  if (msg.status === 'unread') {
    msg.status = 'read';
    localStorage.setItem('gv_inbox', JSON.stringify(inbox));
    renderInboxPage();
    updateStats();
  }

  const body = document.getElementById('message-modal-body');
  const dateStr = new Date(msg.date).toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' });

  body.innerHTML = `
    <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--border)">
      <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 5px;">من:</div>
      <div style="font-weight: 700; color: var(--text); font-size: 1.1rem;">${msg.name} <span style="font-weight: 400; font-size: 0.9rem; color: var(--primary-light);">&lt;${msg.email}&gt;</span></div>
      <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 5px;">التاريخ: ${dateStr}</div>
    </div>
    
    <div style="margin-bottom: 25px;">
      <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 5px;">الموضوع:</div>
      <div style="font-weight: 700; color: var(--text); font-size: 1rem;">${msg.subject}</div>
    </div>
    
    <div style="background: var(--bg-card); padding: 20px; border-radius: 15px; border: 1px solid var(--border); line-height: 1.7; color: var(--text-dim); white-space: pre-wrap;">
      ${msg.message}
    </div>

    <!-- Reply Section -->
    <div style="margin-top: 25px; display: flex; gap: 10px; flex-wrap: wrap;">
        <button class="btn btn-grad" onclick="window.replyToMessage('${msg.name}', '${msg.email}'); return false;" style="flex: 1; min-width: 140px;">
           <i class="fas fa-reply"></i> الرد على الرسالة
        </button>
        <button class="btn btn-ghost" id="btn-reply-email" style="flex: 1; min-width: 140px; border: 1px solid var(--border)">
           <i class="fas fa-envelope"></i> الرد عبر البريد
        </button>
    </div>

    ${msg.userName ? `
    <div style="margin-top: 20px; padding: 20px; background: rgba(124,58,237,0.05); border: 1px solid rgba(124,58,237,0.1); border-radius: 15px;">
      <div style="font-weight: 700; color: var(--primary-light); margin-bottom: 12px; display:flex; align-items:center; gap:8px;">
        <i class="fas fa-paper-plane"></i> رد سريع (إشعار داخل الموقع)
        <span style="font-size:0.75rem; font-weight:400; color:var(--text-muted)">سيصل الرد إلى: ${msg.userName}</span>
      </div>
      <textarea id="reply-notif-text" class="form-input" placeholder="اكتب ردك هنا..." style="background:var(--bg); margin-bottom:12px; height:80px; color:var(--text);"></textarea>
      <button class="btn btn-grad" onclick="sendInboxReplyNotification(${msg.id}, '${msg.userName}')" style="width:100%">
        <i class="fas fa-share"></i> إرسال الرد كإشعار
      </button>
    </div>
    ` : `
    <div style="margin-top: 15px; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 12px; text-align:center; color:var(--text-muted); font-size:0.85rem;">
      هذا المرسل غير مسجل في الموقع، الرد متاح عبر البريد فقط.
    </div>
    `}
  `;

  document.getElementById('btn-reply-email').onclick = () => {
    window.location.href = `mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`;
  };

  const overlay = document.getElementById('message-modal-overlay');
  overlay.style.setProperty('display', 'flex', 'important');
  overlay.style.setProperty('z-index', '2147483647', 'important');
  
  setTimeout(() => {
    overlay.style.opacity = '1';
    overlay.style.visibility = 'visible';
    overlay.classList.add('active');
  }, 10);
}

window.closeMessageModal = function () {
  const overlay = document.getElementById('message-modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.style.opacity = '0';
    overlay.style.visibility = 'hidden';
    setTimeout(() => {
      if (!overlay.classList.contains('active')) {
        overlay.style.display = 'none';
      }
    }, 300);
  }
  // Reset reply button visibility for next time
  const replyBtn = document.getElementById('btn-reply-email');
  if (replyBtn) replyBtn.style.display = 'inline-block';
}

function sendInboxReplyNotification(msgId, userName) {
  const replyText = document.getElementById('reply-notif-text').value.trim();
  if (!replyText) {
    showToast('⚠️ يرجى كتابة الرد أولاً', 'error');
    return;
  }

  if (typeof addNotification === 'function') {
    const inbox = JSON.parse(localStorage.getItem('gv_inbox') || '[]');
    const msg = inbox.find(m => m.id === msgId);

    const title = 'رد من الإدارة بخصوص: ' + (msg ? msg.subject : 'رسالتك');
    addNotification(userName, 'info', title, replyText);

    showToast('✅ تم إرسال الرد كإشعار للمستخدم', 'success');
    closeMessageModal();

    // Optional: Mark as replied
    if (msg) {
      msg.status = 'replied';
      localStorage.setItem('gv_inbox', JSON.stringify(inbox));
      renderInboxPage();
    }
  } else {
    showToast('❌ فشل إرسال الإشعار (النظام غير متوفر)', 'error');
  }
}

function deleteInboxMessage(id) {
  showCustomConfirm({
    title: 'حذف الرسالة',
    message: 'هل أنت متأكد من حذف هذه الرسالة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.',
    type: 'danger',
    icon: 'fa-trash-alt',
    confirmText: 'حذف الآن',
    onConfirm: () => {
      const inbox = JSON.parse(localStorage.getItem('gv_inbox') || '[]');
      const filtered = inbox.filter(m => String(m.id) !== String(id));
      localStorage.setItem('gv_inbox', JSON.stringify(filtered));
      renderInboxPage();
      updateStats();
      showToast('🗑️ تم حذف الرسالة', 'info');
    }
  });
}

function clearAllInbox() {
  showCustomConfirm({
    title: 'مسح البريد الوارد',
    message: 'هل أنت متأكد من مسح جميع الرسائل في البريد الوارد؟',
    type: 'danger',
    icon: 'fa-dumpster',
    confirmText: 'مسح السجل بالكامل',
    onConfirm: () => {
      localStorage.removeItem('gv_inbox');
      renderInboxPage();
      updateStats();
      showToast('✅ تم مسح البريد الوارد بنجاح', 'success');
    }
  });
}

// ===== REVIEWS PAGE =====
function renderReviewsPage() {
  const tbody = document.getElementById('reviews-tbody');
  if (!tbody) return;

  const subs = JSON.parse(localStorage.getItem('gv_submissions') || '[]');

  if (subs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted)">لا توجد طلبات لعرضها</td></tr>';
    return;
  }

  // Sort: pending first, then by date desc
  subs.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return b.subId.localeCompare(a.subId);
  });

  tbody.innerHTML = subs.map(s => {
    let statusBadge = '';
    let actions = '-';

    if (s.status === 'pending') {
      statusBadge = '<span class="badge-pill pill-draft" style="background:rgba(251,191,36,0.2);color:#fbbf24">قيد المراجعة</span>';
      actions = `
        <div style="display:flex;gap:6px">
          <button class="action-btn" style="color:#34d399;background:rgba(52,211,153,0.1)" onclick="approveReview('${s.subId}')" title="موافقة"><i class="fas fa-check"></i></button>
          <button class="action-btn del" onclick="rejectReview('${s.subId}')" title="رفض"><i class="fas fa-times"></i></button>
          <button class="action-btn" style="color:var(--primary-light);background:var(--bg-hover)" onclick="window.location.href='game.html?id=${s.subId}'" title="معاينة"><i class="fas fa-eye"></i></button>
        </div>
      `;
    } else if (s.status === 'approved') {
      statusBadge = '<span class="badge-pill pill-active">مقبول</span>';
    } else if (s.status === 'rejected') {
      statusBadge = '<span class="badge-pill" style="background:rgba(248,113,113,0.2);color:#f87171">مرفوض</span>';
    }

    let typeBadge = '';
    if (s.type === 'edit') typeBadge = '<span style="font-size:0.7rem;padding:2px 6px;border-radius:4px;background:rgba(99,102,241,0.2);color:#818cf8;margin-right:5px">تعديل</span>';
    else if (s.type === 'delete') typeBadge = '<span style="font-size:0.7rem;padding:2px 6px;border-radius:4px;background:rgba(239,68,68,0.2);color:#f87171;margin-right:5px">حذف</span>';
    else typeBadge = '<span style="font-size:0.7rem;padding:2px 6px;border-radius:4px;background:rgba(52,211,153,0.2);color:#34d399;margin-right:5px">جديد</span>';

    return `
      <tr>
        <td>
          <div style="font-weight:700">${s.userName}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">${s.userEmail}</div>
        </td>
        <td>
          <div class="td-game">
            <div class="td-game-img" style="${s.imageUrl ? `background:url('${s.imageUrl}') center/cover no-repeat;` : 'background:var(--primary)'}"></div>
            <div class="td-game-name">${typeBadge} ${s.name}</div>
          </div>
        </td>
        <td>${s.category}</td>
        <td>
          <a href="${s.link}" target="_blank" style="color:var(--primary-light);font-size:0.85rem"><i class="fas fa-link"></i> الرابط</a>
          <div style="font-size:0.75rem;color:var(--text-muted)">${s.size}</div>
        </td>
        <td>${s.date}</td>
        <td>${statusBadge}</td>
        <td>${actions}</td>
      </tr>
    `;
  }).join('');
}

function approveReview(subId) {
  if (!confirm('هل أنت متأكد من الموافقة على هذه اللعبة ونشرها؟')) return;

  const subs = JSON.parse(localStorage.getItem('gv_submissions') || '[]');
  const idx = subs.findIndex(s => s.subId === subId);
  if (idx === -1) return;

  subs[idx].status = 'approved';
  saveSubmissionsData(subs);

  // Handle different request types
  let extraGames = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
  const sub = subs[idx];

  if (sub.type === 'delete') {
    extraGames = extraGames.filter(g => g.id != sub.targetId);
    localStorage.setItem('gv_extra_games', JSON.stringify(extraGames));
    showToast('🗑️ تم قبول طلب الحذف وإزالة اللعبة', 'info');
  } else if (sub.type === 'edit') {
    const liveIdx = extraGames.findIndex(g => g.id == sub.targetId);
    if (liveIdx !== -1) {
      extraGames[liveIdx] = {
        ...extraGames[liveIdx],
        name: sub.name,
        category: sub.category,
        desc: sub.desc,
        size: sub.size,
        platforms: sub.platforms || ['Windows'],
        links: sub.links || [],
        imageUrl: sub.imageUrl || '',
        screenshots: sub.screenshots || [],
        videoUrl: sub.videoUrl || '',
        badge: sub.badge
      };
      localStorage.setItem('gv_extra_games', JSON.stringify(extraGames));
      showToast('✅ تم قبول التعديلات وتحديث اللعبة فوراً', 'success');
    }
  } else {
    // Normal New Game Approval
    const newGame = {
      id: 'EXT_' + Date.now(),
      originalSubId: sub.subId || '', // Link to original submission
      name: sub.name,
      category: sub.category,
      desc: sub.desc,
      size: sub.size,
      platforms: sub.platforms || ['Windows'],
      links: sub.links || [{ type: 'مباشر', url: sub.link || '#' }],
      imageUrl: sub.imageUrl || '',
      screenshots: sub.screenshots || [],
      videoUrl: sub.videoUrl || '', // FIX: Include videoUrl
      badge: sub.badge,
      rating: sub.rating || 4.5,
      downloads: 0,
      views: 0,
      status: 'active',
      submittedBy: sub.submittedBy || sub.userName || 'GUEST',
      submitterId: sub.submitterId || sub.userId || '',
      dateAdded: new Date().toISOString().split('T')[0],
      submitterAvatar: sub.userAvatar || (sub.userName ? sub.userName.charAt(0).toUpperCase() : 'U')
    };
    extraGames.push(newGame);
    localStorage.setItem('gv_extra_games', JSON.stringify(extraGames));
    showToast('✅ تم قبول اللعبة ونشرها بنجاح', 'success');
  }

  // SEND NOTIFICATION
  if (typeof addNotification === 'function') {
    const notifyUser = sub.submittedBy || sub.userName;
    const msg = sub.type === 'edit' ? `تمت الموافقة على تعديلات لعبة "${sub.name}"` :
      sub.type === 'delete' ? `تمت الموافقة على طلب حذف لعبة "${sub.name}"` :
        `تهانينا! تمت الموافقة على لعبتك "${sub.name}" وهي الآن منشورة للجميع.`;
    addNotification(notifyUser, 'success', 'تم قبول طلبك', msg);
  }

  // Update memory array for dashboard
  gamesData = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');

  renderReviewsPage();
  updateStats();
  renderGamesTable();
  showToast('✅ تم قبول اللعبة ونشرها بنجاح', 'success');
}

function rejectReview(subId) {
  showCustomConfirm({
    title: 'رفض الطلب',
    message: 'هل أنت متأكد من رفض طلب المراجعة هذا؟',
    type: 'danger',
    confirmText: 'رفض الآن',
    onConfirm: () => {
      const subs = JSON.parse(localStorage.getItem('gv_submissions') || '[]');
      const idx = subs.findIndex(s => s.subId === subId);
      if (idx !== -1) {
        subs[idx].status = 'rejected';
        saveSubmissionsData(subs);

        // SEND NOTIFICATION
        const sub = subs[idx];
        if (typeof addNotification === 'function') {
          const notifyUser = sub.submittedBy || sub.userName;
          addNotification(notifyUser, 'error', 'تم رفض طلبك', `عذراً، تم رفض طلبك بخصوص لعبة "${sub.name}". يرجى مراجعة معايير النشر.`);
        }

        renderReviewsPage();
        updateStats();
        showToast('❌ تم رفض اللعبة', 'error');
      }
    }
  });
}

function saveSubmissionsData(subs) {
  localStorage.setItem('gv_submissions', JSON.stringify(subs));
}

// ===== ADD GAME =====
function openAddGame() {
  editingId = null;
  document.getElementById('form-modal-title').textContent = 'إضافة لعبة جديدة';
  document.getElementById('save-btn-text').textContent = 'حفظ اللعبة';
  clearForm();
  addFormLinkField(); // Always start with one empty link row
  document.getElementById('game-form-overlay').classList.add('active');
}

function editGame(id) {
  const g = gamesData.find(x => x.id === id);
  if (!g) return;

  editingId = id;
  clearForm();
  document.getElementById('form-modal-title').textContent = `تعديل لعبة: ${g.name}`;
  document.getElementById('save-btn-text').textContent = 'حفظ التعديلات';

  document.getElementById('fg-name').value = g.name || '';
  document.getElementById('fg-category').value = g.category || 'أكشن';
  document.getElementById('fg-desc').value = g.desc || '';
  document.getElementById('fg-size').value = g.size || '';
  document.getElementById('fg-rating').value = g.rating || 4.5;
  document.getElementById('fg-status').value = g.status || 'active';
  document.getElementById('fg-badge').value = g.badge || '';
  document.getElementById('fg-emoji').value = g.emoji || '🎮';
  document.getElementById('fg-image').value = g.imageUrl || '';

  // Screenshots (Dynamic)
  if (g.screenshots && Array.isArray(g.screenshots)) {
    g.screenshots.forEach(url => {
      // Clear the "Empty" text first if we're adding actual screenshots
      const emptyText = document.getElementById('fg-screenshots-empty');
      if (emptyText) emptyText.remove();
      addScreenshotField(url);
    });
  }

  // Platforms
  if (g.platforms) {
    document.querySelectorAll('input[name="fg-platform"]').forEach(cb => {
      if (g.platforms.includes(cb.value)) cb.checked = true;
    });
  }

  // Links
  if (g.links && g.links.length > 0) {
    g.links.forEach(lnk => addFormLinkField(lnk.type, lnk.url));
  } else if (g.link && g.link !== '#') {
    addFormLinkField('مباشر', g.link);
  } else {
    addFormLinkField();
  }

  document.getElementById('game-form-overlay').classList.add('active');
}

function saveGame() {
  const name = document.getElementById('fg-name').value.trim();
  const category = document.getElementById('fg-category').value;
  const desc = document.getElementById('fg-desc').value.trim();
  const size = document.getElementById('fg-size').value.trim() || '0 GB';
  const rating = parseFloat(document.getElementById('fg-rating').value) || 4.0;
  const status = document.getElementById('fg-status').value;
  const badge = document.getElementById('fg-badge').value;
  const emoji = document.getElementById('fg-emoji').value.trim() || '🎮';
  const imageUrl = document.getElementById('fg-image').value.trim();

  // Screenshots from dynamic fields
  const screenshots = Array.from(document.querySelectorAll('#fg-screenshots-container .fg-screenshot-url'))
    .map(inp => inp.value.trim()).filter(s => s);

  // Platforms
  const platforms = Array.from(document.querySelectorAll('input[name="fg-platform"]:checked')).map(cb => cb.value);

  // Links from dynamic link rows
  const links = Array.from(document.querySelectorAll('#form-links-container .link-field-row')).map(row => ({
    type: row.querySelector('.fg-link-type').value,
    url: row.querySelector('.fg-link-url').value.trim()
  })).filter(l => l.url);

  if (!name) { showToast('⚠️ يرجى إدخال اسم اللعبة', 'error'); return; }

  const gameObj = {
    name, category, desc, size, rating, status, badge, emoji, imageUrl, screenshots, platforms, links,
    link: links.length > 0 ? links[0].url : '#' // Fallback for old templates
  };

  if (editingId !== null) {
    const idx = gamesData.findIndex(g => g.id === editingId);
    if (idx !== -1) {
      gamesData[idx] = { ...gamesData[idx], ...gameObj };

      // Update in localStorage if it exists there
      const extra = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
      const extraIdx = extra.findIndex(eg => eg.id === editingId);
      if (extraIdx !== -1) {
        extra[extraIdx] = { ...extra[extraIdx], ...gameObj };
        localStorage.setItem('gv_extra_games', JSON.stringify(extra));
      }

      showToast('✅ تم تعديل اللعبة بنجاح', 'success');
    }
  } else {
    const newGame = {
      id: `EXT_${Date.now()}`,
      ...gameObj,
      downloads: 0,
      views: 0,
      dateAdded: new Date().toISOString().split('T')[0],
      submittedBy: 'الإدارة',
      submitterAvatar: '👑'
    };
    gamesData.unshift(newGame); // Add to the TOP of the array

    // Save to gv_extra_games
    const extra = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
    extra.push(newGame);
    localStorage.setItem('gv_extra_games', JSON.stringify(extra));

    showToast('✅ تم إضافة اللعبة بنجاح', 'success');
  }

  closeGameForm();
  updateStats();
  renderRecentTable();
  renderGamesTable();
  renderCategoriesPage();
  renderTopGames();
}

function deleteGame(id) {
  const g = gamesData.find(x => x.id === id);
  if (!g) return;
  
  showCustomConfirm({
    title: 'حذف اللعبة',
    message: `هل أنت متأكد من حذف لعبة "${g.name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
    type: 'danger',
    confirmText: 'حذف اللعبة',
    onConfirm: () => {
      gamesData = gamesData.filter(x => x.id !== id);
      renderGamesTable();
      renderRecentTable();
      updateStats();
      renderCategoriesPage();
      renderTopGames();
      showToast(`🗑️ تم حذف لعبة "${g.name}"`, 'info');
    }
  });
}


// ===== SETTINGS =====
function loadSettings() {
  const settings = JSON.parse(localStorage.getItem('gv_settings') || '{"allowComments":true, "contact":"admin@example.com"}');
  const globalSetting = JSON.parse(localStorage.getItem('gv_global_settings') || '{"siteName":"بوابة اللاعبين", "siteLogo":"fas fa-gamepad"}');

  const allowComm = document.getElementById('setting-allow-comments');
  const contact = document.getElementById('setting-contact-email');
  
  const siteName = document.getElementById('setting-site-name');
  const siteLogo = document.getElementById('setting-site-logo');
  const adminEmail = document.getElementById('setting-admin-email');
  const adminPass = document.getElementById('setting-admin-pass');

  const notifyOn = document.getElementById('setting-notify-on');
  const fxOn = document.getElementById('setting-fx-on');
  
  if (allowComm) allowComm.checked = settings.allowComments !== false;
  if (notifyOn) notifyOn.checked = settings.notifications !== false;
  if (fxOn) fxOn.checked = settings.visualFX !== false;
  if (contact) contact.value = settings.contact || '';
  
  const maintMode = document.getElementById('setting-maintenance-mode');
  if (maintMode) maintMode.checked = globalSetting.maintenanceMode || false;
  
  if (siteName) siteName.value = globalSetting.siteName || 'بوابة اللاعبين';
  if (siteLogo) siteLogo.value = globalSetting.siteLogo || 'fas fa-gamepad';
  
  const siteLogoUrl = document.getElementById('setting-site-logo-url');
  if (siteLogoUrl) siteLogoUrl.value = globalSetting.siteLogoUrl || '';
  
  const siteLogoUrlLight = document.getElementById('setting-site-logo-url-light');
  if (siteLogoUrlLight) siteLogoUrlLight.value = globalSetting.siteLogoUrlLight || '';
  
  if (adminEmail) adminEmail.value = globalSetting.adminEmail || '';
  if (adminPass) adminPass.value = globalSetting.adminPassword || '';

  // New Social Settings
  const discord = document.getElementById('setting-social-discord');
  const youtube = document.getElementById('setting-social-youtube');
  const telegram = document.getElementById('setting-social-telegram');
  const facebook = document.getElementById('setting-social-facebook');

  if (discord) discord.value = globalSetting.socialDiscord || '';
  if (youtube) youtube.value = globalSetting.socialYoutube || '';
  if (telegram) telegram.value = globalSetting.socialTelegram || '';
  if (facebook) facebook.value = globalSetting.socialFacebook || '';
}
window.loadSettings = loadSettings;

window.switchSettingsTab = function(panelId, tabEl) {
  // If tabEl is a string, resolve it to a DOM element
  if (typeof tabEl === 'string') {
    tabEl = document.getElementById(tabEl);
  }

  // New system: s-tab / s-panel
  if (tabEl && tabEl.classList && tabEl.classList.contains('s-tab')) {
    document.querySelectorAll('.s-tab').forEach(t => t.classList.remove('s-tab-active'));
    tabEl.classList.add('s-tab-active');
    document.querySelectorAll('.s-panel').forEach(p => p.classList.remove('s-panel-active'));
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.add('s-panel-active');
    return;
  }

  // Legacy system: settings-tab / settings-content
  document.querySelectorAll('.settings-tab').forEach(b => b.classList.remove('active'));
  if (tabEl && tabEl.classList) tabEl.classList.add('active');
  document.querySelectorAll('.settings-content').forEach(p => p.classList.remove('active'));
  const legacy = document.getElementById(panelId);
  if (legacy) legacy.classList.add('active');
}

function saveSettings() {
  console.log('💾 saveSettings() called');
  try {
  const allowComm = document.getElementById('setting-allow-comments') ? document.getElementById('setting-allow-comments').checked : true;
  const contact = document.getElementById('setting-contact-email') ? document.getElementById('setting-contact-email').value : '';
  
  const siteName = document.getElementById('setting-site-name') ? document.getElementById('setting-site-name').value : 'بوابة اللاعبين';
  const siteLogo = document.getElementById('setting-site-logo') ? document.getElementById('setting-site-logo').value : 'fas fa-gamepad';
  const siteLogoUrl = document.getElementById('setting-site-logo-url') ? document.getElementById('setting-site-logo-url').value : '';
  const siteLogoUrlLight = document.getElementById('setting-site-logo-url-light') ? document.getElementById('setting-site-logo-url-light').value : '';
  const adminEmail = document.getElementById('setting-admin-email') ? document.getElementById('setting-admin-email').value : '';
  const adminPass = document.getElementById('setting-admin-pass') ? document.getElementById('setting-admin-pass').value : '';

  const notifyOn = document.getElementById('setting-notify-on')?.checked || false;
  const fxOn = document.getElementById('setting-fx-on')?.checked || false;

  const settings = {
    allowComments: allowComm,
    notifications: notifyOn,
    visualFX: fxOn,
    contact: contact
  };

  const globalSettings = {
    siteName: siteName,
    siteLogo: siteLogo,
    siteLogoUrl: siteLogoUrl,
    siteLogoUrlLight: siteLogoUrlLight,
    adminEmail: adminEmail,
    adminPassword: adminPass,
    maintenanceMode: document.getElementById('setting-maintenance-mode')?.checked || false,
    socialDiscord: document.getElementById('setting-social-discord')?.value || '',
    socialYoutube: document.getElementById('setting-social-youtube')?.value || '',
    socialTelegram: document.getElementById('setting-social-telegram')?.value || '',
    socialFacebook: document.getElementById('setting-social-facebook')?.value || '',
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem('gv_settings', JSON.stringify(settings));
  localStorage.setItem('gv_global_settings', JSON.stringify(globalSettings));

  // Sync to Firebase if available
  try {
    if (window.db && window.firebase) {
      window.db.collection('config').doc('global_settings').set(globalSettings)
        .then(() => console.log('✅ Settings synced to Firebase'))
        .catch(e => console.warn('Firebase settings sync failed:', e));
      window.db.collection('config').doc('settings').set(settings)
        .catch(e => console.warn('Firebase settings sync failed:', e));
    }
  } catch(e) { /* Firebase not ready, local save is enough */ }

  showToast('تم حفظ الإعدادات بنجاح ✅', 'success');

  // Apply branding changes immediately
  if (typeof applyDynamicBranding === 'function') applyDynamicBranding();

  // Apply maintenance mode immediately
  if (globalSettings.maintenanceMode) {
    console.warn('⚠️ Maintenance Mode is ON');
  }

  } catch(err) {
    console.error('❌ saveSettings error:', err);
    alert('حدث خطأ أثناء حفظ الإعدادات: ' + err.message);
  }
}
window.saveSettings = saveSettings;

function toggleAdminPassVisibility() {
  const input = document.getElementById('setting-admin-pass');
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  // Support both old and new eye icon IDs
  const icon = document.getElementById('admin-pass-eye') || (event && event.target);
  if (icon) {
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
  }
}
window.toggleAdminPassVisibility = toggleAdminPassVisibility;

// ===== SYSTEM DATA: EXPORT / IMPORT =====
function exportSystemData() {
  const keys = ['gv_users', 'gv_extra_games', 'gv_submissions', 'gv_reports', 'gv_inbox', 'gv_settings', 'gv_global_settings', 'gv_videos'];
  const exportObj = {};

  keys.forEach(k => {
    const val = localStorage.getItem(k);
    if (val) exportObj[k] = JSON.parse(val);
  });

  const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GameVault_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('✅ تم تصدير البيانات بنجاح', 'success');
}
window.exportSystemData = exportSystemData;

function importSystemData(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      showCustomConfirm({
        title: 'استيراد البيانات',
        message: 'سيتم استبدال جميع البيانات الحالية بالبيانات المستوردة من الملف. هل أنت متأكد؟',
        type: 'danger',
        confirmText: 'استيراد الآن',
        onConfirm: () => {
          Object.keys(data).forEach(key => {
            if (key.startsWith('gv_')) {
              localStorage.setItem(key, JSON.stringify(data[key]));
            }
          });
          showToast('✅ تم استيراد البيانات بنجاح. سيتم تحديث الصفحة...', 'success');
          setTimeout(() => window.location.reload(), 1500);
        }
      });
    } catch (err) {
      showToast('❌ فشل استيراد البيانات: ملف غير صالح', 'error');
    }
  };
  reader.readAsText(file);
}
window.importSystemData = importSystemData;

// ===== USERS MANAGEMENT (Direct Firestore Sync) =====
async function renderUsersPage() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  // Show loading state
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;"><i class="fas fa-spinner fa-spin"></i> جاري جلب المستخدمين من السيرفر...</td></tr>';

  try {
    const snapshot = await db.collection("users").get();
    const users = [];
    snapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted)">لا يوجد مستخدمين مسجلين</td></tr>';
      return;
    }

    // Sort by joinDate desc (string or timestamp)
    users.sort((a, b) => new Date(b.joinDate || 0) - new Date(a.joinDate || 0));

    tbody.innerHTML = users.map(u => {
      const userId = u.id;
      const userName = u.name || 'مستخدم مجهول';
      const userEmail = u.email || '---';
      const userRole = u.role || 'user';
      const userAvatar = u.avatar || userName.charAt(0).toUpperCase();

      return `
        <tr>
          <td>
            <div class="td-game">
              <div class="td-game-img" style="background:var(--primary); font-size:1rem; border-radius:50%">
                ${userAvatar}
              </div>
              <div>
                <div class="td-game-name">${userName}</div>
                <div style="font-size:0.7rem; color:var(--text-muted)">UID: ${String(userId).slice(0, 8)}...</div>
              </div>
            </div>
          </td>
          <td>${userEmail}</td>
          <td>
            <span class="badge-pill" style="background:${userRole === 'admin' ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.05)'}; color:${userRole === 'admin' ? 'var(--primary-light)' : 'var(--text-dim)'}">
              ${userRole === 'admin' ? 'مدير' : 'مستخدم'}
            </span>
          </td>
          <td><div style="font-size:0.8rem">${u.joinDate || 'قديماً'}</div></td>
          <td>
            <div style="display:flex; gap:6px">
              <button class="action-btn sync" onclick="toggleUserRole('${String(userId)}', '${userRole}')" title="تغيير الرتبة"><i class="fas fa-sync-alt"></i></button>
              <button class="action-btn del" onclick="deleteUser('${String(userId)}', '${userName}')" title="حذف"><i class="fas fa-trash-alt"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    
    // Update local cache & badge as well for UI consistency
    localStorage.setItem('gv_users', JSON.stringify(users));
    updateStats();

  } catch (err) {
    console.error('❌ Firestore Fetch Error:', err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:#ef4444">⚠️ فشل جلب البيانات من السيرفر: ${err.message}</td></tr>`;
  }
}

async function toggleUserRole(userId, currentRole) {
  const newRole = currentRole === 'admin' ? 'user' : 'admin';
  
  showCustomConfirm({
    title: 'تغيير رتبة المستخدم',
    message: `هل أنت متأكد من تغيير رتبة هذا المستخدم إلى ${newRole === 'admin' ? 'مدير' : 'مستخدم'}؟`,
    type: 'info',
    icon: 'fa-user-tag',
    confirmText: 'تغيير الآن',
    onConfirm: async () => {
      try {
        await db.collection("users").doc(userId).update({ role: newRole });
        renderUsersPage();
        showToast('✅ تم تغيير الرتبة في السيرفر بنجاح', 'success');
      } catch (err) {
        showToast('❌ فشل التحديث: ' + err.message, 'error');
      }
    }
  });
}

async function deleteUser(userId, userName) {
  // Security: Check if admin is deleting themselves or if it's the last admin (logic simplified for brevity, backend rules are better)
  showCustomConfirm({
    title: 'حذف مستخدم',
    message: `هل أنت متأكد من حذف المستخدم "${userName}" نهائياً من السيرفر؟`,
    type: 'danger',
    icon: 'fa-user-minus',
    confirmText: 'حذف من السيرفر',
    onConfirm: async () => {
      try {
        await db.collection("users").doc(userId).delete();
        renderUsersPage();
        showToast('🗑️ تم حذف المستخدم من قاعدة البيانات بنجاح', 'info');
      } catch (err) {
        showToast('❌ فشل الحذف: ' + err.message, 'error');
      }
    }
  });
}

// ===== DYNAMIC FORM FIELDS (Links) =====
const LINK_TYPES = {
  'مباشر': { icon: 'fa-cloud-arrow-down', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  'تورنت': { icon: 'fa-magnet', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  'جوجل درايف': { icon: 'fa-brands fa-google-drive', color: '#4285f4', bg: 'rgba(66,133,244,0.12)', border: 'rgba(66,133,244,0.3)' },
  'ميديا فاير': { icon: 'fa-fire', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
};

function addFormLinkField(type = 'مباشر', url = '') {
  const container = document.getElementById('form-links-container');
  if (!container) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'link-field-row';
  wrapper.style.cssText = 'display:flex; gap:8px; align-items:center; background:var(--bg-hover); padding:10px 14px; border-radius:14px; border:1px solid var(--border);';

  wrapper.innerHTML = `
    <div style="position:relative">
      <select class="form-select fg-link-type" onchange="updateLinkIcon(this)"
        style="min-width:130px; border-radius:10px; padding-right:35px; padding-left:10px; font-size:0.85rem; cursor:pointer; background-color:var(--bg-card); border-color:var(--border);">
        ${Object.keys(LINK_TYPES).map(t => `<option value="${t}" ${type === t ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
    </div>
    <input type="url" class="form-input fg-link-url sg-input" placeholder="https://..." value="${url}"
      style="flex:1; border-radius:10px; font-size:0.88rem;"/>
    <button type="button" onclick="this.closest('.link-field-row').remove()"
      style="flex-shrink:0; width:36px; height:36px; border-radius:10px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); color:#f87171; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:0.2s;"
      onmouseover="this.style.background='rgba(239,68,68,0.25)'" onmouseout="this.style.background='rgba(239,68,68,0.1)'">
      <i class="fas fa-times"></i>
    </button>
  `;

  container.appendChild(wrapper);
  // Apply icon color to the new select
  updateLinkIcon(wrapper.querySelector('.fg-link-type'));
}

function updateLinkIcon(select) {
  const info = LINK_TYPES[select.value] || LINK_TYPES['مباشر'];
  select.style.borderColor = info.border;
  select.style.color = info.color;
  select.style.background = info.bg;
}

// Screenshots dynamic system
function addScreenshotField(url = '') {
  const container = document.getElementById('fg-screenshots-container');
  if (!container) return;

  const div = document.createElement('div');
  div.style.cssText = 'display:flex; gap:8px; align-items:center;';
  div.innerHTML = `
    <input type="url" class="form-input sg-input fg-screenshot-url" placeholder="https://..." value="${url}"
      style="flex:1; border-radius:10px; font-size:0.86rem;"/>
    <button type="button" onclick="this.parentElement.remove()"
      style="flex-shrink:0; width:36px; height:36px; border-radius:10px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); color:#f87171; cursor:pointer; display:flex; align-items:center; justify-content:center;"
      onmouseover="this.style.background='rgba(239,68,68,0.25)'" onmouseout="this.style.background='rgba(239,68,68,0.1)'">
      <i class="fas fa-times"></i>
    </button>
  `;
  container.appendChild(div);
}

// ===== FORM =====
function clearForm() {
  ['fg-name', 'fg-desc', 'fg-size', 'fg-rating', 'fg-image', 'fg-emoji'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('fg-category').value = 'أكشن';
  document.getElementById('fg-status').value = 'active';
  document.getElementById('fg-badge').value = '';

  // Clear checkboxes
  document.querySelectorAll('input[name="fg-platform"]').forEach(cb => cb.checked = false);

  // Clear links
  document.getElementById('form-links-container').innerHTML = '';

  // Reset screenshots container
  const ssCont = document.getElementById('fg-screenshots-container');
  if (ssCont) {
    ssCont.innerHTML = '<div style="color:var(--text-dim); font-size:0.82rem; text-align:center; padding:6px 0" id="fg-screenshots-empty">لا توجد لقطات — اضغط &quot;إضافة صورة&quot; لإضافة رابط</div>';
  }
}

function openAddGame() {
  editingId = null;
  clearForm();
  document.getElementById('form-modal-title').textContent = 'إضافة لعبة جديدة';
  document.getElementById('save-btn-text').textContent = 'إضافة اللعبة';
  addFormLinkField(); // Add one empty link by default
  document.getElementById('game-form-overlay').classList.add('active');
}

function closeGameForm() {
  document.getElementById('game-form-overlay').classList.remove('active');
  clearForm();
  editingId = null;
}

// Close form on overlay click
document.getElementById('game-form-overlay')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('game-form-overlay')) closeGameForm();
});

// ===== ADD CATEGORY MODAL =====
function addCategoryPrompt() {
  // Remove any existing modal
  const ex = document.getElementById('add-cat-overlay');
  if (ex) ex.remove();

  const overlay = document.createElement('div');
  overlay.id = 'add-cat-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(12px);z-index:2147483647;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s;';

  overlay.innerHTML = `
    <div onclick="event.stopPropagation()" style="background:var(--bg-card);border:1px solid var(--border);border-radius:24px;padding:36px;width:90%;max-width:440px;box-shadow:0 40px 80px rgba(0,0,0,0.6);transform:scale(0.92) translateY(20px);transition:all 0.35s cubic-bezier(0.34,1.56,0.64,1);">
      <h3 style="font-family:'Rajdhani',sans-serif;font-size:1.6rem;font-weight:700;color:var(--text);margin:0 0 8px;display:flex;align-items:center;gap:10px;">
        <i class="fas fa-folder-plus" style="color:var(--primary-light);"></i> إضافة فئة جديدة
      </h3>
      <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:28px;">الفئات الجديدة ستظهر في قائمة الاختيار عند إضافة الألعاب.</p>

      <div style="margin-bottom:18px;">
        <label style="display:block;color:var(--text-dim);font-size:0.85rem;font-weight:600;margin-bottom:8px;">اسم الفئة</label>
        <input id="new-cat-name" type="text" placeholder="مثال: رعب، رياضة، إستراتيجية..."
          style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:12px 16px;color:var(--text);font-family:inherit;font-size:1rem;outline:none;transition:0.3s;"
          onfocus="this.style.borderColor='var(--primary-light)'" onblur="this.style.borderColor='var(--border)'">
      </div>

      <div style="margin-bottom:28px;">
        <label style="display:block;color:var(--text-dim);font-size:0.85rem;font-weight:600;margin-bottom:10px;">الأيقونة</label>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;" id="cat-icon-picker">
          ${[
            {icon:'fa-shield-halved',   color:'#a78bfa', bg:'rgba(167,139,250,0.15)'},
            {icon:'fa-gun',             color:'#f87171', bg:'rgba(248,113,113,0.15)'},
            {icon:'fa-dragon',          color:'#34d399', bg:'rgba(52,211,153,0.15)'},
            {icon:'fa-trophy',          color:'#fbbf24', bg:'rgba(251,191,36,0.15)'},
            {icon:'fa-brain',           color:'#60a5fa', bg:'rgba(96,165,250,0.15)'},
            {icon:'fa-dice',            color:'#c084fc', bg:'rgba(192,132,252,0.15)'},
            {icon:'fa-flag-checkered',  color:'#f97316', bg:'rgba(249,115,22,0.15)'},
            {icon:'fa-ghost',           color:'#94a3b8', bg:'rgba(148,163,184,0.15)'},
            {icon:'fa-earth-americas',  color:'#22d3ee', bg:'rgba(34,211,238,0.15)'},
            {icon:'fa-chess-pawn',      color:'#e879f9', bg:'rgba(232,121,249,0.15)'},
            {icon:'fa-puzzle-piece',    color:'#4ade80', bg:'rgba(74,222,128,0.15)'},
            {icon:'fa-rocket',          color:'#38bdf8', bg:'rgba(56,189,248,0.15)'},
            {icon:'fa-volleyball',      color:'#fb923c', bg:'rgba(251,146,60,0.15)'},
            {icon:'fa-mountain-sun',    color:'#a3e635', bg:'rgba(163,230,53,0.15)'},
            {icon:'fa-car-side',        color:'#f43f5e', bg:'rgba(244,63,94,0.15)'},
            {icon:'fa-crosshairs',      color:'#ef4444', bg:'rgba(239,68,68,0.15)'},
            {icon:'fa-graduation-cap',  color:'#818cf8', bg:'rgba(129,140,248,0.15)'},
            {icon:'fa-wand-magic-sparkles', color:'#e0aaff', bg:'rgba(224,170,255,0.15)'}
          ].map((item, idx) => `
            <button type="button"
              class="ico-opt"
              data-icon="${item.icon}"
              onclick="
                document.querySelectorAll('#cat-icon-picker .ico-opt').forEach(b=>{
                  b.style.outline='none';b.style.transform='scale(1)';
                });
                this.style.outline='2px solid var(--primary-light)';
                this.style.transform='scale(1.12)';
                document.getElementById('new-cat-icon').value='${item.icon}';
              "
              title="${item.icon.replace('fa-','')}"
              style="
                background:${item.bg};
                border:1px solid transparent;
                border-radius:12px;
                padding:10px 6px;
                cursor:pointer;
                display:flex;
                align-items:center;
                justify-content:center;
                transition:all 0.2s;
                ${idx===0 ? 'outline:2px solid var(--primary-light);transform:scale(1.08);' : ''}
              ">
              <i class="fas ${item.icon}" style="font-size:1.2rem;color:${item.color};pointer-events:none;"></i>
            </button>
          `).join('')}
        </div>
        <input type="hidden" id="new-cat-icon" value="fa-shield-halved">
      </div>


      <div style="display:flex;gap:10px;">
        <button onclick="window.saveNewCategory()" style="flex:1;padding:14px;background:var(--gradient-primary);border:none;border-radius:14px;color:#fff;font-weight:700;font-size:1rem;cursor:pointer;font-family:inherit;transition:0.3s;"
          onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
          <i class="fas fa-plus"></i> إضافة الفئة
        </button>
        <button onclick="document.getElementById('add-cat-overlay').remove()" style="padding:14px 20px;background:var(--bg);border:1px solid var(--border);border-radius:14px;color:var(--text-muted);cursor:pointer;font-family:inherit;font-size:1rem;transition:0.3s;">
          إلغاء
        </button>
      </div>
    </div>
  `;

  overlay.onclick = () => overlay.remove();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    overlay.querySelector('div').style.transform = 'scale(1) translateY(0)';
  });
  setTimeout(() => document.getElementById('new-cat-name')?.focus(), 350);
}

window.saveNewCategory = function() {
  const name = (document.getElementById('new-cat-name')?.value || '').trim();
  const icon = document.getElementById('new-cat-icon')?.value || '🎮';

  if (!name) {
    showToast('⚠️ يرجى إدخال اسم الفئة', 'error');
    document.getElementById('new-cat-name')?.focus();
    return;
  }

  // Check if already exists in games
  const existsInGames = gamesData.some(g => g.category === name);
  const customs = JSON.parse(localStorage.getItem('gv_custom_categories') || '[]');
  const existsInCustom = customs.some(c => c.name === name);

  if (existsInGames || existsInCustom) {
    showToast(`⚠️ الفئة "${name}" موجودة بالفعل`, 'error');
    return;
  }

  customs.push({ name, icon });
  localStorage.setItem('gv_custom_categories', JSON.stringify(customs));

  document.getElementById('add-cat-overlay')?.remove();
  renderCategoriesPage();
  showToast(`✅ تمت إضافة الفئة "${name}" بنجاح`, 'success');
};

// ===== SEARCH =====
function openMobileSearch() {
  const overlay = document.getElementById('mobile-search-overlay');
  if (overlay) {
    overlay.classList.add('active');
    setTimeout(() => {
      const input = document.getElementById('mobile-search-input');
      if (input) input.focus();
    }, 100);
  }
}

function closeMobileSearch(e) {
  if (e && e.target && !e.target.classList.contains('mobile-search-overlay') && !e.target.classList.contains('fa-times')) {
    return;
  }
  const overlay = document.getElementById('mobile-search-overlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
}

function dashboardSearch(query) {
  renderGamesTable();
}

// ===== REFRESH =====
function refreshData() {
  const icon = document.getElementById('refresh-icon');
  icon.style.animation = 'spin 0.8s linear infinite';
  setTimeout(() => {
    icon.style.animation = '';
    updateStats();
    renderChart();
    renderTopGames();
    renderRecentTable();
    renderGamesTable();
    renderReviewsPage();
    showToast('🔄 تم تحديث البيانات', 'success');
  }, 800);
}

// Spin keyframe
const style = document.createElement('style');
style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
document.head.appendChild(style);

// ===== SIDEBAR TOGGLE (mobile) =====
function toggleSidebar() {
  document.querySelector('.g-sidebar').classList.toggle('active');
}

// ===== HELPERS =====
function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toString();
}

function statusBadge(s) {
  const map = {
    active: '<span class="badge-pill pill-active">نشط</span>',
    featured: '<span class="badge-pill pill-featured">مميز</span>',
    draft: '<span class="badge-pill pill-draft">مسودة</span>',
  };
  return map[s] || s;
}
// ===== DOWNLOADS PAGE =====
function renderDownloadsPage() {
  const tbody = document.getElementById('dl-tbody');
  if (!tbody) return;

  const sortedByDl = [...gamesData].sort((a, b) => b.downloads - a.downloads);

  tbody.innerHTML = sortedByDl.map(g => {
    const monthDl = Math.floor(g.downloads * 0.15); // Pseudo logic: 15% this month
    const growth = (Math.random() * 5 + 1).toFixed(1);

    // Choose image or emoji
    const gameVisual = g.imageUrl
      ? `<img src="${g.imageUrl}" class="td-game-img" style="object-fit:cover;">`
      : `<div class="td-game-img">${g.emoji || '🎮'}</div>`;

    return `
      <tr>
        <td>
          <div class="td-game">
            ${gameVisual}
            <div class="td-game-name">${g.name}</div>
          </div>
        </td>
        <td><strong>${g.downloads.toLocaleString('ar-EG')}</strong></td>
        <td>${monthDl.toLocaleString('ar-EG')}</td>
        <td><span class="stat-change up"><i class="fas fa-arrow-up"></i> ${growth}%</span></td>
      </tr>
    `;
  }).join('');

  // Update Summary cards in downloads page
  const total = gamesData.reduce((a, g) => a + g.downloads, 0);
  document.getElementById('dl-today').textContent = (total / 30 * 0.8).toFixed(0).toLocaleString('ar-EG');
  document.getElementById('dl-week').textContent = (total / 4).toFixed(0).toLocaleString('ar-EG');
  document.getElementById('dl-month').textContent = total.toLocaleString('ar-EG');
}

// ===== REPORTS PAGE =====
function renderReportsPage() {
  const catsChart = document.getElementById('cats-chart');
  if (!catsChart) return;

  const catCounts = {};
  gamesData.forEach(g => {
    catCounts[g.category] = (catCounts[g.category] || 0) + 1;
  });

  const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...Object.values(catCounts), 1);

  catsChart.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:12px;">
      ${sortedCats.map(([cat, count]) => `
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:80px; font-size:12px; font-weight:600;">${cat}</div>
          <div style="flex:1; height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
            <div style="width:${(count / max) * 100}%; height:100%; background:var(--gradient-primary); border-radius:4px;"></div>
          </div>
          <div style="width:30px; font-size:11px; color:var(--text-muted); text-align:left;">${count}</div>
        </div>
      `).join('')}
    </div>
  `;

  // Top Rated List
  const topRated = document.getElementById('top-rated-list');
  if (topRated) {
    const sortedRating = [...gamesData].sort((a, b) => b.rating - a.rating).slice(0, 5);
    topRated.innerHTML = sortedRating.map(g => `
      <div class="top-game-item">
        <div class="top-game-info">
          <div class="top-game-name">${g.name}</div>
          <div class="top-game-dl"><i class="fas fa-star" style="color:#fbbf24"></i> ${g.rating} / 5</div>
        </div>
      </div>
    `).join('');
  }
}

// ===== TOAST =====
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✅', info: 'ℹ️', error: '❌' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || '📢'}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-100%)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ===== NOTIFICATIONS DROPDOWN =====
function toggleNotifDropdown(e) {
  if (e) e.stopPropagation();
  const dropdown = document.getElementById('notif-dropdown');
  const allDropdowns = document.querySelectorAll('.notif-dropdown');

  // Close others if they exist
  allDropdowns.forEach(d => {
    if (d !== dropdown) d.classList.remove('show');
  });

  dropdown.classList.toggle('show');

  // Mark as read when opened
  if (dropdown.classList.contains('show')) {
    document.getElementById('topbar-notif-dot').style.display = 'none';
    const badge = document.getElementById('notif-count-badge');
    if (badge) badge.textContent = '0';

    // Remove 'unread' styling from items
    document.querySelectorAll('.notif-item.unread').forEach(item => {
      item.classList.remove('unread');
    });
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const dropdownWrapper = document.getElementById('notif-dropdown-wrapper');
  if (dropdownWrapper && !dropdownWrapper.contains(e.target)) {
    const dropdown = document.getElementById('notif-dropdown');
    if (dropdown) dropdown.classList.remove('show');
  }
});

function initNotifications() {
  const notifList = document.getElementById('notif-list');
  const notifDot = document.getElementById('topbar-notif-dot');
  const countBadge = document.getElementById('notif-count-badge');
  if (!notifList || !notifDot) return;

  const reports = JSON.parse(localStorage.getItem('gv_reports') || '[]');
  const inbox = JSON.parse(localStorage.getItem('gv_inbox') || '[]');

  const allNotifs = [];

  // Add recent reports
  reports.slice(-3).forEach(r => {
    allNotifs.push({
      type: 'report',
      icon: 'fa-flag',
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.1)',
      title: `بلاغ عن لعبة: ${r.gameName}`,
      desc: (r.reason === 'link_broken' || r.reason === 'broken_link') ? 'الرابط لا يعمل' : (r.reason === 'malware' ? 'ملف ضار' : 'محتوى مخالف'),
      time: r.date.slice(0, 10),
      timestamp: new Date(r.date).getTime()
    });
  });

  // Add recent messages
  inbox.slice(-3).forEach(msg => {
    allNotifs.push({
      type: 'message',
      icon: 'fa-envelope',
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.1)',
      title: `رسالة جديدة من ${msg.name}`,
      desc: msg.subject,
      time: msg.date.slice(0, 10),
      timestamp: new Date(msg.date).getTime()
    });
  });

  // Sort by newest
  allNotifs.sort((a, b) => b.timestamp - a.timestamp);

  if (allNotifs.length === 0) {
    notifList.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:0.85rem;">لا توجد إشعارات جديدة</div>';
    notifDot.style.display = 'none';
    if (countBadge) countBadge.textContent = '0';
    return;
  }

  // We consider them "unread" just for visual effect on load
  notifDot.style.display = 'block';
  if (countBadge) countBadge.textContent = allNotifs.length;

  notifList.innerHTML = allNotifs.map(n => `
    <div class="notif-item unread" onclick="showPage('${n.type === 'report' ? 'user-reports' : 'inbox'}', document.querySelector('[onclick*=\\'${n.type === 'report' ? 'user-reports' : 'inbox'}\\']'))">
      <div class="notif-icon" style="background:${n.bg}; color:${n.color}">
        <i class="fas ${n.icon}"></i>
      </div>
      <div class="notif-info">
        <div class="notif-title">${n.title}</div>
        <div class="notif-desc">${n.desc}</div>
        <div class="notif-time">${n.time}</div>
      </div>
    </div>
  `).join('');
}

/* ========================================================
   BROADCAST & MESSAGING SYSTEM
======================================================== */

window.openComposeModal = function() {
  console.log('🚀 [ULTIMATE] Opening Compose Modal...');
  const overlay = document.getElementById('gv-ultimate-msg-overlay');
  if (!overlay) {
    console.error('❌ ULTIMATE Overlay not found!');
    return;
  }
  
  // Populate Users Dropdown
  const userSelect = document.getElementById('msg-recipient-user');
  if (userSelect) {
    try {
      const users = JSON.parse(localStorage.getItem('gv_users') || '[]');
      userSelect.innerHTML = users.map(u => `<option value="${u.name}">${u.name} (${u.email || 'بدون بريد'})</option>`).join('');
      if (users.length === 0) {
        userSelect.innerHTML = '<option value="">لا يوجد مستخدمين مسجلين</option>';
      }
    } catch(e) {
      console.error('❌ Error parsing users:', e);
    }
  }

  // FORCE VISIBILITY (ULTIMATE VERSION)
  overlay.style.setProperty('display', 'flex', 'important');
  overlay.style.setProperty('opacity', '1', 'important');
  overlay.style.setProperty('visibility', 'visible', 'important');
  overlay.style.setProperty('z-index', '2147483647', 'important');
  overlay.style.backgroundColor = 'rgba(0,0,0,0.92)';
  
  console.log('✨ ULTIMATE Modal opened successfully');
};

window.closeComposeModal = function() {
  const overlay = document.getElementById('gv-ultimate-msg-overlay');
  if (!overlay) return;
  overlay.style.display = 'none';
};

window.toggleRecipientSelect = function() {
  const type = document.getElementById('msg-recipient-type').value;
  const group = document.getElementById('msg-specific-user-group');
  if (group) group.style.display = (type === 'specific') ? 'block' : 'none';
};

window.sendGlobalMessage = function() {
  const type = document.getElementById('msg-recipient-type').value;
  const targetUserSelect = document.getElementById('msg-recipient-user');
  const targetUser = targetUserSelect ? targetUserSelect.value : null;
  const title = document.getElementById('msg-title').value.trim();
  const content = document.getElementById('msg-content').value.trim();

  if (!title || !content) {
    showToast('⚠️ يرجى إكمال عنوان ومحتوى الرسالة', 'error');
    return;
  }

  if (type === 'specific' && (!targetUser || targetUser === "")) {
    showToast('⚠️ يرجى اختيار مستخدم واحد على الأقل', 'error');
    return;
  }

  if (typeof addNotification !== 'function') {
    showToast('❌ نظام الإشعارات غير متوفر حالياً', 'error');
    return;
  }

  if (type === 'all') {
    const users = JSON.parse(localStorage.getItem('gv_users') || '[]');
    if (users.length === 0) {
      showToast('⚠️ لا يوجد مستخدمين لإرسال الرسالة إليهم', 'error');
      return;
    }

    // Small delay to prevent UI freezing if there are many users
    users.forEach((u, i) => {
      setTimeout(() => {
        addNotification(u.name, 'info', title, content);
      }, i * 10);
    });
    
    showToast(`✅ جاري إرسال الرسالة إلى جميع المستخدمين (${users.length})`, 'success');
  } else {
    addNotification(targetUser, 'info', title, content);
    showToast(`✅ تم إرسال الرسالة إلى ${targetUser} بنجاح`, 'success');
  }

  // Clear and close
  document.getElementById('msg-title').value = '';
  document.getElementById('msg-content').value = '';
  closeComposeModal();
};

window.replyToMessage = function(name, email) {
  // Close the current inbox/message modal
  window.closeMessageModal();
  
  // Open the compose modal after a short delay to allow transition
  setTimeout(() => {
    window.openComposeModal();
    
    // Auto-fill the recipient if possible
    const typeSelect = document.getElementById('msg-recipient-type');
    const userSelect = document.getElementById('msg-recipient-user');
    const group = document.getElementById('msg-specific-user-group');
    const titleInput = document.getElementById('msg-title');
    
    if (typeSelect && userSelect && group) {
      typeSelect.value = 'specific';
      group.style.display = 'block';
      
      // Select the user by name if they exist in the dropdown
      for (let i = 0; i < userSelect.options.length; i++) {
        if (userSelect.options[i] && userSelect.options[i].value === name) {
          userSelect.selectedIndex = i;
          break;
        }
      }
    }
    
    if (titleInput) {
      titleInput.value = `الرد على: `;
      titleInput.focus();
    }
  }, 350);
};
