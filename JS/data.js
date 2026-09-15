/* ============================================================================
 * data.js — همه محتوای فروشگاه
 * ----------------------------------------------------------------------------
 * تنها فایلی که برای تغییر محصولات، دسته‌ها و متن‌های سایت لازم است ویرایش شود.
 * هیچ کدی در این فایل چیزی روی صفحه نمی‌کشد؛ فقط داده است.
 *
 * قیمت‌ها به تومان و بدون جداکننده نوشته می‌شوند؛ قالب‌بندی در utils.js انجام
 * می‌شود. برای جایگزینی عکس‌ها کافی است فایل‌های پوشه IMG را عوض کنید و نام
 * مسیر را همین‌جا به‌روز کنید.
 * ==========================================================================*/

const STORE = {
  name: 'آوینا',
  latin: 'AVINA',
  tagline: 'زیبایی، ساده و اصیل',
  phone: '۰۲۱ - ۹۱۰۰ ۲۲۴۴',
  email: 'hello@avina.example',
  address: 'تهران، خیابان ولیعصر، برج نگین، طبقه ۹',
};

/* نوار اعلان بالای صفحه */
const ANNOUNCEMENTS = [
  'ارسال رایگان برای سفارش‌های بالای ۱٫۵۰۰٫۰۰۰ تومان',
  '۷ روز ضمانت بازگشت کالا بدون قید و شرط',
  'تضمین اصالت کالا با کد رهگیری روی تمام محصولات',
];

/* منوی اصلی. هر آیتم می‌تواند زیرمنو داشته باشد. */
const NAV_MENU = [
  { id: 'skincare', label: 'مراقبت پوست', children: ['پاک‌کننده', 'سرم', 'کرم آبرسان', 'ضدآفتاب', 'دور چشم'] },
  { id: 'makeup', label: 'آرایش', children: ['کرم پودر', 'کانسیلر', 'ریمل', 'رژ لب', 'رژگونه'] },
  { id: 'haircare', label: 'مراقبت مو', children: ['شامپو', 'نرم‌کننده', 'ماسک مو', 'روغن مو'] },
  { id: 'bodycare', label: 'مراقبت بدن', children: ['لوسیون بدن', 'اسکراب', 'عطر'] },
  { id: 'accessories', label: 'لوازم جانبی', children: ['براش', 'رولر صورت', 'پد آرایشی'] },
  { id: 'brands', label: 'برندها', children: [] },
  { id: 'offers', label: 'پیشنهادها', children: [], highlight: true },
];

/* دسته‌بندی‌ها — هم برای کارت‌های دسته و هم برای فیلتر محصولات */
const CATEGORIES = [
  { id: 'skincare', label: 'مراقبت پوست', caption: 'پاک‌سازی تا آبرسانی', image: 'IMG/categories/skincare.svg' },
  { id: 'makeup', label: 'آرایش', caption: 'روزمره و حرفه‌ای', image: 'IMG/categories/makeup.svg' },
  { id: 'haircare', label: 'مراقبت مو', caption: 'تقویت و ترمیم', image: 'IMG/categories/haircare.svg' },
  { id: 'bodycare', label: 'مراقبت بدن', caption: 'نرمی و لطافت', image: 'IMG/categories/bodycare.svg' },
  { id: 'fragrance', label: 'عطر و رایحه', caption: 'امضای شخصی شما', image: 'IMG/categories/fragrance.svg' },
  { id: 'accessories', label: 'لوازم جانبی', caption: 'ابزار حرفه‌ای', image: 'IMG/categories/accessories.svg' },
];

/* برندها */
const BRANDS = [
  { id: 'lumiere', label: 'لومیر', logo: 'IMG/brands/lumiere.svg' },
  { id: 'aurelia', label: 'اورلیا', logo: 'IMG/brands/aurelia.svg' },
  { id: 'botanica', label: 'بوتانیکا', logo: 'IMG/brands/botanica.svg' },
  { id: 'maison', label: 'میزون آر', logo: 'IMG/brands/maison.svg' },
  { id: 'velour', label: 'ولور', logo: 'IMG/brands/velour.svg' },
  { id: 'sereine', label: 'سرن', logo: 'IMG/brands/sereine.svg' },
];

