import i18n from "./i18n";
const translateLanguage = (value: string) => {
  switch (value) {
    case "vi":
      return i18n.changeLanguage("vi");
    case "en":
      return i18n.changeLanguage("en");
    default:
      return i18n.changeLanguage("vi");
  }
};

export default translateLanguage;