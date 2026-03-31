/* ========================================================
   videos.js — Videos Gallery Logic | GameVault
   ======================================================== */

let GAMES_DATA = [];

const GUIDES_DATA = [];

let currentCategory = 'الكل';
let currentSearchQuery = '';
let allOfficialVideos = [];
let allGeneralVideos = [];

window.addEventListener('firebaseDataReady', () => {
    initVideos();
    checkSubscriptionStatus();
});

function checkSubscriptionStatus() {
    const btn = document.getElementById('btn-subscribe');
    if (!btn) return;
    
    // Check if user is logged in (using auth.js helper if available, or direct localStorage)
    const user = JSON.parse(localStorage.getItem('gv_session') || 'null');
    if (!user) {
        btn.innerHTML = '<i class="fas fa-bell"></i> تسجيل للاشتراك';
        return;
    }

    const subscriptions = JSON.parse(localStorage.getItem('gv_subscriptions') || '{}');
    const isSubscribed = subscriptions[user.id] === true;

    if (isSubscribed) {
        btn.innerHTML = '<i class="fas fa-check"></i> تم الاشتراك';
        btn.classList.add('subscribed'); // We can add CSS for this if needed
        btn.style.background = 'rgba(255,255,255,0.1)';
    } else {
        btn.innerHTML = '<i class="fas fa-bell"></i> اشتراك';
        btn.classList.remove('subscribed');
        btn.style.background = 'var(--primary)';
    }
}

window.handleSubscribe = function() {
    const user = JSON.parse(localStorage.getItem('gv_session') || 'null');
    if (!user) {
        if (typeof showToast === 'function') {
            showToast('يرجى تسجيل الدخول أولاً للاشتراك', 'error');
        }
        return;
    }

    const subscriptions = JSON.parse(localStorage.getItem('gv_subscriptions') || '{}');
    const isSubscribed = subscriptions[user.id] === true;

    if (isSubscribed) {
        delete subscriptions[user.id];
        if (typeof showToast === 'function') showToast('تم الغاء الاشتراك في القناة', 'info');
    } else {
        subscriptions[user.id] = true;
        if (typeof showToast === 'function') showToast('تم الاشتراك في القناة بنجاح!', 'success');
    }

    localStorage.setItem('gv_subscriptions', JSON.stringify(subscriptions));
    checkSubscriptionStatus();
};

function initVideos() {
    // Migration: Move standalone videos from gv_extra_games to gv_extra_videos
    try {
        let extraGames = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
        let extraVideos = JSON.parse(localStorage.getItem('gv_extra_videos') || '[]');
        const standaloneVideos = extraGames.filter(g => g.type === 'official' || g.type === 'general');
        
        if (standaloneVideos.length > 0) {
            // Add to videos if not already there
            standaloneVideos.forEach(v => {
                if (!extraVideos.find(sv => sv.id == v.id)) {
                    extraVideos.push(v);
                }
            });
            // Remove from games
            const remainingGames = extraGames.filter(g => g.type !== 'official' && g.type !== 'general');
            localStorage.setItem('gv_extra_games', JSON.stringify(remainingGames));
            localStorage.setItem('gv_extra_videos', JSON.stringify(extraVideos));
            console.log(`Migrated ${standaloneVideos.length} videos from games storage.`);
        }
    } catch(e) { console.error("Migration Error:", e); }

    allOfficialVideos = [...GUIDES_DATA];
    allGeneralVideos = [...GAMES_DATA.filter(g => g.videoUrl)];

    try {
        const extraVideos = JSON.parse(localStorage.getItem('gv_extra_videos') || '[]');
        extraVideos.forEach(v => {
            if (!v.videoUrl) return;
            if (v.type === 'official') {
                allOfficialVideos.push(v);
            } else {
                allGeneralVideos.push(v);
            }
        });
        
        const extraGames = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
        extraGames.forEach(g => {
            if (g.videoUrl && !allGeneralVideos.find(v => v.id == g.id)) {
                allGeneralVideos.push(g);
            }
        });
        
        const subs = JSON.parse(localStorage.getItem('gv_submissions') || '[]');
        subs.forEach(s => {
            if (!s.videoUrl) return;
            
            // DEDUPLICATION: Check if this submission is already published or in the official list
            const isPublished = extraGames.some(eg => eg.id == s.id || eg.originalSubId == s.subId || (eg.name === s.name && eg.videoUrl));
            const inOfficial = allOfficialVideos.some(ov => ov.id == s.id || (ov.name === s.name && ov.videoUrl));
            
            if (!isPublished && !inOfficial && !allGeneralVideos.find(g => g.id == s.id)) {
                allGeneralVideos.push(s);
            }
        });
    } catch(e) {}

    // Sort: Newest first (Descending by ID)
    const sortFn = (a, b) => {
        const idA = isNaN(a.id) ? 0 : parseFloat(a.id);
        const idB = isNaN(b.id) ? 0 : parseFloat(b.id);
        return idB - idA;
    };

    allOfficialVideos.sort(sortFn);
    allGeneralVideos.sort(sortFn);

    renderOfficialVideos();
    renderVideos();
}