/* --------------------------------------------------------------------------
 * محصولات
 * --------------------------------------------------------------------------
 *   price     قیمت فعلی (تومان)
 *   oldPrice  قیمت پیش از تخفیف، یا null اگر تخفیفی ندارد
 *   concerns  نیازهای پوستی — برای بخش «روتین پوست» استفاده می‌شود
 *   tags      new / bestseller برای بخش‌های مختلف صفحه
 * ------------------------------------------------------------------------*/
const PRODUCTS = [
  { id: 'p01', name: 'ژل شست‌وشوی صورت پوست چرب', brand: 'botanica', category: 'skincare',
    image: 'IMG/products/cleanser-gel.svg', price: 486000, oldPrice: 620000, rating: 4.6, reviews: 214,
    volume: '۲۰۰ میلی‌لیتر', concerns: ['oily', 'acne'], tags: ['bestseller'],
    short: 'پاک‌سازی عمیق بدون خشکی، مناسب پوست‌های چرب و مستعد جوش.' },

  { id: 'p02', name: 'فوم پاک‌کننده ملایم صورت', brand: 'sereine', category: 'skincare',
    image: 'IMG/products/cleanser-foam.svg', price: 398000, oldPrice: null, rating: 4.4, reviews: 128,
    volume: '۱۵۰ میلی‌لیتر', concerns: ['sensitive', 'dry'], tags: ['new'],
    short: 'فرمول بدون صابون با pH متعادل، برای پوست‌های حساس.' },

  { id: 'p03', name: 'سرم ویتامین ث ۲۰ درصد', brand: 'lumiere', category: 'skincare',
    image: 'IMG/products/serum-vitc.svg', price: 1290000, oldPrice: 1650000, rating: 4.8, reviews: 512,
    volume: '۳۰ میلی‌لیتر', concerns: ['dull', 'spots'], tags: ['bestseller'],
    short: 'روشن‌کننده و آنتی‌اکسیدان قوی برای یکنواختی رنگ پوست.' },

  { id: 'p04', name: 'سرم نیاسینامید ۱۰ درصد', brand: 'aurelia', category: 'skincare',
    image: 'IMG/products/serum-niacin.svg', price: 745000, oldPrice: 890000, rating: 4.7, reviews: 341,
    volume: '۳۰ میلی‌لیتر', concerns: ['oily', 'acne', 'spots'], tags: ['bestseller'],
    short: 'تنظیم چربی و کوچک‌کردن ظاهر منافذ پوست.' },

  { id: 'p05', name: 'کرم آبرسان روزانه', brand: 'sereine', category: 'skincare',
    image: 'IMG/products/moisturizer.svg', price: 690000, oldPrice: null, rating: 4.5, reviews: 189,
    volume: '۵۰ میلی‌لیتر', concerns: ['dry', 'sensitive'], tags: [],
    short: 'بافت سبک با هیالورونیک اسید، بدون چربی اضافه.' },

  { id: 'p06', name: 'کرم شب ترمیم‌کننده رتینول', brand: 'botanica', category: 'skincare',
    image: 'IMG/products/night-cream.svg', price: 1450000, oldPrice: 1820000, rating: 4.7, reviews: 267,
    volume: '۵۰ میلی‌لیتر', concerns: ['aging', 'dull'], tags: ['bestseller'],
    short: 'بازسازی شبانه پوست و کاهش خطوط ریز.' },

  { id: 'p07', name: 'ضدآفتاب بی‌رنگ SPF۵۰', brand: 'lumiere', category: 'skincare',
    image: 'IMG/products/sunscreen.svg', price: 820000, oldPrice: 980000, rating: 4.9, reviews: 733,
    volume: '۵۰ میلی‌لیتر', concerns: ['spots', 'aging', 'sensitive'], tags: ['bestseller'],
    short: 'بدون رد سفید، مناسب زیر آرایش و همه انواع پوست.' },

  { id: 'p08', name: 'کرم دور چشم روشن‌کننده', brand: 'aurelia', category: 'skincare',
    image: 'IMG/products/eye-cream.svg', price: 935000, oldPrice: null, rating: 4.3, reviews: 96,
    volume: '۱۵ میلی‌لیتر', concerns: ['aging', 'dull'], tags: ['new'],
    short: 'کاهش پفـ و تیرگی زیر چشم با کافئین و پپتید.' },

  { id: 'p09', name: 'کرم پودر مات ماندگار', brand: 'velour', category: 'makeup',
    image: 'IMG/products/foundation.svg', price: 1180000, oldPrice: 1390000, rating: 4.6, reviews: 405,
    volume: '۳۰ میلی‌لیتر', concerns: [], tags: ['bestseller'],
    short: 'پوشش متوسط تا زیاد با ماندگاری ۱۲ ساعته.' },

  { id: 'p10', name: 'کانسیلر روشن‌کننده زیر چشم', brand: 'velour', category: 'makeup',
    image: 'IMG/products/concealer.svg', price: 645000, oldPrice: null, rating: 4.4, reviews: 158,
    volume: '۷ میلی‌لیتر', concerns: [], tags: [],
    short: 'بافت کرمی و سبک، بدون نشستن در خطوط.' },

  { id: 'p11', name: 'ریمل حجم‌دهنده ضدآب', brand: 'velour', category: 'makeup',
    image: 'IMG/products/mascara.svg', price: 520000, oldPrice: 680000, rating: 4.5, reviews: 322,
    volume: '۱۰ میلی‌لیتر', concerns: [], tags: ['bestseller'],
    short: 'براش مخروطی برای جداسازی و حجم‌دهی مژه‌ها.' },

  { id: 'p12', name: 'رژ لب جیر نود', brand: 'maison', category: 'makeup',
    image: 'IMG/products/lipstick-nude.svg', price: 590000, oldPrice: null, rating: 4.6, reviews: 241,
    volume: '۴ گرم', concerns: [], tags: ['new'],
    short: 'فینیش مخملی مات با حس راحت روی لب.' },

  { id: 'p13', name: 'رژ لب مخملی رزی', brand: 'maison', category: 'makeup',
    image: 'IMG/products/lipstick-rose.svg', price: 590000, oldPrice: 720000, rating: 4.4, reviews: 177,
    volume: '۴ گرم', concerns: [], tags: [],
    short: 'رنگ‌دهی بالا با یک بار کشیدن.' },

  { id: 'p14', name: 'رژگونه پودری ابریشمی', brand: 'velour', category: 'makeup',
    image: 'IMG/products/blush.svg', price: 480000, oldPrice: null, rating: 4.5, reviews: 134,
    volume: '۶ گرم', concerns: [], tags: ['new'],
    short: 'پودر نرم و قابل لایه‌لایه کردن بدون پخش شدن.' },

  { id: 'p15', name: 'شامپو تقویت‌کننده ضدریزش', brand: 'botanica', category: 'haircare',
    image: 'IMG/products/shampoo.svg', price: 435000, oldPrice: 560000, rating: 4.5, reviews: 288,
    volume: '۴۰۰ میلی‌لیتر', concerns: [], tags: ['bestseller'],
    short: 'بدون سولفات، همراه با عصاره گزنه و بیوتین.' },

  { id: 'p16', name: 'نرم‌کننده مو بدون آبکشی', brand: 'botanica', category: 'haircare',
    image: 'IMG/products/conditioner.svg', price: 410000, oldPrice: null, rating: 4.3, reviews: 112,
    volume: '۳۰۰ میلی‌لیتر', concerns: [], tags: [],
    short: 'نرمی و شانه‌پذیری بدون سنگین کردن مو.' },

  { id: 'p17', name: 'ماسک مو کراتین ترمیم‌کننده', brand: 'sereine', category: 'haircare',
    image: 'IMG/products/hair-mask.svg', price: 760000, oldPrice: 920000, rating: 4.7, reviews: 203,
    volume: '۲۵۰ میلی‌لیتر', concerns: [], tags: ['bestseller'],
    short: 'بازسازی موهای آسیب‌دیده در ۱۰ دقیقه.' },

  { id: 'p18', name: 'روغن مو آرگان خالص', brand: 'botanica', category: 'haircare',
    image: 'IMG/products/hair-oil.svg', price: 680000, oldPrice: null, rating: 4.6, reviews: 166,
    volume: '۱۰۰ میلی‌لیتر', concerns: [], tags: ['new'],
    short: 'درخشندگی و کنترل وز بدون حس چربی.' },

  { id: 'p19', name: 'لوسیون بدن شی‌باتر', brand: 'sereine', category: 'bodycare',
    image: 'IMG/products/body-lotion.svg', price: 395000, oldPrice: 490000, rating: 4.4, reviews: 151,
    volume: '۳۰۰ میلی‌لیتر', concerns: ['dry'], tags: [],
    short: 'رطوبت‌رسانی ۲۴ ساعته با رایحه ملایم وانیل.' },

  { id: 'p20', name: 'اسکراب بدن قهوه و نمک دریا', brand: 'botanica', category: 'bodycare',
    image: 'IMG/products/body-scrub.svg', price: 340000, oldPrice: null, rating: 4.2, reviews: 87,
    volume: '۲۰۰ گرم', concerns: [], tags: ['new'],
    short: 'لایه‌برداری ملایم و شاداب‌سازی پوست بدن.' },

  { id: 'p21', name: 'ادوپرفیوم زنانه رز و مشک', brand: 'maison', category: 'fragrance',
    image: 'IMG/products/perfume.svg', price: 2450000, oldPrice: 2980000, rating: 4.8, reviews: 419,
    volume: '۷۵ میلی‌لیتر', concerns: [], tags: ['bestseller'],
    short: 'رایحه گرم و ماندگار با نت پایه چوب صندل.' },

  { id: 'p22', name: 'ست براش آرایشی ۱۲ عددی', brand: 'velour', category: 'accessories',
    image: 'IMG/products/brush-set.svg', price: 890000, oldPrice: 1150000, rating: 4.5, reviews: 198,
    volume: '۱۲ عدد', concerns: [], tags: ['bestseller'],
    short: 'موی مصنوعی نرم با دسته چوبی و کیف نگهدارنده.' },

  { id: 'p23', name: 'رولر سنگ جید صورت', brand: 'aurelia', category: 'accessories',
    image: 'IMG/products/jade-roller.svg', price: 320000, oldPrice: null, rating: 4.1, reviews: 74,
    volume: '۱ عدد', concerns: ['dull'], tags: ['new'],
    short: 'ماساژ و کاهش پف صورت در روتین صبحگاهی.' },

  { id: 'p24', name: 'پد پاف آرایشی مرطوب', brand: 'velour', category: 'accessories',
    image: 'IMG/products/sponge.svg', price: 185000, oldPrice: 240000, rating: 4.3, reviews: 143,
    volume: '۲ عدد', concerns: [], tags: [],
    short: 'پخش یکنواخت کرم پودر بدون جذب بیش از حد محصول.' },
];

