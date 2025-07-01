
export interface User {
  id: string;
  email: string;
  displayName?: string;
}

export interface Dream {
  id: string;
  user_id: string;
  dream_text: string;
  questions?: string[];
  answers?: string[];
  interpretation?: string;
  created_at: string;
  status?: "pending" | "paid" | "interpreting" | "completed" | "interpreted";
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

// Helper function to safely convert Json to string array
export function jsonToStringArray(json: any): string[] {
  if (Array.isArray(json)) {
    return json.filter(item => typeof item === 'string');
  }
  return [];
}

// Helper function to safely convert string to status enum
export function safeStatusCast(status: string | null): "pending" | "paid" | "interpreting" | "completed" | "interpreted" {
  if (!status) return "pending";
  if (["pending", "paid", "interpreting", "completed", "interpreted"].includes(status)) {
    return status as "pending" | "paid" | "interpreting" | "completed" | "interpreted";
  }
  return "pending";
}

// Helper function to safely cast gender
export function safeGenderCast(gender: string | null): "male" | "female" | "other" | "prefer_not_to_say" | undefined {
  if (!gender) return undefined;
  if (["male", "female", "other", "prefer_not_to_say"].includes(gender)) {
    return gender as "male" | "female" | "other" | "prefer_not_to_say";
  }
  return undefined;
}

// Helper function to safely cast marital status
export function safeMaritalStatusCast(status: string | null): "single" | "married" | "divorced" | "widowed" | "other" | undefined {
  if (!status) return undefined;
  if (["single", "married", "divorced", "widowed", "other"].includes(status)) {
    return status as "single" | "married" | "divorced" | "widowed" | "other";
  }
  return undefined;
}

// Helper function to safely cast work status
export function safeWorkStatusCast(status: string | null): "employed" | "unemployed" | "student" | "retired" | "other" | undefined {
  if (!status) return undefined;
  if (["employed", "unemployed", "student", "retired", "other"].includes(status)) {
    return status as "employed" | "unemployed" | "student" | "retired" | "other";
  }
  return undefined;
}

// Helper function to safely cast post status
export function safePostStatusCast(status: string | null): "draft" | "published" {
  if (!status) return "draft";
  if (["draft", "published"].includes(status)) {
    return status as "draft" | "published";
  }
  return "draft";
}

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
          status: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          dream_text: string;
          questions?: any[] | null;
          answers?: any[] | null;
          interpretation?: string | null;
          created_at?: string;
          status?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          dream_text?: string;
          questions?: any[] | null;
          answers?: any[] | null;
          interpretation?: string | null;
          created_at?: string;
          status?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          country: string | null;
          age: number | null;
          gender: string | null;
          marital_status: string | null;
          has_kids: boolean | null;
          has_pets: boolean | null;
          work_status: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          country?: string | null;
          age?: number | null;
          gender?: string | null;
          marital_status?: string | null;
          has_kids?: boolean | null;
          has_pets?: boolean | null;
          work_status?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          country?: string | null;
          age?: number | null;
          gender?: string | null;
          marital_status?: string | null;
          has_kids?: boolean | null;
          has_pets?: boolean | null;
          work_status?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never
    };
    Functions: {
      [_ in never]: never
    };
    Enums: {
      [_ in never]: never
    };
    CompositeTypes: {
      [_ in never]: never
    };
  };
}
