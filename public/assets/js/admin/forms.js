// فحص مدخلات الداشبورد وتعديل القسم (من غير DOM ولا Firebase)
import { normalizePhone } from '../cart.js';

const trim = (value) => String(value ?? '').trim();

// أكواد الخطأ بتختلف حسب إعدادات المشروع والمحاكي
const WRONG_LOGIN = 'الإيميل أو الباسورد غلط';
const AUTH_ERRORS = {
  'auth/invalid-credential': WRONG_LOGIN,
  'auth/invalid-login-credentials': WRONG_LOGIN,
  'auth/wrong-password': WRONG_LOGIN,
  'auth/user-not-found': WRONG_LOGIN,
  'auth/invalid-email': 'الإيميل مش صحيح',
  'auth/too-many-requests': 'محاولات كتير، استنى شوية وجرب تاني',
  'auth/network-request-failed': 'مفيش اتصال بالنت',
};
export const authMessage = (code) => AUTH_ERRORS[code] || 'ماقدرناش ندخلك، جرب تاني';

export function parsePrice(value) {
  const digits = trim(value).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  if (!/^\d+$/.test(digits)) return null;
  const price = Number(digits);
  return price <= 1000000 ? price : null;
}

export function parseItem({ name, desc, prices, soldOut, featured, confirm }) {
  if (!trim(name)) return { error: 'اكتب اسم الصنف' };
  const filled = prices.map(trim);
  while (filled.length && !filled.at(-1)) filled.pop();
  if (!filled.length) return { error: 'اكتب سعر واحد على الأقل' };
  const parsed = filled.map(parsePrice);
  if (parsed.includes(null)) return { error: 'الأسعار أرقام صحيحة، ومن غير خانة فاضية في النص' };
  if (!confirm && parsed.includes(0)) return { error: 'السعر صفر مسموح بس مع «اسأل عن السعر»' };
  return {
    value: {
      name: trim(name),
      desc: trim(desc),
      prices: parsed,
      soldOut: Boolean(soldOut),
      featured: Boolean(featured),
      confirm: Boolean(confirm),
    },
  };
}

// تعديل / إضافة / حذف صنف في مستند القسم، بيرجع نسخة جديدة
export function changeItem(category, { id, patch, remove, add, groupIndex }) {
  const next = structuredClone(category);
  if (add) {
    const group = next.groups[groupIndex];
    if (!group) throw new Error('المجموعة مش موجودة');
    group.items.push(add);
    return next;
  }
  for (const group of next.groups) {
    const index = group.items.findIndex((item) => item.id === id);
    if (index === -1) continue;
    if (remove) group.items.splice(index, 1);
    else group.items[index] = { ...group.items[index], ...patch };
    return next;
  }
  throw new Error('الصنف ده مش موجود، يمكن اتمسح من جهاز تاني');
}

export function parseOffer({ title, price, active }) {
  if (!trim(title)) return { error: 'اكتب اسم العرض' };
  const parsed = parsePrice(price);
  if (!parsed) return { error: 'اكتب سعر العرض' };
  return { value: { title: trim(title), price: parsed, active: Boolean(active) } };
}

export function parseSettings({ delivery, complaints, whatsapp, address, hours, closed, closedMessage }) {
  const phone = (value) => {
    const normalized = normalizePhone(value);
    return /^\d{7,15}$/.test(normalized) ? normalized : null;
  };
  const numbers = String(delivery).split('\n').map(trim).filter(Boolean).map(phone);
  if (!numbers.length || numbers.includes(null)) return { error: 'اكتب أرقام الدليفري، رقم في كل سطر' };
  const complaintsNumber = phone(complaints);
  if (!complaintsNumber) return { error: 'رقم الشكاوى مش صحيح' };
  const wa = normalizePhone(whatsapp);
  if (!/^01[0125]\d{8}$/.test(wa)) return { error: 'رقم الواتساب لازم يكون موبايل مصري من 11 رقم' };
  if (!trim(address) || !trim(hours)) return { error: 'اكتب العنوان والمواعيد' };
  return {
    value: {
      phones: { delivery: numbers, complaints: complaintsNumber },
      whatsapp: wa,
      address: trim(address),
      hours: trim(hours),
      closed: Boolean(closed),
      closedMessage: trim(closedMessage),
    },
  };
}
