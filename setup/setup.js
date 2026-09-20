import { saveFamily, getFamily } from '../js/db.js';
import { TASK_CATALOG } from '../js/taskCatalog.js';

const app = document.getElementById('app');

// טוען משפחה קיימת אם יש (עריכה חוזרת), אחרת מתחיל ריק
const existing = getFamily();
let state = existing || { id: 'fam-' + Date.now(), name: '', kids: [] };

render();

function render() {
  app.innerHTML = `
    <h1>הגדרת המשפחה 👨‍👩‍👧‍👦</h1>

    <div class="card">
      <div class="field">
        <label>שם המשפחה</label>
        <input id="fam-name" type="text" placeholder="למשל: משפחת כהן" value="${escapeAttr(state.name)}">
      </div>
    </div>

    <div class="card">
      <h2>הילדים</h2>
      <div id="kids-list"></div>
      <button class="btn secondary" id="add-kid-btn">+ הוספת ילד/ה</button>
    </div>

    <button class="btn" id="save-btn">שמירה והמשך ←</button>
  `;

  document.getElementById('fam-name').addEventListener('input', e => state.name = e.target.value);
  document.getElementById('add-kid-btn').addEventListener('click', () => {
    state.kids.push({ id: 'kid-' + Date.now(), name: '', photoUrl: '', selectedTasks: [], dailyBonus: 5 });
    renderKids();
  });
  document.getElementById('save-btn').addEventListener('click', onSave);

  renderKids();
}

function renderKids() {
  const list = document.getElementById('kids-list');
  list.innerHTML = state.kids.map((kid, idx) => `
    <div class="card" style="background:#fbf5e6;">
      <div class="field">
        <label>שם הילד/ה</label>
        <input type="text" class="kid-name" data-idx="${idx}" value="${escapeAttr(kid.name)}" placeholder="למשל: נועה">
      </div>
      <div class="field">
        <label>תמונה</label>
        <div style="display:flex; align-items:center; gap:14px;">
          <div class="kid-avatar" style="width:70px;height:70px;font-size:1.8rem;">
            ${kid.photoUrl ? `<img src="${kid.photoUrl}" alt="">` : '🙂'}
          </div>
          <input type="file" accept="image/*" class="kid-photo-file" data-idx="${idx}">
        </div>
      </div>

      <div class="field">
        <label>בחירת משימות (עד 10 מתוך 15) + נקודות לכל משימה</label>
        <div class="task-pick-grid" data-kid-idx="${idx}">
          ${TASK_CATALOG.map(t => {
            const picked = kid.selectedTasks.find(st => st.taskId === t.id);
            return `
              <div class="task-pick ${picked ? 'selected' : ''}" data-task="${t.id}" data-idx="${idx}">
                <div class="icon">${t.emoji}</div>
                <div>${t.name}</div>
                ${picked ? `<input type="number" class="task-points" data-task="${t.id}" data-idx="${idx}" value="${picked.points}" min="0">` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="field">
        <label>בונוס נקודות ליום מלא</label>
        <input type="number" class="kid-bonus" data-idx="${idx}" value="${kid.dailyBonus}" min="0" style="max-width:120px;">
      </div>

      <button class="btn ghost remove-kid" data-idx="${idx}">הסרת ילד/ה</button>
    </div>
  `).join('') || '<p style="color:var(--muted)">עדיין לא נוספו ילדים.</p>';

  list.querySelectorAll('.kid-name').forEach(el => el.addEventListener('input', e => {
    state.kids[e.target.dataset.idx].name = e.target.value;
  }));
  list.querySelectorAll('.kid-photo-file').forEach(el => el.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const idx = e.target.dataset.idx;
    const reader = new FileReader();
    reader.onload = () => {
      state.kids[idx].photoUrl = reader.result; // data URL - נשמר ישירות, בלי אחסון חיצוני
      renderKids();
    };
    reader.readAsDataURL(file);
  }));
  list.querySelectorAll('.kid-bonus').forEach(el => el.addEventListener('input', e => {
    state.kids[e.target.dataset.idx].dailyBonus = Number(e.target.value) || 0;
  }));
  list.querySelectorAll('.remove-kid').forEach(el => el.addEventListener('click', e => {
    state.kids.splice(Number(e.target.dataset.idx), 1);
    renderKids();
  }));
  list.querySelectorAll('.task-pick').forEach(el => el.addEventListener('click', e => {
    // אל תפעיל את הבחירה אם לחצו על שדה המספר עצמו
    if (e.target.classList.contains('task-points')) return;
    const idx = Number(el.dataset.idx);
    const taskId = el.dataset.task;
    const kid = state.kids[idx];
    const existingPick = kid.selectedTasks.find(st => st.taskId === taskId);
    if (existingPick) {
      kid.selectedTasks = kid.selectedTasks.filter(st => st.taskId !== taskId);
    } else {
      if (kid.selectedTasks.length >= 10) {
        alert('ניתן לבחור עד 10 משימות לכל ילד.');
        return;
      }
      kid.selectedTasks.push({ taskId, points: 5 });
    }
    renderKids();
  }));
  list.querySelectorAll('.task-points').forEach(el => el.addEventListener('input', e => {
    const idx = Number(e.target.dataset.idx);
    const taskId = e.target.dataset.task;
    const kid = state.kids[idx];
    const pick = kid.selectedTasks.find(st => st.taskId === taskId);
    if (pick) pick.points = Number(e.target.value) || 0;
  }));
}

function onSave() {
  if (!state.name.trim()) { alert('נא להזין שם משפחה'); return; }
  if (state.kids.length === 0) { alert('נא להוסיף לפחות ילד אחד'); return; }
  for (const kid of state.kids) {
    if (!kid.name.trim()) { alert('נא למלא שם לכל ילד'); return; }
  }
  saveFamily(state);
  // ניווט עמיד: גוזרים את שורש האתר מתוך הנתיב הנוכחי (לא תלוי אם הכתובת
  // הסתיימה ב-"/" או לא), כדי שהניתוב לא "יקפוץ" רמה אחת יותר מדי למעלה.
  const root = location.pathname.replace(/setup\/?(index\.html)?$/, '');
  location.href = root + 'index.html';
}

function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;');
}
