
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import { Dream, InterpretationSession, Message } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { useToast } from "@/components/ui/use-toast";

interface DreamContextType {
  currentDream: Dream | null;
  currentSession: InterpretationSession | null;
  interpretationSession: InterpretationSession | null;
  setCurrentDream: (dream: Dream | null) => void;
  startNewDreamSession: (dreamText: string) => void;
  processDreamInterpretation: () => void;
  askQuestion: (question: string) => void;
  submitAnswer: (answer: string) => Promise<void>;
  completeDreamInterpretation: () => void;
  sendToEmail: (dreamId: string) => Promise<void>;
  saveInterpretation: (interpretation: string) => Promise<void>;
  isLoading: boolean;
}

const DreamContext = createContext<DreamContextType | undefined>(undefined);

export const DreamProvider = ({ children }: { children: ReactNode }) => {
  const [currentDream, setCurrentDream] = useState<Dream | null>(null);
  const [currentSession, setCurrentSession] = useState<InterpretationSession | null>(null);
  const [interpretationSession, setInterpretationSession] = useState<InterpretationSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

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

        setCurrentSession(newSession);
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
    const updatedMessages: Message[] = [
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
      const aiResponse: Message = {
        id: uuidv4(),
        dreamId: interpretationSession.dream.id,
        content: `I'll analyze your question about "${question}" in relation to your dream about "${interpretationSession.dream.dream_text}"`,
        sender: "ai",
        timestamp: new Date().toISOString()
      };

      const finalMessages: Message[] = [...updatedMessages, aiResponse];

      setInterpretationSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: finalMessages,
          currentQuestion: prev.currentQuestion + 1
        };
      });

      setCurrentSession(prev => {
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

  // Submit an answer during interpretation
  const submitAnswer = async (answer: string): Promise<void> => {
    if (!currentSession) return;
    
    // Add user answer to messages
    const updatedMessages: Message[] = [
      ...currentSession.messages,
      {
        id: uuidv4(),
        dreamId: currentSession.dream.id,
        content: answer,
        sender: "user",
        timestamp: new Date().toISOString()
      }
    ];
    
    // Simulate AI response
    const aiResponse: Message = {
      id: uuidv4(),
      dreamId: currentSession.dream.id,
      content: `Thank you for your answer: "${answer}". Let me analyze this further.`,
      sender: "ai",
      timestamp: new Date().toISOString()
    };
    
    const finalMessages: Message[] = [...updatedMessages, aiResponse];
    
    setCurrentSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        messages: finalMessages,
        currentQuestion: prev.currentQuestion + 1
      };
    });
    
    return Promise.resolve();
  };
  
  // Complete the dream interpretation session
  const completeDreamInterpretation = () => {
    if (!currentSession) return;
    
    setCurrentSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        isComplete: true
      };
    });
  };
  
  // Send dream interpretation to user's email
  const sendToEmail = async (dreamId: string): Promise<void> => {
    // Example implementation
    toast({
      title: "Email Sent",
      description: "Your dream interpretation has been sent to your email.",
    });
    
    return Promise.resolve();
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
        const finalMessage: Message = {
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
        
        setCurrentSession(prev => {
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
        currentSession,
        setCurrentDream,
        startNewDreamSession,
        processDreamInterpretation,
        askQuestion,
        submitAnswer,
        completeDreamInterpretation,
        sendToEmail,
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
