// بتتشغل على محاكي Firestore: npm run test:rules
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, getDocs, serverTimestamp, Timestamp, writeBatch, query, where } from 'firebase/firestore';
import { buildOrder, addItem } from '../../public/assets/js/cart.js';

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-sham',
    firestore: {
      rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});
after(async () => { await env?.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'admins/boss'), { note: 'أدمن' });
    await setDoc(doc(db, 'menu/grills'), { name: 'المشويات', order: 1, groups: [] });
    await setDoc(doc(db, 'site/settings'), { closed: false });
    await setDoc(doc(db, 'images/one'), { data: 'data:image/webp;base64,AAAA' });
    await setDoc(doc(db, 'orders/o1'), { ...goodOrder(), createdAt: Timestamp.now() });
  });
});

const visitor = () => env.unauthenticatedContext().firestore();
const stranger = () => env.authenticatedContext('stranger').firestore();
const admin = () => env.authenticatedContext('boss').firestore();

// نفس الشكل اللي الموقع بيبعته
function goodOrder(changes = {}, customer = {}) {
  const cart = addItem([], { id: 'grills-1', name: 'كفتة', size: '', price: 100 });
  const order = buildOrder(cart, { type: 'delivery', name: 'زبون', phone: '01012345678', address: 'شارع 5', notes: '', ...customer });
  return { ...order, createdAt: serverTimestamp(), ...changes };
}

const place = (db, order) => addDoc(collection(db, 'orders'), order);

test('الزائر يقرأ المنيو والإعدادات والصور', async () => {
  for (const path of ['menu/grills', 'site/settings', 'images/one']) {
    await assertSucceeds(getDoc(doc(visitor(), path)));
  }
  await assertSucceeds(getDocs(collection(visitor(), 'menu')));
});

test('الزائر والمسجل غير الأدمن مايقدروش يعدلوا المنيو ولا الإعدادات ولا الصور', async () => {
  for (const db of [visitor(), stranger()]) {
    await assertFails(setDoc(doc(db, 'menu/grills'), { name: 'اختراق' }));
    await assertFails(deleteDoc(doc(db, 'menu/grills')));
    await assertFails(setDoc(doc(db, 'site/settings'), { whatsapp: '010' }));
    await assertFails(setDoc(doc(db, 'site/offers'), { list: [] }));
    await assertFails(setDoc(doc(db, 'images/two'), { data: 'x' }));
  }
});

test('الزائر يسجل طلب دليفري أو استلام', async () => {
  await assertSucceeds(place(visitor(), goodOrder()));
  await assertSucceeds(place(visitor(), goodOrder({}, { type: 'pickup', address: '' })));
});

test('الزائر وغير الأدمن مايقدروش يقرأوا الطلبات ولا يغيروها', async () => {
  for (const db of [visitor(), stranger()]) {
    await assertFails(getDoc(doc(db, 'orders/o1')));
    await assertFails(getDocs(collection(db, 'orders')));
    await assertFails(updateDoc(doc(db, 'orders/o1'), { status: 'delivered' }));
    await assertFails(deleteDoc(doc(db, 'orders/o1')));
    await assertFails(setDoc(doc(db, 'orders/o1'), goodOrder()));
  }
});

const bad = {
  'حقل زيادة': { extra: 1 },
  'حالة غير جديد': { status: 'confirmed' },
  'وقت من جهاز الزبون': { createdAt: Timestamp.fromMillis(0) },
  'نوع غلط': { type: 'drone' },
  'اسم طويل': { name: 'ا'.repeat(61) },
  'اسم مش نص': { name: 5 },
  'موبايل غلط': { phone: '12345' },
  'دليفري من غير عنوان': { address: '' },
  'عنوان طويل': { address: 'ا'.repeat(301) },
  'ملاحظات طويلة': { notes: 'ا'.repeat(301) },
  'من غير أصناف': { lines: [] },
  'أصناف أكتر من 50': { lines: Array(51).fill({ id: 'x' }) },
  'أصناف مش قائمة': { lines: 'كفتة' },
  'إجمالي سالب': { total: -1 },
  'إجمالي بكسور': { total: 1.5 },
  'إجمالي ضخم': { total: 1000001 },
};

for (const [name, changes] of Object.entries(bad)) {
  test(`طلب مشوه مرفوض: ${name}`, async () => {
    await assertFails(place(visitor(), goodOrder(changes)));
  });
}

test('طلب ناقص حقل مرفوض', async () => {
  const order = goodOrder();
  delete order.total;
  await assertFails(place(visitor(), order));
});

test('محدش يكتب في admins، وكل واحد يقرأ مستنده بس', async () => {
  await assertFails(setDoc(doc(stranger(), 'admins/stranger'), { x: 1 }));
  await assertFails(setDoc(doc(admin(), 'admins/second'), { x: 1 }));
  await assertSucceeds(getDoc(doc(admin(), 'admins/boss')));
  await assertSucceeds(getDoc(doc(stranger(), 'admins/stranger')));
  await assertFails(getDoc(doc(stranger(), 'admins/boss')));
  await assertFails(getDocs(collection(stranger(), 'admins')));
});

test('الأدمن يقرأ الطلبات ويغير الحالة ويمسح', async () => {
  const db = admin();
  await assertSucceeds(getDocs(collection(db, 'orders')));
  await assertSucceeds(updateDoc(doc(db, 'orders/o1'), { status: 'confirmed' }));
  await assertSucceeds(deleteDoc(doc(db, 'orders/o1')));
});

