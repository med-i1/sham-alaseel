// إعدادات Firebase للويب (مش سرية: الحماية من قواعد Firestore وتسجيل الدخول).
// بعد ما تعمل المشروع: انسخ firebaseConfig من
// Project settings > Your apps > SDK setup and configuration وحطه مكان null.
const PROJECT_CONFIG = null;

export const SDK = 'https://www.gstatic.com/firebasejs/13.4.0';

// محاكي Firebase المحلي بيقدّم الموقع على بورت 5000، وساعتها مابنلمسش المشروع الحقيقي
const location = globalThis.location;
export const useEmulators = Boolean(location)
  && ['localhost', '127.0.0.1'].includes(location.hostname)
  && location.port === '5000';

export const firebaseConfig = useEmulators
  ? { apiKey: 'demo-key', authDomain: 'demo-sham.firebaseapp.com', projectId: 'demo-sham', appId: 'demo-app' }
  : PROJECT_CONFIG;
