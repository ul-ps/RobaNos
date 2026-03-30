/* ========================================================
   theme.js — Dark/Light Mode Logic | GameVault
======================================================== */

(function() {
    // Theme initialization - run as early as possible to prevent flash
    const savedTheme = localStorage.getItem('gv_theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-mode');
    }

    document.addEventListener('DOMContentLoaded', () => {
        initThemeToggle();
        applyDynamicBranding();
    });

    // Run when Firebase sync finishes
    window.addEventListener('firebaseDataReady', () => {
        console.log("Branding: Firebase Ready, applying...");
        applyDynamicBranding();
    });

    // Cross-tab real-time sync
    window.addEventListener('storage', (e) => {
        if (e.key === 'gv_global_settings') {
            console.log("Branding: Storage updated in another tab, applying...");
            applyDynamicBranding();
        }
    });

    // Run immediately for synchronous elements
    applyDynamicBranding();

    function applyDynamicBranding() {
        try {
            const branding = getBranding();
            const isLight = document.documentElement.classList.contains('light-mode');
            let activeLogoUrl = branding.logoUrl;
            if (isLight && branding.logoUrlLight) {
                activeLogoUrl = branding.logoUrlLight;
            }

            const siteName = branding.name;
            const siteLogo = branding.logo;

            // Update Meta Title
            const baseTitle = document.title.split(' | ')[0] || siteName;
            if (document.title.includes('GameVault')) {
                document.title = document.title.replace(/GameVault/g, siteName);
            } else if (!document.title.includes(siteName)) {
                // If it doesn't have the site name at all, append it
                document.title = baseTitle + ' | ' + siteName;
            }

            // Update Text Placeholders
            document.querySelectorAll('.site-brand-name, .g-logo-text, .gv-loader-text').forEach(el => {
                if (el) el.textContent = siteName;
            });

            // Update Icon/Image Placeholders
            document.querySelectorAll('.site-brand-icon, .g-logo i, .gv-loader-logo, .nav-logo-icon').forEach(el => {
                if (!el) return;
                
                const isLoader = el.classList.contains('gv-loader-logo');
                const isNavLogo = el.classList.contains('nav-logo-icon');

                if (activeLogoUrl) {
                    // Try to find if we already added an img
                    let img = el.parentNode.querySelector('.dynamic-logo-img');
                    if (!img) {
                        img = document.createElement('img');
                        img.className = 'dynamic-logo-img';
                        if (isLoader) img.style.cssText = 'height:80px; width:auto; margin-bottom:15px;';
                        else if (isNavLogo) img.style.cssText = 'height:35px; width:auto;';
                        else img.style.cssText = 'height:32px; width:auto; vertical-align:middle; margin-left:8px;';
                        
                        el.parentNode.insertBefore(img, el);
                    }
                    img.src = activeLogoUrl;
                    el.style.display = 'none'; // Hide the icon
                } else {
                    // Fallback to Icon
                    el.style.display = 'inline-block';
                    const img = el.parentNode.querySelector('.dynamic-logo-img');
                    if (img) img.remove();
                    
                    el.className = `${branding.logo} ${isLoader ? 'gv-loader-logo' : (isNavLogo ? 'nav-logo-icon' : 'site-brand-icon')}`;
                }
            });
        } catch(e) { console.error("Branding Error:", e); }
    }

    function getBranding() {
        try {
            const globalSetting = JSON.parse(localStorage.getItem('gv_global_settings') || '{}');
            return {
                name: globalSetting.siteName || 'بوابة اللاعبين',
                logo: globalSetting.siteLogo || 'fas fa-gamepad',
                logoUrl: globalSetting.siteLogoUrl || '',
                logoUrlLight: globalSetting.siteLogoUrlLight || ''
            };
        } catch(e) {
            return { name: 'بوابة اللاعبين', logo: 'fas fa-gamepad', logoUrl: '', logoUrlLight: '' };
        }
    }
    
    // Export globally
    window.applyDynamicBranding = applyDynamicBranding;
    window.getBranding = getBranding;

    function initThemeToggle() {
        const toggleBtns = document.querySelectorAll('.theme-toggle, .g-theme-trigger, #theme-toggle');
        
        // Sync toggles with initial state
        updateToggleIcons();

        toggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toggleTheme();
            });
        });
    }

    function toggleTheme() {
        const isLight = document.documentElement.classList.toggle('light-mode');
        const theme = isLight ? 'light' : 'dark';
        localStorage.setItem('gv_theme', theme);
        
        updateToggleIcons();

        // Show feedback if showToast is available (from app.js)
        applyDynamicBranding(); // Update logos for new theme

        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
        
        // Show feedback if showToast is available (from app.js)
        if (typeof showToast === 'function') {
            const msg = isLight ? '💡 تم تفعيل الوضع النهاري' : '🌙 تم تفعيل الوضع الليلي';
            showToast(msg, 'info');
        }
    }

    function updateToggleIcons() {
        const toggleBtns = document.querySelectorAll('.theme-toggle, .g-theme-trigger, #theme-toggle');
        const isLight = document.documentElement.classList.contains('light-mode');
        
        toggleBtns.forEach(btn => {
            // Find icon inside btn if it exists
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = isLight ? 'fas fa-moon' : 'fas fa-sun';
            }
            // Update title/tooltip if exists
            btn.title = isLight ? 'تبديل للوضع الليلي' : 'تبديل للوضع النهاري';
        });
    }

    // Export for global access if needed
    window.gvToggleTheme = toggleTheme;
})();

