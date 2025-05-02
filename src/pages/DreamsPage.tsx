// src/pages/DreamsPage.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import PastDreamsTable from "@/components/PastDreamsTable";
import { Card, CardContent } from "@/components/ui/card";

/**
 * DreamsPage Component
 * Renders the layout, header, and a boxed container for past dreams.
 */
const DreamsPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4">

        {/* Page Header: Title and Submit Button */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{t("pastDreams")}</h1>
          <Button onClick={() => navigate("/home")} className="islamic-gradient-btn">
            {t("submitDream")}
          </Button>
        </div>

        {/* Past Dreams Section: Wrapped in Card for better readability */}
        <Card className="mb-6 shadow-md rounded-lg">
          <CardContent className="p-6">
            {/* Section Title */}
            <h2 className="text-xl font-semibold mb-4">{t("yourPastDreams")}</h2>
            {/* Table of Past Dreams */}
            <PastDreamsTable />
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
};

export default DreamsPage;
