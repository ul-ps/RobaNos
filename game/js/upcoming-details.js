// Upcoming Game Details - Article Page Logic
window.addEventListener('firebaseDataReady', () => {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('id');

    if (!gameId) {
        window.location.href = 'upcoming.html';
        return;
    }

    const games = JSON.parse(localStorage.getItem('gv_upcoming_games') || '[]');
    const game = games.find(g => g.id == gameId);

    if (!game) {
        document.getElementById('article-container').innerHTML = `
            <div style="text-align:center; padding: 100px; color:var(--text-dim);">
                <h2>عذراً، اللعبة غير موجودة</h2>
                <a href="upcoming.html" class="btn-primary" style="display:inline-block; margin-top:20px;">العودة للألعاب القادمة</a>
            </div>
        `;
        return;
    }

    renderArticle(game);
});

function renderArticle(game) {
    const container = document.getElementById('article-container');
    const videoId = extractYoutubeId(game.trailerUrl);
    const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0` : null;

    // Admin Controls moved to hero section for better visibility
    let adminButtons = '';
    if (typeof isAdmin === 'function' && isAdmin()) {
        adminButtons = `
            <div class="admin-article-controls" style="position: absolute; top: 30px; left: 30px; z-index: 10; display:flex; gap:10px;">
                <button class="admin-action-btn btn-edit-premium" id="btn-edit-article">
                    <i class="fas fa-edit"></i> تعديل
                </button>
                <button class="admin-action-btn btn-delete-premium" id="btn-delete-article">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }

    container.innerHTML = `
        <header class="article-hero" style="background-image:url('${game.imageUrl}')">
            ${adminButtons}
            <div class="article-hero-content">
                <div class="article-title-wrap">
                    <span class="article-badge">${game.category}</span>
                    <h1>${game.name}</h1>
                </div>
                <div class="hero-status">
                    <div style="color:var(--primary-light); font-weight:800; text-align:left;">موعد الإصدار: ${game.releaseDate}</div>
                </div>
            </div>
        </header>

        <div class="article-layout">
            <main class="article-main">
                <div class="article-text">
                    ${game.description || 'لا يوجد وصف متاح لهذه اللعبة حتى الآن. ترقبوا المزيد من التفاصيل قريباً عبر قناة RobaNos الرسمية.'}
                </div>
                
                ${embedUrl ? `
                    <div class="trailer-section">
                        <h2 style="margin-bottom:20px;"><i class="fas fa-play-circle"></i> العرض الدعائي الرسمي</h2>
                        <div class="trailer-embed">
                            <iframe src="${embedUrl}" allowfullscreen></iframe>
                        </div>
                    </div>
                ` : ''}
            </main>

            <aside class="article-sidebar">
                <div class="side-widget big-cd">
                    <h3 class="widget-title"><i class="fas fa-clock"></i> العد التنازلي للإطلاق</h3>
                    <div class="big-cd-grid" id="article-cd" style="grid-template-columns: repeat(4, 1fr);">
                        <!-- Days, Hours, Min, Sec -->
                    </div>
                    <button id="detail-notify-btn" class="btn-notify-big ${JSON.parse(localStorage.getItem('gv_upcoming_notified') || '[]').includes(game.id) ? 'active' : ''}" onclick="toggleNotifyDetail(${game.id})">
                        ${JSON.parse(localStorage.getItem('gv_upcoming_notified') || '[]').includes(game.id) ? '<i class="fas fa-check-circle"></i> تم تفعيل التنبيه' : '<i class="fas fa-bell"></i> أعلمني عند الإصدار'}
                    </button>
                </div>

                <div class="side-widget info-card">
                    <h3 class="widget-title"><i class="fas fa-info-circle"></i> بطاقة المعلومات</h3>
                    <div class="info-item">
                        <span class="info-label">المطور / الشركة</span>
                        <span class="info-val">${game.developer || 'غير محدد'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">الناشر</span>
                        <span class="info-val">RobaNos Official</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">تاريخ الإصدار</span>
                        <span class="info-val">${game.releaseDate}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">التصنيف</span>
                        <span class="info-val">${game.category}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">المنصات</span>
                        <span class="info-val">PC, PS5, Xbox</span>
                    </div>
                </div>
            </aside>
        </div>
    `;

    if (game.preciseDate) {
        startArticleCountdown(new Date(game.preciseDate).getTime());
    }

    // Attach Admin Events
    const editBtn = document.getElementById('btn-edit-article');
    const delBtn = document.getElementById('btn-delete-article');
    if (editBtn) editBtn.onclick = () => openEditInArticle(game);
    if (delBtn) delBtn.onclick = () => deleteInArticle(game.id);
}

