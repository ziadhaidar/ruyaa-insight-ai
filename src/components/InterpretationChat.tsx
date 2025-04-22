import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import LoadingAnimation from './LoadingAnimation';
import useOpenAIAssistant from '@/hooks/useOpenAIAssistant';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';

const InterpretationChat = () => {
  const { dreamId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { submitMessage, isLoading, messages, createNewThread } = useOpenAIAssistant();
  const [userInput, setUserInput] = useState('');
  const [dreamContent, setDreamContent] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [interpretation, setInterpretation] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDream = async () => {
      if (!dreamId) return;
      
      try {
        const { data, error } = await supabase
          .from('dreams')
          .select('*')
          .eq('id', dreamId)
          .single();
        
        if (error) {
          console.error('Error fetching dream:', error);
          return;
        }
        
        if (data) {
          setDreamContent(data.content);
          // If there's already an interpretation, set it
          if (data.interpretation) {
            setInterpretation(data.interpretation);
          }
        }
      } catch (error) {
        console.error('Error fetching dream:', error);
      }
    };
    
    fetchDream();
  }, [dreamId]);

  useEffect(() => {
    if (dreamContent && !isInitialized) {
      initializeChat();
    }
  }, [dreamContent]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Extract interpretation from AI responses to save to database
  useEffect(() => {
    if (messages.length > 1) {
      // Find the last AI message that contains an interpretation
      const aiMessages = messages.filter(msg => msg.role === 'assistant');
      if (aiMessages.length > 0) {
        const lastAiMessage = aiMessages[aiMessages.length - 1];
        setInterpretation(lastAiMessage.content);
        
        // Save the interpretation to the database
        updateDreamInterpretation(lastAiMessage.content);
      }
    }
  }, [messages]);

  const updateDreamInterpretation = async (interpretationText: string) => {
    if (!dreamId || !interpretationText) return;
    
    try {
      const { error } = await supabase
        .from('dreams')
        .update({ 
          interpretation: interpretationText,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', dreamId);
      
      if (error) {
        console.error('Error updating dream interpretation:', error);
      } else {
        console.log('Dream interpretation updated successfully');
      }
    } catch (error) {
      console.error('Error updating dream interpretation:', error);
    }
  };

  const initializeChat = async () => {
    await createNewThread();
    const initialPrompt = `I would like you to interpret my dream in ${language}. Here is the dream: ${dreamContent}`;
    await submitMessage(initialPrompt);
    setIsInitialized(true);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    
    const message = userInput;
    setUserInput('');
    await submitMessage(message);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFinish = () => {
    navigate(`/dreams/${dreamId}`);
  };

  if (!dreamContent) {
    return <div className="flex justify-center items-center h-64"><LoadingAnimation /></div>;
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="flex-1 overflow-auto p-4 space-y-4 mb-4 border rounded-md bg-background">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground ml-auto' 
                  : 'bg-muted ml-0'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-muted">
              <LoadingAnimation />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="sticky bottom-0 bg-background p-2 border-t">
        <div className="flex space-x-2">
          <Textarea 
            value={userInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your dream..."
            className="min-h-[60px] flex-1"
          />
          <Button onClick={handleSendMessage} disabled={isLoading}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex justify-end mt-2">
          <Button onClick={handleFinish} variant="outline">
            Finish Interpretation
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InterpretationChat;
