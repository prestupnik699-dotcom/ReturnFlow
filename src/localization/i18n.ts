import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ka from './resources/ka.json';
import en from './resources/en.json';
import ru from './resources/ru.json';

// eslint-disable-next-line import/no-named-as-default-member -- i18next's default export shares a name with an unrelated named export "use"; this is the documented, correct usage.
i18n.use(initReactI18next).init({
  resources: {
    ka: { translation: ka },
    en: { translation: en },
    ru: { translation: ru },
  },
  lng: 'ka',
  fallbackLng: 'ka',
  interpolation: { escapeValue: false },
});

export default i18n;
