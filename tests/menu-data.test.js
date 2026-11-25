import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { menu, settings, offers } from '../public/assets/js/seed.js';

const root = new URL('../public/', import.meta.url);
const fixture = readFileSync(new URL('./fixtures/blog-menu.txt', import.meta.url), 'utf8');

const BLOG_TITLE = {
  fried: 'فرايد تشيكن الجديد',
  pizza: 'بيتزا وفطير',
  shawarma: 'شاورما ووجبات',
  grills: 'المشويات',
  crepe: 'كريب الأصيل',
  western: 'الغربى',
  pasta: 'المكرونات',
  sweets: 'الحلو',
  extras: 'الإضافات',
};

const allItems = menu.flatMap((c) => c.groups.flatMap((g) => g.items.map((i) => ({ ...i, cat: c.id, group: g }))));

// الأرقام اللي مش أسعار: الكسور (1/4)، عدد القطع، وزن الكيلو، "2 كفتة"
function pricesInBlogSection(title) {
  const section = fixture.split('############ ').find((s) => s.startsWith(title));
  assert.ok(section, `قسم ناقص في ملف المدونة: ${title}`);
  const cleaned = section
    .replace(/\d+\/\d+/g, ' ')
    .replace(/[\d٠-٩]+\s*قطع(ه|ة)?/g, ' ')
    .replace(/1ك/g, ' ')
    .replace(/2 كفتة/g, ' ');
  return (cleaned.match(/\d+/g) || []).map(Number).sort((a, b) => a - b);
}