window.applyVideoFilter = function(category) {
    currentCategory = category;
    renderVideos();
};

window.triggerVideoSearch = function(query) {
    currentSearchQuery = query.toLowerCase();
    renderVideos();
};

function getStats(id) {
    try {
        const allStats = JSON.parse(localStorage.getItem('gv_video_stats') || '{}');
        return allStats[id] || null;
    } catch(e) { return null; }
}

function renderOfficialVideos() {
    const grid = document.getElementById('official-videos-grid');
    if (!grid) return;

    const admin = typeof isAdmin === 'function' && isAdmin();
    const branding = getBranding();
    const siteName = branding.name;

    if (allOfficialVideos.length === 0) {
        grid.innerHTML = `
          <div style="width: 100%; text-align: center; padding: 40px; color: var(--text-muted); grid-column: 1 / -1; background: rgba(255,255,255,0.02); border-radius: 20px; border: 1px dashed rgba(255,255,255,0.1);">
            <i class="fas fa-video-slash" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
            <h3>لا توجد فيديوهات رسمية حالياً</h3>
            <p style="margin-top: 10px;">لم يتم رفع أي محتوى رسمي بعد.</p>
          </div>
        `;
    } else {
        grid.innerHTML = allOfficialVideos.map(v => {
        const thumb = getThumb(v);
        const stats = getStats(v.id);
        const viewsStr = stats ? stats.views : (v.id.toString().startsWith('guide') ? '45K+' : '0');
        const isEditable = !v.id.toString().startsWith('guide');
        
        const isOfficial = v.submittedBy.includes('Official') || v.submittedBy.includes(siteName);

        return `
          <div class="video-card">
            <div class="video-thumb-container" onclick="window.location.href='watch.html?id=${v.id}'">
              <div class="video-thumb" style="background-image:url('${thumb}');"></div>
              <div class="play-overlay"><div class="play-btn"><i class="fas fa-play"></i></div></div>
            </div>
            ${admin && isEditable ? `
              <div style="position:absolute; top:10px; left:10px; display:flex; gap:5px; z-index:20;">
                <button class="delete-v-btn" onclick="deleteVideo('${v.id}')" style="position:static; opacity:1; transform:none;"><i class="fas fa-trash-alt"></i></button>
                <button class="edit-v-btn" onclick="openEditVideo('${v.id}')" style="position:static; opacity:1; transform:none;"><i class="fas fa-edit"></i></button>
              </div>
            ` : ''}
            <div class="video-info" onclick="window.location.href='watch.html?id=${v.id}'">
              <div class="v-cat">${v.category}</div>
              <div class="v-title-text">${v.name}</div>
              <div class="v-meta">
                ${isOfficial ? '<span class="verified-badge"><i class="fas fa-check"></i></span> ' : ''}${v.submittedBy}
                <span style="margin: 0 8px; opacity: 0.5">·</span>
                <span><i class="far fa-eye"></i> ${viewsStr}</span>
              </div>
            </div>
          </div>
        `;
        }).join('');
    }

    // Update Slider UI
    setTimeout(() => {
        const section = grid.closest('.oc-slider-section');
        if (section) {
            const hasOverflow = grid.scrollWidth > grid.clientWidth;
            if (hasOverflow) {
                section.classList.add('has-overflow');
                grid.addEventListener('scroll', updateSliderButtons);
                updateSliderButtons(); // Initial call
            } else {
                section.classList.remove('has-overflow');
            }
        }
        updateOfficialStats();
    }, 200);
}

