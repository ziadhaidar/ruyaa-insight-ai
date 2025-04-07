
export interface User {
  id: string;
  email: string;
  displayName?: string;
}

export interface Dream {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  status: "pending" | "paid" | "interpreting" | "completed";
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
