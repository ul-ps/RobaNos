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
}

// ===== UPDATE STATS =====
function updateStats() {
  const totalDownloads = gamesData.reduce((a, g) => a + g.downloads, 0);
  const cats = new Set(gamesData.map(g => g.category)).size;

  animateCount('total-games-stat', gamesData.length);
  animateCount('total-downloads-stat', totalDownloads, true);
  animateCount('total-cats-stat', cats);

  const users = JSON.parse(localStorage.getItem('gv_users') || '[]');
  animateCount('total-users-stat', users.length);

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

  // Update Users count
  const usersCount = users.length;
  const usersPill = document.getElementById('users-count-pill');
  if (usersPill) usersPill.textContent = `${usersCount} مستخدم`;

  const usersBadge = document.getElementById('nav-badge-users');
  if (usersBadge) {
    usersBadge.textContent = usersCount;
    usersBadge.style.display = usersCount > 0 ? 'inline-block' : 'none';
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
  const catMap = {};
  gamesData.forEach(g => { catMap[g.category] = (catMap[g.category] || 0) + 1; });
  const catColors = ['stat-icon-1', 'stat-icon-2', 'stat-icon-3', 'stat-icon-4', 'stat-icon-1', 'stat-icon-2'];
  const entries = Object.entries(catMap);

  grid.innerHTML = entries.map(([cat, count], i) => `
    <div class="stat-card">
      <div class="stat-icon ${catColors[i % catColors.length]}">${getCategoryIcon(cat)}</div>
      <div class="stat-info">
        <div class="stat-value">${count}</div>
        <div class="stat-label">${cat}</div>
        <div class="stat-change up"><i class="fas fa-gamepad"></i> ${count} ألعاب</div>
      </div>
    </div>
  `).join('');
}

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
      link_broken: 'الروابط لا تعمل',
      wrong_content: 'محتوى غير لائق',
      malware: 'ملف ضار',
      copyright: 'حقوق ملكية',
      other: 'سبب آخر'
    };

    const isPending = r.status === 'pending';

    return `
      <tr style="opacity: ${isPending ? '1' : '0.7'}">
        <td>
          <div style="font-weight:700; color:#fff">${r.gameName}</div>
          <div style="font-size:0.75rem; color:var(--text-muted)">ID: ${r.gameId}</div>
        </td>
        <td><span class="badge-pill" style="background:rgba(239,68,68,0.1); color:#f87171">${reasonMap[r.reason] || r.reason}</span></td>
        <td><div style="max-width:180px; font-size:0.85rem; color:var(--text-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis" title="${r.details || ''}">${r.details || '—'}</div></td>
        <td>${r.reporter}</td>
        <td><div style="font-size:0.75rem">${r.date}</div></td>
        <td>
          <div style="display:flex; gap:6px">
            <button class="action-btn view" onclick="window.openReportPreview('${r.id}'); return false;" title="معاينة"><i class="fas fa-eye"></i></button>
            ${isPending ? `
              <button class="action-btn" style="color:#34d399; background:rgba(52,211,153,0.1)" onclick="window.dismissReport('${r.id}')" title="معالجة البلاغ"><i class="fas fa-check"></i></button>
              <button class="action-btn del" onclick="window.deleteReportedGame('${r.id}', '${r.gameId}', '${r.gameName.replace(/'/g, "\\'")}')" title="حذف اللعبة"><i class="fas fa-trash-alt"></i></button>
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
    link_broken: 'الروابط لا تعمل',
    wrong_content: 'محتوى غير لائق',
    malware: 'ملف ضار',
    copyright: 'حقوق ملكية',
    other: 'سبب آخر'
  };

  // Safe injection
  const safeTitle = r.gameName || 'بلاغ';
  const displayDetails = r.details || 'لا توجد تفاصيل إضافية.';

  body.innerHTML = `
    <div class="report-preview-content">
      <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.08)">
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 5px;">اللعبة المُبلغ عنها:</div>
        <div style="font-weight: 700; color: #fff; font-size: 1.2rem;">${safeTitle} <span style="font-weight:400; font-size:0.8rem; color:var(--text-muted)">(ID: ${r.gameId})</span></div>
      </div>
      
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
        <div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 5px;">نوع المشكلة:</div>
          <span class="badge-pill" style="background:rgba(239,68,68,0.1); color:#f87171">${reasonMap[r.reason] || r.reason}</span>
        </div>
        <div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 5px;">بواسطة:</div>
          <div style="font-weight:600; color:#fff">${r.reporter}</div>
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
  if (!confirm(`تحذير: هل أنت متأكد من حذف لعبة "${gameName}" نهائياً من المتجر بناءً على هذا البلاغ؟`)) return;

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

function clearAllReports() {
  if (!confirm('هل أنت متأكد من مسح جميع سجلات البلاغات؟')) return;
  localStorage.removeItem('gv_reports');
  renderUserReportsPage();
  updateStats();
  showToast('✅ تم مسح السجل بنجاح', 'success');
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
          <div style="font-weight:700; color:#fff">${m.name} ${m.userName ? '<i class="fas fa-user-check" title="عضو مسجل" style="color:var(--primary-light); font-size:0.7rem; margin-right:4px"></i>' : ''}</div>
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
    <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1)">
      <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 5px;">من:</div>
      <div style="font-weight: 700; color: #fff; font-size: 1.1rem;">${msg.name} <span style="font-weight: 400; font-size: 0.9rem; color: var(--primary-light);">&lt;${msg.email}&gt;</span></div>
      <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 5px;">التاريخ: ${dateStr}</div>
    </div>
    
    <div style="margin-bottom: 25px;">
      <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 5px;">الموضوع:</div>
      <div style="font-weight: 700; color: #fff; font-size: 1rem;">${msg.subject}</div>
    </div>
    
    <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.05); line-height: 1.7; color: var(--text-dim); white-space: pre-wrap;">
      ${msg.message}
    </div>

    ${msg.userName ? `
    <div style="margin-top: 25px; padding: 20px; background: rgba(124,58,237,0.05); border: 1px solid rgba(124,58,237,0.1); border-radius: 15px;">
      <div style="font-weight: 700; color: var(--primary-light); margin-bottom: 12px; display:flex; align-items:center; gap:8px;">
        <i class="fas fa-paper-plane"></i> رد سريع (إشعار داخل الموقع)
        <span style="font-size:0.75rem; font-weight:400; color:var(--text-muted)">سيصل الرد إلى: ${msg.userName}</span>
      </div>
      <textarea id="reply-notif-text" class="form-input" placeholder="اكتب ردك هنا..." style="background:var(--bg); margin-bottom:12px; height:80px;"></textarea>
      <button class="btn btn-grad" onclick="sendInboxReplyNotification(${msg.id}, '${msg.userName}')" style="width:100%">
        <i class="fas fa-share"></i> إرسال الرد كإشعار
      </button>
    </div>
    ` : `
    <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 12px; text-align:center; color:var(--text-muted); font-size:0.85rem;">
      هذا المرسل غير مسجل في الموقع، الرد متاح عبر البريد فقط.
    </div>
    `}
  `;

  document.getElementById('btn-reply-email').onclick = () => {
    window.location.href = `mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`;
  };

  const overlay = document.getElementById('message-modal-overlay');
  overlay.style.display = 'flex';
  overlay.style.opacity = '1';
  overlay.style.visibility = 'visible';
  overlay.classList.add('active');
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
  if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
  const inbox = JSON.parse(localStorage.getItem('gv_inbox') || '[]');
  const filtered = inbox.filter(m => String(m.id) !== String(id));
  localStorage.setItem('gv_inbox', JSON.stringify(filtered));
  renderInboxPage();
  updateStats();
  showToast('🗑️ تم حذف الرسالة', 'info');
}

