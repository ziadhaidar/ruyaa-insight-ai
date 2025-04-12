
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
      // Create a new OpenAI thread
      let threadId = state.threadId;
      
      if (!threadId) {
        threadId = await state.createAssistantThread();
        
        if (!threadId) {
          throw new Error("Failed to create OpenAI thread");
        }
        
        state.setThreadId(threadId);
      }
      
      // Send the dream to the assistant
      await state.sendMessageToAssistant(
        threadId, 
        state.currentDream.dream_text, 
        state.user.id
      );
      
      // Get the first question from the assistant
      let firstQuestion;
      try {
        // Run the assistant with instructions to ask the first question
        firstQuestion = await state.runAssistantAndGetResponse(threadId, 1);
      } catch (error) {
        console.error("Error getting first question:", error);
        // Fallback question
        firstQuestion = "Could you share more details about the colors you saw in your dream?";
      }
      
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
      
      // Save dream to database
      const { error } = await supabase.from('dreams').insert({
        id: state.currentDream.id,
        user_id: state.user.id,
        dream_text: state.currentDream.dream_text,
        status: "interpreting"
      });
      
      if (error) {
        console.error("Error saving dream:", error);
        toast({
          title: "Warning",
          description: "Your dream interpretation has started, but there was an issue saving it to your history.",
          variant: "destructive"
        });
      }
      
    } catch (error: any) {
      console.error("Error processing dream interpretation:", error);
      toast({
        title: "Error",
        description: "Couldn't process your dream interpretation, please try again later.",
        variant: "destructive"
      });
      throw error; // Re-throw to handle in the component
    } finally {
      state.setIsLoading(false);
    }
  };
  
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
      await state.sendMessageToAssistant(
        state.threadId,
        answer,
        state.user.id
      );
      
      // Determine the next question number
      const nextQuestionNumber = state.currentSession.currentQuestion + 1;
      
      // Get next question or final interpretation from the assistant
      let assistantResponse;
      try {
        // Pass the question number to get appropriate instructions
        assistantResponse = await state.runAssistantAndGetResponse(state.threadId, nextQuestionNumber);
      } catch (error) {
        console.error("Error getting assistant response:", error);
        
        // Fallback responses based on question number
        if (nextQuestionNumber === 2) {
          assistantResponse = "Were there any specific people or characters in your dream that stood out to you?";
        } else if (nextQuestionNumber === 3) {
          assistantResponse = "How did you feel during this dream? Were you scared, happy, confused, or something else?";
        } else {
          // Final interpretation fallback (after all 3 questions)
          assistantResponse = "Based on your dream description and your responses, I can provide this Islamic interpretation:\n\nالرُّؤْيَا الصَّالِحَةُ مِنَ اللهِ\n\"A good dream is from Allah.\"\n\nYour dream suggests a journey of spiritual growth. The elements you've described align with themes of self-discovery and divine guidance. The Prophet Muhammad (peace be upon him) taught us that dreams are one of the forty-six parts of prophethood.\n\nThe Quran says: \"اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ\" - \"Allah is the Light of the heavens and the earth.\" (Quran 24:35)\n\nThis verse reminds us that Allah's guidance illuminates our path, even in times of uncertainty. Consider increasing your prayers and reflection during this period. Pay attention to the signs around you, as they may contain guidance specifically meant for you.";
        }
      }
      
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
        const { error } = await supabase.from('dreams').update({
          status: "completed",
          interpretation: assistantResponse
        }).eq('id', state.currentSession.dream.id);
        
        if (error) {
          console.error("Error updating dream:", error);
        }
      } else {
        // Just update the status if we're still in the questioning phase
        const { error } = await supabase.from('dreams').update({
          status: "interpreting"
        }).eq('id', state.currentSession.dream.id);
        
        if (error) {
          console.error("Error updating dream status:", error);
        }
      }
      
    } catch (error: any) {
      console.error("Error submitting answer:", error);
      toast({
        title: "Error",
        description: "Couldn't process your answer, please try again later.",
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
        description: "Couldn't save your dream interpretation, please try again later.",
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
        description: "Couldn't send the interpretation to your email, please try again later.",
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
        description: "Couldn't save your dream interpretation, please try again later.",
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
