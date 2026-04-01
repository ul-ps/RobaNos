/* ========================================================
   submit-game.js — Game Submission Logic | RobaNos
======================================================== */

const SUBMISSIONS_KEY = 'gv_submissions';

/* ============================================================
   HELPERS
============================================================ */
function getSubmissions() {
  return JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || '[]');
}

function saveSubmissions(subs) {
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(subs));
}

function generateSubId() {
  return 'SUB_' + Date.now() + Math.floor(Math.random() * 1000);
}

/* ============================================================
   UI HELPERS
============================================================ */
function updateCharCounter(inputId, counterId, max) {
  const el = document.getElementById(inputId);
  const counter = document.getElementById(counterId);
  if (el && counter) {
    counter.textContent = `${el.value.length}/${max}`;
  }
}

function showToastMsg(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = {
    success: '<i class="fas fa-check-circle"></i>',
    info: '<i class="fas fa-circle-info"></i>',
    error: '<i class="fas fa-triangle-exclamation"></i>'
  };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || '<i class="fas fa-bell"></i>'}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-100%)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ============================================================
   SUBMISSION LOGIC
============================================================ */
let editingSubId = null;

function submitGame() {
  const name = document.getElementById('sg-name').value.trim();
  const category = document.getElementById('sg-category').value;
  const company = document.getElementById('sg-company').value.trim();
  const desc = document.getElementById('sg-desc').value.trim();
  const size = document.getElementById('sg-size').value.trim() || 'غير محدد';
  const imageUrl = document.getElementById('sg-image').value.trim();
  const videoUrl = document.getElementById('sg-video').value.trim();
  const badge = document.getElementById('sg-badge').value;

  const platformCheckboxes = document.querySelectorAll('#sg-platforms input[type="checkbox"]:checked');
  const platforms = Array.from(platformCheckboxes).map(cb => cb.value);

  const linkRows = document.querySelectorAll('#links-container .dynamic-row');
  const links = [];
  linkRows.forEach(row => {
    const type = row.querySelector('.link-type-select').value;
    const url = row.querySelector('.link-url-input').value.trim();
    if (url) links.push({ type, url });
  });

  const screenInputs = document.querySelectorAll('#screenshots-container .screenshot-input');
  const screenshots = Array.from(screenInputs).map(inp => inp.value.trim()).filter(Boolean);

  if (!name) { showToastMsg('⚠️ يرجى إدخال اسم اللعبة', 'error'); return; }
  if (!category) { showToastMsg('⚠️ يرجى اختيار الفئة', 'error'); return; }
  if (!desc) { showToastMsg('⚠️ يرجى إدخال وصف اللعبة', 'error'); return; }
  if (platforms.length === 0) { showToastMsg('⚠️ يرجى اختيار منصة تشغيل واحدة على الأقل', 'error'); return; }
  if (links.length === 0) { showToastMsg('⚠️ يرجى إضافة رابط تحميل واحد على الأقل', 'error'); return; }
  if (!imageUrl) { showToastMsg('⚠️ يرجى إدخال رابط صورة الغلاف الرئيسي', 'error'); return; }

  const currentUser = getCurrentUser();
  if (!currentUser) { window.location.href = 'auth.html'; return; }

  let subs = getSubmissions();

  if (editingSubId) {
    // Check if it's an approved game in the live database
    let extraGames = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
    const liveGame = extraGames.find(g => g.id == editingSubId);

    if (liveGame) {
      // INSTEAD of updating live game directly, send an 'edit' request to admin
      const editRequest = {
        subId: generateSubId(),
        id: Date.now(),
        type: 'edit',
        targetId: editingSubId,
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        userAvatar: currentUser.avatar || currentUser.name.charAt(0).toUpperCase(),
        date: new Date().toLocaleDateString('ar-EG') + ' (تعديل لعبة منشورة)',
        status: 'pending',
        submittedBy: currentUser.name,
        submitterId: currentUser.uid,
        name, category, company, desc, size, platforms, links, imageUrl, screenshots, videoUrl, badge,
        rating: liveGame.rating || 4.5,
        downloads: liveGame.downloads || 0
      };
      subs.push(editRequest);
      saveSubmissions(subs);
      showSuccessStep(true);
      return;
    }

    // Updating existing pending/rejected submission
    const index = subs.findIndex(s => s.subId == editingSubId || s.id == editingSubId);
    if (index !== -1) {
      subs[index] = {
        ...subs[index],
        name, category, company, desc, size, platforms, links, imageUrl, screenshots, videoUrl, badge,
        status: 'pending', // Re-verify
        date: new Date().toLocaleDateString('ar-EG') + ' (تحديث)'
      };
      saveSubmissions(subs);
      showSuccessStep(true);
      return;
    }
  }

  // New submission
  const newSub = {
    subId: generateSubId(),
    id: Date.now(),
    userId: currentUser.id,
    userName: currentUser.name,
    userEmail: currentUser.email,
    userAvatar: currentUser.avatar || currentUser.name.charAt(0).toUpperCase(),
    date: new Date().toLocaleDateString('ar-EG'),
    status: 'pending',
    submittedBy: currentUser.name,
    submitterId: currentUser.uid,
    name, category, company, desc, size, platforms, links, imageUrl, screenshots, videoUrl, badge,
    rating: 4.5,
    downloads: 0
  };

  subs.push(newSub);
  saveSubmissions(subs);
  showSuccessStep(false);
  renderMySubmissions();
}

