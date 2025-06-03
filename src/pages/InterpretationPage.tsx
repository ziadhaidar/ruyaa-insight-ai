
import React, { useEffect } from "react";
import Layout from "@/components/Layout";
import InterpretationChat from "@/components/InterpretationChat";
import LoadingAnimation from "@/components/LoadingAnimation";
import { useDream } from "@/context/DreamContext";

const InterpretationPage: React.FC = () => {
  const { currentSession, isLoading } = useDream();
  
  // Save interpretation page route
  useEffect(() => {
    localStorage.setItem('lastRoute', '/interpretation');
  }, []);
  
  return (
    <Layout>
      {currentSession ? (
        <div className="bg-white/30 backdrop-blur-sm p-6 rounded-2xl shadow-lg max-w-3xl mx-auto w-full">
          <InterpretationChat />
        </div>
      ) : (
        <div className="h-[60vh] flex items-center justify-center">
          <LoadingAnimation
            message={
              isLoading
                ? "Preparing dream interpretation..."
                : "Please submit a dream to begin interpretation"
            }
          />
        </div>
      )}
    </Layout>
  );
};

export default InterpretationPage;
