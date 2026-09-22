import { onAuthChange, getFamilyIdForUser } from './auth.js';
import { getFamilyMeta, getKids, getKid, getDay, toggleTaskDone, getPoints, addPoints, removePoints, getFamilyPoints, syncDailyBonus } from './db.js';
import { getCatalogTask } from './taskCatalog.js';

const app = document.getElementById('app');
app.innerHTML = '<p style="text-align:center; margin-top:60px;">טוען...</p>';

let currentFamilyId = null;

onAuthChange(async (user) => {
  if (!user) {
    showNotSignedIn();
    return;
  }
  const familyId = await getFamilyIdForUser(user.uid);
  if (!familyId) {
    showNoFamilyYet();
    return;
  }
  currentFamilyId = familyId;
  showKidSelect();
});

function showNotSignedIn() {
  app.innerHTML = `
    <div style="text-align:center; margin-top:60px;">
      <h2>עדיין לא מחוברים 👋</h2>
      <p>יש לבקש מהורה להתחבר דרך מסך הניהול.</p>
      <a class="btn" href="admin/index.html">כניסת הורים</a>
    </div>
  `;
}

function showNoFamilyYet() {
  app.innerHTML = `
    <div style="text-align:center; margin-top:60px;">
      <h2>עוד לא הוגדרה משפחה 🙂</h2>
      <a class="btn" href="setup/index.html">להגדרת המשפחה</a>
    </div>
  `;
}

async function showKidSelect() {
  app.innerHTML = '<p style="text-align:center; margin-top:60px;">טוען...</p>';
  const [kids, family, familyPoints] = await Promise.all([
    getKids(currentFamilyId),
    getFamilyMeta(currentFamilyId),
    getFamilyPoints(currentFamilyId),
  ]);
  app.innerHTML = `
    <div class="top-bar" style="justify-content:center; gap:14px;">
      <h1 style="margin:0;">שלום! 👋 מי זה?</h1>
    </div>
    <div style="text-align:center; margin-bottom:20px;">
      <div class="points-chip" style="display:inline-flex;">🏡 <span class="num">${familyPoints}</span> מונה משפחתי</div>
    </div>
    <div class="kid-grid">
      ${kids.map(kid => `
        <div class="kid-card" data-kid="${kid.id}">
          <div class="kid-avatar">${kid.photoUrl ? `<img src="${kid.photoUrl}" alt="${kid.name}">` : '🙂'}</div>
          <div class="kid-name">${kid.name}</div>
        </div>
      `).join('')}
    </div>
    ${family?.blessingText ? `
      <div class="blessing-corner">
        <div class="blessing-icon">💌</div>
        <p>${escapeHtml(family.blessingText)}</p>
      </div>
    ` : ''}
    <div class="sipurei-saba-footer">
      ${family?.sipureiSabaLogoUrl
        ? `<img src="${family.sipureiSabaLogoUrl}" alt="סיפורי סבא">`
        : `<span class="logo-placeholder">📖</span>`}
      <span>חפשו אותנו - "סיפורי סבא" - ביוטיוב ובספוטיפיי</span>
    </div>
  `;
  app.querySelectorAll('.kid-card').forEach(el => {
    el.addEventListener('click', () => showTasks(el.dataset.kid));
  });
}

async function showTasks(kidId) {
  app.innerHTML = '<p style="text-align:center; margin-top:60px;">טוען...</p>';
  const kid = await getKid(currentFamilyId, kidId);
  const day = await getDay(currentFamilyId, kidId);
  const points = await getPoints(currentFamilyId, kidId);
  const taskIds = kid.selectedTasks || [];
  const doneCount = taskIds.filter(t => day.completed?.[t.taskId]).length;
  const pct = taskIds.length ? Math.round((doneCount / taskIds.length) * 100) : 0;

  app.innerHTML = `
    <div class="top-bar">
      <button class="btn ghost" id="back-btn">‹ החלפת ילד</button>
      <h2>${kid.name}</h2>
    </div>
    <div class="points-row">
      <div class="points-chip">🏆 <span class="num">${points.lifetime}</span> סה"כ</div>
      <div class="points-chip">🎁 <span class="num">${points.redeemable}</span> ליתרה</div>
      <div class="points-chip">⭐ <span class="num">${points.daily}</span> היום</div>
    </div>
    <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
    <div class="task-grid">
      ${taskIds.map(t => {
        const cat = getCatalogTask(t.taskId);
        const done = !!day.completed?.[t.taskId];
        return `
          <button class="task-tile ${done ? 'done' : ''}" data-task="${t.taskId}" data-points="${t.points || 0}">
            <div class="icon">${cat ? cat.emoji : '❓'}</div>
            <div class="label">${cat ? cat.name : t.taskId}</div>
          </button>
        `;
      }).join('')}
    </div>
    <div id="homework-modal-slot"></div>
  `;

  document.getElementById('back-btn').addEventListener('click', showKidSelect);

  app.querySelectorAll('.task-tile').forEach(tile => {
    tile.addEventListener('click', async () => {
      const taskId = tile.dataset.task;
      const cat = getCatalogTask(taskId);
      if (cat && cat.special === 'homework') {
        openHomeworkModal(kidId, kid.name);
        return;
      }
      const pointsVal = Number(tile.dataset.points) || 0;
      tile.style.pointerEvents = 'none'; // מונע לחיצה כפולה בזמן שהבקשה רצה
      const nowDone = await toggleTaskDone(currentFamilyId, kidId, taskId);
      if (nowDone) await addPoints(currentFamilyId, kidId, pointsVal);
      else await removePoints(currentFamilyId, kidId, pointsVal);
      await syncDailyBonus(currentFamilyId, kidId);
      showTasks(kidId); // רענון מלא (גם שבבי הנקודות ופס ההתקדמות)
    });
  });
}

async function openHomeworkModal(kidId, kidName) {
  const day = await getDay(currentFamilyId, kidId);
  const slot = document.getElementById('homework-modal-slot');
  slot.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <button class="close-x" id="hw-close">✕</button>
        <h3>שיעורי בית של ${kidName} 📚</h3>
        <p style="white-space:pre-wrap; min-height:60px;">${day.homeworkText ? escapeHtml(day.homeworkText) : 'לא הוזנו שיעורי בית להיום.'}</p>
        <button class="btn secondary" id="hw-mark-done">סיימתי! ✓</button>
      </div>
    </div>
  `;
  document.getElementById('hw-close').addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('hw-mark-done').addEventListener('click', async () => {
    slot.innerHTML = '';
    const kid = await getKid(currentFamilyId, kidId);
    const hwEntry = (kid.selectedTasks || []).find(t => t.taskId === 'homework');
    const pointsVal = hwEntry ? (hwEntry.points || 0) : 0;
    const nowDone = await toggleTaskDone(currentFamilyId, kidId, 'homework');
    if (nowDone) await addPoints(currentFamilyId, kidId, pointsVal);
    else await removePoints(currentFamilyId, kidId, pointsVal);
    await syncDailyBonus(currentFamilyId, kidId);
    showTasks(kidId);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
