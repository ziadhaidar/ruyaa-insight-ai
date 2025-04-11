
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Menu, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const closeSheet = () => {
    setIsOpen(false);
  };

  const NavItems = () => (
    <>
      <Button 
        variant="ghost" 
        className={language === 'ar' ? 'font-cairo' : 'font-playfair'} 
        onClick={() => {
          navigate("/home");
          closeSheet();
        }}
      >
        {t("appName")}
      </Button>
      
      {user && (
        <>
          <Button 
            variant="ghost" 
            className={language === 'ar' ? 'font-cairo' : ''} 
            onClick={() => {
              navigate("/dreams");
              closeSheet();
            }}
          >
            {t("pastDreams")}
          </Button>
          <Button 
            variant="ghost" 
            className={language === 'ar' ? 'font-cairo' : ''} 
            onClick={() => {
              navigate("/settings");
              closeSheet();
            }}
          >
            {t("settings")}
          </Button>
          <Button 
            variant="destructive" 
            className={language === 'ar' ? 'font-cairo' : ''} 
            onClick={() => {
              handleLogout();
              closeSheet();
            }}
          >
            {t("logout")}
          </Button>
        </>
      )}
      
      {!user && (
        <>
          <Button 
            variant="ghost" 
            className={language === 'ar' ? 'font-cairo' : ''} 
            onClick={() => {
              navigate("/login");
              closeSheet();
            }}
          >
            {t("login")}
          </Button>
          <Button 
            variant="default" 
            className={language === 'ar' ? 'font-cairo islamic-gradient-btn' : 'islamic-gradient-btn'} 
            onClick={() => {
              navigate("/register");
              closeSheet();
            }}
          >
            {t("register")}
          </Button>
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col islamic-pattern-bg">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-islamic-gold/10">
        <div className="container mx-auto py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 
              className={`text-2xl font-bold cursor-pointer animate-pulse-subtle ${language === 'ar' ? 'font-cairo' : 'font-playfair'}`}
              onClick={() => navigate(user ? "/home" : "/")}
            >
              {t("appName")}
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            <NavItems />
          </nav>

          {/* Mobile Navigation */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col">
              <div className="flex justify-end">
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X />
                </Button>
              </div>
              <div className="flex flex-col space-y-4 mt-8">
                <NavItems />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto py-6 px-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-6 border-t border-islamic-gold/10">
        <div className="container mx-auto text-center">
          <p className={language === 'ar' ? 'font-cairo' : 'font-playfair'}>© 2025 {t("appName")} - {t("landing2")}</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
