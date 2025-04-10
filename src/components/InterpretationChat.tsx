
import React, { useState, useRef, useEffect } from "react";
import { useDream } from "@/context/DreamContext";
import { Message } from "@/types";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Avatar } from "./ui/avatar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "./ui/badge";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

const InterpretationChat = () => {
  const { currentSession, askQuestion, submitAnswer, isLoading } = useDream();
  const { user } = useAuth();
  const [messageContent, setMessageContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to the bottom of the chat on message updates
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [currentSession?.messages]);

  const handleSendMessage = async () => {
    if (!messageContent.trim() || isLoading) return;
    
    setError(null);
    
    try {
      if (currentSession && currentSession.messages.length % 2 === 0) {
        // It's the user's turn to ask a question
        await askQuestion(messageContent);
      } else {
        // It's the user's turn to submit an answer
        await submitAnswer(messageContent);
      }
      
      setMessageContent("");
    } catch (err) {
      console.error("Error in chat:", err);
      setError("Failed to process your message. Please try again.");
    }
  };

  // Check if the latest message is the final interpretation
  const isFinalInterpretation = () => {
    if (!currentSession) return false;
    
    // The final interpretation is when we have at least 8 messages and completed all 3 questions
    return currentSession.messages.length >= 8 && 
           currentSession.currentQuestion > 3 &&
           currentSession.messages[currentSession.messages.length - 1].sender === 'ai';
  };

  // Check if a message contains a Quranic verse (for styling)
  const containsQuranVerse = (content: string) => {
    // This is a simple check - you might want to implement a more sophisticated detection
    return content.includes('Quran') || content.includes('Qur\'an') || content.includes('verse') || 
           content.includes('surah') || content.includes('ayah');
  };

  // Function to enhance message display
  const renderMessageContent = (message: Message) => {
    if (message.sender !== 'ai') {
      return <p>{message.content}</p>;
    }
    
    // For AI messages, check if it's the final interpretation
    const isFinal = isFinalInterpretation() && 
                   currentSession?.messages[currentSession.messages.length - 1].id === message.id;
    
    if (isFinal) {
      // Split the content to find Quranic verses
      const parts = message.content.split(/(\bQuran\b|\bQur'an\b|\bverse\b|\bSurah\b|\bAyah\b)/i);
      
      return (
        <div className="space-y-4">
          {isFinal && <Badge className="mb-2">Final Interpretation</Badge>}
          {parts.map((part, index) => {
            if (index > 0 && /(\bQuran\b|\bQur'an\b|\bverse\b|\bSurah\b|\bAyah\b)/i.test(parts[index-1])) {
              // This part likely contains a Quranic verse
              return (
                <blockquote key={index} className="pl-4 border-l-4 border-primary italic">
                  {part}
                </blockquote>
              );
            }
            return <p key={index}>{part}</p>;
          })}
        </div>
      );
    }
    
    // For regular AI messages
    return <p>{message.content}</p>;
  };

  // Determine the button text based on the current state
  const getButtonText = () => {
    if (!currentSession) return "Send";
    
    if (currentSession.messages.length % 2 === 0) {
      return `Answer Question ${Math.ceil(currentSession.messages.length / 2)}`;
    } else {
      if (currentSession.currentQuestion <= 3) {
        return `Submit Answer ${currentSession.currentQuestion}`;
      } else {
        return "Send";
      }
    }
  };

  if (!currentSession) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Dream Interpretation (AI Assistant)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-medium mb-2">No Active Session</h3>
              <p className="text-muted-foreground max-w-md">
                Please submit a dream from the home page to start an interpretation session.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Dream Interpretation (AI Assistant)</CardTitle>
        {currentSession && currentSession.currentQuestion <= 3 && (
          <div className="text-sm text-muted-foreground mt-1">
            Question {currentSession.currentQuestion} of 3
          </div>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-4" style={{ maxHeight: '500px', overflowY: 'auto' }} ref={chatContainerRef}>
          {currentSession?.messages.map((message: Message) => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="flex items-start space-x-2 max-w-[80%]">
                {message.sender === 'ai' && (
                  <Avatar className="w-8 h-8 mt-1">
                    <img src="/ai_avatar.png" alt="AI Avatar" />
                  </Avatar>
                )}
                <div className={`rounded-lg p-3 text-sm ${
                  message.sender === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary text-secondary-foreground'
                } ${
                  isFinalInterpretation() && message === currentSession.messages[currentSession.messages.length - 1]
                    ? 'border-2 border-primary'
                    : ''
                }`}>
                  {renderMessageContent(message)}
                </div>
                {message.sender === 'user' && (
                  <Avatar className="w-8 h-8 mt-1">
                    {user?.email ? user.email[0].toUpperCase() : 'U'}
                  </Avatar>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-2">
                <Avatar className="w-8 h-8">
                  <img src="/ai_avatar.png" alt="AI Avatar" />
                </Avatar>
                <div className="rounded-lg p-3 text-sm bg-secondary text-secondary-foreground">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '600ms' }}></div>
                    <span className="ml-2">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex-col space-y-4">
        <div className="w-full flex items-center space-x-4">
          <Textarea
            placeholder={currentSession?.currentQuestion <= 3 
              ? `Type your answer to question ${currentSession?.currentQuestion}...` 
              : "Type your message here..."}
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            className="flex-grow"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isLoading || (currentSession && currentSession.isComplete)}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isLoading || !messageContent.trim() || (currentSession && currentSession.isComplete)}
          >
            {getButtonText()}
          </Button>
        </div>
        {currentSession && isFinalInterpretation() && (
          <div className="w-full p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">Your dream interpretation is complete!</p>
            <p className="text-xs text-muted-foreground mt-1">
              This interpretation includes a relevant Qur'anic verse and spiritual advice based on your dream description
              and your answers to our questions.
            </p>
          </div>
        )}
        <p className="text-xs text-muted-foreground w-full text-center">
          Powered by OpenAI GPT Assistant for Islamic dream interpretation
        </p>
      </CardFooter>
    </Card>
  );
};

export default InterpretationChat;
