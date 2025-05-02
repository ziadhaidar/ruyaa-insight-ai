
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LoadingAnimation from "./LoadingAnimation";
import { useOpenAIAssistant } from "@/hooks/useOpenAIAssistant";
import aiAvatar from "/ai_avatar.png";

const InterpretationChat = () => {
  const { id } = useParams();
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dreamInterpretation, setDreamInterpretation] = useState("");
  const [chatHistory, setChatHistory] = useState<{
    questions: string[];
    answers: string[];
  }>({ questions: [], answers: [] });
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { getInterpretation, askFollowUpQuestion } = useOpenAIAssistant();

  useEffect(() => {
    if (id) {
      fetchDreamData();
    }
  }, [id]);

  useEffect(() => {
    // Scroll to bottom when chat history updates
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport=""]'
      ) as HTMLDivElement;
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [chatHistory]);

  const fetchDreamData = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const { data: dream, error } = await supabase
        .from("dreams")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching dream:", error);
        toast({
          title: "Error fetching dream",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (dream) {
        setDreamInterpretation(dream.interpretation || "");
        
        // Load chat history if available
        const questions = Array.isArray(dream.questions) ? dream.questions : [];
        const answers = Array.isArray(dream.answers) ? dream.answers : [];
        
        setChatHistory({
          questions,
          answers,
        });

        // If no interpretation yet, fetch one
        if (!dream.interpretation) {
          handleInitialInterpretation(dream.dream_text);
        }
      }
    } catch (error) {
      console.error("Error in fetchDreamData:", error);
      toast({
        title: "An error occurred",
        description: "Could not fetch dream data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialInterpretation = async (dreamText: string) => {
    setIsLoading(true);
    try {
      const interpretation = await getInterpretation(dreamText);
      setDreamInterpretation(interpretation);

      // Save the interpretation to the database
      const { error } = await supabase
        .from("dreams")
        .update({ interpretation })
        .eq("id", id);

      if (error) {
        console.error("Error saving interpretation:", error);
        toast({
          title: "Error saving interpretation",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error getting interpretation:", error);
      toast({
        title: "Error interpreting dream",
        description: "Failed to get dream interpretation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !id) return;

    const question = userInput.trim();
    setUserInput("");
    setIsLoading(true);

    // Update local state immediately for better UX
    const updatedQuestions = [...chatHistory.questions, question];
    setChatHistory((prev) => ({
      ...prev,
      questions: updatedQuestions,
    }));

    try {
      const answer = await askFollowUpQuestion(
        question,
        dreamInterpretation,
        chatHistory
      );

      // Update full chat history
      const updatedAnswers = [...chatHistory.answers, answer];
      const newChatHistory = {
        questions: updatedQuestions,
        answers: updatedAnswers,
      };
      
      setChatHistory(newChatHistory);

      // Save to database
      const { error } = await supabase
        .from("dreams")
        .update({
          questions: updatedQuestions,
          answers: updatedAnswers,
        })
        .eq("id", id);

      if (error) {
        console.error("Error saving chat history:", error);
        toast({
          title: "Error saving question",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error asking follow-up question:", error);
      toast({
        title: "Error",
        description: "Failed to get answer",
        variant: "destructive",
      });

      // Remove the question from the local state if it failed
      setChatHistory((prev) => ({
        ...prev,
        questions: prev.questions.slice(0, -1),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-hidden" ref={scrollAreaRef}>
        <ScrollArea className="h-full pr-4">
          {dreamInterpretation && (
            <div className="mb-6">
              <div className="flex items-start mb-2">
                <Avatar className="h-8 w-8 mr-2">
                  <img src={aiAvatar} alt="AI" className="h-full w-full object-cover" />
                </Avatar>
                <div className="bg-primary/10 p-3 rounded-lg max-w-[80%]">
                  <p className="text-sm whitespace-pre-wrap">{dreamInterpretation}</p>
                </div>
              </div>
            </div>
          )}

          {chatHistory.questions.map((question, index) => (
            <div key={index} className="mb-6">
              <div className="flex items-start justify-end mb-2">
                <div className="bg-primary p-3 rounded-lg text-primary-foreground max-w-[80%]">
                  <p className="text-sm">{question}</p>
                </div>
                <Avatar className="h-8 w-8 ml-2">
                  <div className="h-full w-full bg-muted flex items-center justify-center rounded-full">
                    <span className="text-xs">You</span>
                  </div>
                </Avatar>
              </div>

              {index < chatHistory.answers.length && (
                <div className="flex items-start mb-2">
                  <Avatar className="h-8 w-8 mr-2">
                    <img src={aiAvatar} alt="AI" className="h-full w-full object-cover" />
                  </Avatar>
                  <div className="bg-primary/10 p-3 rounded-lg max-w-[80%]">
                    <p className="text-sm whitespace-pre-wrap">{chatHistory.answers[index]}</p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-center items-center py-10">
              <LoadingAnimation />
            </div>
          )}
        </ScrollArea>
      </div>

      <form onSubmit={handleSubmitQuestion} className="mt-4">
        <div className="flex gap-2">
          <Textarea
            placeholder="Ask a follow-up question about your dream..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="resize-none"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !userInput.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
};

export default InterpretationChat;
