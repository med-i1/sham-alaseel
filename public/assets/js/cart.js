// حسابات السلة والطلب (من غير DOM ولا Firebase)
import { findItem, sizeLabel } from './menu.js';

// نفس الحدود موجودة في firestore.rules
export const LIMITS = { name: 60, address: 300, notes: 300, lines: 50, qty: 50 };

export const lineKey = (line) => `${line.id}|${line.size}`;

const clampQty = (qty) => Math.min(LIMITS.qty, Math.max(0, Math.floor(qty)));

export function addItem(cart, { id, name, size, price }, qty = 1) {
  const count = clampQty(qty);
  if (!count) return cart;
  const key = lineKey({ id, size });
  if (cart.some((l) => lineKey(l) === key)) {
    return cart.map((l) => (lineKey(l) === key ? { ...l, qty: clampQty(l.qty + count) } : l));
  }
  if (cart.length >= LIMITS.lines) return cart;
  return [...cart, { id, name, size, price, qty: count }];
}

export function lineImage(line, menu, offers) {
  if (line.id.startsWith('offer:')) return offers.find((o) => `offer:${o.id}` === line.id)?.image || '';
  const found = findItem(menu, line.id);
  return found ? found.item.image || found.category.image : '';
}

export function setQty(cart, key, qty) {
  return cart
    .map((l) => (lineKey(l) === key ? { ...l, qty: clampQty(qty) } : l))
    .filter((l) => l.qty > 0);
}

export const cartTotal = (cart) => cart.reduce((sum, l) => sum + l.price * l.qty, 0);
export const cartCount = (cart) => cart.reduce((sum, l) => sum + l.qty, 0);

export const offerLine = (offer) => ({ id: `offer:${offer.id}`, name: `عرض: ${offer.title}`, size: '', price: offer.price });

// السلة المحفوظة على جهاز الزبون ممكن تبقى قديمة: ناخد الاسم والسعر من المنيو والعروض الحالية
export function reconcileCart(saved, menu, offers = []) {
  if (!Array.isArray(saved)) return { cart: [], changed: true };
  const cart = [];
  for (const line of saved.slice(0, LIMITS.lines)) {
    if (!line || typeof line.id !== 'string' || !(clampQty(line.qty) > 0)) continue;
    if (line.id.startsWith('offer:')) {
      const offer = offers.find((o) => o.active && `offer:${o.id}` === line.id);
      if (offer) cart.push({ ...offerLine(offer), qty: clampQty(line.qty) });
      continue;
    }
    const found = findItem(menu, line.id);
    if (!found || found.item.soldOut || found.item.confirm) continue;
    const { group, item } = found;
    const index = item.prices.findIndex((_, i) => sizeLabel(group, item, i) === line.size);
    if (index === -1) continue;
    cart.push({ id: item.id, name: item.name, size: line.size, price: item.prices[index], qty: clampQty(line.qty) });
  }
  return { cart, changed: JSON.stringify(cart) !== JSON.stringify(saved) };
}

const latinDigits = (text) => String(text || '')
  .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));

export function normalizePhone(phone) {
  return latinDigits(phone).replace(/[\s\-()]/g, '').replace(/^(\+20|0020|20(?=1))/, '0');
}

export function validateCustomer({ type, name, phone, address }) {
  const errors = {};
  if (String(name || '').trim().length < 2) errors.name = 'اكتب اسمك';
  if (!/^01[0125]\d{8}$/.test(normalizePhone(phone))) errors.phone = 'اكتب رقم موبايل مصري من 11 رقم';
  if (type === 'delivery' && String(address || '').trim().length < 3) errors.address = 'اكتب العنوان';
  return errors;
}

function cleanCustomer(customer) {
  const type = customer.type === 'pickup' ? 'pickup' : 'delivery';
  const cut = (value, max) => String(value || '').trim().slice(0, max);
  return {
    type,
    name: cut(customer.name, LIMITS.name),
    phone: normalizePhone(customer.phone),
    address: type === 'delivery' ? cut(customer.address, LIMITS.address) : '',
    notes: cut(customer.notes, LIMITS.notes),
  };
}

export function buildMessage(cart, customer) {
  const c = cleanCustomer(customer);
  const delivery = c.type === 'delivery';
  return [
    'طلب جديد من موقع شام الأصيل',
    `النوع: ${delivery ? 'دليفري' : 'استلام من المطعم'}`,
    `الاسم: ${c.name}`,
    `الموبايل: ${c.phone}`,
    delivery && `العنوان: ${c.address}`,
    '---',
    ...cart.map((l) => `${l.qty} × ${l.name}${l.size ? ` (${l.size})` : ''} = ${l.price * l.qty} ج`),
    '---',
    `الإجمالي: ${cartTotal(cart)} ج${delivery ? ' (من غير مصاريف التوصيل)' : ''}`,
    c.notes && `ملاحظات: ${c.notes}`,
  ].filter(Boolean).join('\n');
}

export function buildOrder(cart, customer) {
  return {
    status: 'new',
    ...cleanCustomer(customer),
    lines: cart.map(({ id, name, size, price, qty }) => ({ id, name, size, price, qty })),
    total: cartTotal(cart),
  };
}

export function toWhatsAppNumber(number) {
  const local = normalizePhone(number);
  return local.startsWith('0') ? `2${local}` : local;
}

export function whatsappUrl(number, message) {
  return `https://wa.me/${toWhatsAppNumber(number)}?text=${encodeURIComponent(message)}`;
}
