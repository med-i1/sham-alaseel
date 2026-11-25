import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { demoPage } from '../scripts/build-demo.mjs';

const base = 'https://someone.github.io/sham-alaseel/';
const read = (name) => readFileSync(new URL(`../public/${name}`, import.meta.url), 'utf8');
const count = (text, part) => text.split(part).length - 1;

test('كل صفحة في النسخة التجريبية مخفية من محركات البحث مرة واحدة', () => {
  for (const name of ['index.html', 'order.html', 'credits.html', '404.html']) {
    assert.equal(count(demoPage(name, read(name), base), 'name="robots"'), 1, name);
    assert.ok(demoPage(name, read(name), base).includes('noindex'), name);
  }
});

test('شريط النسخة التجريبية بيحذر إن الطلب بيروح للمطعم الحقيقي', () => {
  for (const name of ['index.html', 'order.html']) {
    const page = demoPage(name, read(name), base);
    assert.equal(count(page, 'class="demo-strip"'), 1, name);
    assert.ok(page.includes('واتساب المطعم الحقيقي'), name);
  }
});

test('صورة المشاركة برابط كامل علشان تظهر لما اللينك يتبعت', () => {
  const page = demoPage('index.html', read('index.html'), base);
  assert.ok(page.includes(`<meta property="og:image" content="${base}assets/img/og.jpg">`));
});

test('رابط الرجوع في صفحة 404 بيروح لمسار الموقع', () => {
  assert.ok(demoPage('404.html', read('404.html'), base).includes('href="/sham-alaseel/"'));
});

test('مفيش مسارات بتبدأ من جذر الدومين في لوحة التحكم', () => {
  const html = read('manage-bwn6gq3v/index.html');
  assert.ok(!/(href|src)="\//.test(html), 'مسار بيبدأ بـ /');
});
