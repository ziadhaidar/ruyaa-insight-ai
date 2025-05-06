
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import Layout from "@/components/Layout";
import { useLanguage } from "@/context/LanguageContext";

const ResetPasswordPage: React.FC = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    // Check if we have a hash in the URL (Supabase auth redirect)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (!hashParams.get("access_token")) {
      toast({
        title: t("invalidResetLink") || "Invalid password reset link",
        description: t("pleaseRequestNewLink") || "Please request a new password reset link",
        variant: "destructive",
      });
      setTimeout(() => navigate("/login"), 3000);
    }
  }, [navigate, toast, t]);
  
  const validatePassword = () => {
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return false;
    }
    
    setPasswordError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast({
        title: t("passwordUpdated") || "Password updated",
        description: t("passwordUpdatedSuccess") || "Your password has been updated successfully",
      });
      
      setTimeout(() => navigate("/login"), 2000);
    } catch (error: any) {
      console.error("Update password error:", error);
      toast({
        title: t("passwordUpdateFailed") || "Password update failed",
        description: error.message || t("passwordUpdateTryAgain") || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-14rem)]">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">{t("resetPassword") || "Reset Password"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{t("newPassword") || "New Password"}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="********"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t("confirmPassword") || "Confirm Password"}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="********"
                />
                {passwordError && <p className="text-sm text-destructive mt-1">{passwordError}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (t("updating") || "Updating...") : (t("updatePassword") || "Update Password")}
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <p className="text-center w-full">
              <Button variant="link" onClick={() => navigate("/login")}>
                {t("backToLogin") || "Back to Login"}
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default ResetPasswordPage;
