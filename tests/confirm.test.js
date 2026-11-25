import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ask } from '../public/assets/js/admin/ui.js';

// نافذة تأكيد وهمية. زي Chrome: حدث close ممكن يتأخر لحد أول رسم للشاشة.
function fakeConfirm() {
  const delayed = [];
  const closeListeners = [];
  const form = {};
  const dialog = {
    returnValue: '',
    showModal() {},
    querySelector: (s) => (s === 'form' ? form : null),
    addEventListener(type, fn) { if (type === 'close') closeListeners.push(fn); },
  };
  const elements = { '#confirm': dialog, '#confirm-text': {}, '#confirm-yes': {} };
  globalThis.document = { querySelector: (s) => elements[s] };
  return {
    // ضغطة على زرار: submit فوري، و close متأجل
    press(value) {
      form.onsubmit?.({ submitter: { value } });
      dialog.returnValue = value;
      delayed.push(() => closeListeners.splice(0).forEach((fn) => fn()));
    },
    escape() { dialog.oncancel?.(); },
    paint() { delayed.splice(0).forEach((fn) => fn()); },
  };
}

const settled = (promise) => Promise.race([promise, new Promise((r) => setImmediate(() => r('pending')))]);

test('رفض التأكيد بيفضل رفض حتى لو سؤال تاني اتوافق عليه قبل ما الشاشة تترسم', async () => {
  const ui = fakeConfirm();
  const first = ask('تمسح؟');
  ui.press('no');
  const second = ask('تمسح؟');
  ui.press('yes');
  ui.paint();
  assert.equal(await settled(first), false);
  assert.equal(await settled(second), true);
});

test('Esc معناها لأ', async () => {
  const ui = fakeConfirm();
  const answer = ask('تمسح؟');
  ui.escape();
  assert.equal(await settled(answer), false);
});
