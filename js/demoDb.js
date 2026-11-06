// נתוני הדגמה בזיכרון בלבד – לבדיקות מקומיות (localhost?demo). לא נוגע ב-Firebase.
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const wait = (ms = 150) => new Promise(r => setTimeout(r, ms));
const family = { name: 'משפחת הדגמה', familyPoints: 12, blessingText: 'אנחנו גאים בכם! ❤️' };
const kids = {
  a: { id: 'a', name: 'נועה', photoUrl: '', dailyBonus: 5,
       selectedTasks: ['brush-teeth', 'make-bed', 'homework', 'read-book', 'set-table', 'pajamas'].map(taskId => ({ taskId, points: 3 })),
       points: { lifetime: 40, redeemable: 22, daily: 0, dailyDate: todayStr() } },
  b: { id: 'b', name: 'איתי', photoUrl: '', dailyBonus: 5,
       selectedTasks: ['brush-teeth', 'get-dressed', 'tidy-toys'].map(taskId => ({ taskId, points: 2 })),
       points: { lifetime: 15, redeemable: 9, daily: 0, dailyDate: todayStr() } },
};
const days = {};
const dayOf = (kidId, date = todayStr()) => (days[kidId + date] ||= { completed: {}, homeworkText: 'חוברת חשבון עמ׳ 12–13' });

export async function getFamilyMeta() { await wait(); return { id: 'demo', ...family }; }
export async function getKids() { await wait(); return Object.values(kids).map(k => ({ ...k })); }
export async function getKid(_f, kidId) { await wait(); return kids[kidId] ? { ...kids[kidId] } : null; }
export async function getDay(_f, kidId, date) { await wait(); return { ...dayOf(kidId, date) }; }
export async function getPoints(_f, kidId) { await wait(); return { ...kids[kidId].points }; }
export async function getFamilyPoints() { await wait(); return family.familyPoints; }
export async function getSipureiSabaConfig() { await wait(); return { logoUrl: '', caption: '', announcement: 'היום עולה פרק חדש!' }; }

export async function toggleTask(_f, kidId, taskId, forceDone) {
  await wait(300);
  const kid = kids[kidId], day = dayOf(kidId);
  const was = !!day.completed[taskId], now = forceDone === undefined ? !was : forceDone;
  if (was === now) return { done: now, points: { ...kid.points }, changed: false, bonusChange: 0 };
  day.completed[taskId] = now;
  let delta = (now ? 1 : -1) * (kid.selectedTasks.find(t => t.taskId === taskId)?.points || 0);
  const allDone = kid.selectedTasks.every(t => day.completed[t.taskId]);
  let fam = 0;
  if (allDone && !day.bonusAwarded) { delta += kid.dailyBonus; fam = kid.dailyBonus; day.bonusAwarded = true; }
  else if (!allDone && day.bonusAwarded) { delta -= kid.dailyBonus; fam = -kid.dailyBonus; day.bonusAwarded = false; }
  kid.points = { ...kid.points, daily: kid.points.daily + delta, lifetime: kid.points.lifetime + delta };
  family.familyPoints += fam;
  return { done: now, points: { ...kid.points }, changed: true, bonusChange: fam };
}
