// أدوات مشتركة لشاشات الداشبورد
import { $, h } from '../dom.js';
import { safeImage } from '../content.js';

let toastTimer;
export function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

export function ask(question, yes = 'أيوه') {
  const dialog = $('#confirm');
  $('#confirm-text').textContent = question;
  $('#confirm-yes').textContent = yes;
  return new Promise((resolve) => {
    // بنعتمد على الضغطة نفسها مش على حدث close: المتصفح بيأجله لأول رسم للشاشة،
    // فكانت «لأ» القديمة تفضل مستنية وتتنفذ مع «أيوه» بتاعة السؤال اللي بعده
    dialog.querySelector('form').onsubmit = (event) => resolve(event.submitter?.value === 'yes');
    dialog.oncancel = () => resolve(false);
    dialog.showModal();
  });
}

// تنفيذ عملية على Firestore مع رسالة نجاح أو فشل
export async function attempt(work, success) {
  try {
    await work();
    if (success) toast(success);
    return true;
  } catch (error) {
    console.error(error);
    toast(error.code === 'permission-denied'
      ? 'مرفوض: الحساب ده مالوش صلاحية'
      : `ماتحفظش: ${error.message || 'تأكد من النت وجرب تاني'}`);
    return false;
  }
}

// نافذة تعديل: onSave بيرجع رسالة خطأ (تفضل مفتوحة) أو لا شيء (تقفل)
export function openEditor(title, fields, onSave) {
  const dialog = $('#editor');
  const error = h('p', { class: 'error', role: 'alert' });
  const save = h('button', { type: 'submit', class: 'btn' }, 'حفظ');
  const form = h('form', {
    novalidate: true,
    onsubmit: async (event) => {
      event.preventDefault();
      save.disabled = true;
      error.textContent = '';
      try {
        const problem = await onSave(form);
        if (problem) error.textContent = problem;
        else dialog.close();
      } catch (failure) {
        console.error(failure);
        error.textContent = `ماتحفظش: ${failure.message}`;
      }
      save.disabled = false;
    },
  },
  h('h2', null, title),
  fields,
  error,
  h('menu', null, save, h('button', { type: 'button', class: 'btn btn-plain', onclick: () => dialog.close() }, 'إلغاء')));
  dialog.replaceChildren(form);
  dialog.showModal();
}

export function field(label, attrs) {
  const { value = '', type = 'text', ...rest } = attrs;
  const control = type === 'textarea'
    ? h('textarea', { rows: 3, ...rest })
    : h('input', { type, ...rest });
  control.value = value;
  return h('label', { class: 'field' }, label, control);
}

export function checkbox(label, name, checked) {
  const input = h('input', { type: 'checkbox', name });
  input.checked = Boolean(checked);
  return h('label', { class: 'check' }, input, label);
}

// صورة من الأصول أو من images/{id}
export function thumbnail(ctx, src) {
  const safe = safeImage(src);
  if (!safe) return h('span', { class: 'thumb thumb-empty', 'aria-hidden': 'true' });
  const img = h('img', { class: 'thumb', alt: '' });
  if (safe.startsWith('img:')) {
    ctx.fs.getDoc(ctx.fs.doc(ctx.db, 'images', safe.slice(4))).then((snap) => {
      const data = safeImage(snap.data()?.data);
      if (data) img.src = data;
    }).catch(() => {});
  } else {
    img.src = safe.startsWith('data:') ? safe : `../${safe}`;
  }
  return img;
}

// تصغير الصورة على الجهاز لـ WebP أقل من 200KB قبل الرفع
const MAX_CHARS = 270000;

export async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  for (let side = 720; side >= 320; side -= 100) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.68, 0.54]) {
      let data = canvas.toDataURL('image/webp', quality);
      if (!data.startsWith('data:image/webp')) data = canvas.toDataURL('image/jpeg', quality);
      if (data.length <= MAX_CHARS) return data;
    }
  }
  throw new Error('الصورة كبيرة قوي، جرب صورة تانية');
}

export async function uploadImage(ctx, file) {
  const data = await compressImage(file);
  const ref = ctx.fs.doc(ctx.fs.collection(ctx.db, 'images'));
  await ctx.fs.setDoc(ref, { data });
  return `img:${ref.id}`;
}

export async function deleteImage(ctx, src) {
  if (!src?.startsWith('img:')) return;
  await ctx.fs.deleteDoc(ctx.fs.doc(ctx.db, 'images', src.slice(4))).catch(() => {});
}

// خانة اختيار صورة داخل نافذة التعديل. apply بيرجع مسار الصورة الجديد.
export function imageField(ctx, current) {
  const file = h('input', { type: 'file', accept: 'image/*' });
  const remove = h('input', { type: 'checkbox' });
  return {
    node: h('fieldset', { class: 'image-field' },
      h('legend', null, 'الصورة'),
      thumbnail(ctx, current),
      h('div', null, file, current ? h('label', { class: 'check' }, remove, 'شيل الصورة') : null)),
    async apply() {
      if (file.files[0]) return uploadImage(ctx, file.files[0]);
      return remove.checked ? '' : current || '';
    },
  };
}
