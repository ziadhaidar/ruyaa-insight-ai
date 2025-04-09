
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import { Dream, InterpretationSession, Message } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface DreamContextType {
  currentDream: Dream | null;
  interpretationSession: InterpretationSession | null;
  setCurrentDream: (dream: Dream | null) => void;
  startNewDreamSession: (dreamText: string) => void;
  processDreamInterpretation: () => void;
  askQuestion: (question: string) => void;
  saveInterpretation: (interpretation: string) => Promise<void>;
  isLoading: boolean;
}

const DreamContext = createContext<DreamContextType | undefined>(undefined);

export const DreamProvider = ({ children }: { children: ReactNode }) => {
  const [currentDream, setCurrentDream] = useState<Dream | null>(null);
  const [interpretationSession, setInterpretationSession] = useState<InterpretationSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // When starting a new dream session
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

  // Process the dream interpretation
  const processDreamInterpretation = () => {
    // This would typically involve AI processing
    setIsLoading(true);

    // Example placeholder implementation
    setTimeout(() => {
      if (currentDream) {
        // Create a new interpretation session
        const newSession: InterpretationSession = {
          dream: currentDream,
          messages: [
            {
              id: uuidv4(),
              dreamId: currentDream.id,
              content: "Thank you for sharing your dream. I'll analyze it according to Islamic tradition.",
              sender: "ai",
              timestamp: new Date().toISOString()
            }
          ],
          currentQuestion: 0,
          isComplete: false
        };

        setInterpretationSession(newSession);
        setIsLoading(false);
      }
    }, 1500);
  };

  // Ask a question about the dream
  const askQuestion = (question: string) => {
    if (!interpretationSession) return;

    setIsLoading(true);

    // Add user question to messages
    const updatedMessages = [
      ...interpretationSession.messages,
      {
        id: uuidv4(),
        dreamId: interpretationSession.dream.id,
        content: question,
        sender: "user",
        timestamp: new Date().toISOString()
      }
    ];

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: uuidv4(),
        dreamId: interpretationSession.dream.id,
        content: `I'll analyze your question about "${question}" in relation to your dream about "${interpretationSession.dream.dream_text}"`,
        sender: "ai",
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, aiResponse];

      setInterpretationSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: finalMessages,
          currentQuestion: prev.currentQuestion + 1
        };
      });

      setIsLoading(false);
    }, 1500);
  };

  // Save the final interpretation
  const saveInterpretation = async (interpretation: string): Promise<void> => {
    if (!currentDream || !user) {
      throw new Error("No dream or user to save interpretation");
    }

    setIsLoading(true);

    try {
      // Save to Supabase
      const { error } = await supabase
        .from('dreams')
        .update({ interpretation })
        .eq('id', currentDream.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setCurrentDream(prev => {
        if (!prev) return null;
        return {
          ...prev,
          interpretation,
          status: "completed"
        };
      });

      if (interpretationSession) {
        // Add final message
        const finalMessage = {
          id: uuidv4(),
          dreamId: currentDream.id,
          content: "The interpretation is now complete. Thank you for using our service.",
          sender: "ai",
          timestamp: new Date().toISOString()
        };

        setInterpretationSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [...prev.messages, finalMessage],
            isComplete: true
          };
        });
      }
    } catch (error) {
      console.error("Error saving interpretation:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DreamContext.Provider
      value={{
        currentDream,
        interpretationSession,
        setCurrentDream,
        startNewDreamSession,
        processDreamInterpretation,
        askQuestion,
        saveInterpretation,
        isLoading
      }}
    >
      {children}
    </DreamContext.Provider>
  );
};

export const useDream = () => {
  const context = useContext(DreamContext);
  if (context === undefined) {
    throw new Error("useDream must be used within a DreamProvider");
  }
  return context;
};
