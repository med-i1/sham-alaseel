// حركات الموقع. كلها بتتلغي لو الجهاز مضبوط على «تقليل الحركة».
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

let observer;

// العناصر بتطلع واحدة ورا التانية أول ما تظهر على الشاشة
export function reveal(elements) {
  if (still() || !('IntersectionObserver' in window)) return;
  observer ??= new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((entry, i) => {
      const el = entry.target;
      observer.unobserve(el);
      const delay = Math.min(i, 8) * 70;
      const animation = el.animate(
        [{ opacity: 0, transform: 'translateY(28px) scale(.97)' }, { opacity: 1, transform: 'none' }],
        { duration: 520, delay, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' },
      );
      el.classList.remove('will-reveal');
      // المحتوى لازم يظهر حتى لو المتصفح موقف الحركة (تاب في الخلفية مثلاً)
      setTimeout(() => animation.finish(), delay + 800);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  for (const el of elements) {
    el.classList.add('will-reveal');
    observer.observe(el);
  }
}

// صورة المنتج بتطير للسلة
export function flyToCart(source) {
  const target = [...document.querySelectorAll('.cart-bar, .cart-btn')].find((el) => el.getClientRects().length);
  if (still() || !source?.src || !target) return;
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width) return;
  const size = Math.min(from.width, 120);
  const ghost = document.createElement('img');
  ghost.src = source.src;
  ghost.alt = '';
  ghost.className = 'fly';
  Object.assign(ghost.style, {
    width: `${size}px`,
    height: `${size}px`,
    left: `${from.left + from.width / 2 - size / 2}px`,
    top: `${from.top + from.height / 2 - size / 2}px`,
  });
  document.body.append(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  ghost.animate([
    { transform: 'none', opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 90}px) scale(.7) rotate(-12deg)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(.12) rotate(8deg)`, opacity: 0.4 },
  ], { duration: 750, easing: 'cubic-bezier(.4,0,.3,1)' }).finished.finally(() => ghost.remove());
}

export function bump(el) {
  if (!el) return;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}
