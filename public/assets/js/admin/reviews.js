// تبويب التقييمات: موافقة / إخفاء / مسح. كلام الزبون بيتعرض كنص بس ومايتعدلش.
import { $, h } from '../dom.js';
import { ask, attempt } from './ui.js';

const when = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// عدد التقييمات المستنية على اسم التبويب
export function watchPendingReviews(ctx) {
  const { fs, db } = ctx;
  const query = fs.query(fs.collection(db, 'reviews'), fs.where('approved', '==', false));
  return fs.onSnapshot(query, (snapshot) => {
    const badge = $('#review-count');
    badge.textContent = snapshot.size;
    badge.hidden = !snapshot.size;
  }, (error) => console.error(error));
}

export async function openReviews(root, ctx) {
  const { fs, db } = ctx;
  let reviews;
  try {
    const snapshot = await fs.getDocs(fs.query(fs.collection(db, 'reviews'), fs.orderBy('createdAt', 'desc'), fs.limit(200)));
    reviews = snapshot.docs.map((d) => ({ ...d.data(), id: d.id, createdAt: d.data().createdAt?.toMillis?.() ?? 0 }));
  } catch (error) {
    console.error(error);
    root.replaceChildren(h('p', { class: 'empty' }, 'ماقدرناش نحمّل التقييمات. جرب تاني.'));
    return;
  }
  // المستني الأول
  reviews.sort((a, b) => Number(a.approved) - Number(b.approved));

  const refresh = (work, message) => attempt(async () => {
    await work();
    await openReviews(root, ctx);
  }, message);

  root.replaceChildren(
    h('div', { class: 'bar' }, h('h2', null, 'التقييمات')),
    h('p', { class: 'hint' }, 'التقييم مايظهرش في الموقع غير لما توافق عليه. آخر 200 تقييم.'),
    reviews.length ? h('ul', { class: 'rows' }, reviews.map((review) => h('li', { class: 'row' },
      h('div', { class: 'row-main' },
        h('strong', null, `${review.name}، ${review.stars} من 5`),
        h('span', null, String(review.itemName)),
        review.comment ? h('span', { class: 'notes' }, String(review.comment)) : null,
        h('span', { class: 'flags' },
          h('span', { class: review.approved ? 'pill' : 'pill pill-warn' }, review.approved ? 'ظاهر' : 'مستني'),
          h('span', { class: 'hint' }, review.createdAt ? when.format(review.createdAt) : ''))),
      h('div', { class: 'row-actions' },
        h('button', {
          type: 'button',
          class: review.approved ? 'btn btn-plain' : 'btn',
          onclick: () => refresh(
            () => fs.updateDoc(fs.doc(db, 'reviews', review.id), { approved: !review.approved }),
            review.approved ? 'التقييم اتخفى' : 'التقييم ظهر',
          ),
        }, review.approved ? 'إخفاء' : 'وافق'),
        h('button', {
          type: 'button',
          class: 'btn btn-danger',
          onclick: async () => {
            if (await ask(`تمسح تقييم «${review.name}» نهائياً؟`, 'امسح')) {
              await refresh(() => fs.deleteDoc(fs.doc(db, 'reviews', review.id)), 'التقييم اتمسح');
            }
          },
        }, 'حذف')))))
      : h('p', { class: 'empty' }, 'مفيش تقييمات لسه.'));
}