function updateOfficialStats() {
    const totalVideos = allOfficialVideos.length;
    let totalViews = 0;
    let totalLikes = 0;

    allOfficialVideos.forEach(v => {
        const stats = getStats(v.id);
        if (stats) {
            totalViews += (parseInt(stats.views) || 0);
            totalLikes += (parseInt(stats.likes) || 0);
        } else if (v.id.toString().startsWith('guide')) {
            totalViews += 45000; // Mock historical data for guides
        }
    });

    const format = (num) => num >= 1000 ? (num/1000).toFixed(1) + 'K' : num;

    const vEl = document.getElementById('oc-total-videos');
    const vwEl = document.getElementById('oc-total-views');
    const lEl = document.getElementById('oc-total-likes');

    if (vEl) vEl.innerText = totalVideos;
    if (vwEl) vwEl.innerText = format(totalViews);
    if (lEl) lEl.innerText = format(totalLikes);
}

window.deleteVideo = function(id) {
    if (typeof openConfirmModal !== 'function') {
        if (!confirm('هل أنت متأكد من حذف هذا الفيديو؟')) return;
        proceedDelete(id);
    } else {
        openConfirmModal(() => proceedDelete(id));
    }
};

function proceedDelete(id) {
    try {
        let extra = JSON.parse(localStorage.getItem('gv_extra_videos') || '[]');
        extra = extra.filter(v => v.id != id);
        localStorage.setItem('gv_extra_videos', JSON.stringify(extra));
        
        if (typeof showToast === 'function') {
            showToast('تم حذف الفيديو بنجاح', 'info');
        }
        
        initVideos(); // Refresh gallery
    } catch(e) {
        console.error(e);
        if (typeof showToast === 'function') showToast('حدث خطأ أثناء الحذف', 'error');
    }
}

