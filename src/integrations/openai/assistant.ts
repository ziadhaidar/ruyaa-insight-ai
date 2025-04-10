
import { supabase } from "@/integrations/supabase/client";

const OPENAI_API_KEY = ""; // This will be filled in by an environment variable on deployment
const ASSISTANT_ID = "asst_hTYcB4d0pafR3b6e27quRRyo";

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
      throw new Error(`Failed to create thread: ${response.status}`);
    }

    return await response.json();
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
      throw new Error(`Failed to add message: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error adding message:", error);
    return null;
  }
};

// Run the assistant on a thread
export const runAssistant = async (threadId: string): Promise<OpenAIRun | null> => {
  try {
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v1"
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to run assistant: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error running assistant:", error);
    return null;
  }
};

// Check the status of a run
export const checkRunStatus = async (threadId: string, runId: string): Promise<OpenAIRun | null> => {
  try {
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v1"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to check run status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error checking run status:", error);
    return null;
  }
};

// Get messages from a thread
export const getMessages = async (threadId: string): Promise<OpenAIMessage[] | null> => {
  try {
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v1"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get messages: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error getting messages:", error);
    return null;
  }
};
