
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useDream } from "@/context/DreamContext";
import { Send, Mail } from "lucide-react";
import LoadingAnimation from "./LoadingAnimation";

const InterpretationChat: React.FC = () => {
  const { currentSession, submitAnswer, completeDreamInterpretation, sendToEmail } = useDream();
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !currentSession) return;

    const input = userInput;
    setUserInput("");
    setIsLoading(true);
    
    try {
      await submitAnswer(input);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    completeDreamInterpretation();
    navigate("/dreams");
  };

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages]);

  if (!currentSession) {
    navigate("/home");
    return null;
  }

  return (
    <div className="h-[calc(100vh-14rem)] max-w-2xl mx-auto flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dream Interpretation</h2>
        {currentSession.isComplete && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => sendToEmail(currentSession.dream.id)}
          >
            <Mail className="mr-2 h-4 w-4" />
            Send to Email
          </Button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto mb-4 p-4 bg-background/50 rounded-lg border">
        {currentSession.messages.map((message, index) => (
          <div 
            key={index}
            className={message.sender === "user" ? "user-message" : "ai-message"}
            dangerouslySetInnerHTML={{ __html: message.content }}
          />
        ))}
        
        {isLoading && (
          <div className="ai-message p-0 bg-transparent">
            <LoadingAnimation message="Analyzing your dream..." />
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {!currentSession.isComplete ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            className="flex-1 px-4 py-2 rounded-md border bg-background"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your answer..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={!userInput.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      ) : (
        <Button onClick={handleComplete} className="w-full">
          Return to Dreams
        </Button>
      )}
    </div>
  );
};

export default InterpretationChat;
