// Upcoming Games Logic - GameVault
const UP_GAMES_MOCK = [];

let upcomingGames = [];

window.addEventListener('firebaseDataReady', () => {
  initUpcoming();
  setupEventListeners();
  setInterval(() => renderUpcoming(upcomingGames), 60000); 
});

let sliderInterval;
let progressTimer;
let currentSlideIndex = 0;

function startSlider() {
  const featured = upcomingGames.slice(0, 4).sort((a,b) => new Date(a.preciseDate) - new Date(b.preciseDate));
  if (featured.length <= 1) return;
  
  if (sliderInterval) clearInterval(sliderInterval);
  if (progressTimer) clearInterval(progressTimer);

  let progress = 0;
  const duration = 10000; // 10s per slide
  const step = 100 / (duration / 100);

  progressTimer = setInterval(() => {
    progress += step;
    const activeLine = document.getElementById(`line-${currentSlideIndex}`);
    if (activeLine) activeLine.style.width = `${progress}%`;

    if (progress >= 100) {
      progress = 0;
      nextSlide();
    }
  }, 100);
}

window.nextSlide = function() {
  const featured = upcomingGames.slice(0, 4).sort((a,b) => new Date(a.preciseDate) - new Date(b.preciseDate));
  currentSlideIndex = (currentSlideIndex + 1) % featured.length;
  updateBannerUI(featured[currentSlideIndex]);
}

window.switchSlide = function(idx) {
  const featured = upcomingGames.slice(0, 4).sort((a,b) => new Date(a.preciseDate) - new Date(b.preciseDate));
  currentSlideIndex = idx;
  updateBannerUI(featured[idx]);
  startSlider(); // Reset timer
}

function updateBannerUI(game) {
  renderSlider(game);
  
  // Update Side Thumbs active state
  document.querySelectorAll('.side-thumb').forEach((thumb, i) => {
    thumb.classList.toggle('active', i === currentSlideIndex);
    const line = thumb.querySelector('.status-line');
    if (line) line.style.width = '0%';
  });
}

function renderSlider(game) {
  const banner = document.getElementById('main-banner');
  const sideNav = document.getElementById('banner-side-nav');
  if (!banner || !sideNav || !game) return;

  const featured = upcomingGames.slice(0, 4).sort((a,b) => new Date(a.preciseDate) - new Date(b.preciseDate));
  const targetDate = game.preciseDate ? new Date(game.preciseDate).getTime() : new Date().getTime();
  
  banner.style.backgroundImage = `linear-gradient(rgba(30, 27, 75, 0.4), rgba(49, 46, 129, 0.8)), url('${game.imageUrl}')`;
  
  const adminActive = (typeof isAdmin === 'function' && isAdmin());

  banner.innerHTML = `
    <div class="upcoming-banner-content">
      <div class="target-game-badge">
        <i class="fas fa-fire" style="color:#f59e0b"></i> الأكثر انتظاراً: ${game.name}
      </div>
      <h2>${game.name}</h2>
      <p>${game.category} - استعد لتجربة فريدة غامرة في عالم الألعاب.</p>
      <div style="display:flex; gap:15px; margin-top:20px;">
        <a href="upcoming-details.html?id=${game.id}" class="btn-primary" style="text-decoration:none;">
            <i class="fas fa-info-circle"></i> عرض المقال
        </a>
        <button class="up-btn btn-trailer up-add-btn-featured" style="${adminActive ? 'display:flex' : 'display:none'}; padding: 12px 25px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:#fff;" onclick="openUpModal()">
            <i class="fas fa-plus-circle"></i> إضافة
        </button>
      </div>
    </div>
    <div class="countdown-timer" id="banner-timer"></div>
  `;

  // Render Sidebar Navigation
  sideNav.innerHTML = featured.map((g, i) => `
    <div class="side-thumb ${i === currentSlideIndex ? 'active' : ''}" onclick="switchSlide(${i})">
        <div class="thumb-img" style="background-image:url('${g.imageUrl}')"></div>
        <div class="thumb-info">
            <h4>${g.name}</h4>
            <p>${g.category}</p>
        </div>
        <div class="status-line" id="line-${i}"></div>
    </div>
  `).join('');

  startBannerCountdown(targetDate);
}

function startBannerCountdown(targetDate) {
  const timerContainer = document.getElementById('banner-timer');
  const update = () => {
    const now = new Date().getTime();
    const gap = targetDate - now;
    if (gap <= 0) {
      timerContainer.innerHTML = "<div class='banner-released-badge'><i class='fas fa-check-circle'></i> تم الإصدار!</div>";
      return;
    }
    const second = 1000, minute = second * 60, hour = minute * 60, day = hour * 24;
    const d = Math.floor(gap / day), h = Math.floor((gap % day) / hour), m = Math.floor((gap % hour) / minute), s = Math.floor((gap % minute) / second);
    
    timerContainer.innerHTML = `
      <div class="countdown-unit"><div class="countdown-value">${d}</div><div class="countdown-label">أيام</div></div>
      <div class="countdown-unit"><div class="countdown-value">${h.toString().padStart(2,'0')}</div><div class="countdown-label">ساعات</div></div>
      <div class="countdown-unit"><div class="countdown-value">${m.toString().padStart(2,'0')}</div><div class="countdown-label">دقائق</div></div>
      <div class="countdown-unit"><div class="countdown-value">${s.toString().padStart(2,'0')}</div><div class="countdown-label">ثواني</div></div>
    `;
  };
  update();
  if (window.bannerTimerInterval) clearInterval(window.bannerTimerInterval);
  window.bannerTimerInterval = setInterval(update, 1000);
}

