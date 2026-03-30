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

  if (!game) {
    container.innerHTML = '<div style="text-align:center;padding:100px;color:red;font-size:1.5rem">اللعبة غير موجودة أو تم حذفها.</div>';
    return;
  }

  // Global array for slider
  currentMediaList = [];

  renderGameDetails(game);

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
          <div class="gp-meta-tag"><i class="fas fa-star" style="color:#fbbf24"></i> ${g.rating}/5</div>
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
      <div>
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

function renderComments(gameId) {
  const all = getComments();
  const gameComments = all[gameId] || [];

  const countEl = document.getElementById('comments-count');
  if (countEl) countEl.textContent = gameComments.length;

  // Render Input Area dynamically
  const currUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const inputEl = document.getElementById('comment-input-area');

  if (inputEl) {
    if (currUser) {
      const currAvatar = currUser.avatar || currUser.name.charAt(0).toUpperCase();
      inputEl.innerHTML = `
        <div class="comment-input-wrapper">
          <div class="comment-avatar-circle">
            ${currAvatar}
          </div>
          <div style="flex:1; position:relative; width:100%;">
            <textarea id="comment-input" placeholder="شاركنا رأيك وتقييمك الاستثنائي لهذه اللعبة..." onfocus="this.style.borderColor='var(--primary-light)';this.style.background='rgba(255,255,255,0.04)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)';this.style.background='rgba(255,255,255,0.02)'"></textarea>
            <div style="display:flex; justify-content:flex-end; margin-top:12px;">
               <button class="btn-primary" style="padding:10px 28px; font-weight:700; border-radius:12px; font-size:0.95rem" onclick="submitGameComment('${gameId}')">نشر التعليق</button>
            </div>
          </div>
        </div>
        <style>
          .comment-input-wrapper { display:flex; gap:15px; align-items:flex-start; margin-bottom: 40px; }
          .comment-avatar-circle { width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg,var(--primary),var(--accent)); display:flex; align-items:center; justify-content:center; font-size:1.3rem; font-weight:bold; color:#fff; flex-shrink:0; box-shadow:0 5px 15px rgba(168,85,247,0.3); }
          #comment-input { width:100%; min-height:80px; background:var(--bg-card); border:1px solid var(--border); border-radius:14px; padding:15px; color:var(--text); font-family:inherit; font-size:1rem; resize:vertical; outline:none; transition:all 0.3s; box-shadow:inset 0 4px 10px rgba(0,0,0,0.1); display:block; }
          @media (max-width: 500px) {
            .comment-input-wrapper { flex-direction: column; align-items: center; text-align: center; }
            .comment-avatar-circle { margin-bottom: 10px; }
            #comment-input { min-height: 100px; }
          }
        </style>
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

  const sorted = [...gameComments].reverse();

  list.innerHTML = sorted.map((c, i) => `
    <div style="display:flex; gap:16px; padding: 25px 15px; border-bottom: ${i === sorted.length - 1 ? 'none' : '1px solid var(--border)'}; transition: background 0.3s; border-radius: 12px;" onmouseover="this.style.background='rgba(124,58,237,0.04)'" onmouseout="this.style.background='transparent'">
      <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg,var(--primary),var(--accent)); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:bold; font-size:1.3rem; flex-shrink:0;">
        <i class="fas fa-user-astronaut"></i>
      </div>
      <div style="flex:1;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
          <strong style="color:var(--text); font-size:1.1rem; cursor:pointer; font-weight:700" onclick="window.location.href='user.html?user=${encodeURIComponent(c.user)}'" onmouseover="this.style.color='var(--primary-light)'" onmouseout="this.style.color='var(--text)'">${c.user}</strong>
          <span style="font-size:0.85rem; color:var(--text-dim);"><i class="far fa-clock" style="margin-left:4px"></i>${c.date}</span>
        </div>
        <div style="color:var(--text-muted); font-size:1.05rem; line-height:1.7; white-space:pre-wrap;">${c.text}</div>
      </div>
    </div>
  `).join('');
}

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
    showToast('⚠️ الرجاء كتابة محتوى التعليق أولاً.', 'warning');
    return;
  }

  const all = getComments();
  if (!all[gameId]) all[gameId] = [];

  const newComment = {
    id: Date.now(),
    user: currentUser.name,
    avatar: currentUser.avatar || currentUser.name.charAt(0).toUpperCase(),
    text: text.replace(/</g, "&lt;").replace(/>/g, "&gt;"),
    date: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
  };

  all[gameId].push(newComment);
  saveComments(all);

  input.value = '';
  renderComments(gameId);
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
      '#share-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.25s;}',
      '#share-modal-overlay.show{opacity:1;}',
      '#share-modal-box{background:var(--bg-card,#1a1035);border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:32px 28px 28px;width:calc(100% - 32px);max-width:420px;box-shadow:0 30px 80px rgba(0,0,0,0.6);transform:translateY(20px);transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1);position:relative;}',
      '#share-modal-overlay.show #share-modal-box{transform:translateY(0);}',
      '#share-modal-box h3{font-family:Rajdhani,sans-serif;font-size:1.5rem;font-weight:700;color:#fff;margin:0 0 6px;display:flex;align-items:center;gap:10px;}',
      '#share-modal-box h3 i{color:var(--primary-light,#c4b5fd);}',
      '.share-game-title{font-size:0.88rem;color:var(--text-muted,#9ca3af);margin-bottom:24px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.share-options-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;}',
      '.share-opt-btn{display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:14px;border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.04);color:#fff;cursor:pointer;font-family:inherit;font-size:0.92rem;font-weight:600;transition:all 0.2s;text-decoration:none;}',
      '.share-opt-btn:hover{transform:translateY(-3px);background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.15);box-shadow:0 8px 20px rgba(0,0,0,0.3);}',
      '.share-opt-btn .soi{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;}',
      '.share-copy-row{display:flex;gap:10px;align-items:center;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:10px 14px;}',
      '.share-copy-row input{flex:1;background:none;border:none;outline:none;color:var(--text-muted,#9ca3af);font-family:inherit;font-size:0.82rem;direction:ltr;min-width:0;}',
      '.share-copy-btn{background:linear-gradient(135deg,#7c3aed,#a855f7);border:none;border-radius:10px;color:#fff;padding:9px 16px;cursor:pointer;font-family:inherit;font-size:0.85rem;font-weight:700;white-space:nowrap;transition:all 0.2s;display:flex;align-items:center;gap:6px;flex-shrink:0;}',
      '.share-copy-btn:hover{opacity:0.9;transform:scale(1.04);}',
      '.share-copy-btn.copied{background:linear-gradient(135deg,#10b981,#059669);}',
      '#share-modal-close{position:absolute;top:16px;left:16px;background:rgba(255,255,255,0.06);border:none;color:var(--text-muted,#9ca3af);width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;transition:0.2s;}',
      '#share-modal-close:hover{background:rgba(255,255,255,0.12);color:#fff;}'
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
