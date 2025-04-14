
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import { useDream } from "@/context/DreamContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const DreamForm: React.FC = () => {
  const [dreamContent, setDreamContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLanguage();
  const { startNewDreamSession } = useDream();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dreamContent.trim()) {
      toast({
        title: "Dream content required",
        description: "Please describe your dream before submitting",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please login to submit your dream",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Start a new dream session first (uses local state)
      startNewDreamSession(dreamContent);
      
      // Navigate to the payment page - the actual saving to database happens in processDreamInterpretation
      navigate("/payment");
      
      toast({
        title: "Dream submitted",
        description: "Please proceed with payment to receive an interpretation",
      });
    } catch (error: any) {
      console.error("Error submitting dream:", error);
      toast({
        title: "Submission failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">{t("submitDream")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={dreamContent}
            onChange={(e) => setDreamContent(e.target.value)}
            placeholder={t("dreamPlaceholder")}
            className="min-h-[150px]"
            required
          />
          <Button 
            type="submit" 
            className="w-full islamic-gradient-btn" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : t("submit")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="text-center text-sm text-muted-foreground">
        Your dream will be interpreted based on Quranic teachings and Islamic knowledge.
      </CardFooter>
    </Card>
  );
};

export default DreamForm;