function getSeasonYear(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const month = date.getMonth();
    const year = date.getFullYear();
    let season = '';
    if (month >= 2 && month <= 4) season = 'ربيع';
    else if (month >= 5 && month <= 7) season = 'صيف';
    else if (month >= 8 && month <= 10) season = 'خريف';
    else season = 'شتاء';
    return `${season} ${year}`;
}

function openEditInArticle(game) {
    const modal = document.getElementById('up-modal');
    if (!modal) return;

    document.getElementById('up-title').value = game.name;
    document.getElementById('up-developer').value = game.developer || '';
    document.getElementById('up-cat').value = game.category;
    document.getElementById('up-precise-date').value = game.preciseDate || '';
    document.getElementById('up-trailer').value = game.trailerUrl || '';
    document.getElementById('up-desc').value = game.description || '';
    document.getElementById('up-img').value = game.imageUrl || '';

    modal.classList.add('active');

    document.getElementById('up-form').onsubmit = (e) => {
        e.preventDefault();
        const games = JSON.parse(localStorage.getItem('gv_upcoming_games') || '[]');
        const idx = games.findIndex(g => g.id == game.id);
        if (idx !== -1) {
            const pDate = document.getElementById('up-precise-date').value;
            games[idx] = {
                ...game,
                name: document.getElementById('up-title').value,
                developer: document.getElementById('up-developer').value,
                category: document.getElementById('up-cat').value,
                preciseDate: pDate,
                releaseDate: getSeasonYear(pDate),
                trailerUrl: document.getElementById('up-trailer').value,
                description: document.getElementById('up-desc').value,
                imageUrl: document.getElementById('up-img').value
            };
            localStorage.setItem('gv_upcoming_games', JSON.stringify(games));
            location.reload();
        }
    };
}

function deleteInArticle(id) {
    const modal = document.getElementById('confirm-modal');
    const btn = document.getElementById('confirm-delete-btn');
    if (!modal || !btn) return;

    modal.classList.add('active');
    btn.onclick = () => {
        let games = JSON.parse(localStorage.getItem('gv_upcoming_games') || '[]');
        games = games.filter(g => g.id != id);
        localStorage.setItem('gv_upcoming_games', JSON.stringify(games));
        window.location.href = 'upcoming.html';
    };
}

window.closeConfirmModal = function () {
    document.getElementById('confirm-modal').classList.remove('active');
}

function startArticleCountdown(targetDate) {
    const update = () => {
        const now = new Date().getTime();
        const gap = targetDate - now;
        const grid = document.getElementById('article-cd');
        if (!grid) return;

        if (gap <= 0) {
            grid.innerHTML = "<div class='article-badge' style='grid-column: 1/-1; padding: 20px;'>تم الإصدار الآن!</div>";
            return;
        }

        const d = Math.floor(gap / (1000 * 60 * 60 * 24));
        const h = Math.floor((gap % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((gap % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((gap % (1000 * 60)) / 1000);

        grid.innerHTML = `
            <div class="cd-box"><div class="cd-val">${d}</div><div class="cd-lbl">يوم</div></div>
            <div class="cd-box"><div class="cd-val">${h.toString().padStart(2, '0')}</div><div class="cd-lbl">ساعة</div></div>
            <div class="cd-box"><div class="cd-val">${m.toString().padStart(2, '0')}</div><div class="cd-lbl">دقيقة</div></div>
            <div class="cd-box"><div class="cd-val">${s.toString().padStart(2, '0')}</div><div class="cd-lbl">ثانية</div></div>
        `;
    };
    update();
    setInterval(update, 1000);
}

function extractYoutubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

window.toggleNotifyDetail = function (id) {
    if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
        if (typeof showToast === 'function') showToast('يرجى تسجيل الدخول أولاً لتفعيل التنبيهات', 'error');
        else alert('يرجى تسجيل الدخول أولاً لتفعيل التنبيهات');
        return;
    }
    let notifiedIds = JSON.parse(localStorage.getItem('gv_upcoming_notified') || '[]');
    const idx = notifiedIds.indexOf(id);
    const btn = document.getElementById('detail-notify-btn');

    if (idx === -1) {
        notifiedIds.push(id);
        if (typeof showToast === 'function') showToast('✅ تم تفعيل التنبيه', 'success');
        if (btn) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-check-circle"></i> تم تفعيل التنبيه';
        }
    } else {
        notifiedIds.splice(idx, 1);
        if (typeof showToast === 'function') showToast('ℹ️ تم إلغاء التنبيه', 'info');
        if (btn) {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fas fa-bell"></i> أعلمني عند الإصدار';
        }
    }
    localStorage.setItem('gv_upcoming_notified', JSON.stringify(notifiedIds));
};
