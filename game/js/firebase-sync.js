// Global Firebase Sync Logic (v8 style - no modules for file:// support)
const SYNC_KEYS = [
  'gv_extra_games',
  'gv_extra_videos',
  'gv_submissions',
  'gv_upcoming_games',
  'gv_upcoming_notified',
  'gv_notifications',
  'gv_video_stats',
  'gv_user_reactions',
  'gv_subscriptions',
  'gv_simulated_downloads',
  'gv_simulated_views',
  'gv_download_count',
  'gv_global_settings',
  'gv_users',
  'gv_inbox',
  'gv_reports',
  'gv_settings',
  'gv_videos'
];

/**
 * Download all data from Firebase and save to localStorage
 */
async function syncFromFirebase() {
  const overlay = document.getElementById('fb-loading-overlay');
  if (overlay) overlay.style.display = 'flex';

  if (typeof firebase === 'undefined') {
    console.error("Firebase is not loaded yet.");
    showOfflineWarning();
    return;
  }
  
  try {
    const querySnapshot = await db.collection("appData").get();
    
    // Clear relevant localStorage keys to ensure "Online Only" source of truth
    SYNC_KEYS.forEach(key => localStorage.removeItem(key));
    
    querySnapshot.forEach((docSnap) => {
      const docData = docSnap.data();
      let dataValue;
      
      // Smart detection: 
      // 1. If document has a 'value' field, we use it (legacy/standard sync)
      // 2. If it has fields but no 'value', we stringify the whole object (for manual entries)
      if (docData.hasOwnProperty('value')) {
        dataValue = docData.value;
      } else {
        dataValue = JSON.stringify(docData);
      }
      
      originalSetItem.call(localStorage, docSnap.id, dataValue);
    });
    
    console.log("✅ Synced data from Firebase to localStorage");
    
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 500);
    }
    
    window.dispatchEvent(new Event('firebaseDataReady'));
  } catch (error) {
    console.error("❌ Error syncing from Firebase:", error);
    showOfflineWarning(error.message);
  }
}

function showOfflineWarning(msg) {
  const overlay = document.getElementById('fb-loading-overlay');
  if (overlay) {
    overlay.innerHTML = `
      <div style="text-align:center; padding:30px; background:rgba(15,15,20,0.9); border:1px solid rgba(255,100,100,0.2); border-radius:24px; max-width:400px; backdrop-filter:blur(20px);">
        <div style="font-size:3rem; margin-bottom:20px;">🌐</div>
        <h2 style="color:#fff; margin-bottom:10px;">عذراً، تعذر الاتصال</h2>
        <p style="color:var(--text-muted); margin-bottom:20px;">يجب أن تكون متصلاً بالإنترنت لاستخدام GameVault (وضع أونلاين فقط).</p>
        <button onclick="location.reload()" class="btn btn-grad" style="padding:10px 25px;">إعادة المحاولة</button>
        ${msg ? `<div style="font-size:0.7rem; color:#f87171; margin-top:15px; opacity:0.6;">Error: ${msg}</div>` : ''}
      </div>
    `;
  }
}

/**
 * Upload a specific key from localStorage to Firebase
 */
async function syncToFirebase(key) {
  if (!SYNC_KEYS.includes(key) && !key.startsWith('gv_reactions_') && !key.startsWith('gv_dl_')) return;
  if (typeof firebase === 'undefined') return;
  try {
    const data = localStorage.getItem(key);
    if (data === null) {
      // If deleted locally, delete from Firebase
      await db.collection("appData").doc(key).delete();
      console.log(`🗑️ Deleted ${key} from Firebase`);
      return;
    }
    
    await db.collection("appData").doc(key).set({
      value: data,
      updatedAt: new Date().toISOString()
    });
    console.log(`✅ Synced ${key} to Firebase`);
  } catch (error) {
    console.error(`❌ Error syncing ${key} to Firebase:`, error);
  }
}

/**
 * Sync everything from localStorage to Firebase (useful for initial migration)
 */
