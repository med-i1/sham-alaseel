// الصفحة الرئيسية: المنيو والعروض وتفاصيل المنتج. إتمام الطلب في order.html
import { $, $$, h, money } from './dom.js';
import { cachedContent, freshContent } from './store.js';
import { sizeLabel, searchMenu, featuredItems, findItem } from './menu.js';
import { addItem, cartTotal, cartCount, offerLine } from './cart.js';
import { picture, readCart, writeCart, toast, applySettings } from './shared.js';
import { openProduct } from './product.js';
import { reveal, flyToCart, bump } from './motion.js';

let content = cachedContent();
let cart = [];
let activeCategory = null;

/* ---------- السلة ---------- */
function renderCartCount() {
  const count = cartCount(cart);
  $$('[data-cart-count]').forEach((el) => { el.textContent = count; });
  $$('[data-cart-total]').forEach((el) => { el.textContent = money(cartTotal(cart)); });
  $('.cart-badge').hidden = !count;
  $('.cart-bar').hidden = !count;
}

function add(line, qty = 1, sourceImage = null) {
  // السلة ممكن تكون اتغيرت من صفحة الطلب في تاب تاني
  cart = addItem(readCart(content).cart, line, qty);
  writeCart(cart);
  renderCartCount();
  toast(`اتضاف للطلب: ${line.name}`);
  flyToCart(sourceImage);
  bump($('.cart-badge'));
  bump($('.cart-bar'));
}

/* ---------- تفاصيل المنتج ---------- */
function showProduct(id) {
  const found = findItem(content.menu, id);
  if (!found) return;
  openProduct(found, { phone: content.settings.phones.delivery[0], onAdd: add });
}

/* ---------- المنيو ---------- */
function priceButtons(group, item) {
  if (item.soldOut) return h('div', { class: 'prices' }, h('span', { class: 'tag tag-out' }, 'خلصان'));
  if (item.confirm) {
    const phone = content.settings.phones.delivery[0];
    return h('div', { class: 'prices' }, h('a', { class: 'tag', href: `tel:${phone}` }, 'اسأل عن السعر'));
  }
  return h('div', { class: 'prices' }, item.prices.map((price, index) => {
    const size = sizeLabel(group, item, index);
    return h('button', {
      type: 'button',
      class: 'price',
      'aria-label': `أضف ${item.name} ${size} بسعر ${price} جنيه`,
      onclick: (event) => add(
        { id: item.id, name: item.name, size, price },
        1,
        event.currentTarget.closest('[data-open]')?.querySelector('img'),
      ),
    },
    size && h('small', null, size),
    h('b', null, money(price)),
    h('span', { class: 'plus', 'aria-hidden': 'true' }, '+'));
  }));
}

// اسم المنتج زرار علشان يتفتح بالكيبورد كمان، والكارت كله بيتفتح بالضغط
const title = (tag, item) => h(tag, null, h('button', { type: 'button', class: 'item-name' }, item.name));

function renderFeatured() {
  const cards = featuredItems(content.menu).slice(0, 6).map(({ category, group, item }) =>
    h('article', { class: 'card', 'data-open': item.id },
      h('div', { class: 'card-media' },
        picture(item.image || category.image, { width: 640, height: 440 }),
        h('span', { class: 'more' }, 'شوف التفاصيل')),
      h('div', { class: 'card-body' },
        title('h3', item),
        h('p', null, item.desc || category.name),
        priceButtons(group, item))));
  $('#featured').replaceChildren(...cards);
  reveal(cards);
}

function renderOffers() {
  const active = content.offers.filter((o) => o.active);
  $('#offers').hidden = !active.length;
  const cards = active.map((offer) => {
    const card = h('article', { class: 'offer' },
      picture(offer.image, { width: 640, height: 360 }),
      h('h3', null, offer.title),
      h('p', { class: 'offer-price' }, money(offer.price)),
      h('button', {
        type: 'button',
        onclick: () => add(offerLine(offer), 1, card.querySelector('img')),
      }, 'أضف العرض'));
    return card;
  });
  $('#offers-list').replaceChildren(...cards);
  reveal(cards);
}

function renderTabs(searching) {
  $('#tabs').replaceChildren(...content.menu.map((category) =>
    h('button', {
      type: 'button',
      class: 'tab',
      role: 'tab',
      'aria-selected': String(!searching && category.id === activeCategory),
      onclick: () => showCategory(category.id),
    }, category.name)));
}

function renderCategory(category) {
  return h('section', { class: 'category' },
    h('div', { class: 'category-head' },
      picture(category.image, { width: 84, height: 84 }),
      h('h3', null, category.name)),
    category.groups.map((group) => h('div', { class: 'group' },
      h('h4', null, group.name),
      h('ul', { class: 'items' }, group.items.map((item) =>
        h('li', { class: item.soldOut ? 'item sold-out' : 'item', 'data-open': item.id },
          h('div', { class: 'item-media' }, picture(item.image || category.image, { width: 96, height: 96 })),
          h('div', { class: 'item-main' },
            title('h5', item),
            item.desc && h('p', null, item.desc),
            priceButtons(group, item))))))));
}

function renderMenu() {
  const query = $('#search').value;
  const searching = Boolean(query.trim());
  if (!content.menu.some((c) => c.id === activeCategory)) activeCategory = content.menu[0]?.id;
  renderTabs(searching);
  const shown = searching
    ? searchMenu(content.menu, query)
    : content.menu.filter((c) => c.id === activeCategory);
  $('#menu-list').replaceChildren(...(shown.length
    ? shown.map(renderCategory)
    : [h('p', { class: 'no-results' }, 'مالقيناش صنف بالاسم ده. جرب كلمة تانية أو اختار قسم من فوق.')]));
  reveal($$('#menu-list .category-head, #menu-list .item'));
}

function showCategory(id) {
  activeCategory = id;
  $('#search').value = '';
  renderMenu();
  $('#tabs [aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const list = $('#menu-list');
  if (list.getBoundingClientRect().top < 0) list.scrollIntoView();
}

/* ---------- التشغيل ---------- */
function renderAll() {
  applySettings(content.settings);
  renderFeatured();
  renderOffers();
  renderMenu();
  renderCartCount();
}

function refreshCart() {
  const { cart: next, changed } = readCart(content);
  cart = next;
  if (changed) writeCart(cart);
  renderCartCount();
  return changed && Boolean(next.length);
}

function bind() {
  document.addEventListener('click', (event) => {
    const holder = event.target.closest('[data-open]');
    if (!holder || event.target.closest('.prices')) return;
    showProduct(holder.dataset.open);
  });
  const product = $('#product');
  product.addEventListener('click', (event) => { if (event.target === product) product.close(); });
  $('#search').addEventListener('input', renderMenu);
  $('[data-goto-category]').addEventListener('click', (event) => showCategory(event.currentTarget.dataset.gotoCategory));
  // الرجوع من صفحة الطلب أو التعديل في تاب تاني
  window.addEventListener('pageshow', refreshCart);
  window.addEventListener('storage', refreshCart);
  reveal($$('.about > *, .contact, .new-card'));
}

bind();
refreshCart();
renderAll();

freshContent().then((fresh) => {
  if (!fresh) return;
  content = fresh;
  if (refreshCart()) toast('حدّثنا طلبك حسب المنيو الحالي');
  renderAll();
});
