
import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import PaymentForm from "@/components/PaymentForm";
import { useLocation, useNavigate } from "react-router-dom";
import { useDream } from "@/context/DreamContext";
import { useToast } from "@/components/ui/use-toast";
import LoadingAnimation from "@/components/LoadingAnimation";

const PaymentPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { processDreamInterpretation, currentDream } = useDream();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);

  // Check if user is returning from successful payment
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const paymentSuccess = queryParams.get("payment_success");
    
    if (paymentSuccess === "true" && currentDream) {
      // If returning from successful payment, process the dream interpretation
      const processPaymentSuccess = async () => {
        setProcessing(true);
        
        toast({
          title: "Payment successful",
          description: "Your dream is being processed for interpretation",
        });
        
        try {
          console.log("Processing dream interpretation after successful payment");
          console.log("Current dream data:", currentDream);
          
          // Process the dream interpretation
          await processDreamInterpretation();
          
          // Navigate to interpretation page
          navigate("/interpretation");
        } catch (error) {
          console.error("Error processing dream after payment:", error);
          toast({
            title: "Error",
            description: "Couldn't process your dream interpretation, please try again later.",
            variant: "destructive"
          });
          setProcessing(false);
        }
      };
      
      processPaymentSuccess();
    }
  }, [location, currentDream, processDreamInterpretation, navigate, toast]);

  if (processing) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-14rem)]">
          <LoadingAnimation message="Processing your payment and preparing your dream interpretation..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-14rem)]">
        <PaymentForm />
      </div>
    </Layout>
  );
};

export default PaymentPage;
