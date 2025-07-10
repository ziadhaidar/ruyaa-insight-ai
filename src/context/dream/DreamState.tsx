
import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Dream, InterpretationSession, Message, jsonToStringArray, safeStatusCast } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useOpenAIAssistant } from "@/hooks/useOpenAIAssistant";
import { useOpenAIAssistantShort } from "@/hooks/useOpenAIAssistantShort";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export const useDreamState = () => {
  const [currentDream, setCurrentDream] = useState<Dream | null>(null);
  const [currentSession, setCurrentSession] = useState<InterpretationSession | null>(null);
  const [interpretationSession, setInterpretationSession] = useState<InterpretationSession | null>(null);
  const { toast } = useToast();
  
  const { user } = useAuth();
  const { 
    isLoading, 
    setIsLoading,
    threadId,
    setThreadId,
    createAssistantThread,
    sendMessageToAssistant,
    runAssistantAndGetResponse
  } = useOpenAIAssistant();
  
  // Use separate hook for short interpretations
  const { getShortInterpretation } = useOpenAIAssistantShort();

  // Create a new dream session
  const startNewDreamSession = async (dreamText: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to interpret your dreams",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      // Check for existing similar dreams to prevent duplicates
      const { data: existingDreams, error: fetchError } = await supabase
        .from("dreams")
        .select("*")
        .eq("dream_text", dreamText);

      if (fetchError) {
        console.error("Error checking for existing dreams:", fetchError);
      }

      // If we found an exact match, use that dream instead of creating a new one
      if (existingDreams && existingDreams.length > 0) {
        const existingDream = existingDreams[0];
        console.log("Found existing dream with the same text. Using that instead.");
        
        const dream: Dream = {
          id: existingDream.id,
          user_id: existingDream.user_id,
          dream_text: existingDream.dream_text,
          questions: jsonToStringArray(existingDream.questions),
          answers: jsonToStringArray(existingDream.answers),
          created_at: existingDream.created_at,
          status: safeStatusCast(existingDream.status),
          interpretation: existingDream.interpretation
        };
        
        setCurrentDream(dream);
        return;
      }

      // Create a new dream
      const newDream: Dream = {
        id: uuidv4(),
        user_id: user.id,
        dream_text: dreamText,
        questions: [],
        answers: [],
        created_at: new Date().toISOString(),
        status: "pending"
      };

      setCurrentDream(newDream);
    } catch (error) {
      console.error("Error in startNewDreamSession:", error);
      toast({
        title: "Error",
        description: "Failed to create dream session. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    currentDream,
    setCurrentDream,
    currentSession,
    setCurrentSession,
    interpretationSession,
    setInterpretationSession,
    isLoading,
    setIsLoading,
    threadId,
    setThreadId,
    startNewDreamSession,
    user,
    createAssistantThread,
    sendMessageToAssistant,
    runAssistantAndGetResponse,
    getShortInterpretation
  };
};
