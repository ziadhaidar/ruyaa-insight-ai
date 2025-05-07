
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/context/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useDream } from "@/context/DreamContext";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PaymentOptions = [
  { 
    id: "free", 
    name: "Free Interpretation", 
    price: 0, 
    currency: "USD", 
    priceId: "price_1RIWaECAL5p9VD6oP4MZBPRt",  // Using an actual test price ID for free tier
    testMode: true 
  },
  { 
    id: "premium", 
    name: "Premium Interpretation", 
    price: 5, 
    currency: "USD", 
    priceId: "price_1RIWaECAL5p9VD6oP4MZBPRt",
    testMode: false
  },
];

const PaymentForm: React.FC = () => {
  const [selectedOption, setSelectedOption] = React.useState(PaymentOptions[0].id);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { currentDream, processDreamInterpretation } = useDream();
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
      const option = PaymentOptions.find(opt => opt.id === selectedOption);
      
      if (!option) {
        throw new Error("Invalid payment option selected");
      }

      // Always process through Stripe, even for free option
      toast({
        title: option.testMode ? "Processing free tier" : "Redirecting to payment",
        description: option.testMode ? 
          "Your dream is being processed using our free tier service" : 
          "You'll be redirected to our secure payment page",
      });
      
      console.log(`Creating checkout session with price ID: ${option.priceId}, test mode: ${option.testMode}`);
      
      // Call the Supabase Edge Function to create a checkout session
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { 
          priceId: option.priceId,
          testMode: option.testMode
        }
      });

      if (error) {
        console.error("Error creating checkout session:", error);
        throw new Error(`Error creating checkout session: ${error.message}`);
      }

      if (data && data.url) {
        console.log("Received checkout URL:", data.url);
        
        if (option.testMode) {
          // For free tier, process the dream directly
          await processDreamInterpretation();
          navigate("/interpretation");
        } else {
          // For paid tier, redirect to Stripe Checkout
          window.location.href = data.url;
        }
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
  
  // Find the selected payment option
  const option = PaymentOptions.find((o) => o.id === selectedOption);

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
          <label className="block text-sm font-medium">{t("selectPlan")}</label>
          <Select value={selectedOption} onValueChange={setSelectedOption}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a plan" />
            </SelectTrigger>
            <SelectContent>
              {PaymentOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name} {option.price > 0 ? `- $${option.price}` : '(Free)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {option && (
            <div className="p-4 border rounded-md">
              <div className="flex justify-between mb-2">
                <span>{option.name}</span>
                <span className="font-bold">
                  {option.price > 0 ? `$${option.price} ${option.currency}` : 'Free'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {option.id === "free"
                  ? t("freePlanDescription") || "Basic dream interpretation"
                  : t("premiumPlanDescription") || "Enhanced dream interpretation with more detailed analysis"}
              </p>
            </div>
          )}

          <Button 
            className="w-full islamic-gradient-btn" 
            onClick={handlePayment}
            disabled={isProcessing}
          >
            {isProcessing ? 
              t("processing") : 
              selectedOption === "free" ? 
                t("continueForFree") || "Continue for Free" : 
                t("payNow")
            }
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
