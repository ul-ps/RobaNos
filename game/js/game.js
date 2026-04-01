/* ========================================================
   game.js — Individual Game Page Logic | RobaNos
======================================================== */

// Duplicated core data to avoid loading app.js DOM logic
let GAMES_DATA = [];


const CATEGORY_COLORS = {
  'أكشن': 'hsl(350,80%,15%), hsl(10,70%,10%)',
  'مغامرات': 'hsl(140,60%,15%), hsl(160,50%,10%)',
  'رياضة': 'hsl(210,80%,15%), hsl(230,70%,10%)',
  'RPG': 'hsl(280,60%,15%), hsl(300,50%,10%)',
  'إستراتيجية': 'hsl(40,80%,15%), hsl(20,70%,10%)',
  'هدوء': 'hsl(180,50%,15%), hsl(200,40%,10%)'
};

window.addEventListener('firebaseDataReady', () => {
  let allSources = [];
  try {
    const extraGames = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
    const extraVideos = JSON.parse(localStorage.getItem('gv_extra_videos') || '[]');
    const subs = JSON.parse(localStorage.getItem('gv_submissions') || '[]');

    // Merge everything to ensure the game is found regardless of categorization
    allSources = [...GAMES_DATA, ...extraGames, ...extraVideos, ...subs];
  } catch (e) {
    console.error("Data merge error:", e);
    allSources = [...GAMES_DATA];
  }

  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('id');

  const container = document.getElementById('game-container');

  if (!gameId) {
    container.innerHTML = '<div style="text-align:center;padding:100px;color:red;font-size:1.5rem">لم يتم تحديد اللعبة</div>';
    return;
  }

  // 1. Search for a published version first (Prioritize EXT_ games)
  const extraGames = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
  const extraVideos = JSON.parse(localStorage.getItem('gv_extra_videos') || '[]');
  const published = [...extraGames, ...extraVideos, ...GAMES_DATA].find(g => g.id == gameId || g.originalSubId == gameId);

  let game;
  let isPreview = false;

  if (published) {
    game = JSON.parse(JSON.stringify(published)); // Deep copy to avoid reference issues

    // DATA HEALING: If published version is missing videoUrl, look in submissions
    if (!game.videoUrl) {
      const subs = JSON.parse(localStorage.getItem('gv_submissions') || '[]');
      // Try to find the original submission by numeric ID or by name/category match
      const original = subs.find(s => s.subId == gameId || (s.name === game.name && s.videoUrl));
      if (original && original.videoUrl) {
        game.videoUrl = original.videoUrl;
        // PERMANENT REPAIR: Update the published record in storage
        const extra = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
        const idx = extra.findIndex(eg => eg.id === game.id);
        if (idx !== -1) {
          extra[idx].videoUrl = game.videoUrl;
          localStorage.setItem('gv_extra_games', JSON.stringify(extra));
          console.log(`✨ تم استرجاع فيديو اللعبة تلقائياً من سجلات الطلبات السابقة: ${game.name}`);
        }
      }
    }

    // URL REDIRECT: If accessed via old numeric ID but published EXT_ ID exists, update browser URL
    if (String(gameId) !== String(game.id)) {
      window.history.replaceState(null, '', `game.html?id=${game.id}`);
    }

    isPreview = false;
  } else {
    // 2. Fallback to submissions list
    const subs = JSON.parse(localStorage.getItem('gv_submissions') || '[]');
    const sub = subs.find(s => s.id == gameId || s.subId == gameId);
    if (sub) {
      game = sub;
      // Only show preview banner if it's still pending
      isPreview = (sub.status === 'pending');
    }
  }

  // REDIRECT CHECK: If this is a standalone video, redirect to watch page
  const isVideoSource = (typeof extraVideos !== 'undefined' ? extraVideos : []).some(v => v.id == gameId);
  
  if (game && (game.type === 'video' || game.type === 'official' || game.type === 'general' || isVideoSource)) {
    console.log("🔄 Redirecting video item to specialized watch page...");
    window.location.href = `watch.html?id=${game.id || gameId}`;
    return;
  }

  if (!game) {
    container.innerHTML = '<div style="text-align:center;padding:100px;color:red;font-size:1.5rem">اللعبة غير موجودة أو تم حذفها.</div>';
    return;
  }

  // Global array for slider
  currentMediaList = [];

  renderGameDetails(game);
  updateMetaTags(game);

  // If this is a preview, show a banner
  if (isPreview) {
    const header = document.querySelector('.gp-header');
    if (header) {
      const banner = document.createElement('div');
      banner.style.cssText = "background: #fbbf24; color: #000; text-align: center; padding: 12px; font-weight: bold; width: 100%; border-radius: 16px 16px 0 0; border: 2px dashed rgba(0,0,0,0.2);";
      banner.innerHTML = '<i class="fas fa-eye"></i> وضع المعاينة — هذه اللعبة لا تزال قيد المراجعة من قبل الإدارة';
      header.parentNode.insertBefore(banner, header);
    }
  }
});

