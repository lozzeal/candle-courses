// ============================================================
// r2-uploader.js — drop-in helper для завантаження файлів у R2
// ============================================================
// Заміна для:
//   const { error } = await supa.storage.from(bucket).upload(path, file, ...);
//   const { data: { publicUrl } } = supa.storage.from(bucket).getPublicUrl(path);
//
// Використання:
//   const { url, error } = await uploadToR2({ bucket, path, file });
//   if (error) ... else use `url`
// ============================================================

(function (global) {
  'use strict';

  // Адмінка має зберігати токен у window.ADMIN_UPLOAD_TOKEN
  // (записати при логіні з site_settings.admin_upload_token або з конфігу)
  function getToken() {
    return global.ADMIN_UPLOAD_TOKEN
        || localStorage.getItem('admin_upload_token')
        || '';
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // result = "data:image/jpeg;base64,XXXXXX"
        const s = reader.result || '';
        const idx = s.indexOf(',');
        resolve(idx >= 0 ? s.slice(idx + 1) : s);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function uploadToR2({ bucket, path, file }) {
    if (!bucket || !path || !file) {
      return { error: { message: 'bucket, path і file обовʼязкові' } };
    }
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch('/api/r2-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': getToken(),
        },
        body: JSON.stringify({
          bucket,
          path,
          contentType: file.type || 'application/octet-stream',
          base64,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { error: { message: json.error || `HTTP ${res.status}` } };
      }
      return { url: json.url, key: json.key, error: null };
    } catch (e) {
      return { error: { message: e.message || 'Upload failed' } };
    }
  }

  global.uploadToR2 = uploadToR2;
})(window);
