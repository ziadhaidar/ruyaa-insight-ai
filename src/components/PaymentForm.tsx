
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import { useDream } from "@/context/DreamContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreditCard, DollarSign } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const PaymentForm: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { t } = useLanguage();
  const { confirmPayment, currentSession } = useDream();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if there's no active session
  React.useEffect(() => {
    if (!currentSession) {
      navigate("/home");
    }
  }, [currentSession, navigate]);

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Process payment
      await confirmPayment();
      
      // Navigate to interpretation
      navigate("/interpretation");
      
      toast({
        title: "Payment successful",
        description: "Your dream interpretation will begin now",
      });
    } catch (error) {
      toast({
        title: "Payment failed",
        description: "Please try again or use a different payment method",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!currentSession) {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">{t("payment")}</CardTitle>
        <CardDescription className="text-center">
          Dream interpretation fee: $5.00
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-2">Dream Preview:</h3>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {currentSession.dream.content}
          </p>
        </div>
        
        <div className="space-y-3">
          <Button 
            className="w-full flex items-center justify-center gap-2"
            onClick={handlePayment}
            disabled={isProcessing}
          >
            <CreditCard className="h-4 w-4" />
            {isProcessing ? "Processing..." : t("payNow")}
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center gap-2"
            onClick={handlePayment}
            disabled={isProcessing}
          >
            <DollarSign className="h-4 w-4" />
            PayPal
          </Button>
        </div>
      </CardContent>
      <CardFooter className="text-center text-sm text-muted-foreground flex flex-col space-y-2">
        <p>Secure payment processing through Stripe</p>
        <p>You will receive a detailed Quranic interpretation of your dream</p>
      </CardFooter>
    </Card>
  );
};

export default PaymentForm;
