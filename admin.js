import { getFamily, isFamilySetup, getDay, setHomeworkText, getPoints, redeemPoints, todayStr } from '../js/db.js';

const app = document.getElementById('app');

if (!isFamilySetup()) {
  location.href = '../setup/index.html';
} else {
  render();
}

// הערה: זהו מסך ה-admin ללא הגנת התחברות עדיין (יתווסף Firebase Auth בהמשך).
function render() {
  const family = getFamily();
  app.innerHTML = `
    <div class="top-bar">
      <a class="btn ghost" href="../index.html">‹ למסך הילדים</a>
      <h1>ניהול - ${family.name}</h1>
    </div>
    <p style="color:var(--muted)">${new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

    ${family.kids.map(kid => renderKidCard(kid)).join('')}

    <div class="link-row"><a href="../setup/index.html">עריכת ילדים ומשימות</a></div>
  `;

  family.kids.forEach(kid => {
    const ta = document.getElementById('hw-' + kid.id);
    ta.addEventListener('input', () => setHomeworkText(kid.id, ta.value));

    const redeemBtn = document.getElementById('redeem-' + kid.id);
    redeemBtn.addEventListener('click', () => {
      if (confirm(`לאפס את יתרת הנקודות הניתנות למימוש של ${kid.name}?`)) {
        redeemPoints(kid.id);
        render();
      }
    });
  });
}

function renderKidCard(kid) {
  const day = getDay(kid.id);
  const points = getPoints(kid.id);
  return `
    <div class="card">
      <h2>${kid.name}</h2>
      <div class="points-row">
        <div class="points-chip">🏆 <span class="num">${points.lifetime}</span> סה"כ (לא מתאפס)</div>
        <div class="points-chip">🎁 <span class="num">${points.redeemable}</span> ליתרה</div>
        <div class="points-chip">⭐ <span class="num">${points.daily}</span> היום</div>
      </div>
      <button class="btn secondary" id="redeem-${kid.id}">אפסתי - הילד/ה קיבל/ה תגמול 🎉</button>

      <div class="field" style="margin-top:18px;">
        <label>שיעורי בית להיום</label>
        <textarea id="hw-${kid.id}" rows="4" placeholder="למשל: 5 עמודים בחוברת חשבון, לקרוא פרק בספר...">${day.homeworkText || ''}</textarea>
      </div>
    </div>
  `;
}
