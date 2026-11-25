// تنضيف البيانات الجاية من Firestore أو من الذاكرة المحفوظة (من غير DOM ولا Firebase)

const text = (value, fallback = '') => (typeof value === 'string' && value.trim() ? value : fallback);
const list = (value) => (Array.isArray(value) ? value : []);

export function safeImage(src) {
  if (typeof src !== 'string') return '';
  const allowed = /^assets\/img\/[\w-]+\.(webp|png|jpg)$/.test(src)
    || /^img:[\w-]+$/.test(src)
    || /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(src);
  return allowed ? src : '';
}

function cleanItem(item) {
  if (!item || !text(item.name) || !item.id) return null;
  const prices = list(item.prices);
  if (!prices.length || !prices.every((p) => Number.isFinite(p) && p >= 0)) return null;
  return {
    id: String(item.id),
    name: item.name,
    desc: text(item.desc),
    prices: [...prices],
    image: safeImage(item.image),
    soldOut: Boolean(item.soldOut),
    featured: Boolean(item.featured),
    confirm: Boolean(item.confirm),
  };
}

function cleanCategory(category) {
  return {
    id: String(category.id),
    name: text(category.name, String(category.id)),
    order: Number(category.order) || 0,
    image: safeImage(category.image),
    groups: list(category.groups).filter(Boolean).map((group) => ({
      name: text(group.name),
      sizes: list(group.sizes).map((size) => String(size)),
      items: list(group.items).map(cleanItem).filter(Boolean),
    })),
  };
}

export function normalizeContent(raw, fallback) {
  const categories = list(raw.menu).filter((c) => c && c.id);
  const settings = raw.settings || {};
  const base = fallback.settings;
  const delivery = list(settings.phones?.delivery).filter((p) => text(p));

  return {
    menu: categories.length ? categories.map(cleanCategory).sort((a, b) => a.order - b.order) : fallback.menu,
    offers: Array.isArray(raw.offers)
      ? raw.offers.filter((o) => o && text(o.title)).map((o) => ({
        id: String(o.id || o.title),
        title: o.title,
        price: Number(o.price) || 0,
        image: safeImage(o.image),
        active: Boolean(o.active),
      }))
      : fallback.offers,
    settings: {
      phones: {
        delivery: delivery.length ? delivery : base.phones.delivery,
        complaints: text(settings.phones?.complaints, base.phones.complaints),
      },
      whatsapp: text(settings.whatsapp, base.whatsapp),
      address: text(settings.address, base.address),
      hours: text(settings.hours, base.hours),
      closed: Boolean(settings.closed),
      closedMessage: text(settings.closedMessage, base.closedMessage),
    },
  };
}
