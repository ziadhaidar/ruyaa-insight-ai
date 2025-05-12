import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";

const LanguageToggle: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ar" : "en");
  };

  const flagSrc = language === "en" ? "/images/english.svg" : "/images/arabic.svg";
  const altText = language === "en" ? "US Flag" : "Saudi Flag";
  const titleText = language === "en" ? t("arabic") : t("english");

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      className="relative p-0"
      aria-label={t("language")}
      title={titleText}
    >
      <img
        src={flagSrc}
        alt={altText}
        className="h-6 w-6 rounded-full object-cover"
      />
    </Button>
  );
};

export default LanguageToggle;