function showSuccessStep(isUpdate = false) {
  document.getElementById('form-body').style.display = 'none';
  const overlay = document.getElementById('success-overlay');
  overlay.classList.add('show');

  if (isUpdate) {
    overlay.querySelector('.success-title').textContent = 'تم إرسال طلب التعديل!';
    overlay.querySelector('.success-desc').innerHTML = 'تم إرسال تعديلاتك للمراجعة. ستبقى النسخة القديمة من اللعبة منشورة حتى يوافق المدير على التحديثات الجديدة.';
  }

  document.getElementById('step2').classList.add('done', 'active');
  document.getElementById('step2').innerHTML = '✓';
  document.getElementById('line1').classList.add('done');
}

/* ============================================================
   UI STEPS & FORM RESET
============================================================ */
function resetForm() {
  window.location.href = 'submit-game.html'; // simplest way to reset everything
}

/* ============================================================
   DYNAMIC INPUTS LOGIC
============================================================ */
function addLinkRow() {
  const container = document.getElementById('links-container');
  const div = document.createElement('div');
  div.className = 'dynamic-row';
  div.innerHTML = `
    <select class="sg-select link-type-select" style="width:150px;flex-shrink:0;cursor:pointer">
      <option value="مباشر">📥 مباشر</option>
      <option value="تورنت">🧲 تورنت</option>
      <option value="جوجل درايف">☁️ جوجل درايف</option>
      <option value="ميديا فاير">🔥 ميديا فاير</option>
      <option value="أخرى">🔗 أخرى</option>
    </select>
    <input type="url" class="sg-input link-url-input" placeholder="ألصق رابط التحميل هنا..." />
    <button class="btn-remove-dynamic" onclick="this.parentElement.remove()" title="حذف الرابط"><i class="fas fa-trash-alt"></i></button>
  `;
  container.appendChild(div);
}

function addScreenshotRow() {
  const container = document.getElementById('screenshots-container');
  const div = document.createElement('div');
  div.className = 'dynamic-row';
  div.innerHTML = `
    <input type="url" class="sg-input screenshot-input" placeholder="ألصق رابط صورة اللعبة بدقة عالية..." />
    <button class="btn-remove-dynamic" onclick="this.parentElement.remove()" title="حذف الصورة"><i class="fas fa-trash-alt"></i></button>
  `;
  container.appendChild(div);
}