function getEmbedUrl(url) {
  if (!url) return null;
  url = url.trim();

  // YouTube (standard, mobile, be, embed, shorts, share)
  const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|m\.youtube\.com\/watch\?v=)([^&\n?#]+)/);
  if (ytMatch && ytMatch[1]) {
    // Clean potential trailing junk from share parameters
    const cleanId = ytMatch[1].split(/[?&]/)[0];
    return `https://www.youtube.com/embed/${cleanId}?autoplay=0&rel=0&enablejsapi=1`;
  }

  // Vimeo
  const vimMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/)(\d+)/);
  if (vimMatch && vimMatch[1]) return `https://player.vimeo.com/video/${vimMatch[1]}`;

  // Direct Video Link (MP4, WebM, OGG)
  if (url.match(/\.(mp4|webm|ogg)(?:[?#]|$)/i)) return url;

  // Fallback: return the original url (e.g., custom embed or direct source)
  return url;
}

function renderGameDetails(g) {
  // Data Normalization (Fix for different naming conventions)
  if (g.video && !g.videoUrl) g.videoUrl = g.video;
  if (!g.screenshots && g.screenshot) g.screenshots = [g.screenshot];
  if (typeof g.screenshots === 'string') g.screenshots = [g.screenshots];
  if (Array.isArray(g.screenshots)) {
    g.screenshots = g.screenshots.filter(s => s && s.trim() !== '');
  }

  const container = document.getElementById('game-container');
  const currentRating = getGameRating(g);
  const colors = CATEGORY_COLORS[g.category] || 'hsl(260,50%,12%), hsl(280,40%,9%)';

  let coverHtml = '';
  if (g.imageUrl) {
    coverHtml = `<div class="gp-cover" style="background-image:url('${g.imageUrl}');"></div>`;
  } else {
    coverHtml = `<div class="gp-cover" style="background:linear-gradient(135deg, ${colors});text-shadow:0 0 40px rgba(0,0,0,0.5)">${getCategoryIcon(g.category, g.emoji)}</div>`;
  }

  let submitterHtml = '';
  if (g.submittedBy) {
    submitterHtml = `
      <div class="gp-section">
        <h3 class="gp-section-title"><i class="fas fa-user-circle"></i> المساهم</h3>
        <div class="gp-submitter" onclick="window.location.href='user.html?user=${encodeURIComponent(g.submittedBy)}'" style="display:flex;align-items:center;gap:15px;padding:15px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:16px;cursor:pointer; transition:all 0.3s" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 20px rgba(168,85,247,0.15)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'" title="زيارة ملف المساهم">
          <div class="gp-sub-avatar" style="width:48px;height:48px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;color:white;font-size:1.3rem;font-weight:bold;flex-shrink:0;"><i class="fas fa-user-astronaut"></i></div>
          <div style="flex:1; overflow:hidden;">
            <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:4px">رُفعت بواسطة</div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${g.submittedBy}</div>
          </div>
          <i class="fas fa-chevron-left" style="color:var(--primary-light);font-size:0.9rem"></i>
        </div>
      </div>
    `;
  }

  currentMediaList = [];
  const embedUrl = getEmbedUrl(g.videoUrl);
  if (embedUrl) {
    currentMediaList.push({ type: 'video', url: embedUrl, rawUrl: g.videoUrl });
  }
  if (g.screenshots && g.screenshots.length > 0) {
    g.screenshots.forEach(s => currentMediaList.push({ type: 'image', url: s }));
  }

  let screensHtml = '';
  if (currentMediaList.length > 0) {
    currentScreenshotIndex = 0;

    const thumbs = currentMediaList.map((m, i) => {
      let thumbBg = m.type === 'video' ? (getVideoThumb(g.videoUrl) || g.imageUrl || 'https://images.unsplash.com/photo-1616565697627-82ea575b5baf?auto=format&fit=crop&q=80') : m.url;
      let overlay = m.type === 'video' ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:white;border-radius:10px;"><i class="fas fa-play"></i></div>` : '';
      return `
        <div class="gp-thumb ${i === 0 ? 'active' : ''}" style="position:relative; width:110px; height:70px; border-radius:12px; background:url('${thumbBg}') center/cover no-repeat; cursor:pointer; border:2px solid ${i === 0 ? 'var(--primary-light)' : 'transparent'}; opacity:${i === 0 ? '1' : '0.5'}; transition:all 0.3s; flex-shrink:0" onclick="window.changeSpotlight(this, ${i})">
          ${overlay}
        </div>
      `;
    }).join('');

    let initialSpotlight = '';
    if (currentMediaList[0].type === 'video') {
      const url = currentMediaList[0].url;
      if (url.match(/\.(mp4|webm|ogg)(?:[?#]|$)/i)) {
        const playerId = 'plyr-init-' + Date.now();
        initialSpotlight = `<video id="${playerId}" src="${url}" playsinline controls controlsList="nodownload" oncontextmenu="return false;" autoplay style="width:100%; height:100%; border:none; object-fit:contain; border-radius:15px; background:#000;"></video>`;
        setTimeout(() => {
          loadPlyr(() => { new Plyr(`#${playerId}`, { controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'fullscreen'] }); });
        }, 100);
      } else {
        initialSpotlight = `<iframe src="${url}" style="width:100%; height:100%; border:none;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      }
    }
    let initialBg = currentMediaList[0].type === 'image'
      ? `background-image:url('${currentMediaList[0].url}'); background-position:center; background-size:cover; background-repeat:no-repeat; background-color:transparent;`
      : `background-image:none; background-color:#000;`;

    screensHtml = `
      <div class="gp-section">
        <h3 class="gp-section-title"><i class="fas fa-images"></i> صور وعرض للعبة</h3>
        
        <!-- Main Spotlight Slider Container -->
        <div class="gp-slider-container" style="position:relative; width:100%; aspect-ratio:16/9; max-height:480px; border-radius:16px; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.4);">
          <div id="gp-spotlight" style="width:100%; height:100%; ${initialBg} transition:opacity 0.2s ease-in-out;">
            ${initialSpotlight}
          </div>
          
          <!-- Arrows -->
          <button class="slider-arrow prev" onclick="moveGalleryBy(-1)" style="position:absolute; top:50%; right:15px; transform:translateY(-50%); background:rgba(0,0,0,0.5); border:none; color:white; width:45px; height:45px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1.2rem; backdrop-filter:blur(5px); transition:all 0.3s; z-index:10;"><i class="fas fa-chevron-right"></i></button>
          <button class="slider-arrow next" onclick="moveGalleryBy(1)" style="position:absolute; top:50%; left:15px; transform:translateY(-50%); background:rgba(0,0,0,0.5); border:none; color:white; width:45px; height:45px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1.2rem; backdrop-filter:blur(5px); transition:all 0.3s; z-index:10;"><i class="fas fa-chevron-left"></i></button>
        </div>
        
        <!-- Thumbnails Strip -->
        <div id="gp-thumbnails" style="display:flex; gap:12px; margin-top:20px; overflow-x:auto; padding-bottom:8px; scroll-snap-type: x mandatory; max-width: 100%; -webkit-overflow-scrolling: touch;">
          ${thumbs}
        </div>
        <style>
          #gp-thumbnails::-webkit-scrollbar { height: 6px; }
          #gp-thumbnails::-webkit-scrollbar-track { background:rgba(255,255,255,0.02); border-radius:6px; }
          #gp-thumbnails::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15); border-radius:6px; }
          #gp-thumbnails::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,0.3); }
          .gp-thumb:hover { opacity: 1 !important; transform: scale(1.05); }
          .slider-arrow:hover { background:var(--primary) !important; transform: translateY(-50%) scale(1.1) !important; }
        </style>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- Header -->
    <div class="gp-header">
      ${coverHtml}
      <div class="gp-info">
        <h1 class="gp-title">
          ${g.name}
          ${(() => {
      const b = getGameBadge(g, GAMES_DATA);
      return b ? `<span class="game-badge badge-${b}" style="position:static; padding:4px 12px; font-size:0.9rem; margin-right:15px; vertical-align:middle; display:inline-flex; transform:translateY(-2px); border-radius:8px;">${badgeLabel(b)}</span>` : '';
    })()}
        </h1>
        <div class="gp-meta">
          ${g.company ? `<div class="gp-meta-tag"><i class="fas fa-building"></i> ${g.company}</div>` : ''}
          ${(g.platforms || ['Windows']).map(p => `<div class="gp-meta-tag"><i class="${getPlatformIcon(p)}"></i> ${getPlatformLabel(p)}</div>`).join('')}
          <div class="gp-meta-tag"><i class="fas fa-tag"></i> ${g.category}</div>
          <div class="gp-meta-tag"><i class="fas fa-star" style="color:#fbbf24"></i> ${currentRating}/5</div>
          <div class="gp-meta-tag"><i class="fas fa-download"></i> <span id="gp-meta-download" data-base="${g.downloads}">${getGameDownloads(g).toLocaleString('en-US')}</span></div>
          <div class="gp-meta-tag"><i class="fas fa-hdd"></i> ${g.size}</div>
        </div>
        <div class="gp-actions" style="margin-top: 30px; display:flex; gap: 12px; flex-wrap: wrap;">
          ${renderDownloadLinks(g.links || [{ type: 'مباشر', url: g.link || '#' }], g.id)}
          <button class="share-game-btn" onclick="shareGame('${g.name.replace(/'/g, "\\'")}')" title="مشاركة اللعبة">
            <i class="fas fa-share-nodes"></i>
            <span>مشاركة</span>
          </button>
        </div>

        <div class="gp-reactions-container" style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
          ${(() => {
      const reacts = JSON.parse(localStorage.getItem('gv_reactions_' + g.id) || '{"likes":0,"loves":0,"sads":0,"angrys":0}');
      const uReact = JSON.parse(localStorage.getItem('gv_user_reactions') || '{}')[g.id];

      const likeStyle = uReact === 'like' ? 'color:var(--primary-light); background:rgba(124,58,237,0.15); border-color:var(--primary-light);' : '';
      const loveStyle = uReact === 'love' ? 'color:#ef4444; background:rgba(239,68,68,0.15); border-color:#ef4444;' : '';
      const sadStyle = uReact === 'sad' ? 'color:#3b82f6; background:rgba(59,130,246,0.15); border-color:#3b82f6;' : '';
      const angryStyle = uReact === 'angry' ? 'color:#f97316; background:rgba(249,115,22,0.15); border-color:#f97316;' : '';

      return `
              <button class="share-game-btn react-btn" onclick="toggleReaction('${String(g.id).replace(/'/g, "\\'")}', 'like')" title="إعجاب" style="flex:1; min-width:80px; justify-content:center; ${likeStyle}" id="react-btn-like">
                <i class="${uReact === 'like' ? 'fas' : 'far'} fa-thumbs-up"></i>
                <span id="react-count-like">${reacts.likes > 0 ? reacts.likes : ''}</span>
              </button>
              <button class="share-game-btn react-btn" onclick="toggleReaction('${String(g.id).replace(/'/g, "\\'")}', 'love')" title="أحببته" style="flex:1; min-width:80px; justify-content:center; ${loveStyle}" id="react-btn-love">
                <i class="${uReact === 'love' ? 'fas' : 'far'} fa-heart"></i>
                <span id="react-count-love">${reacts.loves > 0 ? reacts.loves : ''}</span>
              </button>
              <button class="share-game-btn react-btn" onclick="toggleReaction('${String(g.id).replace(/'/g, "\\'")}', 'sad')" title="لم يعجبني" style="flex:1; min-width:80px; justify-content:center; ${sadStyle}" id="react-btn-sad">
                <i class="${uReact === 'sad' ? 'fas' : 'far'} fa-sad-tear"></i>
                <span id="react-count-sad">${reacts.sads > 0 ? reacts.sads : ''}</span>
              </button>
              <button class="share-game-btn react-btn" onclick="toggleReaction('${String(g.id).replace(/'/g, "\\'")}', 'angry')" title="أغضبني" style="flex:1; min-width:80px; justify-content:center; ${angryStyle}" id="react-btn-angry">
                <i class="${uReact === 'angry' ? 'fas' : 'far'} fa-angry"></i>
                <span id="react-count-angry">${reacts.angrys > 0 ? reacts.angrys : ''}</span>
              </button>
            `;
    })()}
        </div>
      </div>
    </div>

    <!-- Body -->
    <div class="gp-body">
      
      <!-- Left (Main Content) -->
      <div>
        ${screensHtml}

        <div class="gp-section">
          <h3 class="gp-section-title"><i class="fas fa-align-right"></i> عن اللعبة</h3>
          <div class="gp-desc">${g.desc}</div>
        </div>

        <div id="comments-wrapper">
          <div class="gp-section" id="comments-section" style="margin-top: 50px;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom: 30px;">
              <div style="width:40px; height:40px; border-radius:12px; background:rgba(168,85,247,0.1); color:var(--primary-light); display:flex; align-items:center; justify-content:center; font-size:1.2rem;">
                <i class="fas fa-comments"></i>
              </div>
              <h3 style="font-family:'Rajdhani',sans-serif; font-size:1.6rem; font-weight:700; color:#fff; margin:0;">
                التعليقات والمراجعات <span style="font-size:1.1rem; color:var(--text-muted); background:rgba(255,255,255,0.05); padding:4px 10px; border-radius:20px; font-family:sans-serif" id="comments-count">0</span>
              </h3>
            </div>
            
            <div id="comment-input-area">
              <!-- Dynamically loaded based on Auth -->
            </div>
            
            <div id="comments-list" style="display:flex; flex-direction:column;">
              <!-- Comments load here -->
            </div>
          </div>
        </div>
      </div>

      <!-- Right (Sidebar) -->
      <div class="gp-sidebar-sticky">
        ${submitterHtml}
        
        <div class="gp-section">
          <h3 class="gp-section-title"><i class="fas fa-shield-alt"></i> آمنة للتحميل</h3>
          <p class="gp-desc" style="font-size:0.9rem">
            كل الملفات المعروضة في المنصة خضعت للمراجعة من قبل مشرفي <strong>RobaNos</strong> للتأكد من خلوها من البرمجيات الخبيثة.
          </p>
        </div>

        <div class="gp-section" style="text-align:center;padding:20px">
          <button style="background:transparent;border:none;color:#f87171;font-family:inherit;font-size:0.9rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;width:100%" onclick="reportGame()">
            <i class="fas fa-flag"></i> الإبلاغ عن مشكلة في هذه اللعبة
          </button>
        </div>
      </div>

    </div>
  `;

  setTimeout(() => {
    const settings = JSON.parse(localStorage.getItem('gv_settings') || '{"allowComments":true}');
    const wrapper = document.getElementById('comments-wrapper');
    if (wrapper) {
      if (settings.allowComments) {
        renderComments(g.id);
      } else {
        wrapper.innerHTML = `
          <div class="gp-section" style="margin-top: 50px; text-align:center; padding:40px; background:rgba(255,255,255,0.02); border-radius:20px; border:1px dashed rgba(255,255,255,0.1)">
            <div style="font-size:2rem; margin-bottom:15px; opacity:0.5">💬</div>
            <h4 style="color:var(--text-muted)">التعليقات مغلقة حالياً من قبل الإدارة</h4>
          </div>
        `;
      }
    }
  }, 0);
}

// ==========================================
// COMMENTS SYSTEM
// ==========================================
function getComments() {
  return JSON.parse(localStorage.getItem('gv_comments') || '{}');
}

function saveComments(data) {
  localStorage.setItem('gv_comments', JSON.stringify(data));
}

function calculateTotalComments(comments) {
  let total = comments.length;
  comments.forEach(c => {
    if (c.replies) total += c.replies.length;
  });
  return total;
}

function renderComments(gameId) {
  const all = getComments();
  const gameComments = all[gameId] || [];
  const totalCount = calculateTotalComments(gameComments);

  const countEl = document.getElementById('comments-count');
  if (countEl) countEl.textContent = totalCount;

  // Render Input Area dynamically
  const currUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const inputEl = document.getElementById('comment-input-area');

  if (inputEl) {
    if (currUser) {
      const currAvatar = currUser.avatar || currUser.name.charAt(0).toUpperCase();
      inputEl.innerHTML = `
        <div class="comment-input-wrapper">
          <div class="comment-avatar-circle">
            ${currAvatar.length === 1 ? currAvatar : '<i class="fas fa-user"></i>'}
          </div>
          <div style="flex:1; position:relative; width:100%;">
            <textarea id="comment-input" placeholder="شاركنا رأيك وتقييمك الاستثنائي لهذه اللعبة..." onfocus="this.style.borderColor='var(--primary-light)';this.style.background='rgba(255,255,255,0.04)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)';this.style.background='rgba(255,255,255,0.02)'"></textarea>
            <div style="display:flex; justify-content:flex-end; margin-top:12px;">
               <button class="btn-primary" style="padding:10px 28px; font-weight:700; border-radius:12px; font-size:0.95rem; cursor:pointer;" onclick="submitGameComment('${gameId}')">نشر التعليق</button>
            </div>
          </div>
        </div>
      `;
    } else {
      inputEl.innerHTML = `
        <div style="background:var(--bg-card); border:1px dashed var(--border); border-radius:16px; padding:35px 20px; text-align:center; margin-bottom:40px;">
           <div style="font-size:2.5rem; margin-bottom:12px; opacity:0.8">💬</div>
           <h4 style="color:var(--text); margin-bottom:8px; font-size:1.2rem; font-weight:700;">شارك في حوار المجتمع</h4>
           <p style="color:var(--text-muted); font-size:0.95rem; margin-bottom:20px;">قم بتسجيل الدخول لتتمكن من إضافة تقييمك ورأيك حول هذه اللعبة للجميع.</p>
           <a href="auth.html" class="btn-primary" style="display:inline-block; padding:12px 30px; border-radius:12px; text-decoration:none; font-weight:700;">تسجيل الدخول</a>
        </div>
      `;
    }
  }

  const list = document.getElementById('comments-list');
  if (!list) return;

  if (gameComments.length === 0) {
    list.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--text-muted); font-size:1rem; background:rgba(255,255,255,0.01); border-radius:16px; border:1px solid rgba(255,255,255,0.02)">لا توجد مراجعات حتى الآن. كن أول من يكتب رأيه!</div>`;
    return;
  }

  const isAdminUser = typeof isAdmin === 'function' ? isAdmin() : false;
  const sorted = [...gameComments].reverse();

  list.innerHTML = sorted.map((c, i) => {
    const canDeleteMain = currUser && (currUser.name === c.user || isAdminUser);
    const repliesHtml = (c.replies || []).map(r => {
      const canDeleteReply = currUser && (currUser.name === r.user || isAdminUser);
      return `
        <div class="reply-item">
          <div class="reply-avatar-sm">
            ${r.avatar.length === 1 ? r.avatar : '<i class="fas fa-user text-xs"></i>'}
          </div>
          <div class="reply-body">
            <div class="reply-header">
              <div class="reply-user">${r.user}</div>
              <div style="display:flex; gap:10px; align-items:center;">
                <button class="reply-trigger-btn" style="padding:2px 8px; font-size:0.75rem;" onclick="replyToUser(this, '${c.id}', '${r.user}')">
                  <i class="fas fa-reply"></i> رد
                </button>
                ${canDeleteReply ? `
                  <button class="comment-delete-btn" style="padding:2px 8px; font-size:0.75rem;" onclick="deleteComment('${gameId}', '${r.id}', '${c.id}')">
                    <i class="fas fa-trash-alt"></i> حذف
                  </button>
                ` : ''}
              </div>
            </div>
            <div class="reply-text">${r.text}</div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="comment-item-wrapper">
        <div class="comment-main-row">
          <div class="comment-avatar">
            ${c.avatar.length === 1 ? c.avatar : '<i class="fas fa-user-astronaut"></i>'}
          </div>
          <div class="comment-content">
            <div class="comment-header">
              <div class="comment-user-info">
                <a href="user.html?user=${encodeURIComponent(c.user)}" class="comment-user">${c.user}</a>
                <span class="comment-date"><i class="far fa-clock" style="margin-left:4px"></i>${c.date}</span>
              </div>
              ${canDeleteMain ? `
                <button class="comment-delete-btn" onclick="deleteComment('${gameId}', '${c.id}')">
                  <i class="fas fa-trash-alt"></i> حذف
                </button>
              ` : ''}
            </div>
            <div class="comment-text">${c.text}</div>
            <div class="comment-actions">
              <button class="reply-trigger-btn" onclick="showReplyInput(this, '${c.id}')">
                <i class="fas fa-reply"></i> رد
              </button>
            </div>
          </div>
        </div>

        <div id="replies-container-${c.id}" class="replies-section" style="${(c.replies && c.replies.length > 0) ? '' : 'display:none'}">
          ${repliesHtml}
        </div>

        <div id="reply-form-${c.id}" class="reply-form-container">
          <textarea id="reply-input-${c.id}" class="reply-textarea" placeholder="اكتب رداً علنياً..."></textarea>
          <div class="reply-btns">
            <button class="btn-cancel" onclick="cancelReply(this, '${c.id}')">إلغاء</button>
            <button class="btn-reply-submit" onclick="submitReply(this, '${gameId}', '${c.id}')">رد</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.showReplyInput = function (el, commentId) {
  const container = el.closest('.comment-item-wrapper');
  const wrapper = container.querySelector('.reply-form-container');
  if (wrapper) {
    const isActive = wrapper.classList.contains('active');
    document.querySelectorAll('.reply-form-container').forEach(w => w.classList.remove('active'));
    if (!isActive) {
      wrapper.classList.add('active');
      const input = wrapper.querySelector('.reply-textarea');
      if (input) setTimeout(() => input.focus(), 100);
    }
  }
};

window.cancelReply = function (el, commentId) {
  const container = el.closest('.comment-item-wrapper');
  const wrapper = container.querySelector('.reply-form-container');
  if (wrapper) {
    wrapper.classList.remove('active');
    const input = wrapper.querySelector('.reply-textarea');
    if (input) input.value = '';
  }
};

window.replyToUser = function (el, parentId, username) {
  const mainWrapper = el.closest('.comment-item-wrapper');
  const wrapper = mainWrapper.querySelector('.reply-form-container');
  if (wrapper) {
    wrapper.classList.add('active');
    const input = wrapper.querySelector('.reply-textarea');
    if (input) {
      input.value = `@${username} `;
      setTimeout(() => {
        input.focus();
        input.selectionStart = input.selectionEnd = input.value.length;
      }, 100);
    }
  }
};

window.submitReply = function (el, gameId, parentId) {
  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!currentUser) {
    showToast("❌ يجب تسجيل الدخول للرد", 'error');
    return;
  }

  const container = el.closest('.comment-item-wrapper');
  const input = container.querySelector('.reply-textarea');
  const text = input ? input.value.trim() : '';

  if (!text) return;

  const all = getComments();
  if (!all[gameId]) return;

  const parent = all[gameId].find(c => c.id == parentId);
  if (!parent) return;

  if (!parent.replies) parent.replies = [];

  parent.replies.push({
    id: Date.now(),
    user: currentUser.name,
    avatar: currentUser.avatar || currentUser.name.charAt(0).toUpperCase(),
    text: text.replace(/</g, "&lt;").replace(/>/g, "&gt;"),
    date: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
  });

  saveComments(all);
  renderComments(gameId);
  if (typeof showToast === 'function') showToast('✅ تم إضافة ردك بنجاح', 'success');
};

window.showCustomConfirm = function ({ title, msg, icon, onConfirm, type }) {
  const overlay = document.getElementById('gv-custom-confirm-overlay');
  if (!overlay) return;

  const titleEl = document.getElementById('gv-confirm-title');
  const msgEl = document.getElementById('gv-confirm-msg');
  const iconEl = document.getElementById('gv-confirm-icon');
  const yesBtn = document.getElementById('gv-confirm-yes');

  if (titleEl) titleEl.textContent = title || 'تأكيد الإجراء';
  if (msgEl) msgEl.textContent = msg || 'هل أنت متأكد؟';

  if (iconEl) {
    iconEl.innerHTML = `<i class="fas ${icon || 'fa-exclamation-triangle'}"></i>`;
    if (type === 'danger') {
      iconEl.style.background = 'rgba(239, 68, 68, 0.1)';
      iconEl.style.color = '#ef4444';
      iconEl.style.border = '1px solid rgba(239, 68, 68, 0.2)';
      yesBtn.style.background = '#ef4444';
    } else {
      iconEl.style.background = 'rgba(124, 58, 237, 0.1)';
      iconEl.style.color = 'var(--primary-light)';
      iconEl.style.border = '1px solid rgba(124, 58, 237, 0.2)';
      yesBtn.style.background = 'var(--primary)';
    }
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

window.closeCustomConfirm = function () {
  const overlay = document.getElementById('gv-custom-confirm-overlay');
  if (!overlay) return;
  overlay.style.opacity = '0';
  overlay.style.visibility = 'hidden';
  overlay.querySelector('.gv-confirm-card').style.transform = 'translateY(20px) scale(0.95)';
  setTimeout(() => {
    overlay.style.display = 'none';
  }, 300);
};

window.deleteComment = function (gameId, commentId, parentId = null) {
  showCustomConfirm({
    title: 'حذف التعليق',
    msg: 'هل أنت متأكد من رغبتك في حذف هذا التعليق؟ لا يمكن التراجع عن هذا الإجراء.',
    icon: 'fa-trash-alt',
    type: 'danger',
    onConfirm: () => {
      const all = getComments();
      if (!all[gameId]) return;

      if (parentId) {
        const parent = all[gameId].find(c => c.id == parentId);
        if (parent && parent.replies) {
          parent.replies = parent.replies.filter(r => r.id != commentId);
        }
      } else {
        all[gameId] = all[gameId].filter(c => c.id != commentId);
      }

      saveComments(all);
      renderComments(gameId);
      if (typeof showToast === 'function') showToast('✅ تم حذف التعليق بنجاح', 'success');
    }
  });
};

// GALLERY SLIDER LOGIC
let currentScreenshotIndex = 0;
let currentMediaList = [];

function getVideoThumb(url) {
  if (!url) return '';
  // YouTube (standard, mobile, be, embed, shorts)
  let match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtu\.be\/)([^&\n?#]+)/);
  if (match && match[1]) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  return '';
}

window.changeSpotlight = function (el, index) {
  const spotlight = document.getElementById('gp-spotlight');
  if (!spotlight || currentMediaList.length === 0) return;

  spotlight.style.opacity = '0.3';
  if (window.spT) clearTimeout(window.spT);
  currentScreenshotIndex = index;
  const m = currentMediaList[index];

  if (m.type === 'video') {
    spotlight.style.backgroundImage = 'none';
    spotlight.style.backgroundColor = '#000';
    if (m.url.match(/\.(mp4|webm|ogg)(?:[?#]|$)/i)) {
      const playerId = 'plyr-change-' + Date.now();
      spotlight.innerHTML = `<video id="${playerId}" src="${m.url}" playsinline controls controlsList="nodownload" oncontextmenu="return false;" autoplay style="width:100%; height:100%; border:none; object-fit:contain; border-radius:15px;"></video>`;
      loadPlyr(() => { new Plyr(`#${playerId}`, { controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'fullscreen'] }); });
    } else {
      spotlight.innerHTML = `<iframe src="${m.url}" style="width:100%; height:100%; border:none;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
  } else {
    spotlight.innerHTML = '';
    spotlight.style.backgroundImage = `url('${m.url}')`;
    spotlight.style.backgroundPosition = 'center';
    spotlight.style.backgroundSize = 'cover';
    spotlight.style.backgroundRepeat = 'no-repeat';
    spotlight.style.backgroundColor = 'transparent';
  }

  // Update active state on thumbnails
  const allThumbs = document.querySelectorAll('.gp-thumb');
  allThumbs.forEach(th => {
    th.style.borderColor = 'transparent';
    th.style.opacity = '0.5';
    th.classList.remove('active');
  });

  window.spT = setTimeout(() => { spotlight.style.opacity = '1'; }, 150);
  if (allThumbs[index]) {
    allThumbs[index].style.borderColor = 'var(--primary-light)';
    allThumbs[index].style.opacity = '1';
    allThumbs[index].classList.add('active');
    // Scroll into view if needed
    if (!el) {
      const parent = document.getElementById('gp-thumbnails'); if (parent) { const pRect = parent.getBoundingClientRect(); const tRect = allThumbs[index].getBoundingClientRect(); const centerOffset = (tRect.left + tRect.width / 2) - (pRect.left + pRect.width / 2); parent.scrollBy({ left: centerOffset, behavior: 'smooth' }); }
    }
  }
};

window.moveGalleryBy = function (dir) {
  if (currentMediaList.length === 0) return;

  currentScreenshotIndex += dir;

  // Wrap around
  if (currentScreenshotIndex < 0) currentScreenshotIndex = currentMediaList.length - 1;
  if (currentScreenshotIndex >= currentMediaList.length) currentScreenshotIndex = 0;

  window.changeSpotlight(null, currentScreenshotIndex);
};

function submitGameComment(gameId) {
  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!currentUser) {
    alert("❌ عذراً، يجب عليك تسجيل الدخول أولاً لتتمكن من إضافة تعليقك.");
    return;
  }

  const input = document.getElementById('comment-input');
  const text = input.value.trim();

  if (!text) {
    if (typeof showToast === 'function') showToast('⚠️ الرجاء كتابة محتوى التعليق أولاً.', 'warning');
    return;
  }

  const all = getComments();
  if (!all[gameId]) all[gameId] = [];

  const newComment = {
    id: Date.now(),
    user: currentUser.name,
    avatar: currentUser.avatar || currentUser.name.charAt(0).toUpperCase(),
    text: text.replace(/</g, "&lt;").replace(/>/g, "&gt;"),
    date: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }),
    replies: []
  };

  all[gameId].push(newComment);
  saveComments(all);

  input.value = '';
  renderComments(gameId);
  if (typeof showToast === 'function') showToast('✅ تم نشر تعليقك بنجاح!', 'success');
}

// Link Renderer
function renderDownloadLinks(links, gameId) {
  return links.map(l => {
    let icon = 'fa-cloud-download-alt';
    let gradient = 'linear-gradient(135deg, var(--primary), var(--accent))';
    if (l.type === 'تورنت') {
      icon = 'fa-magnet';
      gradient = 'linear-gradient(135deg, #059669, #10b981)';
    } else if (l.type === 'جوجل درايف') {
      icon = 'fa-brands fa-google-drive';
      gradient = 'linear-gradient(135deg, #2563eb, #3b82f6)';
    } else if (l.type === 'ميديا فاير') {
      icon = 'fa-fire';
      gradient = 'linear-gradient(135deg, #dc2626, #ef4444)';
    }

    return `
      <button class="gp-download-btn" style="background:${gradient}; border:none; cursor:pointer;" onclick="window.handleDownloadClick(event, this, '${l.url}', '${gameId}')">
        <i class="fas ${icon}"></i> <span>تحميل ${l.type}</span>
      </button>
    `;
  }).join('');
}

window.handleDownloadClick = function (e, btn, url, gameId) {
  if (btn.classList.contains('loading')) return; // Already in progress

  e.preventDefault();
  btn.classList.add('loading');

  const colors = {
    3: 'linear-gradient(135deg, #f97316, #ef4444)', // Orange-Red
    2: 'linear-gradient(135deg, #eab308, #f59e0b)', // Gold-Yellow
    1: 'linear-gradient(135deg, #10b981, #059669)', // Emerald-Green
    0: 'linear-gradient(135deg, #7c3aed, #a855f7)'  // Primary Purple (Finish)
  };

  // Add countdown overlay
  const overlay = document.createElement('div');
  overlay.className = 'download-count-overlay';
  overlay.style.background = colors[3];
  overlay.innerHTML = '3';
  btn.appendChild(overlay);

  // Trigger CSS progress bar
  setTimeout(() => btn.classList.add('active'), 10);

  let count = 3;
  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      overlay.style.background = colors[count];
      overlay.innerHTML = count;
    } else {
      clearInterval(timer);
      overlay.style.background = colors[0];
      overlay.innerHTML = '<i class="fas fa-check"></i>';

      // Perform actual increment and download
      if (typeof incrementGameDownload === 'function') {
        incrementGameDownload(gameId);
      }

      // Update UI count if element exists
      const countEl = document.getElementById('gp-meta-download');
      if (countEl) {
        let current = parseInt(countEl.textContent.replace(/,/g, '')) || 0;
        countEl.textContent = (current + 1).toLocaleString('en-US');
      }

      // Final step: trigger download
      window.open(url, '_blank');

      // Reset button after success
      setTimeout(() => {
        btn.classList.remove('loading', 'active');
        overlay.remove();
      }, 1500);
    }
  }, 1000);
};

// Helper for platforms
function getPlatformIcon(platform) {
  const map = {
    'Windows': 'fa-brands fa-windows',
    'Android': 'fa-brands fa-android',
    'Mac': 'fa-brands fa-apple',
    'iOS': 'fa-brands fa-apple',
    'Linux': 'fa-brands fa-linux',
    'Web': 'fas fa-globe',
    'PlayStation': 'fa-brands fa-playstation',
    'Xbox': 'fa-brands fa-xbox',
    'Nintendo': 'fas fa-gamepad'
  };
  return map[platform] || 'fas fa-desktop';
}

function getPlatformLabel(platform) {
  const map = {
    'Windows': 'ويندوز',
    'Android': 'أندرويد',
    'Mac': 'ماك',
    'iOS': 'آي أو إس',
    'Linux': 'لينكس',
    'Web': 'متصفح',
    'PlayStation': 'بلاستيشن',
    'Xbox': 'إكس بوكس',
    'Nintendo': 'نينتندو'
  };
  return map[platform] || platform;
}

// Social & Interaction methods
function shareGame(name) {
  const url = window.location.href;
  if (navigator.share) {
    navigator.share({
      title: name + ' - RobaNos',
      text: 'شاهد هذه اللعبة الرائعة على RobaNos!',
      url: url
    }).catch(err => console.log('Share error:', err));
  } else {
    navigator.clipboard.writeText(url)
      .then(() => alert('تم نسخ رابط اللعبة إلى الحافظة للإرسال!'))
      .catch(() => alert('الرابط: ' + url));
  }
}

function reportGame() {
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('id');

  // Unified lookup across all possible game sources (published and submissions)
  const extraGames = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
  const extraVideos = JSON.parse(localStorage.getItem('gv_extra_videos') || '[]');
  const subs = JSON.parse(localStorage.getItem('gv_submissions') || '[]');
  const allSources = [...GAMES_DATA, ...extraGames, ...extraVideos, ...subs];

  const game = allSources.find(g => g.id == gameId || g.subId == gameId || (g.name && g.id == gameId));
  if (!game) {
    showToast('⚠️ لم يتم العثور على بيانات اللعبة للإبلاغ عنها.', 'error');
    return;
  }

  // Inject Modern CSS if missing
  if (!document.getElementById('report-modal-styles')) {
    const s = document.createElement('style');
    s.id = 'report-modal-styles';
    s.textContent = `
      .report-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.7);
        backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        z-index: 2147483647; display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: opacity 0.3s ease;
      }
      .report-overlay.active { opacity: 1; }
      .report-modal {
        background: var(--bg-card); border: 1px solid var(--border);
        border-radius: 28px; padding: 40px; width: 90%; max-width: 500px;
        box-shadow: 0 40px 100px rgba(0,0,0,0.8);
        transform: scale(0.9) translateY(20px); transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
        color: var(--text-main);
      }
      .report-overlay.active .report-modal { transform: scale(1) translateY(0); }
      .report-modal h3 { font-family: 'Rajdhani', sans-serif; font-size: 1.8rem; margin: 0 0 10px; color: var(--text-main); display:flex; align-items:center; gap:12px; }
      .report-modal h3 i { color: #f87171; }
      .report-modal p { color: var(--text-muted); line-height: 1.6; margin-bottom:30px; font-size:0.95rem; }
      .report-form-group { margin-bottom: 20px; }
      .report-form-group label { display: block; color: var(--text-dim); margin-bottom: 8px; font-weight: 600; font-size:0.9rem; }
      .report-select, .report-textarea {
        width: 100%; background: var(--bg); border: 1px solid var(--border);
        border-radius: 14px; padding: 12px 18px; color: var(--text-main); font-family: inherit; font-size: 1rem;
        transition: all 0.3s ease; outline: none;
      }
      .report-select:focus, .report-textarea:focus { border-color: var(--primary-light); background: rgba(255,255,255,0.05); }
      .report-textarea { height: 120px; resize: none; }
      .report-btn-send {
        width: 100%; padding: 16px; background: linear-gradient(135deg, #ef4444, #b91c1c);
        border: none; border-radius: 16px; color: #fff; font-weight: 800; font-size: 1.1rem;
        cursor: pointer; transition: all 0.3s ease; box-shadow: 0 10px 20px rgba(239,68,68,0.2);
        margin-top: 10px;
      }
      .report-btn-send:hover { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(239,68,68,0.4); opacity: 0.95; }
      .report-close {
        position: absolute; top: 20px; left: 20px; background: var(--border);
        border: none; color: var(--text-muted); width: 36px; height: 36px; border-radius: 50%;
        cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.3s;
      }
      .report-close:hover { background: var(--primary); color: #fff; transform: rotate(90deg); }
    `;
    document.head.appendChild(s);
  }

  // Create Modal element if not exists
  let overlay = document.getElementById('report-overlay');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'report-overlay';
  overlay.className = 'report-overlay';
  overlay.innerHTML = `
    <div class="report-modal" onclick="event.stopPropagation()">
      <button class="report-close" onclick="closeReportModal()"><i class="fas fa-times"></i></button>
      <h3><i class="fas fa-flag"></i> الإبلاغ عن مشكلة</h3>
      <p>يرجى اختيار سبب البلاغ عن "<strong>${game.name}</strong>" ليتم مراجعته فوراً.</p>
      
      <div class="report-form-group">
        <label>سبب البلاغ:</label>
        <select id="report-reason" class="report-select">
          <option value="broken_link">الروابط لا تعمل</option>
          <option value="inappropriate">محتوى غير لائق</option>
          <option value="malware">ملف ضار / فيروسات</option>
          <option value="misleading">بيانات اللعبة مضللة</option>
          <option value="other">سبب آخر</option>
        </select>
      </div>

      <div class="report-form-group">
        <label>تفاصيل إضافية (اختياري):</label>
        <textarea id="report-details" class="report-textarea" placeholder="أخبرنا بالمزيد عن المشكلة..."></textarea>
      </div>

      <button class="report-btn-send" onclick="submitGameReport('${gameId}', '${game.name.replace(/'/g, "\\'")}')">
        إرسال البلاغ الآن
      </button>
    </div>
  `;

  overlay.onclick = closeReportModal;
  document.body.appendChild(overlay);

  // Trigger animation
  requestAnimationFrame(() => overlay.classList.add('active'));
}

window.closeReportModal = function () {
  const overlay = document.getElementById('report-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 400);
  }
};

window.submitGameReport = function (gameId, gameName) {
  const reason = document.getElementById('report-reason').value;
  const details = document.getElementById('report-details').value.trim();

  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const reporter = user ? user.name : 'زائر';

  const reports = JSON.parse(localStorage.getItem('gv_reports') || '[]');
  const newReport = {
    id: Date.now(),
    gameId,
    gameName,
    reason,
    details,
    reporter,
    date: new Date().toLocaleString('ar-EG'),
    status: 'pending'
  };

  reports.push(newReport);
  localStorage.setItem('gv_reports', JSON.stringify(reports));

  // Sync if needed (handled by firebase-sync automatically if set up)

  if (user && typeof addNotification === 'function') {
    addNotification(user.name, 'info', '✅ تم إرسال البلاغ', `شكراً لك! تلقينا بلاغك بخصوص "${gameName}" وسنراجعه قريباً.`);
  }

  closeReportModal();

  if (typeof showToast === 'function') {
    showToast('✅ شكراً! تم إرسال بلاغك لفريق الإشراف للمراجعة.');
  } else {
    alert('✅ تم إرسال البلاغ بنجاح.');
  }
};

// Helper to label badges
function loadPlyr(callback) {
  if (window.Plyr) return callback();

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdn.plyr.io/3.7.8/plyr.css';
  document.head.appendChild(link);

  const style = document.createElement('style');
  style.innerHTML = `
        :root { --plyr-color-main: #7c3aed; --plyr-font-family: 'Exo 2', sans-serif; }
        .plyr { border-radius: 16px; border: 1px solid rgba(124,58,237,0.2); box-shadow: 0 10px 40px rgba(0,0,0,0.5); background: #000; height: 100%; }
        video::-webkit-media-controls { display: none !important; }
    `;
  document.head.appendChild(style);

  const script = document.createElement('script');
  script.src = 'https://cdn.plyr.io/3.7.8/plyr.polyfilled.js';
  script.onload = callback;
  document.body.appendChild(script);
}

/* ============================================================
   SHARE MODAL
============================================================ */
window.shareGame = function (gameName) {
  var url = window.location.href;

  if (!document.getElementById('share-modal-styles')) {
    var s = document.createElement('style');
    s.id = 'share-modal-styles';
    s.textContent = [
      '#share-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);z-index:99999;display:flex;align-items:center;justify-content:center;opacity:0;transition:all 0.3s ease;}',
      '#share-modal-overlay.show{opacity:1;}',
      '#share-modal-box{background:var(--bg-card);border:1px solid var(--border);border-radius:28px;padding:35px 30px;width:calc(100% - 32px);max-width:440px;box-shadow:var(--shadow-card);transform:translateY(30px) scale(0.95);transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);position:relative;backdrop-filter:blur(20px);}',
      '#share-modal-overlay.show #share-modal-box{transform:translateY(0) scale(1);}',
      '#share-modal-box h3{font-family:Rajdhani,sans-serif;font-size:1.7rem;font-weight:700;color:var(--text);margin:0 0 10px;display:flex;align-items:center;gap:12px;}',
      '#share-modal-box h3 i{color:var(--primary-light);}',
      '.share-game-title{font-size:0.95rem;color:var(--text-muted);margin-bottom:25px;font-weight:600;opacity:0.8;}',
      '.share-options-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:25px;}',
      '.share-opt-btn{display:flex;align-items:center;gap:12px;padding:15px 18px;border-radius:18px;border:1px solid var(--border);background:rgba(255,255,255,0.03);color:var(--text);cursor:pointer;font-family:inherit;font-size:0.95rem;font-weight:700;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);text-decoration:none;}',
      '.share-opt-btn:hover{transform:translateY(-5px);background:rgba(255,255,255,0.06);border-color:var(--primary-light);box-shadow:0 10px 25px rgba(0,0,0,0.2);}',
      '.share-opt-btn .soi{width:40px;height:40px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;box-shadow:0 4px 12px rgba(0,0,0,0.15);}',
      '.share-copy-row{display:flex;gap:12px;align-items:center;background:rgba(0,0,0,0.15);border:1px solid var(--border);border-radius:18px;padding:12px 16px;}',
      '.share-copy-row input{flex:1;background:none;border:none;outline:none;color:var(--text-muted);font-family:inherit;font-size:0.85rem;direction:ltr;min-width:0;font-weight:500;}',
      '.share-copy-btn{background:var(--gradient-primary);border:none;border-radius:12px;color:#fff;padding:10px 20px;cursor:pointer;font-family:inherit;font-size:0.9rem;font-weight:800;white-space:nowrap;transition:all 0.3s;display:flex;align-items:center;gap:8px;flex-shrink:0;box-shadow:0 6px 15px rgba(124,58,237,0.3);}',
      '.share-copy-btn:hover{transform:scale(1.05);box-shadow:0 8px 20px rgba(124,58,237,0.4);}',
      '.share-copy-btn.copied{background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 6px 15px rgba(16,185,129,0.3);}',
      '#share-modal-close{position:absolute;top:20px;left:20px;background:var(--border);border:none;color:var(--text-muted);width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;transition:0.3s;}',
      '#share-modal-close:hover{background:var(--primary);color:#fff;transform:rotate(90deg);}',
      '.light-mode .share-opt-btn{background:rgba(0,0,0,0.03); border-color:rgba(0,0,0,0.05);}',
      '.light-mode .share-opt-btn:hover{background:rgba(124,58,237,0.05); border-color:var(--primary-light);}',
      '.light-mode .share-copy-row{background:rgba(0,0,0,0.03);}'
    ].join('');
    document.head.appendChild(s);
  }

  var old = document.getElementById('share-modal-overlay');
  if (old) old.remove();

  var encodedUrl = encodeURIComponent(url);
  var encodedText = encodeURIComponent('تحقق من هذه اللعبة الرائعة: ' + gameName);

  var platforms = [
    { label: 'واتساب', icon: 'fab fa-whatsapp', color: '#25d366', bg: 'rgba(37,211,102,0.15)', link: 'https://wa.me/?text=' + encodedText + '%20' + encodedUrl },
    { label: 'تويتر/X', icon: 'fab fa-x-twitter', color: '#fff', bg: 'rgba(255,255,255,0.08)', link: 'https://twitter.com/intent/tweet?text=' + encodedText + '&url=' + encodedUrl },
    { label: 'تيليقرام', icon: 'fab fa-telegram', color: '#2aabee', bg: 'rgba(42,171,238,0.15)', link: 'https://t.me/share/url?url=' + encodedUrl + '&text=' + encodedText },
    { label: 'فيسبوك', icon: 'fab fa-facebook-f', color: '#1877f2', bg: 'rgba(24,119,242,0.15)', link: 'https://www.facebook.com/sharer/sharer.php?u=' + encodedUrl }
  ];

  var overlay = document.createElement('div');
  overlay.id = 'share-modal-overlay';

  var box = document.createElement('div');
  box.id = 'share-modal-box';

  var closeBtn = document.createElement('button');
  closeBtn.id = 'share-modal-close';
  closeBtn.innerHTML = '<i class="fas fa-times"></i>';
  closeBtn.addEventListener('click', function () { closeShareModal(overlay); });

  var titleEl = document.createElement('h3');
  titleEl.innerHTML = '<i class="fas fa-share-nodes"></i> شارك هذه اللعبة';

  var subtitle = document.createElement('div');
  subtitle.className = 'share-game-title';
  subtitle.textContent = gameName;

  var grid = document.createElement('div');
  grid.className = 'share-options-grid';
  platforms.forEach(function (p) {
    var a = document.createElement('a');
    a.className = 'share-opt-btn';
    a.href = p.link;
    a.target = '_blank';
    a.rel = 'noopener';
    var soi = document.createElement('span');
    soi.className = 'soi';
    soi.style.cssText = 'background:' + p.bg + ';color:' + p.color;
    var ic = document.createElement('i');
    ic.className = p.icon;
    soi.appendChild(ic);
    a.appendChild(soi);
    a.appendChild(document.createTextNode('\u00a0' + p.label));
    grid.appendChild(a);
  });

  var copyRow = document.createElement('div');
  copyRow.className = 'share-copy-row';

  var urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.value = url;
  urlInput.readOnly = true;

  var copyBtn = document.createElement('button');
  copyBtn.className = 'share-copy-btn';
  copyBtn.innerHTML = '<i class="fas fa-copy"></i> \u0646\u0633\u062e';
  copyBtn.addEventListener('click', function () {
    navigator.clipboard.writeText(url).then(function () {
      copyBtn.classList.add('copied');
      copyBtn.innerHTML = '<i class="fas fa-check"></i> \u062a\u0645 \u0627\u0644\u0646\u0633\u062e!';
      setTimeout(function () {
        copyBtn.classList.remove('copied');
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> \u0646\u0633\u062e';
      }, 2000);
    }).catch(function () {
      urlInput.select();
      document.execCommand('copy');
      copyBtn.innerHTML = '<i class="fas fa-check"></i> \u062a\u0645!';
      setTimeout(function () { copyBtn.innerHTML = '<i class="fas fa-copy"></i> \u0646\u0633\u062e'; }, 2000);
    });
  });

  copyRow.appendChild(urlInput);
  copyRow.appendChild(copyBtn);

  box.appendChild(closeBtn);
  box.appendChild(titleEl);
  box.appendChild(subtitle);
  box.appendChild(grid);
  box.appendChild(copyRow);
  overlay.appendChild(box);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeShareModal(overlay);
  });

  document.body.appendChild(overlay);
  requestAnimationFrame(function () { overlay.classList.add('show'); });
};

function closeShareModal(overlay) {
  overlay.classList.remove('show');
  setTimeout(function () { overlay.remove(); }, 250);
}

function incrementGameDownload(id) {
  // 1. Increment per-game total
  const counts = JSON.parse(localStorage.getItem('gv_download_counts') || '{}');
  counts[id] = (counts[id] || 0) + 1;
  localStorage.setItem('gv_download_counts', JSON.stringify(counts));

  // 2. Record today's date for the 7-day chart
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const history = JSON.parse(localStorage.getItem('gv_download_history') || '{}');
  history[today] = (history[today] || 0) + 1;
  localStorage.setItem('gv_download_history', JSON.stringify(history));

  // 3. Update gv_extra_games in-place for EXT_ games
  if (String(id).startsWith('EXT_')) {
    const extra = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
    const idx = extra.findIndex(g => g.id == id);
    if (idx !== -1) {
      extra[idx].downloads = (extra[idx].downloads || 0) + 1;
      localStorage.setItem('gv_extra_games', JSON.stringify(extra));
    }
  }
}

// Reactions Handler
window.toggleReaction = function (gameId, type) {
  let userReactions = JSON.parse(localStorage.getItem('gv_user_reactions') || '{}');
  let reactions = JSON.parse(localStorage.getItem('gv_reactions_' + gameId) || '{"likes":0,"loves":0}');

  if (userReactions[gameId] === type) {
    // Remove reaction
    reactions[type + 's'] = Math.max(0, reactions[type + 's'] - 1);
    delete userReactions[gameId];
  } else {
    // Switch or add new reaction
    if (userReactions[gameId]) {
      reactions[userReactions[gameId] + 's'] = Math.max(0, reactions[userReactions[gameId] + 's'] - 1);
    }
    reactions[type + 's']++;
    userReactions[gameId] = type;

    // Create floating effect on click
    const btn = document.getElementById('react-btn-' + type);
    if (btn) {
      const fl = document.createElement('i');
      let iconClass = 'fas fa-thumbs-up';
      let iconColor = 'var(--primary-light)';
      if (type === 'love') { iconClass = 'fas fa-heart'; iconColor = '#ef4444'; }
      if (type === 'sad') { iconClass = 'fas fa-sad-tear'; iconColor = '#3b82f6'; }
      if (type === 'angry') { iconClass = 'fas fa-angry'; iconColor = '#f97316'; }

      fl.className = iconClass;
      fl.style.cssText = `position:absolute; color:${iconColor}; font-size:1.5rem; pointer-events:none; z-index:99; left:${btn.getBoundingClientRect().left + 20}px; top:${btn.getBoundingClientRect().top}px; animation: fadeUp 1s ease-out forwards;`;
      document.body.appendChild(fl);
      setTimeout(() => fl.remove(), 1000);
    }
  }

  localStorage.setItem('gv_reactions_' + gameId, JSON.stringify(reactions));
  localStorage.setItem('gv_user_reactions', JSON.stringify(userReactions));

  // Update UI manually without full re-render
  const btnLike = document.getElementById('react-btn-like');
  const btnLove = document.getElementById('react-btn-love');
  const btnSad = document.getElementById('react-btn-sad');
  const btnAngry = document.getElementById('react-btn-angry');

  if (btnLike && btnLove && btnSad && btnAngry) {
    const uReact = userReactions[gameId];
    // Like button update
    btnLike.style.background = uReact === 'like' ? 'rgba(124,58,237,0.15)' : '';
    btnLike.style.color = uReact === 'like' ? 'var(--primary-light)' : 'var(--text)';
    btnLike.style.borderColor = uReact === 'like' ? 'var(--primary-light)' : '';
    btnLike.querySelector('i').className = uReact === 'like' ? 'fas fa-thumbs-up' : 'far fa-thumbs-up';
    btnLike.querySelector('i').style.color = uReact === 'like' ? '' : 'var(--primary-light)';
    document.getElementById('react-count-like').innerText = reactions.likes > 0 ? reactions.likes : '';

    // Love button update
    btnLove.style.background = uReact === 'love' ? 'rgba(239,68,68,0.15)' : '';
    btnLove.style.color = uReact === 'love' ? '#ef4444' : 'var(--text)';
    btnLove.style.borderColor = uReact === 'love' ? '#ef4444' : '';
    btnLove.querySelector('i').className = uReact === 'love' ? 'fas fa-heart' : 'far fa-heart';
    btnLove.querySelector('i').style.color = uReact === 'love' ? '' : '#ef4444';
    document.getElementById('react-count-love').innerText = reactions.loves > 0 ? reactions.loves : '';

    // Sad button update
    btnSad.style.background = uReact === 'sad' ? 'rgba(59,130,246,0.15)' : '';
    btnSad.style.color = uReact === 'sad' ? '#3b82f6' : 'var(--text)';
    btnSad.style.borderColor = uReact === 'sad' ? '#3b82f6' : '';
    btnSad.querySelector('i').className = uReact === 'sad' ? 'fas fa-sad-tear' : 'far fa-sad-tear';
    btnSad.querySelector('i').style.color = uReact === 'sad' ? '' : '#3b82f6';
    document.getElementById('react-count-sad').innerText = reactions.sads > 0 ? reactions.sads : '';

    // Angry button update
    btnAngry.style.background = uReact === 'angry' ? 'rgba(249,115,22,0.15)' : '';
    btnAngry.style.color = uReact === 'angry' ? '#f97316' : 'var(--text)';
    btnAngry.style.borderColor = uReact === 'angry' ? '#f97316' : '';
    btnAngry.querySelector('i').className = uReact === 'angry' ? 'fas fa-angry' : 'far fa-angry';
    btnAngry.querySelector('i').style.color = uReact === 'angry' ? '' : '#f97316';
    document.getElementById('react-count-angry').innerText = reactions.angrys > 0 ? reactions.angrys : '';
  }
};

// Custom Toast Notification System
window.showToast = function (message, type = 'success') {
  const old = document.querySelector('.gv-toast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.className = 'gv-toast';

  let icon = '<i class="fas fa-check-circle" style="color:#10b981"></i>';
  if (type === 'error') icon = '<i class="fas fa-exclamation-circle" style="color:#ef4444"></i>';
  if (type === 'warning') icon = '<i class="fas fa-exclamation-triangle" style="color:#fbbf24"></i>';

  toast.innerHTML = `${icon} <span style="font-weight:600; font-size:0.95rem">${message}</span>`;
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('show'));

  // Auto-remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
};

/**
 * updateMetaTags(game)
 * Dynamically updates document title and OG meta tags for social sharing.
 */
function updateMetaTags(g) {
  if (!g) return;

  const title = `${g.name} - RobaNos`;
  const desc = g.desc ? g.desc.substring(0, 160).replace(/<\/?[^>]+(>|$)/g, "") + '...' : 'شاهد تفاصيل وتحميل اللعبة مجاناً على RobaNos.';
  const img = g.imageUrl || 'https://robanos.com/assets/favicon.png';
  const url = window.location.href;

  // 1. Update Browser Title
  document.title = title;

  // 2. Helper to set meta tags
  const setMeta = (property, content, attr = 'property') => {
    let el = document.querySelector(`meta[${attr}="${property}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, property);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // 3. Update Standard Meta Tags
  setMeta('description', desc, 'name');
  setMeta('keywords', `${g.name}, ${g.category}, تحميل ألعاب`, 'name');

  // 4. Update Open Graph (Facebook, etc.)
  setMeta('og:title', title);
  setMeta('og:description', desc);
  setMeta('og:image', img);
  setMeta('og:url', url);
  setMeta('og:type', 'website');

  // 5. Update Twitter Cards
  setMeta('twitter:title', title, 'name');
  setMeta('twitter:description', desc, 'name');
  setMeta('twitter:image', img, 'name');
  setMeta('twitter:url', url, 'name');
  setMeta('twitter:card', 'summary_large_image', 'name');

  console.log(`📡 Meta Tags Updated for: ${g.name}`);
}
