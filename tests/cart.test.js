import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addItem, setQty, cartTotal, cartCount, lineKey, reconcileCart, validateCustomer,
  buildMessage, buildOrder, toWhatsAppNumber, whatsappUrl, offerLine, lineImage, LIMITS,
} from '../public/assets/js/cart.js';

const shawarma = { id: 'a', name: 'شاورما فراخ', size: 'حجم 1', price: 95 };
const maria = { id: 'b', name: 'ماريا فراخ', size: '', price: 185 };

test('إضافة نفس الصنف والحجم بتزود الكمية', () => {
  let cart = addItem([], shawarma);
  cart = addItem(cart, shawarma);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].qty, 2);
});

test('حجم مختلف لنفس الصنف سطر لوحده', () => {
  const cart = addItem(addItem([], shawarma), { ...shawarma, size: 'حجم 2', price: 110 });
  assert.equal(cart.length, 2);
});

test('إضافة صنف مابتعدلش السلة القديمة', () => {
  const before = addItem([], shawarma);
  addItem(before, shawarma);
  assert.equal(before[0].qty, 1);
});

test('الإجمالي وعدد القطع', () => {
  const cart = addItem(addItem(addItem([], shawarma), shawarma), maria);
  assert.equal(cartTotal(cart), 375);
  assert.equal(cartCount(cart), 3);
  assert.equal(cartTotal([]), 0);
});

test('تغيير الكمية، وصفر بيمسح السطر', () => {
  const cart = addItem(addItem([], shawarma), maria);
  assert.equal(setQty(cart, lineKey(cart[0]), 4)[0].qty, 4);
  assert.deepEqual(setQty(cart, lineKey(cart[0]), 0).map((l) => l.id), ['b']);
});

test('الكمية ليها حد أقصى', () => {
  const cart = addItem([], shawarma);
  assert.equal(setQty(cart, lineKey(cart[0]), 999)[0].qty, LIMITS.qty);
});

test('عدد السطور ليه حد أقصى', () => {
  let cart = [];
  for (let i = 0; i < LIMITS.lines + 5; i++) cart = addItem(cart, { ...maria, id: `x${i}` });
  assert.equal(cart.length, LIMITS.lines);
});

const menu = [{
  id: 'c', name: 'قسم', groups: [{
    name: 'مجموعة', sizes: ['سوري', 'فرنساوي'],
    items: [
      { id: 'a', name: 'شاورما فراخ', prices: [100, 120] },
      { id: 'b', name: 'ماريا', prices: [185], soldOut: true },
      { id: 'd', name: 'مشكوك', prices: [50, 65], confirm: true },
    ],
  }],
}];

test('السلة المحفوظة بتاخد السعر والاسم الحالي من المنيو', () => {
  const old = [{ id: 'a', name: 'قديم', size: 'فرنساوي', price: 90, qty: 2 }];
  const { cart, changed } = reconcileCart(old, menu);
  assert.deepEqual(cart, [{ id: 'a', name: 'شاورما فراخ', size: 'فرنساوي', price: 120, qty: 2 }]);
  assert.equal(changed, true);
});

test('الصنف الخلصان أو الممسوح أو المشكوك أو الحجم المختفي بيتشال', () => {
  const old = [
    { id: 'b', name: 'ماريا', size: '', price: 185, qty: 1 },
    { id: 'zzz', name: 'ممسوح', size: '', price: 1, qty: 1 },
    { id: 'd', name: 'مشكوك', size: 'سوري', price: 50, qty: 1 },
    { id: 'a', name: 'شاورما فراخ', size: 'عائلي', price: 100, qty: 1 },
  ];
  assert.deepEqual(reconcileCart(old, menu), { cart: [], changed: true });
});

test('سلة محفوظة تالفة بترجع فاضية', () => {
  assert.deepEqual(reconcileCart('خربانة', menu).cart, []);
  assert.deepEqual(reconcileCart([null, { id: 'a' }], menu).cart, []);
});

const customer = { type: 'delivery', name: 'أحمد علي', phone: '01012345678', address: 'شارع ٩ عمارة 3', notes: 'من غير مخلل' };

test('بيانات صحيحة من غير أخطاء', () => {
  assert.deepEqual(validateCustomer(customer), {});
});

test('الاسم والموبايل والعنوان مطلوبين في الدليفري', () => {
  const errors = validateCustomer({ type: 'delivery', name: ' ', phone: '12345', address: '' });
  assert.deepEqual(Object.keys(errors).sort(), ['address', 'name', 'phone']);
});

test('الاستلام من المطعم مايحتاجش عنوان', () => {
  assert.deepEqual(validateCustomer({ ...customer, type: 'pickup', address: '' }), {});
});

