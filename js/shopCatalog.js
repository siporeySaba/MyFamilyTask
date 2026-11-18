// מחירון חנות ההפתעות – מקור אחד גם לאפליקציה וגם למחירון להדפסה (shop/print.html).
// לשינוי מחיר / הוספת פריט: עורכים כאן בלבד.
export const SHOP_ITEMS = [
  { id: 'stickers',  name: 'חבילת מדבקות',      emoji: '🌟', cost: 90 },
  { id: 'can',       name: 'פחית שתייה',         emoji: '🥤', cost: 120 },
  { id: 'kinder',    name: 'ביצת קינדר',         emoji: '🥚', cost: 120 },
  { id: 'krembo',    name: 'קרמבו',              emoji: '🧁', cost: 120 },
  { id: 'lollipop',  name: 'סוכרייה על מקל',     emoji: '🍭', cost: 120 },
  { id: 'ice-pop',   name: 'ארטיק קרח',          emoji: '🍧', cost: 120 },
  { id: 'bubbles',   name: 'בועות סבון',         emoji: '🧼', cost: 120 },
  { id: 'bamba',     name: 'במבה קטנה',          emoji: '🥜', cost: 120 },
  { id: 'bissli',    name: 'ביסלי קטן',          emoji: '🥨', cost: 120 },
  { id: 'cereal',    name: 'חטיף דגנים',         emoji: '🌾', cost: 120 },
  { id: 'gum',       name: 'חבילת מסטיק',        emoji: '🍬', cost: 120 },
  { id: 'taami',     name: 'טעמי',               emoji: '🍫', cost: 160 },
  { id: 'kif-kef',   name: 'כיף כף',             emoji: '🍫', cost: 160 },
  { id: 'pesek',     name: 'פסק זמן',            emoji: '🧇', cost: 160 },
  { id: 'choco',     name: 'שוקו קטן',           emoji: '🥛', cost: 160 },
  { id: 'juice',     name: 'בקבוק מיץ קטן',      emoji: '🧃', cost: 160 },
  { id: 'chips',     name: 'תפוצ׳יפס קטן',       emoji: '🍟', cost: 160 },
  { id: 'click',     name: 'קליק',               emoji: '🍪', cost: 200 },
  { id: 'mekupelet', name: 'מקופלת',             emoji: '🍫', cost: 200 },
  { id: 'gummies',   name: 'שקית סוכריות גומי',  emoji: '🐻', cost: 200 },
  { id: 'magnum',    name: 'מגנום / טילון',      emoji: '🍦', cost: 270 },
];

export const getShopItem = id => SHOP_ITEMS.find(i => i.id === id);