function clearAllInbox() {
  if (!confirm('هل أنت متأكد من مسح جميع رسائل البريد الوارد؟')) return;
  localStorage.removeItem('gv_inbox');
  renderInboxPage();
  updateStats();
  showToast('✅ تم مسح البريد الوارد بنجاح', 'success');
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
      name: sub.name,
      category: sub.category,
      desc: sub.desc,
      size: sub.size,
      platforms: sub.platforms || ['Windows'],
      links: sub.links || [{ type: 'مباشر', url: sub.link || '#' }],
      imageUrl: sub.imageUrl || '',
      screenshots: sub.screenshots || [],
      badge: sub.badge,
      rating: sub.rating || 4.5,
      downloads: 0,
      views: 0,
      status: 'active',
      submittedBy: sub.submittedBy || 'GUEST',
      dateAdded: new Date().toISOString().split('T')[0],
      submitterAvatar: sub.userAvatar || sub.userName.charAt(0).toUpperCase()
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
  if (!confirm('هل أنت متأكد من رفض هذه اللعبة؟')) return;

  const subs = JSON.parse(localStorage.getItem('gv_submissions') || '[]');
  const idx = subs.findIndex(s => s.subId === subId);
  if (idx === -1) return;

  subs[idx].status = 'rejected';
  saveSubmissionsData(subs);

  // SEND NOTIFICATION
  const sub = subs[idx];
  if (typeof addNotification === 'function') {
    const notifyUser = sub.submittedBy || sub.userName;
    addNotification(notifyUser, 'error', 'تم رفض طلبك', `عذراً، تم رفض طلبك بخصوص لعبة "${sub.name}". يرجى مراجعة معايير النشر.`);
  }

  renderReviewsPage();
  updateStats(); // To update the badge
  showToast('❌ تم رفض اللعبة', 'error');
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
  if (!confirm(`هل أنت متأكد من حذف لعبة "${g.name}"؟`)) return;
  gamesData = gamesData.filter(x => x.id !== id);
  renderGamesTable();
  renderRecentTable();
  updateStats();
  renderCategoriesPage();
  renderTopGames();
  showToast(`🗑️ تم حذف لعبة "${g.name}"`, 'info');
}

