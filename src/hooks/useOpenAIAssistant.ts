
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  createThread, 
  addMessageToThread, 
  runAssistant, 
  checkRunStatus, 
  getMessages 
} from "@/integrations/openai/assistant";
import { useToast } from "@/components/ui/use-toast";

export const useOpenAIAssistant = () => {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Create a new OpenAI thread
  const createAssistantThread = async () => {
    try {
      const thread = await createThread();
      
      if (!thread) {
        throw new Error("Failed to create OpenAI thread");
      }
      
      setThreadId(thread.id);
      return thread.id;
    } catch (error) {
      console.error("Error creating assistant thread:", error);
      throw error;
    }
  };

  // Add a message to the thread
  const sendMessageToAssistant = async (threadId: string, content: string, userId: string) => {
    try {
      return await addMessageToThread(threadId, content, userId);
    } catch (error) {
      console.error("Error sending message to assistant:", error);
      throw error;
    }
  };

  // Poll the run status until it's complete or failed
  const pollRunStatus = async (threadId: string, runId: string, maxAttempts = 30, delayMs = 1000) => {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const status = await checkRunStatus(threadId, runId);
      
      if (!status) {
        return null;
      }
      
      if (["completed", "failed", "cancelled", "expired"].includes(status.status)) {
        return status;
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, delayMs));
      attempts++;
    }
    
    throw new Error("Maximum polling attempts reached");
  };

  // Run the assistant and wait for a response
  const runAssistantAndGetResponse = async (threadId: string) => {
    try {
      // Run the assistant on the thread
      const run = await runAssistant(threadId);
      
      if (!run) {
        throw new Error("Failed to run OpenAI assistant");
      }
      
      // Poll for completion
      const runResult = await pollRunStatus(threadId, run.id);
      
      if (runResult?.status !== "completed") {
        throw new Error(`Run failed with status: ${runResult?.status}`);
      }
      
      // Get the assistant's response
      const messages = await getMessages(threadId);
      
      if (!messages) {
        throw new Error("No messages found");
      }
      
      // Find the assistant's response (the latest assistant message)
      const assistantMessages = messages.filter(m => m.role === "assistant");
      const latestAssistantMessage = assistantMessages[0]; // They come in reverse chronological order
      
      if (!latestAssistantMessage) {
        throw new Error("No assistant message found");
      }
      
      // Extract the text from the assistant's response
      return latestAssistantMessage.content[0]?.text?.value || "No response available";
    } catch (error) {
      console.error("Error running assistant:", error);
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
    runAssistantAndGetResponse
  };
};
