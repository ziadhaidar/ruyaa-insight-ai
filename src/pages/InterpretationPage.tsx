
import React, { useEffect } from "react";
import Layout from "@/components/Layout";
import InterpretationChat from "@/components/InterpretationChat";
import LoadingAnimation from "@/components/LoadingAnimation";
import { useDream } from "@/context/DreamContext";
import { useToast } from "@/components/ui/use-toast";

const InterpretationPage: React.FC = () => {
  const { currentSession, isLoading } = useDream();
  const { toast } = useToast();
  
  useEffect(() => {
    // Display information about the version update
    toast({
      title: "OpenAI API Update",
      description: "This app now uses the latest version of OpenAI's Assistants API (v2).",
      duration: 5000,
    });
  }, [toast]);
  
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