// ===== SETTINGS =====
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

  if (allowComm) allowComm.checked = settings.allowComments;
  if (contact) contact.value = settings.contact || '';
  
  if (siteName) siteName.value = globalSetting.siteName || 'بوابة اللاعبين';
  if (siteLogo) siteLogo.value = globalSetting.siteLogo || 'fas fa-gamepad';
  const siteLogoUrl = document.getElementById('setting-site-logo-url');
  if (siteLogoUrl) siteLogoUrl.value = globalSetting.siteLogoUrl || '';
  const siteLogoUrlLight = document.getElementById('setting-site-logo-url-light');
  if (siteLogoUrlLight) siteLogoUrlLight.value = globalSetting.siteLogoUrlLight || '';
  if (adminEmail) adminEmail.value = globalSetting.adminEmail || '';
  if (adminPass) adminPass.value = globalSetting.adminPassword || '';
}

function saveSettings() {
  const allowComm = document.getElementById('setting-allow-comments') ? document.getElementById('setting-allow-comments').checked : true;
  const contact = document.getElementById('setting-contact-email') ? document.getElementById('setting-contact-email').value : '';
  
  const siteName = document.getElementById('setting-site-name') ? document.getElementById('setting-site-name').value : 'بوابة اللاعبين';
  const siteLogo = document.getElementById('setting-site-logo') ? document.getElementById('setting-site-logo').value : 'fas fa-gamepad';
  const siteLogoUrl = document.getElementById('setting-site-logo-url') ? document.getElementById('setting-site-logo-url').value : '';
  const siteLogoUrlLight = document.getElementById('setting-site-logo-url-light') ? document.getElementById('setting-site-logo-url-light').value : '';
  const adminEmail = document.getElementById('setting-admin-email') ? document.getElementById('setting-admin-email').value : '';
  const adminPass = document.getElementById('setting-admin-pass') ? document.getElementById('setting-admin-pass').value : '';

  const settings = {
    allowComments: allowComm,
    contact: contact
  };

  const globalSettings = {
    siteName: siteName,
    siteLogo: siteLogo,
    siteLogoUrl: siteLogoUrl,
    siteLogoUrlLight: siteLogoUrlLight,
    adminEmail: adminEmail,
    adminPassword: adminPass,
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem('gv_settings', JSON.stringify(settings));
  localStorage.setItem('gv_global_settings', JSON.stringify(globalSettings));
  
  showToast('تم حفظ الإعدادات والمزامنة بنجاح ✅', 'success');
  
  // Dispatch a local event exactly like firebaseDataReady or manually call applyDynamicBranding
  if (typeof applyDynamicBranding === 'function') applyDynamicBranding();
}

function toggleAdminPassVisibility() {
  const input = document.getElementById('setting-admin-pass');
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  const icon = event.target;
  icon.classList.toggle('fa-eye');
  icon.classList.toggle('fa-eye-slash');
}

// ===== SYSTEM DATA: EXPORT / IMPORT =====
function exportSystemData() {
  const keys = ['gv_users', 'gv_extra_games', 'gv_submissions', 'gv_reports', 'gv_inbox', 'gv_settings', 'gv_videos'];
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

function importSystemData(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!confirm('سيتم استبدال جميع البيانات الحالية بالبيانات المستوردة. هل أنت متأكد؟')) return;

      Object.keys(data).forEach(key => {
        if (key.startsWith('gv_')) {
          localStorage.setItem(key, JSON.stringify(data[key]));
        }
      });

      showToast('✅ تم استيراد البيانات بنجاح. سيتم تحديث الصفحة...', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      showToast('❌ فشل استيراد البيانات: ملف غير صالح', 'error');
    }
  };
  reader.readAsText(file);
}

