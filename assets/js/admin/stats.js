// تبويب الإحصائيات. الحسابات (computeStats) من غير DOM ولا Firebase.
// الإجمالي وعدد الطلبات وأكتر الأصناف من الطلبات المتأكدة والمسلّمة بس.
import { h, money } from '../dom.js';

export const RANGES = { today: 1, '7d': 7, '30d': 30 };

export function rangeStart(range, now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - (RANGES[range] - 1)).getTime();
}

export function computeStats(orders, range, now = new Date()) {
  const start = rangeStart(range, now);
  const stats = { count: 0, total: 0, pending: 0, cancelled: 0, top: [] };
  const quantities = new Map();

  for (const order of orders) {
    if ((order.createdAt ?? now.getTime()) < start) continue;
    if (order.status === 'new') stats.pending += 1;
    if (order.status === 'cancelled') stats.cancelled += 1;
    if (order.status !== 'confirmed' && order.status !== 'delivered') continue;

    stats.count += 1;
    stats.total += Number(order.total) || 0;
    for (const line of order.lines || []) {
      const name = line.size ? `${line.name} (${line.size})` : String(line.name);
      quantities.set(name, (quantities.get(name) || 0) + (Number(line.qty) || 0));
    }
  }

  stats.top = [...quantities]
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name, 'ar'))
    .slice(0, 10);
  return stats;
}

const LABELS = { today: 'النهارده', '7d': 'آخر 7 أيام', '30d': 'آخر 30 يوم' };
let selected = 'today';

const tile = (label, value) => h('div', { class: 'tile' }, h('span', null, label), h('strong', null, String(value)));

export function renderStats(root, orders) {
  const stats = computeStats(orders, selected);
  const max = stats.top[0]?.qty || 1;
  root.replaceChildren(
    h('div', { class: 'bar' },
      h('h2', null, 'الإحصائيات'),
      h('div', { class: 'segmented', role: 'group', 'aria-label': 'الفترة' },
        Object.entries(LABELS).map(([range, label]) => h('button', {
          type: 'button',
          'aria-pressed': String(selected === range),
          onclick: () => { selected = range; renderStats(root, orders); },
        }, label)))),
    h('p', { class: 'hint' }, 'الأرقام من الطلبات المتأكدة والمسلّمة بس.'),
    h('div', { class: 'tiles' },
      tile('عدد الطلبات', stats.count),
      tile('الإجمالي', money(stats.total)),
      tile('مستني تأكيد', stats.pending),
      tile('ملغي', stats.cancelled)),
    h('h3', null, 'أكتر الأصناف'),
    stats.top.length
      ? h('ol', { class: 'top-items' }, stats.top.map(({ name, qty }) => h('li', null,
        h('span', null, name),
        h('strong', null, String(qty)),
        h('meter', { min: 0, max, value: qty, 'aria-hidden': 'true' }))))
      : h('p', { class: 'empty' }, 'مفيش طلبات متأكدة في الفترة دي.'));
}
