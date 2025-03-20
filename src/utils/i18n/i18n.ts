import { ENGLocalizedStrings } from "../localizedStrings/english";
import { VnLocalizedStrings } from "../localizedStrings/vietnam";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import 'intl-pluralrules';

const resources = {
  vi: { translation: VnLocalizedStrings },
  en: { translation: ENGLocalizedStrings },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "vi", // Default language
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