test('الموبايل بالأرقام العربي أو بمسافات و +20 مقبول', () => {
  for (const phone of ['٠١٠١٢٣٤٥٦٧٨', '010 1234 5678', '+201012345678']) {
    assert.deepEqual(validateCustomer({ ...customer, phone }), {}, phone);
    assert.equal(buildOrder(addItem([], maria), { ...customer, phone }).phone, '01012345678');
  }
});

test('رسالة الواتساب فيها كل تفاصيل الطلب', () => {
  const cart = addItem(addItem(addItem([], shawarma), shawarma), maria);
  assert.equal(buildMessage(cart, customer), [
    'طلب جديد من موقع شام الأصيل',
    'النوع: دليفري',
    'الاسم: أحمد علي',
    'الموبايل: 01012345678',
    'العنوان: شارع ٩ عمارة 3',
    '---',
    '2 × شاورما فراخ (حجم 1) = 190 ج',
    '1 × ماريا فراخ = 185 ج',
    '---',
    'الإجمالي: 375 ج (من غير مصاريف التوصيل)',
    'ملاحظات: من غير مخلل',
  ].join('\n'));
});

test('رسالة الاستلام من غير عنوان ولا توصيل ولا ملاحظات فاضية', () => {
  const msg = buildMessage(addItem([], maria), { ...customer, type: 'pickup', notes: '' });
  assert.ok(msg.includes('النوع: استلام من المطعم'));
  assert.ok(!msg.includes('العنوان'));
  assert.ok(!msg.includes('التوصيل'));
  assert.ok(!msg.includes('ملاحظات'));
});

test('رقم الواتساب بالصيغة الدولية من غير +', () => {
  assert.equal(toWhatsAppNumber('01157879997'), '201157879997');
  assert.equal(toWhatsAppNumber('+201157879997'), '201157879997');
  assert.equal(toWhatsAppNumber('201157879997'), '201157879997');
});

test('رابط الواتساب بيرمز الرسالة صح', () => {
  const url = new URL(whatsappUrl('01157879997', 'سطر & #1\nسطر 2'));
  assert.equal(url.origin + url.pathname, 'https://wa.me/201157879997');
  assert.equal(url.searchParams.get('text'), 'سطر & #1\nسطر 2');
});

test('الطلب المسجل بالحقول المسموحة بس وحالته جديد', () => {
  const order = buildOrder(addItem([], maria), { ...customer, name: 'ا'.repeat(200), extra: 'x' });
  assert.deepEqual(Object.keys(order).sort(), ['address', 'lines', 'name', 'notes', 'phone', 'status', 'total', 'type']);
  assert.equal(order.status, 'new');
  assert.equal(order.total, 185);
  assert.equal(order.name.length, LIMITS.name);
  assert.deepEqual(order.lines, [{ id: 'b', name: 'ماريا فراخ', size: '', price: 185, qty: 1 }]);
});

test('طلب الاستلام بيتسجل من غير عنوان', () => {
  assert.equal(buildOrder(addItem([], maria), { ...customer, type: 'pickup' }).address, '');
});

test('سطر العرض بيفضل طول ما العرض شغال وبياخد سعره الحالي', () => {
  const offers = [{ id: 'o1', title: 'صينية', price: 700, active: true }, { id: 'o2', title: 'مخفي', price: 1, active: false }];
  const saved = [
    { id: 'offer:o1', name: 'قديم', size: '', price: 600, qty: 1 },
    { id: 'offer:o2', name: 'عرض: مخفي', size: '', price: 1, qty: 1 },
  ];
  assert.deepEqual(reconcileCart(saved, menu, offers).cart, [
    { id: 'offer:o1', name: 'عرض: صينية', size: '', price: 700, qty: 1 },
  ]);
});

test('سطر العرض بيتعمل بنفس الشكل', () => {
  assert.deepEqual(offerLine({ id: 'o1', title: 'صينية', price: 700 }), { id: 'offer:o1', name: 'عرض: صينية', size: '', price: 700 });
});

test('إضافة أكتر من قطعة مرة واحدة، بحد أقصى', () => {
  let cart = addItem([], shawarma, 3);
  assert.equal(cart[0].qty, 3);
  cart = addItem(cart, shawarma, 2);
  assert.equal(cart[0].qty, 5);
  assert.equal(addItem(cart, shawarma, 999)[0].qty, LIMITS.qty);
  assert.deepEqual(addItem([], shawarma, 0), []);
});

test('صورة سطر السلة من المنيو أو العرض', () => {
  const withImages = [{ id: 'c', image: 'cat', groups: [{ items: [{ id: 'a', image: 'own' }, { id: 'b', image: '' }] }] }];
  const offers = [{ id: 'o1', image: 'offer-img' }];
  assert.equal(lineImage({ id: 'a' }, withImages, offers), 'own');
  assert.equal(lineImage({ id: 'b' }, withImages, offers), 'cat');
  assert.equal(lineImage({ id: 'offer:o1' }, withImages, offers), 'offer-img');
  assert.equal(lineImage({ id: 'zzz' }, withImages, offers), '');
});
