import React, { useState, useRef, useEffect } from "react";
import { useDream } from "@/context/DreamContext";
import { Message } from "@/types";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Avatar } from "./ui/avatar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { useAuth } from "@/context/AuthContext";

const InterpretationChat = () => {
  const { currentSession, askQuestion, submitAnswer, isLoading } = useDream();
  const { user } = useAuth();
  const [messageContent, setMessageContent] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to the bottom of the chat on message updates
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [currentSession?.messages]);

  const handleSendMessage = async () => {
    if (!messageContent.trim()) return;

    if (currentSession && currentSession.messages.length % 2 === 0) {
      // It's the user's turn to ask a question
      askQuestion(messageContent);
    } else {
      // It's the user's turn to submit an answer
      await submitAnswer(messageContent);
    }

    setMessageContent("");
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Dream Interpretation (AI Assistant)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4" style={{ maxHeight: '500px', overflowY: 'auto' }} ref={chatContainerRef}>
          {currentSession?.messages.map((message: Message) => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="flex items-center space-x-2">
                {message.sender === 'ai' && (
                  <Avatar className="w-8 h-8">
                    <img src="/ai_avatar.png" alt="AI Avatar" />
                    <Avatar />
                  </Avatar>
                )}
                <div className={`rounded-lg p-3 text-sm ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                  {message.content}
                </div>
                {message.sender === 'user' && (
                  <Avatar className="w-8 h-8">
                    {user?.email ? user.email[0].toUpperCase() : 'U'}
                    <Avatar />
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
                  <Avatar />
                </Avatar>
                <div className="rounded-lg p-3 text-sm bg-secondary text-secondary-foreground">
                  Thinking...
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <div className="w-full flex items-center space-x-4">
          <Textarea
            placeholder="Type your message here..."
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            className="flex-grow"
          />
          <Button onClick={handleSendMessage} disabled={isLoading}>
            {currentSession && currentSession.messages.length % 2 === 0 ? "Ask Question" : "Submit Answer"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Powered by OpenAI GPT Assistant for Islamic dream interpretation
        </p>
      </CardFooter>
    </Card>
  );
};

export default InterpretationChat;
