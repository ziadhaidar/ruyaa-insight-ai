
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Language } from "@/types";

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

// Simple translations object
const translations = {
  en: {
    appName: "Nour Al Ruyaa",
    login: "Login",
    register: "Register",
    logout: "Logout",
    email: "Email",
    password: "Password",
    displayName: "Display Name",
    submit: "Submit",
    dreamPlaceholder: "Describe your dream here...",
    submitDream: "Submit a Dream",
    pastDreams: "Past Dreams",
    settings: "Settings",
    payment: "Payment",
    payNow: "Pay $5 to Continue",
    language: "Language",
    english: "English",
    arabic: "Arabic",
    noHistoryYet: "No interpretation history yet",
    interpretComplete: "Interpretation Complete",
    sendToEmail: "Send to Email",
    contactSupport: "Contact Support",
    welcomeMessage: "Welcome to Nour Al Ruyaa, your source for Quranic dream interpretation",
    welcomeSubtitle: "Submit your dream and receive an interpretation based on Islamic teachings",
    landing1: "Islamic Dream Interpretation",
    landing2: "Based on Quranic Wisdom",
    landing3: "Private & Respectful",
    signUpCta: "Sign up to interpret your dreams",
    alreadyMember: "Already a member? Login",
    notMember: "Not a member? Register",
  },
  ar: {
    appName: "نور الرؤيا",
    login: "تسجيل الدخول",
    register: "التسجيل",
    logout: "تسجيل الخروج",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    displayName: "الاسم الظاهر",
    submit: "إرسال",
    dreamPlaceholder: "صف حلمك هنا...",
    submitDream: "تقديم حلم",
    pastDreams: "الأحلام السابقة",
    settings: "الإعدادات",
    payment: "الدفع",
    payNow: "ادفع 5$ للمتابعة",
    language: "اللغة",
    english: "الإنجليزية",
    arabic: "العربية",
    noHistoryYet: "لا يوجد تاريخ تفسير بعد",
    interpretComplete: "اكتمل التفسير",
    sendToEmail: "أرسل إلى البريد الإلكتروني",
    contactSupport: "اتصل بالدعم",
    welcomeMessage: "مرحبًا بك في نور الرؤيا، منصتك لتفسير الأحلام المستند إلى القرآن والسنة",
    welcomeSubtitle: "شارك حلمك واحصل على تفسير مستوحى من تعاليم الإسلام النقية",
    landing1: "تفسير الأحلام الإسلامي",
    landing2: "مستمد من نور القرآن وحكمة السنة",
    landing3: "سرية تامة واحترام كامل",
    signUpCta: "ابدأ رحلتك بتفسير حلمك",
    alreadyMember: "عضو بالفعل؟ تسجيل الدخول",
    notMember: "لست عضوًا؟ سجل الآن",
  },
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem("language") as Language;
    return savedLanguage || "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
