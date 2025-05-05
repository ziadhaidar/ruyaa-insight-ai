
import React, { useEffect } from "react";
import Layout from "@/components/Layout";
import PaymentForm from "@/components/PaymentForm";
import { useLocation, useNavigate } from "react-router-dom";
import { useDream } from "@/context/DreamContext";
import { useToast } from "@/components/ui/use-toast";

const PaymentPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { processDreamInterpretation, currentDream } = useDream();
  const { toast } = useToast();

  // Check if user is returning from successful payment
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const paymentSuccess = queryParams.get("payment_success");
    
    if (paymentSuccess === "true" && currentDream) {
      // If returning from successful payment, process the dream interpretation
      const processPaymentSuccess = async () => {
        toast({
          title: "Payment successful",
          description: "Your dream is being processed for interpretation",
        });
        
        try {
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
        }
      };
      
      processPaymentSuccess();
    }
  }, [location, currentDream, processDreamInterpretation, navigate, toast]);

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-14rem)]">
        <PaymentForm />
      </div>
    </Layout>
  );
};

export default PaymentPage;
