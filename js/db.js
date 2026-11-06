import { db } from './firebaseInit.js';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, addDoc, serverTimestamp, increment, runTransaction
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------- משפחה ----------
export async function getFamilyMeta(familyId) {
  const snap = await getDoc(doc(db, 'families', familyId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createFamily(uid, name) {
  const ref = doc(collection(db, 'families'));
  await setDoc(ref, { name, ownerUid: uid, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateFamilyMeta(familyId, patch) {
  await updateDoc(doc(db, 'families', familyId), patch);
}

// פינת "מילה מאבא/אמא" - הודעה אחת שמוצגת לכל הילדים במסך הראשי.
export async function setBlessingText(familyId, text) {
  await updateFamilyMeta(familyId, { blessingText: text });
}

// ---------- ילדים ----------
export async function getKids(familyId) {
  const snap = await getDocs(collection(db, 'families', familyId, 'kids'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addKid(familyId, kidData) {
  const ref = await addDoc(collection(db, 'families', familyId, 'kids'), {
    name: kidData.name,
    photoUrl: kidData.photoUrl || '',
    selectedTasks: kidData.selectedTasks || [],
    dailyBonus: kidData.dailyBonus || 0,
    points: { lifetime: 0, redeemable: 0, daily: 0, dailyDate: todayStr() },
  });
  return ref.id;
}

export async function updateKid(familyId, kidId, patch) {
  await updateDoc(doc(db, 'families', familyId, 'kids', kidId), patch);
}

export async function deleteKid(familyId, kidId) {
  await deleteDoc(doc(db, 'families', familyId, 'kids', kidId));
}

export async function getKid(familyId, kidId) {
  const snap = await getDoc(doc(db, 'families', familyId, 'kids', kidId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ---------- ימים (השלמות משימות + שיעורי בית) ----------
export async function getDay(familyId, kidId, date = todayStr()) {
  const snap = await getDoc(doc(db, 'families', familyId, 'kids', kidId, 'days', date));
  return snap.exists() ? snap.data() : { completed: {}, homeworkText: '' };
}

export async function setDayField(familyId, kidId, patch, date = todayStr()) {
  await setDoc(doc(db, 'families', familyId, 'kids', kidId, 'days', date), patch, { merge: true });
}

export async function toggleTaskDone(familyId, kidId, taskId, date = todayStr()) {
  const day = await getDay(familyId, kidId, date);
  const nowDone = !day.completed?.[taskId];
  const completed = { ...(day.completed || {}), [taskId]: nowDone };
  await setDayField(familyId, kidId, { completed }, date);
  await ensureDailyRollover(familyId, kidId, date);
  return nowDone;
}

export async function setHomeworkText(familyId, kidId, text, date = todayStr()) {
  await setDayField(familyId, kidId, { homeworkText: text }, date);
}

// ---------- נקודות: 3 מונים, נשמרים ישירות על מסמך הילד ----------
// lifetime: מצטבר לנצח. redeemable: ההורה מנכה ממנה את עלות התגמול. daily: מתאפסת בחצות ומצטרפת ל-redeemable.
function rolledPoints(p, currentDate) {
  const base = { lifetime: 0, redeemable: 0, daily: 0, dailyDate: currentDate, ...(p || {}) };
  if (base.dailyDate === currentDate) return base;
  return { ...base, redeemable: (base.redeemable || 0) + (base.daily || 0), daily: 0, dailyDate: currentDate };
}

// טרנזקציה: גם אם שני מכשירים נכנסים יחד אחרי חצות, היתרה מתעדכנת פעם אחת בלבד.
async function ensureDailyRollover(familyId, kidId, currentDate = todayStr()) {
  const kidRef = doc(db, 'families', familyId, 'kids', kidId);
  await runTransaction(db, async tx => {
    const snap = await tx.get(kidRef);
    if (!snap.exists()) return;
    const p = snap.data().points;
    if (p && p.dailyDate === currentDate) return;
    tx.update(kidRef, { points: rolledPoints(p, currentDate) });
  });
}

// סימון/ביטול משימה + נקודות + בונוס יום מלא – הכול בטרנזקציה אחת.
// כך לחיצות מהירות או שני מכשירים במקביל לא דורסים זה את זה ולא מאבדים נקודות.
// forceDone: true/false לקביעת מצב מפורש, או undefined להפיכת המצב.
export async function toggleTask(familyId, kidId, taskId, forceDone, date = todayStr()) {
  const kidRef = doc(db, 'families', familyId, 'kids', kidId);
  const dayRef = doc(db, 'families', familyId, 'kids', kidId, 'days', date);
  const famRef = doc(db, 'families', familyId);
  return runTransaction(db, async tx => {
    const kidSnap = await tx.get(kidRef);
    const daySnap = await tx.get(dayRef);
    if (!kidSnap.exists()) throw new Error('kid not found');
    const kid = kidSnap.data();
    const day = daySnap.exists() ? daySnap.data() : {};
    const completed = { ...(day.completed || {}) };
    const wasDone = !!completed[taskId];
    const nowDone = forceDone === undefined ? !wasDone : !!forceDone;
    let p = rolledPoints(kid.points, date);
    if (nowDone === wasDone) return { done: nowDone, points: p, changed: false, bonusChange: 0 };

    completed[taskId] = nowDone;
    const tasks = kid.selectedTasks || [];
    const taskPts = Number(tasks.find(t => t.taskId === taskId)?.points) || 0;
    let delta = nowDone ? taskPts : -taskPts;

    const bonus = Number(kid.dailyBonus) || 0;
    const allDone = tasks.length > 0 && tasks.every(t => completed[t.taskId]);
    let awarded = !!day.bonusAwarded, famDelta = 0;
    if (bonus > 0 && allDone && !awarded) { delta += bonus; famDelta = bonus; awarded = true; }
    else if (bonus > 0 && !allDone && awarded) { delta -= bonus; famDelta = -bonus; awarded = false; }

    p = { ...p, daily: Math.max(0, p.daily + delta), lifetime: Math.max(0, p.lifetime + delta) };
    tx.set(dayRef, { completed: { [taskId]: nowDone }, bonusAwarded: awarded }, { merge: true });
    tx.update(kidRef, { points: p });
    if (famDelta) tx.update(famRef, { familyPoints: increment(famDelta) });
    return { done: nowDone, points: p, changed: true, bonusChange: famDelta };
  });
}

export async function getPoints(familyId, kidId) {
  await ensureDailyRollover(familyId, kidId);
  const kid = await getKid(familyId, kidId);
  return kid?.points || { lifetime: 0, redeemable: 0, daily: 0, dailyDate: todayStr() };
}

export async function addPoints(familyId, kidId, amount) {
  await ensureDailyRollover(familyId, kidId);
  const kid = await getKid(familyId, kidId);
  const p = kid.points;
  await updateKid(familyId, kidId, {
    points: { ...p, daily: p.daily + amount, lifetime: p.lifetime + amount },
  });
}

export async function removePoints(familyId, kidId, amount) {
  await ensureDailyRollover(familyId, kidId);
  const kid = await getKid(familyId, kidId);
  const p = kid.points;
  await updateKid(familyId, kidId, {
    points: { ...p, daily: Math.max(0, p.daily - amount), lifetime: Math.max(0, p.lifetime - amount) },
  });
}

// ההורה מנכה ממונה #2 (redeemable) רק את עלות התגמול שהילד בחר - לא את כל היתרה.
// lifetime ו-daily לא נוגעים. מחזיר את הסכום שנוכה בפועל (לא יותר מהיתרה).
export async function redeemPoints(familyId, kidId, amount) {
  const kidRef = doc(db, 'families', familyId, 'kids', kidId);
  return runTransaction(db, async tx => {
    const snap = await tx.get(kidRef);
    const p = rolledPoints(snap.data()?.points, todayStr());
    const deduct = Math.min(Math.max(0, Math.floor(Number(amount) || 0)), p.redeemable);
    tx.update(kidRef, { points: { ...p, redeemable: p.redeemable - deduct } });
    return deduct;
  });
}

// ימים אחרונים (לגרף שבועי במסך ההורים)
export async function getRecentDays(familyId, kidId, n = 7) {
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  const days = await Promise.all(dates.map(date => getDay(familyId, kidId, date)));
  return dates.map((date, i) => ({ date, ...days[i] }));
}

// ---------- מונה משפחתי ----------
// כשילד משלים את כל המשימות שלו ביום נתון, בונוס היום המלא שלו (dailyBonus)
// נזקף גם למונה המשפחתי המשותף - כדי לעודד תמיכה הדדית בין הילדים.
export async function getFamilyPoints(familyId) {
  const family = await getFamilyMeta(familyId);
  return family?.familyPoints || 0;
}

// בודק אם כל המשימות של הילד הושלמו היום; אם כן ועדיין לא ניתן בונוס - מעניק
// אותו (לילד + למונה המשפחתי) פעם אחת. אם בוטלה השלמה מלאה אחרי שהבונוס כבר
// ניתן - מבטל אותו (גם אצל הילד וגם במשפחתי), כדי שהמונים תמיד יהיו עקביים.
export async function syncDailyBonus(familyId, kidId, date = todayStr()) {
  const kid = await getKid(familyId, kidId);
  const taskIds = kid.selectedTasks || [];
  if (taskIds.length === 0) return;
  const day = await getDay(familyId, kidId, date);
  const allDone = taskIds.every(t => day.completed?.[t.taskId]);
  const alreadyAwarded = !!day.bonusAwarded;
  const bonus = kid.dailyBonus || 0;

  if (allDone && !alreadyAwarded && bonus > 0) {
    await addPoints(familyId, kidId, bonus);
    await updateFamilyMeta(familyId, { familyPoints: increment(bonus) });
    await setDayField(familyId, kidId, { bonusAwarded: true }, date);
  } else if (!allDone && alreadyAwarded && bonus > 0) {
    await removePoints(familyId, kidId, bonus);
    await updateFamilyMeta(familyId, { familyPoints: increment(-bonus) });
    await setDayField(familyId, kidId, { bonusAwarded: false }, date);
  }
}

// ---------- קונפיגורציה גלובלית (לא של משפחה ספציפית) ----------
// פינת "סיפורי סבא" - לוגו, כיתוב קבוע, והודעה מתחלפת (למשל "פרק חדש היום").
// מנוהל רק ע"י super admin (ראו js/adminConfig.js + superadmin/).
const SIPUREI_SABA_DOC = doc(db, 'app_config', 'sipureiSaba');

export async function getSipureiSabaConfig() {
  const snap = await getDoc(SIPUREI_SABA_DOC);
  return snap.exists() ? snap.data() : { logoUrl: '', caption: '', announcement: '' };
}

export async function setSipureiSabaConfig(patch) {
  await setDoc(SIPUREI_SABA_DOC, patch, { merge: true });
}
