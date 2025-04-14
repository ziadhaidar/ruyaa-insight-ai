
import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import PastDreamsTable from "@/components/PastDreamsTable";

const DreamsPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Track active tab status to prevent unwanted navigation
  useEffect(() => {
    // Store current route to localStorage when page loads
    localStorage.setItem('lastRoute', location.pathname);
    
    // Handle visibility change 
    const handleVisibilityChange = () => {
      // Only navigate if the document becomes visible again
      if (document.visibilityState === 'visible') {
        // Check if we're already on the dreams page to avoid unnecessary redirects
        const lastRoute = localStorage.getItem('lastRoute');
        if (lastRoute && lastRoute !== '/dreams' && location.pathname !== lastRoute) {
          console.log(`Restoring previous route: ${lastRoute}`);
          navigate(lastRoute);
        }
      }
    };
    
    // Add event listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [navigate, location.pathname]);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{t("pastDreams")}</h1>
          <Button onClick={() => navigate("/home")} className="islamic-gradient-btn">
            {t("submitDream")}
          </Button>
        </div>
        
        <PastDreamsTable />
      </div>
    </Layout>
  );
};

export default DreamsPage;
