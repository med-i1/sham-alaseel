import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReview, summarize } from '../public/assets/js/reviews.js';

const input = { itemId: 'crepe-1', itemName: 'كريب بطاطس', stars: '4', name: ' منى ', comment: ' حلو ' };

test('التقييم السليم بيتنضف ويتسجل مستني الموافقة', () => {
  assert.deepEqual(buildReview(input), {
    value: { itemId: 'crepe-1', itemName: 'كريب بطاطس', stars: 4, name: 'منى', comment: 'حلو', approved: false },
  });
});

test('التعليق اختياري', () => {
  assert.equal(buildReview({ ...input, comment: '' }).value.comment, '');
});

test('من غير نجوم أو اسم مرفوض', () => {
  for (const stars of ['', '0', '6', '2.5', undefined]) assert.ok(buildReview({ ...input, stars }).error, String(stars));
  assert.ok(buildReview({ ...input, name: ' ' }).error);
});

test('الأطوال ليها حد', () => {
  const { value } = buildReview({ ...input, name: 'ا'.repeat(99), comment: 'ب'.repeat(999), itemName: 'ج'.repeat(200) });
  assert.equal(value.name.length, 40);
  assert.equal(value.comment.length, 300);
  assert.equal(value.itemName.length, 100);
});

test('المتوسط والعدد', () => {
  assert.deepEqual(summarize([{ stars: 5 }, { stars: 4 }, { stars: 4 }]), { count: 3, average: 4.3 });
  assert.deepEqual(summarize([]), { count: 0, average: 0 });
  assert.deepEqual(summarize([{ stars: 'x' }, { stars: 9 }, { stars: 2 }]), { count: 1, average: 2 });
});
