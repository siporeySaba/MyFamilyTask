import { onAuthChange, signInWithGoogle, signOutUser } from '../js/auth.js';
import { getSipureiSabaConfig, setSipureiSabaConfig } from '../js/db.js';
import { fileToResizedDataUrl } from '../js/imageUtil.js';
import { SUPER_ADMIN_EMAIL } from '../js/adminConfig.js';

const app = document.getElementById('app');
app.innerHTML = '<p style="text-align:center; margin-top:60px;">טוען...</p>';

const debounceTimers = {};

onAuthChange(async (user) => {
  if (!user) {
    showSignIn();
    return;
  }
  if (user.email !== SUPER_ADMIN_EMAIL) {
    showNotAuthorized(user);
    return;
  }
  render();
});

function showSignIn() {
  app.innerHTML = `
    <div style="text-align:center; margin-top:60px;">
      <h2>ניהול-על 🔐</h2>
      <button class="btn" id="google-signin">התחברות עם Google</button>
    </div>
  `;
  document.getElementById('google-signin').addEventListener('click', async () => {
    try { await signInWithGoogle(); }
    catch (err) { alert('ההתחברות נכשלה: ' + err.message); }
  });
}

function showNotAuthorized(user) {
  app.innerHTML = `
    <div style="text-align:center; margin-top:60px;">
      <h2>אין הרשאה 🚫</h2>
      <p style="color:var(--muted)">המשתמש ${user.email} אינו מורשה לעמוד זה.</p>
      <button class="btn ghost" id="signout-btn">התנתקות</button>
    </div>
  `;
  document.getElementById('signout-btn').addEventListener('click', () => signOutUser());
}

async function render() {
  const config = await getSipureiSabaConfig();
  app.innerHTML = `
    <div class="top-bar">
      <h1>ניהול-על - סיפורי סבא 📖</h1>
      <button class="btn ghost" id="signout-btn">התנתקות</button>
    </div>
    <p style="color:var(--muted)">משפיע על מסך הילדים בכל המשפחות באפליקציה.</p>

    <div class="card">
      <h2>לוגו</h2>
      <div style="display:flex; align-items:center; gap:14px;">
        <div id="logo-preview">
          ${config.logoUrl ? `<img src="${config.logoUrl}" alt="" style="height:80px; border-radius:10px;">` : '<span style="font-size:2.5rem;">📖</span>'}
        </div>
        <input type="file" accept="image/*" id="logo-file">
      </div>
    </div>

    <div class="card">
      <div class="field">
        <label>כיתוב קבוע</label>
        <input type="text" id="caption-text" value="${escapeAttr(config.caption || 'חפשו אותנו - "סיפורי סבא" - ביוטיוב ובספוטיפיי')}">
      </div>
      <div class="field">
        <label>הודעה מתחלפת (אופציונלי - למשל "היום עולה פרק חדש!")</label>
        <input type="text" id="announcement-text" value="${escapeAttr(config.announcement || '')}" placeholder="השאר ריק כדי לא להציג הודעה">
      </div>
    </div>
  `;

  document.getElementById('signout-btn').addEventListener('click', () => signOutUser());

  document.getElementById('logo-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file, 400, 0.85);
      await setSipureiSabaConfig({ logoUrl: dataUrl });
      document.getElementById('logo-preview').innerHTML = `<img src="${dataUrl}" alt="" style="height:80px; border-radius:10px;">`;
    } catch (err) {
      alert('שגיאה בהעלאת הלוגו: ' + err.message);
    }
  });

  const captionEl = document.getElementById('caption-text');
  captionEl.addEventListener('input', () => {
    clearTimeout(debounceTimers.caption);
    debounceTimers.caption = setTimeout(() => setSipureiSabaConfig({ caption: captionEl.value }), 600);
  });

  const announceEl = document.getElementById('announcement-text');
  announceEl.addEventListener('input', () => {
    clearTimeout(debounceTimers.announcement);
    debounceTimers.announcement = setTimeout(() => setSipureiSabaConfig({ announcement: announceEl.value }), 600);
  });
}

function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;');
}
