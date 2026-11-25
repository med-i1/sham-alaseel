// قسم التقييمات داخل نافذة المنتج. بيظهر بس لما Firebase يكون متظبط.
import { h } from './dom.js';
import { loadReviews, saveReview, recordsOrders } from './store.js';
import { buildReview, summarize } from './reviews.js';

const SENT_KEY = 'sham:reviewed';

const stars = (n) => h('span', { class: 'stars', role: 'img', 'aria-label': `${n} من 5` },
  '★'.repeat(Math.round(n)), h('span', { class: 'stars-off' }, '★'.repeat(5 - Math.round(n))));

function sentItems() {
  try { return JSON.parse(localStorage.getItem(SENT_KEY)) || []; } catch { return []; }
}

function reviewForm(item) {
  if (sentItems().includes(item.id)) {
    return h('p', { class: 'review-done' }, 'وصلنا تقييمك للصنف ده، شكراً.');
  }
  const error = h('p', { class: 'error', role: 'alert' });
  const send = h('button', { type: 'submit', class: 'btn btn-small' }, 'ابعت التقييم');
  const form = h('form', {
    class: 'review-form',
    novalidate: true,
    onsubmit: async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const { value, error: problem } = buildReview({ ...data, itemId: item.id, itemName: item.name });
      error.textContent = problem || '';
      if (problem) return;
      send.disabled = true;
      if (await saveReview(value)) {
        try { localStorage.setItem(SENT_KEY, JSON.stringify([...sentItems(), item.id])); } catch { /* التخزين مقفول */ }
        form.replaceWith(h('p', { class: 'review-done' }, 'وصلنا تقييمك، هيظهر بعد ما المطعم يراجعه.'));
      } else {
        error.textContent = 'ماقدرناش نبعت التقييم. تأكد من النت وجرب تاني.';
        send.disabled = false;
      }
    },
  },
  h('fieldset', { class: 'star-input' },
    h('legend', null, 'قيّم الصنف ده'),
    // من 5 لـ 1 علشان التلوين بالـ CSS
    [5, 4, 3, 2, 1].map((n) => [
      h('input', { type: 'radio', name: 'stars', value: n, id: `star-${n}` }),
      h('label', { for: `star-${n}`, title: `${n} من 5` }, '★', h('span', { class: 'sr-only' }, `${n} من 5`)),
    ])),
  h('label', { class: 'field' }, 'الاسم', h('input', { name: 'name', maxlength: 40, autocomplete: 'given-name' })),
  h('label', { class: 'field' }, 'رأيك (اختياري)', h('textarea', { name: 'comment', rows: 2, maxlength: 300 })),
  h('p', { class: 'hint' }, 'اسمك ورأيك هيظهروا للزباين بعد المراجعة.'),
  error,
  send);
  return form;
}

export async function mountReviews(container, item) {
  if (!recordsOrders) return;
  const list = h('div', { class: 'review-list' }, h('p', { class: 'hint' }, 'بنحمّل التقييمات…'));
  container.replaceChildren(h('section', { class: 'reviews' }, h('h3', null, 'التقييمات'), list, reviewForm(item)));

  const reviews = await loadReviews(item.id);
  if (!reviews) {
    list.replaceChildren(h('p', { class: 'hint' }, 'ماقدرناش نحمّل التقييمات دلوقتي.'));
    return;
  }
  const { count, average } = summarize(reviews);
  if (!count) {
    list.replaceChildren(h('p', { class: 'hint' }, 'لسه مفيش تقييمات للصنف ده.'));
    return;
  }
  list.replaceChildren(
    h('p', { class: 'review-summary' }, h('strong', null, String(average)), stars(average), h('span', null, `(${count})`)),
    h('ul', null, reviews.slice(0, 20).map((r) => h('li', null,
      h('div', null, h('strong', null, String(r.name)), stars(r.stars)),
      r.comment ? h('p', null, String(r.comment)) : null))));
}