/**
 * Global Sidebar Search
 * Redirects to the library with a search query
 */
function globalSearch(query) {
  if (!query || !query.trim()) return;
  const q = query.trim();
  window.location.href = `library.html?search=${encodeURIComponent(q)}`;
}

/**
 * Global Tracking Exports
 */
window.getGameBadge = getGameBadge;
window.badgeLabel = badgeLabel;
window.getGameDownloads = getGameDownloads;
window.incrementGameDownload = incrementGameDownload;
window.formatNumber = formatNumber;
window.addNotification = addNotification;
window.getNotifications = getNotifications;
window.markNotificationRead = markNotificationRead;
window.updateNotificationBadge = updateNotificationBadge;

/**
 * Notifications System
 */
function addNotification(userName, type, title, message, link = '') {
  if (!userName) return;
  const name = userName.trim();
  try {
    let raw = localStorage.getItem('gv_notifications') || '{}';
    let all;
    try {
      all = JSON.parse(raw);
      if (Array.isArray(all)) all = {};
    } catch(e) { all = {}; }

    if (!all[name]) all[name] = [];
    
    const newNotif = {
      id: Date.now() + Math.random(),
      type: type || 'info',
      title: title,
      message: message,
      link: link,
      date: new Date().toLocaleString('ar-EG'),
      read: false
    };
    
    all[name].push(newNotif);
    localStorage.setItem('gv_notifications', JSON.stringify(all));
    updateNotificationBadge();
  } catch(e) { console.error("addNotification Error:", e); }
}

function getNotifications(userName) {
  if (!userName) return [];
  const name = userName.trim();
  try {
    const raw = localStorage.getItem('gv_notifications') || '{}';
    let all;
    try {
      all = JSON.parse(raw);
      if (Array.isArray(all)) return [];
    } catch(e) { return []; }
    return all[name] || [];
  } catch(e) { return []; }
}
function markNotificationRead(userName, id) {
  if (!userName) return;
  const name = userName.trim();
  try {
    let raw = localStorage.getItem('gv_notifications') || '{}';
    let all;
    try {
      all = JSON.parse(raw);
      if (Array.isArray(all)) all = {};
    } catch(e) { all = {}; }

    if (all[name]) {
      const idx = all[name].findIndex(n => n.id === id);
      if (idx !== -1) all[name][idx].read = true;
      localStorage.setItem('gv_notifications', JSON.stringify(all));
      updateNotificationBadge();
    }
  } catch(e) { console.error("markNotificationRead Error:", e); }
}

