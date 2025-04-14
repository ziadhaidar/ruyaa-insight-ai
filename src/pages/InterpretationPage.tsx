
import React from "react";
import Layout from "@/components/Layout";
import InterpretationChat from "@/components/InterpretationChat";
import LoadingAnimation from "@/components/LoadingAnimation";
import { useDream } from "@/context/DreamContext";

const InterpretationPage: React.FC = () => {
  const { currentSession, isLoading } = useDream();
  
  return (
    <Layout>
      {currentSession ? (
        <InterpretationChat />
      ) : (
        <div className="h-[60vh] flex items-center justify-center">
          <LoadingAnimation message={isLoading ? "Preparing dream interpretation..." : "Please submit a dream to begin interpretation"} />
        </div>
      )}
    </Layout>
  );
};

export default InterpretationPage;
