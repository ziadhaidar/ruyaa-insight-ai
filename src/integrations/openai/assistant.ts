
import { supabase } from "@/integrations/supabase/client";

// Use the securely stored API key from Supabase
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

// Get the API key from environment variables
const getApiKey = async (): Promise<string> => {
  // For local development, use process.env if available
  if (typeof process !== 'undefined' && process.env && process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }
  
  try {
    // Try to get from Supabase
    const { data, error } = await supabase.functions.invoke('get-openai-key', {
      body: { key: 'OPENAI_API_KEY' },
    });
    
    if (error) {
      console.error("Error fetching API key from Supabase:", error);
      throw new Error(`Failed to get API key: ${error.message}`);
    }
    
    if (!data || !data.key) {
      throw new Error("No API key found in Supabase");
    }
    
    return data.key;
  } catch (error) {
    console.error("Error in getApiKey:", error);
    throw error;
  }
};

// Create a new thread
export const createThread = async (): Promise<OpenAIThread> => {
  try {
    console.log("Creating new OpenAI thread");
    
    const apiKey = await getApiKey();
    
    const response = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v1'
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Error response from OpenAI:', error);
      throw new Error(`API error: ${response.status} - ${JSON.stringify(error)}`);
    }
    
    const thread = await response.json();
    console.log("Thread created successfully:", thread.id);
    return thread;
  } catch (error) {
    console.error("Error creating thread:", error);
    throw error;
  }
};

// Add a message to a thread
export const addMessageToThread = async (
  threadId: string, 
  content: string,
  userId: string
): Promise<OpenAIMessage> => {
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

    const apiKey = await getApiKey();
    
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v1'
      },
      body: JSON.stringify({
        role: 'user',
        content: messageContent
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Error response from OpenAI:', error);
      throw new Error(`API error: ${response.status} - ${JSON.stringify(error)}`);
    }
    
    const message = await response.json();
    console.log("Message added successfully:", message.id);
    return message;
  } catch (error) {
    console.error("Error adding message:", error);
    throw error;
  }
};

// Run the assistant on a thread with optional instructions
export const runAssistant = async (
  threadId: string,
  instructions?: string
): Promise<OpenAIRun> => {
  try {
    console.log(`Running assistant on thread ${threadId}`);
    
    const apiKey = await getApiKey();
    
    const body: Record<string, any> = {
      assistant_id: ASSISTANT_ID
    };
    
    // Add instructions if provided
    if (instructions) {
      body.instructions = instructions;
    }
    
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v1'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Error response from OpenAI:', error);
      throw new Error(`API error: ${response.status} - ${JSON.stringify(error)}`);
    }
    
    const run = await response.json();
    console.log("Assistant run initiated:", run.id);
    return run;
  } catch (error) {
    console.error("Error running assistant:", error);
    throw error;
  }
};

// Check the status of a run
export const checkRunStatus = async (threadId: string, runId: string): Promise<OpenAIRun> => {
  try {
    console.log(`Checking run status for thread ${threadId}, run ${runId}`);
    
    const apiKey = await getApiKey();
    
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v1'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Error response from OpenAI:', error);
      throw new Error(`API error: ${response.status} - ${JSON.stringify(error)}`);
    }
    
    const run = await response.json();
    console.log(`Run status: ${run.status}`);
    return run;
  } catch (error) {
    console.error("Error checking run status:", error);
    throw error;
  }
};

// Get messages from a thread
export const getMessages = async (threadId: string): Promise<OpenAIMessage[]> => {
  try {
    console.log(`Getting messages from thread ${threadId}`);
    
    const apiKey = await getApiKey();
    
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v1'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Error response from OpenAI:', error);
      throw new Error(`API error: ${response.status} - ${JSON.stringify(error)}`);
    }
    
    const result = await response.json();
    console.log(`Retrieved ${result.data.length} messages`);
    return result.data;
  } catch (error) {
    console.error("Error getting messages:", error);
    throw error;
  }
};

// Count user messages in a thread
export const countUserMessages = async (threadId: string): Promise<number> => {
  try {
    const messages = await getMessages(threadId);
    if (!messages) return 0;
    
    return messages.filter(msg => msg.role === "user").length;
  } catch (error) {
    console.error("Error counting user messages:", error);
    throw error;
  }
};

// Get the latest assistant message
export const getLatestAssistantMessage = async (threadId: string): Promise<string | null> => {
  try {
    const messages = await getMessages(threadId);
    if (!messages) return null;
    
    const assistantMessages = messages.filter(msg => msg.role === "assistant");
    if (assistantMessages.length === 0) return null;
    
    return assistantMessages[0].content[0]?.text?.value || null;
  } catch (error) {
    console.error("Error getting latest assistant message:", error);
    throw error;
  }
};
