// صفحة حقوق الصور: بتقرأ assets/img/credits.json
import { $, h } from './dom.js';

const link = (url, text) => (String(url).startsWith('https://')
  ? h('a', { href: url, target: '_blank', rel: 'noopener' }, text)
  : text);

fetch('assets/img/credits.json')
  .then((response) => response.json())
  .then((credits) => {
    $('#credits-list').replaceChildren(...credits.map((c) => h('li', null,
      h('img', { src: `assets/img/${c.file}`, alt: '', loading: 'lazy', width: 64, height: 64 }),
      h('span', null,
        link(c.source, c.title), ' — ', c.author, '، ',
        link(c.licenseUrl, c.license)))));
  })
  .catch(() => {
    $('#credits-list').replaceChildren(h('li', null, 'ماقدرناش نحمّل القائمة. حدّث الصفحة.'));
  });
