
import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import Layout from "@/components/Layout";
import LanguageSelector from "@/components/LanguageSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SettingsPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6">{t("settings")}</h1>
        
        <div className="space-y-6">
          <LanguageSelector />
          
          <Card>
            <CardHeader>
              <CardTitle>{t("contactSupport")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Need help with your account or dream interpretations?
              </p>
              <Button className="w-full">
                {t("contactSupport")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;
