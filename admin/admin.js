import { onAuthChange, getFamilyIdForUser, signInWithGoogle, signOutUser } from '../js/auth.js';
import { getFamilyMeta, getKids, getDay, setHomeworkText, getPoints, redeemPoints, setBlessingText, getFamilyPoints } from '../js/db.js';

const app = document.getElementById('app');
app.innerHTML = '<p style="text-align:center; margin-top:60px;">טוען...</p>';

let familyId = null;
const debounceTimers = {};

onAuthChange(async (user) => {
  if (!user) {
    showSignIn();
    return;
  }
  familyId = await getFamilyIdForUser(user.uid);
  if (!familyId) {
    location.href = '../setup/index.html';
    return;
  }
  render(user);
});

function showSignIn() {
  app.innerHTML = `
    <div style="text-align:center; margin-top:60px;">
      <h2>ניהול - כניסת הורים 👨‍👩‍👧‍👦</h2>
      <button class="btn" id="google-signin">התחברות עם Google</button>
    </div>
  `;
  document.getElementById('google-signin').addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      alert('ההתחברות נכשלה: ' + err.message);
    }
  });
}

async function render(user) {
  app.innerHTML = '<p style="text-align:center; margin-top:60px;">טוען...</p>';
  const family = await getFamilyMeta(familyId);
  const kids = await getKids(familyId);
  const familyPoints = await getFamilyPoints(familyId);

  const kidCards = await Promise.all(kids.map(renderKidCard));

  app.innerHTML = `
    <div class="top-bar">
      <a class="btn ghost" href="../index.html">‹ למסך הילדים</a>
      <h1>ניהול - ${family?.name || ''}</h1>
    </div>
    <p style="color:var(--muted)">
      ${new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
      · מחובר כ-${user.email}
      · מונה משפחתי: <strong>${familyPoints}</strong>
      <button class="btn ghost" id="signout-btn" style="margin-right:10px;">התנתקות</button>
    </p>

    ${kidCards.join('')}

    <div class="card">
      <h2>מילה מאבא ואמא 💌</h2>
      <p style="color:var(--muted); margin-top:0;">מוצג לכל הילדים במסך הראשי.</p>
      <textarea id="blessing-text" rows="3" placeholder="למשל: אנחנו גאים בכם היום! ❤️">${family?.blessingText || ''}</textarea>
    </div>

    <div class="link-row"><a href="../setup/index.html">עריכת ילדים ומשימות</a></div>
  `;

  document.getElementById('signout-btn').addEventListener('click', () => signOutUser());

  const blessingTa = document.getElementById('blessing-text');
  blessingTa.addEventListener('input', () => {
    clearTimeout(debounceTimers.blessing);
    debounceTimers.blessing = setTimeout(() => setBlessingText(familyId, blessingTa.value), 600);
  });

  kids.forEach(kid => {
    const ta = document.getElementById('hw-' + kid.id);
    ta.addEventListener('input', () => {
      clearTimeout(debounceTimers[kid.id]);
      debounceTimers[kid.id] = setTimeout(() => setHomeworkText(familyId, kid.id, ta.value), 600);
    });

    const redeemBtn = document.getElementById('redeem-' + kid.id);
    redeemBtn.addEventListener('click', async () => {
      if (confirm(`לאפס את יתרת הנקודות הניתנות למימוש של ${kid.name}?`)) {
        await redeemPoints(familyId, kid.id);
        render(user);
      }
    });
  });
}

async function renderKidCard(kid) {
  const day = await getDay(familyId, kid.id);
  const points = await getPoints(familyId, kid.id);
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
