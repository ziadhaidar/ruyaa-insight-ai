
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/context/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useDream } from "@/context/DreamContext";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PaymentOptions = [
  { id: "free_short", name: "Free Short Interpretation", price: 0, currency: "USD", priceId: null },
  { id: "free", name: "Free Interpretation", price: 0, currency: "USD", priceId: null },
  { id: "premium", name: "Premium Interpretation", price: 2, currency: "USD", priceId: "price_1RNrncCAL5p9VD6orH064HLz" },
];

const PaymentForm: React.FC = () => {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [selectedOption, setSelectedOption] = React.useState("premium");
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { currentDream, processDreamInterpretation, processShortDreamInterpretation } = useDream();
  const { toast } = useToast();

  const handleFreeInterpretation = async () => {
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
      toast({
        title: "Processing your dream",
        description: "Your free interpretation is being generated",
      });
      
      console.log("Processing free dream interpretation");
      console.log("Current dream data:", currentDream);
      
      // Process the dream interpretation
      await processDreamInterpretation();
      
      // Navigate to interpretation page
      navigate("/interpretation");
    } catch (error) {
      console.error("Error processing free dream:", error);
      toast({
        title: "Error",
        description: "Couldn't process your dream interpretation, please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFreeShortInterpretation = async () => {
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
      toast({
        title: "Processing your dream",
        description: "Your short interpretation is being generated",
      });
      
      console.log("Processing short dream interpretation");
      console.log("Current dream data:", currentDream);
      
      // Process the short dream interpretation
      await processShortDreamInterpretation();
      
      // Navigate to interpretation page
      navigate("/interpretation");
    } catch (error) {
      console.error("Error processing short dream:", error);
      toast({
        title: "Error",
        description: "Couldn't process your dream interpretation, please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePremiumPayment = async () => {
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
      const option = PaymentOptions[2]; // Premium option
      
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

  const handleSubmit = () => {
    if (selectedOption === "free_short") {
      handleFreeShortInterpretation();
    } else if (selectedOption === "free") {
      handleFreeInterpretation();
    } else {
      handlePremiumPayment();
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
          {PaymentOptions.map((option) => (
            <div 
              key={option.id} 
              className={`p-4 border rounded-md cursor-pointer transition-colors ${
                selectedOption === option.id 
                  ? "border-primary bg-primary/5" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setSelectedOption(option.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={option.id}
                    name="paymentOption"
                    value={option.id}
                    checked={selectedOption === option.id}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    className="w-4 h-4 text-primary"
                  />
                  <label htmlFor={option.id} className="font-medium cursor-pointer">
                    {option.name}
                  </label>
                </div>
                <span className="font-bold">
                  {option.price === 0 ? "Free" : `$${option.price} ${option.currency}`}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {option.id === "free_short" 
                  ? "Quick and simple dream interpretation without follow-up questions" 
                  : option.id === "free" 
                    ? "Basic dream interpretation to help you understand your dream" 
                    : (t("premiumPlanDescription") || "Enhanced dream interpretation with detailed analysis based on Islamic teachings")
                }
              </p>
            </div>
          ))}

          <Button 
            className="w-full islamic-gradient-btn" 
            onClick={handleSubmit}
            disabled={isProcessing}
          >
            {isProcessing 
              ? t("processing") 
              : selectedOption === "free_short"
                ? "Get Short Interpretation"
                : selectedOption === "free" 
                  ? "Get Free Interpretation" 
                  : t("payNow")
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
