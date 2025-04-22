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
        variant: "destructive",
      });
      return;
    }
    state.setIsLoading(true);
    try {
      console.log("Starting dream interpretation process");
      // Create or reuse OpenAI thread
      let threadId = state.threadId;
      if (!threadId) {
        console.log("No existing threadId, creating new thread");
        threadId = await state.createAssistantThread();
        if (!threadId) throw new Error("Failed to create OpenAI thread");
        state.setThreadId(threadId);
        console.log("Created and set new threadId:", threadId);
      }
      // Send dream to assistant
      console.log("Sending dream to the assistant");
      await state.sendMessageToAssistant(threadId, state.currentDream.dream_text, state.user.id);
      // Get first question
      console.log("Getting first question from assistant");
      const firstQuestion = await state.runAssistantAndGetResponse(threadId, 1);
      console.log("Received first question:", firstQuestion);
      // Initialize session
      const session: InterpretationSession = {
        dream: state.currentDream,
        messages: [
          { id: uuidv4(), dreamId: state.currentDream.id, content: state.currentDream.dream_text, sender: "user", timestamp: new Date().toISOString() },
          { id: uuidv4(), dreamId: state.currentDream.id, content: firstQuestion, sender: "ai", timestamp: new Date().toISOString() },
        ],
        currentQuestion: 1,
        isComplete: false,
      };
      state.setCurrentSession(session);
      console.log("Session created with first question");
      // Save initial dream row with empty arrays
      console.log("Saving dream to database");
      const { data, error } = await supabase
        .from('dreams')
        .insert({
          user_id:        state.user.id,
          dream_text:     state.currentDream.dream_text,
          status:         "interpreting",
          questions:      [],
          answers:        [],
          interpretation: "",
        })
        .select()
        .single();
      if (error) {
        console.error("Error saving dream:", error);
        toast({ title: "Warning", description: "Your dream interpretation has started, but there was an issue saving it to your history.", variant: "destructive" });
      } else {
        console.log("Dream saved to database successfully");
      }
    } catch (error: any) {
      console.error("Error processing dream interpretation:", error);
      toast({ title: "Dream Interpretation Error", description: `Couldn't process your dream interpretation: ${error.message}`, variant: "destructive" });
      throw error;
    } finally {
      state.setIsLoading(false);
    }
  };

  // Submit an answer to a question
  const submitAnswer = async (answer: string) => {
    if (!state.currentSession || !state.threadId || !state.user) {
      toast({ title: "Error", description: "No active session. Please start a new dream interpretation.", variant: "destructive" });
      return;
    }
    state.setIsLoading(true);
    try {
      console.log("Submitting answer for question", state.currentSession.currentQuestion);
      // Append user message
      const newUserMessage: Message = { id: uuidv4(), dreamId: state.currentSession.dream.id, content: answer, sender: "user", timestamp: new Date().toISOString() };
      const updatedMessages = [...state.currentSession.messages, newUserMessage];
      // Send to assistant
      console.log("Sending answer to the assistant");
      await state.sendMessageToAssistant(state.threadId, answer, state.user.id);
      // Next question index
      const nextQuestionNumber = state.currentSession.currentQuestion + 1;
      console.log("Next question number:", nextQuestionNumber);
      // Get AI response
      console.log("Getting response from assistant");
      const assistantResponse = await state.runAssistantAndGetResponse(state.threadId, nextQuestionNumber);
      console.log("Received assistant response");
      const isInterpretationComplete = nextQuestionNumber > 3;
      // Append AI message and update session
      const newAIMessage: Message = { id: uuidv4(), dreamId: state.currentSession.dream.id, content: assistantResponse, sender: "ai", timestamp: new Date().toISOString() };
      const allMessages = [...updatedMessages, newAIMessage];
      state.setCurrentSession({ ...state.currentSession, messages: allMessages, currentQuestion: nextQuestionNumber, isComplete: isInterpretationComplete });
      // Persist questions, answers, and transcript
      const questions = allMessages.filter(m => m.sender === 'ai').map(m => m.content);
      const answers = allMessages.filter(m => m.sender === 'user').map(m => m.content);
      const transcript = isInterpretationComplete ? allMessages.map(m => (m.sender === 'user' ? `You: ${m.content}` : `AI: ${m.content}`)).join('\n\n') : undefined;
      const { error: updateError } = await supabase
        .from('dreams')
        .update({ status: isInterpretationComplete ? "completed" : "interpreting", questions, answers, ...(transcript && { interpretation: transcript }) })
        .eq('id', state.currentSession.dream.id);
      if (updateError) console.error("Error updating dream:", updateError);
      else console.log("Dream record updated successfully");
    } catch (error: any) {
      console.error("Error submitting answer:", error);
      toast({ title: "Assistant Error", description: `Error: ${error.message}`, variant: "destructive" });
      throw error;
    } finally {
      state.setIsLoading(false);
    }
  };

  // Ask a question alias
  const askQuestion = async (question: string) => submitAnswer(question);

  // Complete interpretation explicitly
  const completeDreamInterpretation = async () => {
    if (!state.currentSession) return;
    try {
      const aiMessages = state.currentSession.messages.filter((m: Message) => m.sender === 'ai');
      const interpretation = aiMessages[aiMessages.length - 1]?.content || "";
      const { error } = await supabase.from('dreams').update({ status: "completed", interpretation }).eq('id', state.currentSession.dream.id);
      if (error) throw error;
      toast({ title: "Interpretation Complete", description: "Your dream interpretation has been saved." });
    } catch (error: any) {
      console.error("Error completing dream interpretation:", error);
      toast({ title: "Error", description: `Couldn't save your dream interpretation: ${error.message}`, variant: "destructive" });
    }
  };

  // Send to email
  const sendToEmail = async (dreamId: string) => {
    try { toast({ title: "Email Sent", description: "Your dream interpretation has been sent to your email." }); }
    catch (error: any) { console.error("Error sending email:", error); toast({ title: "Error", description: `Couldn't send the interpretation to your email: ${error.message}`, variant: "destructive" }); }
  };

  // Save final interpretation manually
  const saveInterpretation = async (interpretation: string) => {
    if (!state.currentDream) return;
    try {
      const { error } = await supabase.from('dreams').update({ interpretation, status: "completed" }).eq('id', state.currentDream.id);
      if (error) throw error;
      toast({ title: "Interpretation Saved", description: "Your dream interpretation has been saved." });
    } catch (error: any) {
      console.error("Error saving interpretation:", error);
      toast({ title: "Error", description: `Couldn't save your dream interpretation: ${error.message}`, variant: "destructive" });
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
