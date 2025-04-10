
import { supabase } from "@/integrations/supabase/client";

const OPENAI_API_KEY = ""; // This will be filled in by an environment variable on deployment
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
    const response = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v1"
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Failed to create thread: ${response.status}`, errorData);
      throw new Error(`Failed to create thread: ${response.status}`);
    }

    const data = await response.json();
    console.log("Thread created successfully:", data.id);
    return data;
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

    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v1"
      },
      body: JSON.stringify({
        role: "user",
        content: messageContent
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Failed to add message: ${response.status}`, errorData);
      throw new Error(`Failed to add message: ${response.status}`);
    }

    const data = await response.json();
    console.log("Message added successfully");
    return data;
  } catch (error) {
    console.error("Error adding message:", error);
    throw error; // Rethrow to be caught by the calling function
  }
};

// Run the assistant on a thread
export const runAssistant = async (threadId: string): Promise<OpenAIRun | null> => {
  try {
    console.log(`Running assistant on thread ${threadId}`);
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v1"
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID,
        instructions: `You are a dream interpreter specializing in Islamic dream interpretation. 
        Follow this specific flow:
        1. First, ask ONE follow-up question about the dream.
        2. After the user responds, ask a SECOND follow-up question.
        3. After the user's second response, ask a THIRD and final follow-up question.
        4. Only after collecting all three answers, provide your final interpretation which must include:
           - A relevant Qur'anic verse related to the dream's theme
           - A short spiritual reflection or advice
        
        IMPORTANT: Never provide a full interpretation before receiving answers to all three questions.`
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Failed to run assistant: ${response.status}`, errorData);
      throw new Error(`Failed to run assistant: ${response.status}`);
    }

    const data = await response.json();
    console.log("Assistant run initiated:", data.id);
    return data;
  } catch (error) {
    console.error("Error running assistant:", error);
    throw error; // Rethrow to be caught by the calling function
  }
};

// Check the status of a run
export const checkRunStatus = async (threadId: string, runId: string): Promise<OpenAIRun | null> => {
  try {
    console.log(`Checking run status for thread ${threadId}, run ${runId}`);
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v1"
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Failed to check run status: ${response.status}`, errorData);
      throw new Error(`Failed to check run status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Run status: ${data.status}`);
    return data;
  } catch (error) {
    console.error("Error checking run status:", error);
    throw error; // Rethrow to be caught by the calling function
  }
};

// Get messages from a thread
export const getMessages = async (threadId: string): Promise<OpenAIMessage[] | null> => {
  try {
    console.log(`Getting messages from thread ${threadId}`);
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v1"
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Failed to get messages: ${response.status}`, errorData);
      throw new Error(`Failed to get messages: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Retrieved ${data.data.length} messages`);
    return data.data;
  } catch (error) {
    console.error("Error getting messages:", error);
    throw error; // Rethrow to be caught by the calling function
  }
};
