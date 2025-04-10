
import { Dream, InterpretationSession, Message } from "@/types";

export interface DreamContextType {
  currentDream: Dream | null;
  currentSession: InterpretationSession | null;
  interpretationSession: InterpretationSession | null;
  setCurrentDream: (dream: Dream | null) => void;
  startNewDreamSession: (dreamText: string) => void;
  processDreamInterpretation: () => void;
  askQuestion: (question: string) => void;
  submitAnswer: (answer: string) => Promise<void>;
  completeDreamInterpretation: () => void;
  sendToEmail: (dreamId: string) => Promise<void>;
  saveInterpretation: (interpretation: string) => Promise<void>;
  isLoading: boolean;
}

export interface DreamProviderProps {
  children: React.ReactNode;
}
