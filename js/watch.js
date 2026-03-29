/* ========================================================
   watch.js — Video Playback Logic | GameVault
   ======================================================== */

let GAMES_DATA = [];

const GUIDES_DATA = [
  { id: 'guide1', name: 'كيفية تحميل وتثبيت الألعاب بأمان', category: 'دليل وعملي', videoUrl: 'https://www.youtube.com/watch?v=kYmCscyXun0', submittedBy: `${getBranding().name} Official`, description: `دليل شامل يشرح كيفية تحميل الألعاب المحفوظة في المنصة وتثبيتها بأمان دون مشاكل.`, link: 'videos.html', imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop' },
  { id: 'guide2', name: 'الشرح الشامل: إنشاء حساب وطلب الألعاب', category: 'دليل وعملي', videoUrl: 'https://www.youtube.com/watch?v=0tUqIHwH60A', submittedBy: `${getBranding().name} Official`, description: `خطوات بسيطة وسريعة لإنشاء حسابك المخصص ضمن الموقع والبدء بطلب الألعاب أو نشر أعمالك.`, link: 'videos.html', imageUrl: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=2070&auto=format&fit=crop' },
  { id: 'guide3', name: 'استكشف ميزات الواجهة الاحترافية', category: 'الميزات', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', submittedBy: `${getBranding().name} Official`, description: `تعرف على كل ميزات الموقع وكيفية تصفح الأقسام للعثور على ألعابك المفضلة وتفعيل الألوام المخصصة بكفاءة.`, link: 'videos.html', imageUrl: 'https://images.unsplash.com/photo-1552824734-fe90c000f6c2?q=80&w=2070&auto=format&fit=crop' }
];

window.addEventListener('firebaseDataReady', () => {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('id');
    
    if (!gameId) {
        window.location.href = 'videos.html';
        return;
    }

    const game = findGame(gameId);
    if (!game || !game.videoUrl) {
        alert('الفيديو غير متوفر');
        window.location.href = 'videos.html';
        return;
    }

    renderVideo(game);
    renderSuggestions(gameId);
});

function findGame(id) {
    if (id.startsWith('guide')) {
        return GUIDES_DATA.find(g => g.id === id);
    }

    let all = [...GAMES_DATA];
    try {
        const extraGames = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
        const extraVideos = JSON.parse(localStorage.getItem('gv_extra_videos') || '[]');
        const subs = JSON.parse(localStorage.getItem('gv_submissions') || '[]');
        all = [...all, ...extraGames, ...extraVideos, ...subs];
    } catch(e) {}
    return all.find(g => g.id == id);
}

function renderVideo(game) {
    const container = document.getElementById('video-container');
    const embed = getEmbedUrl(game.videoUrl);
    
    if (embed.match(/\.(mp4|webm|ogg)(?:[?#]|$)/i)) {
        const playerId = 'plyr-' + Date.now();
        container.innerHTML = `<video id="${playerId}" src="${embed}" playsinline controls controlsList="nodownload" oncontextmenu="return false;" autoplay style="width:100%; height:100%; object-fit:contain; background:#000; border-radius:15px; border:1px solid var(--border);"></video>`;
        loadPlyr(() => {
            new Plyr(`#${playerId}`, {
                controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
                settings: ['quality', 'speed', 'loop']
            });
        });
    } else {
        container.innerHTML = `<iframe src="${embed}" allowfullscreen allow="autoplay; encrypted-media"></iframe>`;
    }
    
    document.getElementById('video-title').textContent = game.name;
    document.getElementById('game-author').textContent = game.submittedBy || 'GameVault'; 
    document.getElementById('game-cat').textContent = game.category || 'ألعاب';
    document.getElementById('video-desc').textContent = game.description || game.desc || 'لا يوجد وصف متاح لهذه اللعبة حالياً.';
    
    const btnView = document.getElementById('btn-view-game');
    if (String(game.id).startsWith('guide')) {
        btnView.innerHTML = '<i class="fas fa-arrow-right"></i> قناة الموقع';
        btnView.onclick = () => window.location.href = 'videos.html';
    } else {
        btnView.innerHTML = '<i class="fas fa-external-link-alt"></i> صفحة اللعبة';
        btnView.onclick = () => window.location.href = `game.html?id=${game.id}`;
    }
    
    // Load Stats from Local Storage or Initialize
    let allStats = {};
    try { allStats = JSON.parse(localStorage.getItem('gv_video_stats') || '{}'); } catch(e) {}
    
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

    // Update UI
    document.getElementById('view-count').textContent = formatWatchNumber(window.currentGameStats.views);
    document.getElementById('like-count').textContent = formatWatchNumber(window.currentGameStats.likes);
    
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

window.toggleLike = function() {
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

window.toggleDislike = function() {
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
    try { allStats = JSON.parse(localStorage.getItem('gv_video_stats') || '{}'); } catch(e) {}
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
    } catch(e) {}

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

    list.innerHTML = suggestions.slice(0, 8).map(g => {
        const thumb = getThumb(g);
        const isVideo = !!g.videoUrl;
        return `
            <div class="suggested-card" onclick="window.location.href='${isVideo ? 'watch.html?id='+g.id : 'game.html?id='+g.id}'">
                <div class="suggested-thumb" style="background-image:url('${thumb}'); display: flex; align-items: center; justify-content: center;">
                    ${isVideo ? '<i class="fas fa-play-circle" style="color:white; font-size:1.5rem; opacity:0.8; text-shadow:0 0 10px rgba(0,0,0,0.5)"></i>' : ''}
                </div>
                <div class="suggested-info">
                    <div class="suggested-title">${g.name}</div>
                    <div class="suggested-meta">
                        <span>${g.category || 'ألعاب'}</span>
                        <span>${isVideo ? Math.floor(Math.random()*500 + 10) + ' مشاهدة' : 'معاينة اللعبة'}</span>
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
    let match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (match && match[1]) return `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0`;
    
    match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/)(\d+)/);
    if (match && match[1]) return `https://player.vimeo.com/video/${match[1]}?autoplay=1`;

    return url;
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

