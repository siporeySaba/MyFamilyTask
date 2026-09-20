// קטלוג המשימות הקבוע - 15 משימות, זהה לכל המשפחות.
// כרגע כל משימה מיוצגת באימוג'י כ-placeholder לתמונה.
// כשיהיו תמונות אמיתיות: להחליף `emoji` ב-`imageUrl` ולעדכן את הרינדור ב-taskTile().
export const TASK_CATALOG = [
  { id: 'brush-teeth',   name: 'צחצוח שיניים',        emoji: '🪥' },
  { id: 'get-dressed',   name: 'התלבשות',              emoji: '👕' },
  { id: 'make-bed',      name: 'סידור מיטה',            emoji: '🛏️' },
  { id: 'breakfast',     name: 'ארוחת בוקר',           emoji: '🍽️' },
  { id: 'pack-bag',      name: 'הכנת תיק',              emoji: '🎒' },
  { id: 'homework',      name: 'שיעורי בית',           emoji: '📚', special: 'homework' },
  { id: 'read-book',     name: 'קריאת ספר',            emoji: '📖' },
  { id: 'tidy-toys',     name: 'סידור צעצועים',        emoji: '🧸' },
  { id: 'wash-hands',    name: 'שטיפת ידיים',          emoji: '🧼' },
  { id: 'shoes-away',    name: 'נעליים במקום',         emoji: '👟' },
  { id: 'set-table',     name: 'עזרה בשולחן',          emoji: '🍴' },
  { id: 'shower',        name: 'מקלחת',                emoji: '🛁' },
  { id: 'pajamas',       name: 'הכנה לשינה',           emoji: '🌙' },
  { id: 'feed-pet',      name: 'האכלת חיית מחמד',      emoji: '🐾' },
  { id: 'laundry',       name: 'בגדים בסל הכביסה',     emoji: '🧺' },
];

export function getCatalogTask(id) {
  return TASK_CATALOG.find(t => t.id === id);
}
