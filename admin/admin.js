import { onAuthChange, getFamilyIdForUser, signInWithGoogle, signOutUser } from '../js/auth.js';
import { getFamilyMeta, getKids, getDay, setHomeworkText, getPoints, redeemPoints, setBlessingText, getFamilyPoints, getRecentDays, setOrderStatus } from '../js/db.js';

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
      <h1>ניהול - ${esc(family?.name || '')}</h1>
    </div>
    <p style="color:var(--muted)">
      ${new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
      · מחובר כ-${esc(user.email)}
      · מונה משפחתי: <strong>${familyPoints}</strong>
      <button class="btn ghost" id="signout-btn" style="margin-right:10px;">התנתקות</button>
    </p>

    ${kidCards.join('')}

    <div class="card">
      <h2>מילה מאבא ואמא 💌</h2>
      <p style="color:var(--muted); margin-top:0;">מוצג לכל הילדים במסך הראשי.</p>
      <textarea id="blessing-text" rows="3" placeholder="למשל: אנחנו גאים בכם היום! ❤️">${esc(family?.blessingText || '')}</textarea>
    </div>

    <div class="link-row">
      <a href="../setup/index.html">עריכת ילדים ומשימות</a> ·
      <a href="../shop/print.html" target="_blank">🖨️ מחירון חנות ההפתעות להדפסה</a>
    </div>
  `;

  document.getElementById('signout-btn').addEventListener('click', () => signOutUser());

  const blessingTa = document.getElementById('blessing-text');
  blessingTa.addEventListener('input', () => {
    clearTimeout(debounceTimers.blessing);
    debounceTimers.blessing = setTimeout(() => setBlessingText(familyId, blessingTa.value), 600);
  });

  app.querySelectorAll('[data-order-act]').forEach(btn => btn.addEventListener('click', async () => {
    const { kid: kidId, order, orderAct } = btn.dataset;
    const kid = kids.find(k => k.id === kidId);
    const o = (kid?.shopOrders || []).find(x => x.id === order);
    if (!o) return;
    if (orderAct === 'cancelled' && !confirm(`לבטל את ${o.name} ולהחזיר ל${kid.name} ${o.cost} נקודות?`)) return;
    btn.disabled = true;
    try {
      await setOrderStatus(familyId, kidId, order, orderAct);
      render(user);
    } catch (err) {
      btn.disabled = false;
      alert('השמירה נכשלה: ' + err.message);
    }
  }));

  kids.forEach(kid => {
    const ta = document.getElementById('hw-' + kid.id);
    ta.addEventListener('input', () => {
      clearTimeout(debounceTimers[kid.id]);
      debounceTimers[kid.id] = setTimeout(() => setHomeworkText(familyId, kid.id, ta.value), 600);
    });

    const redeemBtn = document.getElementById('redeem-' + kid.id);
    const amountInput = document.getElementById('redeem-amount-' + kid.id);
    redeemBtn.addEventListener('click', async () => {
      const amount = Math.floor(Number(amountInput.value));
      const available = Number(amountInput.max) || 0;
      if (!amount || amount < 1) {
        alert('נא להזין כמה נקודות עלה התגמול.');
        return;
      }
      if (amount > available) {
        alert(`ליתרה של ${kid.name} יש רק ${available} נקודות.`);
        return;
      }
      if (confirm(`לנכות ${amount} נקודות מהיתרה של ${kid.name}?`)) {
        await redeemPoints(familyId, kid.id, amount);
        render(user);
      }
    });
  });
}

async function renderKidCard(kid) {
  const [day, points, week] = await Promise.all([
    getDay(familyId, kid.id),
    getPoints(familyId, kid.id),
    getRecentDays(familyId, kid.id, 7),
  ]);
  const ids = (kid.selectedTasks || []).map(t => t.taskId);
  const dayNames = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const bars = week.map((d, i) => {
    const done = ids.filter(id => d.completed?.[id]).length;
    const pct = ids.length ? Math.round((done / ids.length) * 100) : 0;
    const wd = dayNames[new Date(d.date + 'T12:00').getDay()];
    return `<div class="wk-day${i === week.length - 1 ? ' today' : ''}" title="${done}/${ids.length}">
        <div class="wk-bar"><span style="height:${pct}%" class="${pct === 100 ? 'full' : ''}"></span></div>
        <div class="wk-lbl">${wd}</div>
      </div>`;
  }).join('');
  return `
    <div class="card">
      <h2>${esc(kid.name)}</h2>
      <div class="week">
        <div class="week-title">השבוע האחרון</div>
        <div class="wk-row">${bars}</div>
      </div>
      <div class="points-row">
        <div class="points-chip">🏆 <span class="num">${points.lifetime}</span> סה"כ (לא מתאפס)</div>
        <div class="points-chip">🎁 <span class="num">${points.redeemable}</span> ליתרה</div>
        <div class="points-chip">⭐ <span class="num">${points.daily}</span> היום</div>
      </div>
      ${ordersHtml(kid)}
      <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <input type="number" id="redeem-amount-${kid.id}" min="1" max="${points.redeemable}" inputmode="numeric"
               placeholder="כמה נקודות עלה התגמול?" style="max-width:200px;">
        <button class="btn secondary" id="redeem-${kid.id}">מימוש תגמול 🎉</button>
      </div>

      <div class="field" style="margin-top:18px;">
        <label>שיעורי בית להיום</label>
        <textarea id="hw-${kid.id}" rows="4" placeholder="למשל: 5 עמודים בחוברת חשבון, לקרוא פרק בספר...">${esc(day.homeworkText || '')}</textarea>
      </div>
    </div>
  `;
}

// הזמנות מחנות ההפתעות: מה שמחכה למסירה + היסטוריה קצרה
function ordersHtml(kid) {
  const orders = kid.shopOrders || [];
  const pending = orders.filter(o => o.status === 'pending');
  const recent = orders.filter(o => o.status === 'delivered').slice(-3).reverse();
  const when = t => new Date(t).toLocaleString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (!pending.length && !recent.length) return '';
  return `
    <div class="adm-orders">
      <div class="adm-orders-title">🛍️ מחנות ההפתעות${pending.length ? ` – מחכה למסירה (${pending.length})` : ''}</div>
      ${pending.map(o => `
        <div class="adm-order">
          <span class="what">${o.emoji} ${esc(o.name)} · ${o.cost} נק׳</span>
          <span class="when">${when(o.at)}</span>
          <button class="ok" data-order-act="delivered" data-kid="${kid.id}" data-order="${o.id}">✓ נמסר</button>
          <button class="undo" data-order-act="cancelled" data-kid="${kid.id}" data-order="${o.id}">ביטול והחזר נקודות</button>
        </div>`).join('')}
      ${recent.length ? `<div class="adm-history">נמסר לאחרונה: ${recent.map(o => `${o.emoji} ${esc(o.name)}`).join(' · ')}</div>` : ''}
    </div>`;
}

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
