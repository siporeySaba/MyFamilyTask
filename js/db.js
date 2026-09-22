import { db } from './firebaseInit.js';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, addDoc, serverTimestamp, increment
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
// lifetime: מצטבר לנצח. redeemable: מתאפסת ידנית ע"י ההורה. daily: מתאפסת בחצות ומצטרפת ל-redeemable.
async function ensureDailyRollover(familyId, kidId, currentDate = todayStr()) {
  const kid = await getKid(familyId, kidId);
  if (!kid) return;
  const p = kid.points || { lifetime: 0, redeemable: 0, daily: 0, dailyDate: currentDate };
  if (p.dailyDate !== currentDate) {
    const updated = { ...p, redeemable: p.redeemable + p.daily, daily: 0, dailyDate: currentDate };
    await updateKid(familyId, kidId, { points: updated });
  }
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

// ההורה מאפס את מונה #2 (redeemable) כשהילד מימש תגמול. lifetime ו-daily לא נוגעים.
export async function redeemPoints(familyId, kidId) {
  const kid = await getKid(familyId, kidId);
  const p = kid.points;
  await updateKid(familyId, kidId, { points: { ...p, redeemable: 0 } });
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
