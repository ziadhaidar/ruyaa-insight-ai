
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
      "with search params:",
      location.search
    );
    
    // If this is a payment success redirect, try to navigate to payment page
    if (location.pathname === "/payment" && location.search.includes("payment_success=true")) {
      console.log("Detected payment success redirect, attempting to navigate to payment page");
      navigate("/payment" + location.search, { replace: true });
    }
  }, [location, navigate]);

  const handleGoToPayment = () => {
    navigate("/payment");
  };

  const handleGoToHome = () => {
    navigate("/home");
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-14rem)] flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
          
          <div className="text-sm text-gray-500 mb-6 p-4 bg-gray-50 rounded">
            <p>Path: {location.pathname}</p>
            <p>Search: {location.search}</p>
          </div>

          <div className="space-y-2">
            {location.search.includes("payment_success=true") && (
              <Button 
                onClick={handleGoToPayment} 
                className="w-full islamic-gradient-btn"
              >
                Go to Payment Page
              </Button>
            )}
            
            <Button 
              onClick={handleGoToHome}
              variant="outline"
              className="w-full"
            >
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
