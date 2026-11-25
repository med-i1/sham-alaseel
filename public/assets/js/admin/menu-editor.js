// تبويب المنيو: إضافة وتعديل وحذف الأصناف، الأسعار وأسماء الأحجام، خلصان، مميز، والصورة
import { h, money } from '../dom.js';
import { menu as seedMenu, offers as seedOffers, settings as seedSettings } from '../seed.js';
import { sizeLabel } from '../menu.js';
import { parseItem, changeItem } from './forms.js';
import { ask, attempt, openEditor, field, checkbox, thumbnail, imageField, deleteImage } from './ui.js';

let activeId = null;

// أول مرة: رفع المنيو والعروض والإعدادات الأساسية من seed.js
async function uploadSeed(ctx) {
  const { fs, db } = ctx;
  const batch = fs.writeBatch(db);
  for (const { id, ...category } of seedMenu) batch.set(fs.doc(db, 'menu', id), category);
  const [settings, offers] = await Promise.all([
    fs.getDoc(fs.doc(db, 'site', 'settings')),
    fs.getDoc(fs.doc(db, 'site', 'offers')),
  ]);
  // مانمسحش إعدادات أو عروض اتعدلت قبل كده
  if (!settings.exists()) batch.set(fs.doc(db, 'site', 'settings'), seedSettings);
  if (!offers.exists()) batch.set(fs.doc(db, 'site', 'offers'), { list: seedOffers });
  await batch.commit();
}

// قراءة وكتابة القسم في عملية واحدة علشان تعديل من جهازين مايمسحش بعضه
async function updateCategory(ctx, categoryId, change) {
  const { fs, db } = ctx;
  const ref = fs.doc(db, 'menu', categoryId);
  await fs.runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('القسم مش موجود');
    transaction.set(ref, change(snapshot.data()));
  });
}

function editItem(root, ctx, category, group, groupIndex, item) {
  const image = imageField(ctx, item?.image);
  const prices = [0, 1, 2, 3].map((i) => field(group.sizes?.[i] || `حجم ${i + 1}`, {
    name: `price${i}`, inputmode: 'numeric', value: item?.prices[i] ?? '',
  }));

  openEditor(item ? `تعديل: ${item.name}` : `صنف جديد في ${group.name}`, [
    field('اسم الصنف', { name: 'name', value: item?.name ?? '', maxlength: 100 }),
    field('الوصف (اختياري)', { name: 'desc', value: item?.desc ?? '', maxlength: 200 }),
    h('fieldset', { class: 'prices-row' }, h('legend', null, 'الأسعار (سعر واحد لو مفيش أحجام)'), prices),
    checkbox('خلصان', 'soldOut', item?.soldOut),
    checkbox('مميز (أول 6 مميزين بيظهروا فوق)', 'featured', item?.featured),
    checkbox('اسأل عن السعر (من غير زر إضافة)', 'confirm', item?.confirm),
    image.node,
  ], async (form) => {
    const data = new FormData(form);
    const { value, error } = parseItem({
      name: data.get('name'),
      desc: data.get('desc'),
      prices: [0, 1, 2, 3].map((i) => data.get(`price${i}`)),
      soldOut: data.has('soldOut'),
      featured: data.has('featured'),
      confirm: data.has('confirm'),
    });
    if (error) return error;
    value.image = await image.apply();
    await updateCategory(ctx, category.id, (current) => changeItem(current, item
      ? { id: item.id, patch: value }
      : { groupIndex, add: { id: `${category.id}-${Date.now().toString(36)}`, ...value } }));
    if (item?.image && item.image !== value.image) await deleteImage(ctx, item.image);
    await openMenuEditor(root, ctx);
    return null;
  });
}

function editSizes(root, ctx, category, group, groupIndex) {
  openEditor(`أسماء الأحجام: ${group.name}`, [
    h('p', { class: 'hint' }, 'بالترتيب زي الأسعار. سيب الخانة فاضية علشان يظهر «حجم 1، 2، 3».'),
    [0, 1, 2, 3].map((i) => field(`حجم ${i + 1}`, { name: `size${i}`, value: group.sizes?.[i] ?? '', maxlength: 30 })),
  ], async (form) => {
    const data = new FormData(form);
    const sizes = [0, 1, 2, 3].map((i) => data.get(`size${i}`).trim());
    while (sizes.length && !sizes.at(-1)) sizes.pop();
    await updateCategory(ctx, category.id, (current) => {
      current.groups[groupIndex].sizes = sizes;
      return current;
    });
    await openMenuEditor(root, ctx);
    return null;
  });
}

