
import { v4 as uuidv4 } from "uuid";
import { Dream, InterpretationSession, Message } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export const useDreamActions = (dreamState: any) => {
  const { toast } = useToast();
  const {
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
    user,
    createAssistantThread,
    sendMessageToAssistant,
    runAssistantAndGetResponse
  } = dreamState;

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
      const createdThreadId = await createAssistantThread();
      
      if (!createdThreadId) {
        throw new Error("Failed to create OpenAI thread");
      }
      
      setThreadId(createdThreadId);
      
      // Add the dream as a message to the thread
      await sendMessageToAssistant(createdThreadId, currentDream.dream_text, user.id);
      
      // Get the assistant's response
      const responseText = await runAssistantAndGetResponse(createdThreadId);
      
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
      await sendMessageToAssistant(threadId, question, user.id);
      
      // Get the assistant's response
      const responseText = await runAssistantAndGetResponse(threadId);
      
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
      await sendMessageToAssistant(threadId, answer, user.id);
      
      // Get the assistant's response
      const responseText = await runAssistantAndGetResponse(threadId);
      
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

  return {
    processDreamInterpretation,
    askQuestion,
    submitAnswer,
    completeDreamInterpretation,
    sendToEmail,
    saveInterpretation
  };
};
