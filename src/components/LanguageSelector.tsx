
import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("language")}</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={language}
          onValueChange={(value) => setLanguage(value as "en" | "ar")}
          className="space-y-3"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="en" id="en" />
            <Label htmlFor="en">{t("english")}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="ar" id="ar" />
            <Label htmlFor="ar">{t("arabic")}</Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

export default LanguageSelector;
