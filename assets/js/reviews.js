// تقييمات الزباين: فحص وملخص (من غير DOM ولا Firebase)
// نفس الحدود موجودة في firestore.rules
const cut = (value, max) => String(value ?? '').trim().slice(0, max);
const validStars = (n) => Number.isInteger(n) && n >= 1 && n <= 5;

export function buildReview({ itemId, itemName, stars, name, comment }) {
  const count = Number(stars);
  if (!validStars(count)) return { error: 'اختار عدد النجوم' };
  if (cut(name, 40).length < 2) return { error: 'اكتب اسمك' };
  return {
    value: {
      itemId: cut(itemId, 60),
      itemName: cut(itemName, 100),
      stars: count,
      name: cut(name, 40),
      comment: cut(comment, 300),
      approved: false,
    },
  };
}

export function summarize(reviews) {
  const stars = reviews.map((r) => r.stars).filter(validStars);
  if (!stars.length) return { count: 0, average: 0 };
  const average = stars.reduce((sum, n) => sum + n, 0) / stars.length;
  return { count: stars.length, average: Math.round(average * 10) / 10 };
}
