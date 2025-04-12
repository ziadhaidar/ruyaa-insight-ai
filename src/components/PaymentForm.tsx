
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/context/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useDream } from "@/context/DreamContext";
import { useToast } from "@/components/ui/use-toast";

const PaymentOptions = [
  { id: "free", name: "Free Interpretation", price: 0, currency: "USD" },
  { id: "premium", name: "Premium Interpretation", price: 5, currency: "USD" },
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
      // If free plan, skip payment processing
      if (selectedOption === "free") {
        toast({
          title: "Processing dream",
          description: "Your dream is being processed for interpretation",
        });
        
        // Start processing the dream interpretation
        await processDreamInterpretation();
        
        // Navigate to interpretation page
        navigate("/interpretation");
      } else {
        // In a real app, you'd call your payment processor here
        // For this demo, we'll simulate a payment
        setTimeout(() => {
          // Simulate successful payment
          toast({
            title: "Payment successful",
            description: "Your dream is being processed for interpretation",
          });

          // Start processing the dream interpretation
          processDreamInterpretation();
          
          // Navigate to interpretation page
          navigate("/interpretation");
        }, 2000);
      }
    } catch (error) {
      console.error("Error processing dream:", error);
      toast({
        title: "Error",
        description: "Couldn't process your dream interpretation, please try again later.",
        variant: "destructive"
      });
    } finally {
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
            {isProcessing ? t("processing") : selectedOption === "free" ? t("continueForFree") || "Continue for Free" : t("payNow")}
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
