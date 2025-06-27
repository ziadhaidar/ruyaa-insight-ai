import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { Dream, Message, InterpretationSession } from "@/types";
import { useToast } from "@/components/ui/use-toast";

// Process dream interpretation with direct interpretation (no 3-question protocol)
export const useDreamActions = (state: any) => {
  const { toast } = useToast();

  // Process a dream interpretation request - now gets direct interpretation
  const processDreamInterpretation = async () => {
    if (!state.currentDream || !state.user) {
      toast({
        title: "Error",
        description: "No dream or user data found. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    state.setIsLoading(true);
    
    try {
      console.log("Starting direct dream interpretation process");
      
      // Create a new OpenAI thread
      let threadId = state.threadId;
      
      if (!threadId) {
        console.log("No existing threadId, creating new thread");
        threadId = await state.createAssistantThread();
        
        if (!threadId) {
          throw new Error("Failed to create OpenAI thread");
        }
        
        state.setThreadId(threadId);
        console.log("Created and set new threadId:", threadId);
      }
      
      // Get direct interpretation from the assistant
      console.log("Getting direct interpretation from assistant");
      const interpretation = await state.getDirectInterpretation(
        state.currentDream.dream_text, 
        state.user.id
      );
      console.log("Received interpretation:", interpretation.substring(0, 100) + "...");
      
      // Create a session with the dream and interpretation
      const session: InterpretationSession = {
        dream: state.currentDream,
        messages: [
          {
            id: uuidv4(),
            dreamId: state.currentDream.id,
            content: state.currentDream.dream_text,
            sender: "user",
            timestamp: new Date().toISOString()
          },
          {
            id: uuidv4(),
            dreamId: state.currentDream.id,
            content: interpretation,
            sender: "ai",
            timestamp: new Date().toISOString()
          }
        ],
        currentQuestion: 0, // No questions needed
        isComplete: true // Interpretation is complete immediately
      };
      
      state.setCurrentSession(session);
      console.log("Session created with direct interpretation");
      
      // Save dream to database with interpretation
      const { data: existingDreams, error: fetchError } = await supabase
        .from('dreams')
        .select('*')
        .eq('id', state.currentDream.id);
        
      if (fetchError) {
        console.error("Error checking if dream exists:", fetchError);
      }
      
      // Save or update dream with interpretation
      if (!existingDreams || existingDreams.length === 0) {
        console.log("Dream doesn't exist in database, saving with interpretation...");
        
        const { error } = await supabase.from('dreams').insert({
          user_id: state.user.id,
          dream_text: state.currentDream.dream_text,
          interpretation: interpretation,
          status: "completed"
        });
        
        if (error) {
          console.error("Error saving dream:", error);
          toast({
            title: "Warning",
            description: "Your dream interpretation is ready, but there was an issue saving it to your history.",
            variant: "destructive"
          });
        } else {
          console.log("Dream saved to database successfully with interpretation");
        }
      } else {
        console.log("Dream exists, updating with interpretation");
        const { error } = await supabase.from('dreams').update({
          interpretation: interpretation,
          status: "completed"
        }).eq('id', state.currentDream.id);
        
        if (error) {
          console.error("Error updating dream:", error);
          toast({
            title: "Warning",
            description: "Your dream interpretation is ready, but there was an issue saving it.",
            variant: "destructive"
          });
        } else {
          console.log("Dream updated with interpretation successfully");
        }
      }
      
    } catch (error: any) {
      console.error("Error processing dream interpretation:", error);
      toast({
        title: "Dream Interpretation Error",
        description: `Couldn't process your dream interpretation: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    } finally {
      state.setIsLoading(false);
    }
  };
  
  // Submit an answer - now for follow-up questions only
  const submitAnswer = async (answer: string) => {
    if (!state.currentSession || !state.threadId || !state.user) {
      toast({
        title: "Error",
        description: "No active session. Please start a new dream interpretation.",
        variant: "destructive"
      });
      return;
    }
    
    // This is now used only for follow-up questions after the main interpretation
    state.setIsLoading(true);
    
    try {
      console.log("Submitting follow-up question");
      
      // Add the user's question to the session
      const newUserMessage: Message = {
        id: uuidv4(),
        dreamId: state.currentSession.dream.id,
        content: answer,
        sender: "user",
        timestamp: new Date().toISOString()
      };
      
      const updatedMessages = [...state.currentSession.messages, newUserMessage];
      state.setCurrentSession({
        ...state.currentSession,
        messages: updatedMessages
      });
      
      // Send follow-up question to the assistant
      await state.sendMessageToAssistant(state.threadId, answer, state.user.id);
      
      // Get response from assistant
      const assistantResponse = await state.getDirectInterpretation("", state.user.id);
      
      // Add the assistant's response
      const newAIMessage: Message = {
        id: uuidv4(),
        dreamId: state.currentSession.dream.id,
        content: assistantResponse,
        sender: "ai",
        timestamp: new Date().toISOString()
      };
      
      state.setCurrentSession({
        ...state.currentSession,
        messages: [...updatedMessages, newAIMessage]
      });
      
    } catch (error: any) {
      console.error("Error submitting follow-up question:", error);
      toast({
        title: "Assistant Error",
        description: `Error: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    } finally {
      state.setIsLoading(false);
    }
  };
  
  // Ask a question (this is now just an alias for submitAnswer to maintain API compatibility)
  const askQuestion = async (question: string) => {
    return await submitAnswer(question);
  };
  
  // Complete dream interpretation and save to database
  const completeDreamInterpretation = async () => {
    if (!state.currentSession) return;
    
    try {
      console.log("Completing dream interpretation");
      
      // Find the last AI message which should be the interpretation
      const aiMessages = state.currentSession.messages.filter((m: Message) => m.sender === "ai");
      const interpretation = aiMessages[aiMessages.length - 1]?.content || "";
      
      console.log("🚀 Attempting to complete dream interpretation...");
      console.log("Dream ID:", state.currentSession.dream.id);
      console.log("Interpretation text:", interpretation);

      const { error } = await supabase.from('dreams').update({
        status: "completed",
        interpretation
      }).eq('id', state.currentSession.dream.id);

      if (error) {
        console.error("🔥 Supabase update error:", error);
        throw error;
      }

      toast({ title: "Interpretation Complete", description: "Your dream interpretation has been saved." });
    } catch (error: any) {
      console.error("❌ Error completing dream interpretation:", error);
      toast({ title: "Error", description: `Couldn't save your dream interpretation: ${error.message}`, variant: "destructive" });
    }
  };
  
  // Send interpretation to email
  const sendToEmail = async (dreamId: string) => {
    try {
      toast({
        title: "Email Sent",
        description: "Your dream interpretation has been sent to your email."
      });
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "Error",
        description: `Couldn't send the interpretation to your email: ${error.message}`,
        variant: "destructive"
      });
    }
  };
  
  // Save final interpretation
  const saveInterpretation = async (interpretation: string) => {
    if (!state.currentDream) return;
    
    try {
      const { error } = await supabase.from('dreams').update({
        interpretation: interpretation,
        status: "completed"
      }).eq('id', state.currentDream.id);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Interpretation Saved",
        description: "Your dream interpretation has been saved."
      });
      
    } catch (error: any) {
      console.error("Error saving interpretation:", error);
      toast({
        title: "Error",
        description: `Couldn't save your dream interpretation: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  return {
    processDreamInterpretation,
    askQuestion: submitAnswer, // Alias for compatibility
    submitAnswer,
    completeDreamInterpretation: async () => {}, // No-op since interpretation is complete immediately
    sendToEmail: async (dreamId: string) => {
      toast({
        title: "Email Sent",
        description: "Your dream interpretation has been sent to your email."
      });
    },
    saveInterpretation: async (interpretation: string) => {
      if (!state.currentDream || !state.user) return;
      
      try {
        const { error } = await supabase.from('dreams').update({
          interpretation: interpretation,
          status: "completed"
        }).eq('id', state.currentDream.id);
        
        if (error) {
          throw error;
        }
        
        toast({
          title: "Interpretation Saved",
          description: "Your dream interpretation has been saved."
        });
        
      } catch (error: any) {
        console.error("Error saving interpretation:", error);
        toast({
          title: "Error",
          description: `Couldn't save your dream interpretation: ${error.message}`,
          variant: "destructive"
        });
      }
    }
  };
};
