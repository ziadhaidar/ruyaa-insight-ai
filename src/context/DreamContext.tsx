
import React, { createContext, useContext, useState, ReactNode } from "react";
import { Dream, Message, InterpretationSession } from "@/types";
import { useAuth } from "./AuthContext";
import { v4 as uuidv4 } from "uuid";

interface DreamContextProps {
  dreams: Dream[];
  currentSession: InterpretationSession | null;
  startNewDreamSession: (dreamContent: string) => void;
  confirmPayment: () => void;
  submitAnswer: (answer: string) => Promise<void>;
  getDream: (id: string) => Dream | undefined;
  getMessages: (dreamId: string) => Message[];
  completeDreamInterpretation: () => void;
  sendToEmail: (dreamId: string) => void;
}

const DreamContext = createContext<DreamContextProps | undefined>(undefined);

export const DreamProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSession, setCurrentSession] = useState<InterpretationSession | null>(null);

  // Mock AI response function - to be replaced with actual API call
  const getAIResponse = async (prompt: string, includeQuranVerse: boolean = false): Promise<string> => {
    // This simulates a delay and returns a mock response
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (includeQuranVerse) {
      return `
<div class="quran-verse">
  <p class="arabic-text">وَإِذْ قَالَ رَبُّكَ لِلْمَلَائِكَةِ إِنِّي جَاعِلٌ فِي الْأَرْضِ خَلِيفَةً ۖ قَالُوا أَتَجْعَلُ فِيهَا مَن يُفْسِدُ فِيهَا وَيَسْفِكُ الدِّمَاءَ وَنَحْنُ نُسَبِّحُ بِحَمْدِكَ وَنُقَدِّسُ لَكَ ۖ قَالَ إِنِّي أَعْلَمُ مَا لَا تَعْلَمُونَ</p>
  <p class="english-translation">And [mention, O Muhammad], when your Lord said to the angels, "Indeed, I will make upon the earth a successive authority." They said, "Will You place upon it one who causes corruption therein and sheds blood, while we declare Your praise and sanctify You?" Allah said, "Indeed, I know that which you do not know." [Quran 2:30]</p>
</div>

Based on this verse and your dream description, I believe this dream may be indicating a position of responsibility you're being prepared for. The water in your dream symbolizes knowledge and purity in Islamic tradition, while the mountain represents steadfastness and the challenges you may face.`;
    }
    
    // Initial questions
    const questions = [
      "Can you tell me if any specific people appeared in your dream?",
      "What emotions did you feel during this dream?",
      "Has this dream or similar elements occurred before?"
    ];
    
    if (currentSession && currentSession.currentQuestion < 3) {
      return questions[currentSession.currentQuestion];
    }
    
    // Final response
    return "Thank you for sharing your dream and answering these questions. I will now provide an interpretation based on Islamic teachings.";
  };

  const startNewDreamSession = (dreamContent: string) => {
    if (!user) return;
    
    const newDream: Dream = {
      id: uuidv4(),
      userId: user.id,
      content: dreamContent,
      createdAt: new Date().toISOString(),
      status: "pending"
    };
    
    const initialMessage: Message = {
      id: uuidv4(),
      dreamId: newDream.id,
      content: dreamContent,
      sender: "user",
      timestamp: new Date().toISOString()
    };
    
    setDreams(prev => [...prev, newDream]);
    setMessages(prev => [...prev, initialMessage]);
    
    setCurrentSession({
      dream: newDream,
      messages: [initialMessage],
      currentQuestion: -1, // Payment is required first
      isComplete: false
    });
  };

  const confirmPayment = async () => {
    if (!currentSession) return;
    
    // Update dream status
    const updatedDream = { ...currentSession.dream, status: "paid" as const };
    setDreams(prev => prev.map(d => d.id === updatedDream.id ? updatedDream : d));
    
    // Add first AI message
    const aiResponse = await getAIResponse("Initial response after payment");
    
    const newMessage: Message = {
      id: uuidv4(),
      dreamId: updatedDream.id,
      content: aiResponse,
      sender: "ai",
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Update current session
    setCurrentSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        dream: updatedDream,
        messages: [...prev.messages, newMessage],
        currentQuestion: 0
      };
    });
  };

  const submitAnswer = async (answer: string) => {
    if (!currentSession) return;
    
    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      dreamId: currentSession.dream.id,
      content: answer,
      sender: "user",
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Calculate next question index
    const nextQuestionIndex = currentSession.currentQuestion + 1;
    
    // Add AI response
    let aiResponse: string;
    
    if (nextQuestionIndex < 3) {
      // Next question
      aiResponse = await getAIResponse("", false);
    } else {
      // Final interpretation with Quran verse
      aiResponse = await getAIResponse(
        `Final interpretation based on: ${currentSession.dream.content} and follow-up answers`, 
        true
      );
    }
    
    const aiMessage: Message = {
      id: uuidv4(),
      dreamId: currentSession.dream.id,
      content: aiResponse,
      sender: "ai",
      timestamp: new Date().toISOString(),
      isQuranVerse: nextQuestionIndex >= 3
    };
    
    setMessages(prev => [...prev, aiMessage]);
    
    // Update dream status if interpretation is complete
    if (nextQuestionIndex >= 3) {
      const completedDream = { 
        ...currentSession.dream, 
        status: "completed" as const 
      };
      
      setDreams(prev => prev.map(d => d.id === completedDream.id ? completedDream : d));
      
      // Update session to complete
      setCurrentSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          dream: completedDream,
          messages: [...prev.messages, userMessage, aiMessage],
          currentQuestion: nextQuestionIndex,
          isComplete: true
        };
      });
    } else {
      // Update session to next question
      setCurrentSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, userMessage, aiMessage],
          currentQuestion: nextQuestionIndex
        };
      });
    }
  };

  const getDream = (id: string) => {
    return dreams.find(d => d.id === id);
  };

  const getMessages = (dreamId: string) => {
    return messages.filter(m => m.dreamId === dreamId);
  };

  const completeDreamInterpretation = () => {
    setCurrentSession(null);
  };

  const sendToEmail = (dreamId: string) => {
    // Mock function to send interpretation to email
    console.log(`Sending interpretation for dream ${dreamId} to email`);
    alert("Interpretation has been sent to your email!");
  };

  return (
    <DreamContext.Provider
      value={{
        dreams,
        currentSession,
        startNewDreamSession,
        confirmPayment,
        submitAnswer,
        getDream,
        getMessages,
        completeDreamInterpretation,
        sendToEmail
      }}
    >
      {children}
    </DreamContext.Provider>
  );
};

export const useDream = () => {
  const context = useContext(DreamContext);
  if (context === undefined) {
    throw new Error("useDream must be used within a DreamProvider");
  }
  return context;
};
