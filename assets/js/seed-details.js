// صورة وشرح لكل صنف في المنيو الأساسي (من اسم الصنف وقسمه).
// الصور اللي بتبدأ بـ stock- من النت مش من مطبخ المطعم (المصادر في assets/img/credits.json).
// الشرح مبني على اسم الصنف، ويتراجع مع صاحب المطعم ويتعدل من الداشبورد.

// أول قاعدة تتطابق مع الاسم هي اللي بتتاخد
const IMAGE_RULES = {
  fried: [[/./, 'fried-chicken']],
  pizza: [
    [/فطير/, 'stock-hawawshi'],
    [/صاروخ/, 'stock-sarouk'],
    [/جمبري|فواكه البحر/, 'stock-seafoodpizza'],
    [/تونة/, 'stock-pizza-tuna'],
    [/مشروم/, 'stock-pizza-mushroom'],
    [/خضار|خضروات|مارجريتا/, 'stock-pizza-veg'],
    [/سجق|سوسيس/, 'pizza-sausage'],
    [/بيبروني/, 'pizza-pepperoni'],
    [/جبن|ريكفورد$|رومي/, 'pizza-cheese'],
    [/./, 'pizza-beef'],
  ],
  shawarma: [
    [/فتة/, 'fatteh'],
    [/أرز/, 'stock-rice'],
    [/إضافة موتزاريلا/, 'pizza-cheese'],
    [/ماريا/, 'maria'],
    [/^كايزر|كايزر$/, 'kaiser'],
    [/./, 'shawarma'],
  ],
  grills: [
    [/^صينية|ميكس|مشكل \(|\+.*\+|كيلو كفتة \+ فرخة/, 'stock-mixgrill'],
    [/ربع فرخة/, 'stock-chicken-grilled'],
    [/ورق عنب/, 'stock-vineleaves'],
    [/محاشي/, 'stock-mahshi'],
    [/طاجن/, 'stock-tagine'],
    [/شوربة/, 'stock-soup'],
    [/^أرز/, 'stock-rice'],
    [/^خضار/, 'stock-vegetables'],
    [/حمام/, 'stock-pigeon'],
    [/موزة/, 'stock-shank'],
    [/نيفا/, 'stock-roast'],
    [/ستيك/, 'stock-steak'],
    [/برجر/, 'stock-burger'],
    [/حواوشي/, 'stock-hawawshi'],
    [/شيش/, 'stock-tawook'],
    [/ريش/, 'stock-ribs'],
    [/كباب|طرب/, 'stock-kebab'],
    [/سجق/, 'stock-sausage'],
    [/كفتة/, 'stock-kofta'],
    [/./, 'grill'],
  ],
  crepe: [
    [/شاورما لحمة|فاهيتا لحمة/, 'crepe-shawarma'],
    [/شاورما فراخ|فاهيتا فراخ|شيش|مشكل فراخ|مكسيكانو/, 'crepe-chicken'],
    [/كرسبي|بانيه|استربس|زنجر|كرانشي/, 'crepe-crispy'],
    [/سوسيس|سجق|بسطرمة|برجر/, 'crepe-sausage'],
    [/./, 'crepe-mix'],
  ],
  western: [
    [/وجبة (شيش|مكسيكانو|فاهيتا)/, 'meal-shish'],
    [/وجبة/, 'meal-crispy'],
    [/برجر.*فراخ/, 'stock-chickenburger'],
    [/برجر/, 'stock-burger'],
    [/بطاطس/, 'fries'],
    [/شيش/, 'stock-tawook'],
    [/./, 'stock-sandwich'],
  ],
  pasta: [
    [/جمبري|سي فود/, 'stock-seafoodpasta'],
    [/./, 'pasta'],
  ],
  sweets: [
    [/^كريب/, 'stock-sweetcrepe'],
    [/لوتس/, 'sweet-lotus'],
    [/شيكولاتة/, 'sweet-chocolate'],
    [/بسبوسة/, 'stock-basbousa'],
    [/كنافة|بغاشة/, 'stock-kunafa'],
    [/مشلتت/, 'stock-meshaltet'],
    [/./, 'sweet-fruit'],
  ],
  extras: [
    [/تومية|رانش/, 'toum'],
    [/كلو سلو/, 'stock-coleslaw'],
    [/بطاطس/, 'fries'],
    [/طماطم/, 'stock-tomatoes'],
    [/مشروم/, 'stock-mushrooms'],
    [/موتزاريلا/, 'pizza-cheese'],
    [/جبنة/, 'stock-cheese'],
    [/باربكيو/, 'stock-bbq'],
    [/لحوم/, 'fatteh'],
    [/فراخ/, 'stock-chicken-grilled'],
    [/جمبري/, 'stock-shrimp'],
    [/عيش/, 'stock-bread'],
  ],
};

const rest = (name, prefix) => name.replace(prefix, '').trim();

function describeGrill(name) {
  if (/^صينية/.test(name)) return 'صينية مشويات مشكلة تكفي اللمة.';
  if (/\+|مشكل \(|ميكس/.test(name)) return `تشكيلة مشويات في طلب واحد: ${name}.`;
  if (/طاجن/.test(name)) return `${name} مطبوخ في الفخار ويوصلك سخن.`;
  if (/شوربة/.test(name)) return `${name} سخنة، تنفع جنب المشويات.`;
  if (/^أرز|^خضار|محاشي/.test(name)) return `${name} طبق جانبي جنب المشويات.`;
  if (/تسوية/.test(name)) return 'خدمة تسوية. اتأكد من التفاصيل بالتليفون قبل الطلب.';
  if (/حواوشي/.test(name)) return 'عيش محشي لحمة مفرومة متبلة، أحجام وأسعار مختلفة.';
  if (/سندوتش|ساندوتش/.test(name)) return 'ساندوتش شيش طاووق مشوي.';
  if (/موزة|نيفا/.test(name)) return `${name} من اللحم الضاني، طرية ومتبلة.`;
  return `${name}، مشوية على الفحم وتوصلك سخنة.`;
}

const DESCRIBERS = {
  fried: (name) => {
    if (/بروستد/.test(name)) return `${rest(name, 'وجبة بروستد')} فراخ بروستد، مقرمشة من برة وطرية من جوه.`;
    if (/مسحب/.test(name)) return `${rest(name, 'وجبة مسحب')} فراخ مسحب من غير عضم، مقلية ومقرمشة.`;
    const flavor = /رانش/.test(name) ? 'الرانش' : 'التشيلي الحارة';
    return `ساندوتش فرايد تشيكن مقرمش بنكهة ${flavor}. اختار ساندوتش لوحده أو كومبو.`;
  },
  pizza: (name) => {
    if (name.startsWith('بيتزا شرقي')) return `بيتزا على الطريقة الشرقي بحشو ${rest(name, 'بيتزا شرقي')}.`;
    if (name.startsWith('فطير')) return `فطير بحشو داخلي: ${rest(name, 'فطير')}.`;
    if (name.startsWith('صاروخ')) return `صاروخ: عجينة ملفوفة ومحشية ${rest(name, 'صاروخ')}.`;
    return `${name} من فرن الأصيل.`;
  },
  shawarma: (name, group) => {
    if (/أرز/.test(name)) return 'طبق أرز بسمتي.';
    if (/إضافة/.test(name)) return 'موتزاريلا زيادة على وجبة ماريا.';
    if (name.startsWith('فتة')) return `طبق ${name} على الطريقة السوري.`;
    if (name.startsWith('ماريا')) return `وجبة ${name} من الأصيل.`;
    if (name.startsWith('بوكس شاورما')) return `${name}، ومعاه بطاطس ومخلل وكلو سلو وعيش توست.`;
    if (group.startsWith('بوكسات كايزر')) return `بوكس ساندوتشات ${name}، يكفي اللمة.`;
    if (/كايزر/.test(name)) return `ساندوتش ${name} في عيش كايزر.`;
    return `ساندوتش ${name} على الطريقة السوري.`;
  },
  grills: describeGrill,
  crepe: (name) => `كريب سخن محشي ${rest(name, 'كريب')}.`,
  western: (name) => {
    if (name.startsWith('وجبة')) return `${name} كاملة من القسم الغربي.`;
    if (name.startsWith('برجر')) return `ساندوتش ${name} من القسم الغربي.`;
    return `${name}. اختار عيش سوري أو فرنساوي.`;
  },
  pasta: (name) => (/بانيه/.test(name) ? 'طبق مكرونة ومعاه قطعة بانيه.' : `طبق ${name} سخن من الفرن.`),
  sweets: (name) => {
    if (name.startsWith('كريب')) return `${name}، حلو بعد الأكل.`;
    return `${name.replace('فطير حلو سادة', 'فطير سادة')} من قسم الحلو، يتقدم سخن.`;
  },
  extras: (name) => (name.startsWith('إضافة') ? `${name} على طلبك.` : `${name} جنب طلبك.`),
};

export function imageFor(categoryId, name) {
  return IMAGE_RULES[categoryId]?.find(([pattern]) => pattern.test(name))?.[1] || '';
}

export function describe(categoryId, name, group) {
  return DESCRIBERS[categoryId]?.(name, group) || '';
}
