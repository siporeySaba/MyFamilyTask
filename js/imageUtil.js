// מכווץ תמונה שנבחרה ע"י המשתמש ל-data URL קטן וסביר, לפני שמירה ב-Firestore.
// חשוב: בלי זה, תמונה ישירות ממצלמת טלפון (כמה MB) הופכת ל-base64 שחורג
// מהמגבלה של Firestore (1MB למסמך), והשמירה נכשלת בלי הודעת שגיאה ברורה למשתמש.
export function fileToResizedDataUrl(file, maxDim = 500, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('קריאת הקובץ נכשלה'));
    reader.onload = () => {
      img.onerror = () => reject(new Error('טעינת התמונה נכשלה'));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round(height * (maxDim / width));
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round(width * (maxDim / height));
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