function updateNotificationBadge() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!user) return;
  
  const notifs = getNotifications(user.name);
  const unreadCount = notifs.filter(n => !n.read).length;
  
  const badges = document.querySelectorAll('.nav-notif-badge');
  badges.forEach(b => {
    b.textContent = unreadCount;
    b.style.display = unreadCount > 0 ? 'flex' : 'none';
  });
}

// Update badge on load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(updateNotificationBadge, 500);
});

// Auto-check for new official videos when data is ready
window.addEventListener('firebaseDataReady', () => {
  setTimeout(checkNewVideoNotifications, 1000); // Small delay to ensure session is loaded
});

/**
 * Checks if there's a new official video and notifies the user if they're subscribed.
 */
function checkNewVideoNotifications() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!user) return;

  try {
    // 1. Check if user is subscribed (from localStorage managed in videos.js)
    const subscriptions = JSON.parse(localStorage.getItem('gv_subscriptions') || '{}');
    const isSubscribed = subscriptions[user.id] === true || subscriptions[String(user.id)] === true;
    if (!isSubscribed) return;

    // 2. Get latest official video
    const extraVideos = JSON.parse(localStorage.getItem('gv_extra_videos') || '[]');
    const officialVideos = extraVideos.filter(v => v.type === 'official');
    if (officialVideos.length === 0) return;

    // Sort to get newest
    officialVideos.sort((a, b) => (parseFloat(b.id) || 0) - (parseFloat(a.id) || 0));
    const latestVideo = officialVideos[0];

    // 3. Compare with last notified ID
    const lastNotifiedId = localStorage.getItem('gv_last_notified_video_id');
    if (String(latestVideo.id) !== lastNotifiedId) {
      // 4. Fire Notification
      const msg = `تم رفع فيديو رسمي جديد: ${latestVideo.name}`;
      const link = `watch.html?id=${latestVideo.id}`;
      
      addNotification(user.name, 'info', 'تنبيه القناة الرسمية', msg, link);
      
      // Update last notified ID to avoid double-firing
      localStorage.setItem('gv_last_notified_video_id', String(latestVideo.id));
      console.log("🔔 New video notification triggered for:", latestVideo.name);
    }
  } catch (e) {
    console.error("checkNewVideoNotifications Error:", e);
  }
}

function getGameBadge(game, allGames = []) {
  // ... (keep content same as before)
  if (!game || game.status === 'draft') return '';
  if (game.badge === 'free') return 'free';

  // 1. Priority: NEW (within last 7 days)
  if (game.dateAdded) {
    const now = new Date();
    const added = new Date(game.dateAdded);
    const diffTime = Math.abs(now - added);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Check if it's within the last 7 days
    if (diffDays <= 7) return 'new';
  }

  // 2. Trending (HOT) - based on highest views
  // If allGames is provided, we check if it's in the top 15% by views
  if (allGames && allGames.length > 5) {
    const viewsList = allGames.map(g => g.views || 0).sort((a, b) => b - a);
    const topPercentage = 0.15; // Top 15%
    const thresholdIdx = Math.max(0, Math.floor(viewsList.length * topPercentage));
    const threshold = viewsList[thresholdIdx] || 0;
    
    if ((game.views || 0) >= threshold && threshold > 0) return 'hot';
  } else {
    // Fallback if no relative data is available
    if ((game.views || 0) > 150000 || (game.downloads || 0) > 100000) return 'hot';
  }

  return game.badge || '';
}

function badgeLabel(b) {
  const labels = { 
    new: '<i class="fas fa-bolt" style="font-size:0.85em"></i> جديد', 
    hot: '<i class="fas fa-fire-alt" style="font-size:0.85em"></i> رائج', 
    free: '<i class="fas fa-gift" style="font-size:0.85em"></i> مجاني',
    early: '<i class="fas fa-rocket" style="font-size:0.85em"></i> وصول مبكر'
  };
  return labels[b] || b;
}

