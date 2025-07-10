import { useState } from "react";
import { 
  createThread, 
  runAssistant, 
  checkRunStatus, 
  getMessages
} from "@/integrations/openai/assistant";
import { supabase } from "@/integrations/supabase/client";

// Get the API key from Supabase
const getApiKey = async (): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('get-openai-key', {
      body: { key: 'OPENAI_API_KEY' },
    });
    
    if (error) {
      throw new Error(`Failed to get API key: ${error.message}`);
    }
    
    if (!data || !data.key) {
      throw new Error("No API key found in Supabase response");
    }
    
    return data.key;
  } catch (error) {
    console.error("Error in getApiKey:", error);
    throw error;
  }
};
import { useToast } from "@/components/ui/use-toast";

const SHORT_ASSISTANT_ID = "asst_9F7K3xAC6YOFdsMHuuH7D1Yj";

export const useOpenAIAssistantShort = () => {
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

  // Get a short interpretation for a dream using the dedicated short assistant
  const getShortInterpretation = async (dreamText: string) => {
    try {
      setIsLoading(true);
      console.log("Getting short interpretation for dream using dedicated short assistant:", dreamText.substring(0, 50) + "...");
      console.log("Using short assistant ID:", SHORT_ASSISTANT_ID);
      
      // Create a new thread specifically for the short assistant
      const newThreadId = await createAssistantThread();
      if (!newThreadId) {
        throw new Error("Failed to create thread for short interpretation");
      }
      
      // Add the dream text to the thread - NO user context for short interpretation
      // Use a simple message directly to OpenAI API without user profile context
      const apiKey = await getApiKey();
      
      const response = await fetch(`https://api.openai.com/v1/threads/${newThreadId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          role: 'user',
          content: dreamText // Just the dream text, no user context
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add message: ${response.status} - ${errorText}`);
      }
      
      // Run the short assistant WITHOUT any instructions - let it use its built-in instructions
      console.log("Running short assistant without custom instructions - using built-in instructions only");
      const run = await runAssistant(newThreadId, undefined, SHORT_ASSISTANT_ID);
      
      if (!run) {
        throw new Error("Failed to run short assistant for interpretation");
      }
      
      // Poll for completion
      const runResult = await pollRunStatus(newThreadId, run.id);
      console.log("Short interpretation run completed with status:", runResult.status);
      
      // Get the assistant's response
      const messages = await getMessages(newThreadId);
      
      if (!messages || messages.length === 0) {
        throw new Error("No messages found after short interpretation run");
      }
      
      // Find the assistant's response (the latest assistant message)
      const assistantMessages = messages.filter(m => m.role === "assistant");
      const latestAssistantMessage = assistantMessages[0]; // They come in reverse chronological order
      
      if (!latestAssistantMessage) {
        throw new Error("No assistant message found after short interpretation run");
      }
      
      // Extract the text from the assistant's response
      const responseText = latestAssistantMessage.content[0]?.text?.value;
      if (!responseText) {
        throw new Error("Assistant message has no text content");
      }
      
      console.log("Got short dream interpretation:", responseText.substring(0, 50) + "...");
      return responseText;
    } catch (error) {
      console.error("Error getting short dream interpretation:", error);
      toast({
        title: "Interpretation Error",
        description: `Could not get short interpretation: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    threadId,
    setThreadId,
    isLoading,
    setIsLoading,
    createAssistantThread,
    getShortInterpretation
  };
};