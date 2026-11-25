// تبويب الطلبات: قائمة لحظية لآخر 30 يوم، تغيير الحالة، ومسح القديم.
// بيانات الزبون بتتعرض كنص بس (h مابيستخدمش innerHTML).
import { $, h, money } from '../dom.js';
import { rangeStart } from './stats.js';
import { ask, attempt, toast } from './ui.js';

const STATUS = { new: 'جديد', confirmed: 'متأكد', delivered: 'اتسلّم', cancelled: 'ملغي' };
const when = new Intl.DateTimeFormat('ar-EG', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function card(ctx, order) {
  const { fs, db } = ctx;
  const phone = /^[\d+]{7,15}$/.test(order.phone) ? order.phone : '';
  const lines = Array.isArray(order.lines) ? order.lines : [];

  return h('li', { class: `order is-${order.status}` },
    h('header', null,
      h('strong', null, String(order.name)),
      h('span', { class: 'pill' }, STATUS[order.status] || order.status),
      h('time', null, order.createdAt ? when.format(order.createdAt) : '')),
    h('p', null,
      order.type === 'delivery' ? 'دليفري: ' : 'استلام من المطعم',
      order.type === 'delivery' ? String(order.address) : null),
    order.notes ? h('p', { class: 'notes' }, `ملاحظات: ${order.notes}`) : null,
    h('ul', null, lines.map((line) => h('li', null,
      `${line?.qty} × ${line?.name}${line?.size ? ` (${line.size})` : ''}`,
      h('span', null, money((Number(line?.price) || 0) * (Number(line?.qty) || 0)))))),
    h('p', { class: 'order-total' }, 'الإجمالي ', h('strong', null, money(order.total))),
    h('div', { class: 'order-actions' },
      phone ? h('a', { class: 'btn', href: `tel:${phone}` }, 'اتصل ', h('bdi', { dir: 'ltr' }, phone)) : null,
      h('div', { class: 'segmented', role: 'group', 'aria-label': 'حالة الطلب' },
        Object.entries(STATUS).map(([value, label]) => h('button', {
          type: 'button',
          'aria-pressed': String(order.status === value),
          onclick: () => order.status !== value
            && attempt(() => fs.updateDoc(fs.doc(db, 'orders', order.id), { status: value })),
        }, label)))));
}

async function deleteOld(ctx, days) {
  const { fs, db } = ctx;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const query = fs.query(fs.collection(db, 'orders'), fs.where('createdAt', '<', cutoff), fs.limit(400));
  const found = await fs.getDocs(query);
  if (found.empty) {
    toast(`مفيش طلبات أقدم من ${days} يوم`);
    return;
  }
  if (!await ask(`هتمسح ${found.size} طلب أقدم من ${days} يوم نهائياً. تكمل؟`, 'امسح')) return;
  await attempt(async () => {
    const batch = fs.writeBatch(db);
    found.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }, `اتمسح ${found.size} طلب${found.size === 400 ? '، وفيه تاني: دوس مرة كمان' : ''}`);
}

export function startOrders(root, ctx, onChange) {
  const { fs, db } = ctx;
  let filter = 'all';
  let loaded = false;

  const filters = h('div', { class: 'segmented', role: 'group', 'aria-label': 'فلترة الطلبات' });
  const list = h('ul', { class: 'orders' });
  const days = h('select', { 'aria-label': 'عمر الطلبات' },
    [90, 30, 180].map((n) => h('option', { value: n }, `أقدم من ${n} يوم`)));
  root.replaceChildren(
    h('div', { class: 'bar' }, h('h2', null, 'طلبات آخر 30 يوم'), filters),
    h('p', { class: 'hint' }, 'الطلب هنا معناه إن الزبون داس «ابعت»، مش إن الرسالة وصلت. أكّد الطلب بعد ما يوصلك علشان يتحسب في الإحصائيات.'),
    list,
    h('div', { class: 'cleanup' }, 'مسح الطلبات القديمة:', days,
      h('button', { type: 'button', class: 'btn btn-danger', onclick: () => deleteOld(ctx, Number(days.value)) }, 'امسح')));

  function render() {
    const fresh = ctx.orders.filter((o) => o.status === 'new').length;
    const badge = $('#new-count');
    badge.textContent = fresh;
    badge.hidden = !fresh;
    document.title = fresh ? `(${fresh}) لوحة التحكم` : 'لوحة التحكم';

    filters.replaceChildren(...Object.entries({ all: 'الكل', ...STATUS }).map(([value, label]) =>
      h('button', {
        type: 'button',
        'aria-pressed': String(filter === value),
        onclick: () => { filter = value; render(); },
      }, label)));

    const shown = ctx.orders.filter((o) => filter === 'all' || o.status === filter);
    list.replaceChildren(...(shown.length
      ? shown.map((order) => card(ctx, order))
      : [h('li', { class: 'empty' }, loaded ? 'مفيش طلبات هنا لسه.' : 'بنحمّل الطلبات…')]));
  }
  render();

  const query = fs.query(
    fs.collection(db, 'orders'),
    fs.where('createdAt', '>=', new Date(rangeStart('30d'))),
    fs.orderBy('createdAt', 'desc'),
  );
  return fs.onSnapshot(query, (snapshot) => {
    const previous = new Set(ctx.orders.map((o) => o.id));
    ctx.orders = snapshot.docs.map((d) => {
      const data = d.data();
      return { ...data, id: d.id, createdAt: data.createdAt?.toMillis?.() ?? null };
    });
    if (loaded && ctx.orders.some((o) => o.status === 'new' && !previous.has(o.id))) toast('فيه طلب جديد');
    loaded = true;
    render();
    onChange();
  }, (error) => {
    console.error(error);
    list.replaceChildren(h('li', { class: 'empty' }, 'ماقدرناش نقرأ الطلبات. تأكد من النت وحدّث الصفحة.'));
  });
}
