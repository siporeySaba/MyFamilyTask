import { getFamily, isFamilySetup, getDay, toggleTaskDone, setHomeworkText, getPoints, addPoints, removePoints, todayStr } from './db.js';
import { getCatalogTask } from './taskCatalog.js';

const app = document.getElementById('app');

if (!isFamilySetup()) {
  location.href = 'setup/index.html';
} else {
  showKidSelect();
}

function showKidSelect() {
  const family = getFamily();
  app.innerHTML = `
    <h1>שלום! 👋 מי זה? </h1>
    <div class="kid-grid">
      ${family.kids.map(kid => `
        <div class="kid-card" data-kid="${kid.id}">
          <div class="kid-avatar">${kid.photoUrl ? `<img src="${kid.photoUrl}" alt="${kid.name}">` : '🙂'}</div>
          <div class="kid-name">${kid.name}</div>
        </div>
      `).join('')}
    </div>
    <div class="link-row"><a href="admin/index.html">כניסת הורים</a></div>
  `;
  app.querySelectorAll('.kid-card').forEach(el => {
    el.addEventListener('click', () => showTasks(el.dataset.kid));
  });
}

function showTasks(kidId) {
  const family = getFamily();
  const kid = family.kids.find(k => k.id === kidId);
  const day = getDay(kidId);
  const points = getPoints(kidId);
  const taskIds = kid.selectedTasks || [];
  const doneCount = taskIds.filter(t => day.completed[t.taskId]).length;
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
        const done = !!day.completed[t.taskId];
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
    tile.addEventListener('click', () => {
      const taskId = tile.dataset.task;
      const cat = getCatalogTask(taskId);
      if (cat && cat.special === 'homework') {
        openHomeworkModal(kidId, kid.name);
        return;
      }
      const pointsVal = Number(tile.dataset.points) || 0;
      const nowDone = toggleTaskDone(kidId, taskId);
      if (nowDone) addPoints(kidId, pointsVal); else removePoints(kidId, pointsVal);
      showTasks(kidId); // re-render (also refreshes points chips + progress bar)
    });
  });
}

function openHomeworkModal(kidId, kidName) {
  const day = getDay(kidId);
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
  document.getElementById('hw-mark-done').addEventListener('click', () => {
    slot.innerHTML = '';
    const family = getFamily();
    const kid = family.kids.find(k => k.id === kidId);
    const hwEntry = (kid.selectedTasks || []).find(t => t.taskId === 'homework');
    const pointsVal = hwEntry ? (hwEntry.points || 0) : 0;
    const nowDone = toggleTaskDone(kidId, 'homework');
    if (nowDone) addPoints(kidId, pointsVal); else removePoints(kidId, pointsVal);
    showTasks(kidId);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