test('الأقسام التسعة موجودة بالترتيب', () => {
  assert.deepEqual(menu.map((c) => c.id), Object.keys(BLOG_TITLE));
  assert.deepEqual(menu.map((c) => c.order), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

for (const [id, title] of Object.entries(BLOG_TITLE)) {
  test(`أسعار قسم ${title} مطابقة للمدونة`, () => {
    const category = menu.find((c) => c.id === id);
    const ours = category.groups.flatMap((g) => g.items.flatMap((i) => i.prices)).sort((a, b) => a - b);
    assert.deepEqual(ours, pricesInBlogSection(title));
  });
}

test('المنيو فيه أكتر من 200 صنف', () => {
  assert.ok(allItems.length > 200, `العدد ${allItems.length}`);
});

test('كل صنف له رقم فريد واسم وأسعار أرقام صحيحة', () => {
  const ids = new Set();
  for (const item of allItems) {
    assert.ok(!ids.has(item.id), `رقم مكرر ${item.id}`);
    ids.add(item.id);
    assert.ok(item.name.trim(), `صنف من غير اسم ${item.id}`);
    assert.ok(item.prices.length >= 1 && item.prices.length <= 4, `${item.name}: ${item.prices}`);
    for (const p of item.prices) assert.ok(Number.isInteger(p) && p >= 0, `${item.name}: ${p}`);
    if (!item.confirm) assert.ok(item.prices.every((p) => p > 0), `${item.name}: سعر صفر من غير علامة تأكيد`);
    assert.equal(item.soldOut, false);
    assert.equal(typeof item.featured, 'boolean');
    assert.equal(typeof item.confirm, 'boolean');
  }
});

test('الأصناف المشكوك في سعرها متعلّمة للتأكيد', () => {
  const confirm = allItems.filter((i) => i.confirm).map((i) => i.name);
  for (const name of ['شاورما لحم', 'باكيت بطاطس', 'كلو سلو', 'باستا الأفرن سجق صوص أبيض', 'حواوشي', 'ميكس جريل الأصيل']) {
    assert.ok(confirm.includes(name), `${name} لازم يبقى للتأكيد`);
  }
  assert.equal(confirm.length, 6);
});

test('ست أصناف مميزة، كلها بصورة ومن غير علامة تأكيد', () => {
  const featured = allItems.filter((i) => i.featured);
  assert.equal(featured.length, 6);
  for (const i of featured) {
    assert.ok(i.image, `${i.name} من غير صورة`);
    assert.equal(i.confirm, false);
  }
});

test('كل صورة مذكورة موجودة فعلاً', () => {
  const images = [
    ...menu.map((c) => c.image),
    ...allItems.map((i) => i.image).filter(Boolean),
    ...offers.map((o) => o.image).filter(Boolean),
  ];
  for (const src of images) assert.ok(existsSync(new URL(src, root)), `صورة ناقصة ${src}`);
});

test('العروض التلاتة بأسعارها', () => {
  assert.deepEqual(offers.map((o) => o.price), [950, 700, 680]);
  assert.ok(offers.every((o) => o.active && o.id && o.title));
});

test('الإعدادات فيها أرقام التواصل الصح', () => {
  assert.deepEqual(settings.phones.delivery, ['01227788425', '01063767076', '01157879997']);
  assert.equal(settings.phones.complaints, '01090000345');
  assert.equal(settings.whatsapp, '01157879997');
  assert.equal(settings.closed, false);
  assert.ok(settings.address.includes('شارع الخمسين'));
});

test('كل صنف له صورة وشرح', () => {
  for (const item of allItems) {
    assert.ok(item.image, `${item.name} من غير صورة`);
    assert.ok(item.desc.trim().length > 5, `${item.name} من غير شرح`);
    assert.notEqual(item.desc.trim(), item.name);
    assert.ok(!/undefined|null|\$\{/.test(item.desc), `${item.name}: ${item.desc}`);
  }
});

test('الصورة مناسبة للصنف', () => {
  const imageOf = (name) => allItems.find((i) => i.name === name)?.image.replace(/^assets\/img\/|\.webp$/g, '');
  const expected = {
    'ربع كيلو كباب': 'stock-kebab',
    'كيلو كفتة ضاني': 'stock-kofta',
    'ربع كيلو ريش': 'stock-ribs',
    'صينية اللمة': 'stock-mixgrill',
    'ربع طاووق + ربع كفتة + ربع ريش': 'stock-mixgrill',
    'طاجن ورق عنب': 'stock-vineleaves',
    'طاجن عكاوي': 'stock-tagine',
    'فرد حمام مشوي': 'stock-pigeon',
    'بيتزا تونة': 'stock-pizza-tuna',
    'بيتزا فواكه البحر': 'stock-seafoodpizza',
    'صاروخ سجق': 'stock-sarouk',
    'كريب شيكولاتة': 'stock-sweetcrepe',
    'فطير بسبوسة وكنافة': 'stock-basbousa',
    'فطير كنافة': 'stock-kunafa',
    'باستا جمبري': 'stock-seafoodpasta',
    'برجر فراخ': 'stock-chickenburger',
    'برجر لحمة': 'stock-burger',
    'طبق تومية': 'toum',
    'عيش سوري': 'stock-bread',
    'أرز أبيض': 'stock-rice',
    'فتة شاورما لحمة': 'fatteh',
    'ماريا لحمة': 'maria',
  };
  for (const [name, image] of Object.entries(expected)) assert.equal(imageOf(name), image, name);
});

test('كل صورة من النت ليها مصدر ورخصة مسموحة', () => {
  const credits = JSON.parse(readFileSync(new URL('assets/img/credits.json', root), 'utf8'));
  const listed = new Set(credits.map((c) => c.file));
  const stock = [...menu.map((c) => c.image), ...allItems.map((i) => i.image), ...offers.map((o) => o.image)]
    .filter((src) => src.includes('/stock-'));
  assert.ok(stock.length > 0);
  for (const src of stock) assert.ok(listed.has(src.split('/').pop()), `صورة من غير مصدر: ${src}`);
  for (const credit of credits) {
    assert.ok(existsSync(new URL(`assets/img/${credit.file}`, root)), credit.file);
    assert.match(credit.license, /^(CC0|Public domain|CC BY(-SA)? \d\.\d)$/, credit.file);
    assert.ok(credit.author && credit.source.startsWith('https://'), credit.file);
  }
});
