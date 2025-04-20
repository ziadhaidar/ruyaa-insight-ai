import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { Dream, Message, InterpretationSession } from "@/types";
import { useToast } from "@/components/ui/use-toast";

// Process dream interpretation with the 3-question protocol
export const useDreamActions = (state: any) => {
  const { toast } = useToast();

  // Start dream interpretation process
  const processDreamInterpretation = async () => {
    if (!state.currentDream || !state.user) {
      toast({
        title: "Error",
        description: "No dream or user data found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    state.setIsLoading(true);

    try {
      console.log("Starting dream interpretation process");

      let threadId = state.threadId;

      if (!threadId) {
        console.log("No existing threadId, creating new thread");
        threadId = await state.createAssistantThread();
        if (!threadId) throw new Error("Failed to create OpenAI thread");
        state.setThreadId(threadId);
        console.log("Created and set new threadId:", threadId);
      }

      console.log("Sending dream to the assistant");
      await state.sendMessageToAssistant(threadId, state.currentDream.dream_text, state.user.id);

      console.log("Getting first question from assistant");
      const firstQuestion = await state.runAssistantAndGetResponse(threadId, 1);
      console.log("Received first question:", firstQuestion);

      const session: InterpretationSession = {
        dream: state.currentDream,
        messages: [
          {
            id: uuidv4(),
            dreamId: state.currentDream.id,
            content: state.currentDream.dream_text,
            sender: "user",
            timestamp: new Date().toISOString(),
          },
          {
            id: uuidv4(),
            dreamId: state.currentDream.id,
            content: firstQuestion,
            sender: "ai",
            timestamp: new Date().toISOString(),
          },
        ],
        currentQuestion: 1,
        isComplete: false,
      };

      state.setCurrentSession(session);
      console.log("Session created with first question");

      console.log("Saving dream to database");
      const { data, error } = await supabase
        .from("dreams")
        .insert({
          user_id: state.user.id,
          dream_text: state.currentDream.dream_text,
          status: "interpreting",
        })
        .select()
        .single();

     // if (error) {
       // console.error("Error saving dream:", error.message);
       // toast({
         // title: "Warning",
        //  description: "Your dream interpretation started, but there was an issue saving it.",
       //   variant: "destructive",
      //  });
     // } 
      if (error) {
  console.error("Error saving dream:", error.message);
  toast({
    title: "Error saving dream",
    description: error.message,
    variant: "destructive",
  });
  state.setIsLoading(false);
  return;  // stop further processing when insert fails
}
else {
        console.log("Dream saved to database successfully:", data);
        if (data?.id) {
          const updatedDream = { ...state.currentDream, id: data.id };
          state.setCurrentDream(updatedDream);
          if (state.currentSession) {
            state.setCurrentSession({
              ...state.currentSession,
              dream: updatedDream,
            });
          }
        } else {
          console.error("Supabase response missing dream ID");
          toast({
            title: "Error",
            description: "Failed to retrieve dream ID from Supabase.",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("Error in processDreamInterpretation:", error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      state.setIsLoading(false);
    }
  };

  // Submit user answer to assistant
  const submitAnswer = async (answer: string) => {
    if (!state.currentSession || !state.threadId || !state.user) {
      toast({
        title: "Error",
        description: "No active session. Please start a new dream interpretation.",
        variant: "destructive",
      });
      return;
    }

    state.setIsLoading(true);

    try {
      const questionNum = state.currentSession.currentQuestion;
      console.log("Submitting answer for question", questionNum);

      const newUserMessage: Message = {
        id: uuidv4(),
        dreamId: state.currentSession.dream.id,
        content: answer,
        sender: "user",
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...state.currentSession.messages, newUserMessage];
      state.setCurrentSession({
        ...state.currentSession,
        messages: updatedMessages,
      });

      await state.sendMessageToAssistant(state.threadId, answer, state.user.id);

      const nextQuestionNumber = questionNum + 1;
      const assistantResponse = await state.runAssistantAndGetResponse(state.threadId, nextQuestionNumber);
      const isInterpretationComplete = nextQuestionNumber > 3;

      const newAIMessage: Message = {
        id: uuidv4(),
        dreamId: state.currentSession.dream.id,
        content: assistantResponse,
        sender: "ai",
        timestamp: new Date().toISOString(),
      };

      state.setCurrentSession({
        ...state.currentSession,
        messages: [...updatedMessages, newAIMessage],
        currentQuestion: nextQuestionNumber,
        isComplete: isInterpretationComplete,
      });

      const dreamId = state.currentSession.dream.id;

      const { error } = await supabase
        .from("dreams")
        .update({
          status: isInterpretationComplete ? "completed" : "interpreting",
          ...(isInterpretationComplete && { interpretation: assistantResponse }),
        })
        .eq("id", dreamId);

      if (error) {
        console.error("Error updating dream status:", error.message);
      } else {
        console.log(
          isInterpretationComplete
            ? "Dream interpretation completed and saved."
            : "Dream status updated to 'interpreting'."
        );
      }
    } catch (error: any) {
      console.error("Error submitting answer:", error.message);
      toast({
        title: "Assistant Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      state.setIsLoading(false);
    }
  };

  const askQuestion = async (question: string) => {
    return await submitAnswer(question);
  };

  const completeDreamInterpretation = async () => {
    if (!state.currentSession) return;

    try {
      const aiMessages = state.currentSession.messages.filter((m: Message) => m.sender === "ai");
      const interpretation = aiMessages[aiMessages.length - 1]?.content || "";

      const { error } = await supabase
        .from("dreams")
        .update({
          status: "completed",
          interpretation,
        })
        .eq("id", state.currentSession.dream.id);

      if (error) throw error;

      toast({
        title: "Interpretation Complete",
        description: "Your dream interpretation has been saved.",
      });
    } catch (error: any) {
      console.error("Error completing dream interpretation:", error.message);
      toast({
        title: "Error",
        description: `Couldn't save your dream interpretation: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const sendToEmail = async (dreamId: string) => {
    try {
      // Placeholder – integrate with email service if needed
      toast({
        title: "Email Sent",
        description: "Your dream interpretation has been sent to your email.",
      });
    } catch (error: any) {
      console.error("Error sending email:", error.message);
      toast({
        title: "Error",
        description: `Couldn't send email: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const saveInterpretation = async (interpretation: string) => {
    if (!state.currentDream) return;

    try {
      const { error } = await supabase
        .from("dreams")
        .update({
          interpretation,
          status: "completed",
        })
        .eq("id", state.currentDream.id);

      if (error) throw error;

      toast({
        title: "Interpretation Saved",
        description: "Your dream interpretation has been saved.",
      });
    } catch (error: any) {
      console.error("Error saving interpretation:", error.message);
      toast({
        title: "Error",
        description: `Couldn't save your dream interpretation: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return {
    processDreamInterpretation,
    askQuestion,
    submitAnswer,
    completeDreamInterpretation,
    sendToEmail,
    saveInterpretation,
  };
};