function initUpcoming() {
  const stored = localStorage.getItem('gv_upcoming_games');
  if (!stored) {
    upcomingGames = UP_GAMES_MOCK;
    localStorage.setItem('gv_upcoming_games', JSON.stringify(upcomingGames));
  } else {
    upcomingGames = JSON.parse(stored);
  }

  // Sort: Newest Added First (Descending by ID)
  upcomingGames.sort((a, b) => (parseFloat(b.id) || 0) - (parseFloat(a.id) || 0));

  renderUpcoming(upcomingGames);
  
  // Ensure slider starts AFTER games are loaded
  if (upcomingGames.length > 0) {
    const sorted = [...upcomingGames].sort((a,b) => new Date(a.preciseDate) - new Date(b.preciseDate));
    if (sorted[0]) renderSlider(sorted[0]);
    startSlider();
  } else {
    // Graceful empty state for banner
    const banner = document.getElementById('main-banner');
    if (banner) {
      const adminActive = (typeof isAdmin === 'function' && isAdmin());
      banner.style.backgroundImage = `linear-gradient(rgba(30, 27, 75, 0.4), rgba(49, 46, 129, 0.8))`;
      banner.innerHTML = `
        <div class="upcoming-banner-content" style="text-align:center; flex:1;">
          <div style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;">🎮</div>
          <h2>لا توجد عناوين حالياً</h2>
          <p style="margin: 0 auto; margin-bottom: 20px;">لم يتم إضافة أي ألعاب قادمة بعد.</p>
          ${adminActive ? `
            <button class="up-btn btn-trailer" style="display:inline-flex; padding: 12px 25px; border-radius:12px; margin: 0 auto;" onclick="openUpModal()">
              <i class="fas fa-plus-circle"></i> إضافة لعبة جديدة
            </button>
          ` : ''}
        </div>
      `;
    }
  }
}

