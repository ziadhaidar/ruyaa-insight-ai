
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import { useDream } from "@/context/DreamContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Send, Mail } from "lucide-react";

const InterpretationChat: React.FC = () => {
  const [userInput, setUserInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLanguage();
  const { currentSession, submitAnswer, completeDreamInterpretation, sendToEmail } = useDream();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect if there's no active session
  useEffect(() => {
    if (!currentSession) {
      navigate("/home");
    }
  }, [currentSession, navigate]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userInput.trim() || !currentSession || isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await submitAnswer(userInput);
      setUserInput("");
    } catch (error) {
      console.error("Failed to submit answer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = () => {
    completeDreamInterpretation();
    navigate("/dreams");
  };

  const handleSendToEmail = () => {
    if (!currentSession) return;
    sendToEmail(currentSession.dream.id);
  };

  if (!currentSession) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {currentSession.messages.map((message) => (
              <div
                key={message.id}
                className={`${
                  message.sender === "user" ? "user-message" : "ai-message"
                }`}
                dangerouslySetInnerHTML={{ __html: message.content }}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
        <CardFooter className="border-t p-2">
          {currentSession.isComplete ? (
            <div className="w-full flex flex-col gap-2">
              <div className="flex items-center gap-2 w-full">
                <Button className="w-full" onClick={handleSendToEmail}>
                  <Mail className="mr-2 h-4 w-4" />
                  {t("sendToEmail")}
                </Button>
                <Button variant="secondary" className="w-full" onClick={handleComplete}>
                  {t("interpretComplete")}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex w-full gap-2">
              <Input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your answer..."
                disabled={isSubmitting || currentSession.currentQuestion < 0}
              />
              <Button type="submit" size="icon" disabled={isSubmitting || currentSession.currentQuestion < 0}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default InterpretationChat;
