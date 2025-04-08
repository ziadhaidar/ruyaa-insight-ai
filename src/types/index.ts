
export interface User {
  id: string;
  email: string;
  displayName?: string;
}

export interface Dream {
  id: string;
  user_id: string;
  dream_text: string;
  questions?: any[];
  answers?: any[];
  interpretation?: string;
  created_at: string;
  status?: "pending" | "paid" | "interpreting" | "completed";
}

export interface Message {
  id: string;
  dreamId: string;
  content: string;
  sender: "user" | "ai";
  timestamp: string;
  isQuranVerse?: boolean;
}

export interface PaymentIntent {
  id: string;
  dreamId: string;
  amount: number;
  status: "pending" | "succeeded" | "failed";
  createdAt: string;
}

export interface InterpretationSession {
  dream: Dream;
  messages: Message[];
  currentQuestion: number;
  isComplete: boolean;
}

export type Language = "en" | "ar";

// Extend the Database interface with database types
export interface Database {
  public: {
    Tables: {
      dreams: {
        Row: {
          id: string;
          user_id: string;
          dream_text: string;
          questions: any[] | null;
          answers: any[] | null;
          interpretation: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          dream_text: string;
          questions?: any[] | null;
          answers?: any[] | null;
          interpretation?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          dream_text?: string;
          questions?: any[] | null;
          answers?: any[] | null;
          interpretation?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
