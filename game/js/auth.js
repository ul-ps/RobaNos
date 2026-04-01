/* ========================================================
   auth.js — Secure Authentication System | GameVault
   Storage: Firebase Authentication + Firestore
======================================================== */

const SESSION_KEY    = 'gv_session';
const SETTINGS_KEY   = 'gv_global_settings';

/* ============================================================
   HELPERS & INITIALIZATION
============================================================ */

/**
 * Get current session from localStorage (cached for fast UI)
 */
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch (e) {
    return null;
  }
}

function isLoggedIn() {
  return getCurrentUser() !== null;
}

/**
 * Secure Check: Returns true if user has 'admin' role in their session
 */
function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'admin';
}

/**
 * Firebase Auth Listener: Keeps localStorage in sync with Firebase state
 */
if (typeof firebase !== 'undefined') {
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      // User is signed in, fetch profile from Firestore
      try {
        const doc = await db.collection("users").doc(user.uid).get();
        let sessionData = {
          uid:      user.uid,
          email:    user.email,
          name:     user.displayName || user.email.split('@')[0],
          avatar:   (user.displayName || 'U').charAt(0).toUpperCase(),
          role:     'user', // default
          joinDate: new Date(user.metadata.creationTime).toLocaleDateString('ar-EG')
        };

        if (doc.exists) {
          const profile = doc.data();
          sessionData = { ...sessionData, ...profile };
        } else {
          // Create initial profile if missing
          await db.collection("users").doc(user.uid).set(sessionData, { merge: true });
        }

        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        window.dispatchEvent(new Event('authStatusChanged'));
        if (typeof injectNavAuth === 'function') injectNavAuth();
      } catch (error) {
        console.error("Auth Listener Error:", error);
      }
    } else {
      // User is signed out
      localStorage.removeItem(SESSION_KEY);
      window.dispatchEvent(new Event('authStatusChanged'));
      if (typeof injectNavAuth === 'function') injectNavAuth();
    }
  });
}

/* ============================================================
   REGISTER
============================================================ */
async function register(name, email, password) {
  if (!name || !email || !password) return { ok: false, msg: 'يرجى تعبئة جميع الحقول' };
  if (password.length < 6)          return { ok: false, msg: 'كلمة السر يجب أن تكون 6 أحرف على الأقل' };

  // Use helper
  const status = getEmailStatus(email);
  if (!status.ok) return status;

  try {
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Update Profile in Firebase Auth
    await user.updateProfile({ displayName: name.trim() });

    // Save Profile in Firestore
    const profile = {
      uid:      user.uid,
      name:     name.trim(),
      email:    email.toLowerCase(),
      avatar:   name.trim().charAt(0).toUpperCase(),
      role:     'user',
      joinDate: new Date().toLocaleDateString('ar-EG'),
    };
    await db.collection("users").doc(user.uid).set(profile);

    return { ok: true };
  } catch (error) {
    let msg = 'حدث خطأ أثناء الإنشاء';
    if (error.code === 'auth/email-already-in-use') msg = 'هذا الإيميل مسجّل مسبقاً';
    if (error.code === 'auth/invalid-email')        msg = 'الإيميل غير صالح';
    if (error.code === 'auth/weak-password')       msg = 'كلمة السر ضعيفة جداً';
    return { ok: false, msg: msg + ' (' + error.code + ')' };
  }
}

/* ============================================================
   LOGIN
============================================================ */
async function login(email, password) {
  if (!email || !password) return { ok: false, msg: 'يرجى إدخال الإيميل وكلمة السر' };

  try {
    await firebase.auth().signInWithEmailAndPassword(email.trim(), password);
    return { ok: true };
  } catch (error) {
    let msg = 'إيميل أو كلمة السر غير صحيحة';
    if (error.code === 'auth/user-not-found') msg = 'المستخدم غير موجود';
    if (error.code === 'auth/wrong-password')   msg = 'كلمة السر غير صحيحة';
    return { ok: false, msg: msg };
  }
}

/**
 * Handle Password Reset
 */
