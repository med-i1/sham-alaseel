// بيبني النسخة التجريبية اللي بتترفع على GitHub Pages:
//   node scripts/build-demo.mjs <مجلد الإخراج> <رابط الموقع>
// بتنسخ public، وتخفي الصفحات من محركات البحث، وتضيف شريط «نسخة تجريبية».
// public نفسها مابتتغيرش علشان النسخة الحقيقية تفضل ظاهرة في جوجل.
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const STRIP = '<p class="demo-strip" style="margin:0;padding:6px 16px;background:#231A12;color:#fff;'
  + 'text-align:center;font:500 14px/1.6 Tajawal,Tahoma,sans-serif">'
  + 'نسخة تجريبية من الموقع. زرار الطلب بيبعت على واتساب المطعم الحقيقي.</p>';

export function demoPage(name, html, baseUrl) {
  let page = html;
  if (!page.includes('name="robots"')) {
    page = page.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex, nofollow">');
  }
  if (name === 'index.html' || name === 'order.html') {
    page = page.replace('<body>', `<body>\n${STRIP}`);
  }
  page = page.replace(
    '<meta property="og:image" content="assets/img/og.jpg">',
    `<meta property="og:image" content="${baseUrl}assets/img/og.jpg">`,
  );
  if (name === '404.html') page = page.replace('href="/"', `href="${new URL(baseUrl).pathname}"`);
  return page;
}

function build(out, baseUrl) {
  if (existsSync(out)) throw new Error(`المجلد موجود، اختار مجلد جديد: ${out}`);
  const source = fileURLToPath(new URL('../public', import.meta.url));
  cpSync(source, out, { recursive: true });
  for (const name of ['index.html', 'order.html', 'credits.html', '404.html']) {
    const file = join(out, name);
    writeFileSync(file, demoPage(name, readFileSync(file, 'utf8'), baseUrl));
  }
  // من غير الملف ده GitHub بيعالج الملفات بـ Jekyll
  writeFileSync(join(out, '.nojekyll'), '');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const [out, baseUrl] = process.argv.slice(2);
  if (!out || !/^https:\/\/.+\/$/.test(baseUrl || '')) {
    console.error('الاستخدام: node scripts/build-demo.mjs <مجلد> https://<user>.github.io/<repo>/');
    process.exit(1);
  }
  build(resolve(out), baseUrl);
  console.log(`النسخة التجريبية اتبنت في ${resolve(out)}`);
}