async function migrateLocalToFirebase() {
  if (typeof firebase === 'undefined') {
    alert("Firebase failed to load. Check your internet or browser console.");
    return;
  }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (SYNC_KEYS.includes(key) || key.startsWith('gv_reactions_') || key.startsWith('gv_dl_')) {
        const data = localStorage.getItem(key);
        if (data) {
          await db.collection("appData").doc(key).set({
            value: data,
            updatedAt: new Date().toISOString()
          });
        }
      }
    }
    console.log("✅ Full Migration to Firebase complete!");
  } catch (error) {
    alert("Error during migration: " + error.message);
    console.error("❌ Error during migration:", error);
  }
}

/**
 * Intercept localStorage.setItem to auto-sync to Firebase
 */
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  originalSetItem.apply(this, arguments);
  if (SYNC_KEYS.includes(key) || key.startsWith('gv_reactions_') || key.startsWith('gv_dl_')) {
    clearTimeout(window[`_syncTimeout_${key}`]);
    window[`_syncTimeout_${key}`] = setTimeout(() => {
      syncToFirebase(key);
    }, 500);
  }
};

// Make globally available
window.syncToFirebase = syncToFirebase;
window.migrateLocalToFirebase = migrateLocalToFirebase;
window.syncFromFirebase = syncFromFirebase;

// Inject Loading Overlay Styles and Element
(function injectOverlay() {
  if (document.getElementById('fb-loading-overlay')) return;
  
  const style = document.createElement('style');
  style.textContent = `
    #fb-loading-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: #04040f; z-index: 999999;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      transition: opacity 0.5s ease, visibility 0.5s ease;
    }
    .gv-loader-logo {
      font-size: 4rem;
      color: #7c3aed;
      margin-bottom: 15px;
      animation: pulseGlow 2s infinite ease-in-out;
      filter: drop-shadow(0 0 15px rgba(124,58,237,0.5));
    }
    .gv-loader-text {
      color: #fff; font-family: 'Exo 2', sans-serif; font-size: 2rem; font-weight: 800; letter-spacing: 2px;
      margin-bottom: 20px;
    }
    .gv-loader-dots {
      display: flex; gap: 8px;
    }
    .gv-loader-dots span {
      width: 10px; height: 10px; background: #06b6d4; border-radius: 50%;
      box-shadow: 0 0 10px rgba(6,182,212,0.5);
      animation: bounceDots 1.4s infinite ease-in-out both;
    }
    .gv-loader-dots span:nth-child(1) { animation-delay: -0.32s; }
    .gv-loader-dots span:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes pulseGlow {
      0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(124,58,237,0.5)); }
      50% { transform: scale(1.1); filter: drop-shadow(0 0 30px rgba(124,58,237,0.9)); color: #a855f7; }
    }
    @keyframes bounceDots {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
  
  const branding = (typeof getBranding === 'function') ? getBranding() : { name: 'بوابة اللاعبين', logo: 'fas fa-gamepad', logoUrl: '', logoUrlLight: '' };
  const isLightMode = document.documentElement.classList.contains('light-mode') || localStorage.getItem('gv_theme') === 'light';
  
  let activeLogoUrl = branding.logoUrl;
  if (isLightMode && branding.logoUrlLight) {
    activeLogoUrl = branding.logoUrlLight;
  }

  const overlay = document.createElement('div');
  overlay.id = 'fb-loading-overlay';

  let logoHtml = `<i class="${branding.logo} gv-loader-logo"></i>`;
  if (activeLogoUrl) {
    logoHtml = `<img src="${activeLogoUrl}" class="gv-loader-logo" style="height:100px; width:auto; object-fit:contain; margin-bottom:20px;">`;
  }

  overlay.innerHTML = `
    ${logoHtml}
    <div class="gv-loader-text">${branding.name}</div>
    <div class="gv-loader-dots">
      <span></span><span></span><span></span>
    </div>
  `;
  document.body.appendChild(overlay);
})();

// Auto-sync from Firebase on load
document.addEventListener("DOMContentLoaded", async () => {
  // Wait a small bit for firebase-config.js which is not a module anymore
  setTimeout(async () => {
    try {
      await syncFromFirebase();
    } catch (e) {
      console.error("Failed to sync from Firebase on load.", e);
      showOfflineWarning();
    }
  }, 50);
});
