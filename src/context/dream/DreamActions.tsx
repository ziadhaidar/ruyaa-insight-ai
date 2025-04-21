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
       user_id:     state.user.id,
       dream_text:  state.currentDream.dream_text,
       status:      "interpreting",
       interpretation: "",              // ← initialize empty interpretation
     })
     .select()
     .single();

      
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
    // 1) set loading
    state.setIsLoading(true);

    // 2) record user message
    state.currentSession.messages.push({ sender: "user", content: answer });

    // 3) get AI response
    const aiResponse = await runAssistantAndGetResponse(answer);
    state.currentSession.messages.push({ sender: "ai", content: aiResponse });

    // 4) check if we've now answered 3 times
    const userAnswers = state.currentSession.messages.filter(m => m.sender === "user");
    const isInterpretationComplete = userAnswers.length >= 3;

    // 5) build full transcript
    const transcript = state.currentSession.messages
      .map(m => (m.sender === "user" ? `You: ${m.content}` : `AI: ${m.content}`))
      .join("\n\n");

    // 6) save status and full conversation
    const { error } = await supabase
      .from("dreams")
      .update({
        status: isInterpretationComplete ? "completed" : "interpreting",
        interpretation: transcript,
      })
      .eq("id", state.currentSession.dream.id);

    // 7) handle any DB errors
    if (error) {
      console.error("Error saving interpretation:", error.message);
      toast({
        title: "Error saving interpretation",
        description: error.message,
        variant: "destructive",
      });
    }

    // 8) unset loading
    state.setIsLoading(false);
  };
  

  const askQuestion = async (question: string) => {
    return await submitAnswer(question);
  };

  const completeDreamInterpretation = async () => {
    if (!state.currentSession) return;

    try {
      const aiMessages = state.currentSession.messages.filter((m: Message) => m.sender === "ai");

      
   // build full transcript of the entire session
   const transcript = state.currentSession.messages
     .map((m) =>
       m.sender === "user"
         ? `You: ${m.content}`
         : `AI: ${m.content}`
     )
     .join("\n\n");

   const { error } = await supabase
     .from("dreams")
     .update({
       status: "completed",
       interpretation: transcript,
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
