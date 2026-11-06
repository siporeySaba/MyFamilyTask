import { getCatalogTask } from './taskCatalog.js';

// מצב הדגמה מקומי לבדיקות בלבד (localhost?demo) – לא נוגע בנתונים אמיתיים
const DEMO = ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).has('demo');
const api = DEMO ? await import('./demoDb.js') : await import('./db.js');
const { getFamilyMeta, getKids, getKid, getDay, toggleTask, getPoints, getFamilyPoints, getSipureiSabaConfig, todayStr } = api;

const app = document.getElementById('app');
const IDLE_MS = 3 * 60 * 1000; // חזרה למסך "מי זה?" אחרי 3 דקות בלי מגע

let currentFamilyId = null;
let screen = { name: 'loading', kidId: null, date: todayStr() };
let idleTimer = null;

app.innerHTML = loadingHtml();

function loadingHtml() {
  return '<div class="loading"><div class="spinner"></div></div>';
}

if (DEMO) {
  currentFamilyId = 'demo';
  showKidSelect();
} else {
  const { onAuthChange, getFamilyIdForUser } = await import('./auth.js');
  onAuthChange(async (user) => {
    if (!user) return showNotSignedIn();
    const familyId = await getFamilyIdForUser(user.uid);
    if (!familyId) return showNoFamilyYet();
    currentFamilyId = familyId;
    showKidSelect();
  });
}

// ---------- רענון אוטומטי בחצות / כשחוזרים לטאבלט ----------
function refreshIfNewDay() {
  if (!currentFamilyId) return;
  if (screen.date !== todayStr()) {
    if (screen.name === 'tasks') showTasks(screen.kidId);
    else showKidSelect();
  }
}
setInterval(refreshIfNewDay, 60 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshIfNewDay(); });

function resetIdle() {
  clearTimeout(idleTimer);
  if (screen.name === 'tasks') idleTimer = setTimeout(showKidSelect, IDLE_MS);
}
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, resetIdle, { passive: true }));

// ---------- מסכים ----------
function showNotSignedIn() {
  screen = { name: 'signin', date: todayStr() };
  app.innerHTML = `
    <div class="empty-state">
      <div class="big-emoji">👋</div>
      <h2>עדיין לא מחוברים</h2>
      <p>יש לבקש מהורה להתחבר דרך מסך הניהול.</p>
      <a class="btn" href="admin/index.html">כניסת הורים</a>
    </div>
  `;
}

function showNoFamilyYet() {
  screen = { name: 'nofamily', date: todayStr() };
  app.innerHTML = `
    <div class="empty-state">
      <div class="big-emoji">🏡</div>
      <h2>עוד לא הוגדרה משפחה</h2>
      <a class="btn" href="setup/index.html">להגדרת המשפחה</a>
    </div>
  `;
}

async function showKidSelect() {
  clearTimeout(idleTimer);
  screen = { name: 'kids', date: todayStr() };
  app.innerHTML = loadingHtml();
  try {
    const [kids, family, familyPoints, sipureiSaba] = await Promise.all([
      getKids(currentFamilyId),
      getFamilyMeta(currentFamilyId),
      getFamilyPoints(currentFamilyId),
      getSipureiSabaConfig(),
    ]);
    app.innerHTML = `
      <header class="hello">
        <h1>שלום! מי זה? 👋</h1>
        <div class="family-chip">🏡 <span class="num">${familyPoints}</span> נקודות משפחתיות</div>
      </header>
      <div class="kid-grid">
        ${kids.map((kid, i) => `
          <button class="kid-card" data-kid="${kid.id}" style="--i:${i}">
            <div class="kid-avatar">${kid.photoUrl ? `<img src="${kid.photoUrl}" alt="">` : '🙂'}</div>
            <div class="kid-name">${escapeHtml(kid.name)}</div>
          </button>
        `).join('')}
      </div>
      ${family?.blessingText ? `
        <div class="blessing-corner">
          <div class="blessing-icon">💌</div>
          <p>${escapeHtml(family.blessingText)}</p>
        </div>
      ` : ''}
      <div class="sipurei-saba-footer">
        ${sipureiSaba.logoUrl
          ? `<img src="${sipureiSaba.logoUrl}" alt="סיפורי סבא">`
          : `<span class="logo-placeholder">📖</span>`}
        <span class="caption">${escapeHtml(sipureiSaba.caption || 'חפשו אותנו - "סיפורי סבא" - ביוטיוב ובספוטיפיי')}</span>
        ${sipureiSaba.announcement ? `<span class="announcement">${escapeHtml(sipureiSaba.announcement)}</span>` : ''}
      </div>
    `;
    app.querySelectorAll('.kid-card').forEach(el => {
      el.addEventListener('click', () => showTasks(el.dataset.kid));
    });
  } catch (err) {
    showError(err, showKidSelect);
  }
}

