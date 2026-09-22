# אפליקציית משימות לילדים

גרסה מחוברת ל-**Firebase** (Google Sign-In + Firestore) — multi-tenant אמיתי:
כל משפחה מתחברת עם Google ורואה רק את הנתונים שלה.

## איך זה עובד
- **הזדהות**: Google Sign-In בלבד (בלי סיסמאות). ההתחברות קורית **פעם אחת**
  בכרום הרגיל של הטאבלט (או ממחשב/טלפון) — Firebase שומר את ה-session
  בדפדפן, כך שגם מסך הילדים (שלא דורש login בעצמו) "רואה" אוטומטית מי מחובר.
- **מסך ילד** (`index.html`) בודק אם יש session פעיל: אם לא — מציג הפניה
  להתחברות דרך `admin/`. אם יש — טוען את המשפחה של המשתמש המחובר ומציג בחירת
  ילד → משימות.
- **מסך setup** יוצר משפחה חדשה (בפעם הראשונה) או עורך משפחה קיימת (אם
  למשתמש המחובר כבר יש אחת).
- **מסך admin** מוגן באותה התחברות; הזנת שיעורי בית ואיפוס יתרת נקודות.

## מבנה נתונים ב-Firestore
```
users/{uid}                        → { familyId }
families/{familyId}                → { name, ownerUid, createdAt }
families/{familyId}/kids/{kidId}   → { name, photoUrl, selectedTasks:[{taskId,points}], dailyBonus, points:{lifetime,redeemable,daily,dailyDate} }
families/{familyId}/kids/{kidId}/days/{YYYY-MM-DD} → { completed:{taskId:true}, homeworkText }
```
קטלוג 15 המשימות הקבוע נשאר קובץ סטטי בקוד (`js/taskCatalog.js`) ולא ב-Firestore,
כי הוא זהה לכל המשפחות ולא משתנה.

## הגדרת Firestore Security Rules (חובה!)
בלי זה, כל אחד בעל חשבון Google יכול תיאורטית לקרוא/לכתוב לכל משפחה.
1. ב-Firebase Console → Build → Firestore Database → לשונית **Rules**.
2. מעתיקים את כל התוכן של הקובץ `firestore.rules` (בחבילה הזו) ומדביקים שם,
   מחליפים את מה שכבר כתוב.
3. **Publish**.

## הפעלת Google Sign-In
Build → Authentication → Sign-in method → Google → Enable, ולוודא ב-Settings →
Authorized domains שהדומיין של GitHub Pages שלך רשום שם.

## הרצה מקומית
עדיין צריך שרת סטטי (מודולי ES6 לא עובדים מ-`file://`):
```
cd kids-tasks-app
python3 -m http.server 8080
```
שים לב: Google Sign-In לא יעבוד מ-`localhost` אלא אם תוסיף גם אותו כ-Authorized
domain ב-Firebase (או תבדוק ישירות מול הכתובת של GitHub Pages).

## מבנה קבצים
```
index.html          מסך בחירת ילד + גריד המשימות היומי
manifest.json        הגדרות PWA (שם, אייקון, מצב standalone)
sw.js                 Service Worker - התקנה + עבודה גם בלי אינטרנט
firestore.rules      חוקי אבטחה להדבקה בקונסולת Firebase
README.md
css/style.css
js/
  firebaseInit.js     חיבור ל-Firebase (config, auth, db)
  auth.js             התחברות/התנתקות Google, קישור משתמש↔משפחה
  db.js               כל הגישה ל-Firestore (family/kids/days/points)
  main.js             מסך הילדים
  taskCatalog.js       קטלוג 15 המשימות הקבועות
setup/   index.html, setup.js   הגדרת/עריכת משפחה
admin/   index.html, admin.js   מסך הורה
assets/icons/         אייקוני PWA
```

## התקנה כ-PWA על הטאבלט
1. פותחים את האתר ב-Chrome בטאבלט, **מתחברים עם Google** (חד-פעמי).
2. תפריט שלוש נקודות ← "התקנה"/"הוספה למסך הבית".

## נעילת הטאבלט למצב Kiosk
**חשוב:** Google חוסמת התחברות (OAuth) מתוך WebView מוטמע, אז **אסור** להשתמש
במצב "WebView" של FreeKiosk עם כתובת ה-URL ישירות — ההתחברות תיכשל שם.

הסדר הנכון:
1. ב-Chrome הרגיל (לא ב-FreeKiosk): נכנסים ל-`admin/`, מתחברים עם Google,
   וממלאים את ה-setup.
2. באותו Chrome: תפריט ← "התקנה"/"הוספה למסך הבית" — יוצר אייקון PWA אמיתי.
3. ב-FreeKiosk: בוחרים במצב **"External App"** (לא "WebView"), ומצביעים על
   האפליקציה המותקנת מהשלב הקודם. כך ה-session שכבר נוצר בשלב 1 ממשיך לעבוד.

## מה עדיין חסר (לשלבים הבאים)
- **תמונות משימות אמיתיות** במקום אימוג'י (מחליפים ב-`taskCatalog.js`).
- **שיעורי בית עם תמונה** (כרגע טקסט בלבד).
- **גרף התקדמות שבועי** (כרגע רק פס יומי).
- **פינת איחולים מההורים** (פיצ'ר עתידי).
- תמונות ילדים נשמרות כרגע כ-data URL בתוך מסמך הילד ב-Firestore — נוח
  לבדיקה, אבל יש מגבלת גודל מסמך (1MB); תמונה גדולה מדי תיכשל בשמירה. אם
  זה קורה, כדאי לעבור ל-Firebase Storage בשלב הבא.

## נקודות (3 מונים, לכל ילד)
1. **סה"כ** (lifetime) — לא מתאפס לעולם.
2. **יתרה למימוש** (redeemable) — מתאפסת ידנית מה-admin כשהילד מקבל תגמול.
3. **היום** (daily) — מתאפסת בחצות, ולפני האיפוס מצטרפת אוטומטית ליתרה.
