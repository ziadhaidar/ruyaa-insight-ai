
import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import PastDreamsTable from "@/components/PastDreamsTable";

const DreamsPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

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