async function showTasks(kidId) {
  screen = { name: 'tasks', kidId, date: todayStr() };
  resetIdle();
  app.innerHTML = loadingHtml();
  let kid, day, points;
  try {
    [kid, day, points] = await Promise.all([
      getKid(currentFamilyId, kidId),
      getDay(currentFamilyId, kidId),
      getPoints(currentFamilyId, kidId),
    ]);
  } catch (err) {
    return showError(err, () => showTasks(kidId));
  }
  if (!kid) return showKidSelect();
  const taskIds = kid.selectedTasks || [];
  const completed = { ...(day.completed || {}) };

  app.innerHTML = `
    <div class="top-bar">
      <button class="back-btn" id="back-btn">→ החלפת ילד</button>
      <div class="kid-head">
        <div class="kid-avatar small">${kid.photoUrl ? `<img src="${kid.photoUrl}" alt="">` : '🙂'}</div>
        <h2>${escapeHtml(kid.name)}</h2>
      </div>
    </div>
    <div class="points-row">
      <div class="points-chip today">⭐ <span class="num" id="p-daily">${points.daily}</span><small>היום</small></div>
      <div class="points-chip">🎁 <span class="num" id="p-redeem">${points.redeemable}</span><small>ליתרה</small></div>
      <div class="points-chip">🏆 <span class="num" id="p-life">${points.lifetime}</span><small>סה"כ</small></div>
    </div>
    <div class="progress">
      <div class="progress-bar-wrap"><div class="progress-bar-fill" id="prog"></div></div>
      <div class="progress-label" id="prog-label"></div>
    </div>
    <div class="task-grid">
      ${taskIds.map((t, i) => {
        const cat = getCatalogTask(t.taskId);
        const done = !!completed[t.taskId];
        return `
          <button class="task-tile ${done ? 'done' : ''}" data-task="${t.taskId}" style="--i:${i}">
            <div class="icon">${cat ? cat.emoji : '❓'}</div>
            <div class="label">${cat ? cat.name : escapeHtml(t.taskId)}</div>
            <div class="pts">+${Number(t.points) || 0}</div>
          </button>
        `;
      }).join('')}
    </div>
    <div id="homework-modal-slot"></div>
    <div id="celebrate" class="celebrate" hidden>🎉</div>
  `;

  const updateProgress = () => {
    const doneCount = taskIds.filter(t => completed[t.taskId]).length;
    const pct = taskIds.length ? Math.round((doneCount / taskIds.length) * 100) : 0;
    document.getElementById('prog').style.width = pct + '%';
    document.getElementById('prog-label').textContent =
      doneCount === taskIds.length && taskIds.length ? 'כל הכבוד! סיימת הכול 🎉' : `${doneCount} מתוך ${taskIds.length}`;
  };
  const setPoints = p => {
    document.getElementById('p-daily').textContent = p.daily;
    document.getElementById('p-redeem').textContent = p.redeemable;
    document.getElementById('p-life').textContent = p.lifetime;
  };
  updateProgress();

  document.getElementById('back-btn').addEventListener('click', showKidSelect);

  // סימון מהיר: המסך מתעדכן מיד, השמירה רצה ברקע. אם נכשלה – חוזר אחורה.
  async function setTask(taskId, forceDone) {
    const tile = app.querySelector(`.task-tile[data-task="${taskId}"]`);
    const before = !!completed[taskId];
    const target = forceDone === undefined ? !before : forceDone;
    if (target === before) return;
    completed[taskId] = target;
    tile.classList.toggle('done', target);
    if (target) tile.classList.add('pop');
    updateProgress();
    tile.disabled = true;
    try {
      const res = await toggleTask(currentFamilyId, kidId, taskId, target);
      setPoints(res.points);
      if (res.bonusChange > 0) celebrate();
    } catch (err) {
      console.error(err);
      completed[taskId] = before;
      tile.classList.toggle('done', before);
      updateProgress();
      toast('אופס, לא נשמר. בדקו את האינטרנט 🙏');
    } finally {
      tile.disabled = false;
      setTimeout(() => tile.classList.remove('pop'), 500);
    }
  }

  app.querySelectorAll('.task-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const taskId = tile.dataset.task;
      const cat = getCatalogTask(taskId);
      if (cat && cat.special === 'homework') return openHomeworkModal(kidId, kid.name, !!completed[taskId], setTask);
      setTask(taskId);
    });
  });
}

async function openHomeworkModal(kidId, kidName, isDone, setTask) {
  const slot = document.getElementById('homework-modal-slot');
  let day;
  try { day = await getDay(currentFamilyId, kidId); } catch { day = {}; }
  slot.innerHTML = `
    <div class="modal-backdrop" id="hw-backdrop">
      <div class="modal">
        <button class="close-x" id="hw-close" aria-label="סגירה">✕</button>
        <h3>שיעורי בית של ${escapeHtml(kidName)} 📚</h3>
        <p class="hw-text">${day.homeworkText ? escapeHtml(day.homeworkText) : 'לא הוזנו שיעורי בית להיום.'}</p>
        ${isDone
          ? `<button class="btn ghost-btn" id="hw-toggle">↩ עוד לא סיימתי</button>`
          : `<button class="btn secondary" id="hw-toggle">סיימתי! ✓</button>`}
      </div>
    </div>
  `;
  const close = () => { slot.innerHTML = ''; };
  document.getElementById('hw-close').addEventListener('click', close);
  document.getElementById('hw-backdrop').addEventListener('click', e => { if (e.target.id === 'hw-backdrop') close(); });
  document.getElementById('hw-toggle').addEventListener('click', () => {
    close();
    setTask('homework', !isDone);
  });
}

function celebrate() {
  const el = document.getElementById('celebrate');
  if (!el) return;
  el.hidden = false;
  el.classList.remove('go');
  void el.offsetWidth;
  el.classList.add('go');
  setTimeout(() => { el.hidden = true; }, 1800);
  toast('יום מלא! קיבלת בונוס 🌟');
}

function showError(err, retry) {
  console.error(err);
  app.innerHTML = `
    <div class="empty-state">
      <div class="big-emoji">📡</div>
      <h2>לא הצלחנו לטעון</h2>
      <p>בדקו את החיבור לאינטרנט</p>
      <button class="btn" id="retry">נסו שוב</button>
    </div>`;
  document.getElementById('retry').addEventListener('click', retry);
}

let toastTimer;
function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
