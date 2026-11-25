import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseItem, parseOffer, parseSettings, changeItem, parsePrice, authMessage } from '../public/assets/js/admin/forms.js';

test('السعر رقم صحيح، والأرقام العربي مقبولة', () => {
  assert.equal(parsePrice('١٢٠'), 120);
  assert.equal(parsePrice(' 95 '), 95);
  for (const bad of ['', '12.5', '-3', 'abc', '1000001']) assert.equal(parsePrice(bad), null, bad);
});

const input = { name: ' شاورما ', desc: '', prices: ['95', '١١٠', '', ''], soldOut: false, featured: true, confirm: false };

test('صنف سليم بيتحول للشكل المخزن', () => {
  assert.deepEqual(parseItem(input), {
    value: { name: 'شاورما', desc: '', prices: [95, 110], soldOut: false, featured: true, confirm: false },
  });
});

test('صنف من غير اسم أو سعر أو بسعر غلط أو فيه خانة فاضية في النص مرفوض', () => {
  assert.ok(parseItem({ ...input, name: ' ' }).error);
  assert.ok(parseItem({ ...input, prices: ['', '', '', ''] }).error);
  assert.ok(parseItem({ ...input, prices: ['x'] }).error);
  assert.ok(parseItem({ ...input, prices: ['10', '', '20'] }).error);
});

test('السعر صفر مسموح بس مع «اسأل عن السعر»', () => {
  assert.ok(parseItem({ ...input, prices: ['0'] }).error);
  assert.deepEqual(parseItem({ ...input, prices: ['0'], confirm: true }).value.prices, [0]);
});

const category = () => ({
  name: 'ق', order: 1, image: '', groups: [
    { name: 'أ', sizes: [], items: [{ id: '1', name: 'واحد', prices: [1] }, { id: '2', name: 'اتنين', prices: [2] }] },
    { name: 'ب', sizes: [], items: [] },
  ],
});

test('تعديل صنف من غير ما نلمس الأصل', () => {
  const before = category();
  const after = changeItem(before, { id: '2', patch: { soldOut: true } });
  assert.equal(after.groups[0].items[1].soldOut, true);
  assert.equal(after.groups[0].items[1].name, 'اتنين');
  assert.equal(before.groups[0].items[1].soldOut, undefined);
});

test('إضافة صنف في مجموعة', () => {
  const after = changeItem(category(), { groupIndex: 1, add: { id: '3', name: 'تلاتة', prices: [3] } });
  assert.deepEqual(after.groups[1].items.map((i) => i.id), ['3']);
});

test('حذف صنف', () => {
  const after = changeItem(category(), { id: '1', remove: true });
  assert.deepEqual(after.groups[0].items.map((i) => i.id), ['2']);
});

test('تعديل صنف اتمسح من جهاز تاني بيطلع خطأ', () => {
  assert.throws(() => changeItem(category(), { id: '9', patch: {} }), /مش موجود/);
});

test('العرض لازم له عنوان وسعر', () => {
  assert.deepEqual(parseOffer({ title: ' صينية ', price: '٧٠٠', active: true }), { value: { title: 'صينية', price: 700, active: true } });
  assert.ok(parseOffer({ title: '', price: '1' }).error);
  assert.ok(parseOffer({ title: 'x', price: '0' }).error);
});

const settings = {
  delivery: '01227788425\n 010 6376 7076 \n\n', complaints: '01090000345', whatsapp: '٠١١٥٧٨٧٩٩٩٧',
  address: 'عنوان', hours: 'مفتوح', closed: false, closedMessage: '',
};

test('الإعدادات بتتنضف وتتحفظ بنفس شكل الموقع', () => {
  assert.deepEqual(parseSettings(settings).value, {
    phones: { delivery: ['01227788425', '01063767076'], complaints: '01090000345' },
    whatsapp: '01157879997', address: 'عنوان', hours: 'مفتوح', closed: false, closedMessage: '',
  });
});

test('رقم واتساب غلط أو من غير أرقام دليفري مرفوض', () => {
  assert.ok(parseSettings({ ...settings, whatsapp: '123' }).error);
  assert.ok(parseSettings({ ...settings, delivery: '' }).error);
  assert.ok(parseSettings({ ...settings, delivery: 'اتصل بينا' }).error);
});

test('الإيميل أو الباسورد الغلط بيطلع نفس الرسالة بكل أكواد Firebase', () => {
  for (const code of ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials']) {
    assert.equal(authMessage(code), 'الإيميل أو الباسورد غلط', code);
  }
  assert.equal(authMessage('auth/network-request-failed'), 'مفيش اتصال بالنت');
  assert.equal(authMessage('auth/other'), 'ماقدرناش ندخلك، جرب تاني');
});