function row(root, ctx, category, group, groupIndex, item) {
  const apply = (change, message) => attempt(async () => {
    await updateCategory(ctx, category.id, (current) => changeItem(current, { id: item.id, ...change }));
    await openMenuEditor(root, ctx);
  }, message);

  return h('li', { class: item.soldOut ? 'row is-out' : 'row' },
    thumbnail(ctx, item.image),
    h('div', { class: 'row-main' },
      h('strong', null, item.name),
      h('span', null, item.prices.map((p, i) => {
        const size = sizeLabel(group, item, i);
        return `${size ? `${size}: ` : ''}${money(p)}`;
      }).join('، ')),
      h('span', { class: 'flags' },
        item.featured ? h('span', { class: 'pill' }, 'مميز') : null,
        item.confirm ? h('span', { class: 'pill pill-warn' }, 'اسأل عن السعر') : null)),
    h('div', { class: 'row-actions' },
      h('button', {
        type: 'button', class: 'btn btn-plain', 'aria-pressed': String(item.soldOut),
        onclick: () => apply({ patch: { soldOut: !item.soldOut } }, item.soldOut ? 'رجع متاح' : 'اتعلّم خلصان'),
      }, item.soldOut ? 'خلصان ✓' : 'خلصان'),
      h('button', { type: 'button', class: 'btn btn-plain', onclick: () => editItem(root, ctx, category, group, groupIndex, item) }, 'تعديل'),
      h('button', {
        type: 'button',
        class: 'btn btn-danger',
        onclick: async () => {
          if (!await ask(`تمسح «${item.name}» من المنيو؟`, 'امسح')) return;
          if (await apply({ remove: true }, 'اتمسح')) await deleteImage(ctx, item.image);
        },
      }, 'حذف')));
}

export async function openMenuEditor(root, ctx) {
  const { fs, db } = ctx;
  if (!root.childElementCount) root.replaceChildren(h('p', { class: 'empty' }, 'بنحمّل المنيو…'));

  let categories;
  try {
    const snapshot = await fs.getDocs(fs.collection(db, 'menu'));
    categories = snapshot.docs.map((d) => ({ ...d.data(), id: d.id })).sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error(error);
    root.replaceChildren(h('p', { class: 'empty' }, 'ماقدرناش نحمّل المنيو. جرب تاني.'));
    return;
  }

  if (!categories.length) {
    root.replaceChildren(
      h('h2', null, 'المنيو'),
      h('p', null, 'المنيو لسه مش مرفوع. ارفع المنيو الأساسي (المنقول من المدونة) وبعدها عدّل عليه من هنا.'),
      h('button', {
        type: 'button',
        class: 'btn',
        onclick: async (event) => {
          event.currentTarget.disabled = true;
          await attempt(() => uploadSeed(ctx), 'المنيو اترفع');
          await openMenuEditor(root, ctx);
        },
      }, 'ارفع المنيو الأساسي'));
    return;
  }

  const category = categories.find((c) => c.id === activeId) || categories[0];
  activeId = category.id;
  const scroll = window.scrollY;

  root.replaceChildren(
    h('div', { class: 'bar' },
      h('h2', null, 'المنيو'),
      h('label', null, 'القسم ',
        h('select', {
          onchange: (event) => { activeId = event.target.value; openMenuEditor(root, ctx); },
        }, categories.map((c) => h('option', { value: c.id, selected: c.id === activeId }, c.name))))),
    ...category.groups.map((group, groupIndex) => h('div', { class: 'group' },
      h('div', { class: 'bar' },
        h('h3', null, group.name),
        h('div', null,
          h('button', { type: 'button', class: 'btn btn-plain', onclick: () => editSizes(root, ctx, category, group, groupIndex) }, 'أسماء الأحجام'),
          ' ',
          h('button', { type: 'button', class: 'btn', onclick: () => editItem(root, ctx, category, group, groupIndex, null) }, 'إضافة صنف'))),
      h('ul', { class: 'rows' }, group.items.map((item) => row(root, ctx, category, group, groupIndex, item))))));
  window.scrollTo(0, scroll);
}
