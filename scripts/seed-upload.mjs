// تعبئة المحاكي المحلي: حساب أدمن تجريبي + المنيو والعروض والإعدادات.
//   npm run emulators   (في تيرمنال)
//   npm run seed        (في تيرمنال تاني)
// للمشروع الحقيقي مافيش سكريبت: ادخل الداشبورد ودوس «ارفع المنيو الأساسي».
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, writeBatch, terminate } from 'firebase/firestore';
import { menu, offers, settings } from '../public/assets/js/seed.js';

// بيانات تجريبية للمحاكي المحلي بس، مالهاش أي علاقة بحساب حقيقي
const TEST_ADMIN = { email: 'admin@sham.test', password: 'emulator-only-123' };
const PROJECT = 'demo-sham';

const app = initializeApp({ apiKey: 'demo-key', projectId: PROJECT });
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);

const { user } = await createUserWithEmailAndPassword(auth, TEST_ADMIN.email, TEST_ADMIN.password)
  .catch(() => signInWithEmailAndPassword(auth, TEST_ADMIN.email, TEST_ADMIN.password));

// مستند الأدمن محدش يكتبه من الموقع؛ في المحاكي بس «Bearer owner» بيتخطى القواعد
const response = await fetch(
  `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents/admins/${user.uid}`,
  {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { note: { stringValue: 'أدمن تجريبي' } } }),
  },
);
if (!response.ok) throw new Error(`تعذر إضافة الأدمن: ${response.status}`);

const batch = writeBatch(db);
for (const { id, ...category } of menu) batch.set(doc(db, 'menu', id), category);
batch.set(doc(db, 'site', 'settings'), settings);
batch.set(doc(db, 'site', 'offers'), { list: offers });
await batch.commit();

console.log(`اتعبى المحاكي: ${menu.length} أقسام. حساب الأدمن التجريبي مكتوب في scripts/seed-upload.mjs`);
await signOut(auth);
await terminate(db);
process.exit(0);
