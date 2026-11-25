// أجزاء مشتركة بين الصفحة الرئيسية وصفحة الطلب
import { $, $$, h } from './dom.js';
import { loadImage } from './store.js';
import { safeImage } from './content.js';
import { reconcileCart } from './cart.js';

const CART_KEY = 'sham:cart';

export function picture(src, attrs = {}) {
  if (!src) return null;
  const img = h('img', { alt: '', loading: 'lazy', ...attrs });
  if (src.startsWith('img:')) {
    // صورة اترفعت من الداشبورد
    loadImage(src.slice(4)).then((data) => {
      if (safeImage(data)) img.src = data;
      else img.remove();
    });
  } else {
    img.src = src;
  }
  return img;
}

export function readCart(content) {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { /* سلة تالفة أو التخزين مقفول */ }
  return reconcileCart(saved, content.menu, content.offers);
}

export function writeCart(cart) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* التخزين مقفول */ }
}

let toastTimer;
export function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

export function applySettings({ phones, address, hours, closed, closedMessage }) {
  $$('[data-address]').forEach((el) => { el.textContent = address; });
  $$('[data-hours]').forEach((el) => { el.textContent = hours; });
  $$('[data-delivery-phones]').forEach((el) => el.replaceChildren(...phones.delivery.map((phone) =>
    h('li', null, h('a', { href: `tel:${phone}` }, phone)))));
  $$('[data-complaints]').forEach((el) => {
    el.textContent = phones.complaints;
    el.href = `tel:${phones.complaints}`;
  });
  $$('[data-closed]').forEach((el) => {
    el.hidden = !closed;
    el.textContent = closedMessage;
  });
}
