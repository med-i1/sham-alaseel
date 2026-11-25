// صفحة الطلب: السلة وبيانات الزبون والإرسال على الواتساب
import { $, $$, h, money } from './dom.js';
import { cachedContent, freshContent, saveOrder, recordsOrders } from './store.js';
import {
  setQty, cartTotal, lineKey, lineImage, validateCustomer, buildMessage, buildOrder, whatsappUrl,
} from './cart.js';
import { picture, readCart, writeCart, toast, applySettings } from './shared.js';
import { reveal, bump } from './motion.js';

let content = cachedContent();
let cart = [];
let lastSaved = '';

const form = $('#order-form');
const customer = () => Object.fromEntries(new FormData(form));

function setCart(next) {
  cart = next;
  writeCart(cart);
  $('#sent').hidden = true;
  render();
  bump($('[data-cart-total]'));
}

function stepper(line) {
  const key = lineKey(line);
  const button = (label, qty, action, aria) => h('button', {
    type: 'button',
    'data-key': key,
    'data-action': action,
    'aria-label': aria,
    onclick: () => {
      setCart(setQty(cart, key, qty));
      // نرجع التركيز لنفس الزرار بعد إعادة الرسم
      $(`[data-key="${CSS.escape(key)}"][data-action="${action}"]`)?.focus();
    },
  }, label);
  return h('div', { class: 'stepper' },
    button('−', line.qty - 1, 'less', `نقّص ${line.name}`),
    h('output', null, String(line.qty)),
    button('+', line.qty + 1, 'more', `زوّد ${line.name}`));
}

function render() {
  $('#cart-empty').hidden = Boolean(cart.length);
  $('#checkout').hidden = !cart.length;
  $$('[data-cart-total]').forEach((el) => { el.textContent = money(cartTotal(cart)); });
  $('#cart-lines').replaceChildren(...cart.map((line) =>
    h('li', { class: 'line' },
      picture(lineImage(line, content.menu, content.offers), { width: 72, height: 72, class: 'line-thumb' }),
      h('span', { class: 'line-name' }, line.name, line.size && h('small', null, line.size)),
      h('span', { class: 'line-total' }, money(line.price * line.qty)),
      stepper(line),
      h('button', {
        type: 'button',
        class: 'link-btn line-remove',
        'aria-label': `شيل ${line.name} من الطلب`,
        onclick: () => setCart(setQty(cart, lineKey(line), 0)),
      }, 'شيل'))));
}

function refresh() {
  applySettings(content.settings);
  $('#send').disabled = content.settings.closed;
  const { cart: next, changed } = readCart(content);
  cart = next;
  if (changed) writeCart(cart);
  render();
  return changed && Boolean(next.length);
}

function toggleDelivery() {
  const delivery = customer().type === 'delivery';
  $$('[data-delivery-only]').forEach((el) => { el.hidden = !delivery; });
}

function showErrors(errors) {
  for (const el of $$('[data-error]', form)) {
    const name = el.dataset.error;
    el.textContent = errors[name] || '';
    form.elements[name].setAttribute('aria-invalid', String(Boolean(errors[name])));
  }
}

function send(event) {
  event.preventDefault();
  if (!cart.length || content.settings.closed) return;
  const data = customer();
  const errors = validateCustomer(data);
  showErrors(errors);
  const first = Object.keys(errors)[0];
  if (first) {
    form.elements[first].focus();
    return;
  }

  // الواتساب لازم يتفتح في نفس لحظة الضغطة علشان المتصفح مايمنعوش
  const url = whatsappUrl(content.settings.whatsapp, buildMessage(cart, data));
  window.open(url, '_blank', 'noopener');
  $('#sent-link').href = url;
  $('#sent').hidden = false;
  $('#sent').scrollIntoView({ block: 'nearest' });

  // التسجيل في الخلفية، ونفس الطلب مايتسجلش مرتين
  const order = buildOrder(cart, data);
  const signature = JSON.stringify(order);
  if (signature !== lastSaved) {
    lastSaved = signature;
    saveOrder(order).then((saved) => { if (!saved) lastSaved = ''; });
  }
}

form.addEventListener('submit', send);
form.addEventListener('change', (event) => { if (event.target.name === 'type') toggleDelivery(); });
$('#clear-cart').addEventListener('click', () => {
  lastSaved = '';
  form.reset();
  toggleDelivery();
  $('#empty-text').textContent = 'تمام، فضّينا السلة. لو بعت الرسالة هنتواصل معاك.';
  setCart([]);
  window.scrollTo(0, 0);
});
window.addEventListener('storage', refresh);
window.addEventListener('pageshow', refresh);

$$('[data-recording]').forEach((el) => { el.hidden = !recordsOrders; });
refresh();
reveal($$('.line'));

freshContent().then((fresh) => {
  if (!fresh) return;
  content = fresh;
  if (refresh()) toast('حدّثنا طلبك حسب المنيو الحالي');
});
