
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { Dream, Message, InterpretationSession } from "@/types";
import { useToast } from "@/components/ui/use-toast";

// Process dream interpretation with the 3-question protocol
export const useDreamActions = (state: any) => {
  const { toast } = useToast();

  // Process a dream interpretation request
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
      console.log("Starting dream interpretation process");
      
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
      
      // Send the dream to the assistant
      console.log("Sending dream to the assistant");
      await state.sendMessageToAssistant(
        threadId, 
        state.currentDream.dream_text, 
        state.user.id
      );
      
      // Get the first question from the assistant
      console.log("Getting first question from assistant");
      const firstQuestion = await state.runAssistantAndGetResponse(threadId, 1);
      console.log("Received first question:", firstQuestion);
      
      // Create a new session with the initial message exchange
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
            content: firstQuestion,
            sender: "ai",
            timestamp: new Date().toISOString()
          }
        ],
        currentQuestion: 1,
        isComplete: false
      };
      
      state.setCurrentSession(session);
      console.log("Session created with first question");
      
console.log("Saving dream to database");

const { data, error } = await supabase.from('dreams').insert({
  user_id: state.user.id,
  dream_text: state.currentDream.dream_text,
  status: "interpreting"
}).select().single();

if (error) {
  console.error("Error saving dream:", error.message, "Context: Failed to insert dream data into Supabase.");
  toast({
    title: "Warning",
    description: "Your dream interpretation has started, but there was an issue saving it to your history.",
    variant: "destructive"
  });
} else {
  console.log("Dream saved to database successfully:", data);
}

if (error) {
  console.error("Error saving dream:", error.message, "Context: Failed to insert dream data into Supabase.");

  toast({
    title: "Warning",
    description: "Your dream interpretation has started, but there was an issue saving it to your history.",
    variant: "destructive"
  });
} else {
  console.log("Dream saved to database successfully", data);

  // If data is returned and contains the id, update the state
  if (data && data.id) {
    const updatedDream = { ...state.currentDream, id: data.id };
    state.setCurrentDream(updatedDream);

    if (state.currentSession) {
      state.setCurrentSession({
        ...state.currentSession,
        dream: updatedDream
      });
    }
  } else {
    console.error("Supabase response doesn't contain the dream ID:", data);
    toast({
      title: "Error",
      description: "Failed to retrieve dream ID from Supabase response.",
      variant: "destructive"
    });
  }
}
    }
  
  // Submit an answer to a question
  const submitAnswer = async (answer: string) => {
    if (!state.currentSession || !state.threadId || !state.user) {
      toast({
        title: "Error",
        description: "No active session. Please start a new dream interpretation.",
        variant: "destructive"
      });
      return;
    }
    
    state.setIsLoading(true);
    
    try {
      console.log("Submitting answer for question", state.currentSession.currentQuestion);
      
      // Add the user's answer to the session
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
      
      // Send answer to the assistant
      console.log("Sending answer to the assistant");
      await state.sendMessageToAssistant(
        state.threadId,
        answer,
        state.user.id
      );
      
      // Determine the next question number
      const nextQuestionNumber = state.currentSession.currentQuestion + 1;
      console.log("Next question number:", nextQuestionNumber);
      
      // Get next question or final interpretation from the assistant
      console.log("Getting response from assistant");
      const assistantResponse = await state.runAssistantAndGetResponse(state.threadId, nextQuestionNumber);
      console.log("Received assistant response");
      
      const isInterpretationComplete = nextQuestionNumber > 3;
      
      // Add the assistant's response to the session
      const newAIMessage: Message = {
        id: uuidv4(),
        dreamId: state.currentSession.dream.id,
        content: assistantResponse,
        sender: "ai",
        timestamp: new Date().toISOString()
      };
      
      // Update the current session
      state.setCurrentSession({
        ...state.currentSession,
        messages: [...updatedMessages, newAIMessage],
        currentQuestion: nextQuestionNumber,
        isComplete: isInterpretationComplete
      });
      
      // Update dream in database
      if (isInterpretationComplete) {
        console.log("Interpretation complete, updating dream status to completed");
     const { error } = await supabase.from('dreams').update({
  status: "completed",
  interpretation: assistantResponse
}).eq('id', state.currentSession.dream.id);

if (error) {
  console.error("Error updating dream status:", error.message, "Context: Failed to mark dream as completed.");
} else {
  console.log("Dream status updated to completed successfully.");
}

        
        if (error) {
          console.error("Error updating dream:", error);
        } else {
          console.log("Dream updated to completed successfully");
        }
      } else {
        // Just update the status if we're still in the questioning phase
        console.log("Still in questioning phase, updating dream status");
        const { error } = await supabase.from('dreams').update({
          status: "interpreting"
        }).eq('id', state.currentSession.dream.id);
        
        if (error) {
          console.error("Error updating dream status:", error);
        } else {
          console.log("Dream status updated successfully");
        }
      }
      
    } catch (error: any) {
      console.error("Error submitting answer:", error);
      toast({
        title: "Assistant Error",
        description: `Error: ${error.message}`,
        variant: "destructive"
      });
      throw error; // Re-throw to handle in component
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
      
      // Update the dream status and interpretation in the database
      const { error } = await supabase.from('dreams').update({
        status: "completed",
        interpretation: interpretation
      }).eq('id', state.currentSession.dream.id);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Interpretation Complete",
        description: "Your dream interpretation has been saved."
      });
      
    } catch (error: any) {
      console.error("Error completing dream interpretation:", error);
      toast({
        title: "Error",
        description: `Couldn't save your dream interpretation: ${error.message}`,
        variant: "destructive"
      });
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
    askQuestion,
    submitAnswer,
    completeDreamInterpretation,
    sendToEmail,
    saveInterpretation
  };
};
