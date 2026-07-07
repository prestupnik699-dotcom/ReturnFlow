import { create } from 'zustand';
import i18n from '@/localization/i18n';

export type AppLanguage = 'ka' | 'en' | 'ru';

type LanguageState = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
};

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'ka',
  setLanguage: (language) => {
    i18n.changeLanguage(language);
    set({ language });
  },
}));
