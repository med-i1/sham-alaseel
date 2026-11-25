import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sizeLabel, searchMenu, featuredItems } from '../public/assets/js/menu.js';

test('صنف بسعر واحد من غير اسم حجم', () => {
  assert.equal(sizeLabel({ sizes: ['وسط', 'كبير'] }, { prices: [50] }, 0), '');
});

test('اسم الحجم من المجموعة، ولو مش موجود حجم 1 و 2', () => {
  assert.equal(sizeLabel({ sizes: ['سوري', 'فرنساوي'] }, { prices: [1, 2] }, 1), 'فرنساوي');
  assert.equal(sizeLabel({ sizes: [] }, { prices: [1, 2] }, 1), 'حجم 2');
});

const menu = [{
  id: 'c', name: 'المشويات', order: 1, image: 'x', groups: [
    { name: 'كفتة', sizes: [], items: [{ id: '1', name: 'كفتة ضانى', prices: [225] }] },
    { name: 'فراخ', sizes: [], items: [{ id: '2', name: 'فرخه شيش', prices: [450], featured: true, desc: 'على الفحم' }] },
  ],
}];

test('البحث بيتجاهل الهمزات والتاء المربوطة والألف المقصورة', () => {
  for (const q of ['كفته ضاني', 'فرخة', 'علي الفحم']) {
    assert.equal(searchMenu(menu, q).length, 1, q);
  }
});

test('البحث بيشيل المجموعات والأقسام الفاضية', () => {
  assert.deepEqual(searchMenu(menu, 'ضاني')[0].groups.map((g) => g.name), ['كفتة']);
  assert.deepEqual(searchMenu(menu, 'سوشي'), []);
});

test('بحث فاضي بيرجع المنيو كله', () => {
  assert.equal(searchMenu(menu, '  '), menu);
});

test('الأصناف المميزة', () => {
  assert.deepEqual(featuredItems(menu).map((f) => f.item.id), ['2']);
});
