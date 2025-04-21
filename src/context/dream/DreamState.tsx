import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Dream, InterpretationSession, Message } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useOpenAIAssistant } from "@/hooks/useOpenAIAssistant";

export const useDreamState = () => {
  const [currentDream, setCurrentDream] = useState<Dream | null>(null);
  const [currentSession, setCurrentSession] = useState<InterpretationSession | null>(null);
  const [interpretationSession, setInterpretationSession] = useState<InterpretationSession | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null); // moved here
  const { user } = useAuth();
  
  const { 
    isLoading, 
    setIsLoading,
    createAssistantThread,
    sendMessageToAssistant,
    runAssistantAndGetResponse
  } = useOpenAIAssistant();

  // Create a new dream session
  const startNewDreamSession = (dreamText: string) => {
    if (!user) return;

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
    runAssistantAndGetResponse
  };
};
