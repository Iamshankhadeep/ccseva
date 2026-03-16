import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zh from './locales/zh.json';

// 资源定义
const resources = {
  en: { translation: en },
  zh: { translation: zh },
};

// 初始化 i18next
i18n
  // 检测用户浏览器语言
  .use(LanguageDetector)
  // 将 i18next 传入 react-i18next
  .use(initReactI18next)
  // 初始化 i18next
  .init({
    resources,
    fallbackLng: 'en', // 降级语言
    debug: false, // 关闭 debug 模式以提升启动性能（生产环境必须关闭）
    interpolation: {
      escapeValue: false, // React 已经保护 XSS
    },
    detection: {
      order: ['localStorage', 'sessionStorage', 'navigator'],
      caches: ['localStorage', 'sessionStorage'],
    },
  });

export default i18n;
