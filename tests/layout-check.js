// فحص تداخل النص. بيتشغل في كونسول المتصفح (مش مع npm test):
// بيرجع أي نصين راكبين على بعض، أو نص خارج الشاشة، أو نص أوسع من مكانه.
(() => {
  const skip = '.sr-only, .skip, .more, .toast, .fly, .hero-circle, noscript, iframe, script, style, [hidden], dialog:not([open])';
  // النص نفسه (سطر سطر) مش صندوق العنصر
  const boxes = [];
  const stickyGroup = (el) => el.closest('.nav, .tabs, .cart-bar, .product-close')?.className || '';
  const clipped = (el, r) => {
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.overflowY !== 'hidden' && style.overflowY !== 'clip') continue;
      const box = node.getBoundingClientRect();
      if (r.top > box.bottom - r.height / 2) return true;
    }
    return false;
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const el = node.parentElement;
    if (!node.textContent.trim() || !el || el.closest(skip) || el.closest('option, select')) continue;
    if (document.querySelector('dialog[open]') && !el.closest('dialog[open]')) continue;
    if (getComputedStyle(el).visibility === 'hidden') continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const r of range.getClientRects()) {
      if (r.width > 1 && r.height > 1 && !clipped(el, r)) boxes.push({ el, text: node.textContent.trim().slice(0, 30), r, sticky: stickyGroup(el) });
    }
  }
  const controls = [...document.querySelectorAll('button, a.btn, input, textarea, img')]
    .filter((el) => !el.closest(skip) && (!document.querySelector('dialog[open]') || el.closest('dialog[open]')))
    .map((el) => ({ el, r: el.getBoundingClientRect(), sticky: stickyGroup(el) }))
    .filter((c) => c.r.width > 1 && c.r.height > 1);

  // هامش رأسي: صناديق سطور الخط العربي أطول من الحروف نفسها
  const hit = (a, b, pad) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - pad && b.top < a.bottom - pad;
  const problems = [];
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    for (let j = i + 1; j < boxes.length; j++) {
      const b = boxes[j];
      if (a.el === b.el || a.sticky !== b.sticky) continue;
      if (hit(a.r, b.r, Math.min(a.r.height, b.r.height) * 0.25)) problems.push(`نص فوق نص: "${a.text}" × "${b.text}"`);
    }
    for (const c of controls) {
      if (c.sticky !== a.sticky || c.el.contains(a.el) || a.el.contains(c.el)) continue;
      // عناصر مقصودة فوق صورة
      if (c.el.tagName === 'IMG' && c.el.closest('label')?.contains(a.el)) continue;
      if (hit(a.r, c.r, 3)) problems.push(`نص فوق عنصر: "${a.text}" × ${c.el.tagName}.${c.el.className}`);
    }
    const width = document.documentElement.clientWidth;
    if ((a.r.right > width + 1 || a.r.left < -1) && !a.el.closest('.tabs')) problems.push(`نص خارج الشاشة: "${a.text}"`);
  }
  for (const el of document.querySelectorAll('button, .btn, h1, h2, h3, h4, h5, .price, .tag, .line-name, label')) {
    if (el.closest(skip) || !el.clientWidth) continue;
    if (el.scrollWidth > el.clientWidth + 2) problems.push(`نص أوسع من مكانه: "${el.textContent.trim().slice(0, 30)}"`);
  }
  return {
    width: innerWidth,
    pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    texts: boxes.length,
    problems: [...new Set(problems)].slice(0, 25),
    total: new Set(problems).size,
  };
})()
