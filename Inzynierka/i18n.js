import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import de from "./assets/locales/de.json";
import en from "./assets/locales/en.json";
import pl from "./assets/locales/pl.json";
import ua from "./assets/locales/ua.json";

const deviceLocale =
  (Localization.locale && Localization.locale.split("-")[0]) || "en";

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: "v3",
    lng: deviceLocale, 
    fallbackLng: "en",
    resources: {
      pl: { translation: pl },
      en: { translation: en },
      de: { translation: de },
      ua: { translation: ua },
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
