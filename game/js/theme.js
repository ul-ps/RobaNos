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
        applyGlobalPreferences();
    });

    // Run when Firebase sync finishes
    window.addEventListener('firebaseDataReady', () => {
        console.log("Branding: Firebase Ready, applying...");
        applyDynamicBranding();
        applyGlobalPreferences();
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
    applyGlobalPreferences();

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

            // Update Social Links in Footer
            const socialMap = {
                'footer-discord': branding.socialDiscord,
                'footer-youtube': branding.socialYoutube,
                'footer-telegram': branding.socialTelegram,
                'footer-facebook': branding.socialFacebook
            };

            for (const [id, url] of Object.entries(socialMap)) {
                const el = document.getElementById(id);
                if (el) {
                    if (url) {
                        el.href = url;
                        el.style.display = 'flex';
                    } else {
                        el.style.display = 'none';
                    }
                }
            }
        } catch(e) { console.error("Branding Error:", e); }
    }

    function getBranding() {
        try {
            const globalSetting = JSON.parse(localStorage.getItem('gv_global_settings') || '{}');
            return {
                name: globalSetting.siteName || 'بوابة اللاعبين',
                logo: globalSetting.siteLogo || 'fas fa-gamepad',
                logoUrl: globalSetting.siteLogoUrl || '',
                logoUrlLight: globalSetting.siteLogoUrlLight || '',
                socialDiscord: globalSetting.socialDiscord || '',
                socialYoutube: globalSetting.socialYoutube || '',
                socialTelegram: globalSetting.socialTelegram || '',
                socialFacebook: globalSetting.socialFacebook || ''
            };
        } catch(e) {
            return { 
                name: 'بوابة اللاعبين', 
                logo: 'fas fa-gamepad', 
                logoUrl: '', 
                logoUrlLight: '',
                socialDiscord: '',
                socialYoutube: '',
                socialTelegram: '',
                socialFacebook: ''
            };
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
    'أكشن': '<i class="fas fa-crosshairs"></i>',
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

/**
 * Calculates a dynamic rating based on user reactions
 * Formula: BaseRating + ( (Likes*0.1 + Loves*0.2 - Sads*0.1 - Angrys*0.2) )
 * Capped between 1.0 and 5.0
 */
function getGameRating(game) {
  if (!game) return "4.5";
  
  // 1. Base Rating (defaulting to 4.5 if not found)
  let base = parseFloat(game.rating) || 4.5;
  
  // 2. Stronger Deterministic Variety (based on ID and Name)
  // This ensures that even with 0 reactions, games look different.
  const seedStr = (game.id || game.name || "").toString();
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Generate a shift between -0.7 and +0.4, biased towards positive
  const shifts = [-0.3, -0.2, 0.1, 0.2, 0.3, 0.4, -0.1, 0.5, -0.4, 0.2, 0.1];
  const variety = shifts[Math.abs(hash) % shifts.length] || 0;
  
  // 3. Interaction Score
  const reactions = JSON.parse(localStorage.getItem('gv_reactions_' + game.id) || '{"likes":0,"loves":0,"sads":0,"angrys":0}');
  const l = Number(reactions.likes || 0);
  const v = Number(reactions.loves || 0);
  const s = Number(reactions.sads || 0);
  const a = Number(reactions.angrys || 0);
  
  const interaction = (l * 0.05) + (v * 0.1) - (s * 0.1) - (a * 0.2);
  
  let final = base + variety + interaction;
  
  // Cap it
  if (final > 5.0) final = 5.0;
  if (final < 3.2) final = 3.2; // Keep them looking like "good" games generally
  
  return final.toFixed(1);
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
/**
 * applyGlobalPreferences
 * Handles Maintenance Mode and Visual FX Toggle systems.
 */
function applyGlobalPreferences() {
    try {
        const settings = JSON.parse(localStorage.getItem('gv_settings') || '{}');
        const globalSettings = JSON.parse(localStorage.getItem('gv_global_settings') || '{}');
        
        // 1. Visual FX Toggle
        const html = document.documentElement;
        if (settings.visualFX === false) {
            html.classList.add('gv-no-fx');
        } else {
            html.classList.remove('gv-no-fx');
        }

        // 2. Maintenance Mode
        const isMaint = globalSettings.maintenanceMode === true;
        const overlay = document.getElementById('gv-maintenance-overlay');
        const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        const isAdminUser = user && user.role === 'admin';
        
        // Always allow access to dashboard, auth page, or if user is admin
        const isAuthPage = window.location.pathname.includes('dashboard.html') || 
                           window.location.pathname.includes('auth.html');

        if (isMaint) {
            if (!isAdminUser && !isAuthPage) {
                showMaintenanceOverlay(globalSettings);
            } else {
                // Admin bypass or auth access
                if (overlay) overlay.remove();
                document.documentElement.classList.remove('gv-maintenance-locked');
                showAdminMaintenanceBanner();
            }
        } else {
            // Maintenance OFF: Clean up
            if (overlay) overlay.remove();
            document.documentElement.classList.remove('gv-maintenance-locked');
            removeAdminMaintenanceBanner();
        }
    } catch (e) { console.error("Global Preferences Error:", e); }
}

function showMaintenanceOverlay(globalSettings) {
    if (document.getElementById('gv-maintenance-overlay')) return;
    
    document.documentElement.classList.add('gv-maintenance-locked');
    
    const overlay = document.createElement('div');
    overlay.id = 'gv-maintenance-overlay';
    overlay.className = 'gv-maintenance-overlay';
    
    const branding = getBranding();
    const discord = globalSettings.socialDiscord || branding.socialDiscord;
    const telegram = globalSettings.socialTelegram || branding.socialTelegram;
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    
    // Secret Click System for Admin Tools
    let clickCount = 0;
    let clickTimer = null;

    overlay.innerHTML = `
        <div class="gv-maint-card">
            <div class="gv-maint-icon" id="gv-maint-trigger" style="cursor:pointer; transition:0.2s;" onmousedown="this.style.transform='scale(0.9)';" onmouseup="this.style.transform='scale(1)';">
                <i class="fas fa-tools"></i>
            </div>
            <h1 class="gv-maint-title">${branding.name} تحت الصيانة</h1>
            <p class="gv-maint-desc">
                نحن نعمل حالياً على تحسين تجربتك وتحديث خوادم المنصة. <br>
                سنعود إليكم في أقرب وقت ممكن بميزات جديدة ومثيرة!
            </p>
            <div class="gv-maint-socials">
                ${discord ? `<a href="${discord}" target="_blank" class="gv-maint-btn"><i class="fab fa-discord"></i> ديسكورد</a>` : ''}
                ${telegram ? `<a href="${telegram}" target="_blank" class="gv-maint-btn"><i class="fab fa-telegram"></i> تليجرام</a>` : ''}
                <a href="mailto:support@robanos.com" class="gv-maint-btn"><i class="fas fa-envelope"></i> الدعم الفني</a>
            </div>
            
            <div id="gv-maint-admin-box" style="display:none; margin-top:50px; flex-direction:column; gap:15px; align-items:center; animation: maintFadeIn 0.5s ease;">
                ${user ? `
                    <div style="color:#94a3b8; font-size:0.9rem;">
                        مرحباً ${user.name}، أنت مسجل دخول حالياً. <br>
                        <a href="#" onclick="if(typeof logout === 'function') logout(); return false;" style="color:#ef4444; text-decoration:underline; font-weight:700;">تسجيل الخروج</a> للتبديل للحساب المسؤول.
                    </div>
                ` : `
                    <a href="auth.html" style="color:rgba(255,255,255,0.4); text-decoration:none; font-size:0.85rem; border:1px solid rgba(255,255,255,0.1); padding:8px 20px; border-radius:20px; transition:0.3s;" onmouseover="this.style.color='#fff'; this.style.borderColor='#fff';" onmouseout="this.style.color='rgba(255,255,255,0.4)'; this.style.borderColor='rgba(255,255,255,0.1)';">
                        <i class="fas fa-user-shield"></i> تسجيل دخول المسؤول
                    </a>
                `}
            </div>

            <div style="margin-top:30px; font-size:0.8rem; color:rgba(255,255,255,0.2);">
                &copy; ${new Date().getFullYear()} ${branding.name}. جميع الحقوق محفوظة.
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Click handler for the secret trigger
    const trigger = document.getElementById('gv-maint-trigger');
    if (trigger) {
        trigger.addEventListener('click', () => {
            clickCount++;
            clearTimeout(clickTimer);
            
            // Show subtle feedback? No, keep it secret.
            
            if (clickCount >= 5) {
                document.getElementById('gv-maint-admin-box').style.display = 'flex';
                clickCount = 0;
            }
            
            clickTimer = setTimeout(() => { clickCount = 0; }, 2000); // Reset if not fast enough
        });
    }
}

// Export for dashboard to trigger updates
window.applyGlobalPreferences = applyGlobalPreferences;

function showAdminMaintenanceBanner() {
    if (document.getElementById('gv-admin-maint-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'gv-admin-maint-banner';
    banner.style.cssText = 'position:fixed; top:0; left:0; right:0; background:#f97316; color:#fff; text-align:center; padding:5px; font-size:12px; font-weight:800; z-index:999999; box-shadow:0 2px 10px rgba(0,0,0,0.3); pointer-events:none;';
    banner.innerHTML = '<i class="fas fa-exclamation-triangle"></i> وضع الصيانة مفعّل حالياً للزوار';
    document.body.appendChild(banner);
}

function removeAdminMaintenanceBanner() {
    const banner = document.getElementById('gv-admin-maint-banner');
    if (banner) {
        banner.remove();
    }
}
