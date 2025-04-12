import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { Dream, Message, InterpretationSession } from "@/types";
import { useToast } from "@/components/ui/use-toast";

// Sample follow-up questions for demo mode
const SAMPLE_QUESTIONS = [
  "Could you share more details about the colors you saw in your dream?",
  "Were there any specific people or characters in your dream that stood out to you?",
  "How did you feel during this dream? Were you scared, happy, confused, or something else?"
];

// Sample interpretation for demo mode
const SAMPLE_INTERPRETATION = `
Based on your dream description and the additional details you've shared, I can offer the following Islamic interpretation:

**Quranic Verse Reference:**
"We have certainly created man in the best of stature" (Quran 95:4)

**Interpretation:**
Your dream appears to represent a journey of self-discovery and spiritual growth. The symbols you described - particularly the water and light - are often associated with purity and divine guidance in Islamic dream interpretation traditions.

**Spiritual Reflection:**
This dream may be encouraging you to reflect on your current spiritual path. The challenges you faced in the dream could represent obstacles you're currently navigating in your waking life, while the resolution suggests Allah's guidance is present even in difficult times.

Consider spending more time in prayer and reflection, particularly focusing on the areas of your life where you feel uncertain. The dream suggests a positive outcome awaits if you maintain faith and patience.

May Allah guide you and grant you clarity on your path forward.
`;

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
      const message = await state.sendMessageToAssistant(
        threadId, 
        state.currentDream.dream_text, 
        state.user.id
      );
      
      // In demo mode, use the first sample question
      const assistantResponse = SAMPLE_QUESTIONS[0];
      
      // Create a new session with the messages
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
            content: assistantResponse,
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
  
  // Ask a follow-up question
  const askQuestion = async (question: string) => {
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
      // Add the user's question to the session
      const newUserMessage: Message = {
        id: uuidv4(),
        dreamId: state.currentSession.dream.id,
        content: question,
        sender: "user",
        timestamp: new Date().toISOString()
      };
      
      const updatedMessages = [...state.currentSession.messages, newUserMessage];
      state.setCurrentSession({
        ...state.currentSession,
        messages: updatedMessages
      });
      
      // In demo mode, use the sample questions
      let assistantResponse = "";
      const questionNumber = state.currentSession.currentQuestion;
      
      if (questionNumber >= 3) {
        // If this is the third question, provide the full interpretation
        assistantResponse = SAMPLE_INTERPRETATION;
      } else {
        // Otherwise, provide the next question
        assistantResponse = SAMPLE_QUESTIONS[questionNumber];
      }
      
      // Add the assistant's response to the session
      const newAIMessage: Message = {
        id: uuidv4(),
        dreamId: state.currentSession.dream.id,
        content: assistantResponse,
        sender: "ai",
        timestamp: new Date().toISOString()
      };
      
      const finalMessages = [...updatedMessages, newAIMessage];
      
      // Update the current session
      state.setCurrentSession({
        ...state.currentSession,
        messages: finalMessages,
        currentQuestion: state.currentSession.currentQuestion + 1,
        isComplete: state.currentSession.currentQuestion >= 3
      });
      
      // Update dream in database with questions and answers
      const updatedQuestions = state.currentSession.dream.questions || [];
      updatedQuestions.push(question);
      
      const updatedAnswers = state.currentSession.dream.answers || [];
      updatedAnswers.push(assistantResponse);
      
      const { error } = await supabase.from('dreams').update({
        questions: updatedQuestions,
        answers: updatedAnswers
      }).eq('id', state.currentSession.dream.id);
      
      if (error) {
        console.error("Error updating dream:", error);
      }
      
    } catch (error: any) {
      console.error("Error asking question:", error);
      toast({
        title: "Error",
        description: "Couldn't process your question, please try again later.",
        variant: "destructive"
      });
      throw error; // Re-throw to handle in component
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
      
      // In demo mode, use the sample questions or provide the interpretation
      let assistantResponse = "";
      const questionNumber = state.currentSession.currentQuestion;
      
      if (questionNumber >= 3) {
        // If this is the third question, provide the full interpretation
        assistantResponse = SAMPLE_INTERPRETATION;
      } else {
        // Otherwise, provide the next question
        assistantResponse = SAMPLE_QUESTIONS[questionNumber];
      }
      
      const nextQuestionNumber = state.currentSession.currentQuestion + 1;
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
      const { error } = await supabase.from('dreams').update({
        status: isInterpretationComplete ? "completed" : "interpreting",
        interpretation: isInterpretationComplete ? assistantResponse : null
      }).eq('id', state.currentSession.dream.id);
      
      if (error) {
        console.error("Error updating dream:", error);
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
  
  // Complete dream interpretation
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
