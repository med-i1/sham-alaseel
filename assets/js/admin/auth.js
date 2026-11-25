// دخول الداشبورد وتشغيل التبويبات.
// الحماية الحقيقية في firestore.rules؛ الشاشة دي بس بتخفي الواجهة.
import { firebaseConfig, useEmulators, SDK } from '../firebase-config.js';
import { $, $$ } from '../dom.js';
import { toast } from './ui.js';
import { authMessage } from './forms.js';
import { startOrders } from './orders.js';
import { renderStats } from './stats.js';
import { openMenuEditor } from './menu-editor.js';
import { openOffers, openSettings } from './settings.js';
import { openReviews, watchPendingReviews } from './reviews.js';

const status = $('#status');

function show(screen) {
  status.hidden = screen !== 'status';
  $('#login').hidden = screen !== 'login';
  $('#app').hidden = screen !== 'app';
}

async function start() {
  if (!firebaseConfig) {
    status.textContent = 'Firebase لسه مش متظبط. حط firebaseConfig في assets/js/firebase-config.js (الخطوات في README).';
    return;
  }

  const [{ initializeApp }, authSdk, fs] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = authSdk.getAuth(app);
  const db = fs.getFirestore(app);
  if (useEmulators) {
    authSdk.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    fs.connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  const ctx = { db, fs, orders: [] };

  let stopOrders = null;
  let stopReviews = null;
  let current = 'orders';

  const open = {
    orders: () => {},
    stats: () => renderStats($('#stats'), ctx.orders),
    menu: () => openMenuEditor($('#menu'), ctx),
    offers: () => openOffers($('#offers'), ctx),
    settings: () => openSettings($('#settings'), ctx),
    reviews: () => openReviews($('#reviews'), ctx),
  };

  function select(tab) {
    current = tab;
    $$('[data-tab]').forEach((el) => el.setAttribute('aria-selected', String(el.dataset.tab === tab)));
    $$('[data-panel]').forEach((el) => { el.hidden = el.dataset.panel !== tab; });
    open[tab]();
  }

  $$('[data-tab]').forEach((el) => el.addEventListener('click', () => select(el.dataset.tab)));
  $('#sign-out').addEventListener('click', () => authSdk.signOut(auth));

  $('#login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $('button', form);
    $('#login-error').textContent = '';
    button.disabled = true;
    try {
      await authSdk.signInWithEmailAndPassword(auth, form.elements.email.value, form.elements.password.value);
      form.reset();
    } catch (error) {
      $('#login-error').textContent = authMessage(error.code);
    }
    button.disabled = false;
  });

  authSdk.onAuthStateChanged(auth, async (user) => {
    stopOrders?.();
    stopOrders = null;
    stopReviews?.();
    stopReviews = null;
    $('#review-count').hidden = true;
    ctx.orders = [];
    // مانسيبش بيانات الزباين في الصفحة بعد الخروج
    $$('[data-panel]').forEach((el) => el.replaceChildren());
    $('#editor').close();
    document.title = 'لوحة التحكم';

    if (!user) {
      show('login');
      return;
    }

    show('status');
    status.textContent = 'بنتأكد من الصلاحية…';
    let isAdmin = false;
    try {
      isAdmin = (await fs.getDoc(fs.doc(db, 'admins', user.uid))).exists();
    } catch (error) {
      console.error(error);
    }
    if (!isAdmin) {
      await authSdk.signOut(auth);
      $('#login-error').textContent = 'الحساب ده مش أدمن.';
      return;
    }

    show('app');
    select('orders');
    stopReviews = watchPendingReviews(ctx);
    stopOrders = startOrders($('#orders'), ctx, () => {
      if (current === 'stats') renderStats($('#stats'), ctx.orders);
    });
  });
}

start().catch((error) => {
  console.error(error);
  show('status');
  status.textContent = 'ماقدرناش نحمّل لوحة التحكم. تأكد من النت وحدّث الصفحة.';
  toast('خطأ في التحميل');
});
