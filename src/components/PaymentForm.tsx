
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/context/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useDream } from "@/context/DreamContext";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PaymentOptions = [
  { id: "premium", name: "Premium Interpretation", price: 2, currency: "USD", priceId: "price_1RNrncCAL5p9VD6orH064HLz" },
];

const PaymentForm: React.FC = () => {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { currentDream } = useDream();
  const { toast } = useToast();

  const handlePayment = async () => {
    if (!currentDream) {
      toast({
        title: "No dream selected",
        description: "Please submit a dream first",
        variant: "destructive",
      });
      navigate("/home");
      return;
    }

    setIsProcessing(true);

    try {
      const option = PaymentOptions[0]; // Always use premium option
      
      toast({
        title: "Redirecting to payment",
        description: "You'll be redirected to our secure payment page",
      });
      
      console.log("Creating checkout session with price ID:", option.priceId);
      
      // Call the Supabase Edge Function to create a checkout session
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { 
          priceId: option.priceId
        }
      });

      if (error) {
        console.error("Error creating checkout session:", error);
        throw new Error(`Error creating checkout session: ${error.message}`);
      }

      if (data && data.url) {
        console.log("Received checkout URL:", data.url);
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned:", data);
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Couldn't process your payment, please try again later.",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">{t("paymentTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentDream && (
          <div className="mb-4 p-4 bg-secondary/30 rounded-md">
            <h3 className="font-medium mb-2">{t("dreamSummary")}</h3>
            <p className="text-sm line-clamp-3">{currentDream.dream_text}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="p-4 border rounded-md">
            <div className="flex justify-between mb-2">
              <span>{PaymentOptions[0].name}</span>
              <span className="font-bold">
                ${PaymentOptions[0].price} {PaymentOptions[0].currency}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("premiumPlanDescription") || "Enhanced dream interpretation with detailed analysis based on Islamic teachings"}
            </p>
          </div>

          <Button 
            className="w-full islamic-gradient-btn" 
            onClick={handlePayment}
            disabled={isProcessing}
          >
            {isProcessing ? t("processing") : t("payNow")}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {t("paymentDisclaimer")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentForm;
