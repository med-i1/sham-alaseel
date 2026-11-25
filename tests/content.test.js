import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeContent, safeImage } from '../public/assets/js/content.js';

const fallback = {
  menu: [{ id: 'f', name: 'احتياطي', order: 1, image: '', groups: [] }],
  offers: [{ id: 'o', title: 'عرض', price: 10, image: '', active: true }],
  settings: { phones: { delivery: ['010'], complaints: '011' }, whatsapp: '012', address: 'ع', hours: 'س', closed: false, closedMessage: 'م' },
};

test('من غير بيانات بيرجع المحتوى الأساسي', () => {
  assert.deepEqual(normalizeContent({}, fallback), fallback);
  assert.deepEqual(normalizeContent({ menu: [], offers: null, settings: null }, fallback), fallback);
});

test('الأقسام بتترتب والأصناف الناقصة بتتشال', () => {
  const { menu } = normalizeContent({ menu: [
    { id: 'b', name: 'ب', order: 2 },
    { id: 'a', name: 'أ', order: 1, groups: [{ name: 'g', items: [
      { id: '1', name: 'سليم', prices: [10] },
      { id: '2', name: '', prices: [10] },
      { id: '3', name: 'من غير سعر', prices: [] },
      { id: '4', name: 'سعر غلط', prices: ['x'] },
      null,
    ] }] },
  ] }, fallback);
  assert.deepEqual(menu.map((c) => c.id), ['a', 'b']);
  assert.deepEqual(menu[0].groups[0].sizes, []);
  assert.deepEqual(menu[0].groups[0].items, [
    { id: '1', name: 'سليم', desc: '', prices: [10], image: '', soldOut: false, featured: false, confirm: false },
  ]);
  assert.deepEqual(menu[1].groups, []);
});

test('الإعدادات الناقصة بتتكمل من الأساسي', () => {
  const { settings } = normalizeContent({ settings: { closed: true, phones: { delivery: [] } } }, fallback);
  assert.equal(settings.closed, true);
  assert.equal(settings.whatsapp, '012');
  assert.deepEqual(settings.phones, { delivery: ['010'], complaints: '011' });
});

test('قائمة عروض فاضية معناها مفيش عروض', () => {
  assert.deepEqual(normalizeContent({ offers: [] }, fallback).offers, []);
});

test('الصور المسموحة بس', () => {
  for (const ok of ['assets/img/a-b.webp', 'img:abc_123', 'data:image/webp;base64,AAAA']) assert.equal(safeImage(ok), ok);
  for (const bad of ['javascript:alert(1)', 'https://evil.example/x.png', '//x', 'data:text/html,x', 'assets/../x', 5, undefined]) {
    assert.equal(safeImage(bad), '');
  }
});
