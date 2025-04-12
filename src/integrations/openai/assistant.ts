
import { supabase } from "@/integrations/supabase/client";

// This is a placeholder for the API key that will be replaced on the server
// In a real app, you should use an environment variable
const OPENAI_API_KEY = "sk-placeholder"; // This should be set on the server side
const ASSISTANT_ID = "asst_hTYcB4d0pafR3b6e27quRRyo"; // Your specific assistant ID

export interface OpenAIThread {
  id: string;
  object: string;
  created_at: number;
}

export interface OpenAIMessage {
  id: string;
  object: string;
  created_at: number;
  thread_id: string;
  role: "user" | "assistant";
  content: Array<{
    type: string;
    text?: {
      value: string;
      annotations: Array<any>;
    }
  }>;
}

export interface OpenAIRun {
  id: string;
  object: string;
  created_at: number;
  thread_id: string;
  assistant_id: string;
  status: "queued" | "in_progress" | "completed" | "requires_action" | "expired" | "cancelling" | "cancelled" | "failed";
}

// Create a new thread
export const createThread = async (): Promise<OpenAIThread | null> => {
  try {
    console.log("Creating new OpenAI thread");
    
    // Instead of direct API call, in a real app, you'd use a backend endpoint
    // For demo, we'll make a simplified version that creates a mock thread
    
    // Fallback to mock implementation for demo purposes
    const mockThread: OpenAIThread = {
      id: `thread_${Math.random().toString(36).substring(2, 15)}`,
      object: "thread",
      created_at: Date.now()
    };
    
    console.log("Mock thread created successfully:", mockThread.id);
    return mockThread;
  } catch (error) {
    console.error("Error creating thread:", error);
    return null;
  }
};

// Add a message to a thread
export const addMessageToThread = async (
  threadId: string, 
  content: string,
  userId: string
): Promise<OpenAIMessage | null> => {
  try {
    console.log(`Adding message to thread ${threadId}`);
    
    // Get user profile for additional context
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error("Error fetching user profile:", profileError);
    }
    
    // Format the message with user context if available
    let messageContent = content;
    
    if (profileData) {
      const userContext = `
User Information:
- Age: ${profileData.age || 'Not provided'}
- Gender: ${profileData.gender || 'Not provided'}
- Marital Status: ${profileData.marital_status || 'Not provided'}
- Has Children: ${profileData.has_kids ? 'Yes' : 'No'}
- Has Pets: ${profileData.has_pets ? 'Yes' : 'No'}
- Work Status: ${profileData.work_status || 'Not provided'}

Dream Content:
${content}`;
      
      messageContent = userContext;
    }

    // For demo purposes, return a mock message
    const mockMessage: OpenAIMessage = {
      id: `msg_${Math.random().toString(36).substring(2, 15)}`,
      object: "message",
      created_at: Date.now(),
      thread_id: threadId,
      role: "user",
      content: [{
        type: "text",
        text: {
          value: messageContent,
          annotations: []
        }
      }]
    };
    
    console.log("Mock message added successfully");
    return mockMessage;
  } catch (error) {
    console.error("Error adding message:", error);
    throw error; // Rethrow to be caught by the calling function
  }
};

// Run the assistant on a thread
export const runAssistant = async (threadId: string): Promise<OpenAIRun | null> => {
  try {
    console.log(`Running assistant on thread ${threadId}`);
    
    // For demo purposes, return a mock run
    const mockRun: OpenAIRun = {
      id: `run_${Math.random().toString(36).substring(2, 15)}`,
      object: "run",
      created_at: Date.now(),
      thread_id: threadId,
      assistant_id: ASSISTANT_ID,
      status: "completed" // Simulate immediate completion
    };
    
    console.log("Mock assistant run initiated:", mockRun.id);
    return mockRun;
  } catch (error) {
    console.error("Error running assistant:", error);
    throw error; // Rethrow to be caught by the calling function
  }
};

// Check the status of a run
export const checkRunStatus = async (threadId: string, runId: string): Promise<OpenAIRun | null> => {
  try {
    console.log(`Checking run status for thread ${threadId}, run ${runId}`);
    
    // For demo purposes, return a mock run status
    const mockRun: OpenAIRun = {
      id: runId,
      object: "run",
      created_at: Date.now() - 10000, // 10 seconds ago
      thread_id: threadId,
      assistant_id: ASSISTANT_ID,
      status: "completed" // Always completed for demo
    };
    
    console.log(`Mock run status: ${mockRun.status}`);
    return mockRun;
  } catch (error) {
    console.error("Error checking run status:", error);
    throw error; // Rethrow to be caught by the calling function
  }
};

// Get messages from a thread
export const getMessages = async (threadId: string): Promise<OpenAIMessage[] | null> => {
  try {
    console.log(`Getting messages from thread ${threadId}`);
    
    // For demo purposes, return mock messages
    const mockMessages: OpenAIMessage[] = [
      {
        id: `msg_user_${Math.random().toString(36).substring(2, 15)}`,
        object: "message",
        created_at: Date.now() - 20000,
        thread_id: threadId,
        role: "user",
        content: [{
          type: "text",
          text: {
            value: "What does my dream mean?",
            annotations: []
          }
        }]
      },
      {
        id: `msg_assistant_${Math.random().toString(36).substring(2, 15)}`,
        object: "message",
        created_at: Date.now() - 10000,
        thread_id: threadId,
        role: "assistant",
        content: [{
          type: "text",
          text: {
            value: "Before I provide an interpretation, could you share more details about your surroundings in the dream? What environment were you in?",
            annotations: []
          }
        }]
      }
    ];
    
    console.log(`Retrieved ${mockMessages.length} mock messages`);
    return mockMessages;
  } catch (error) {
    console.error("Error getting messages:", error);
    throw error; // Rethrow to be caught by the calling function
  }
};