/**
 * Global Category Icons Mapping
 */
function getCategoryIcon(cat, fallbackEmoji = '') {
  const icons = {
    'أكشن': '<i class="fas fa-shield-halved"></i>',
    'رياضة': '<i class="fas fa-volleyball"></i>',
    'RPG': '<i class="fas fa-dragon"></i>',
    'هدوء': '<i class="fas fa-leaf"></i>',
    'إستراتيجية': '<i class="fas fa-chess-pawn"></i>',
    'مغامرات': '<i class="fas fa-mountain-sun"></i>',
    'رعب': '<i class="fas fa-ghost"></i>',
    'سباقات': '<i class="fas fa-flag-checkered"></i>',
    'تعليمية': '<i class="fas fa-graduation-cap"></i>',
    'محاكاة': '<i class="fas fa-vr-cardboard"></i>',
    'الكل': '<i class="fas fa-th-large"></i>'
  };
  return icons[cat] || fallbackEmoji || '<i class="fas fa-gamepad"></i>';
}

/**
 * Global Download Tracking
 */
function getGameDownloads(game) {
  if (!game) return 0;
  const simulated = JSON.parse(localStorage.getItem('gv_simulated_downloads') || '{}');
  const sessionValue = simulated[game.id] || 0;
  return (Number(game.downloads) || 0) + (Number(sessionValue) || 0);
}

function incrementGameDownload(gameId) {
  console.log('Incrementing download for:', gameId);
  const simulated = JSON.parse(localStorage.getItem('gv_simulated_downloads') || '{}');
  simulated[gameId] = (simulated[gameId] || 0) + 1;
  localStorage.setItem('gv_simulated_downloads', JSON.stringify(simulated));
  console.log('New simulated count for', gameId, 'is', simulated[gameId]);
  
  // Track for logged in user
  if (typeof incrementUserDownloads === 'function') {
    incrementUserDownloads();
  } else {
    // Fallback if auth.js isn't loaded yet
    const session = JSON.parse(localStorage.getItem('gv_session') || 'null');
    if (session) {
      session.downloads = (session.downloads || 0) + 1;
      localStorage.setItem('gv_session', JSON.stringify(session));
      
      const users = JSON.parse(localStorage.getItem('gv_users') || '[]');
      const idx = users.findIndex(u => u.id === session.id);
      if (idx !== -1) {
        users[idx].downloads = session.downloads;
        localStorage.setItem('gv_users', JSON.stringify(users));
      }
    }
  }

  // Also update the global count for old templates
  const globalCount = parseInt(localStorage.getItem('gv_download_count') || '0');
  localStorage.setItem('gv_download_count', globalCount + 1);

  // Update listing count if it exists
  const listEl = document.getElementById('game-download-count-' + gameId);
  if (listEl) {
    const baseVal = Number(listEl.getAttribute('data-base') || 0);
    listEl.innerHTML = `<i class="fas fa-download"></i>${formatNumber(baseVal + simulated[gameId])}`;
    console.log('Updated listEl for', gameId);
  }

  // Update modal count if it exists
  const modalEl = document.getElementById('game-download-count-modal-' + gameId);
  if (modalEl) {
    const baseVal = Number(modalEl.getAttribute('data-base') || 0);
    modalEl.textContent = formatNumber(baseVal + simulated[gameId]);
    console.log('Updated modalEl for', gameId);
  }

  // If we're on the game.html page, we might need to update the meta tag
  const metaDownloadEl = document.getElementById('gp-meta-download');
  if (metaDownloadEl) {
    const baseVal = Number(metaDownloadEl.getAttribute('data-base') || 0);
    metaDownloadEl.textContent = (baseVal + simulated[gameId]).toLocaleString('en-US');
    console.log('Updated metaDownloadEl for', gameId);
  }
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toString();
}
