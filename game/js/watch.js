/* ========================================================
   watch.js — Video Playback Logic | RobaNos
   ======================================================== */

// GAMES_DATA is populated from Firebase/LocalStorage in findGame()
if (typeof GAMES_DATA === 'undefined') {
    var GAMES_DATA = [];
}

const GUIDES_DATA = [
    { id: 'guide1', name: 'كيفية تحميل وتثبيت الألعاب بأمان', category: 'دليل وعملي', videoUrl: 'https://www.youtube.com/watch?v=kYmCscyXun0', submittedBy: `${getBranding().name} Official`, description: `دليل شامل يشرح كيفية تحميل الألعاب المحفوظة في المنصة وتثبيتها بأمان دون مشاكل.`, link: 'videos.html', imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop' },
    { id: 'guide2', name: 'الشرح الشامل: إنشاء حساب وطلب الألعاب', category: 'دليل وعملي', videoUrl: 'https://www.youtube.com/watch?v=0tUqIHwH60A', submittedBy: `${getBranding().name} Official`, description: `خطوات بسيطة وسريعة لإنشاء حسابك المخصص ضمن الموقع والبدء بطلب الألعاب أو نشر أعمالك.`, link: 'videos.html', imageUrl: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=2070&auto=format&fit=crop' },
    { id: 'guide3', name: 'استكشف ميزات الواجهة الاحترافية', category: 'الميزات', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', submittedBy: `${getBranding().name} Official`, description: `تعرف على كل ميزات الموقع وكيفية تصفح الأقسام للعثور على ألعابك المفضلة وتفعيل الألوام المخصصة بكفاءة.`, link: 'videos.html', imageUrl: 'https://images.unsplash.com/photo-1552824734-fe90c000f6c2?q=80&w=2070&auto=format&fit=crop' }
];

function initWatchPage() {
    if (window._watchPageInitialized) return;

    const params = new URLSearchParams(window.location.search);
    const gameId = String(params.get('id') || '');

    if (!gameId) {
        window.location.href = 'videos.html';
        return;
    }

    const game = findGame(gameId);
    if (!game || !game.videoUrl) {
        if (typeof showToast === 'function') showToast('⚠️ الفيديو غير متاح لهذه اللعبة حالياً.', 'warning');
        setTimeout(() => { if (!game) window.location.href = 'videos.html'; }, 2000);
        if (!game) return;
    }

    renderVideo(game);
    renderSuggestions(gameId);
    renderComments(gameId);

    window._watchPageInitialized = true;
    console.log("🎬 Watch Page Initialized Successfully.");
}

// ==========================================
// SHARE SYSTEM
// ==========================================
window.openShareModal = function () {
    const url = window.location.href;
    const title = document.getElementById('video-title')?.innerText || "مشاهدة هذا الفيديو الرائع!";

    // Inject Styles if missing
    if (!document.getElementById('share-modal-styles')) {
        const s = document.createElement('style');
        s.id = 'share-modal-styles';
        s.textContent = `
            .share-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(12px); z-index: 9999; display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.3s; pointer-events:none; }
            .share-overlay.active { opacity: 1; pointer-events:auto; }
            .share-modal { background: var(--bg-card); border: 1px solid var(--border); border-radius: 28px; padding: 35px; width: 95%; max-width: 450px; text-align: center; transform: scale(0.9) translateY(30px); transition: 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 40px 100px rgba(0,0,0,0.8); position: relative; }
            .share-overlay.active .share-modal { transform: scale(1) translateY(0); }
            
            .share-modal h2 { font-family: 'Rajdhani', sans-serif; font-size: 1.8rem; margin-bottom: 10px; color: var(--text); }
            .share-modal p { color: var(--text-muted); margin-bottom: 25px; font-size: 0.95rem; }
            
            .share-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .share-item { display: flex; flex-direction: column; align-items: center; gap: 10px; cursor: pointer; transition: 0.3s; text-decoration: none; }
            .share-icon { width: 55px; height: 55px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #fff; transition: 0.3s; }
            .share-item span { font-size: 0.75rem; color: var(--text-dim); font-weight: 700; }
            .share-item:hover .share-icon { transform: translateY(-5px) rotate(5deg); }
            
            .whatsapp { background: #25D366; box-shadow: 0 10px 20px rgba(37,211,102,0.2); }
            .facebook { background: #1877F2; box-shadow: 0 10px 20px rgba(24,119,242,0.2); }
            .twitter { background: #1DA1F2; box-shadow: 0 10px 20px rgba(29,161,242,0.2); }
            .telegram { background: #0088cc; box-shadow: 0 10px 20px rgba(0,136,204,0.2); }
            
            .copy-link-box { background: rgba(255,255,255,0.03); border: 1px dashed var(--border); border-radius: 14px; padding: 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer; transition: 0.3s; }
            .copy-link-box:hover { background: rgba(255,255,255,0.06); border-color: var(--primary-light); }
            .copy-link-box span { font-size: 0.85rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; text-align: left; }
            .copy-btn { color: var(--primary-light); font-weight: 800; font-size: 0.85rem; }
            
            .share-close { position: absolute; top: 15px; left: 15px; background: none; border: none; font-size: 1.5rem; color: var(--text-dim); cursor: pointer; padding: 5px; }
        `;
        document.head.appendChild(s);
    }

    let overlay = document.getElementById('share-overlay');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'share-overlay';
    overlay.className = 'share-overlay';
    overlay.innerHTML = `
        <div class="share-modal">
            <button class="share-close" onclick="closeShareModal()">&times;</button>
            <h2>شارك الفيديو</h2>
            <p>اختر المنصة التي ترغب بمشاركة الفيديو عليها:</p>
            
            <div class="share-grid">
                <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(title + " " + url)}" target="_blank" class="share-item">
                    <div class="share-icon whatsapp"><i class="fab fa-whatsapp"></i></div>
                    <span>واتساب</span>
                </a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" class="share-item">
                    <div class="share-icon facebook"><i class="fab fa-facebook-f"></i></div>
                    <span>فيسبوك</span>
                </a>
                <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}" target="_blank" class="share-item">
                    <div class="share-icon twitter"><i class="fab fa-x-twitter"></i></div>
                    <span>X</span>
                </a>
                <a href="https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}" target="_blank" class="share-item">
                    <div class="share-icon telegram"><i class="fab fa-telegram-plane"></i></div>
                    <span>تيليجرام</span>
                </a>
            </div>
            
            <div class="copy-link-box" onclick="copyVideoUrl('${url}')">
                <span>${url}</span>
                <div class="copy-btn">نسخ الرابط</div>
            </div>
        </div>
    `;

    overlay.onclick = (e) => { if (e.target === overlay) closeShareModal(); };
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 10);
}

window.closeShareModal = function () {
    const overlay = document.getElementById('share-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    }
}

window.copyVideoUrl = function (url) {
    navigator.clipboard.writeText(url).then(() => {
        showToast('✅ تم نسخ الرابط بنجاح!', 'success');
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
}

// ==========================================
// TOAST NOTIFICATION SYSTEM
// ==========================================
window.showToast = function (msg, type = 'info') {
    // Inject Styles if missing
    if (!document.getElementById('toast-styles')) {
        const s = document.createElement('style');
        s.id = 'toast-styles';
        s.textContent = `
            .toast-container { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 10000; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
            .toast { 
                background: var(--bg-card); backdrop-filter: blur(15px); border: 1px solid var(--border); 
                color: var(--text); padding: 12px 25px; border-radius: 14px; font-size: 0.95rem; font-weight: 700;
                box-shadow: 0 10px 30px rgba(0,0,0,0.4); opacity: 0; transform: translateY(-20px) scale(0.9);
                transition: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); pointer-events: auto;
                border-right: 4px solid var(--primary);
            }
            .toast.active { opacity: 1; transform: translateY(0) scale(1); }
            .toast.success { border-right-color: var(--green); }
            .toast.warning { border-right-color: var(--orange); }
            .toast.error { border-right-color: var(--red); }
        `;
        document.head.appendChild(s);
    }

    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = msg;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('active'), 10);
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Listen for data ready
window.addEventListener('firebaseDataReady', initWatchPage);

// Listen for auth changes to refresh the comment input area
window.addEventListener('authStatusChanged', () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) renderComments(String(id));
});

// Safety check: if data is already loaded or init was called elsewhere
document.addEventListener('DOMContentLoaded', () => {
    if (window.isGlobalInitialized || localStorage.getItem('gv_extra_games')) {
        initWatchPage();
    }
});

function findGame(id) {
    if (String(id).startsWith('guide')) {
        return GUIDES_DATA.find(g => g.id === id);
    }

    // Modern search logic: Merge all possible sources from LocalStorage
    let allSources = [];
    try {
        const extraGames = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
        const extraVideos = JSON.parse(localStorage.getItem('gv_extra_videos') || '[]');
        const subs = JSON.parse(localStorage.getItem('gv_submissions') || '[]');
        const upcomings = JSON.parse(localStorage.getItem('gv_upcoming_games') || '[]').map(ug => ({
            ...ug,
            videoUrl: ug.trailerUrl || ug.videoUrl, // Map trailer to video field for the player
            desc: ug.description || ug.desc,
            isUpcoming: true
        }));

        // Also check if there's a global GAMES_DATA
        const core = (typeof GAMES_DATA !== 'undefined' && Array.isArray(GAMES_DATA)) ? GAMES_DATA : [];

        allSources = [...core, ...extraGames, ...extraVideos, ...subs, ...upcomings];
    } catch (e) {
        console.error("Data merge error in watch.js:", e);
    }

    // Try to find by ID
    let found = allSources.find(g => g.id == id || g.subId == id || g.originalSubId == id);

    // Check if it specifically came from extraVideos
    if (found) {
        const extraVideos = JSON.parse(localStorage.getItem('gv_extra_videos') || '[]');
        if (extraVideos.some(v => v.id == found.id)) {
            found.isStandaloneVideo = true;
        }
    }
    return found;
}

function renderVideo(game) {
    const container = document.getElementById('video-container');
    const embed = getEmbedUrl(game.videoUrl);

    if (embed.match(/\.(mp4|webm|ogg)(?:[?#]|$)/i)) {
        const playerId = 'plyr-' + Date.now();
        container.innerHTML = `<video id="${playerId}" src="${embed}" playsinline controls controlsList="nodownload" oncontextmenu="return false;" autoplay style="width:100%; height:100%; object-fit:contain; background:#000; border-radius:15px; border:1px solid var(--border);"></video>`;
        loadPlyr(() => {
            const player = new Plyr(`#${playerId}`, {
                controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
                settings: ['quality', 'speed', 'loop']
            });
            player.on('enterfullscreen', lockOrientation);
            player.on('exitfullscreen', unlockOrientation);
        });
    } else {
        container.innerHTML = `<iframe src="${embed}" allowfullscreen allow="autoplay; encrypted-media"></iframe>`;
        // Listen for document fullscreen changes (for iframes)
        document.addEventListener('fullscreenchange', handleIframeFullscreen);
        document.addEventListener('webkitfullscreenchange', handleIframeFullscreen);
    }

    const desc = game.description || game.desc || 'لا يوجد وصف متاح لهذه اللعبة حالياً.';
    document.getElementById('video-title').textContent = game.name;
    document.getElementById('game-author').textContent = game.submittedBy || 'RobaNos';
    document.getElementById('game-cat').textContent = game.category || 'ألعاب';
    document.getElementById('video-desc').textContent = desc;

    // Mobile Desc Preview
    const mobileDescPreview = document.getElementById('mobile-desc-preview');
    if (mobileDescPreview) {
        mobileDescPreview.textContent = desc.length > 60 ? desc.substring(0, 60) + '...' : desc;
    }

    const btnView = document.getElementById('btn-view-game');
    const authorAvatar = document.getElementById('author-avatar-char');
    const authorName = game.submittedBy || 'RobaNos';

    if (authorAvatar) {
        authorAvatar.textContent = authorName.charAt(0).toUpperCase();
    }

    if (String(game.id).startsWith('guide')) {
        btnView.innerHTML = '<i class="fas fa-arrow-right"></i> قناة الموقع';
        btnView.onclick = () => window.location.href = 'videos.html';
    } else if (game.type === 'video' || game.type === 'official' || game.type === 'general' || game.isStandaloneVideo) {
        // This is a standalone video, NOT a game submission
        btnView.innerHTML = '<i class="fas fa-play"></i> استكشف الفيديوهات';
        btnView.onclick = () => window.location.href = 'videos.html';
        // Alternatively, hide it if you prefer a cleaner look
        // btnView.style.display = 'none';
    } else {
        btnView.innerHTML = game.isUpcoming ? '<i class="fas fa-info-circle"></i> تفاصيل اللعبة' : '<i class="fas fa-external-link-alt"></i> صفحة اللعبة';
        btnView.onclick = () => {
            const url = game.isUpcoming ? `upcoming-details.html?id=${game.id}` : `game.html?id=${game.id}`;
            window.location.href = url;
        };
    }

    // Load Stats from Local Storage or Initialize
    let allStats = {};
    try { allStats = JSON.parse(localStorage.getItem('gv_video_stats') || '{}'); } catch (e) { }

    if (!allStats[game.id]) {
        // Init base values
        let baseViews = 0;
        if (game.id === 'guide1') baseViews = 45000;
        else if (game.id === 'guide2') baseViews = 128000;
        else if (game.id === 'guide3') baseViews = 89000;
        else if (game.downloads) baseViews = Math.floor(game.downloads * 1.5);
        else baseViews = 0;

        allStats[game.id] = {
            views: baseViews,
            likes: Math.floor(baseViews * 0.08),
            userLiked: false,
            userDisliked: false
        };
    }

    // Increment view count on load
    allStats[game.id].views += 1;
    localStorage.setItem('gv_video_stats', JSON.stringify(allStats));

    window.currentGameStats = allStats[game.id];
    window.currentGameId = game.id;
    window.currentGameName = game.name;

    // Update UI
    document.getElementById('view-count').textContent = formatWatchNumber(window.currentGameStats.views);
    document.getElementById('like-count').textContent = formatWatchNumber(window.currentGameStats.likes);

    const dateEl = document.getElementById('video-date-added');
    if (dateEl) {
        dateEl.textContent = game.dateAdded ? new Date(game.dateAdded).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : 'تم رفعه حديثاً';
    }

    // Set initial buttons state
    if (window.currentGameStats.userLiked) {
        document.getElementById('btn-like').classList.add('liked');
        document.getElementById('like-icon').classList.replace('far', 'fas');
    }
    if (window.currentGameStats.userDisliked) {
        document.getElementById('btn-dislike').classList.add('disliked');
        document.getElementById('dislike-icon').classList.replace('far', 'fas');
    }
}

window.toggleLike = function () {
    const btnLike = document.getElementById('btn-like');
    const btnDislike = document.getElementById('btn-dislike');
    const likeIcon = document.getElementById('like-icon');
    const dislikeIcon = document.getElementById('dislike-icon');
    const likeCountEl = document.getElementById('like-count');

    if (window.currentGameStats.userLiked) {
        window.currentGameStats.userLiked = false;
        window.currentGameStats.likes--;
        btnLike.classList.remove('liked');
        likeIcon.classList.replace('fas', 'far');
    } else {
        window.currentGameStats.userLiked = true;
        window.currentGameStats.likes++;
        btnLike.classList.add('liked');
        likeIcon.classList.replace('far', 'fas');

        if (window.currentGameStats.userDisliked) {
            window.currentGameStats.userDisliked = false;
            btnDislike.classList.remove('disliked');
            dislikeIcon.classList.replace('fas', 'far');
        }
    }

    likeCountEl.textContent = formatWatchNumber(window.currentGameStats.likes);
    saveVideoStats();
};

window.toggleDislike = function () {
    const btnLike = document.getElementById('btn-like');
    const btnDislike = document.getElementById('btn-dislike');
    const likeIcon = document.getElementById('like-icon');
    const dislikeIcon = document.getElementById('dislike-icon');
    const likeCountEl = document.getElementById('like-count');

    if (window.currentGameStats.userDisliked) {
        window.currentGameStats.userDisliked = false;
        btnDislike.classList.remove('disliked');
        dislikeIcon.classList.replace('fas', 'far');
    } else {
        window.currentGameStats.userDisliked = true;
        btnDislike.classList.add('disliked');
        dislikeIcon.classList.replace('far', 'fas');

        if (window.currentGameStats.userLiked) {
            window.currentGameStats.userLiked = false;
            window.currentGameStats.likes--;
            btnLike.classList.remove('liked');
            likeIcon.classList.replace('fas', 'far');
            likeCountEl.textContent = formatWatchNumber(window.currentGameStats.likes);
        }
    }

    saveVideoStats();
};

function saveVideoStats() {
    let allStats = {};
    try { allStats = JSON.parse(localStorage.getItem('gv_video_stats') || '{}'); } catch (e) { }
    allStats[window.currentGameId] = window.currentGameStats;
    localStorage.setItem('gv_video_stats', JSON.stringify(allStats));
}

function formatWatchNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function renderSuggestions(currentId) {
    const list = document.getElementById('suggestions-list');
    let all = [...GAMES_DATA];
    try {
        const extraGames = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
        const extraVideos = JSON.parse(localStorage.getItem('gv_extra_videos') || '[]');
        const subs = JSON.parse(localStorage.getItem('gv_submissions') || '[]');
        all = [...all, ...extraGames, ...extraVideos, ...subs];
    } catch (e) { }

    // 1. Get games with videos (excluding current)
    let videoGames = all.filter(g => g.videoUrl && g.id != currentId);

    // 2. If we have fewer than 3 video games, supplement with regular featured games
    let suggestions = [...videoGames];
    if (suggestions.length < 4) {
        const others = all.filter(g => !g.videoUrl && g.id != currentId);
        suggestions = [...suggestions, ...others.slice(0, 4 - suggestions.length)];
    }

    if (suggestions.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted)">لا توجد اقتراحات أخرى.</p>';
        return;
    }

    let allStats = {};
    try { allStats = JSON.parse(localStorage.getItem('gv_video_stats') || '{}'); } catch (e) { }

    list.innerHTML = suggestions.slice(0, 8).map(g => {
        const thumb = getThumb(g);
        const isVideo = !!g.videoUrl;

        let viewsStr = '0 مشاهدة';
        if (isVideo) {
            let baseViews = 0;
            if (g.id === 'guide1') baseViews = 45000;
            else if (g.id === 'guide2') baseViews = 128000;
            else if (g.id === 'guide3') baseViews = 89000;
            else if (g.downloads) baseViews = Math.floor(g.downloads * 1.5);

            const stats = allStats[g.id];
            const viewsNum = stats ? stats.views : baseViews;
            viewsStr = (viewsNum >= 1000 ? (viewsNum / 1000).toFixed(1) + 'K' : viewsNum) + ' مشاهدة';
        } else {
            viewsStr = 'معاينة اللعبة';
        }

        return `
            <div class="suggested-card" onclick="window.location.href='${isVideo ? 'watch.html?id=' + g.id : 'game.html?id=' + g.id}'">
                <div class="suggested-thumb" style="background-image:url('${thumb}');">
                    ${isVideo ? `<div class="play-overlay"><div class="play-btn" style="width:36px; height:36px; font-size:0.85rem;"><i class="fas fa-play"></i></div></div>` : ''}
                </div>
                <div class="suggested-info">
                    <div class="suggested-title">${g.name}</div>
                    <div class="suggested-meta">
                        <div class="game-category" style="margin:0 0 6px 0; padding:2px 6px; font-size:0.6rem; max-width:max-content;">${g.category || 'ألعاب'}</div>
                        <div style="display:flex; align-items:center; gap:5px; font-weight:600;"><i class="fas fa-eye" style="color:var(--text-dim); font-size:0.7rem;"></i> ${viewsStr}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getThumb(g) {
    if (!g.videoUrl) return g.imageUrl || '';
    const ytMatch = g.videoUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (ytMatch && ytMatch[1]) return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
    return g.imageUrl || '';
}

function getEmbedUrl(url) {
    if (!url) return '';
    url = url.trim();

    // YouTube (standard, mobile, be, embed, shorts, share)
    const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtu\.be\/|m\.youtube\.com\/watch\?v=)([^&\n?#]+)/);
    if (ytMatch && ytMatch[1]) {
        // Clean potential trailing junk from share parameters
        const cleanId = ytMatch[1].split(/[?&]/)[0];
        return `https://www.youtube.com/embed/${cleanId}?autoplay=1&rel=0&enablejsapi=1`;
    }

    // Vimeo
    const vimMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/)(\d+)/);
    if (vimMatch && vimMatch[1]) return `https://player.vimeo.com/video/${vimMatch[1]}?autoplay=1`;

    // Direct Video Link (MP4, WebM, OGG)
    if (url.match(/\.(mp4|webm|ogg)(?:[?#]|$)/i)) return url;

    return url;
}

// ==========================================
// ORIENTATION LOCK (FOR MOBILE FULLSCREEN)
// ==========================================
function lockOrientation() {
    if (window.innerWidth > 1024) return; // Only for mobile/tablet
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(err => {
            console.log("Orientation lock failed:", err);
        });
    }
}

function unlockOrientation() {
    if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
    }
}

function handleIframeFullscreen() {
    const isFS = document.fullscreenElement || document.webkitFullscreenElement;
    if (isFS) {
        lockOrientation();
    } else {
        unlockOrientation();
    }
}

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
    if (!gameId) return;
    const all = getComments();
    const gameComments = all[gameId] || [];
    const totalCount = calculateTotalComments(gameComments);

    const countEl = document.getElementById('comments-count');
    if (countEl) countEl.textContent = totalCount;

    // Mobile Count & Preview
    const mobileCountEl = document.getElementById('mobile-comments-count');
    if (mobileCountEl) mobileCountEl.textContent = totalCount;

    // Bottom Sheet Title Update (if open)
    const sheetTitle = document.getElementById('sheet-title');
    const sheet = document.getElementById('bottom-sheet');
    if (sheet && sheet.classList.contains('active') && sheetTitle && sheetTitle.innerHTML.includes('التعليقات')) {
        sheetTitle.innerHTML = `<i class="fas fa-comments" style="margin-left:8px"></i> التعليقات (${totalCount})`;
    }

    const mobilePreviewEl = document.getElementById('mobile-comments-preview');
    if (mobilePreviewEl) {
        if (gameComments.length > 0) {
            const lastComment = gameComments[gameComments.length - 1];
            mobilePreviewEl.textContent = `${lastComment.user}: ${lastComment.text.substring(0, 40)}${lastComment.text.length > 40 ? '...' : ''}`;
        } else {
            mobilePreviewEl.textContent = 'لا يوجد تعليقات بعد. كن أول من يعلق!';
        }
    }

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
                        <textarea id="comment-input" placeholder="شاركنا رأيك في هذا الفيديو..." onfocus="this.style.borderColor='var(--primary-light)';this.style.background='rgba(255,255,255,0.04)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)';this.style.background='rgba(255,255,255,0.02)'"></textarea>
                        <div style="display:flex; justify-content:flex-end; margin-top:12px;">
                            <button class="btn-primary" style="padding:10px 28px; font-weight:700; border-radius:12px; font-size:0.95rem; cursor:pointer;" onclick="submitVideoComment('${gameId}')">نشر التعليق</button>
                        </div>
                    </div>
                </div>
                <style>
                    .comment-input-wrapper { display:flex; gap:15px; align-items:flex-start; margin-bottom: 40px; }
                    .comment-avatar-circle { width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg,var(--primary),var(--accent)); display:flex; align-items:center; justify-content:center; font-size:1.3rem; font-weight:bold; color:#fff; flex-shrink:0; box-shadow:0 5px 15px rgba(168,85,247,0.3); }
                    #comment-input { width:100%; min-height:80px; background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:14px; padding:15px; color:var(--text); font-family:inherit; font-size:1rem; resize:vertical; outline:none; transition:all 0.3s; box-shadow:inset 0 4px 10px rgba(0,0,0,0.1); display:block; }
                    @media (max-width: 500px) {
                        .comment-input-wrapper { flex-direction: column; align-items: center; text-align: center; }
                        .comment-avatar-circle { margin-bottom: 10px; }
                    }
                </style>
            `;
        } else {
            inputEl.innerHTML = `
                <div style="background:rgba(255,255,255,0.02); border:1px dashed var(--border); border-radius:16px; padding:35px 20px; text-align:center; margin-bottom:40px;">
                    <div style="font-size:2.5rem; margin-bottom:12px; opacity:0.8">💬</div>
                    <h4 style="color:var(--text); margin-bottom:8px; font-size:1.2rem; font-weight:700;">شارك في حوار المجتمع</h4>
                    <p style="color:var(--text-muted); font-size:0.95rem; margin-bottom:20px;">قم بتسجيل الدخول لتتمكن من إضافة تعليقك.</p>
                    <a href="auth.html" class="btn-primary" style="display:inline-block; padding:12px 30px; border-radius:12px; text-decoration:none; font-weight:700;">تسجيل الدخول</a>
                </div>
            `;
        }
    }

    const list = document.getElementById('comments-list');
    if (!list) return;

    if (gameComments.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--text-muted); font-size:1rem; background:rgba(255,255,255,0.01); border-radius:16px; border:1px solid rgba(255,255,255,0.02)">لا توجد تعليقات حتى الآن. كن أول من يعلق!</div>`;
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
                                <span class="comment-date"><i class="far fa-clock"></i> ${c.date}</span>
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
                
                ${repliesHtml.length > 0 ? `<div class="replies-section">${repliesHtml}</div>` : ''}

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

window.cancelReply = function (el, commentId) {
    const container = el.closest('.comment-item-wrapper');
    const wrapper = container.querySelector('.reply-form-container');
    if (wrapper) {
        wrapper.classList.remove('active');
        const input = wrapper.querySelector('.reply-textarea');
        if (input) input.value = '';
    }
}

window.deleteComment = function (gameId, commentId, parentId = null) {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا التعليق؟')) return;

    const all = getComments();
    if (!all[gameId]) return;

    if (parentId) {
        // Deleting a reply
        const parent = all[gameId].find(c => c.id == parentId);
        if (parent && parent.replies) {
            parent.replies = parent.replies.filter(r => r.id != commentId);
        }
    } else {
        // Deleting a main comment
        all[gameId] = all[gameId].filter(c => c.id != commentId);
    }

    saveComments(all);
    renderComments(gameId);

    // Sync mobile sheet if active
    const sheet = document.getElementById('bottom-sheet');
    if (sheet && sheet.classList.contains('active')) {
        document.getElementById('sheet-body').innerHTML = document.getElementById('comments-list').innerHTML;
    }

    if (typeof showToast === 'function') showToast('✅ تم حذف التعليق بنجاح', 'success');
}

window.showReplyInput = function (el, commentId) {
    const container = el.closest('.comment-item-wrapper');
    const wrapper = container.querySelector('.reply-form-container');

    if (wrapper) {
        const isActive = wrapper.classList.contains('active');

        // Only close others if we are opening this one (for desktop)
        if (!isActive) {
            document.querySelectorAll('.reply-form-container').forEach(w => w.classList.remove('active'));
            wrapper.classList.add('active');

            // Auto-scroll into view for mobile
            setTimeout(() => {
                wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        } else {
            wrapper.classList.remove('active');
        }

        const input = wrapper.querySelector('.reply-textarea');
        if (input && !isActive) setTimeout(() => input.focus(), 100);
    }
}

window.submitReply = function (el, gameId, parentId) {
    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (!currentUser) {
        if (typeof showToast === 'function') showToast("❌ يجب تسجيل الدخول للرد", 'error');
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

    // If mobile bottom sheet is open, update it
    const isSheetActive = document.getElementById('bottom-sheet').classList.contains('active');
    if (isSheetActive) {
        document.getElementById('sheet-body').innerHTML = document.getElementById('comments-list').innerHTML;
    }

    if (typeof showToast === 'function') showToast('✅ تم إضافة ردك بنجاح', 'success');
}

window.replyToUser = function (el, parentId, username) {
    const mainWrapper = el.closest('.comment-item-wrapper');
    const wrapper = mainWrapper.querySelector('.reply-form-container');

    if (wrapper) {
        wrapper.classList.add('active');

        // Auto-scroll into view for mobile
        setTimeout(() => {
            wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);

        const input = wrapper.querySelector('.reply-textarea');
        if (input) {
            input.value = `@${username} `;
            setTimeout(() => {
                input.focus();
                input.selectionStart = input.selectionEnd = input.value.length;
            }, 100);
        }
    }
}

window.submitVideoComment = function (gameId, isMobile = false) {
    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (!currentUser) {
        if (typeof showToast === 'function') showToast("❌ يجب تسجيل الدخول للتعليق", 'error');
        else alert("❌ عذراً، يجب عليك تسجيل الدخول أولاً لتتمكن من إضافة تعليقك.");
        return;
    }

    const inputId = isMobile ? 'sheet-comment-input' : 'comment-input';
    const inputField = document.getElementById(inputId);
    const text = inputField ? inputField.value.trim() : '';

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

    if (inputField) inputField.value = '';

    renderComments(gameId);

    // If we are in mobile sheet, update the list 
    const sheetBody = document.getElementById('sheet-body');
    const isSheetActive = document.getElementById('bottom-sheet').classList.contains('active');

    if (isSheetActive && isMobile) {
        // Re-render list inside the sheet
        const commentsListHtml = document.getElementById('comments-list').innerHTML;
        sheetBody.innerHTML = commentsListHtml;
        // Scroll to the new comment (at the bottom since we reversed it? Wait, renderComments reverses it)
        // Actually, renderComments populates 'comments-list'.
        setTimeout(() => { sheetBody.scrollTop = sheetBody.scrollHeight; }, 100);
    }

    if (typeof showToast === 'function') showToast('✅ تم نشر التعليق بنجاح!', 'success');
}

// ==========================================
// BOTTOM SHEET LOGIC (MOBILE)
// ==========================================
window.openBottomSheet = function (type) {
    const sheet = document.getElementById('bottom-sheet');
    const overlay = document.getElementById('sheet-overlay');
    const body = document.getElementById('sheet-body');
    const title = document.getElementById('sheet-title');
    const footer = document.getElementById('sheet-footer');

    if (!sheet || !overlay || !body) return;

    // Reset footer
    if (footer) footer.style.display = 'none';

    if (type === 'desc') {
        title.innerHTML = '<i class="fas fa-align-right" style="margin-left:8px"></i> الوصف';
        body.innerHTML = `<div class="video-description" style="margin:0">${document.getElementById('video-desc').innerHTML}</div>`;
    } else if (type === 'comments') {
        title.innerHTML = `<i class="fas fa-comments" style="margin-left:8px"></i> التعليقات (${document.getElementById('comments-count').textContent})`;

        // Use the same list as desktop
        body.innerHTML = document.getElementById('comments-list').innerHTML;

        // Show sticky footer
        if (footer) {
            footer.style.display = 'flex';
            const currUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
            const footerAvatar = document.getElementById('sheet-footer-avatar');
            if (footerAvatar) {
                footerAvatar.textContent = currUser ? currUser.name.charAt(0).toUpperCase() : '?';
            }
        }
    }

    overlay.classList.add('active');
    sheet.classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.closeBottomSheet = function () {
    const sheet = document.getElementById('bottom-sheet');
    const overlay = document.getElementById('sheet-overlay');
    const footer = document.getElementById('sheet-footer');

    if (sheet) sheet.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    if (footer) footer.style.display = 'none';
    document.body.style.overflow = '';
}

// ==========================================
// REPORTING SYSTEM
// ==========================================
window.openReportModal = function (id, type) {
    if (!id) return;

    // Inject Styles if missing
    if (!document.getElementById('report-modal-styles')) {
        const s = document.createElement('style');
        s.id = 'report-modal-styles';
        s.textContent = `
            .report-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); z-index: 9999; display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.3s; pointer-events:none; }
            .report-overlay.active { opacity: 1; pointer-events:auto; }
            .report-modal { background: var(--bg-card); border: 1px solid var(--border); border-radius: 24px; padding: 35px; width: 90%; max-width: 500px; box-shadow: 0 40px 100px rgba(0,0,0,0.8); transform: scale(0.9) translateY(20px); transition: 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); position: relative; color: var(--text); }
            .report-overlay.active .report-modal { transform: scale(1) translateY(0); }
            .report-modal h3 { font-family: 'Rajdhani', sans-serif; font-size: 1.6rem; margin: 0 0 10px; display:flex; align-items:center; gap:12px; }
            .report-modal h3 i { color: var(--red); }
            .report-modal p { color: var(--text-muted); line-height: 1.6; margin-bottom:25px; font-size:0.95rem; }
            .report-form-group { margin-bottom: 20px; }
            .report-form-group label { display: block; color: var(--text-dim); margin-bottom: 8px; font-weight: 600; font-size:0.9rem; }
            .report-select, .report-textarea { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 12px; color: var(--text); font-family: inherit; font-size: 1rem; outline: none; }
            .report-textarea { height: 100px; resize: none; }
            .report-btn-send { width: 100%; padding: 15px; background: linear-gradient(135deg, #ef4444, #b91c1c); border: none; border-radius: 14px; color: #fff; font-weight: 800; font-size: 1.1rem; cursor: pointer; transition: 0.3s; margin-top: 10px; }
            .report-btn-send:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(239,68,68,0.3); }
            .report-close { position: absolute; top: 15px; left: 15px; background: none; border: none; color: var(--text-dim); font-size: 1.4rem; cursor: pointer; }
        `;
        document.head.appendChild(s);
    }

    let overlay = document.getElementById('report-overlay');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'report-overlay';
    overlay.className = 'report-overlay';
    overlay.innerHTML = `
        <div class="report-modal">
            <button class="report-close" onclick="closeReportModal()">&times;</button>
            <h3><i class="fas fa-flag"></i> الإبلاغ عن مشكلة</h3>
            <p>بلاغ بخصوص: <strong>${window.currentGameName || 'هذا الفيديو'}</strong></p>
            
            <div class="report-form-group">
                <label>نوع المشكلة:</label>
                <select id="report-reason" class="report-select">
                    <option value="broken">الفيديو لا يفتح</option>
                    <option value="wrong">محتوى خاطئ</option>
                    <option value="quality">جودة سيئة</option>
                    <option value="copyright">حقوق الملكية</option>
                    <option value="other">سبب آخر</option>
                </select>
            </div>

            <div class="report-form-group">
                <label>تفاصيل (اختياري):</label>
                <textarea id="report-details" class="report-textarea" placeholder="أخبرنا بالمزيد..."></textarea>
            </div>

            <button class="report-btn-send" onclick="submitVideoReport('${id}', '${type}')">إرسال البلاغ</button>
        </div>
    `;
    overlay.onclick = (e) => { if (e.target === overlay) closeReportModal(); };
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 10);
}

window.closeReportModal = function () {
    const overlay = document.getElementById('report-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    }
}

window.submitVideoReport = function (id, type) {
    const reason = document.getElementById('report-reason').value;
    const details = document.getElementById('report-details').value;
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

    const report = {
        id: Date.now(),
        targetId: id,
        targetType: type,
        targetName: window.currentGameName || 'Video',
        reason: reason,
        details: details,
        user: user ? user.name : 'Guest',
        date: new Date().toISOString(),
        status: 'pending'
    };

    let all = JSON.parse(localStorage.getItem('gv_reports') || '[]');
    all.push(report);
    localStorage.setItem('gv_reports', JSON.stringify(all));

    closeReportModal();
    if (typeof showToast === 'function') showToast('✅ تم استلام بلاغك بنجاح، شكراً لك.', 'success');
    else alert('✅ تم استلام بلاغك بنجاح، شكراً لك.');
}