test('الأدمن مايغيرش غير الحالة، وبقيمة معروفة', async () => {
  await assertFails(updateDoc(doc(admin(), 'orders/o1'), { total: 1 }));
  await assertFails(updateDoc(doc(admin(), 'orders/o1'), { status: 'مفقود' }));
});

test('الأدمن يعدل المنيو والعروض والإعدادات والصور', async () => {
  const db = admin();
  await assertSucceeds(setDoc(doc(db, 'menu/grills'), { name: 'المشويات', order: 1, groups: [] }));
  await assertSucceeds(setDoc(doc(db, 'site/offers'), { list: [] }));
  await assertSucceeds(setDoc(doc(db, 'site/settings'), { closed: true }));
  await assertSucceeds(setDoc(doc(db, 'images/two'), { data: 'data:image/webp;base64,AAAA' }));
  await assertSucceeds(deleteDoc(doc(db, 'images/two')));
});

test('صورة أكبر من الحد أو بحقول زيادة مرفوضة', async () => {
  await assertFails(setDoc(doc(admin(), 'images/big'), { data: 'A'.repeat(280001) }));
  await assertFails(setDoc(doc(admin(), 'images/odd'), { data: 'A', other: 1 }));
});

test('أي مجموعة تانية مرفوضة حتى للأدمن', async () => {
  await assertFails(getDoc(doc(admin(), 'secrets/x')));
  await assertFails(setDoc(doc(visitor(), 'secrets/x'), { a: 1 }));
});

// زرار «مسح الطلبات القديمة» ورفع المنيو بيستخدموا عمليات مجمعة
test('الأدمن يمسح 400 طلب مرة واحدة، وغير الأدمن لأ', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const batch = writeBatch(db);
    for (let i = 0; i < 400; i++) batch.set(doc(db, `orders/old${i}`), { status: 'new' });
    await batch.commit();
  });
  const wipe = (db) => {
    const batch = writeBatch(db);
    for (let i = 0; i < 400; i++) batch.delete(doc(db, `orders/old${i}`));
    return batch.commit();
  };
  await assertFails(wipe(stranger()));
  await assertSucceeds(wipe(admin()));
});

test('الأدمن يرفع المنيو والإعدادات والعروض في عملية واحدة', async () => {
  const db = admin();
  const batch = writeBatch(db);
  for (let i = 0; i < 9; i++) batch.set(doc(db, `menu/c${i}`), { name: 'قسم', order: i, groups: [] });
  batch.set(doc(db, 'site/settings'), { closed: false });
  batch.set(doc(db, 'site/offers'), { list: [] });
  await assertSucceeds(batch.commit());
});

// ---------- التقييمات ----------
const goodReview = (changes = {}) => ({
  itemId: 'grills-1', itemName: 'كفتة', stars: 5, name: 'منى', comment: '', approved: false, createdAt: serverTimestamp(), ...changes,
});
const post = (db, review) => addDoc(collection(db, 'reviews'), review);
const seedReviews = () => env.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore();
  await setDoc(doc(db, 'reviews/ok'), { ...goodReview({ approved: true }), createdAt: Timestamp.now() });
  await setDoc(doc(db, 'reviews/waiting'), { ...goodReview(), createdAt: Timestamp.now() });
});

test('الزائر يبعت تقييم مستني الموافقة', async () => {
  await assertSucceeds(post(visitor(), goodReview()));
  await assertSucceeds(post(visitor(), goodReview({ comment: 'طعمه حلو' })));
});

const badReviews = {
  'متوافق عليه من نفسه': { approved: true },
  'نجوم صفر': { stars: 0 },
  'نجوم ستة': { stars: 6 },
  'نجوم بكسور': { stars: 4.5 },
  'من غير اسم': { name: 'م' },
  'اسم طويل': { name: 'ا'.repeat(41) },
  'تعليق طويل': { comment: 'ا'.repeat(301) },
  'حقل زيادة': { reply: 'x' },
  'وقت من جهاز الزبون': { createdAt: Timestamp.fromMillis(0) },
  'صنف طويل': { itemId: 'x'.repeat(61) },
};
for (const [name, changes] of Object.entries(badReviews)) {
  test(`تقييم مرفوض: ${name}`, async () => {
    await assertFails(post(visitor(), goodReview(changes)));
  });
}

test('الزائر يقرأ المتوافق عليه بس', async () => {
  await seedReviews();
  await assertSucceeds(getDoc(doc(visitor(), 'reviews/ok')));
  await assertFails(getDoc(doc(visitor(), 'reviews/waiting')));
  await assertFails(getDocs(collection(visitor(), 'reviews')));
  await assertSucceeds(getDocs(query(collection(visitor(), 'reviews'), where('itemId', '==', 'grills-1'), where('approved', '==', true))));
});

test('الزائر وغير الأدمن مايوافقوش ولا يمسحوا', async () => {
  await seedReviews();
  for (const db of [visitor(), stranger()]) {
    await assertFails(updateDoc(doc(db, 'reviews/waiting'), { approved: true }));
    await assertFails(deleteDoc(doc(db, 'reviews/ok')));
  }
});

test('الأدمن يقرأ الكل ويوافق ويمسح، ومايغيرش كلام الزبون', async () => {
  await seedReviews();
  const db = admin();
  await assertSucceeds(getDocs(collection(db, 'reviews')));
  await assertSucceeds(updateDoc(doc(db, 'reviews/waiting'), { approved: true }));
  await assertFails(updateDoc(doc(db, 'reviews/ok'), { comment: 'اتغير' }));
  await assertFails(updateDoc(doc(db, 'reviews/ok'), { stars: 1 }));
  await assertSucceeds(deleteDoc(doc(db, 'reviews/ok')));
});
