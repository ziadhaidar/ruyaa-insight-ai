
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import { Dream, InterpretationSession, Message } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { 
  createThread, 
  addMessageToThread, 
  runAssistant, 
  checkRunStatus, 
  getMessages 
} from "@/integrations/openai/assistant";

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
  const [threadId, setThreadId] = useState<string | null>(null);
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

  // Process the dream interpretation with OpenAI Assistant
  const processDreamInterpretation = async () => {
    if (!currentDream || !user) return;
    
    setIsLoading(true);
    
    try {
      // Save the dream to the database first
      const { error: saveError } = await supabase
        .from('dreams')
        .insert([{
          id: currentDream.id,
          user_id: currentDream.user_id,
          dream_text: currentDream.dream_text,
          questions: [],
          answers: [],
        }]);
      
      if (saveError) {
        console.error("Error saving dream:", saveError);
        throw saveError;
      }
      
      // Create a new OpenAI thread
      const thread = await createThread();
      
      if (!thread) {
        throw new Error("Failed to create OpenAI thread");
      }
      
      setThreadId(thread.id);
      
      // Add the dream as a message to the thread
      await addMessageToThread(thread.id, currentDream.dream_text, user.id);
      
      // Run the assistant on the thread
      const run = await runAssistant(thread.id);
      
      if (!run) {
        throw new Error("Failed to run OpenAI assistant");
      }
      
      // Poll for completion
      let runResult = await pollRunStatus(thread.id, run.id);
      
      if (runResult?.status !== "completed") {
        throw new Error(`Run failed with status: ${runResult?.status}`);
      }
      
      // Get the assistant's response
      const messages = await getMessages(thread.id);
      
      if (!messages || messages.length < 2) {
        throw new Error("No response from assistant");
      }
      
      // Find the assistant's response (the latest assistant message)
      const assistantMessage = messages.find(m => m.role === "assistant");
      
      if (!assistantMessage) {
        throw new Error("No assistant message found");
      }
      
      // Extract the text from the assistant's response
      const responseText = assistantMessage.content[0]?.text?.value || "No interpretation available";
      
      // Create a new interpretation session
      const newSession: InterpretationSession = {
        dream: currentDream,
        messages: [
          {
            id: uuidv4(),
            dreamId: currentDream.id,
            content: currentDream.dream_text,
            sender: "user",
            timestamp: new Date().toISOString()
          },
          {
            id: uuidv4(),
            dreamId: currentDream.id,
            content: responseText,
            sender: "ai",
            timestamp: new Date().toISOString()
          }
        ],
        currentQuestion: 0,
        isComplete: false
      };
      
      setCurrentSession(newSession);
      setInterpretationSession(newSession);
      
      // Save the interpretation in the database
      await supabase
        .from('dreams')
        .update({
          interpretation: responseText
        })
        .eq('id', currentDream.id);
      
    } catch (error) {
      console.error("Error processing dream interpretation:", error);
      toast({
        title: "Interpretation failed",
        description: "We couldn't process your dream interpretation. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Poll the run status until it's complete or failed
  const pollRunStatus = async (threadId: string, runId: string, maxAttempts = 30, delayMs = 1000) => {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const status = await checkRunStatus(threadId, runId);
      
      if (!status) {
        return null;
      }
      
      if (["completed", "failed", "cancelled", "expired"].includes(status.status)) {
        return status;
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, delayMs));
      attempts++;
    }
    
    throw new Error("Maximum polling attempts reached");
  };

  // Ask a follow-up question about the dream
  const askQuestion = async (question: string) => {
    if (!interpretationSession || !threadId || !user) return;
    
    setIsLoading(true);
    
    try {
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
      
      setInterpretationSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: updatedMessages,
        };
      });
      
      setCurrentSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: updatedMessages,
        };
      });
      
      // Send question to OpenAI Assistant
      await addMessageToThread(threadId, question, user.id);
      
      // Run the assistant on the thread
      const run = await runAssistant(threadId);
      
      if (!run) {
        throw new Error("Failed to run OpenAI assistant");
      }
      
      // Poll for completion
      let runResult = await pollRunStatus(threadId, run.id);
      
      if (runResult?.status !== "completed") {
        throw new Error(`Run failed with status: ${runResult?.status}`);
      }
      
      // Get the assistant's response
      const messages = await getMessages(threadId);
      
      if (!messages) {
        throw new Error("No messages found");
      }
      
      // Find the assistant's response (the latest assistant message)
      const assistantMessages = messages.filter(m => m.role === "assistant");
      const latestAssistantMessage = assistantMessages[0]; // They come in reverse chronological order
      
      if (!latestAssistantMessage) {
        throw new Error("No assistant message found");
      }
      
      // Extract the text from the assistant's response
      const responseText = latestAssistantMessage.content[0]?.text?.value || "No response available";
      
      // Add the assistant's response to the messages
      const finalMessages: Message[] = [
        ...updatedMessages,
        {
          id: uuidv4(),
          dreamId: interpretationSession.dream.id,
          content: responseText,
          sender: "ai",
          timestamp: new Date().toISOString()
        }
      ];
      
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
    } catch (error) {
      console.error("Error processing question:", error);
      toast({
        title: "Question processing failed",
        description: "We couldn't process your question. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Submit an answer during interpretation
  const submitAnswer = async (answer: string): Promise<void> => {
    if (!currentSession || !threadId || !user) return;
    
    setIsLoading(true);
    
    try {
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
      
      setCurrentSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: updatedMessages,
        };
      });
      
      // Send answer to OpenAI Assistant
      await addMessageToThread(threadId, answer, user.id);
      
      // Run the assistant on the thread
      const run = await runAssistant(threadId);
      
      if (!run) {
        throw new Error("Failed to run OpenAI assistant");
      }
      
      // Poll for completion
      let runResult = await pollRunStatus(threadId, run.id);
      
      if (runResult?.status !== "completed") {
        throw new Error(`Run failed with status: ${runResult?.status}`);
      }
      
      // Get the assistant's response
      const messages = await getMessages(threadId);
      
      if (!messages) {
        throw new Error("No messages found");
      }
      
      // Find the assistant's response (the latest assistant message)
      const assistantMessages = messages.filter(m => m.role === "assistant");
      const latestAssistantMessage = assistantMessages[0]; // They come in reverse chronological order
      
      if (!latestAssistantMessage) {
        throw new Error("No assistant message found");
      }
      
      // Extract the text from the assistant's response
      const responseText = latestAssistantMessage.content[0]?.text?.value || "No response available";
      
      // Add the assistant's response to the messages
      const finalMessages: Message[] = [
        ...updatedMessages,
        {
          id: uuidv4(),
          dreamId: currentSession.dream.id,
          content: responseText,
          sender: "ai",
          timestamp: new Date().toISOString()
        }
      ];
      
      setCurrentSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: finalMessages,
          currentQuestion: prev.currentQuestion + 1
        };
      });
    } catch (error) {
      console.error("Error processing answer:", error);
      toast({
        title: "Answer processing failed",
        description: "We couldn't process your answer. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
    
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