/* نیازهای پوستی برای بخش روتین */
const CONCERNS = [
  { id: 'oily', label: 'پوست چرب', caption: 'کنترل چربی و منافذ باز' },
  { id: 'dry', label: 'پوست خشک', caption: 'آبرسانی عمیق و طولانی' },
  { id: 'sensitive', label: 'پوست حساس', caption: 'فرمول ملایم و بدون تحریک' },
  { id: 'acne', label: 'جوش و آکنه', caption: 'کاهش التهاب و لک‌های باقی‌مانده' },
  { id: 'aging', label: 'ضدپیری', caption: 'سفتی پوست و خطوط ریز' },
  { id: 'spots', label: 'لک و تیرگی', caption: 'یکنواختی رنگ پوست' },
];

/* گزینه‌های مرتب‌سازی محصولات */
const SORT_OPTIONS = [
  { id: 'featured', label: 'پیشنهاد آوینا' },
  { id: 'price-asc', label: 'ارزان‌ترین' },
  { id: 'price-desc', label: 'گران‌ترین' },
  { id: 'rating', label: 'محبوب‌ترین' },
  { id: 'discount', label: 'بیشترین تخفیف' },
];

/* بخش مجله زیبایی */
const POSTS = [
  { title: 'ترتیب درست استفاده از محصولات در روتین شب',
    excerpt: 'از پاک‌کننده تا کرم شب؛ ترتیبی که اثر هر محصول را چند برابر می‌کند.',
    category: 'روتین پوست', readingTime: '۶ دقیقه', image: 'IMG/editorial/post-1.svg',
    url: 'articles/shab-routine-tartib.html' },
  { title: 'ویتامین ث یا نیاسینامید؟ کدام برای پوست شما',
    excerpt: 'مقایسه دو ماده موثر پرطرفدار و اینکه چه زمانی باید کنار هم استفاده شوند.',
    category: 'دانش مواد موثره', readingTime: '۸ دقیقه', image: 'IMG/editorial/post-2.svg',
    url: 'articles/vitamin-c-ya-niacinamide.html' },
  { title: 'آرایش روزانه در ده دقیقه با پنج محصول',
    excerpt: 'یک روتین ساده و تمیز برای روزهایی که وقت کم است اما ظاهر مرتب می‌خواهید.',
    category: 'آرایش', readingTime: '۵ دقیقه', image: 'IMG/editorial/post-3.svg',
    url: 'articles/arayesh-dah-daghighe.html' },
];

