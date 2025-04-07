
import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Moon, BookOpen, Shield } from "lucide-react";
import Layout from "@/components/Layout";
import ParticleAnimation from "@/components/ParticleAnimation";

const LandingPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="flex flex-col items-center">
        {/* Hero section */}
        <section className="w-full max-w-4xl mx-auto text-center py-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-islamic-green to-islamic-green-dark animate-fade-in">
            {t("appName")}
          </h1>
          
          <div className="flex justify-center mb-8">
            <ParticleAnimation size="h-64 w-64" className="mx-auto" />
          </div>
          
          <p className="text-xl mb-8 text-muted-foreground max-w-2xl mx-auto">
            {t("welcomeMessage")}
          </p>
          <p className="text-lg mb-10 max-w-2xl mx-auto">
            {t("welcomeSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              className="islamic-gradient-btn text-lg py-6 px-8"
              onClick={() => navigate("/register")}
            >
              {t("signUpCta")}
            </Button>
            <Button
              variant="outline"
              className="text-lg py-6 px-8"
              onClick={() => navigate("/login")}
            >
              {t("login")}
            </Button>
          </div>
        </section>

        {/* Feature cards */}
        <div className="pattern-divider" />

        <section className="w-full py-12">
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="transform transition-all hover:scale-105">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Moon className="h-12 w-12 text-islamic-green mb-4" />
                <h2 className="text-xl font-bold mb-2">{t("landing1")}</h2>
                <p className="text-muted-foreground">
                  Understand your dreams through the lens of Islamic teachings
                </p>
              </CardContent>
            </Card>
            
            <Card className="transform transition-all hover:scale-105">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <BookOpen className="h-12 w-12 text-islamic-gold mb-4" />
                <h2 className="text-xl font-bold mb-2">{t("landing2")}</h2>
                <p className="text-muted-foreground">
                  Interpretations based on the Quran and authentic Islamic sources
                </p>
              </CardContent>
            </Card>
            
            <Card className="transform transition-all hover:scale-105">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Shield className="h-12 w-12 text-islamic-green-dark mb-4" />
                <h2 className="text-xl font-bold mb-2">{t("landing3")}</h2>
                <p className="text-muted-foreground">
                  Your dreams are treated with the utmost respect and privacy
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Quranic verse */}
        <div className="pattern-divider" />
        
        <section className="w-full max-w-2xl mx-auto my-8 text-center">
          <div className="quran-verse">
            <p className="arabic-text text-xl">
              وَمِنْ آيَاتِهِ مَنَامُكُم بِاللَّيْلِ وَالنَّهَارِ وَابْتِغَاؤُكُم مِّن فَضْلِهِ ۚ إِنَّ فِي ذَٰلِكَ لَآيَاتٍ لِّقَوْمٍ يَسْمَعُونَ
            </p>
            <p className="english-translation">
              "And among His Signs is your sleep by night and by day, and your seeking of His Bounty. Verily, in that are indeed signs for a people who listen." [Quran 30:23]
            </p>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default LandingPage;
