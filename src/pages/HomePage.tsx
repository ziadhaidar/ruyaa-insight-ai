
import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import DreamForm from "@/components/DreamForm";

const HomePage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <section className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">{t("submitDream")}</h1>
          <p className="text-muted-foreground mb-6">
            Describe your dream in detail below to receive a Quranic interpretation.
          </p>
        </section>
        
        <DreamForm />
        
        <div className="mt-8 text-center">
          <Button 
            variant="outline" 
            onClick={() => navigate("/dreams")}
          >
            {t("pastDreams")}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;
