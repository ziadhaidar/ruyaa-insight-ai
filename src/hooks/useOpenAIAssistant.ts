
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
      const thread = await createThread();
      
      if (!thread) {
        throw new Error("Failed to create OpenAI thread");
      }
      
      setThreadId(thread.id);
      return thread.id;
    } catch (error) {
      console.error("Error creating assistant thread:", error);
      toast({
        title: "OpenAI Connection Error",
        description: "Could not establish a connection to the OpenAI service. Using fallback mode.",
        variant: "destructive"
      });
      // Even in error case, return a mock thread ID so the app flow continues
      const mockThreadId = `thread_${Math.random().toString(36).substring(2, 15)}`;
      setThreadId(mockThreadId);
      return mockThreadId;
    }
  };

  // Add a message to the thread
  const sendMessageToAssistant = async (threadId: string, content: string, userId: string) => {
    try {
      return await addMessageToThread(threadId, content, userId);
    } catch (error) {
      console.error("Error sending message to assistant:", error);
      toast({
        title: "Message Error",
        description: "Could not send your message to the assistant. Using fallback mode.",
        variant: "destructive"
      });
      throw error; // Rethrow to be caught by the calling function
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
    
    return await runAssistant(threadId, instructions);
  };

  // Run the assistant and wait for a response
  const runAssistantAndGetResponse = async (threadId: string, questionNumber: number = 1) => {
    try {
      // Run the assistant on the thread with appropriate instructions
      const run = await runAssistantWithInstructions(threadId, questionNumber);
      
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
      
      // Provide fallback responses based on question number
      if (questionNumber === 1) {
        return "Could you share more details about the colors you saw in your dream?";
      } else if (questionNumber === 2) {
        return "Were there any specific people or characters in your dream that stood out to you?";
      } else if (questionNumber === 3) {
        return "How did you feel during this dream? Were you scared, happy, confused, or something else?";
      } else {
        // Final interpretation fallback
        return "Based on your dream description, I can provide an Islamic interpretation. Your dream appears to contain elements that suggest a period of spiritual growth. In Islamic tradition, dreams are considered one of the forty-six parts of prophethood.\n\nThe Quran states: \"وَلَقَدْ خَلَقْنَا الْإِنسَانَ وَنَعْلَمُ مَا تُوَسْوِسُ بِهِ نَفْسُهُ وَنَحْنُ أَقْرَبُ إِلَيْهِ مِنْ حَبْلِ الْوَرِيدِ\" - \"And We have already created man and know what his soul whispers to him, and We are closer to him than his jugular vein.\" (Quran 50:16)\n\nThis verse reminds us that Allah is aware of our innermost thoughts and feelings, including those that manifest in our dreams. The elements you described may symbolize upcoming changes or challenges that require patience and faith. Consider increasing your prayers and remembrance of Allah during this time.";
      }
    }
  };

  // Get the number of questions answered so far
  const getAnsweredQuestionsCount = async (threadId: string) => {
    try {
      return await countUserMessages(threadId) - 1; // Subtract 1 for the initial dream submission
    } catch (error) {
      console.error("Error counting answered questions:", error);
      return 0;
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
    getLatestAssistantMessage
  };
};