function renderVideos() {
    const container = document.getElementById('videos-container');
    if (!container) return;
    
    const admin = typeof isAdmin === 'function' && isAdmin();
    let filtered = allGeneralVideos;
    
    if (currentCategory !== 'الكل') {
        filtered = filtered.filter(g => g.category === currentCategory);
    }
    
    if (currentSearchQuery) {
        filtered = filtered.filter(g => g.name.toLowerCase().includes(currentSearchQuery));
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:80px;grid-column:1/-1;color:var(--text-muted)">
                <i class="fas fa-search" style="font-size:3rem;margin-bottom:20px;opacity:0.2"></i>
                <h2>لا توجد نتائج بحث</h2>
                <p>جرب كلمات مفتاحية أخرى أو غير التصنيف.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map((g, index) => {
        const thumb = getThumb(g);
        const stats = getStats(g.id);
        const viewsNum = stats ? stats.views : 0;
        const viewsStr = viewsNum >= 1000 ? (viewsNum/1000).toFixed(1) + 'K' : viewsNum;
        const isEditable = !GAMES_DATA.find(orig => orig.id === g.id);

        return `
            <div class="video-card">
                <div class="video-thumb-container" onclick="window.location.href='watch.html?id=${g.id}'">
                    <div class="video-thumb" style="background-image:url('${thumb}')"></div>
                    <div class="play-overlay">
                        <div class="play-btn"><i class="fas fa-play"></i></div>
                    </div>
                </div>
                ${admin && isEditable ? `
                  <div style="position:absolute; top:10px; left:10px; display:flex; gap:5px; z-index:20;">
                    <button class="delete-v-btn" onclick="deleteVideo('${g.id}')" style="position:static; opacity:1; transform:none;"><i class="fas fa-trash-alt"></i></button>
                    <button class="edit-v-btn" onclick="openEditVideo('${g.id}')" style="position:static; opacity:1; transform:none;"><i class="fas fa-edit"></i></button>
                  </div>
                ` : ''}
                <div class="video-info" onclick="window.location.href='watch.html?id=${g.id}'">
                    <div class="v-cat">${g.category || 'عام'}</div>
                    <div class="v-title-text">${g.name}</div>
                    <div class="v-footer">
                        <span><i class="far fa-user"></i> ${g.submittedBy || getBranding().name}</span>
                        <span><i class="far fa-eye"></i> ${viewsStr} مشاهدة</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.openEditVideo = function(id) {
    const extra = JSON.parse(localStorage.getItem('gv_extra_videos') || '[]');
    const video = extra.find(v => v.id == id);
    if (!video) return;

    if (typeof openAddVideoModal === 'function') openAddVideoModal();
    
    const titleEl = document.querySelector('#add-video-modal h2');
    if (titleEl) titleEl.innerHTML = '<i class="fas fa-edit"></i> تعديل الفيديو';
    
    document.getElementById('v-title-input').value = video.name;
    document.getElementById('v-cat-input').value = video.category;
    document.getElementById('v-url-input').value = video.videoUrl;
    document.getElementById('v-thumb-input').value = video.imageUrl || '';
    document.getElementById('v-type-input').value = video.type || 'general';
    
    window.currentEditingVideoId = id;
};

function getThumb(v) {
    if (v.imageUrl && v.imageUrl.trim() !== '') return v.imageUrl;
    
    const url = v.videoUrl || '';
    const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (ytMatch && ytMatch[1]) return `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
    
    const vimMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/)(\d+)/);
    if (vimMatch && vimMatch[1]) return `https://vumbnail.com/${vimMatch[1]}.jpg`;
    
    return 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop';
}

function updateSliderButtons() {
    const grid = document.getElementById('official-videos-grid');
    const section = grid?.closest('.oc-slider-section');
    if (!grid || !section) return;

    const nextBtn = section.querySelector('.oc-nav-btn.next');
    const prevBtn = section.querySelector('.oc-nav-btn.prev');
    
    // RTL logic: scrollLeft is 0 at start (right), and negative when scrolling left.
    const scrollLeft = Math.abs(grid.scrollLeft);
    const maxScroll = grid.scrollWidth - grid.clientWidth;

    // Hide Next (Left arrow) if we reached the end (left side)
    if (scrollLeft >= maxScroll - 5) {
        if (nextBtn) nextBtn.style.opacity = '0';
        if (nextBtn) nextBtn.style.pointerEvents = 'none';
    } else {
        if (nextBtn) nextBtn.style.opacity = '1';
        if (nextBtn) nextBtn.style.pointerEvents = 'auto';
    }

    // Hide Prev (Right arrow) if we are at the start (right side)
    if (scrollLeft <= 5) {
        if (prevBtn) prevBtn.style.opacity = '0';
        if (prevBtn) prevBtn.style.pointerEvents = 'none';
    } else {
        if (prevBtn) prevBtn.style.opacity = '1';
        if (prevBtn) prevBtn.style.pointerEvents = 'auto';
    }
}

window.scrollOC = function(direction) {
    const wrapper = document.getElementById('official-videos-grid');
    if (!wrapper) return;
    // direction 1 = Next (Left), direction -1 = Prev (Right)
    // In RTL, to go LEFT (Next), we need to MOVE in the negative direction.
    const scrollAmount = -350 * direction; 
    wrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
};