/* ============================================================
   MY SUBMISSIONS (Old list helper, kept for compat if needed, but profile is better)
============================================================ */
function renderMySubmissions() {
  const currentUser = getCurrentUser();
  if (!currentUser || isAdmin()) return;
  const tbody = document.getElementById('my-subs-body');
  const section = document.getElementById('previous-submissions-section');
  if (!tbody || !section) return;

  const rawSubs = getSubmissions().filter(s => s.submitter === currentUser.name || s.userId === currentUser.id);
  const extraGames = JSON.parse(localStorage.getItem('gv_extra_games') || '[]').filter(g => g.submittedBy === currentUser.name);

  const approvedSubs = extraGames.map(g => ({
    id: g.id,
    name: g.name,
    category: g.category,
    date: 'مقبولة',
    status: 'approved',
    imageUrl: g.imageUrl,
    linkId: g.id
  }));

  const allSubs = [...rawSubs, ...approvedSubs];

  if (allSubs.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  // Sort newest first
  const displaySubs = [...allSubs].reverse();

  tbody.innerHTML = displaySubs.map(s => {
    let statusPill = '';
    if (s.status === 'pending') statusPill = '<span class="sub-status-pill pending"><i class="fas fa-clock"></i> مراجعة</span>';
    else if (s.status === 'approved') statusPill = '<span class="sub-status-pill approved"><i class="fas fa-check"></i> مقبولة</span>';
    else if (s.status === 'rejected') statusPill = '<span class="sub-status-pill rejected"><i class="fas fa-times"></i> مرفوضة</span>';

    const viewUrl = s.status === 'approved' ? `game.html?id=${s.linkId}` : `game.html?id=${s.id || s.subId}`;
    const editId = s.status === 'approved' ? s.linkId : (s.subId || s.id);
    const isAppr = s.status === 'approved';

    const actions = `
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn-dashboard" style="padding:8px 14px;font-size:0.8rem;background:var(--bg-hover);color:var(--text);border:1px solid var(--border);border-radius:8px;cursor:pointer" onclick="window.location.href='${viewUrl}'" title="معاينة">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn-dashboard" style="padding:8px 14px;font-size:0.8rem;background:var(--bg-hover);color:var(--text);border:1px solid var(--border);border-radius:8px;cursor:pointer" onclick="window.location.href='submit-game.html?edit=${editId}'" title="تعديل">
          <i class="fas fa-pen"></i>
        </button>
        <button class="btn-dashboard" style="padding:8px 14px;font-size:0.8rem;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:8px;cursor:pointer" onclick="deleteMySubmission('${editId}', ${isAppr})" title="حذف">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;font-weight:600">
            <div style="width:40px;height:40px;border-radius:8px;background:${s.imageUrl ? `url('${s.imageUrl}') center/cover` : 'var(--primary)'};box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>
            <div style="display:flex; flex-direction:column; gap:2px;">
              <span>${s.name}</span>
              <span style="font-size:0.75rem; color:var(--text-muted)">${s.date}</span>
            </div>
          </div>
        </td>
        <td>${statusPill}</td>
        <td>${actions}</td>
      </tr>
    `;
  }).join('');
}

/* ============================================================
   EDIT LOGIC
============================================================ */
function initSubmitPage() {
  renderMySubmissions();

  // Inject custom categories from dashboard
  const catSelect = document.getElementById('sg-category');
  if (catSelect) {
    const customCats = JSON.parse(localStorage.getItem('gv_custom_categories') || '[]');
    // Keep reference to existing values to prevent duplicates
    const existingVals = Array.from(catSelect.options).map(opt => opt.value);
    customCats.forEach(c => {
      if (!existingVals.includes(c.name)) {
        const option = document.createElement('option');
        option.value = c.name;
        option.textContent = c.name;
        catSelect.appendChild(option);
      }
    });
  }

  const params = new URLSearchParams(window.location.search);
  const editId = params.get('edit');
  if (editId) {
    loadSubmissionForEdit(editId);
  } else {
    // New submission, initialize dynamic rows
    addLinkRow();
    addScreenshotRow();
  }
}

function loadSubmissionForEdit(id) {
  let sub = getSubmissions().find(s => s.id == id || s.subId == id);
  if (!sub) {
    const extraGames = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
    sub = extraGames.find(g => g.id == id);
  }

  if (!sub) { showToastMsg('⚠️ لم يتم العثور على الطلب المطلوب تعديله', 'error'); return; }

  editingSubId = sub.subId || sub.id;

  document.getElementById('sg-name').value = sub.name || '';
  document.getElementById('sg-category').value = sub.category || 'أكشن';

  const companyInput = document.getElementById('sg-company');
  if (companyInput) companyInput.value = sub.company || '';

  document.getElementById('sg-desc').value = sub.desc || '';
  document.getElementById('sg-size').value = sub.size || '';
  document.getElementById('sg-image').value = sub.imageUrl || '';
  document.getElementById('sg-video').value = sub.videoUrl || '';
  document.getElementById('sg-badge').value = sub.badge || '';

  updateCharCounter('sg-name', 'cc-name', 60);
  updateCharCounter('sg-desc', 'cc-desc', 400);

  const platformCheckboxes = document.querySelectorAll('#sg-platforms input[type="checkbox"]');
  platformCheckboxes.forEach(cb => { cb.checked = sub.platforms && sub.platforms.includes(cb.value); });

  const linksContainer = document.getElementById('links-container');
  linksContainer.innerHTML = '';
  if (sub.links && sub.links.length > 0) {
    sub.links.forEach((l, i) => {
      const div = document.createElement('div');
      div.className = 'dynamic-row';
      div.innerHTML = `
        <select class="sg-select link-type-select" style="width:150px;flex-shrink:0;cursor:pointer">
          <option value="مباشر" ${l.type === 'مباشر' ? 'selected' : ''}>📥 مباشر</option>
          <option value="تورنت" ${l.type === 'تورنت' ? 'selected' : ''}>🧲 تورنت</option>
          <option value="جوجل درايف" ${l.type === 'جوجل درايف' ? 'selected' : ''}>☁️ جوجل درايف</option>
          <option value="ميديا فاير" ${l.type === 'ميديا فاير' ? 'selected' : ''}>🔥 ميديا فاير</option>
          <option value="أخرى" ${l.type === 'أخرى' ? 'selected' : ''}>🔗 أخرى</option>
        </select>
        <input type="url" class="sg-input link-url-input" placeholder="ألصق رابط التحميل هنا..." value="${l.url}" />
        <button class="btn-remove-dynamic" onclick="this.parentElement.remove()" ${i === 0 ? 'style="display:none"' : 'title="حذف الرابط"'}><i class="fas fa-trash-alt"></i></button>
      `;
      linksContainer.appendChild(div);
    });
  } else { addLinkRow(); }

  const screensContainer = document.getElementById('screenshots-container');
  screensContainer.innerHTML = '';
  if (sub.screenshots && sub.screenshots.length > 0) {
    sub.screenshots.forEach((s, i) => {
      const div = document.createElement('div');
      div.className = 'dynamic-row';
      div.innerHTML = `
        <input type="url" class="sg-input screenshot-input" placeholder="ألصق رابط صورة اللعبة بدقة عالية..." value="${s}" />
        <button class="btn-remove-dynamic" onclick="this.parentElement.remove()" ${i === 0 ? 'style="display:none"' : 'title="حذف الصورة"'}><i class="fas fa-trash-alt"></i></button>
      `;
      screensContainer.appendChild(div);
    });
  } else { addScreenshotRow(); }

  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ وتحديث الطلب';

  // Show a notice that we are editing
  showToastMsg('📝 أنت الآن في وضع التعديل', 'info');

  document.getElementById('form-body').scrollIntoView({ behavior: 'smooth' });
}

function deleteMySubmission(id, isApproved) {
  if (!confirm('هل أنت متأكد من رغبتك في حذف هذه اللعبة؟')) return;

  if (isApproved) {
    // MODERATED DELETE: Send a delete request
    const currentUser = getCurrentUser();
    let subs = getSubmissions();
    let extraGames = JSON.parse(localStorage.getItem('gv_extra_games') || '[]');
    const game = extraGames.find(g => g.id == id);

    if (game) {
      const delRequest = {
        subId: generateSubId(),
        id: Date.now(),
        type: 'delete',
        targetId: id,
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        userAvatar: currentUser.avatar || currentUser.name.charAt(0).toUpperCase(),
        date: new Date().toLocaleDateString('ar-EG') + ' (طلب حذف)',
        status: 'pending',
        name: game.name,
        category: game.category,
        imageUrl: game.imageUrl
      };
      subs.push(delRequest);
      saveSubmissions(subs);
      showToastMsg('📥 تم إرسال طلب الحذف للمراجعة بنجاح', 'success');
      renderMySubmissions();
    }
  } else {
    // Direct delete for pending/rejected
    let subs = getSubmissions();
    const newSubs = subs.filter(s => s.subId != id && s.id != id);
    saveSubmissions(newSubs);
    showToastMsg('🗑️ تم الحذف بنجاح', 'success');
    renderMySubmissions();
  }
}