function renderUpcoming(data) {
  const grid = document.getElementById('upcoming-grid');
  if (!grid) return;

  const admin = (typeof isAdmin === 'function' && isAdmin());
  const notifiedIds = JSON.parse(localStorage.getItem('gv_upcoming_notified') || '[]');

  if (data.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:50px; color:var(--text-dim);">لا توجد ألعاب قادمة تطابق بحثك.</div>`;
    return;
  }

  grid.innerHTML = data.map(g => {
    const isNotified = notifiedIds.includes(g.id);
    const progress = Math.floor(Math.random() * 40) + 40; 
    const statusText = g.releaseDate.includes('2025') ? 'قريباً جداً' : 'منتظر';
    
    let countdownHtml = `
      <div class="up-date-bubble">
        <i class="fas fa-hourglass-start" style="color:var(--primary-light); animation: spinSlow 3s linear infinite;"></i>
        <span>${g.releaseDate}</span>
      </div>
    `;

    if (g.preciseDate) {
      const target = new Date(g.preciseDate).getTime();
      const now = new Date().getTime();
      const diff = target - now;
      if (diff > 0) {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        countdownHtml = `
          <div class="up-date-bubble timer-active" style="background:rgba(124,58,237,0.2); border-color:var(--primary-light); min-width:140px;">
            <i class="fas fa-clock" style="color:var(--primary-light); animation: pulse 2s infinite;"></i>
            <span style="direction:ltr; font-family:monospace; font-weight:800;">${d}d : ${h}h : ${m}m</span>
          </div>
        `;
      }
    }

    return `
      <div class="up-card" onclick="location.href='upcoming-details.html?id=${g.id}'" style="cursor:pointer">
        <div class="up-thumb" style="background-image:url('${g.imageUrl || 'https://via.placeholder.com/600x400?text=Upcoming'}')">
          <div class="up-status-overlay">${statusText}</div>
          ${countdownHtml}
          ${admin ? `
            <div class="admin-controls" onclick="event.stopPropagation()">
              <button class="ctrl-btn ctrl-del" onclick="deleteUpGame(${g.id})"><i class="fas fa-trash"></i></button>
              <button class="ctrl-btn ctrl-edit" onclick="editUpGame(${g.id})"><i class="fas fa-edit"></i></button>
            </div>
          ` : ''}
        </div>
        <div class="up-info">
          <div class="up-title">${g.name}</div>
          <div class="up-cat"><i class="fas fa-tag"></i> ${g.category}</div>
          
          <div class="up-progress-wrap">
            <div class="up-progress-label">
              <span>مدى الانتظار</span>
              <span>${progress}%</span>
            </div>
            <div class="up-progress-bg">
              <div class="up-progress-inner" style="width: ${progress}%"></div>
            </div>
          </div>

          <div class="up-actions">
            <button class="up-btn btn-trailer" onclick="window.open('${g.trailerUrl}', '_blank')">
              <i class="fas fa-play"></i> العرض
            </button>
            <button class="up-btn btn-notify ${isNotified ? 'active' : ''}" onclick="toggleNotify(${g.id})">
              <i class="fas ${isNotified ? 'fa-check' : 'fa-bell'}"></i> 
              ${isNotified ? 'تم الاشتراك' : 'أعلمني'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function setupEventListeners() {
  const form = document.getElementById('up-form');
  if (form) {
    form.addEventListener('submit', saveUpcoming);
  }

  const search = document.getElementById('up-search-input');
  if (search) {
    search.addEventListener('input', (e) => {
      const val = e.target.value.toLowerCase();
      const filtered = upcomingGames.filter(g => 
        g.name.toLowerCase().includes(val) || 
        g.category.toLowerCase().includes(val)
      );
      renderUpcoming(filtered);
    });
  }
}

function getSeasonYear(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const month = date.getMonth(); // 0-11
  const year = date.getFullYear();
  let season = '';
  
  if (month >= 2 && month <= 4) season = 'ربيع';
  else if (month >= 5 && month <= 7) season = 'صيف';
  else if (month >= 8 && month <= 10) season = 'خريف';
  else season = 'شتاء';
  
  return `${season} ${year}`;
}

function saveUpcoming(e) {
  e.preventDefault();
  const title = document.getElementById('up-title').value;
  const developer = document.getElementById('up-developer').value;
  const cat = document.getElementById('up-cat').value;
  const pDate = document.getElementById('up-precise-date').value;
  const date = getSeasonYear(pDate); // Automatic
  const desc = document.getElementById('up-desc').value;
  const trailer = document.getElementById('up-trailer').value;
  const img = document.getElementById('up-img').value;

  const newGame = {
    id: window.currentEditingUpId || Date.now(),
    name: title,
    developer: developer,
    category: cat,
    releaseDate: date,
    preciseDate: pDate,
    description: desc,
    trailerUrl: trailer,
    imageUrl: img
  };

  try {
    let games = JSON.parse(localStorage.getItem('gv_upcoming_games') || '[]');
    if (window.currentEditingUpId) {
      const idx = games.findIndex(g => g.id == window.currentEditingUpId);
      if (idx !== -1) games[idx] = newGame;
    } else {
      games.push(newGame);
    }
    
    localStorage.setItem('gv_upcoming_games', JSON.stringify(games));
    upcomingGames = games;
    renderUpcoming(upcomingGames);
    startSlider();
    closeUpModal();
    if (typeof showToast === 'function') showToast(window.currentEditingUpId ? 'تم تحديث اللعبة' : 'تمت إضافة اللعبة بنجاح');
  } catch(err) {
    console.error(err);
    if (typeof showToast === 'function') showToast('خطأ في حفظ البيانات', 'error');
  }
}

window.editUpGame = function(id) {
  const game = upcomingGames.find(g => g.id == id);
  if (!game) return;
  
  window.currentEditingUpId = id;
  document.getElementById('up-title').value = game.name;
  document.getElementById('up-developer').value = game.developer || '';
  document.getElementById('up-cat').value = game.category;
  document.getElementById('up-precise-date').value = game.preciseDate || '';
  document.getElementById('up-desc').value = game.description || '';
  document.getElementById('up-trailer').value = game.trailerUrl;
  document.getElementById('up-img').value = game.imageUrl;
  
  const titleEl = document.querySelector('#up-modal h2');
  if (titleEl) titleEl.innerHTML = '<i class="fas fa-edit"></i> تعديل اللعبة القادمة';
  
  document.getElementById('up-modal').classList.add('active');
};

window.deleteUpGame = function(id) {
  const modal = document.getElementById('confirm-modal');
  const btn = document.getElementById('confirm-delete-btn');
  modal.classList.add('active');
  btn.onclick = () => {
    upcomingGames = upcomingGames.filter(g => g.id != id);
    localStorage.setItem('gv_upcoming_games', JSON.stringify(upcomingGames));
    renderUpcoming(upcomingGames);
    startSlider();
    document.getElementById('confirm-modal').classList.remove('active');
    if (typeof showToast === 'function') showToast('تم حذف اللعبة', 'error');
  };
};

window.toggleNotify = function(id) {
  if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
    if (typeof showToast === 'function') showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }

  let notifiedIds = JSON.parse(localStorage.getItem('gv_upcoming_notified') || '[]');
  const idx = notifiedIds.indexOf(id);
  
  if (idx === -1) {
    notifiedIds.push(id);
    if (typeof showToast === 'function') showToast('سيتم إعلامك عند توفر اللعبة!', 'success');
  } else {
    notifiedIds.splice(idx, 1);
    if (typeof showToast === 'function') showToast('تم إلغاء التنبيه', 'info');
  }
  
  localStorage.setItem('gv_upcoming_notified', JSON.stringify(notifiedIds));
  renderUpcoming(upcomingGames);
};