/* بخش اعتماد مشتری */
const TRUST = [
  { icon: 'verified', title: 'تضمین اصالت کالا', text: 'تمام محصولات دارای کد رهگیری و مجوز واردات هستند.' },
  { icon: 'local_shipping', title: 'ارسال سریع', text: 'ارسال همان روز در تهران و ۴۸ ساعته به سراسر کشور.' },
  { icon: 'lock', title: 'پرداخت امن', text: 'درگاه بانکی معتبر با رمز پویا و بدون ذخیره اطلاعات کارت.' },
  { icon: 'support_agent', title: 'پشتیبانی تخصصی', text: 'مشاوره رایگان پوست و مو، همه روزه از ۹ تا ۲۱.' },
];

/* فوتر */
const FOOTER_MENUS = [
  { title: 'خرید', links: ['مراقبت پوست', 'آرایش', 'مراقبت مو', 'مراقبت بدن', 'عطر و رایحه', 'لوازم جانبی'] },
  { title: 'خدمات مشتریان', links: ['پیگیری سفارش', 'شرایط بازگشت کالا', 'راهنمای خرید', 'روش‌های پرداخت', 'پرسش‌های پرتکرار'] },
  { title: 'درباره آوینا', links: ['داستان ما', 'فرصت‌های شغلی', 'همکاری با ما', 'مجله زیبایی', 'تماس با ما'] },
];

const PAYMENT_BADGES = ['پرداخت امن', 'نماد اعتماد', 'ارسال سریع', 'ضمانت بازگشت'];

/* پیشنهاد شگفت‌انگیز — شمارش معکوس تا این تعداد ساعت بعد */
const OFFER = {
  title: 'هفته مراقبت از پوست',
  subtitle: 'تا ۳۵٪ تخفیف روی سرم‌ها و ضدآفتاب‌ها',
  text: 'مجموعه‌ای منتخب از پرفروش‌ترین محصولات مراقبت پوست، برای مدت محدود.',
  cta: 'مشاهده پیشنهادها',
  image: 'IMG/promo.svg',
  hoursFromNow: 47,
};