// ===== USERS MANAGEMENT =====
function renderUsersPage() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  const users = JSON.parse(localStorage.getItem('gv_users') || '[]');

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted)">لا يوجد مستخدمين مسجلين</td></tr>';
    return;
  }

  // Sort by date desc (if exists)
  users.sort((a, b) => new Date(b.dateJoined || 0) - new Date(a.dateJoined || 0));

  tbody.innerHTML = users.map(u => {
    const userId = u.id || 'usr_' + Math.random().toString(36).substr(2, 9);
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
        <td><div style="font-size:0.8rem">${u.dateJoined ? new Date(u.dateJoined).toLocaleDateString('ar-EG') : 'قديماً'}</div></td>
        <td>
          <div style="display:flex; gap:6px">
            <button class="action-btn sync" onclick="toggleUserRole('${String(userId)}')" title="تغيير الرتبة"><i class="fas fa-sync-alt"></i></button>
            <button class="action-btn del" onclick="deleteUser('${String(userId)}')" title="حذف"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function toggleUserRole(userId) {
  const users = JSON.parse(localStorage.getItem('gv_users') || '[]');
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return;

  const newRole = users[idx].role === 'admin' ? 'user' : 'admin';
  if (!confirm(`تغيير رتبة "${users[idx].name}" إلى ${newRole === 'admin' ? 'مدير' : 'مستخدم'}؟`)) return;

  users[idx].role = newRole;
  localStorage.setItem('gv_users', JSON.stringify(users));
  renderUsersPage();
  showToast('✅ تم تغيير الرتبة بنجاح', 'success');
}

function deleteUser(userId) {
  const users = JSON.parse(localStorage.getItem('gv_users') || '[]');
  const user = users.find(u => u.id === userId);
  if (!user) return;

  if (user.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1) {
    showToast('❌ لا يمكن حذف آخر مدير للموقع', 'error');
    return;
  }

  if (!confirm(`هل أنت متأكد من حذف المستخدم "${user.name}" نهائياً؟`)) return;

  const filtered = users.filter(u => u.id !== userId);
  localStorage.setItem('gv_users', JSON.stringify(filtered));
  renderUsersPage();
  updateStats();
  showToast('🗑️ تم حذف المستخدم بنجاح', 'info');
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

// ===== CATEGORIES PROMPT =====
function addCategoryPrompt() {
  showToast('ℹ️ يمكن إضافة فئات عبر إضافة ألعاب من فئات جديدة', 'info');
}

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
      desc: r.reason === 'link_broken' ? 'الرابط لا يعمل' : 'محتوى مخالف',
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
