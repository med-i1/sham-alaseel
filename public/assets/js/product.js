// نافذة تفاصيل المنتج: صورة، شرح، اختيار الحجم والكمية، والطلب
import { $, h, money } from './dom.js';
import { sizeLabel } from './menu.js';
import { LIMITS } from './cart.js';
import { picture } from './shared.js';
import { mountReviews } from './review-box.js';

export function openProduct({ category, group, item }, { phone, onAdd }) {
  const dialog = $('#product');
  const src = item.image || category.image;
  let index = 0;
  let qty = 1;

  const total = h('span', null);
  const output = h('output', { 'aria-live': 'polite' }, '1');
  const update = () => {
    output.textContent = qty;
    total.textContent = money(item.prices[index] * qty);
  };

  const line = () => ({ id: item.id, name: item.name, size: sizeLabel(group, item, index), price: item.prices[index] });

  function actions() {
    if (item.soldOut) return h('p', { class: 'tag tag-out' }, 'خلصان دلوقتي');
    if (item.confirm) {
      return h('div', { class: 'product-ask' },
        h('p', null, 'سعر الصنف ده بيتأكد بالتليفون.'),
        h('a', { class: 'btn', href: `tel:${phone}` }, 'اسأل عن السعر'));
    }
    const sizes = item.prices.length > 1
      ? h('fieldset', { class: 'sizes' },
        h('legend', null, 'اختار الحجم'),
        item.prices.map((price, i) => {
          const radio = h('input', { type: 'radio', name: 'size', value: i, onchange: () => { index = i; update(); } });
          radio.checked = i === 0;
          return h('label', { class: 'size' }, radio, h('span', null, sizeLabel(group, item, i)), h('b', null, money(price)));
        }))
      : h('p', { class: 'single-price' }, money(item.prices[0]));

    const step = (delta) => () => {
      qty = Math.min(LIMITS.qty, Math.max(1, qty + delta));
      update();
    };
    const add = (then) => () => {
      onAdd(line(), qty, $('.product-media img', dialog));
      dialog.close();
      then?.();
    };

    return h('div', { class: 'product-order' },
      sizes,
      h('div', { class: 'product-qty' },
        h('span', null, 'الكمية'),
        h('div', { class: 'stepper' },
          h('button', { type: 'button', 'aria-label': 'نقّص الكمية', onclick: step(-1) }, '−'),
          output,
          h('button', { type: 'button', 'aria-label': 'زوّد الكمية', onclick: step(1) }, '+'))),
      h('button', { type: 'button', class: 'btn btn-wide', onclick: add() }, 'أضف للطلب، ', total),
      h('button', { type: 'button', class: 'btn btn-ghost btn-wide', onclick: add(() => { location.href = 'order.html'; }) }, 'اطلب دلوقتي'));
  }

  dialog.replaceChildren(
    h('button', { type: 'button', class: 'icon-btn product-close', 'aria-label': 'إغلاق', onclick: () => dialog.close() }, '✕'),
    h('div', { class: 'product-media' },
      picture(src, { loading: 'eager', width: 640, height: 480, alt: item.name })),
    h('div', { class: 'product-body' },
      h('p', { class: 'product-cat' }, category.name),
      h('h2', { id: 'product-title' }, item.name),
      item.desc ? h('p', { class: 'product-desc' }, item.desc) : null,
      actions(),
      h('div', { id: 'product-reviews' })));
  if (!item.soldOut && !item.confirm) update();
  dialog.showModal();
  dialog.scrollTop = 0;
  mountReviews($('#product-reviews'), item);
  return dialog;
}
