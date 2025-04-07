
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

  // Generate personalized questions based on dream content
  const generatePersonalizedQuestions = (dreamContent: string): string[] => {
    // Example dream themes and their corresponding questions
    const dreamThemes = {
      water: [
        "Did the water in your dream appear clear or murky? This distinction is important in Islamic dream interpretation.",
        "Was the body of water in your dream still like a lake, or moving like a river or ocean?",
        "Did you feel fear or comfort when interacting with the water in your dream?"
      ],
      flying: [
        "During your flight in the dream, did you feel in control or were you being carried?",
        "How high were you flying in your dream? Could you see the ground clearly?",
        "Did anyone accompany you during this flight in your dream?"
      ],
      falling: [
        "Before falling in your dream, where were you standing or what were you doing?",
        "Did you hit the ground in your dream or did you wake up before impact?",
        "Did anyone try to save you from falling in your dream?"
      ],
      house: [
        "Was this house in your dream familiar to you or was it one you've never seen before?",
        "Which specific rooms of the house did you enter in your dream?",
        "Were there other people in the house during your dream? If so, who were they?"
      ],
      animals: [
        "What was the behavior of the animal toward you in your dream?",
        "What color was the animal in your dream? In Islamic interpretation, colors carry significance.",
        "Did the animal speak to you or communicate in any way during your dream?"
      ],
      death: [
        "In your dream, was it your own death or someone else's that you witnessed?",
        "What emotions did you experience regarding the death in your dream?",
        "After the death occurred in your dream, what happened next?"
      ],
      teeth: [
        "Did your teeth fall out painlessly or was there discomfort in your dream?",
        "Did anyone else notice or comment on your teeth in the dream?",
        "After losing your teeth in the dream, were you able to speak clearly?"
      ],
      marriage: [
        "Was the marriage ceremony in your dream traditional Islamic or different?",
        "Did you recognize the person you were marrying in your dream?",
        "What emotions did you feel during this marriage in your dream?"
      ],
      money: [
        "What form did the wealth take in your dream - coins, paper money, gold?",
        "Did you earn this money through work, or was it given to you in your dream?",
        "What did you do with the money in your dream?"
      ]
    };

    // Default questions if no themes are detected
    const defaultQuestions = [
      "Were there any specific people or figures in your dream that stood out?",
      "What emotions did you feel during this dream?",
      "Has this dream or similar elements occurred to you before?"
    ];

    // Analyze dream content for themes
    const dreamLower = dreamContent.toLowerCase();
    let detectedThemes: string[] = [];

    // Check for each theme in the dream content
    Object.keys(dreamThemes).forEach(theme => {
      // Look for theme words and related terms
      const themeTerms = {
        water: ['water', 'river', 'ocean', 'sea', 'lake', 'flood', 'swim', 'drown', 'rain'],
        flying: ['fly', 'flying', 'float', 'air', 'sky', 'soar', 'wing'],
        falling: ['fall', 'falling', 'drop', 'plummet', 'descent'],
        house: ['house', 'home', 'building', 'room', 'door', 'roof', 'apartment'],
        animals: ['animal', 'cat', 'dog', 'lion', 'snake', 'bird', 'horse', 'sheep'],
        death: ['death', 'die', 'dead', 'funeral', 'grave', 'cemetery', 'passed away'],
        teeth: ['teeth', 'tooth', 'mouth', 'dental', 'bite', 'chew'],
        marriage: ['marriage', 'wedding', 'bride', 'groom', 'marry', 'spouse'],
        money: ['money', 'wealth', 'rich', 'poor', 'coin', 'currency', 'gold', 'silver']
      };

      // @ts-ignore - we know these keys exist
      if (themeTerms[theme].some(term => dreamLower.includes(term))) {
        detectedThemes.push(theme);
      }
    });

    // Select 3 questions based on detected themes
    let selectedQuestions: string[] = [];

    if (detectedThemes.length > 0) {
      // Prioritize the most relevant themes (max 2)
      const themesToUse = detectedThemes.slice(0, Math.min(2, detectedThemes.length));
      
      // Get questions from each detected theme
      themesToUse.forEach(theme => {
        // @ts-ignore - we know these keys exist
        const themeQuestions = dreamThemes[theme];
        // Select 1-2 questions from each theme
        const questionsFromTheme = themeQuestions.slice(0, Math.ceil(3 / themesToUse.length));
        selectedQuestions = [...selectedQuestions, ...questionsFromTheme];
      });
    }

    // If we don't have enough theme-specific questions, add default ones
    while (selectedQuestions.length < 3) {
      const defaultQuestion = defaultQuestions[selectedQuestions.length];
      if (!selectedQuestions.includes(defaultQuestion)) {
        selectedQuestions.push(defaultQuestion);
      }
    }

    // Ensure we only return exactly 3 questions
    return selectedQuestions.slice(0, 3);
  };

  // Mock AI response function that uses personalized questions
  const getAIResponse = async (prompt: string, includeQuranVerse: boolean = false, dreamContent: string = ""): Promise<string> => {
    // This simulates a delay and returns a mock response
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    if (includeQuranVerse) {
      return `
<div class="quran-verse">
  <p class="arabic-text">وَإِذْ قَالَ رَبُّكَ لِلْمَلَائِكَةِ إِنِّي جَاعِلٌ فِي الْأَرْضِ خَلِيفَةً ۖ قَالُوا أَتَجْعَلُ فِيهَا مَن يُفْسِدُ فِيهَا وَيَسْفِكُ الدِّمَاءَ وَنَحْنُ نُسَبِّحُ بِحَمْدِكَ وَنُقَدِّسُ لَكَ ۖ قَالَ إِنِّي أَعْلَمُ مَا لَا تَعْلَمُونَ</p>
  <p class="english-translation">And [mention, O Muhammad], when your Lord said to the angels, "Indeed, I will make upon the earth a successive authority." They said, "Will You place upon it one who causes corruption therein and sheds blood, while we declare Your praise and sanctify You?" Allah said, "Indeed, I know that which you do not know." [Quran 2:30]</p>
</div>

Based on this verse and your dream description, I believe this dream may be indicating a position of responsibility you're being prepared for. The water in your dream symbolizes knowledge and purity in Islamic tradition, while the mountain represents steadfastness and the challenges you may face.`;
    }
    
    // Get personalized questions based on the dream content
    if (currentSession && dreamContent) {
      const personalizedQuestions = generatePersonalizedQuestions(dreamContent);
      
      if (currentSession.currentQuestion >= 0 && currentSession.currentQuestion < 3) {
        return personalizedQuestions[currentSession.currentQuestion];
      }
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
    
    // Add first AI message using the dream content for personalized questions
    const dreamContent = currentSession.dream.content;
    const aiResponse = await getAIResponse("Initial response after payment", false, dreamContent);
    
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
      // Next question - pass the dream content for context
      aiResponse = await getAIResponse("", false, currentSession.dream.content);
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
