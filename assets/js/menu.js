// دوال المنيو (من غير DOM ولا Firebase)

export function sizeLabel(group, item, index) {
  if (item.prices.length < 2) return '';
  return group.sizes?.[index] || `حجم ${index + 1}`;
}

export function normalizeArabic(text) {
  return String(text || '')
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim()
    .toLowerCase();
}

export function searchMenu(menu, query) {
  const q = normalizeArabic(query);
  if (!q) return menu;
  return menu
    .map((category) => ({
      ...category,
      groups: category.groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            normalizeArabic(`${item.name} ${item.desc || ''} ${group.name}`).includes(q)),
        }))
        .filter((group) => group.items.length),
    }))
    .filter((category) => category.groups.length);
}

export function* eachItem(menu) {
  for (const category of menu) {
    for (const group of category.groups) {
      for (const item of group.items) yield { category, group, item };
    }
  }
}

export function featuredItems(menu) {
  return [...eachItem(menu)].filter(({ item }) => item.featured);
}

export function findItem(menu, id) {
  for (const entry of eachItem(menu)) {
    if (entry.item.id === id) return entry;
  }
  return null;
}
