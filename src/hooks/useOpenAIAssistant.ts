
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  createThread, 
  addMessageToThread, 
  runAssistant, 
  checkRunStatus, 
  getMessages,
  countUserMessages,
  getLatestAssistantMessage
} from "@/integrations/openai/assistant";
import { useToast } from "@/components/ui/use-toast";

export const useOpenAIAssistant = () => {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Create a new OpenAI thread
  const createAssistantThread = async () => {
    try {
      setIsLoading(true);
      const thread = await createThread();
      
      if (!thread) {
        throw new Error("Failed to create OpenAI thread");
      }
      
      setThreadId(thread.id);
      console.log("Created thread with ID:", thread.id);
      return thread.id;
    } catch (error) {
      console.error("Error creating assistant thread:", error);
      toast({
        title: "OpenAI Connection Error",
        description: `Could not establish a connection to the OpenAI service: ${error.message}`,
        variant: "destructive"
      });
      throw error; // Rethrow to let calling code handle it
    } finally {
      setIsLoading(false);
    }
  };

  // Add a message to the thread
  const sendMessageToAssistant = async (threadId: string, content: string, userId: string) => {
    try {
      setIsLoading(true);
      console.log(`Sending message to assistant on thread ${threadId}`);
      const message = await addMessageToThread(threadId, content, userId);
      if (!message) {
        throw new Error("Failed to add message to thread");
      }
      console.log("Message added to thread:", message.id);
      return message;
    } catch (error) {
      console.error("Error sending message to assistant:", error);
      toast({
        title: "Message Error",
        description: `Could not send your message to the assistant: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Poll the run status until it's complete or failed with improved timeout handling
  const pollRunStatus = async (threadId: string, runId: string, maxAttempts = 60, delayMs = 2000) => {
    let attempts = 0;
    let consecutiveQueuedAttempts = 0;
    
    console.log(`Starting to poll run ${runId} with max attempts: ${maxAttempts}`);
    
    while (attempts < maxAttempts) {
      try {
        const status = await checkRunStatus(threadId, runId);
        
        if (!status) {
          throw new Error("Failed to check run status");
        }
        
        console.log(`Poll attempt ${attempts + 1}/${maxAttempts} for run ${runId}, status: ${status.status}`);
        
        // Check if run completed successfully
        if (status.status === "completed") {
          console.log(`Run ${runId} completed successfully after ${attempts + 1} attempts`);
          return status;
        }
        
        // Check for failed states
        if (["failed", "cancelled", "expired"].includes(status.status)) {
          throw new Error(`Run ended with status: ${status.status}`);
        }
        
        // Track consecutive queued attempts to detect stuck runs
        if (status.status === "queued") {
          consecutiveQueuedAttempts++;
          // If stuck in queued for too long, try to cancel and restart
          if (consecutiveQueuedAttempts > 20) {
            console.warn(`Run ${runId} stuck in queued status for ${consecutiveQueuedAttempts} attempts, considering it failed`);
            throw new Error("Run appears to be stuck in queue - OpenAI service may be overloaded");
          }
        } else {
          consecutiveQueuedAttempts = 0; // Reset counter if status changes
        }
        
        // Wait before checking again with exponential backoff for queued runs
        const waitTime = status.status === "queued" ? Math.min(delayMs * 1.5, 5000) : delayMs;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        attempts++;
        
      } catch (error) {
        console.error(`Error polling run status (attempt ${attempts + 1}):`, error);
        // If it's a network error, retry a few times
        if (attempts < 3) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          attempts++;
          continue;
        }
        throw error;
      }
    }
    
    throw new Error(`Maximum polling attempts (${maxAttempts}) reached - OpenAI service may be experiencing delays`);
  };

  // Get a direct interpretation for a dream (no questions)
  const getDirectInterpretation = async (dreamText: string, userId: string) => {
    try {
      setIsLoading(true);
      console.log("Getting direct interpretation for dream:", dreamText.substring(0, 50) + "...");
      
      // Create a new thread if needed
      let currentThreadId = threadId;
      if (!currentThreadId) {
        currentThreadId = await createAssistantThread();
        if (!currentThreadId) {
          throw new Error("Failed to create thread for interpretation");
        }
        setThreadId(currentThreadId);
      }
      
      // Add the dream text to the thread
      await addMessageToThread(currentThreadId, dreamText, userId);
      
      // Run the assistant to get direct interpretation
      const run = await runAssistant(currentThreadId);
      
      if (!run) {
        throw new Error("Failed to run assistant for interpretation");
      }
      
      console.log(`Started assistant run ${run.id} for interpretation`);
      
      // Poll for completion with increased timeout
      const runResult = await pollRunStatus(currentThreadId, run.id, 60, 2000);
      console.log("Interpretation run completed with status:", runResult.status);
      
      // Get the assistant's response
      const assistantResponse = await getLatestAssistantMessage(currentThreadId);
      if (!assistantResponse) {
        throw new Error("No response found for interpretation");
      }
      
      console.log("Got direct interpretation:", assistantResponse.substring(0, 50) + "...");
      return assistantResponse;
    } catch (error) {
      console.error("Error getting direct interpretation:", error);
      
      // Provide more specific error messages
      let errorMessage = "Could not get interpretation";
      if (error.message.includes("stuck in queue")) {
        errorMessage = "OpenAI service is currently experiencing high demand. Please try again in a few minutes.";
      } else if (error.message.includes("Maximum polling attempts")) {
        errorMessage = "The interpretation is taking longer than usual. Please try again.";
      } else if (error.message.includes("Failed to create thread")) {
        errorMessage = "Could not connect to interpretation service. Please check your connection.";
      }
      
      toast({
        title: "Interpretation Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Legacy function for compatibility - now returns direct interpretation
  const runAssistantAndGetResponse = async (threadId: string, questionNumber: number = 1) => {
    // Since the new assistant provides direct interpretation, we ignore questionNumber
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id || "user";
      return await getDirectInterpretation("", userId); // This will use the existing thread content
    } catch (error) {
      console.error("Error in runAssistantAndGetResponse:", error);
      throw error;
    }
  };

  // Get an interpretation for a dream
  const getInterpretation = async (dreamText: string) => {
    try {
      setIsLoading(true);
      console.log("Getting interpretation for dream:", dreamText.substring(0, 50) + "...");
      
      // Create a new thread
      const newThreadId = await createAssistantThread();
      if (!newThreadId) {
        throw new Error("Failed to create thread for interpretation");
      }
      
      // Add the dream text to the thread
      await addMessageToThread(newThreadId, dreamText, "user");
      
      // Run the assistant to get an interpretation
      const run = await runAssistant(newThreadId, `
        You are an Islamic dream interpreter. Please interpret this dream.
        Include:
        - A detailed but concise explanation
        - One relevant Quranic verse (Arabic + English translation)
        - One brief spiritual advice based on the dream.
        Be compassionate and insightful.
      `);
      
      if (!run) {
        throw new Error("Failed to run assistant for interpretation");
      }
      
      // Poll for completion
      const runResult = await pollRunStatus(newThreadId, run.id);
      console.log("Interpretation run completed with status:", runResult.status);
      
      // Get the assistant's response
      const messages = await getMessages(newThreadId);
      
      if (!messages || messages.length === 0) {
        throw new Error("No messages found after interpretation run");
      }
      
      // Find the assistant's response (the latest assistant message)
      const assistantMessages = messages.filter(m => m.role === "assistant");
      const latestAssistantMessage = assistantMessages[0]; // They come in reverse chronological order
      
      if (!latestAssistantMessage) {
        throw new Error("No assistant message found after interpretation run");
      }
      
      // Extract the text from the assistant's response
      const responseText = latestAssistantMessage.content[0]?.text?.value;
      if (!responseText) {
        throw new Error("Assistant message has no text content");
      }
      
      console.log("Got dream interpretation:", responseText.substring(0, 50) + "...");
      return responseText;
    } catch (error) {
      console.error("Error getting dream interpretation:", error);
      toast({
        title: "Interpretation Error",
        description: `Could not get interpretation: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Ask a follow-up question about a dream interpretation
  const askFollowUpQuestion = async (
    question: string, 
    dreamInterpretation: string,
    chatHistory: { questions: string[], answers: string[] }
  ) => {
    try {
      setIsLoading(true);
      
      // Create a new thread if needed
      if (!threadId) {
        const newThreadId = await createAssistantThread();
        setThreadId(newThreadId);
        
        // Send the interpretation as context
        await addMessageToThread(
          newThreadId, 
          `CONTEXT: This is a dream interpretation: ${dreamInterpretation}`, 
          "user"
        );
        
        // Send previous chat history as context
        if (chatHistory.questions.length > 0) {
          for (let i = 0; i < chatHistory.questions.length; i++) {
            await addMessageToThread(newThreadId, chatHistory.questions[i], "user");
            if (i < chatHistory.answers.length) {
              await addMessageToThread(newThreadId, chatHistory.answers[i], "assistant");
            }
          }
        }
      }
      
      const currentThreadId = threadId as string;
      
      // Send the follow-up question
      await addMessageToThread(currentThreadId, question, "user");
      
      // Run the assistant
      const run = await runAssistant(currentThreadId, `
        You are an Islamic dream interpreter answering a follow-up question about a dream interpretation.
        Be compassionate, insightful, and helpful.
        Provide a detailed but concise answer.
        If relevant, include Islamic context or Quranic references.
      `);
      
      if (!run) {
        throw new Error("Failed to run assistant for follow-up");
      }
      
      // Poll for completion
      const runResult = await pollRunStatus(currentThreadId, run.id);
      console.log("Follow-up run completed with status:", runResult.status);
      
      // Get the assistant's response
      const assistantResponse = await getLatestAssistantMessage(currentThreadId);
      if (!assistantResponse) {
        throw new Error("No response found for follow-up question");
      }
      
      console.log("Got follow-up response:", assistantResponse.substring(0, 50) + "...");
      return assistantResponse;
    } catch (error) {
      console.error("Error processing follow-up question:", error);
      toast({
        title: "Question Error",
        description: `Could not process your question: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Get the number of questions answered so far
  const getAnsweredQuestionsCount = async (threadId: string) => {
    try {
      return await countUserMessages(threadId) - 1; // Subtract 1 for the initial dream submission
    } catch (error) {
      console.error("Error counting answered questions:", error);
      throw error;
    }
  };

  return {
    threadId,
    setThreadId,
    isLoading,
    setIsLoading,
    createAssistantThread,
    sendMessageToAssistant,
    runAssistantAndGetResponse,
    getDirectInterpretation,
    getAnsweredQuestionsCount: async (threadId: string) => {
      try {
        return await countUserMessages(threadId) - 1; // Subtract 1 for the initial dream submission
      } catch (error) {
        console.error("Error counting answered questions:", error);
        throw error;
      }
    },
    getLatestAssistantMessage,
    getInterpretation: getDirectInterpretation, // Alias for direct interpretation
    askFollowUpQuestion: async (
      question: string, 
      dreamInterpretation: string,
      chatHistory: { questions: string[], answers: string[] }
    ) => {
      try {
        setIsLoading(true);
        
        // Create a new thread if needed
        if (!threadId) {
          const newThreadId = await createAssistantThread();
          setThreadId(newThreadId);
          
          // Send the interpretation as context
          await addMessageToThread(
            newThreadId, 
            `CONTEXT: This is a dream interpretation: ${dreamInterpretation}`, 
            "user"
          );
          
          // Send previous chat history as context
          if (chatHistory.questions.length > 0) {
            for (let i = 0; i < chatHistory.questions.length; i++) {
              await addMessageToThread(newThreadId, chatHistory.questions[i], "user");
              if (i < chatHistory.answers.length) {
                await addMessageToThread(newThreadId, chatHistory.answers[i], "assistant");
              }
            }
          }
        }
        
        const currentThreadId = threadId as string;
        
        // Send the follow-up question
        await addMessageToThread(currentThreadId, question, "user");
        
        // Run the assistant
        const run = await runAssistant(currentThreadId, `
          You are an Islamic dream interpreter answering a follow-up question about a dream interpretation.
          Be compassionate, insightful, and helpful.
          Provide a detailed but concise answer.
          If relevant, include Islamic context or Quranic references.
        `);
        
        if (!run) {
          throw new Error("Failed to run assistant for follow-up");
        }
        
        // Poll for completion with increased timeout
        const runResult = await pollRunStatus(currentThreadId, run.id, 60, 2000);
        console.log("Follow-up run completed with status:", runResult.status);
        
        // Get the assistant's response
        const assistantResponse = await getLatestAssistantMessage(currentThreadId);
        if (!assistantResponse) {
          throw new Error("No response found for follow-up question");
        }
        
        console.log("Got follow-up response:", assistantResponse.substring(0, 50) + "...");
        return assistantResponse;
      } catch (error) {
        console.error("Error processing follow-up question:", error);
        toast({
          title: "Question Error",
          description: `Could not process your question: ${error.message}`,
          variant: "destructive"
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    }
  };
};