async function resetPassword(email) {
  if (!email || !email.trim()) return { ok: false, msg: 'يرجى إدخال البريد الإلكتروني' };
  
  const cleanEmail = email.trim().toLowerCase();

  try {
    // Pre-check: Verify if email exists in Firestore users collection
    const snapshot = await db.collection("users").where("email", "==", cleanEmail).get();
    
    if (snapshot.empty) {
      return { ok: false, msg: 'عذراً، هذا البريد غير مسجل في نظامنا.' };
    }

    await firebase.auth().sendPasswordResetEmail(cleanEmail);
    return { ok: true, msg: 'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني' };
  } catch (error) {
    let msg = 'فشل إرسال رابط الاستعادة';
    if (error.code === 'auth/user-not-found') msg = 'عذراً، هذا البريد غير مسجل في نظامنا.';
    if (error.code === 'auth/invalid-email')   msg = 'البريد الإلكتروني غير صالح';
    return { ok: false, msg: msg };
  }
}

/* ============================================================
   HELPERS & VALIDATION
============================================================ */

/**
 * Validates email domain and returns suggestions for typos
 */
function getEmailStatus(email) {
  const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'live.com', 'msn.com', 'aol.com', 'me.com'];
  const emailParts = email.split('@');
  const domain = emailParts.length === 2 ? emailParts[1].toLowerCase() : '';

  if (!domain || !allowedDomains.includes(domain)) {
    // Check for common typos to provide better suggestions
    let suggestion = '';
    if (domain.includes('gamil') || domain.includes('gmal')) suggestion = 'gmail.com';
    else if (domain.includes('yaho')) suggestion = 'yahoo.com';
    else if (domain.includes('outlok')) suggestion = 'outlook.com';
    else if (domain.includes('hotmial')) suggestion = 'hotmail.com';

    const msg = suggestion 
      ? `عذراً، هذا النطاق غير مدعوم. هل تقصد ${suggestion}؟` 
      : `عذراً، نوصي باستخدام مزودات البريد العالمية (Gmail, Yahoo, Outlook) لضمان أمان حسابك.`;
    
    return { ok: false, msg: msg, suggestion: suggestion };
  }
  
  return { ok: true, msg: '', suggestion: null };
}

/* ============================================================
   LOGOUT
============================================================ */
function logout() {
  firebase.auth().signOut().then(() => {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
  });
}

/* ============================================================
   ACCOUNT UPDATES
============================================================ */
async function updateName(newName) {
  if (!newName.trim()) return { ok: false, msg: 'الاسم لا يمكن أن يكون فارغاً' };
  const user = firebase.auth().currentUser;
  if (!user) return { ok: false, msg: 'غير مسجّل' };

  try {
    await user.updateProfile({ displayName: newName.trim() });
    await db.collection("users").doc(user.uid).update({
      name: newName.trim(),
      avatar: newName.trim().charAt(0).toUpperCase()
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, msg: 'فشل تحديث الاسم: ' + error.message };
  }
}

async function updatePassword(oldPass, newPass) {
  const user = firebase.auth().currentUser;
  if (!user) return { ok: false, msg: 'غير مسجل' };
  if (newPass.length < 6) return { ok: false, msg: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' };

  try {
    await user.updatePassword(newPass);
    return { ok: true };
  } catch (error) {
    if (error.code === 'auth/requires-recent-login') {
      return { ok: false, msg: 'يرجى تسجيل الخروج والدخول مرة أخرى لتغيير كلمة السر للأمان' };
    }
    return { ok: false, msg: error.message };
  }
}

async function updateSocialLinks(links) {
  const user = firebase.auth().currentUser;
  if (!user) return { ok: false, msg: 'غير مسجّل' };

  try {
    await db.collection("users").doc(user.uid).update({ social: links });
    return { ok: true };
  } catch (error) {
    return { ok: false, msg: error.message };
  }
}

async function incrementUserDownloads() {
  const user = firebase.auth().currentUser;
  if (!user) return;
  
  try {
    const docRef = db.collection("users").doc(user.uid);
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      const newDL = (doc.data().downloads || 0) + 1;
      transaction.update(docRef, { downloads: newDL });
    });
  } catch (e) {
    console.error("Failed to increment downloads:", e);
  }
}

