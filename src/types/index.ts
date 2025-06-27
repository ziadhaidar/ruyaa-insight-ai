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

// Helper function to safely convert Json to string array
export function jsonToStringArray(json: any): string[] {
  if (Array.isArray(json)) {
    return json.filter(item => typeof item === 'string');
  }
  if (typeof json === 'string') {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => typeof item === 'string');
      }
    } catch (e) {
      // Not valid JSON, return empty array
    }
  }
  return [];
}

// Helper function to safely convert string to status enum
export function safeStatusCast(status: string | null): "pending" | "paid" | "interpreting" | "completed" {
  if (!status) return "pending";
  if (["pending", "paid", "interpreting", "completed"].includes(status)) {
    return status as "pending" | "paid" | "interpreting" | "completed";
  }
  return "pending";
}

// Helper function to safely convert string to gender enum
export function safeGenderCast(gender: string | null): "male" | "female" | "other" | "prefer_not_to_say" {
  if (!gender) return "prefer_not_to_say";
  if (["male", "female", "other", "prefer_not_to_say"].includes(gender)) {
    return gender as "male" | "female" | "other" | "prefer_not_to_say";
  }
  return "prefer_not_to_say";
}

// Helper function to safely convert string to marital status enum
export function safeMaritalStatusCast(status: string | null): "single" | "married" | "divorced" | "widowed" | "other" {
  if (!status) return "other";
  if (["single", "married", "divorced", "widowed", "other"].includes(status)) {
    return status as "single" | "married" | "divorced" | "widowed" | "other";
  }
  return "other";
}

// Helper function to safely convert string to work status enum
export function safeWorkStatusCast(status: string | null): "employed" | "unemployed" | "student" | "retired" | "other" {
  if (!status) return "other";
  if (["employed", "unemployed", "student", "retired", "other"].includes(status)) {
    return status as "employed" | "unemployed" | "student" | "retired" | "other";
  }
  return "other";
}

// Helper function to safely convert string to post status enum
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
