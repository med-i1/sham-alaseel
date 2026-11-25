import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats } from '../public/assets/js/admin/stats.js';

const now = new Date(2026, 10, 25, 15, 0); // 25 نوفمبر 3 العصر
const at = (day, hour = 12) => new Date(2026, 10, day, hour).getTime();
const order = (createdAt, status, total, lines = []) => ({ createdAt, status, total, lines });
const line = (name, size, qty) => ({ name, size, qty, price: 10 });

const orders = [
  order(at(25, 1), 'confirmed', 100, [line('شاورما', 'حجم 1', 2)]),
  order(at(25, 14), 'delivered', 200, [line('ماريا', '', 5), line('شاورما', 'حجم 1', 1)]),
  order(at(25, 14), 'new', 999, [line('وهمي', '', 50)]),
  order(at(25, 14), 'cancelled', 999, [line('وهمي', '', 50)]),
  order(at(24, 23), 'delivered', 50, [line('شاورما', 'حجم 2', 1)]),
  order(at(19), 'delivered', 70),
  order(at(18), 'delivered', 30),
  order(new Date(2026, 9, 20).getTime(), 'delivered', 5000),
];

test('النهارده من أول منتصف الليل، والمتأكد والمسلّم بس', () => {
  const s = computeStats(orders, 'today', now);
  assert.equal(s.count, 2);
  assert.equal(s.total, 300);
});

test('آخر 7 أيام شاملة النهارده', () => {
  const s = computeStats(orders, '7d', now);
  assert.equal(s.count, 4);
  assert.equal(s.total, 420);
});

test('آخر 30 يوم', () => {
  const s = computeStats(orders, '30d', now);
  assert.equal(s.count, 5);
  assert.equal(s.total, 450);
});

test('أكتر الأصناف بالكمية، وكل حجم لوحده', () => {
  assert.deepEqual(computeStats(orders, '7d', now).top, [
    { name: 'ماريا', qty: 5 },
    { name: 'شاورما (حجم 1)', qty: 3 },
    { name: 'شاورما (حجم 2)', qty: 1 },
  ]);
});

test('الطلبات الجديدة والملغية بتتعد لوحدها', () => {
  const s = computeStats(orders, 'today', now);
  assert.equal(s.pending, 1);
  assert.equal(s.cancelled, 1);
});

test('من غير طلبات', () => {
  assert.deepEqual(computeStats([], 'today', now), { count: 0, total: 0, pending: 0, cancelled: 0, top: [] });
});
