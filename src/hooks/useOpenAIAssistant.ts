
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

  // Poll the run status until it's complete or failed
  const pollRunStatus = async (threadId: string, runId: string, maxAttempts = 30, delayMs = 1000) => {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const status = await checkRunStatus(threadId, runId);
      
      if (!status) {
        throw new Error("Failed to check run status");
      }
      
      if (["completed", "failed", "cancelled", "expired"].includes(status.status)) {
        if (status.status !== "completed") {
          throw new Error(`Run ended with status: ${status.status}`);
        }
        return status;
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, delayMs));
      attempts++;
      console.log(`Polling attempt ${attempts}/${maxAttempts} for run ${runId}, status: ${status.status}`);
    }
    
    throw new Error("Maximum polling attempts reached");
  };

  // Run the assistant with specific instructions based on question number
  const runAssistantWithInstructions = async (threadId: string, questionNumber: number) => {
    let instructions = "";
    
    if (questionNumber === 1) {
      instructions = "Ask the first follow-up question about the user's dream. Be concise.";
    } else if (questionNumber === 2) {
      instructions = "Ask the second follow-up question about the user's dream. Be concise.";
    } else if (questionNumber === 3) {
      instructions = "Ask the third and final follow-up question about the user's dream. Be concise.";
    } else if (questionNumber > 3) {
      instructions = "Generate a final interpretation with: (1) A detailed explanation, (2) A relevant Quranic verse in Arabic with translation, and (3) A spiritual conclusion.";
    }
    
    console.log(`Running assistant with instructions for question ${questionNumber}: "${instructions}"`);
    
    const run = await runAssistant(threadId, instructions);
    if (!run) {
      throw new Error("Failed to run assistant");
    }
    
    console.log("Run started with ID:", run.id, "with instructions for question", questionNumber);
    return run;
  };

  // Run the assistant and wait for a response
  const runAssistantAndGetResponse = async (threadId: string, questionNumber: number = 1) => {
    try {
      setIsLoading(true);
      console.log(`Running assistant for question ${questionNumber} on thread ${threadId}`);
      
      // Run the assistant on the thread with appropriate instructions
      const run = await runAssistantWithInstructions(threadId, questionNumber);
      
      // Poll for completion
      const runResult = await pollRunStatus(threadId, run.id);
      console.log("Run completed with status:", runResult.status);
      
      // Get the assistant's response
      const messages = await getMessages(threadId);
      
      if (!messages || messages.length === 0) {
        throw new Error("No messages found after run completion");
      }
      
      // Find the assistant's response (the latest assistant message)
      const assistantMessages = messages.filter(m => m.role === "assistant");
      const latestAssistantMessage = assistantMessages[0]; // They come in reverse chronological order
      
      if (!latestAssistantMessage) {
        throw new Error("No assistant message found after run completion");
      }
      
      // Extract the text from the assistant's response
      const responseText = latestAssistantMessage.content[0]?.text?.value;
      if (!responseText) {
        throw new Error("Assistant message has no text content");
      }

      // Inside runAssistantAndGetResponse
if (questionNumber > 3) {
  // Save to Supabase
  await saveDreamInterpretation({
    dreamId: threadId, // or use a separate dreamId if threadId !== dreamId
    interpretation: responseText,
    // Optionally collect all answers here if needed
  }
  
      console.log("Got assistant response:", responseText.substring(0, 50) + "...");
      return responseText;
    } catch (error) {
      console.error("Error running assistant:", error);
      toast({
        title: "Assistant Error",
        description: `Error: ${error.message}`,
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
const saveDreamInterpretation = async ({
  dreamId,
  interpretation,
  answers,
}: {
  dreamId: string;
  interpretation: string;
  answers?: any;
}) => {
  try {
    const { error } = await supabase
      .from('dreams')
      .update({
        interpretation,
        answers,
        status: "completed",
      })
      .eq('id', dreamId);

    if (error) {
      throw error;
    }

    console.log("Dream interpretation saved to Supabase");
  } catch (error) {
    console.error("Error saving interpretation:", error);
    toast({
      title: "Save Error",
      description: `Could not save the dream interpretation: ${error.message}`,
      variant: "destructive",
    });
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
    getAnsweredQuestionsCount,
    saveDreamInterpretation,
    getLatestAssistantMessage
  };
};
