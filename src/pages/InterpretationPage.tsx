
import React from "react";
import Layout from "@/components/Layout";
import InterpretationChat from "@/components/InterpretationChat";
import LoadingAnimation from "@/components/LoadingAnimation";
import { useDream } from "@/context/DreamContext";

const InterpretationPage: React.FC = () => {
  const { currentSession } = useDream();
  
  return (
    <Layout>
      {currentSession ? (
        <InterpretationChat />
      ) : (
        <div className="h-[60vh] flex items-center justify-center">
          <LoadingAnimation message="Preparing dream interpretation..." />
        </div>
      )}
    </Layout>
  );
};

export default InterpretationPage;
