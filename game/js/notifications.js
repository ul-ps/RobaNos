/* ========================================================
   notifications.js — Web Push & FCM Logic | RobaNos
======================================================== */

// IMPORTANT: Replace this with your Public VAPID Key from 
// Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates
const VAPID_KEY = "BA7_MiBZS11gUqN2YL0qcmSI2shMPWGb4G7TnCZ6L4E-x9R7Yvx_jukZk6Wn9gL4BwYCS3Az6snmPrWR8yibDn4";

/**
 * Initialize Push Notifications
 */
async function initPushNotifications() {
    // Check if running on local file system (origin 'null' or 'file:')
    if (window.location.protocol === 'file:') {
        console.warn('Push notifications are disabled because you are opening the file directly (file://). Please use a local server (Live Server) or host on HTTPS.');
        return;
    }

    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        console.warn('Push notifications are not supported in this browser.');
        return;
    }

    try {
        // 1. Register Service Worker
        // Passing the full path relative to the root for better subdirectory support
        const swPath = 'firebase-messaging-sw.js';
        const registration = await navigator.serviceWorker.register(swPath);
        console.log('Service Worker registered with scope:', registration.scope);

        // 2. Request Permission
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted.');
            getToken(registration);
        } else {
            console.warn('Notification permission denied.');
        }
    } catch (error) {
        console.error('Service Worker registration failed:', error);
    }
}

/**
 * Get and Store FCM Token
 */
function getToken(registration) {
    if (typeof messaging === 'undefined') return;

    // IMPORTANT: Pass the registration object to getToken for subdirectory support (GitHub Pages)
    messaging.getToken({ 
        serviceWorkerRegistration: registration,
        vapidKey: VAPID_KEY 
    }).then((currentToken) => {
        if (currentToken) {
            console.log('FCM Token generated successfully.');
            saveTokenToFirestore(currentToken);
        } else {
            console.warn('No registration token available. Request permission to generate one.');
            if (typeof showToast === 'function') {
                showToast('⚠️ يرجى السماح بالإشعارات في المتصفح أولاً', 'info');
            }
        }
    }).catch((err) => {
        console.error('FCM Token Error Details:', err);
        if (typeof showToast === 'function') {
            const errorMsg = err.code === 'messaging/unauthorized-domain' 
                ? '❌ النطاق غير مصرح به في Firebase (Authorized Domains)'
                : '❌ خطأ في ربط الإشعارات (FCM Error: ' + (err.code || 'Unknown') + ')';
            showToast(errorMsg, 'error');
        }
    });
}

/**
 * Save Token to Firestore
 */
function saveTokenToFirestore(token) {
    const userStr = localStorage.getItem('gv_session');
    let user = null;
    try {
        if (userStr && userStr !== 'undefined' && userStr !== 'null') {
            user = JSON.parse(userStr);
        }
    } catch (e) { console.error("Notifications session parse error:", e); }

    const userId = (user && user.id) ? String(user.id) : 'GUEST';
    const userName = (user && user.name) ? String(user.name) : 'GUEST';
    
    db.collection('fcm_subscribers').doc(token).set({
        token: token,
        userId: userId,
        userName: userName,
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(() => {
        console.log('Token successfully saved to Firestore.');
        // Notify user of success
        if (typeof showToast === 'function') {
            showToast('✅ تم ربط جهازك بنظام الإشعارات بنجاح', 'success');
        }
    }).catch((error) => {
        console.error('Error saving token to Firestore: ', error);
        if (typeof showToast === 'function') {
            showToast('❌ فشل حفظ رمز الإشعارات (تحقق من قواعد البيانات)', 'error');
        }
    });
}

/**
 * Handle Foreground Messages
 */
if (typeof messaging !== 'undefined') {
    messaging.onMessage((payload) => {
        console.log('Message received in foreground: ', payload);
        const { title, body, icon } = payload.notification;
        
        // Show a custom toast for foreground messages
        showNotificationToast(title, body, icon);
    });
}

/**
 * Custom Toast for Notifications
 */
function showNotificationToast(title, body, icon) {
    // Check if showToast exists (from app.js or watch.js)
    if (typeof showToast === 'function') {
        showToast(`<strong>${title}</strong><br>${body}`, 'info');
    } else {
        // Fallback simple alert if no toast system found
        alert(`${title}\n${body}`);
    }
}


// Initial request after page load
window.addEventListener('load', () => {
    // Small delay to not interrupt initial loading
    setTimeout(initPushNotifications, 3000);
    
    // Listen for Targeted Push from Dashboard (Firestore Real-time)
    setTimeout(listenForTargetedPush, 5000);

    // Listen for Global Broadcasts (Firestore Real-time)
    setTimeout(listenForGlobalBroadcasts, 6000);
});

/**
 * Listen for Global Broadcasts in Firestore
 */
function listenForGlobalBroadcasts() {
    if (typeof db === 'undefined') return;

    // We only listen for broadcasts added *after* the user opened the page
    const startTimeResult = firebase.firestore.Timestamp.now();

    db.collection('broadcast_notifications')
        .where('timestamp', '>', startTimeResult)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    
                    // Trigger browser notification
                    if (Notification.permission === 'granted') {
                        new Notification(data.title, {
                            body: data.body,
                            icon: 'assets/favicon.png',
                            data: { url: data.url }
                        });
                    }
                    
                    // Show on-screen toast
                    showNotificationToast(data.title, data.body);
                }
            });
        }, (error) => {
            console.error("Broadcast listener error:", error);
        });
}

/**
 * Listen for targeted notifications in Firestore for the current user
 */
function listenForTargetedPush() {
    if (typeof db === 'undefined') return;
    const userStr = localStorage.getItem('gv_session');
    if (!userStr) return;
    
    const user = JSON.parse(userStr);
    if (!user || !user.name) return;
    
    const userName = user.name.trim();

    // Listen for new pending notifications for this user
    db.collection('targeted_push')
        .where('targetUser', '==', userName)
        .where('status', '==', 'pending')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const docId = change.doc.id;
                    
                    // Trigger browser notification
                    if (Notification.permission === 'granted') {
                        new Notification(data.title, {
                            body: data.body,
                            icon: 'assets/logo.png' // Adjust path 
                        });
                    }
                    
                    // Show on-screen toast
                    showNotificationToast(data.title, data.body);

                    // Mark as delivered in Firestore so we don't show it again on reload
                    db.collection('targeted_push').doc(docId).update({
                        status: 'delivered',
                        deliveredAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            });
        });
}
