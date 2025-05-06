
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/context/LanguageContext";
import { Mail } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";

interface ForgotPasswordFormProps {
  onClose: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onClose }) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      toast({
        title: t("resetPasswordEmailSent") || "Password reset email sent",
        description: t("resetPasswordCheckEmail") || "Please check your email for a password reset link",
      });
      onClose();
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast({
        title: t("resetPasswordFailed") || "Password reset failed",
        description: error.message || t("resetPasswordTryAgain") || "Please check your email and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reset-email">{t("email") || "Email"}</Label>
        <div className="flex items-center relative">
          <Mail className="absolute left-3 text-gray-400" />
          <Input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="your@email.com"
            className="pl-10"
          />
        </div>
      </div>
      
      <DialogFooter>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose}
          disabled={isLoading}
        >
          {t("cancel") || "Cancel"}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (t("sending") || "Sending...") : (t("sendLink") || "Send Reset Link")}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default ForgotPasswordForm;