/* ============================================================
   NAVBAR INJECTION
============================================================ */
function injectNavAuth() {
  const user = getCurrentUser();
  const isAdminUser = isAdmin();

  // Elements
  const navDashBtn   = document.getElementById('nav-dash-btn');
  const navAuthBtn   = document.getElementById('nav-auth-btn');
  const navLogoutBtn = document.getElementById('nav-logout-btn');
  const navUserBtn   = document.getElementById('nav-user-btn') || document.getElementById('nav-user-link');
  const navSubmitBtn = document.getElementById('nav-submit-btn');
  const heroAuthBtn  = document.getElementById('hero-auth-btn');
  const navUserName  = document.getElementById('nav-user-name');

  // Sidebar Logic
  if (navDashBtn)   navDashBtn.style.display   = (user && isAdminUser) ? 'flex' : 'none';
  if (navAuthBtn)   navAuthBtn.style.display   = user ? 'none' : 'flex';
  if (navLogoutBtn) navLogoutBtn.style.display = user ? 'flex' : 'none';
  if (navSubmitBtn) navSubmitBtn.style.display = (user && !isAdminUser) ? 'flex' : 'none'; 
  if (navUserBtn)   navUserBtn.style.display   = user ? 'flex' : 'none';
  if (heroAuthBtn)  heroAuthBtn.style.display  = user ? 'none' : 'inline-flex';
  
  if (user && navUserName) navUserName.textContent = user.name;

  // Bottom Nav Support
  const bnProfile   = document.getElementById('bn-profile');
  const bnLogin     = document.getElementById('bn-login');
  const bnDashboard = document.getElementById('bn-dash') || document.getElementById('bn-dashboard');
  const bnSubmit    = document.getElementById('bn-submit');

  if (bnProfile)   bnProfile.style.display   = user ? 'flex' : 'none';
  if (bnSubmit)    bnSubmit.style.display    = (user && !isAdminUser) ? 'flex' : 'none';
  if (bnLogin)     bnLogin.style.display     = user ? 'none' : 'flex';
  if (bnDashboard) bnDashboard.style.display = (user && isAdminUser) ? 'flex' : 'none';
}

// Global Sidebar Toggle + Immediate Nav Injection
document.addEventListener('DOMContentLoaded', () => {
  // Show/hide nav buttons immediately based on cached session (no waiting for Firebase)
  if (typeof injectNavAuth === 'function') injectNavAuth();

  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar   = document.querySelector('.g-sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });
  }
});

/* ============================================================
   DASHBOARD GUARD
============================================================ */
function guardDashboard() {
  // Add a small delay for Firebase auth to initialize
  setTimeout(() => {
    if (!isAdmin()) {
      window.location.href = 'auth.html';
    }
  }, 800);
}

/* ============================================================
   MOBILE SEARCH OVERLAY
============================================================ */
function openMobileSearch() {
  const overlay = document.getElementById('mobile-search-overlay');
  if (overlay) {
    overlay.classList.add('active');
    setTimeout(() => {
      const input = document.getElementById('mobile-search-input');
      if (input) input.focus();
    }, 100);
  }
}

function closeMobileSearch(e) {
  if (e && e.target.id !== 'mobile-search-overlay' && e.target.tagName !== 'I' && !e.target.classList.contains('fa-times')) return;
  const overlay = document.getElementById('mobile-search-overlay');
  if (overlay) overlay.classList.remove('active');
}

/* ============================================================
   GLOBAL INITIALIZATION
============================================================ */
(function() {
  if (window.isGlobalInitialized) return;
  
  function triggerInit(source) {
    if (window.isGlobalInitialized) return;
    window.isGlobalInitialized = true;
    console.log(`Global Init triggered via: ${source}`);
    
    // Connection status badge removed per user request

    if (typeof injectNavAuth === 'function') injectNavAuth();
  }

  // Handle both events for robustness
  window.addEventListener('firebaseDataReady', () => triggerInit('FirebaseEvent'));
  window.addEventListener('authStatusChanged', () => injectNavAuth());
})();
