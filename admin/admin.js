import { onAuthChange, getFamilyIdForUser, signInWithGoogle, signOutUser } from '../js/auth.js';
import { getFamilyMeta, getKids, getDay, setHomeworkText, getPoints, redeemPoints, setBlessingText, getFamilyPoints, getRecentDays, setOrderStatus, buyItem, grantPoints } from '../js/db.js';
import { SHOP_ITEMS, getShopItem } from '../js/shopCatalog.js';

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
    const itemSelect = document.getElementById('redeem-item-' + kid.id);
    const hint = document.getElementById('redeem-hint-' + kid.id);
    const hintDefault = hint.textContent;
    // מראה מראש כמה יישאר לילד אחרי ההורדה
    const updateHint = () => {
      const amount = Math.floor(Number(amountInput.value));
      const available = Number(amountInput.max) || 0;
      if (!amount) { hint.textContent = hintDefault; hint.classList.remove('bad'); return; }
      const left = available - amount;
      hint.textContent = left >= 0
        ? `יורדות ${amount} נקודות · יישארו ל${kid.name} ${left} נקודות`
        : `ליתרה של ${kid.name} יש רק ${available} נקודות (חסרות ${-left})`;
      hint.classList.toggle('bad', left < 0);
    };
    amountInput.addEventListener('input', updateHint);
    itemSelect.addEventListener('change', () => {
      const it = getShopItem(itemSelect.value);
      amountInput.value = it ? it.cost : '';
      updateHint();
    });

    const grantInput = document.getElementById('grant-amount-' + kid.id);
    const grantBtn = document.getElementById('grant-' + kid.id);
    app.querySelectorAll(`[data-grant-quick="${kid.id}"]`).forEach(b =>
      b.addEventListener('click', () => { grantInput.value = b.dataset.n; }));
    grantBtn.addEventListener('click', async () => {
      const amount = Math.floor(Number(grantInput.value));
      if (!amount || amount < 1) return alert('נא להזין כמה נקודות להוסיף.');
      if (amount > 1000 && !confirm(`${amount} נקודות זה הרבה. להמשיך?`)) return;
      if (!confirm(`להוסיף ל${kid.name} ${amount} נקודות בונוס?`)) return;
      grantBtn.disabled = true;
      try {
        await grantPoints(familyId, kid.id, amount);
        render(user);
      } catch (err) {
        grantBtn.disabled = false;
        alert('השמירה נכשלה: ' + err.message);
      }
    });
    redeemBtn.addEventListener('click', async () => {
      const it = getShopItem(itemSelect.value);
      // נבחרה הפתעה מהחנות והסכום לא שונה ידנית: נרשם גם בהיסטוריה ("נמסר לאחרונה")
      if (it && Number(amountInput.value) === it.cost) {
        if (!confirm(`לקנות ל${kid.name} ${it.name} ב-${it.cost} נקודות?`)) return;
        redeemBtn.disabled = true;
        try {
          const { order } = await buyItem(familyId, kid.id, it.id);
          await setOrderStatus(familyId, kid.id, order.id, 'delivered');
          render(user);
        } catch (err) {
          redeemBtn.disabled = false;
          alert(err.message === 'not-enough' ? `ליתרה של ${kid.name} אין מספיק נקודות.` : 'השמירה נכשלה: ' + err.message);
        }
        return;
      }
      const amount = Math.floor(Number(amountInput.value));
      const available = Number(amountInput.max) || 0;
      if (!amount || amount < 1) {
        alert('נא להזין כמה נקודות להוריד (המחיר של התגמול).');
        return;
      }
      if (amount > available) {
        alert(`ליתרה של ${kid.name} יש רק ${available} נקודות.`);
        return;
      }
      if (confirm(`להוריד ${amount} נקודות מהיתרה של ${kid.name}? יישארו ${available - amount}.`)) {
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
      <div class="pts-box redeem">
        <div class="pts-box-title">🎁 מימוש תגמול – <b>הורדת</b> נקודות מהיתרה</div>
        <div class="pts-box-row">
          <select id="redeem-item-${kid.id}" style="max-width:260px;">
            <option value="">בחירת הפתעה מהחנות…</option>
            ${[...SHOP_ITEMS].sort((a, b) => a.cost - b.cost).map(it => `
              <option value="${it.id}" ${it.cost > points.redeemable ? 'disabled' : ''}>
                ${it.emoji} ${esc(it.name)} – ${it.cost}${it.cost > points.redeemable ? ` (חסרות ${it.cost - points.redeemable})` : ''}
              </option>`).join('')}
          </select>
          <input type="number" id="redeem-amount-${kid.id}" min="1" max="${points.redeemable}" inputmode="numeric"
                 placeholder="כמה נקודות להוריד?" style="max-width:180px;">
          <button class="btn secondary" id="redeem-${kid.id}">מימוש תגמול 🎉</button>
        </div>
        <div class="pts-hint" id="redeem-hint-${kid.id}">בוחרים הפתעה או מקלידים את המחיר שלה בנקודות. הסכום הזה יורד מהיתרה.</div>
      </div>
      <div class="pts-box grant">
        <div class="pts-box-title">⭐ בונוס – <b>הוספת</b> נקודות</div>
        <div class="pts-box-row">
          ${[5, 10, 20, 50].map(n => `<button class="chip-btn" data-grant-quick="${kid.id}" data-n="${n}">+${n}</button>`).join('')}
          <input type="number" id="grant-amount-${kid.id}" min="1" inputmode="numeric" placeholder="כמה נקודות להוסיף?" style="max-width:180px;">
          <button class="btn" id="grant-${kid.id}">הוספת נקודות ⭐</button>
        </div>
        <div class="pts-hint">הנקודות נכנסות מיד ליתרה (אפשר לממש כבר היום) וגם לסה"כ.</div>
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
