// المكان الوحيد في الموقع العام اللي بيكلم Firestore
import { firebaseConfig, useEmulators, SDK } from './firebase-config.js';
import { menu, offers, settings } from './seed.js';
import { normalizeContent } from './content.js';

const CACHE_KEY = 'sham:content';
const fallback = { menu, offers, settings };

// من غير Firebase مفيش تسجيل للطلبات
export const recordsOrders = Boolean(firebaseConfig);

let firebase; // وعد واحد بتحميل الـ SDK

function connect() {
  if (!firebaseConfig) return null;
  firebase ??= (async () => {
    const [{ initializeApp }, fs] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-firestore-lite.js`),
    ]);
    const db = fs.getFirestore(initializeApp(firebaseConfig));
    if (useEmulators) fs.connectFirestoreEmulator(db, '127.0.0.1', 8080);
    return { db, fs };
  })().catch((error) => {
    firebase = undefined;
    throw error;
  });
  return firebase;
}

// آخر نسخة محفوظة على الجهاز، أو المنيو الأساسي
export function cachedContent() {
  try {
    const saved = firebaseConfig && JSON.parse(localStorage.getItem(CACHE_KEY));
    if (saved) return normalizeContent(saved, fallback);
  } catch { /* نسخة تالفة أو التخزين مقفول */ }
  return fallback;
}

// أحدث نسخة من Firestore. بترجع null لو مفيش Firebase أو مش قادرين نوصله.
export async function freshContent() {
  try {
    const connection = connect();
    if (!connection) return null;
    const { db, fs } = await connection;
    const [menuSnap, settingsSnap, offersSnap] = await Promise.all([
      fs.getDocs(fs.collection(db, 'menu')),
      fs.getDoc(fs.doc(db, 'site', 'settings')),
      fs.getDoc(fs.doc(db, 'site', 'offers')),
    ]);
    const content = normalizeContent({
      menu: menuSnap.docs.map((d) => ({ ...d.data(), id: d.id })),
      settings: settingsSnap.exists() ? settingsSnap.data() : null,
      offers: offersSnap.exists() ? offersSnap.data().list : null,
    }, fallback);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(content)); } catch { /* التخزين مليان */ }
    return content;
  } catch (error) {
    console.warn('تعذر تحميل البيانات من Firebase، بنعرض النسخة المحفوظة', error);
    return null;
  }
}

const images = new Map();

// صور اترفعت من الداشبورد: مخزنة في images/{id}
export function loadImage(id) {
  if (!images.has(id)) {
    images.set(id, (async () => {
      const { db, fs } = await connect();
      const snap = await fs.getDoc(fs.doc(db, 'images', id));
      return snap.exists() ? snap.data().data : '';
    })().catch(() => {
      images.delete(id);
      return '';
    }));
  }
  return images.get(id);
}

// بيسجل الطلب عند المطعم. فشل التسجيل مايوقفش الطلب على الواتساب.
export async function saveOrder(order) {
  try {
    const connection = connect();
    if (!connection) return false;
    const { db, fs } = await connection;
    await fs.addDoc(fs.collection(db, 'orders'), { ...order, createdAt: fs.serverTimestamp() });
    return true;
  } catch (error) {
    console.warn('تعذر تسجيل الطلب', error);
    return false;
  }
}

// التقييمات المتوافق عليها لصنف واحد. null يعني مش قادرين نحمّلها.
export async function loadReviews(itemId) {
  try {
    const connection = connect();
    if (!connection) return null;
    const { db, fs } = await connection;
    const snapshot = await fs.getDocs(fs.query(
      fs.collection(db, 'reviews'),
      fs.where('itemId', '==', itemId),
      fs.where('approved', '==', true),
    ));
    return snapshot.docs
      .map((d) => ({ ...d.data(), createdAt: d.data().createdAt?.toMillis?.() ?? 0 }))
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.warn('تعذر تحميل التقييمات', error);
    return null;
  }
}

export async function saveReview(review) {
  try {
    const connection = connect();
    if (!connection) return false;
    const { db, fs } = await connection;
    await fs.addDoc(fs.collection(db, 'reviews'), { ...review, createdAt: fs.serverTimestamp() });
    return true;
  } catch (error) {
    console.warn('تعذر إرسال التقييم', error);
    return false;
  }
}
