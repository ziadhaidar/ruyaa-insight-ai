
import { Dream, InterpretationSession } from "@/types";

export interface DreamContextType {
  currentDream: Dream | null;
  currentSession: InterpretationSession | null;
  interpretationSession: InterpretationSession | null;
  setCurrentDream: (dream: Dream | null) => void;
  startNewDreamSession: (dreamText: string) => Promise<void>;
  isLoading: boolean;
  processDreamInterpretation: () => Promise<void>;
  askQuestion: (question: string) => Promise<void>;
  submitAnswer: (answer: string) => Promise<void>;
  completeDreamInterpretation: () => Promise<void>;
  sendToEmail: (dreamId: string) => Promise<void>;
  saveInterpretation: (interpretation: string) => Promise<void>;
  getDirectInterpretation: (dreamText: string, userId: string) => Promise<string>;
}

export interface DreamProviderProps {
  children: React.ReactNode;
}
