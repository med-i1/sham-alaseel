// تبويبي العروض والإعدادات (مستندين في مجموعة site)
import { h, money } from '../dom.js';
import { offers as seedOffers, settings as seedSettings } from '../seed.js';
import { parseOffer, parseSettings } from './forms.js';
import { ask, attempt, openEditor, field, checkbox, thumbnail, imageField, deleteImage } from './ui.js';

async function read(ctx, id) {
  const snapshot = await ctx.fs.getDoc(ctx.fs.doc(ctx.db, 'site', id));
  return snapshot.exists() ? snapshot.data() : null;
}

/* ---------- العروض ---------- */
async function updateOffers(ctx, change) {
  const { fs, db } = ctx;
  const ref = fs.doc(db, 'site', 'offers');
  await fs.runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const list = snapshot.exists() ? snapshot.data().list : seedOffers;
    transaction.set(ref, { list: change(list) });
  });
}

function editOffer(root, ctx, offer) {
  const image = imageField(ctx, offer?.image);
  openEditor(offer ? 'تعديل العرض' : 'عرض جديد', [
    field('اسم العرض', { name: 'title', value: offer?.title ?? '', maxlength: 80 }),
    field('السعر', { name: 'price', inputmode: 'numeric', value: offer?.price ?? '' }),
    checkbox('ظاهر في الموقع', 'active', offer?.active ?? true),
    image.node,
  ], async (form) => {
    const data = new FormData(form);
    const { value, error } = parseOffer({ title: data.get('title'), price: data.get('price'), active: data.has('active') });
    if (error) return error;
    value.image = await image.apply();
    await updateOffers(ctx, (list) => (offer
      ? list.map((o) => (o.id === offer.id ? { ...o, ...value } : o))
      : [...list, { id: Date.now().toString(36), ...value }]));
    if (offer?.image && offer.image !== value.image) await deleteImage(ctx, offer.image);
    await openOffers(root, ctx);
    return null;
  });
}

export async function openOffers(root, ctx) {
  let list;
  try {
    list = (await read(ctx, 'offers'))?.list ?? seedOffers;
  } catch (error) {
    console.error(error);
    root.replaceChildren(h('p', { class: 'empty' }, 'ماقدرناش نحمّل العروض. جرب تاني.'));
    return;
  }

  const change = (work, message) => attempt(async () => {
    await updateOffers(ctx, work);
    await openOffers(root, ctx);
  }, message);

  root.replaceChildren(
    h('div', { class: 'bar' },
      h('h2', null, 'العروض'),
      h('button', { type: 'button', class: 'btn', onclick: () => editOffer(root, ctx, null) }, 'إضافة عرض')),
    list.length ? h('ul', { class: 'rows' }, list.map((offer) => h('li', { class: offer.active ? 'row' : 'row is-out' },
      thumbnail(ctx, offer.image),
      h('div', { class: 'row-main' },
        h('strong', null, offer.title),
        h('span', null, money(offer.price)),
        offer.active ? null : h('span', { class: 'flags' }, h('span', { class: 'pill' }, 'مخفي'))),
      h('div', { class: 'row-actions' },
        h('button', {
          type: 'button',
          class: 'btn btn-plain',
          onclick: () => change((all) => all.map((o) => (o.id === offer.id ? { ...o, active: !offer.active } : o)),
            offer.active ? 'العرض اتخفى' : 'العرض ظهر'),
        }, offer.active ? 'إخفاء' : 'إظهار'),
        h('button', { type: 'button', class: 'btn btn-plain', onclick: () => editOffer(root, ctx, offer) }, 'تعديل'),
        h('button', {
          type: 'button',
          class: 'btn btn-danger',
          onclick: async () => {
            if (!await ask(`تمسح عرض «${offer.title}»؟`, 'امسح')) return;
            if (await change((all) => all.filter((o) => o.id !== offer.id), 'العرض اتمسح')) await deleteImage(ctx, offer.image);
          },
        }, 'حذف')))))
      : h('p', { class: 'empty' }, 'مفيش عروض. قسم العروض مخفي من الموقع.'));
}

/* ---------- الإعدادات ---------- */
export async function openSettings(root, ctx) {
  let current;
  try {
    current = { ...seedSettings, ...await read(ctx, 'settings') };
  } catch (error) {
    console.error(error);
    root.replaceChildren(h('p', { class: 'empty' }, 'ماقدرناش نحمّل الإعدادات. جرب تاني.'));
    return;
  }

  const error = h('p', { class: 'error', role: 'alert' });
  const form = h('form', {
    class: 'settings-form',
    novalidate: true,
    onsubmit: async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const result = parseSettings({
        ...Object.fromEntries(data),
        closed: data.has('closed'),
      });
      error.textContent = result.error || '';
      if (result.error) return;
      await attempt(() => ctx.fs.setDoc(ctx.fs.doc(ctx.db, 'site', 'settings'), result.value), 'الإعدادات اتحفظت');
    },
  },
  h('fieldset', null,
    h('legend', null, 'استقبال الطلبات'),
    checkbox('مقفول دلوقتي (الموقع مايبعتش طلبات)', 'closed', current.closed),
    field('رسالة القفل', { name: 'closedMessage', value: current.closedMessage, maxlength: 200 })),
  field('أرقام الدليفري (رقم في كل سطر)', { type: 'textarea', name: 'delivery', value: (current.phones?.delivery || []).join('\n'), dir: 'ltr' }),
  field('رقم الشكاوى', { name: 'complaints', value: current.phones?.complaints, inputmode: 'tel', dir: 'ltr' }),
  field('رقم الواتساب اللي بيستقبل الطلبات', { name: 'whatsapp', value: current.whatsapp, inputmode: 'tel', dir: 'ltr' }),
  field('العنوان', { name: 'address', value: current.address, maxlength: 200 }),
  field('المواعيد', { name: 'hours', value: current.hours, maxlength: 80 }),
  error,
  h('button', { type: 'submit', class: 'btn' }, 'حفظ الإعدادات'));

  root.replaceChildren(h('h2', null, 'الإعدادات'), form);
}
