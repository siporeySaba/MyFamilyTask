// שכבת נתונים. כרגע מבוססת localStorage (משפחה אחת בדפדפן זה).
// כשנחבר Firebase: מחליפים את המימוש הפנימי כאן ל-Firestore,
// בלי לשנות את הקוד שקורא לפונקציות האלה במסכים.

const FAMILY_KEY = 'kta_family';
const DAYS_KEY = 'kta_days';
const POINTS_KEY = 'kta_points';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------- משפחה ----------
export function getFamily() {
  return read(FAMILY_KEY, null);
}
export function saveFamily(family) {
  write(FAMILY_KEY, family);
}
export function isFamilySetup() {
  const f = getFamily();
  return !!(f && f.name && f.kids && f.kids.length > 0);
}

// ---------- ימים (השלמות משימות + שיעורי בית) ----------
function getDaysStore() {
  return read(DAYS_KEY, {});
}
function saveDaysStore(store) {
  write(DAYS_KEY, store);
}
export function getDay(kidId, date = todayStr()) {
  const store = getDaysStore();
  return (store[kidId] && store[kidId][date]) || { completed: {}, homeworkText: '' };
}
export function toggleTaskDone(kidId, taskId, date = todayStr()) {
  const store = getDaysStore();
  store[kidId] = store[kidId] || {};
  store[kidId][date] = store[kidId][date] || { completed: {}, homeworkText: '' };
  const day = store[kidId][date];
  const wasDone = !!day.completed[taskId];
  day.completed[taskId] = !wasDone;
  saveDaysStore(store);
  ensureDailyRollover(kidId, date);
  return !wasDone;
}
export function setHomeworkText(kidId, text, date = todayStr()) {
  const store = getDaysStore();
  store[kidId] = store[kidId] || {};
  store[kidId][date] = store[kidId][date] || { completed: {}, homeworkText: '' };
  store[kidId][date].homeworkText = text;
  saveDaysStore(store);
}

// ---------- נקודות: 3 מונים ----------
// lifetime: מצטבר לנצח, לא מתאפס.
// redeemable: היתרה ה"נוכחית" שההורה מאפס כשהילד מקבל תגמול.
// daily: מתאפס בחצות ומצטרף ל-redeemable (וגם ל-lifetime).
function getPointsStore() {
  return read(POINTS_KEY, {});
}
function savePointsStore(store) {
  write(POINTS_KEY, store);
}
function ensureKidPoints(store, kidId) {
  if (!store[kidId]) {
    store[kidId] = { lifetime: 0, redeemable: 0, daily: 0, dailyDate: todayStr() };
  }
  return store[kidId];
}
// אם התאריך המקומי התקדם מאז הפעם האחרונה - "לגלגל" את מונה היום לתוך redeemable ולאפס אותו.
function ensureDailyRollover(kidId, currentDate = todayStr()) {
  const store = getPointsStore();
  const p = ensureKidPoints(store, kidId);
  if (p.dailyDate !== currentDate) {
    p.redeemable += p.daily;
    p.daily = 0;
    p.dailyDate = currentDate;
    savePointsStore(store);
  }
}
export function getPoints(kidId) {
  ensureDailyRollover(kidId);
  const store = getPointsStore();
  return ensureKidPoints(store, kidId);
}
export function addPoints(kidId, amount) {
  ensureDailyRollover(kidId);
  const store = getPointsStore();
  const p = ensureKidPoints(store, kidId);
  p.daily += amount;
  p.lifetime += amount;
  savePointsStore(store);
}
export function removePoints(kidId, amount) {
  ensureDailyRollover(kidId);
  const store = getPointsStore();
  const p = ensureKidPoints(store, kidId);
  p.daily = Math.max(0, p.daily - amount);
  p.lifetime = Math.max(0, p.lifetime - amount);
  savePointsStore(store);
}
// ההורה מאפס את מונה #2 (redeemable) כשהילד מימש תגמול. lifetime ו-daily לא נוגעים.
export function redeemPoints(kidId) {
  const store = getPointsStore();
  const p = ensureKidPoints(store, kidId);
  p.redeemable = 0;
  savePointsStore(store);
}
