// קטלוג המשימות הקבוע - 15 משימות, זהה לכל המשפחות.
// כרגע כל משימה מיוצגת באימוג'י כ-placeholder לתמונה.
// כשיהיו תמונות אמיתיות: להחליף `emoji` ב-`imageUrl` ולעדכן את הרינדור ב-taskTile().
export const TASK_CATALOG = [
  // בוקר
  { id: 'brush-teeth',     name: 'צחצוח שיניים',            emoji: '🪥' },
  { id: 'get-dressed',     name: 'התלבשות עצמאית',          emoji: '👕' },
  { id: 'make-bed',        name: 'סידור מיטה',               emoji: '🛏️' },
  { id: 'pack-bag-am',     name: 'הכנת תיק',                 emoji: '🎒' },
  { id: 'socks-shoes',     name: 'גרביים ונעליים לבד',       emoji: '🧦' },
  { id: 'wash-hands-am',   name: 'נטילת ידיים בבוקר',        emoji: '🤲' },

  // היגיינה
  { id: 'shower',          name: 'מקלחת',                    emoji: '🛁' },
  { id: 'hair-brush',      name: 'סירוק שיער',               emoji: '💇' },

  // למידה
  { id: 'homework',        name: 'שיעורי בית',               emoji: '📚', special: 'homework' },
  { id: 'read-book',       name: 'קריאת ספר',                emoji: '📖' },
  { id: 'writing-math',    name: 'תרגול כתיבה/חשבון',        emoji: '✍️' },
  { id: 'instrument',      name: 'תרגול כלי נגינה',           emoji: '🎹' },
  { id: 'language',        name: 'תרגול שפה',                emoji: '🗣️' },

  // עזרה בבית
  { id: 'set-table',       name: 'עריכת/פינוי שולחן',        emoji: '🍴' },
  { id: 'laundry',         name: 'בגדים בסל הכביסה',         emoji: '🧺' },
  { id: 'tidy-toys',       name: 'סידור צעצועים/חדר',        emoji: '🧸' },
  { id: 'feed-pet',        name: 'האכלת חיית מחמד',          emoji: '🐾' },
  { id: 'water-plant',     name: 'השקיית צמח',               emoji: '🌱' },
  { id: 'trash-recycle',   name: 'הוצאת אשפה/מיחזור',        emoji: '🗑️' },

  // ערב
  { id: 'pajamas',         name: 'הכנה לשינה',               emoji: '🌙' },
  { id: 'pack-bag-pm',     name: 'הכנת תיק למחר',            emoji: '📓' },
  { id: 'screens-off',     name: 'כיבוי מסכים',              emoji: '📵' },
  { id: 'shoes-away',      name: 'הנחת נעליים בארון',        emoji: '👟' },

  // אחר
  { id: 'free-play',       name: 'זמן יצירה או משחק עצמי',   emoji: '🎨' },
  { id: 'home-on-time',    name: 'חזרה הביתה בזמן',          emoji: '⏱️' },
  { id: 'kind-word',       name: 'מילה טובה',                emoji: '💬' },
];

export function getCatalogTask(id) {
  return TASK_CATALOG.find(t => t.id === id);
}
